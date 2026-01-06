import CustomLoader from '@/components/CustomLoader';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { commentAPI, postAPI } from '@/utils/apiClient';
import { getSocket } from '@/utils/socket';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function PostDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user: currentUser } = useAuth();
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
            setIsBookmarked(postData.savedBy?.includes(currentUser?._id || '') || postData.isBookmarked || false);

            setComments(commentsRes.data || []);
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
        setCommentText('');
        setReplyingTo(null);
        Keyboard.dismiss();

        try {
            const { data: newComment } = await commentAPI.createComment({
                postId: id as string,
                content,
                parentCommentId: replyingTo?.id
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

    const getRelativeTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleDateString();
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
                        <View style={styles.userRow}>
                            <TouchableOpacity onPress={() => handleProfilePress(user?._id)}>
                                <Image
                                    source={{ uri: user?.avatar || 'https://ui-avatars.com/api/?name=' + (user?.name || 'User') }}
                                    style={styles.avatar}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleProfilePress(user?._id)} style={styles.userInfo}>
                                <Text style={[styles.userName, { color: colors.text }]}>{user?.name || 'Deleted User'}</Text>
                                <Text style={[styles.userHandle, { color: colors.subtext }]}>{user?.university || 'Academic Profile Missing'}</Text>
                            </TouchableOpacity>
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

                        <Text style={[styles.content, { color: colors.text }]}>{post.content}</Text>

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
                        {comments.map((comment: any) => (
                            <View key={comment._id || comment.id} style={[styles.commentContainer, { borderBottomColor: colors.border }]}>
                                <View style={styles.commentRow}>
                                    <TouchableOpacity onPress={() => handleProfilePress(comment.user?._id)}>
                                        <Image
                                            source={{ uri: comment.user?.avatar || 'https://ui-avatars.com/api/?name=' + (comment.user?.name || 'User') }}
                                            style={styles.commentAvatar}
                                        />
                                    </TouchableOpacity>
                                    <View style={styles.commentContent}>
                                        <TouchableOpacity onPress={() => handleProfilePress(comment.user?._id)} style={styles.commentHeader}>
                                            <Text style={[styles.commentUser, { color: colors.text }]}>{comment.user?.name || 'User'}</Text>
                                            <Text style={[styles.commentTime, { color: colors.subtext }]}>{getRelativeTime(comment.createdAt || comment.timestamp)}</Text>
                                        </TouchableOpacity>
                                        <Text style={[styles.commentText, { color: colors.text }]}>{comment.content}</Text>

                                        <View style={styles.commentActions}>
                                            <TouchableOpacity style={styles.commentAction}>
                                                <Ionicons name="heart-outline" size={16} color={colors.subtext} />
                                                <Text style={[styles.commentActionText, { color: colors.subtext }]}>{comment.likes?.length || comment.likesCount || 0}</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => startReply(comment)} style={styles.commentAction}>
                                                <Ionicons name="chatbubble-outline" size={16} color={colors.subtext} />
                                                <Text style={[styles.commentActionText, { color: colors.subtext }]}>Reply</Text>
                                            </TouchableOpacity>
                                        </View>

                                        {comment.replies && comment.replies.map((reply: any) => (
                                            <View key={reply._id || reply.id} style={styles.replyContainer}>
                                                <TouchableOpacity onPress={() => handleProfilePress(reply.user?._id)}>
                                                    <Image
                                                        source={{ uri: reply.user?.avatar || 'https://ui-avatars.com/api/?name=' + (reply.user?.name || 'User') }}
                                                        style={styles.replyAvatar}
                                                    />
                                                </TouchableOpacity>
                                                <View style={styles.commentContent}>
                                                    <TouchableOpacity onPress={() => handleProfilePress(reply.user?._id)} style={styles.commentHeader}>
                                                        <Text style={[styles.commentUser, { color: colors.text }]}>{reply.user?.name || 'User'}</Text>
                                                        <Text style={[styles.commentTime, { color: colors.subtext }]}>{getRelativeTime(reply.createdAt || reply.timestamp)}</Text>
                                                    </TouchableOpacity>
                                                    <Text style={[styles.commentText, { color: colors.text }]}>{reply.content}</Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            </View>
                        ))}
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
                        <Image
                            source={{ uri: currentUser?.avatar || 'https://ui-avatars.com/api/?name=' + (currentUser?.name || 'User') }}
                            style={styles.composerAvatar}
                        />
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
        </View>
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
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
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
        gap: 8,
        marginBottom: 16,
    },
    postImage: {
        width: '100%',
        height: 250,
        borderRadius: 16,
    },
    timestamp: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_400Regular',
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
    commentAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 12,
    },
    commentContent: {
        flex: 1,
    },
    commentHeader: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 4,
    },
    commentUser: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    commentTime: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_400Regular',
    },
    commentText: {
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_400Regular',
        lineHeight: 20,
        marginBottom: 12,
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
});
