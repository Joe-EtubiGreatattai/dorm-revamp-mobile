import CustomLoader from '@/components/CustomLoader';
import PostCard from '@/components/PostCard';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import { authAPI, chatAPI, postAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function UserProfileScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { user: currentUser, refreshUser } = useAuth();
    const { showAlert } = useAlert();

    const [user, setUser] = React.useState<any>(null);
    const [userPosts, setUserPosts] = React.useState<any[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isFollowing, setIsFollowing] = React.useState(false);
    const [followLoading, setFollowLoading] = React.useState(false);
    const [chatLoading, setChatLoading] = React.useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [blockLoading, setBlockLoading] = useState(false);

    React.useEffect(() => {
        if (currentUser && currentUser.blockedUsers) {
            setIsBlocked(currentUser.blockedUsers.includes(id as string));
        }
    }, [currentUser, id]);

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const [userRes, postsRes] = await Promise.all([
                    authAPI.getUserProfile(id as string),
                    postAPI.getUserPosts(id as string)
                ]);
                setUser(userRes.data);
                setUserPosts(postsRes.data);
                // Check if current user is in the viewed user's followers
                if (currentUser && userRes.data.followers) {
                    setIsFollowing(userRes.data.followers.includes(currentUser._id));
                }
            } catch (error) {
                console.log('Error fetching user profile:', error);
            } finally {
                setIsLoading(false);
            }
        };
        if (id) fetchData();
    }, [id]);

    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <CustomLoader message="Fetching profile..." />
            </View>
        );
    }

    if (!user) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: colors.text }}>User not found</Text>
            </View>
        );
    }

    const handleBack = () => router.back();

    const handleFollow = async () => {
        if (followLoading) return;
        setFollowLoading(true);
        try {
            if (isFollowing) {
                await authAPI.unfollowUser(id as string);
                setIsFollowing(false);
                setUser((prev: any) => ({
                    ...prev,
                    followers: prev.followers.filter((fid: string) => fid !== user._id)
                }));
            } else {
                await authAPI.followUser(id as string);
                setIsFollowing(true);
                setUser((prev: any) => ({
                    ...prev,
                    followers: [...(prev.followers || []), user._id]
                }));
            }
        } catch (error) {
            console.log('Error following/unfollowing user:', error);
        } finally {
            setFollowLoading(false);
        }
    };

    const handleMessage = async () => {
        if (chatLoading) return;
        setChatLoading(true);
        try {
            // Create or get existing conversation
            const { data } = await chatAPI.createConversation(id as string);
            router.push(`/chat/${data._id}`);
        } catch (error) {
            console.log('Error creating conversation:', error);
        } finally {
            setChatLoading(false);
        }
    };

    const handleBlock = async () => {
        showAlert({
            title: isBlocked ? "Unblock User" : "Block User",
            description: isBlocked ? "Are you sure you want to unblock this user?" : "Are you sure you want to block this user? You will no longer see their content.",
            type: isBlocked ? 'info' : 'error',
            showCancel: true,
            buttonText: isBlocked ? "Unblock" : "Block",
            onConfirm: async () => {
                setBlockLoading(true);
                try {
                    if (isBlocked) {
                        await authAPI.unblockUser(id as string);
                        setIsBlocked(false);
                    } else {
                        await authAPI.blockUser(id as string);
                        setIsBlocked(true);
                    }
                    await refreshUser();
                } catch (error) {
                    console.log('Error blocking/unblocking user:', error);
                } finally {
                    setBlockLoading(false);
                }
            }
        });
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Custom Header */}
            <View style={{ paddingTop: insets.top, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>{user.name}</Text>
                    {id === currentUser?._id ? (
                        <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/settings')}>
                            <Ionicons name="settings-outline" size={24} color={colors.text} />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.backBtn} onPress={handleBlock}>
                            <Ionicons name="ellipsis-vertical" size={24} color={colors.text} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Profile Info Section */}
                <View style={styles.profileHeader}>
                    <Image source={{ uri: user.avatar }} style={styles.avatar} />
                    <Text style={[styles.name, { color: colors.text }]}>{user.name}</Text>
                    <Text style={[styles.university, { color: colors.subtext }]}>{user.university}</Text>

                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.text }]}>{userPosts.length}</Text>
                            <Text style={[styles.statLabel, { color: colors.subtext }]}>Posts</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.text }]}>{user.followers?.length || 0}</Text>
                            <Text style={[styles.statLabel, { color: colors.subtext }]}>Followers</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.text }]}>{user.following?.length || 0}</Text>
                            <Text style={[styles.statLabel, { color: colors.subtext }]}>Following</Text>
                        </View>
                    </View>

                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.followBtn, { backgroundColor: isFollowing ? colors.card : colors.primary, borderWidth: isFollowing ? 1.5 : 0, borderColor: isFollowing ? colors.border : 'transparent' }]}
                            onPress={handleFollow}
                            disabled={followLoading}
                        >
                            {followLoading ? (
                                <ActivityIndicator size="small" color={isFollowing ? colors.text : '#fff'} />
                            ) : (
                                <Text style={[styles.followBtnText, { color: isFollowing ? colors.text : '#fff' }]}>
                                    {isFollowing ? 'Following' : 'Follow'}
                                </Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleMessage}
                            disabled={chatLoading}
                            style={[styles.messageBtn, { borderColor: colors.primary, borderWidth: 1.5 }]}
                        >
                            {chatLoading ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={[styles.postsSection, { borderTopColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Posts</Text>
                    {userPosts.map(post => {
                        const postWithUser = {
                            ...post,
                            user: user,
                        };
                        return <PostCard key={post._id || post.id} post={postWithUser as any} />;
                    })}
                </View>
            </ScrollView>
        </View>
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
    profileHeader: {
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 16,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 16,
    },
    name: {
        fontSize: 24,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginBottom: 4,
    },
    university: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_400Regular',
        marginBottom: 20,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 32,
        marginBottom: 24,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    statLabel: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_400Regular',
    },
    followBtn: {
        flex: 1,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    followBtnText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    actionRow: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
        paddingHorizontal: 20,
    },
    messageBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    postsSection: {
        borderTopWidth: 0.5,
        paddingTop: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_700Bold',
        paddingHorizontal: 16,
        marginBottom: 12,
    },
});
