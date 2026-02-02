import CustomLoader from '@/components/CustomLoader';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import VideoPlayer from '@/components/VideoPlayer';
import Colors from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import { commentAPI, postAPI } from '@/utils/apiClient';
import { getSocket } from '@/utils/socket';
import { Ionicons } from '@expo/vector-icons';
import { ResizeMode } from 'expo-av';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, Share, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function PostDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user: currentUser } = useAuth();
    const { showAlert } = useAlert();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [post, setPost] = useState<any>(null);
    const [user, setUser] = useState<any>(null); // Post author
    const [loading, setLoading] = useState(true);
    const [comments, setComments] = useState<any[]>([]);

    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(0);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [sharesCount, setSharesCount] = useState(0);
    const [views, setViews] = useState(0);
    const [isMenuVisible, setMenuVisible] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [replyingTo, setReplyingTo] = useState<any>(null);
    const inputRef = useRef<TextInput>(null);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const showSubscription = Keyboard.addListener(showEvent, () => {
            setKeyboardVisible(true);
        });
        const hideSubscription = Keyboard.addListener(hideEvent, () => {
            setKeyboardVisible(false);
        });

        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, []);

    const fetchData = async () => {
        try {
            const [postRes, commentsRes] = await Promise.all([
                postAPI.getPost(id as string),
                commentAPI.getComments(id as string)
            ]);
            const postData = postRes.data;
            setPost(postData);
            setUser(postData.author || postData.user);
            setLiked(postData.isLiked);
            setLikesCount(postData.likes?.length || postData.likesCount || 0);
            setSharesCount(postData.shares || postData.sharesCount || 0);
            setViews(postData.views || 0);
            setIsBookmarked(postData.savedBy?.includes(currentUser?._id || '') || postData.isBookmarked || false);

            setComments(commentsRes.data || []);

            // Increment view count
            try {
                await postAPI.incrementView(id as string);
            } catch (error) {
                console.error('Failed to increment view:', error);
            }
        } catch (error) {
            console.log('Error fetching post details:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchData();

            const socket = getSocket();

            const handlePostUpdate = (updatedPost: any) => {
                if (updatedPost._id === id) {
                    setPost(updatedPost);
                    setLikesCount(updatedPost.likes?.length || updatedPost.likesCount || 0);
                    setSharesCount(updatedPost.shares || updatedPost.sharesCount || 0);
                    setViews(updatedPost.views || 0);

                    if (currentUser?._id && updatedPost.likes) {
                        setLiked(updatedPost.likes.includes(currentUser._id));
                    }
                    if (currentUser?._id && updatedPost.savedBy) {
                        setIsBookmarked(updatedPost.savedBy.includes(currentUser._id));
                    }
                }
            };

            const handleNewComment = (data: any) => {
                if (data.postId === id) {
                    setComments(prev => {
                        if (prev.some(c => (c._id || c.id) === (data.comment._id || data.comment.id))) return prev;
                        return [data.comment, ...prev];
                    });
                }
            };

            socket.on('post:updated', handlePostUpdate);
            socket.on('comment:new', handleNewComment);

            return () => {
                socket.off('post:updated', handlePostUpdate);
                socket.off('comment:new', handleNewComment);
            };
        }
    }, [id, currentUser?._id]);

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                <Stack.Screen options={{ headerShown: false }} />
                <CustomLoader message="Loading post..." />
            </View>
        );
    }

    if (!post) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <Text style={{ color: colors.text }}>Post not found</Text>
                <TouchableOpacity onPress={() => router.back()} style={{ padding: 10 }}>
                    <Text style={{ color: colors.primary }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleBack = () => router.back();

    const handleLike = async () => {
        const prevLiked = liked;
        const prevCount = likesCount;
        setLiked(!liked);
        setLikesCount(prev => !prevLiked ? prev + 1 : prev - 1);
        try {
            await postAPI.likePost(id as string);
        } catch (error) {
            console.log('Error liking post:', error);
            setLiked(prevLiked);
            setLikesCount(prevCount);
        }
    };

    const handleShare = async () => {
        try {
            const result = await Share.share({
                message: post?.content || '',
                title: 'Check out this post on Dorm',
            });
            if (result.action === Share.sharedAction) {
                setSharesCount(prev => prev + 1);
                await postAPI.sharePost(id as string);
            }
        } catch (error) {
            console.log('Error sharing:', error);
        }
    };

    const handleBookmark = async () => {
        const prevBookmarked = isBookmarked;
        setIsBookmarked(!isBookmarked);
        try {
            await postAPI.bookmarkPost(id as string);
        } catch (error) {
            console.log('Error bookmarking:', error);
            setIsBookmarked(prevBookmarked);
        }
    };

    const focusComment = () => {
        inputRef.current?.focus();
    };

    const handleCopyLink = async () => {
        setMenuVisible(false);
        const postUrl = `https://dorm.app/post/${id}`;
        await Clipboard.setStringAsync(postUrl);
        showAlert({
            title: 'Link Copied',
            description: 'Post link has been copied to your clipboard.',
            type: 'success'
        });
    };

    const handleNotInterested = async () => {
        setMenuVisible(false);
        try {
            await postAPI.notInterested(id as string);
            router.back(); // Usually, if you're not interested, you want to leave the page
        } catch (error) {
            console.log('Error marking as not interested:', error);
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
                    await postAPI.reportPost(id as string, 'Inappropriate content');
                    showAlert({
                        title: 'Report Submitted',
                        description: 'Thank you for keeping our community safe. We will review this post.',
                        type: 'success'
                    });
                } catch (error) {
                    console.log('Error reporting post:', error);
                }
            }
        });
    };

    const handlePostComment = async () => {
        if (!commentText.trim()) return;

        const content = commentText;
        const parentId = replyingTo?._id || replyingTo?.id;
        console.log('📤 [Frontend] Posting comment. Parent ID:', parentId);

        setCommentText('');
        setReplyingTo(null);
        Keyboard.dismiss();

        try {
            const { data: newComment } = await commentAPI.createComment({
                postId: id as string,
                content,
                parentCommentId: parentId
            });

            if (replyingTo) {
                setComments(prev => prev.map(c => {
                    const cid = c._id || c.id;
                    const rid = replyingTo.id || replyingTo._id;
                    if (cid === rid) {
                        return { ...c, replies: [...(c.replies || []), newComment] };
                    }
                    return c;
                }));
            } else {
                setComments(prev => {
                    if (prev.some(c => (c._id || c.id) === (newComment._id || newComment.id))) return prev;
                    return [newComment, ...prev];
                });
            }

        } catch (error) {
            console.log('Error posting comment:', error);
            alert('Failed to post comment');
        }
    };

    const startReply = (comment: any) => {
        setReplyingTo(comment);
        setCommentText(`@${comment.user?.name || 'User'} `);
        inputRef.current?.focus();
    };

    const handleProfilePress = (userId: string) => {
        if (currentUser?._id === userId) {
            router.push('/profile');
        } else {
            router.push(`/user/${userId}`);
        }
    };

    const handleLikeComment = async (commentId: string) => {
        try {
            // Optimistic update
            setComments(prev => prev.map(c => {
                const currentId = c._id || c.id;
                if (currentId === commentId) {
                    const alreadyLiked = c.likes?.includes(currentUser?._id);
                    const newLikes = alreadyLiked
                        ? (c.likes || []).filter((id: string) => id !== currentUser?._id)
                        : [...(c.likes || []), currentUser?._id];
                    return { ...c, likes: newLikes };
                }

                // Also check replies
                if (c.replies) {
                    const updatedReplies = c.replies.map((r: any) => {
                        const rid = r._id || r.id;
                        if (rid === commentId) {
                            const alreadyLiked = r.likes?.includes(currentUser?._id);
                            const newLikes = alreadyLiked
                                ? (r.likes || []).filter((id: string) => id !== currentUser?._id)
                                : [...(r.likes || []), currentUser?._id];
                            return { ...r, likes: newLikes };
                        }
                        return r;
                    });
                    return { ...c, replies: updatedReplies };
                }
                return c;
            }));

            await commentAPI.likeComment(commentId);
        } catch (error) {
            console.log('Error liking comment:', error);
        }
    };

    const getRelativeTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleDateString();
    };

    const getInitials = (name: string) => {
        if (!name) return 'U';
        const parts = name.split(' ').filter(p => p.length > 0);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return parts[0] ? parts[0][0].toUpperCase() : 'U';
    };

    const handleDeleteComment = async (commentId: string) => {
        showAlert({
            title: 'Delete Comment',
            description: 'Are you sure you want to delete this comment?',
            type: 'error',
            showCancel: true,
            buttonText: 'Delete',
            onConfirm: async () => {
                try {
                    await commentAPI.deleteComment(commentId);
                    setComments(prev => prev.filter(c => {
                        if ((c._id || c.id) === commentId) return false;
                        if (c.replies) {
                            c.replies = c.replies.filter((r: any) => (r._id || r.id) !== commentId);
                        }
                        return true;
                    }));
                    showAlert({
                        title: 'Success',
                        description: 'Comment deleted successfully',
                        type: 'success'
                    });
                } catch (error) {
                    console.log('Error deleting comment:', error);
                    showAlert({
                        title: 'Error',
                        description: 'Failed to delete comment',
                        type: 'error'
                    });
                }
            }
        });
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={{ paddingTop: insets.top, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Post</Text>
                    <View style={{ width: 40 }} />
                </View>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 60 : 0}
            >
                <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                    <View style={styles.postSection}>
                        {/* Header */}
                        <View style={styles.postHeader}>
                            <View style={styles.authorInfo}>
                                <TouchableOpacity onPress={() => handleProfilePress(user?._id)}>
                                    <Image
                                        source={{ uri: user?.avatar || 'https://ui-avatars.com/api/?name=' + (user?.name || 'User') }}
                                        style={styles.avatar}
                                    />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleProfilePress(user?._id)} style={styles.userInfo}>
                                    <View style={styles.nameRow}>
                                        <Text style={[styles.userName, { color: colors.text }]}>{user?.name || 'Deleted User'}</Text>
                                        {user?.role === 'ambassador' && (
                                            <View style={styles.ambassadorBadge}>
                                                <Ionicons name="ribbon" size={10} color="#fff" />
                                                <Text style={styles.ambassadorText}>Ambassador</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={[styles.userHandle, { color: colors.subtext }]}>{user?.university || 'Academic Profile Missing'}</Text>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity onPress={() => setMenuVisible(true)}>
                                <Ionicons name="ellipsis-horizontal" size={20} color={colors.subtext} />
                            </TouchableOpacity>
                        </View>

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
                                    <TouchableOpacity style={styles.menuItem} onPress={handleCopyLink}>
                                        <Ionicons name="link-outline" size={20} color={colors.text} />
                                        <Text style={[styles.menuText, { color: colors.text }]}>Copy Link</Text>
                                    </TouchableOpacity>
                                    <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
                                    <TouchableOpacity style={styles.menuItem} onPress={handleNotInterested}>
                                        <Ionicons name="eye-off-outline" size={20} color={colors.text} />
                                        <Text style={[styles.menuText, { color: colors.text }]}>Not interested</Text>
                                    </TouchableOpacity>
                                    <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
                                    <TouchableOpacity style={styles.menuItem} onPress={handleReport}>
                                        <Ionicons name="flag-outline" size={20} color={colors.error} />
                                        <Text style={[styles.menuText, { color: colors.error }]}>Report Post</Text>
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        </Modal>

                        {/* Content */}
                        <Text style={[styles.content, { color: colors.text }]}>{post.content}</Text>

                        {/* Locations */}
                        {post.locations && post.locations.length > 0 && (
                            <View style={styles.locationsRow}>
                                {post.locations.map((loc: string, index: number) => (
                                    <View key={index} style={[styles.locationBadge, { backgroundColor: colors.primary + '10' }]}>
                                        <Ionicons name="location" size={12} color={colors.primary} />
                                        <Text style={[styles.locationText, { color: colors.primary }]}>{loc}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Video */}
                        {post.video && typeof post.video === 'string' && post.video.length > 0 && (
                            <View style={styles.videoContainer}>
                                <VideoPlayer
                                    uri={post.video}
                                    postId={post._id}
                                    style={styles.postVideo}
                                    resizeMode={ResizeMode.CONTAIN}
                                    autoPlay={true}
                                    isLooping={true}
                                />
                            </View>
                        )}

                        {/* Images */}
                        {post.images && post.images.length > 0 && (
                            <View style={styles.imageGrid}>
                                {post.images.map((img: string, index: number) => (
                                    <Image key={index} source={{ uri: img }} style={styles.postImage} contentFit="cover" />
                                ))}
                            </View>
                        )}

                        <Text style={[styles.timestamp, { color: colors.subtext }]}>
                            {new Date(post.createdAt).toLocaleString()} • <Text style={{ fontWeight: 'bold', color: colors.text }}>{sharesCount}</Text> Shares
                        </Text>

                        <View style={[styles.statsRow, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
                            <View style={styles.stat}>
                                <Text style={[styles.statValue, { color: colors.text }]}>{likesCount}</Text>
                                <Text style={[styles.statLabel, { color: colors.subtext }]}>Likes</Text>
                            </View>
                            <View style={styles.stat}>
                                <Text style={[styles.statValue, { color: colors.text }]}>{comments.length}</Text>
                                <Text style={[styles.statLabel, { color: colors.subtext }]}>Comments</Text>
                            </View>
                            <View style={styles.stat}>
                                <Text style={[styles.statValue, { color: colors.text }]}>{views}</Text>
                                <Text style={[styles.statLabel, { color: colors.subtext }]}>Views</Text>
                            </View>
                        </View>

                        <View style={styles.actionRow}>
                            <TouchableOpacity onPress={handleLike} style={styles.actionIcon}>
                                <Ionicons
                                    name={liked ? "heart" : "heart-outline"}
                                    size={24}
                                    color={liked ? colors.error : colors.subtext}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={focusComment} style={styles.actionIcon}>
                                <Ionicons name="chatbubble-outline" size={24} color={colors.subtext} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleShare} style={styles.actionIcon}>
                                <Ionicons name="share-social-outline" size={24} color={colors.subtext} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleBookmark} style={styles.actionIcon}>
                                <Ionicons
                                    name={isBookmarked ? "bookmark" : "bookmark-outline"}
                                    size={24}
                                    color={isBookmarked ? colors.primary : colors.subtext}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.commentsSection}>
                        {comments.map((comment: any) => {
                            const isCommentAuthor = currentUser?._id === (comment.user?._id || comment.userId?._id || comment.userId);
                            const isPostAuthor = currentUser?._id === (user?._id || post?.userId?._id || post?.userId);

                            return (
                                <View key={comment._id || comment.id} style={[styles.commentContainer, { borderBottomColor: colors.border }]}>
                                    <View style={styles.commentRow}>
                                        <View style={styles.avatarColumn}>
                                            <TouchableOpacity onPress={() => handleProfilePress(comment.user?._id)}>
                                                {comment.user?.avatar ? (
                                                    <Image
                                                        source={{ uri: comment.user.avatar }}
                                                        style={styles.commentAvatar}
                                                    />
                                                ) : (
                                                    <View style={[styles.commentAvatar, styles.initialsContainer, { backgroundColor: colors.primary + '15' }]}>
                                                        <Text style={[styles.initialsText, { color: colors.primary, fontSize: 14 }]}>
                                                            {getInitials(comment.user?.name || 'User')}
                                                        </Text>
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                            {comment.replies && comment.replies.length > 0 && (
                                                <View style={[styles.threadConnector, { backgroundColor: colors.border }]} />
                                            )}
                                        </View>
                                        <View style={styles.commentContent}>
                                            <TouchableOpacity onPress={() => handleProfilePress(comment.user?._id)} style={styles.commentHeader}>
                                                <View style={styles.nameRow}>
                                                    <Text
                                                        style={[styles.commentUser, { color: colors.text }]}
                                                        numberOfLines={1}
                                                        ellipsizeMode="tail"
                                                    >
                                                        {comment.user?.name || 'User'}
                                                    </Text>
                                                    {comment.user?.role === 'ambassador' && (
                                                        <View style={[styles.ambassadorBadge, { paddingHorizontal: 6, paddingVertical: 1 }]}>
                                                            <Ionicons name="ribbon" size={8} color="#fff" />
                                                            <Text style={[styles.ambassadorText, { fontSize: 8 }]}>Ambassador</Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <Text style={[styles.commentTime, { color: colors.subtext }]}>{getRelativeTime(comment.createdAt || comment.timestamp)}</Text>
                                            </TouchableOpacity>
                                            <Text style={[styles.commentText, { color: colors.text }]}>{comment.content}</Text>

                                            <View style={styles.commentActions}>
                                                <TouchableOpacity
                                                    style={styles.commentAction}
                                                    onPress={() => handleLikeComment(comment._id || comment.id)}
                                                >
                                                    <Ionicons
                                                        name={comment.likes?.includes(currentUser?._id) ? "heart" : "heart-outline"}
                                                        size={16}
                                                        color={comment.likes?.includes(currentUser?._id) ? "#ef4444" : colors.subtext}
                                                    />
                                                    <Text style={[styles.commentActionText, { color: colors.subtext }]}>{comment.likes?.length || comment.likesCount || 0}</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity onPress={() => startReply(comment)} style={styles.commentAction}>
                                                    <Ionicons name="chatbubble-outline" size={16} color={colors.subtext} />
                                                    <Text style={[styles.commentActionText, { color: colors.subtext }]}>Reply</Text>
                                                </TouchableOpacity>

                                                {(isCommentAuthor || isPostAuthor) && (
                                                    <TouchableOpacity onPress={() => handleDeleteComment(comment._id || comment.id)} style={styles.commentAction}>
                                                        <Ionicons name="trash-outline" size={16} color={colors.error} />
                                                        <Text style={[styles.commentActionText, { color: colors.error }]}>Delete</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>

                                            {comment.replies && comment.replies.map((reply: any) => {
                                                const isReplyAuthor = currentUser?._id === (reply.user?._id || reply.userId?._id || reply.userId);
                                                return (
                                                    <View key={reply._id || reply.id} style={styles.replyContainer}>
                                                        <TouchableOpacity onPress={() => handleProfilePress(reply.user?._id)}>
                                                            {reply.user?.avatar ? (
                                                                <Image
                                                                    source={{ uri: reply.user.avatar }}
                                                                    style={styles.replyAvatar}
                                                                />
                                                            ) : (
                                                                <View style={[styles.replyAvatar, styles.initialsContainer, { backgroundColor: colors.primary + '15' }]}>
                                                                    <Text style={[styles.initialsText, { color: colors.primary, fontSize: 12 }]}>
                                                                        {getInitials(reply.user?.name || 'User')}
                                                                    </Text>
                                                                </View>
                                                            )}
                                                        </TouchableOpacity>
                                                        <View style={styles.commentContent}>
                                                            <TouchableOpacity onPress={() => handleProfilePress(reply.user?._id)} style={styles.commentHeader}>
                                                                <View style={styles.nameRow}>
                                                                    <Text
                                                                        style={[styles.commentUser, { color: colors.text }]}
                                                                        numberOfLines={1}
                                                                        ellipsizeMode="tail"
                                                                    >
                                                                        {reply.user?.name || 'User'}
                                                                    </Text>
                                                                    {reply.user?.role === 'ambassador' && (
                                                                        <View style={[styles.ambassadorBadge, { paddingHorizontal: 6, paddingVertical: 1 }]}>
                                                                            <Ionicons name="ribbon" size={8} color="#fff" />
                                                                            <Text style={[styles.ambassadorText, { fontSize: 8 }]}>Ambassador</Text>
                                                                        </View>
                                                                    )}
                                                                </View>
                                                                <Text style={[styles.commentTime, { color: colors.subtext }]}>{getRelativeTime(reply.createdAt || reply.timestamp)}</Text>
                                                            </TouchableOpacity>
                                                            <Text style={[styles.replyToText, { color: colors.subtext }]}>
                                                                Replying to <Text style={{ color: colors.primary }}>@{comment.user?.name}</Text>
                                                            </Text>
                                                            <Text style={[styles.commentText, { color: colors.text }]}>{reply.content}</Text>

                                                            <View style={styles.commentActions}>
                                                                <TouchableOpacity
                                                                    style={styles.commentAction}
                                                                    onPress={() => handleLikeComment(reply._id || reply.id)}
                                                                >
                                                                    <Ionicons
                                                                        name={reply.likes?.includes(currentUser?._id) ? "heart" : "heart-outline"}
                                                                        size={14}
                                                                        color={reply.likes?.includes(currentUser?._id) ? "#ef4444" : colors.subtext}
                                                                    />
                                                                    <Text style={[styles.commentActionText, { color: colors.subtext }]}>{reply.likes?.length || 0}</Text>
                                                                </TouchableOpacity>

                                                                {(isReplyAuthor || isPostAuthor) && (
                                                                    <TouchableOpacity onPress={() => handleDeleteComment(reply._id || reply.id)} style={styles.commentAction}>
                                                                        <Ionicons name="trash-outline" size={14} color={colors.error} />
                                                                        <Text style={[styles.commentActionText, { color: colors.error }]}>Delete</Text>
                                                                    </TouchableOpacity>
                                                                )}
                                                            </View>
                                                        </View>
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>

                <View style={[
                    styles.composerContainer,
                    {
                        borderTopColor: colors.border,
                        backgroundColor: colors.card,
                        paddingBottom: isKeyboardVisible ? (Platform.OS === 'ios' ? 8 : 12) : Math.max(insets.bottom, 12)
                    }
                ]}>
                    {replyingTo && (
                        <View style={[styles.replyingIndicator, { backgroundColor: colors.card }]}>
                            <Text style={[styles.replyingText, { color: colors.subtext }]}>
                                Replying to <Text style={{ color: colors.primary, fontWeight: 'bold' }}>@{replyingTo.user?.name}</Text>
                            </Text>
                            <TouchableOpacity onPress={() => setReplyingTo(null)}>
                                <Ionicons name="close-circle" size={18} color={colors.subtext} />
                            </TouchableOpacity>
                        </View>
                    )}
                    <View style={[styles.composer, { backgroundColor: colors.card }]}>
                        <TouchableOpacity onPress={currentUser?._id ? () => handleProfilePress(currentUser?._id) : undefined}>
                            {currentUser?.avatar ? (
                                <Image
                                    source={{ uri: currentUser.avatar }}
                                    style={styles.composerAvatar}
                                />
                            ) : (
                                <View style={[styles.composerAvatar, styles.initialsContainer, { backgroundColor: colors.primary + '15' }]}>
                                    <Text style={[styles.initialsText, { color: colors.primary, fontSize: 12 }]}>
                                        {getInitials(currentUser?.name || 'User')}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        <TextInput
                            ref={inputRef}
                            placeholder="Post your reply"
                            placeholderTextColor={colors.subtext}
                            style={[styles.composerInput, { color: colors.text }]}
                            value={commentText}
                            onChangeText={setCommentText}
                            multiline
                        />
                        <TouchableOpacity
                            disabled={!commentText.trim()}
                            style={[styles.sendBtn, { opacity: commentText.trim() ? 1 : 0.5 }]}
                            onPress={handlePostComment}
                        >
                            <Text style={[styles.sendBtnText, { color: colors.primary }]}>Reply</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    scroll: {
        flex: 1,
    },
    postSection: {
        padding: 16,
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    authorInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    authorName: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    authorHandle: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_400Regular',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    userHandle: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_400Regular',
    },
    content: {
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_400Regular',
        lineHeight: 26,
        marginBottom: 16,
    },
    imageGrid: {
        marginTop: 12,
        borderRadius: 16,
        overflow: 'hidden',
    },
    postImage: {
        width: '100%',
        aspectRatio: 16 / 9,
    },
    locationsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginVertical: 12,
    },
    locationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    locationText: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    videoContainer: {
        width: '100%',
        aspectRatio: 16 / 9,
        backgroundColor: '#000',
        borderRadius: 16,
        marginVertical: 12,
        overflow: 'hidden',
    },
    postVideo: {
        width: '100%',
        height: '100%',
    },
    postStats: {
        // This style was not fully defined in the instruction, keeping it as is or removing if not used.
        // Based on the instruction, it seems like a partial line.
        // Assuming it was meant to be part of a larger style or a placeholder.
        // For now, I'll keep it as is, but it might be an error in the instruction.
        // If it's meant to be a margin or padding, it should be defined.
        // Given the context, it's likely a typo and should be removed or corrected.
        // I will remove it as it's incomplete and not used.
    },
    timestamp: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_400Regular',
        marginTop: 16, // Added marginTop to separate from media/content
        marginBottom: 16,
    },
    statsRow: {
        flexDirection: 'row',
        paddingVertical: 16,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        gap: 24,
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statValue: {
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    statLabel: {
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_400Regular',
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    actionIcon: {
        padding: 8,
    },
    commentsSection: {
        borderTopWidth: 0.5,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    commentContainer: {
        padding: 16,
        borderBottomWidth: 0.5,
    },
    commentRow: {
        flexDirection: 'row',
    },
    avatarColumn: {
        alignItems: 'center',
        marginRight: 12,
    },
    commentAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    initialsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    initialsText: {
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    threadConnector: {
        width: 2,
        flex: 1,
        marginTop: 4,
        borderRadius: 1,
        opacity: 0.3,
    },
    commentContent: {
        flex: 1,
    },
    commentHeader: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 2,
    },
    commentUser: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_700Bold',
        maxWidth: '70%',
    },
    commentTime: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_400Regular',
    },
    replyToText: {
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_400Regular',
        marginBottom: 2,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    ambassadorBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#8b5cf6',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        gap: 3,
    },
    ambassadorText: {
        color: '#fff',
        fontSize: 9,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    commentText: {
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_400Regular',
        lineHeight: 20,
    },
    commentActions: {
        flexDirection: 'row',
        gap: 24,
        marginTop: 8,
    },
    commentAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    commentActionText: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    replyContainer: {
        flexDirection: 'row',
        marginTop: 16,
    },
    replyAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        marginRight: 10,
    },
    composerContainer: {
        borderTopWidth: 0.5,
        minHeight: 60,
    },
    replyingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    replyingText: {
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_400Regular',
    },
    composer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    composerAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 12,
    },
    composerInput: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_400Regular',
        maxHeight: 100,
        minHeight: 40,
        paddingTop: Platform.OS === 'ios' ? 8 : 0,
    },
    sendBtn: {
        paddingLeft: 12,
    },
    sendBtnText: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_700Bold',
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
    videoLoader: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
});


