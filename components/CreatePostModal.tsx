import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import { useUpload } from '@/context/UploadContext';
import { authAPI, postAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { ResizeMode } from 'expo-av';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import VideoPlayer from './VideoPlayer';
import VideoTrimmer from './VideoTrimmer';

export default function CreatePostModal({ visible, onClose, post }: { visible: boolean, onClose: () => void, post?: any }) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { user } = useAuth();
    const [content, setContent] = useState(post?.content || '');
    const [images, setImages] = useState<string[]>(post?.images || []);
    const [video, setVideo] = useState<string | null>(post?.video || null);
    const [locations, setLocations] = useState<string[]>(post?.locations || []);
    const [locationInput, setLocationInput] = useState('');
    const [showLocationInput, setShowLocationInput] = useState(false);
    const [visibility, setVisibility] = useState<'public' | 'school'>(post?.visibility || 'public');
    const [isAnonymous, setIsAnonymous] = useState(post?.isAnonymous || false);
    const [isVisibilityMenuVisible, setVisibilityMenuVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [trimTimes, setTrimTimes] = useState({ start: 0, end: 0 });
    const [videoDuration, setVideoDuration] = useState(0);
    const [currentVideoTime, setCurrentVideoTime] = useState(0);
    const [seekTime, setSeekTime] = useState<number | undefined>(undefined);
    const [currentStage, setCurrentStage] = useState<'post' | 'trim'>('post');
    const { showAlert } = useAlert();
    const { addToQueue } = useUpload();
    const isEditing = !!post;

    const maxLength = 280;
    const progress = Math.min(content.length / maxLength, 1);

    const insets = useSafeAreaInsets();

    const pickImages = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            selectionLimit: 5 - images.length,
            quality: 0.7,
        });

        if (!result.canceled) {
            const newImages = result.assets.map((asset: any) => asset.uri);
            setImages([...images, ...newImages].slice(0, 5));
        }
    };

    const pickVideo = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['videos'],
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            const asset = result.assets[0];
            // Check duration (if available from ImagePicker)
            if (asset.duration && asset.duration > 120000) { // 120,000ms = 2 mins
                showAlert({
                    title: 'Video Too Long',
                    description: 'Please select a video shorter than 2 minutes.',
                    type: 'error'
                });
                return;
            }
            setVideo(asset.uri);
            setImages([]); // Clear images if video is selected
            // Reset trim times and duration
            const durationSec = Math.floor((asset.duration || 0) / 1000);
            setVideoDuration(durationSec);
            setTrimTimes({ start: 0, end: Math.min(durationSec, 120) });
            setCurrentStage('trim');
        }
    };

    const addLocation = () => {
        if (locationInput.trim() && !locations.includes(locationInput.trim())) {
            setLocations([...locations, locationInput.trim()]);
            setLocationInput('');
        }
    };

    const removeLocation = (index: number) => {
        setLocations(locations.filter((_, i) => i !== index));
    };

    const removeImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index));
    };

    const handlePost = async () => {
        if (!content.trim() && images.length === 0 && !video) return;

        // 1. Capture any pending location input
        let finalLocations = [...locations];
        if (locationInput.trim() && !finalLocations.includes(locationInput.trim())) {
            finalLocations.push(locationInput.trim());
        }

        if (isEditing) {
            setLoading(true);
            try {
                // Keep editing direct for now
                const uploadedImages = await Promise.all(
                    images.map(async (img) => {
                        if (img.startsWith('http')) return img;
                        return await authAPI.uploadImage(img);
                    })
                );
                let videoUrl = video;
                if (video && !video.startsWith('http')) {
                    videoUrl = await authAPI.uploadImage(video);
                }

                const payload = {
                    content,
                    visibility,
                    isAnonymous,
                    locations: finalLocations,
                    images: uploadedImages,
                    video: videoUrl,
                };
                await postAPI.updatePost(post._id, payload);
                showAlert({
                    title: 'Post Updated',
                    description: 'Your post has been updated successfully.',
                    type: 'success'
                });
                onClose();
            } catch (error: any) {
                showAlert({ title: 'Update Failed', description: error.message, type: 'error' });
            } finally {
                setLoading(false);
            }
        } else {
            // Queue for background upload
            const payload = {
                content,
                visibility,
                isAnonymous,
                locations: finalLocations,
                images,
                video,
                trim: video ? trimTimes : null
            };

            await addToQueue(payload);

            showAlert({
                title: 'Upload Started',
                description: 'Your post is being uploaded in the background.',
                type: 'info'
            });

            setContent('');
            setImages([]);
            setVideo(null);
            setLocations([]);
            setLocationInput(''); // Clear pending input too
            setIsAnonymous(false);
            setCurrentStage('post');
            onClose();
        }
    };

    const renderTrimStage = () => (
        <View style={[styles.container, { backgroundColor: '#000', paddingTop: Math.max(insets.top, 10) }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => setCurrentStage('post')} style={styles.closeBtn}>
                    <Text style={[styles.headerActionText, { color: '#fff' }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Trim Video</Text>
                <TouchableOpacity
                    style={[styles.postBtn, { backgroundColor: colors.primary }]}
                    onPress={() => setCurrentStage('post')}
                >
                    <Text style={styles.postBtnText}>Done</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.trimStageContent}>
                <View style={styles.largeVideoContainer}>
                    {video && (
                        <VideoPlayer
                            uri={video}
                            style={styles.largeVideo}
                            resizeMode={ResizeMode.CONTAIN}
                            autoPlay={true}
                            isLooping={true}
                            playbackRange={trimTimes}
                            onPositionUpdate={setCurrentVideoTime}
                            seekPosition={seekTime}
                        />
                    )}
                </View>

                <View style={styles.trimmerBottomSection}>
                    {video && (
                        <VideoTrimmer
                            videoUri={video}
                            duration={videoDuration}
                            onTrimChange={setTrimTimes}
                            onSeek={setSeekTime}
                            maxDuration={120}
                            currentTime={currentVideoTime}
                        />
                    )}
                </View>
            </View>
        </View>
    );

    const renderPostStage = () => (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 10) }]}>
            {/* Twitter-style Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <Ionicons name="close" size={28} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity
                    disabled={(!content.trim() && images.length === 0 && !video) || loading}
                    style={[
                        styles.postBtn,
                        { backgroundColor: colors.primary, opacity: (content.trim() || images.length > 0 || video) && !loading ? 1 : 0.5 }
                    ]}
                    onPress={handlePost}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.postBtnText}>{isEditing ? 'Update' : 'Post'}</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Visibility Selector Modal */}
            <Modal
                visible={isVisibilityMenuVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setVisibilityMenuVisible(false)}
            >
                <TouchableOpacity
                    style={styles.menuOverlay}
                    activeOpacity={1}
                    onPress={() => setVisibilityMenuVisible(false)}
                />
                <View style={[styles.menuContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => {
                            setVisibility('public');
                            setVisibilityMenuVisible(false);
                        }}
                    >
                        <Ionicons name="earth-outline" size={22} color={colors.text} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.menuText, { color: colors.text }]}>Public</Text>
                            <Text style={[styles.menuSubtext, { color: colors.subtext }]}>Visible to everyone on Dorm</Text>
                        </View>
                        {visibility === 'public' && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                    </TouchableOpacity>

                    <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => {
                            setVisibility('school');
                            setVisibilityMenuVisible(false);
                        }}
                    >
                        <Ionicons name="school-outline" size={22} color={colors.text} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.menuText, { color: colors.text }]}>My School Only</Text>
                            <Text style={[styles.menuSubtext, { color: colors.subtext }]}>Visible only to {user?.university || 'your school'}</Text>
                        </View>
                        {visibility === 'school' && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                    </TouchableOpacity>
                </View>
            </Modal>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    style={styles.content}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.inputWrapper}>
                        <Image source={{ uri: user?.avatar || 'https://ui-avatars.com/api/?name=User' }} style={styles.avatar} />
                        <View style={styles.inputContainer}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <TouchableOpacity
                                    style={[styles.audienceBtn, { borderColor: colors.border }]}
                                    onPress={() => setVisibilityMenuVisible(true)}
                                >
                                    <Ionicons
                                        name={visibility === 'public' ? "earth-outline" : "school-outline"}
                                        size={14}
                                        color={colors.primary}
                                    />
                                    <Text style={[styles.audienceText, { color: colors.primary }]}>
                                        {visibility === 'public' ? 'Public' : 'My School'}
                                    </Text>
                                    <Ionicons name="chevron-down" size={12} color={colors.primary} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.audienceBtn, { borderColor: colors.border, marginLeft: 8 }]}
                                    onPress={() => setIsAnonymous(!isAnonymous)}
                                >
                                    <Ionicons
                                        name={isAnonymous ? "eye-off" : "eye"}
                                        size={14}
                                        color={isAnonymous ? colors.primary : colors.subtext}
                                    />
                                    <Text style={[styles.audienceText, { color: isAnonymous ? colors.primary : colors.subtext }]}>
                                        {isAnonymous ? 'Anonymous' : 'Public ID'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <TextInput
                                multiline
                                placeholder={isEditing ? "Edit your post..." : "What's happening?"}
                                placeholderTextColor={colors.subtext}
                                style={[styles.input, { color: colors.text }]}
                                value={content}
                                onChangeText={(text) => text.length <= maxLength && setContent(text)}
                                autoFocus
                                scrollEnabled={false}
                            />
                        </View>
                    </View>

                    {/* Location Tags Preview */}
                    {locations.length > 0 && (
                        <View style={styles.locationTagsContainer}>
                            {locations.map((loc, index) => (
                                <View key={index} style={[styles.locationChip, { backgroundColor: colors.primary + '15' }]}>
                                    <Ionicons name="location" size={12} color={colors.primary} />
                                    <Text style={[styles.locationChipText, { color: colors.primary }]}>{loc}</Text>
                                    <TouchableOpacity onPress={() => removeLocation(index)}>
                                        <Ionicons name="close-circle" size={14} color={colors.primary} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Location Input */}
                    {showLocationInput && (
                        <View style={[styles.locationInputSection, { borderTopColor: colors.border }]}>
                            <TextInput
                                placeholder="Tag a location..."
                                placeholderTextColor={colors.subtext}
                                style={[styles.locationTextInput, { color: colors.text }]}
                                value={locationInput}
                                onChangeText={setLocationInput}
                                onSubmitEditing={addLocation}
                                blurOnSubmit={false}
                                autoFocus
                            />
                            <TouchableOpacity onPress={addLocation} style={styles.addLocationBtn}>
                                <Ionicons name="add-circle" size={24} color={colors.primary} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Image/Video Preview */}
                    {(images.length > 0 || video) && (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.imagePreviewContainer}
                        >
                            {video && (
                                <View style={styles.previewWrapper}>
                                    <VideoPlayer
                                        uri={video}
                                        style={styles.previewImage}
                                        resizeMode={ResizeMode.COVER}
                                        autoPlay={true}
                                        isLooping={true}
                                    />
                                    <TouchableOpacity
                                        style={[styles.removeImageBtn, { backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 10 }]}
                                        onPress={() => setVideo(null)}
                                    >
                                        <Ionicons name="close" size={16} color="#fff" />
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.editVideoOverlay}
                                        onPress={() => setCurrentStage('trim')}
                                    >
                                        <Ionicons name="cut" size={16} color="#fff" />
                                        <Text style={styles.editVideoText}>Edit</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                            {images.map((uri, index) => (
                                <View key={index} style={styles.previewWrapper}>
                                    <Image source={{ uri }} style={styles.previewImage} />
                                    <TouchableOpacity
                                        style={[styles.removeImageBtn, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
                                        onPress={() => removeImage(index)}
                                    >
                                        <Ionicons name="close" size={16} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                            {images.length < 5 && !video && (
                                <TouchableOpacity
                                    style={[styles.addMoreBtn, { borderColor: colors.border }]}
                                    onPress={pickImages}
                                >
                                    <Ionicons name="add" size={30} color={colors.subtext} />
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    )}
                </ScrollView>

                {/* Rich Media Toolbar (Above Keyboard) */}
                <View style={[styles.toolbar, { borderTopColor: colors.border }]}>
                    <TouchableOpacity style={styles.toolItem} onPress={pickImages} disabled={images.length >= 5}>
                        <Ionicons
                            name="image-outline"
                            size={24}
                            color={images.length >= 5 ? colors.subtext : colors.primary}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.toolItem}
                        onPress={pickVideo}
                        disabled={images.length > 0}
                    >
                        <Ionicons
                            name="videocam-outline"
                            size={24}
                            color={images.length > 0 ? colors.subtext : colors.primary}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.toolItem}
                        onPress={() => setShowLocationInput(!showLocationInput)}
                    >
                        <Ionicons
                            name={showLocationInput ? "location" : "location-outline"}
                            size={24}
                            color={colors.primary}
                        />
                    </TouchableOpacity>

                    <View style={{ flex: 1 }} />
                    <View style={styles.rightTools}>
                        {content.length > 0 && (
                            <>
                                <View style={styles.progressContainer}>
                                    <View style={[styles.progressTrack, { backgroundColor: colors.border }]} />
                                    <View
                                        style={[
                                            styles.progressFill,
                                            {
                                                width: `${progress * 100}%`,
                                                backgroundColor: content.length >= maxLength ? colors.error : colors.primary
                                            }
                                        ]}
                                    />
                                </View>
                                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                            </>
                        )}
                    </View>
                </View>
            </KeyboardAvoidingView>
        </View>
    );

    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            {currentStage === 'trim' ? renderTrimStage() : renderPostStage()}
        </Modal >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    closeBtn: {
        padding: 4,
    },
    postBtn: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 70,
        alignItems: 'center',
        justifyContent: 'center',
    },
    postBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        color: '#fff',
        fontSize: 15,
    },
    content: {
        flex: 1,
    },
    inputWrapper: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    inputContainer: {
        flex: 1,
        paddingTop: 4,
    },
    audienceBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 2,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 8,
    },
    audienceText: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    input: {
        fontFamily: 'PlusJakartaSans_400Regular',
        fontSize: 18,
        lineHeight: 24,
        textAlignVertical: 'top',
        minHeight: 100,
    },
    toolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderTopWidth: 0.5,
    },
    toolItem: {
        padding: 8,
        marginRight: 4,
    },
    rightTools: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingLeft: 12,
    },
    progressContainer: {
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressTrack: {
        position: 'absolute',
        width: '100%',
        height: 2,
        borderRadius: 1,
    },
    progressFill: {
        height: 2,
        borderRadius: 1,
    },
    divider: {
        width: 1,
        height: 24,
    },
    addBtn: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePreviewContainer: {
        paddingHorizontal: 16,
        paddingBottom: 20,
        gap: 12,
    },
    previewWrapper: {
        width: 150,
        height: 150,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    removeImageBtn: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 26,
        height: 26,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    addMoreBtn: {
        width: 150,
        height: 150,
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    menuContent: {
        width: '100%',
        borderRadius: 16,
        borderWidth: 1,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        position: 'absolute',
        bottom: 0,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
        borderRadius: 8,
    },
    menuText: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    menuSubtext: {
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_400Regular',
        marginTop: 2,
    },
    menuDivider: {
        height: 1,
        marginVertical: 4,
    },
    locationTagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 60,
        gap: 8,
        marginBottom: 12,
    },
    locationChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
    },
    locationChipText: {
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    locationInputSection: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 60,
        paddingVertical: 12,
        borderTopWidth: 0,
        gap: 12,
    },
    locationTextInput: {
        flex: 1,
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 15,
        height: 40,
    },
    addLocationBtn: {
        padding: 4,
    },
    videoOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
    },
    trimStageContent: {
        flex: 1,
        justifyContent: 'center',
    },
    largeVideoContainer: {
        flex: 1,
        width: '100%',
        backgroundColor: '#000',
    },
    largeVideo: {
        width: '100%',
        height: '100%',
    },
    trimmerBottomSection: {
        padding: 20,
        backgroundColor: 'rgba(0,0,0,0.9)',
    },
    headerTitle: {
        fontSize: 17,
        fontFamily: 'PlusJakartaSans_700Bold',
        color: '#fff',
    },
    headerActionText: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    editVideoOverlay: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    editVideoText: {
        color: '#fff',
        fontSize: 10,
        fontFamily: 'PlusJakartaSans_700Bold',
    }
});


