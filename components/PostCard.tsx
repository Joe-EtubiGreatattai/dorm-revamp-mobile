import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useAlert } from '@/context/AlertContext';
import { useRouter } from 'expo-router';
import { Share } from 'react-native';

import { postAPI } from '@/utils/apiClient';
import CreatePostModal from './CreatePostModal';

const { width } = Dimensions.get('window');

interface ReplyProps {
    id: string;
    userId: string;
    content: string;
    timestamp: string;
    likes: number;
}

interface CommentProps {
    id: string;
    userId: string;
    content: string;
    timestamp: string;
    likes: number;
    replies: ReplyProps[];
}

interface PostProps {
    _id: string;
    user: {
        _id: string;
        name: string;
        avatar: string;
        monetizationEnabled?: boolean;
    } | null;
    content: string;
    images: string[];
    timestamp: string;
    likes: string[] | number; // Support both for robustness
    shares: number;
    liked?: boolean;
    savedBy?: string[];
    comments: CommentProps[];
}

export default function PostCard({ post }: { post: PostProps }) {
    const { user: currentUser } = useAuth();
    const { showAlert } = useAlert();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const getLikesCount = (l: any) => (Array.isArray(l) ? l.length : (typeof l === 'number' ? l : (l ? 1 : 0)));
    const isLikedByUser = (l: any) => (Array.isArray(l) ? l.includes(currentUser?._id || '') : !!post.liked);

    const [liked, setLiked] = React.useState(isLikedByUser(post.likes));
    const [likesCount, setLikesCount] = React.useState(getLikesCount(post.likes));
    const [sharesCount, setSharesCount] = React.useState(post.shares || 0);
    const [bookmarked, setBookmarked] = React.useState(post.savedBy?.includes(currentUser?._id || '') || false);
    const [isMenuVisible, setMenuVisible] = React.useState(false);
    const [isVisible, setIsVisible] = React.useState(true);
    const [isEditModalVisible, setEditModalVisible] = useState(false);

    // Sync state with props for real-time updates from parent
    React.useEffect(() => {
        setLiked(isLikedByUser(post.likes));
        setLikesCount(getLikesCount(post.likes));
        setSharesCount(post.shares || 0);
        setBookmarked(post.savedBy?.includes(currentUser?._id || '') || false);
    }, [post.likes, post.shares, post.savedBy, currentUser?._id, post.liked]);

    const likeScale = useSharedValue(1);

    const animatedLikeStyle = useAnimatedStyle(() => ({
        transform: [{ scale: likeScale.value }],
    }));

    const handleLike = async (e: any) => {
        e.stopPropagation();
        const prevLiked = liked;
        const prevCount = likesCount;

        const newLiked = !liked;
        setLiked(newLiked);
        setLikesCount(prev => newLiked ? prev + 1 : prev - 1);

        likeScale.value = withSpring(1.5, {}, () => {
            likeScale.value = withSpring(1);
        });

        try {
            await postAPI.likePost(post._id);
        } catch (error) {
            setLiked(prevLiked);
            setLikesCount(prevCount);
        }
    };

    const handleShare = async (e: any) => {
        e.stopPropagation();
        try {
            const result = await Share.share({
                message: post.content,
                title: 'Share Post',
            });
            if (result.action === Share.sharedAction) {
                setSharesCount(prev => prev + 1);
                await postAPI.sharePost(post._id);
            }
        } catch (error) {
        }
    };

    const handleBookmark = async (e: any) => {
        e.stopPropagation();
        const prevBookmarked = bookmarked;
        setBookmarked(!bookmarked);

        try {
            await postAPI.bookmarkPost(post._id);
        } catch (error) {
            setBookmarked(prevBookmarked);
        }
    };

    const handlePress = () => {
        router.push(`/post/${post._id}`);
    };


    const handleNotInterested = async () => {
        setMenuVisible(false);
        setIsVisible(false); // Optimistic hide
        try {
            await postAPI.notInterested(post._id);
        } catch (error) {
            setIsVisible(true);
        }
    };

    const handleReport = async () => {
        setMenuVisible(false);
        showAlert({
            title: 'Report Post',
            description: 'Are you sure you want to report this post for inappropriate content?',
            type: 'error',
            showCancel: true,
            buttonText: 'Report',
            onConfirm: async () => {
                try {
                    await postAPI.reportPost(post._id, 'Inappropriate content');
                    showAlert({
                        title: 'Report Submitted',
                        description: 'Thank you for keeping our community safe. We will review this post.',
                        type: 'success'
                    });
                } catch (error) {
                }
            }
        });
    };

    const handleDelete = async () => {
        setMenuVisible(false);
        showAlert({
            title: 'Delete Post',
            description: 'Are you sure you want to delete this post? This action cannot be undone.',
            type: 'error',
            showCancel: true,
            buttonText: 'Delete',
            onConfirm: async () => {
                try {
                    await postAPI.deletePost(post._id);
                    setIsVisible(false);
                    showAlert({
                        title: 'Post Deleted',
                        description: 'Your post has been successfully deleted.',
                        type: 'success'
                    });
                } catch (error) {
                    showAlert({
                        title: 'Delete Failed',
                        description: 'Could not delete post. Please try again.',
                        type: 'error'
                    });
                }
            }
        });
    };

    const handleEdit = () => {
        setMenuVisible(false);
        setEditModalVisible(true);
    };

    const handleProfilePress = (e: any) => {
        e.stopPropagation();
        if (post.user?._id) {
            if (currentUser?._id === post.user._id) {
                router.push('/profile');
            } else {
                router.push(`/user/${post.user._id}`);
            }
        }
    };

    if (!isVisible) return null;

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={handlePress}
            style={[styles.container, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleProfilePress} activeOpacity={0.7}>
                    <Image
                        source={{ uri: post.user?.avatar || 'https://ui-avatars.com/api/?name=' + (post.user?.name || 'User') }}
                        style={styles.avatar}
                    />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleProfilePress} activeOpacity={0.7} style={styles.userInfo}>
                    <View style={styles.nameContainer}>
                        <Text style={[styles.userName, { color: colors.text }]}>{post.user?.name || 'Deleted User'}</Text>
                        {post.user?.monetizationEnabled && (
                            <Ionicons name="checkmark-circle" size={16} color="#10b981" style={styles.monetizedIcon} />
                        )}
                    </View>
                    <Text style={[styles.timestamp, { color: colors.subtext }]}>{post.timestamp}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={(e) => { e.stopPropagation(); setMenuVisible(true); }}>
                    <Ionicons name="ellipsis-horizontal" size={20} color={colors.subtext} />
                </TouchableOpacity>

                {/* Post Options Menu */}
                <Modal
                    visible={isMenuVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setMenuVisible(false)}
                >
                    <TouchableOpacity
                        style={styles.menuOverlay}
                        activeOpacity={1}
                        onPress={() => setMenuVisible(false)}
                    >
                        <View style={[styles.menuContent, { backgroundColor: colors.card, borderColor: colors.border }]}>

                            {currentUser?._id === post.user?._id ? (
                                <>
                                    <TouchableOpacity style={styles.menuItem} onPress={handleEdit}>
                                        <Ionicons name="create-outline" size={20} color={colors.text} />
                                        <Text style={[styles.menuText, { color: colors.text }]}>Edit Post</Text>
                                    </TouchableOpacity>
                                    <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
                                    <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
                                        <Ionicons name="trash-outline" size={20} color={colors.error} />
                                        <Text style={[styles.menuText, { color: colors.error }]}>Delete Post</Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    <TouchableOpacity style={styles.menuItem} onPress={handleNotInterested}>
                                        <Ionicons name="eye-off-outline" size={20} color={colors.text} />
                                        <Text style={[styles.menuText, { color: colors.text }]}>Not interested</Text>
                                    </TouchableOpacity>
                                    <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
                                    <TouchableOpacity style={styles.menuItem} onPress={handleReport}>
                                        <Ionicons name="flag-outline" size={20} color={colors.error} />
                                        <Text style={[styles.menuText, { color: colors.error }]}>Report Post</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </TouchableOpacity>
                </Modal>
            </View>

            {/* Content */}
            <Text style={[styles.content, { color: colors.text }]}>{post.content}</Text>

            {/* Images */}
            {post.images.length > 0 && (
                <View style={styles.imageGrid}>
                    {post.images.map((img, index) => (
                        <Image
                            key={index}
                            source={{ uri: img }}
                            style={[
                                styles.postImage,
                                post.images.length === 1 ? styles.singleImage : styles.multiImage
                            ]}
                            contentFit="cover"
                        />
                    ))}
                </View>
            )}

            {/* Actions */}
            <View style={styles.footer}>
                <View style={styles.leftActions}>
                    <TouchableOpacity onPress={handleLike} style={styles.actionBtn}>
                        <Animated.View style={animatedLikeStyle}>
                            <Ionicons
                                name={liked ? "heart" : "heart-outline"}
                                size={22}
                                color={liked ? colors.error : colors.subtext}
                            />
                        </Animated.View>
                        <Text style={[styles.actionText, { color: colors.subtext }]}>{likesCount}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handlePress} style={styles.actionBtn}>
                        <Ionicons name="chatbubble-outline" size={20} color={colors.subtext} />
                        <Text style={[styles.actionText, { color: colors.subtext }]}>{post.comments.length}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleShare} style={styles.actionBtn}>
                        <Ionicons name="share-social-outline" size={20} color={colors.subtext} />
                        <Text style={[styles.actionText, { color: colors.subtext }]}>{sharesCount}</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={handleBookmark}>
                    <Ionicons
                        name={bookmarked ? "star" : "star-outline"}
                        size={22}
                        color={bookmarked ? colors.primary : colors.subtext}
                    />
                </TouchableOpacity>
            </View>

            {/* Edit Post Modal */}
            {currentUser?._id === post.user?._id && (
                <CreatePostModal
                    visible={isEditModalVisible}
                    onClose={() => setEditModalVisible(false)}
                    post={post}
                />
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        borderBottomWidth: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    monetizedIcon: {
        marginLeft: 2,
    },
    timestamp: {
        fontFamily: 'PlusJakartaSans_400Regular',
        fontSize: 12,
        marginTop: 2,
    },
    content: {
        fontFamily: 'PlusJakartaSans_400Regular',
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 12,
    },
    imageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    postImage: {
        borderRadius: 12,
        backgroundColor: '#eee',
    },
    singleImage: {
        width: '100%',
        height: 250,
    },
    multiImage: {
        width: (width - 40) / 2,
        height: 150,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    leftActions: {
        flexDirection: 'row',
        gap: 20,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    actionText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
    },
    menuOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuContent: {
        width: 250,
        borderRadius: 20,
        padding: 8,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        gap: 12,
    },
    menuText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 16,
    },
    menuDivider: {
        height: 1,
        marginHorizontal: 8,
    },
});
