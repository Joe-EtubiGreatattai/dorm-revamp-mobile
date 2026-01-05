import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { postAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
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

export default function CreatePostModal({ visible, onClose }: { visible: boolean, onClose: () => void }) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { user } = useAuth();
    const [content, setContent] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [visibility, setVisibility] = useState<'public' | 'school'>('public');
    const [isVisibilityMenuVisible, setVisibilityMenuVisible] = useState(false);
    const [loading, setLoading] = useState(false);

    const maxLength = 280;
    const progress = Math.min(content.length / maxLength, 1);

    const insets = useSafeAreaInsets();

    const pickImages = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            selectionLimit: 5 - images.length,
            quality: 0.7,
        });

        if (!result.canceled) {
            const newImages = result.assets.map((asset: any) => asset.uri);
            setImages([...images, ...newImages].slice(0, 5));
        }
    };

    const removeImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index));
    };

    const handlePost = async () => {
        if (!content.trim() && images.length === 0) return;

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('content', content);
            formData.append('visibility', visibility);

            images.forEach((uri, index) => {
                const filename = uri.split('/').pop() || `image_${index}.jpg`;
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : `image`;

                // @ts-ignore
                formData.append('images', {
                    uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
                    name: filename,
                    type,
                });
            });

            await postAPI.createPost(formData);
            setContent('');
            setImages([]);
            onClose();
        } catch (error) {
            console.log('Error creating post:', error);
            alert('Failed to post. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 10) }]}>
                {/* Twitter-style Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Ionicons name="close" size={28} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        disabled={!content.trim() || loading}
                        style={[
                            styles.postBtn,
                            { backgroundColor: colors.primary, opacity: content.trim() && !loading ? 1 : 0.5 }
                        ]}
                        onPress={handlePost}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.postBtnText}>Post</Text>
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

                                <TextInput
                                    multiline
                                    placeholder="What's happening?"
                                    placeholderTextColor={colors.subtext}
                                    style={[styles.input, { color: colors.text }]}
                                    value={content}
                                    onChangeText={(text) => text.length <= maxLength && setContent(text)}
                                    autoFocus
                                    scrollEnabled={false}
                                />
                            </View>
                        </View>

                        {/* Image Preview */}
                        {images.length > 0 && (
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.imagePreviewContainer}
                            >
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
                                {images.length < 5 && (
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
                        <TouchableOpacity style={styles.toolItem}>
                            <Ionicons name="videocam-outline" size={24} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.toolItem}>
                            <Ionicons name="location-outline" size={24} color={colors.primary} />
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
                            <TouchableOpacity style={[styles.addBtn, { borderColor: colors.border }]}>
                                <Ionicons name="add" size={20} color={colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
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
        fontSize: 13,
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
});
