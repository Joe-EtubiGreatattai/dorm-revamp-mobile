import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import { commentAPI, postAPI } from '@/utils/apiClient';
import { getSocket } from '@/utils/socket';
import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform, Share, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ReelItem = React.memo(({ item, isActive, isMuted, toggleMute, onVideoEnd, autoScroll, toggleAutoScroll, screenHeight }: {
    item: any,
    isActive: boolean,
    isMuted: boolean,
    toggleMute: () => void,
    onVideoEnd: () => void,
    autoScroll: boolean,
    toggleAutoScroll: () => void,
    screenHeight: number
}) => {
    const videoRef = useRef<Video>(null);
    const { user: currentUser } = useAuth();
    const router = useRouter();
    const [liked, setLiked] = useState(item.likes?.includes(currentUser?._id));
    const [likesCount, setLikesCount] = useState(item.likes?.length || 0);
    const [isPaused, setIsPaused] = useState(false);
    const [showCommentModal, setShowCommentModal] = useState(false);

    useEffect(() => {
        setLiked(item.likes?.includes(currentUser?._id));
        setLikesCount(item.likes?.length || 0);
    }, [item.likes, currentUser?._id]);

    useEffect(() => {
        if (!isActive) {
            videoRef.current?.pauseAsync();
        } else {
            // When becoming active again, ensure we start from the beginning if it was finished
            videoRef.current?.setPositionAsync(0);
            if (!isPaused) {
                videoRef.current?.playAsync();
            }
        }
    }, [isActive, isPaused]);

    const handleLike = async () => {
        const prevLiked = liked;
        setLiked(!liked);
        setLikesCount((prev: number) => liked ? prev - 1 : prev + 1);
        try {
            await postAPI.likePost(item._id);
        } catch (error) {
            setLiked(prevLiked);
            setLikesCount(item.likes?.length || 0);
        }
    };

    const handleShare = async () => {
        try {
            const shareUrl = `https://dorm.app/reel/${item._id}`;
            const shareMessage = `${item.content}\n\nWatch on Dorm: ${shareUrl}`;

            await Share.share({
                message: shareMessage,
                title: 'Share Reel',
                url: shareUrl, // iOS will use this
            });
            await postAPI.sharePost(item._id);
        } catch (error) { }
    };

    const handleProfilePress = () => {
        if (item.user?._id && item.user._id !== 'anonymous') {
            if (currentUser?._id === item.user._id) {
                router.push('/profile');
            } else {
                router.push(`/user/${item.user._id}`);
            }
        }
    };

    const togglePlayPause = () => {
        setIsPaused(!isPaused);
    };

    const onPlaybackStatusUpdate = (status: any) => {
        if (status.didJustFinish && autoScroll) {
            onVideoEnd();
        }
    };

    return (
        <View style={[styles.reelContainer, { height: screenHeight }]}>
            <TouchableOpacity
                activeOpacity={1}
                onPress={togglePlayPause}
                style={styles.videoPressArea}
            >
                <Video
                    ref={videoRef}
                    source={{ uri: item.video }}
                    style={styles.video}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={isActive && !isPaused}
                    isLooping={!autoScroll}
                    isMuted={isMuted}
                    onPlaybackStatusUpdate={onPlaybackStatusUpdate}
                />

                {isPaused && (
                    <View style={styles.pauseOverlay}>
                        <Ionicons name="play" size={80} color="rgba(255,255,255,0.5)" />
                    </View>
                )}
            </TouchableOpacity>

            {/* Overlay */}
            <View style={styles.overlay} pointerEvents="box-none">
                <View style={styles.bottomSection}>
                    <TouchableOpacity onPress={handleProfilePress} style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.userName}>@{item.user?.name || 'User'}</Text>
                        {item.isAnonymous && (
                            <View style={styles.reelAnonymousBadge}>
                                <Ionicons name="eye-off" size={12} color="#fff" />
                                <Text style={styles.reelAnonymousText}>Anonymous</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <Text style={styles.university}>{item.user?.university}</Text>
                    <Text style={styles.content} numberOfLines={3}>{item.content}</Text>
                </View>

                <View style={styles.rightSection}>
                    <TouchableOpacity style={styles.rightButton} onPress={handleProfilePress}>
                        <Image
                            source={{ uri: item.user?.avatar || 'https://ui-avatars.com/api/?name=' + (item.user?.name || 'U') }}
                            style={styles.avatar}
                        />
                        {currentUser?._id !== item.user?._id && !item.isAnonymous && !currentUser?.following?.includes(item.user?._id) && (
                            <View style={styles.plusIcon}>
                                <Ionicons name="add" size={12} color="#fff" />
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.rightButton} onPress={handleLike}>
                        <Ionicons name="heart" size={38} color={liked ? "#ff2d55" : "#fff"} style={styles.iconShadow} />
                        <Text style={styles.buttonText}>{likesCount}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.rightButton} onPress={() => setShowCommentModal(true)}>
                        <Ionicons name="chatbubble-ellipses" size={35} color="#fff" style={styles.iconShadow} />
                        <Text style={styles.buttonText}>{item.comments?.length || 0}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.rightButton} onPress={handleShare}>
                        <Ionicons name="share-social" size={35} color="#fff" style={styles.iconShadow} />
                        <Text style={styles.buttonText}>{item.shares || 0}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.rightButton} onPress={toggleAutoScroll}>
                        <Ionicons
                            name={autoScroll ? "infinite" : "repeat"}
                            size={32}
                            color={autoScroll ? "#ff2d55" : "#fff"}
                            style={styles.iconShadow}
                        />
                        <Text style={[styles.buttonText, { color: autoScroll ? "#ff2d55" : "#fff" }]}>
                            {autoScroll ? "Auto" : "Loop"}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.rightButton} onPress={toggleMute}>
                        <Ionicons
                            name={isMuted ? "volume-mute" : "volume-high"}
                            size={30}
                            color="#fff"
                            style={styles.iconShadow}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            <CommentsModal
                visible={showCommentModal}
                onClose={() => setShowCommentModal(false)}
                postId={item._id}
            />
        </View>
    );
});

const CommentsModal = ({ visible, onClose, postId }: { visible: boolean, onClose: () => void, postId: string }) => {
    const { user: currentUser } = useAuth();
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [replyingTo, setReplyingTo] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const inputRef = useRef<TextInput>(null);
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { showAlert } = useAlert();

    useEffect(() => {
        if (visible) {
            fetchComments();
            const socket = getSocket();
            const handleNewComment = (data: any) => {
                if (data.postId === postId) {
                    setComments(prev => {
                        if (prev.some(c => (c._id || c.id) === (data.comment._id || data.comment.id))) return prev;
                        return [data.comment, ...prev];
                    });
                }
            };
            const handleCommentLiked = (data: any) => {
                // Backend might emit something else or same post:updated
            };
            socket.on('comment:new', handleNewComment);
            return () => {
                socket.off('comment:new', handleNewComment);
            };
        }
    }, [visible, postId]);

    const fetchComments = async () => {
        setIsFetching(true);
        try {
            const res = await commentAPI.getComments(postId);
            setComments(res.data);
        } catch (error) {
            console.error('Error fetching comments:', error);
        } finally {
            setIsFetching(false);
        }
    };

    const handlePostComment = async () => {
        if (!newComment.trim()) return;
        setLoading(true);

        const parentId = replyingTo?._id || replyingTo?.id;
        const currentContent = newComment;

        try {
            const res = await commentAPI.createComment({
                postId,
                content: currentContent,
                parentCommentId: parentId
            });

            const createdComment = {
                ...res.data,
                userId: {
                    _id: currentUser?._id,
                    name: currentUser?.name,
                    avatar: currentUser?.avatar
                },
                user: {
                    _id: currentUser?._id,
                    name: currentUser?.name,
                    avatar: currentUser?.avatar
                }
            };

            if (replyingTo) {
                setComments(prev => prev.map(c => {
                    if ((c._id || c.id) === parentId) {
                        return { ...c, replies: [...(c.replies || []), createdComment] };
                    }
                    return c;
                }));
            } else {
                setComments(prev => [createdComment, ...prev]);
            }

            setNewComment('');
            setReplyingTo(null);
            Keyboard.dismiss();
        } catch (error: any) {
            console.error('Error posting comment:', error);
            const msg = error.response?.data?.message || error.message || 'Failed to post comment';
            showAlert({
                title: 'Comment Failed',
                description: msg,
                type: 'error'
            });
        } finally {
            setLoading(false);
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

                if (c.replies) {
                    const updatedReplies = c.replies.map((r: any) => {
                        if ((r._id || r.id) === commentId) {
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
            console.error('Error liking comment:', error);
        }
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
                    setComments(prev => prev
                        .filter(c => (c._id || c.id) !== commentId)
                        .map(c => ({
                            ...c,
                            replies: c.replies ? c.replies.filter((r: any) => (r._id || r.id) !== commentId) : []
                        }))
                    );
                } catch (error) {
                    console.error('Error deleting comment:', error);
                }
            }
        });
    };

    const startReply = (comment: any) => {
        setReplyingTo(comment);
        setNewComment(`@${comment.userId?.name || comment.user?.name || 'User'} `);
        inputRef.current?.focus();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <TouchableOpacity style={styles.modalCloseArea} onPress={onClose} />
                <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{comments.length} Comments</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                        style={{ flex: 1 }}
                    >
                        <FlatList
                            data={comments}
                            keyExtractor={item => item._id}
                            renderItem={({ item }) => {
                                const isCommentAuthor = currentUser?._id === (item.userId?._id || item.userId);
                                // For reels, the post author is item.user in ReelItem, but we don't have it here easily
                                // Let's assume we can't easily check isPostAuthor without passing post author prop
                                return (
                                    <View style={styles.commentItemContainer}>
                                        <View style={styles.commentItem}>
                                            <Image
                                                source={{ uri: (item.user?.avatar || item.userId?.avatar) || 'https://ui-avatars.com/api/?name=' + ((item.user?.name || item.userId?.name) || 'U') }}
                                                style={styles.commentAvatar}
                                            />
                                            <View style={styles.commentTextContainer}>
                                                <Text style={styles.commentUser}>{(item.user?.name || item.userId?.name) || 'Anonymous'}</Text>
                                                <Text style={styles.commentText}>{item.content}</Text>

                                                <View style={styles.commentActions}>
                                                    <TouchableOpacity
                                                        style={styles.commentAction}
                                                        onPress={() => handleLikeComment(item._id)}
                                                    >
                                                        <Ionicons
                                                            name={item.likes?.includes(currentUser?._id) ? "heart" : "heart-outline"}
                                                            size={14}
                                                            color={item.likes?.includes(currentUser?._id) ? "#ff2d55" : "#666"}
                                                        />
                                                        <Text style={styles.commentActionText}>{item.likes?.length || 0}</Text>
                                                    </TouchableOpacity>

                                                    <TouchableOpacity style={styles.commentAction} onPress={() => startReply(item)}>
                                                        <Text style={styles.commentActionText}>Reply</Text>
                                                    </TouchableOpacity>

                                                    {isCommentAuthor && (
                                                        <TouchableOpacity style={styles.commentAction} onPress={() => handleDeleteComment(item._id)}>
                                                            <Ionicons name="trash-outline" size={14} color="#999" />
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                            </View>
                                        </View>

                                        {/* Replies */}
                                        {item.replies && item.replies.map((reply: any) => (
                                            <View key={reply._id} style={styles.replyItem}>
                                                <Image
                                                    source={{ uri: (reply.user?.avatar || reply.userId?.avatar) || 'https://ui-avatars.com/api/?name=' + ((reply.user?.name || reply.userId?.name) || 'U') }}
                                                    style={styles.replyAvatar}
                                                />
                                                <View style={styles.commentTextContainer}>
                                                    <Text style={styles.commentUser}>{(reply.user?.name || reply.userId?.name) || 'Anonymous'}</Text>
                                                    <Text style={styles.commentText}>{reply.content}</Text>
                                                    <View style={styles.commentActions}>
                                                        <TouchableOpacity
                                                            style={styles.commentAction}
                                                            onPress={() => handleLikeComment(reply._id)}
                                                        >
                                                            <Ionicons
                                                                name={reply.likes?.includes(currentUser?._id) ? "heart" : "heart-outline"}
                                                                size={12}
                                                                color={reply.likes?.includes(currentUser?._id) ? "#ff2d55" : "#666"}
                                                            />
                                                            <Text style={styles.commentActionText}>{reply.likes?.length || 0}</Text>
                                                        </TouchableOpacity>
                                                        {currentUser?._id === (reply.userId?._id || reply.userId) && (
                                                            <TouchableOpacity style={styles.commentAction} onPress={() => handleDeleteComment(reply._id)}>
                                                                <Ionicons name="trash-outline" size={12} color="#999" />
                                                            </TouchableOpacity>
                                                        )}
                                                    </View>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                );
                            }}
                            style={styles.commentList}
                            ListEmptyComponent={
                                isFetching ? (
                                    <View style={styles.loaderContainer}>
                                        <ActivityIndicator size="small" color={colors.primary} />
                                        <Text style={[styles.loadingText, { color: colors.subtext }]}>Loading comments...</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.emptyComments}>No comments yet. Be the first to comment!</Text>
                                )
                            }
                        />

                        {replyingTo && (
                            <View style={styles.replyingToBar}>
                                <Text style={styles.replyingToText}>
                                    Replying to <Text style={{ fontWeight: '700' }}>@{replyingTo.userId?.name}</Text>
                                </Text>
                                <TouchableOpacity onPress={() => setReplyingTo(null)}>
                                    <Ionicons name="close-circle" size={18} color="#999" />
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={styles.commentInputContainer}>
                            <TextInput
                                ref={inputRef}
                                style={styles.commentInput}
                                placeholder={replyingTo ? "Add a reply..." : "Add a comment..."}
                                placeholderTextColor="#999"
                                value={newComment}
                                onChangeText={setNewComment}
                                multiline
                            />
                            <TouchableOpacity
                                style={[styles.postButton, !newComment.trim() && { opacity: 0.5 }]}
                                onPress={handlePostComment}
                                disabled={!newComment.trim() || loading}
                            >
                                {loading ? <ActivityIndicator size="small" color="#ff2d55" /> : <Text style={styles.postButtonText}>Post</Text>}
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </View>
        </Modal>
    );
};

export default function ReelsScreen() {
    const { postId: initialPostId } = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const flatListRef = useRef<FlatList>(null);
    const [videos, setVideos] = useState<any[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [autoScroll, setAutoScroll] = useState(true);
    const { height: windowHeight, width: windowWidth } = useWindowDimensions();
    const [screenHeight, setScreenHeight] = useState(windowHeight);
    const [showToast, setShowToast] = useState(true);

    useEffect(() => {
        const socket = getSocket();

        const handlePostUpdate = (updatedPost: any) => {
            setVideos(prev => prev.map(v =>
                v._id === updatedPost._id ? { ...v, ...updatedPost } : v
            ));
        };

        const handleNewComment = (data: any) => {
            setVideos(prev => prev.map(v => {
                if (v._id === data.postId) {
                    const existingComments = v.comments || [];
                    if (!existingComments.includes(data.comment._id)) {
                        return { ...v, comments: [...existingComments, data.comment._id] };
                    }
                }
                return v;
            }));
        };

        socket.on('post:updated', handlePostUpdate);
        socket.on('comment:new', handleNewComment);

        return () => {
            socket.off('post:updated', handlePostUpdate);
            socket.off('comment:new', handleNewComment);
        };
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => setShowToast(false), 3000);
        return () => clearTimeout(timer);
    }, []);

    const fetchVideos = async (pageNum = 1) => {
        if (isLoading || (!hasMore && pageNum > 1)) return;
        setIsLoading(true);
        try {
            const res = await postAPI.getVideos(pageNum);
            const newVideos = res.data.posts;

            if (pageNum === 1) {
                // If we have a specific initialPostId, try to find it and move it to front
                if (initialPostId) {
                    const index = newVideos.findIndex((v: any) => v._id === initialPostId);
                    if (index > -1) {
                        const target = newVideos.splice(index, 1)[0];
                        newVideos.unshift(target);
                    }
                }
                setVideos(newVideos);
            } else {
                setVideos((prev: any[]) => [...prev, ...newVideos]);
            }

            setHasMore(pageNum < res.data.totalPages);
            setPage(pageNum);
        } catch (error) {
            console.error('Failed to fetch videos:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchVideos(1);
    }, []);

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setActiveIndex(viewableItems[0].index);
        }
    }).current;

    const handleVideoEnd = () => {
        if (autoScroll && activeIndex < videos.length - 1) {
            flatListRef.current?.scrollToIndex({
                index: activeIndex + 1,
                animated: true
            });
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <Stack.Screen options={{ headerShown: false }} />

            <TouchableOpacity
                style={[styles.backButton, { top: insets.top + 10 }]}
                onPress={() => router.back()}
            >
                <Ionicons name="arrow-back" size={28} color="#fff" />
            </TouchableOpacity>

            {showToast && (
                <View style={[styles.toast, { top: insets.top + 15 }]}>
                    <Text style={styles.toastText}>Entering Immersive Mode</Text>
                </View>
            )}

            <FlatList
                ref={flatListRef}
                data={videos}
                onLayout={(e) => {
                    const { height } = e.nativeEvent.layout;
                    if (height > 0) setScreenHeight(height);
                }}
                renderItem={({ item, index }) => (
                    <ReelItem
                        item={item}
                        isActive={index === activeIndex}
                        isMuted={isMuted}
                        toggleMute={() => setIsMuted(!isMuted)}
                        onVideoEnd={handleVideoEnd}
                        autoScroll={autoScroll}
                        toggleAutoScroll={() => setAutoScroll(!autoScroll)}
                        screenHeight={screenHeight}
                    />
                )}
                keyExtractor={item => item._id}
                pagingEnabled
                snapToInterval={screenHeight}
                snapToAlignment="start"
                decelerationRate="fast"
                getItemLayout={(_, index) => ({
                    length: screenHeight,
                    offset: screenHeight * index,
                    index,
                })}
                showsVerticalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
                onEndReached={() => fetchVideos(page + 1)}
                onEndReachedThreshold={0.5}
                ListFooterComponent={isLoading ? <ActivityIndicator color="#fff" style={{ margin: 20 }} /> : null}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    reelContainer: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
    },
    videoPressArea: {
        flex: 1,
    },
    video: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
    },
    pauseOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        paddingHorizontal: 15,
    },
    backButton: {
        position: 'absolute',
        left: 15,
        zIndex: 10,
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 20,
    },
    toast: {
        position: 'absolute',
        alignSelf: 'center',
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        zIndex: 100,
    },
    toastText: {
        color: '#000',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
    bottomSection: {
        maxWidth: '80%',
        marginBottom: 20,
    },
    userName: {
        color: '#fff',
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginBottom: 4,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    university: {
        color: '#fff',
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        opacity: 0.8,
        marginBottom: 8,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    content: {
        color: '#fff',
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_400Regular',
        lineHeight: 20,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    rightSection: {
        position: 'absolute',
        right: 15,
        bottom: 80,
        alignItems: 'center',
        gap: 20,
    },
    iconShadow: {
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    rightButton: {
        alignItems: 'center',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: '#fff',
        backgroundColor: '#eee',
    },
    plusIcon: {
        position: 'absolute',
        bottom: -5,
        backgroundColor: '#ff2d55',
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 13,
        marginTop: 4,
        fontFamily: 'PlusJakartaSans_700Bold',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalCloseArea: {
        flex: 1,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_700Bold',
        color: '#000',
    },
    closeBtn: {
        padding: 4,
    },
    commentList: {
        flex: 1,
    },
    commentItem: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    commentAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    commentTextContainer: {
        flex: 1,
    },
    commentUser: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_700Bold',
        color: '#333',
        marginBottom: 2,
    },
    commentText: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_400Regular',
        color: '#555',
        lineHeight: 18,
    },
    emptyComments: {
        padding: 40,
        textAlign: 'center',
        color: '#999',
        fontFamily: 'PlusJakartaSans_400Regular',
        fontSize: 14,
    },
    commentInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        paddingHorizontal: 16,
        borderTopWidth: 0.5,
        borderTopColor: '#eee',
        backgroundColor: '#fff',
    },
    commentInput: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        paddingRight: 12,
        maxHeight: 100,
        fontFamily: 'PlusJakartaSans_400Regular',
        fontSize: 14,
        color: '#000',
    },
    postButton: {
        marginLeft: 12,
        paddingHorizontal: 8,
    },
    postButtonText: {
        color: '#ff2d55',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 15,
    },
    commentItemContainer: {
        borderBottomWidth: 0.5,
        borderBottomColor: '#eee',
    },
    commentActions: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 16,
    },
    commentAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    commentActionText: {
        fontSize: 12,
        color: '#666',
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    replyItem: {
        flexDirection: 'row',
        padding: 12,
        paddingLeft: 48,
        gap: 12,
        backgroundColor: '#fafafa',
    },
    replyAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
    },
    replyingToBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#f8f8f8',
        borderTopWidth: 0.5,
        borderTopColor: '#eee',
    },
    replyingToText: {
        fontSize: 13,
        color: '#666',
        fontFamily: 'PlusJakartaSans_400Regular',
    },
    reelAnonymousBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginLeft: 8,
        gap: 4,
    },
    reelAnonymousText: {
        color: '#fff',
        fontSize: 10,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    loaderContainer: {
        paddingTop: 40,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
});
