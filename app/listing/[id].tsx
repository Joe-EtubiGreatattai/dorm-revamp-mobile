import ActionSuccessModal from '@/components/ActionSuccessModal';
import CustomLoader from '@/components/CustomLoader';
import ReviewModal from '@/components/ReviewModal';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useCall } from '@/context/CallContext';
import { housingAPI, tourAPI } from '@/utils/apiClient';
import { getSocket } from '@/utils/socket';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Dimensions,
    FlatList,
    NativeScrollEvent,
    NativeSyntheticEvent,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function HousingDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { user } = useAuth();
    const { startCall } = useCall();

    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [isTourModalVisible, setTourModalVisible] = useState(false);
    const [isSuccessModalVisible, setSuccessModalVisible] = useState(false);
    const [house, setHouse] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [reviews, setReviews] = useState<any[]>([]);
    const [isReviewModalVisible, setReviewModalVisible] = useState(false);
    const [requesting, setRequesting] = useState(false);
    const [hasRequestedTour, setHasRequestedTour] = useState(false);
    const [existingTourRequest, setExistingTourRequest] = useState<any>(null);

    // Derived state - map ownerId to landlord for consistency
    const landlord = house?.ownerId || house?.landlord || house?.owner || {
        _id: 'error',
        name: 'Agent',
        avatar: 'https://ui-avatars.com/api/?name=Agent',
    };
    const isOwner = user && house?.ownerId?._id === user._id;

    React.useEffect(() => {
        const fetchListing = async () => {
            if (!id) return;
            try {
                const { data } = await housingAPI.getListing(id as string);
                setHouse(data);
                setReviews(data.reviews || []);
            } catch (error) {
                console.log('Error fetching listing:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchListing();
    }, [id]);

    // Socket listener for real-time reviews
    React.useEffect(() => {
        const socket = getSocket();
        if (socket) {
            console.log('📡 [REVIEW] Setting up socket listener for listing:', id);

            socket.on('review:new', (data: any) => {
                console.log('📡 [REVIEW] Received new review:', data);

                // Only update if it's for this listing
                if (data.listingId === id || data.listingId?.toString() === id) {
                    console.log('📡 [REVIEW] Adding review to list');
                    setReviews((prevReviews: any[]) => [data.review, ...prevReviews]);
                }
            });

            return () => {
                console.log('📡 [REVIEW] Cleaning up socket listener');
                socket.off('review:new');
            };
        }
    }, [id]);

    // Check if user has already requested a tour
    React.useEffect(() => {
        const checkTourRequest = async () => {
            if (!id || !user || isOwner) return;

            try {
                const { data } = await tourAPI.getTours();
                const existingRequest = data.find((tour: any) =>
                    (tour.listingId?._id === id || tour.listingId === id) &&
                    tour.requesterId?._id === user._id &&
                    tour.status === 'pending'
                );

                if (existingRequest) {
                    setHasRequestedTour(true);
                    setExistingTourRequest(existingRequest);
                    console.log('✅ [LISTING] User has pending tour request');
                } else {
                    setHasRequestedTour(false);
                    setExistingTourRequest(null);
                }
            } catch (error) {
                console.log('Error checking tour request:', error);
            }
        };

        checkTourRequest();
    }, [id, user, isOwner]);

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <CustomLoader message="Loading property details..." />
            </SafeAreaView>
        );
    }

    if (!house) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <Text style={{ color: colors.text, textAlign: 'center', marginTop: 20 }}>Property not found</Text>
                <TouchableOpacity onPress={() => router.back()} style={{ padding: 10 }}>
                    <Text style={{ color: colors.primary, textAlign: 'center' }}>Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const slideSize = event.nativeEvent.layoutMeasurement.width;
        const index = event.nativeEvent.contentOffset.x / slideSize;
        setActiveImageIndex(Math.round(index));
    };

    const handleTourRequest = () => {
        setTourModalVisible(true);
    };

    const confirmTour = async () => {
        if (requesting) return;
        setRequesting(true);
        try {
            // Mocking date/time for now as UI only asks for confirmation
            const response = await housingAPI.requestTour(id as string, {
                preferredDate: new Date().toISOString(),
                preferredTime: "Flexible",
                message: "I would like to schedule a viewing."
            });

            console.log('✅ [LISTING] Tour requested:', response.data);

            setTourModalVisible(false);
            setHasRequestedTour(true);
            setTimeout(() => {
                setSuccessModalVisible(true);
            }, 500);
        } catch (error: any) {
            console.log('Error requesting tour:', error);
            const errorMsg = error?.response?.data?.message || 'Failed to send tour request. Please try again.';
            alert(errorMsg);
        } finally {
            setRequesting(false);
        }
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out ${house.title} for ₦${house.price.toLocaleString()}/year in ${house.address} on Dorm! ${house.description}`,
                title: house.title,
            });
        } catch (error) {
            console.log('Error sharing:', error);
        }
    };

    const handleChat = () => {
        const ownerId = landlord._id || landlord.id;
        if (ownerId && ownerId !== 'error') {
            console.log('🔄 [CHAT] Opening chat with:', ownerId);
            router.push(`/chat/dm_${ownerId}`);
        } else {
            console.log('⚠️ [CHAT] No valid owner ID');
        }
    };

    const handleCall = () => {
        if (!landlord || landlord._id === 'error') return;
        console.log('📞 [LISTING] Starting call with owner:', landlord);
        startCall({
            _id: landlord._id || landlord.id,
            name: landlord.name,
            avatar: landlord.avatar
        });
    };

    const handleAddReview = async (rating: number, comment: string) => {
        console.log('📝 [REVIEW] Submitting review:', { rating, comment });
        try {
            await housingAPI.createReview(id as string, { rating, comment });
            console.log('✅ [REVIEW] Review submitted successfully');
            // The socket listener will add it to the list in real-time
        } catch (error) {
            console.error('❌ [REVIEW] Error submitting review:', error);
        }
    };

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

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

                {/* Image Slider */}
                <View style={styles.imageContainer}>
                    <FlatList
                        data={house.images || ['https://via.placeholder.com/400x300']}
                        keyExtractor={(img, index) => index.toString()}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onScroll={onScroll}
                        renderItem={({ item: imageUrl }) => (
                            <Image source={{ uri: imageUrl }} style={styles.sliderImage} contentFit="cover" />
                        )}
                    />

                    {house.images && house.images.length > 1 && (
                        <View style={styles.pagination}>
                            {house.images.map((_: any, index: number) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.dot,
                                        { backgroundColor: activeImageIndex === index ? colors.primary : 'rgba(255,255,255,0.5)' }
                                    ]}
                                />
                            ))}
                        </View>
                    )}

                    <View style={styles.headerOverlay}>
                        <TouchableOpacity
                            style={[styles.iconBtn, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
                            onPress={() => router.back()}
                        >
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.iconBtn, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
                            onPress={handleShare}
                        >
                            <Ionicons name="share-social-outline" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.content}>
                    <Text style={[styles.title, { color: colors.text }]}>{house.title}</Text>
                    <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={18} color={colors.subtext} />
                        <Text style={[styles.locationText, { color: colors.subtext }]}>{house.address}</Text>
                    </View>

                    <View style={styles.priceRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                            <Text style={[styles.price, { color: colors.primary }]}>₦{house.price?.toLocaleString()}</Text>
                            <Text style={[styles.period, { color: colors.subtext }]}>/ year</Text>
                        </View>

                        <View style={styles.rightPriceInfo}>
                            {house.tourFee > 0 && (
                                <View style={[styles.feeBadge, { backgroundColor: colors.primary + '10' }]}>
                                    <Text style={[styles.feeText, { color: colors.primary }]}>
                                        ₦{house.tourFee?.toLocaleString()} Tour Fee
                                    </Text>
                                </View>
                            )}
                            {house.rating > 0 && (
                                <View style={styles.ratingBadge}>
                                    <Ionicons name="star" size={16} color="#fbbf24" />
                                    <Text style={[styles.ratingText, { color: colors.text }]}>
                                        {house.rating?.toFixed(1)} ({house.totalReviews || 0})
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    {/* Amenities */}
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Amenities</Text>
                    <View style={styles.amenitiesGrid}>
                        {house.amenities?.map((amenity: string, index: number) => (
                            <View key={index} style={[styles.amenityItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Ionicons
                                    name={
                                        amenity.includes('Water') ? 'water-outline' :
                                            amenity.includes('Security') ? 'shield-checkmark-outline' :
                                                amenity.includes('Tiled') ? 'grid-outline' :
                                                    amenity.includes('Fenced') ? 'home-outline' : 'checkbox-outline'
                                    }
                                    size={20}
                                    color={colors.text}
                                />
                                <Text style={[styles.amenityText, { color: colors.text }]}>{amenity}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    {/* Description */}
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
                    <Text style={[styles.description, { color: colors.subtext }]}>{house.description}</Text>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    {/* Landlord Info */}
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Property Agent</Text>
                    <TouchableOpacity
                        style={[styles.landlordCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => router.push(`/user/${landlord._id || landlord.id}`)}
                    >
                        <Image source={{ uri: landlord.avatar || 'https://ui-avatars.com/api/?name=Agent' }} style={styles.landlordAvatar} />
                        <View style={styles.landlordInfo}>
                            <Text style={[styles.landlordName, { color: colors.text }]}>{landlord.name}</Text>
                            <Text style={[styles.landlordRole, { color: colors.subtext }]}>Verified Agent</Text>
                        </View>
                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={[styles.actionIcon, { backgroundColor: colors.primary + '15' }]}
                                onPress={handleCall}
                            >
                                <Ionicons name="call" size={20} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionIcon, { backgroundColor: colors.primary + '15' }]}
                                onPress={handleChat}
                            >
                                <Ionicons name="chatbubble" size={20} color={colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    {/* Reviews Section */}
                    <View style={styles.reviewsHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Student Reviews</Text>
                        <TouchableOpacity onPress={() => setReviewModalVisible(true)}>
                            <Text style={[styles.writeReviewBtn, { color: colors.primary }]}>Write a Review</Text>
                        </TouchableOpacity>
                    </View>

                    {reviews.length > 0 ? (
                        <View style={styles.reviewsList}>
                            {reviews.map((review: any, index: number) => {
                                const reviewer = review.user || { name: 'Student', avatar: 'https://ui-avatars.com/api/?name=Student' };
                                return (
                                    <View key={index} style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                        <View style={styles.reviewHeader}>
                                            <TouchableOpacity
                                                style={styles.reviewerInfo}
                                                onPress={() => {
                                                    const reviewerId = reviewer?._id || reviewer?.id;
                                                    if (!reviewerId) return;

                                                    if (reviewerId === user?._id) {
                                                        router.push('/profile');
                                                    } else {
                                                        router.push(`/user/${reviewerId}`);
                                                    }
                                                }}
                                            >
                                                <Image source={{ uri: reviewer.avatar }} style={styles.reviewerAvatar} />
                                                <View>
                                                    <Text style={[styles.reviewerName, { color: colors.text }]}>{reviewer.name}</Text>
                                                    <Text style={[styles.reviewTime, { color: colors.subtext }]}>{formatTimeAgo(review.createdAt)}</Text>
                                                </View>
                                            </TouchableOpacity>
                                            <View style={styles.ratingBadge}>
                                                <Ionicons name="star" size={14} color="#fbbf24" />
                                                <Text style={[styles.ratingText, { color: colors.text }]}>{review.rating}.0</Text>
                                            </View>
                                        </View>
                                        <Text style={[styles.reviewComment, { color: colors.subtext }]}>{review.comment}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    ) : (
                        <View style={[styles.emptyReviews, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Ionicons name="chatbox-ellipses-outline" size={40} color={colors.subtext} />
                            <Text style={[styles.emptyReviewsText, { color: colors.subtext }]}>No reviews yet. Be the first!</Text>
                        </View>
                    )}
                </View>
            </ScrollView >

            <SafeAreaView edges={['bottom']} style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                <View>
                    <Text style={[styles.bottomPriceLabel, { color: colors.subtext }]}>Total Rent</Text>
                    <Text style={[styles.bottomPrice, { color: colors.text }]}>₦{house.price?.toLocaleString()}</Text>
                </View>
                {isOwner ? (
                    <TouchableOpacity
                        style={[styles.tourBtn, { backgroundColor: colors.primary }]}
                        onPress={() => router.push('/(tabs)/housing')}
                    >
                        <Text style={styles.tourBtnText}>View Requests</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.tourBtn, {
                            backgroundColor: hasRequestedTour ? colors.card : colors.primary,
                            borderWidth: hasRequestedTour ? 1 : 0,
                            borderColor: hasRequestedTour ? colors.border : 'transparent'
                        }]}
                        onPress={handleTourRequest}
                        disabled={hasRequestedTour}
                    >
                        <Text style={[styles.tourBtnText, {
                            color: hasRequestedTour ? colors.subtext : '#fff'
                        }]}>
                            {hasRequestedTour ? 'Tour Requested' : 'Request Tour'}
                        </Text>
                    </TouchableOpacity>
                )}
            </SafeAreaView>

            {/* Floating Edit Button for Owners */}
            {isOwner && (
                <TouchableOpacity
                    style={[styles.fabButton, { backgroundColor: colors.primary }]}
                    onPress={() => router.push(`/housing/edit/${id}`)}
                >
                    <Ionicons name="create-outline" size={24} color="#fff" />
                </TouchableOpacity>
            )}

            <ActionSuccessModal
                visible={isTourModalVisible}
                onClose={() => setTourModalVisible(false)}
                onConfirm={confirmTour}
                title="Schedule Tour"
                description={`Request a physical tour of ${house.title}? ${house.tourFee > 0 ? `\n\nNote: A non-refundable touring fee of ₦${house.tourFee.toLocaleString()} will be deducted from your wallet.` : ''}`}
                buttonText={requesting ? "Processing..." : (house.tourFee > 0 ? `Pay ₦${house.tourFee.toLocaleString()} & Request` : "Send Request")}
                showCancel={true}
                iconName="calendar"
            />

            <ActionSuccessModal
                visible={isSuccessModalVisible}
                onClose={() => setSuccessModalVisible(false)}
                title="Request Sent!"
                description="The agent has been notified. They will contact you to schedule a date."
                buttonText="Got it"
                iconName="checkmark-circle"
            />

            <ReviewModal
                visible={isReviewModalVisible}
                onClose={() => setReviewModalVisible(false)}
                onSubmit={handleAddReview}
            />
        </View >
    );
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    imageContainer: {
        width: width,
        height: width * 0.75,
        position: 'relative',
    },
    sliderImage: {
        width: width,
        height: '100%',
    },
    pagination: {
        position: 'absolute',
        bottom: 16,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    headerOverlay: {
        position: 'absolute',
        top: 60,
        width: '100%',
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 12,
    },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        padding: 20,
    },
    title: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 24,
        marginBottom: 8,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 16,
    },
    locationText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    price: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 28,
    },
    period: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 16,
    },
    rightPriceInfo: {
        alignItems: 'flex-end',
        gap: 6,
    },
    feeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    feeText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 12,
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
    amenitiesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    amenityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        gap: 8,
    },
    amenityText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 13,
    },
    description: {
        fontFamily: 'PlusJakartaSans_400Regular',
        fontSize: 16,
        lineHeight: 24,
    },
    landlordCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    landlordAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
    },
    landlordInfo: {
        flex: 1,
    },
    landlordName: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
    landlordRole: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 13,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 8,
    },
    actionIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bottomBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 24,
        borderTopWidth: 0.5,
    },
    bottomPriceLabel: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
        marginBottom: 2,
    },
    bottomPrice: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 20,
    },
    tourBtn: {
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 24,
    },
    tourBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
    },
    fabButton: {
        position: 'absolute',
        right: 20,
        bottom: 140,
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    reviewsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    writeReviewBtn: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
        textDecorationLine: 'underline',
    },
    reviewsList: {
        gap: 16,
    },
    reviewCard: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    reviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    reviewerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    reviewerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    reviewerName: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
    reviewTime: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: 'rgba(251, 191, 36, 0.15)', // bright yellow bg
    },
    ratingText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 12,
    },
    reviewComment: {
        fontFamily: 'PlusJakartaSans_400Regular',
        fontSize: 14,
        lineHeight: 22,
    },
    emptyReviews: {
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        borderWidth: 1,
        borderStyle: 'dashed',
        gap: 12,
    },
    emptyReviewsText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
    },
});
