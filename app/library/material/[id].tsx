import ActionSuccessModal from '@/components/ActionSuccessModal';
import CustomLoader from '@/components/CustomLoader';
import ReviewModal from '@/components/ReviewModal';
import { useColorScheme } from '@/components/useColorScheme';
import { SOCKET_URL } from '@/config/api';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { libraryAPI } from '@/utils/apiClient';
import { getSocket } from '@/utils/socket';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import { Dimensions, Platform, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const formatTimeAgo = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

export default function MaterialDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'] || Colors.light;
    const [isSaved, setIsSaved] = useState(false);
    const [isDownloaded, setIsDownloaded] = useState(false);
    const [isSuccessModalVisible, setSuccessModalVisible] = useState(false);
    const [isReviewModalVisible, setReviewModalVisible] = useState(false);
    const [isErrorModalVisible, setErrorModalVisible] = useState(false);
    const [errorMsg, setErrorMsg] = useState({ title: '', description: '' });

    const [material, setMaterial] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isImageLoading, setIsImageLoading] = useState(true);
    const [reviews, setReviews] = useState<any[]>([]);

    React.useEffect(() => {
        const fetchMaterial = async () => {
            console.log('[MaterialDetail] Fetching material with ID:', id);
            try {
                const response = await libraryAPI.getMaterial(id as string);
                console.log('[MaterialDetail] Response data:', response.data);
                const data = response.data;

                if (!data) {
                    console.log('[MaterialDetail] Material not found for ID:', id);
                    setMaterial(null);
                    return;
                }

                // Robust Data Mapping
                const mappedMaterial = {
                    ...data,
                    author: data.uploaderId || { name: 'Dorm Student', avatar: null, id: 'unknown' },
                    type: data.fileType || 'pdf',
                    size: data.fileSize ? `${(data.fileSize / 1024 / 1024).toFixed(1)} MB` : '0.5 MB',
                    previewImage: data.fileUrl // Use fileUrl directly as preview since we don't have thumbnails yet
                };

                if (data.fileType?.toLowerCase() === 'pdf' || data.fileUrl?.toLowerCase().endsWith('.pdf')) {
                    setIsImageLoading(false);
                }

                console.log('[MaterialDetail] Mapped material for UI:', mappedMaterial);
                setMaterial(mappedMaterial);
                setReviews(data.reviews || []);
                setIsSaved(data.saves?.includes(user?._id));
                setIsDownloaded(data.downloaders?.includes(user?._id));
            } catch (error) {
                console.log('[MaterialDetail] Error fetching material:', error);
            } finally {
                setIsLoading(false);
            }
        };

        // Safety timeout for image loading (max 3.5 seconds)
        const imageTimeout = setTimeout(() => {
            setIsImageLoading(false);
        }, 3500);

        if (id) fetchMaterial();

        return () => clearTimeout(imageTimeout);
    }, [id, user?._id]);

    // Socket listener for real-time reviews
    React.useEffect(() => {
        const socket = getSocket();
        if (socket) {
            console.log('📡 [MATERIAL] Setting up socket listener for review:', id);

            socket.on('review:new', (data: any) => {
                console.log('📡 [MATERIAL] Received new review via socket:', data);
                if (data.materialId === id || data.materialId?.toString() === id) {
                    setReviews((prev: any[]) => {
                        if (prev.some(r => r._id === data.review._id)) return prev;
                        return [data.review, ...prev];
                    });
                }
            });

            socket.on('material:downloadCountUpdate', (data: any) => {
                if (data.materialId === id || data.materialId?.toString() === id) {
                    setMaterial((prev: any) => prev ? { ...prev, downloads: data.downloads } : prev);
                }
            });

            socket.on('material:ratingUpdate', (data: any) => {
                if (data.materialId === id || data.materialId?.toString() === id) {
                    setMaterial((prev: any) => prev ? { ...prev, rating: data.rating, reviewsCount: data.reviewCount } : prev);
                }
            });

            socket.on('material:updated', (data: any) => {
                if (data._id === id || data._id?.toString() === id) {
                    setMaterial((prev: any) => ({
                        ...prev,
                        ...data,
                        author: data.uploaderId || prev.author,
                        type: data.fileType || prev.type,
                        previewImage: data.fileUrl || prev.previewImage
                    }));
                }
            });

            return () => {
                console.log('📡 [MATERIAL] Cleaning up socket listeners');
                socket.off('review:new');
                socket.off('material:downloadCountUpdate');
                socket.off('material:ratingUpdate');
                socket.off('material:updated');
            };
        }
    }, [id]);

    const handleToggleSave = async () => {
        if (!id || !user) return;

        // Optimistic UI update
        const previousSaved = isSaved;
        setIsSaved(!previousSaved);

        try {
            const { data } = await libraryAPI.saveMaterial(id as string);
            setIsSaved(data.saved);
        } catch (error) {
            console.error('Error toggling save:', error);
            // Revert on error
            setIsSaved(previousSaved);
        }
    };

    const handleAddReview = async (rating: number, comment: string) => {
        console.log('📝 [MATERIAL] Submitting review:', { rating, comment });
        try {
            const { data } = await libraryAPI.addReview(id as string, { rating, comment });
            console.log('✅ [MATERIAL] Review submitted successfully:', data);
            // The socket listener handles adding to the list
        } catch (error) {
            console.error('❌ [MATERIAL] Error submitting review:', error);
            setErrorMsg({
                title: 'Review Failed',
                description: 'We couldn\'t submit your review. Please try again later.'
            });
            setErrorModalVisible(true);
        }
    };

    const showLoader = isLoading || (material && isImageLoading);

    if (showLoader) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <CustomLoader message="Opening material..." />
            </SafeAreaView>
        );
    }

    if (!material) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={[styles.headerOverlay, { position: 'relative', top: 0, paddingBottom: 20 }]}>
                    <TouchableOpacity
                        style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                    <Ionicons name="alert-circle-outline" size={64} color={colors.subtext} />
                    <Text style={[styles.title, { color: colors.text, marginTop: 16 }]}>Material not found</Text>
                    <Text style={{ color: colors.subtext, textAlign: 'center', marginTop: 8 }}>
                        The material you're looking for might have been removed or moved to another faculty.
                    </Text>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={[styles.downloadBtn, { marginTop: 32, width: '100%', backgroundColor: colors.primary }]}
                    >
                        <Text style={styles.downloadBtnText}>Explore Other Materials</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const uploader = material.author;

    const handleDownload = async () => {
        if (!material || !id || !user) return;

        try {
            // 1. Notify backend about the download start
            const { data: downloadData } = await libraryAPI.downloadMaterial(id as string);
            let fileUrl = downloadData.fileUrl;

            if (!fileUrl) throw new Error('Download URL not provided');

            // 2. Ensure absolute URL
            if (!fileUrl.startsWith('http')) {
                const base = SOCKET_URL.endsWith('/') ? SOCKET_URL.slice(0, -1) : SOCKET_URL;
                const path = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
                fileUrl = `${base}${path}`;
            }

            // 3. Determine file name and local path
            const fs = FileSystem as any;
            const filename = material.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() +
                (material.type === 'video' ? '.mp4' : '.pdf');
            const fileUri = (fs.documentDirectory || fs.cacheDirectory || '') + filename;

            console.log('[MaterialDetail] Downloading from:', fileUrl, 'to:', fileUri);

            // 4. Download the file with auth headers IF NOT Cloudinary
            const token = await SecureStore.getItemAsync('token');
            const headers: any = {};

            // Only send auth headers if it's our own server and NOT Cloudinary (fixes 400 error)
            const isCloudinary = fileUrl.includes('cloudinary.com');
            if (token && (fileUrl.includes(SOCKET_URL) || !fileUrl.startsWith('http')) && !isCloudinary) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const downloadRes = await FileSystem.downloadAsync(fileUrl, fileUri, { headers });

            if (downloadRes.status !== 200) {
                console.error('[MaterialDetail] Download failed with status:', downloadRes.status);
                // If it's 401, maybe we need headers even for remote? Or it's a signed URL issue.
                throw new Error(`Download failed with status ${downloadRes.status}`);
            }

            console.log('[MaterialDetail] Download finished at:', downloadRes.uri);

            // 5. Save to device / Open share dialog
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(downloadRes.uri, {
                    mimeType: material.type === 'video' ? 'video/mp4' : 'application/pdf',
                    dialogTitle: `Download ${material.title}`,
                    UTI: material.type === 'video' ? 'public.mpeg-4' : 'com.adobe.pdf',
                });
            }

            // 6. Update local state
            setIsDownloaded(true);
            setSuccessModalVisible(true);
        } catch (error) {
            console.error('[MaterialDetail] Download Error:', error);
            setErrorMsg({
                title: 'Download Failed',
                description: 'We couldn\'t download this material. Please check your internet connection and try again.'
            });
            setErrorModalVisible(true);
        }
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out this material: ${material.title} (${material.courseCode}) on Dorm Library! ${material.description}`,
                title: material.title,
            });
        } catch (error) {
            console.log('Error sharing:', error);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Premium Custom Header */}
            <View style={[styles.customHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity
                    style={styles.headerActionBtn}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>

                <View style={styles.headerTitleContainer}>
                    <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                        {material.title || "Material Details"}
                    </Text>
                </View>

                <View style={styles.headerRightActions}>
                    <TouchableOpacity
                        style={styles.headerActionBtn}
                        onPress={handleToggleSave}
                    >
                        <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={22} color={isSaved ? colors.primary : colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.headerActionBtn}
                        onPress={handleShare}
                    >
                        <Ionicons name="share-social-outline" size={22} color={colors.text} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Material Preview */}
                <View style={[styles.previewContainer, { backgroundColor: colors.card, marginHorizontal: 20, borderRadius: 20, marginTop: 10, overflow: 'hidden' }]}>
                    <Image
                        source={{ uri: material.previewImage }}
                        style={styles.previewImage}
                        contentFit="contain"
                        onLoad={() => setIsImageLoading(false)}
                        onError={() => setIsImageLoading(false)}
                    />
                </View>

                {/* Content */}
                <View style={styles.content}>
                    <View style={styles.titleRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.title, { color: colors.text, textTransform: 'uppercase' }]}>{material.title}</Text>
                            <Text style={[styles.courseCode, { color: colors.primary }]}>{material.courseCode}</Text>
                        </View>
                        <View style={[styles.typeBadge, { backgroundColor: colors.primary + '20' }]}>
                            <Text style={[styles.typeText, { color: colors.primary }]}>{material.type?.toUpperCase() || 'PDF'}</Text>
                        </View>
                    </View>

                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <Ionicons name="download-outline" size={16} color={colors.subtext} />
                            <Text style={[styles.metaText, { color: colors.subtext }]}>{material.downloads} downloads</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Ionicons name="star" size={16} color="#fbbf24" />
                            <Text style={[styles.metaText, { color: colors.subtext }]}>
                                {material.rating ? (typeof material.rating === 'number' ? material.rating.toFixed(1) : material.rating) : '0.0'} rating
                            </Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Ionicons name="document-text-outline" size={16} color={colors.subtext} />
                            <Text style={[styles.metaText, { color: colors.subtext }]}>{material.size}</Text>
                        </View>
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    {/* Uploader */}
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Uploaded By</Text>
                    <TouchableOpacity
                        style={[styles.uploaderCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => uploader.id && router.push(`/user/${uploader.id}`)}
                    >
                        <Image source={{ uri: uploader.avatar || 'https://i.pravatar.cc/150' }} style={styles.uploaderAvatar} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.uploaderName, { color: colors.text }]}>{uploader.name}</Text>
                            <Text style={[styles.uploadDate, { color: colors.subtext }]}>Shared {material.date || 'Recently'}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
                    </TouchableOpacity>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    {/* Description */}
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
                    <Text style={[styles.description, { color: colors.subtext }]}>
                        {material.description || "No description provided."}
                    </Text>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    {/* Reviews Section */}
                    <View style={styles.reviewsHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Reviews ({reviews.length})</Text>
                        <TouchableOpacity onPress={() => setReviewModalVisible(true)}>
                            <Text style={[styles.writeReview, { color: colors.primary }]}>Write a Review</Text>
                        </TouchableOpacity>
                    </View>

                    {reviews.length === 0 ? (
                        <Text style={{ color: colors.subtext, fontStyle: 'italic', marginBottom: 20 }}>No reviews yet. Be the first!</Text>
                    ) : (
                        reviews.map((review: any) => {
                            const reviewer = review.userId || review.user || {};
                            const reviewerName = reviewer.name || review.userName || 'Student';
                            const reviewerAvatar = reviewer.avatar || 'https://i.pravatar.cc/150';
                            const reviewerId = reviewer._id || reviewer.id;

                            return (
                                <View key={review._id || review.id || Math.random()} style={[styles.commentCard, { backgroundColor: colors.card }]}>
                                    <TouchableOpacity
                                        style={styles.reviewTop}
                                        onPress={() => reviewerId && router.push(`/user/${reviewerId}`)}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                            <Image source={{ uri: reviewerAvatar }} style={styles.reviewerAvatar} />
                                            <View>
                                                <Text style={[styles.commentUser, { color: colors.text }]}>{reviewerName}</Text>
                                                <View style={styles.starRow}>
                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                        <Ionicons
                                                            key={i}
                                                            name={i < review.rating ? "star" : "star-outline"}
                                                            size={12}
                                                            color="#fbbf24"
                                                        />
                                                    ))}
                                                </View>
                                            </View>
                                        </View>
                                        <Text style={[styles.reviewDate, { color: colors.subtext }]}>
                                            {review.createdAt ? formatTimeAgo(review.createdAt) : (review.timestamp || 'Recently')}
                                        </Text>
                                    </TouchableOpacity>
                                    <Text style={[styles.commentText, { color: colors.subtext, marginLeft: 42, marginTop: -4 }]}>{review.content || review.comment}</Text>
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>

            <ReviewModal
                visible={isReviewModalVisible}
                onClose={() => setReviewModalVisible(false)}
                onSubmit={handleAddReview}
            />

            {/* Bottom Action Bar */}
            <SafeAreaView
                edges={['bottom']}
                style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}
            >
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[styles.readBtn, { borderColor: colors.primary }]}
                        onPress={() => router.push(`/library/reader/${id}`)}
                    >
                        <Ionicons name="book-outline" size={20} color={colors.primary} />
                        <Text style={[styles.readBtnText, { color: colors.primary }]}>Read Now</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.downloadBtn,
                            { backgroundColor: isDownloaded ? colors.subtext : colors.primary }
                        ]}
                        onPress={handleDownload}
                        disabled={isDownloaded}
                    >
                        <Ionicons name={isDownloaded ? "checkmark-circle" : "download-outline"} size={20} color="#fff" />
                        <Text style={styles.downloadBtnText}>
                            {isDownloaded ? "Saved" : "Download"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            <ActionSuccessModal
                visible={isSuccessModalVisible}
                onClose={() => setSuccessModalVisible(false)}
                title="Download Complete"
                description={`${material?.title} has been saved to your specialized 'My Library' folder.`}
                buttonText="View in My Library"
                iconName="checkmark-circle"
            />

            <ActionSuccessModal
                visible={isErrorModalVisible}
                onClose={() => setErrorModalVisible(false)}
                title={errorMsg.title}
                description={errorMsg.description}
                iconName="alert-circle"
                iconColor="#ef4444"
                buttonText="Try Again"
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    previewContainer: {
        width: width - 40,
        height: (width - 40) * 0.7,
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    headerControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    headerOverlay: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        width: '100%',
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    iconBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    customHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    headerTitleContainer: {
        flex: 1,
        marginHorizontal: 12,
        alignItems: 'center',
    },
    headerTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
        textAlign: 'center',
    },
    headerRightActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerActionBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerRightGroup: {
        flexDirection: 'row',
        gap: 12,
    },
    content: {
        padding: 20,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    title: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 22,
        marginBottom: 4,
    },
    courseCode: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
    },
    typeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    typeText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
    },
    metaRow: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 24,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
    },
    divider: {
        height: 1,
        width: '100%',
        marginVertical: 24,
    },
    sectionTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
        marginBottom: 16,
    },
    uploaderCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
    },
    uploaderAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
    },
    uploaderName: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 15,
    },
    uploadDate: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
    },
    description: {
        fontFamily: 'PlusJakartaSans_400Regular',
        fontSize: 16,
        lineHeight: 24,
    },
    commentCard: {
        padding: 12,
        borderRadius: 12,
        marginBottom: 10,
    },
    commentUser: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
        marginBottom: 4,
    },
    commentText: {
        fontFamily: 'PlusJakartaSans_400Regular',
        fontSize: 14,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        paddingHorizontal: 20,
        paddingTop: 16,
        borderTopWidth: 1,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 10,
    },
    readBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 30,
        borderWidth: 1,
        gap: 8,
    },
    readBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
    downloadBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 30,
        gap: 8,
    },
    downloadBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        color: '#fff',
        fontSize: 16,
    },
    reviewsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    writeReview: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
    },
    reviewTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    reviewDate: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
    },
    reviewerAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    starRow: {
        flexDirection: 'row',
        gap: 2,
        marginTop: 2,
    },
});
