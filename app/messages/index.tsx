import ActionSuccessModal from '@/components/ActionSuccessModal';
import CustomLoader from '@/components/CustomLoader';
import EmptyState from '@/components/EmptyState';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useThrottledCallback } from '@/hooks/useThrottledCallback';
import { chatAPI } from '@/utils/apiClient';
import { getSocket } from '@/utils/socket';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { FlatList, RefreshControl, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MessagesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const [searchQuery, setSearchQuery] = React.useState('');
    const [isNewMessageModalVisible, setNewMessageModalVisible] = React.useState(false);
    const [conversations, setConversations] = React.useState<any[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);
    const [typingUsers, setTypingUsers] = React.useState<{ [conversationId: string]: boolean }>({});
    const [invitationsCount, setInvitationsCount] = React.useState(0);
    const [onlineUsers, setOnlineUsers] = React.useState<Set<string>>(new Set());

    const fetchConversations = async () => {
        try {
            const [convRes, invRes] = await Promise.all([
                chatAPI.getConversations(),
                chatAPI.getInvitations()
            ]);
            setConversations(convRes.data);

            // Initialize online users from fetched data
            const initialOnlineUsers = new Set<string>();
            convRes.data.forEach((c: any) => {
                // Check direct user (1-on-1)
                if (c.user?.isOnline) {
                    initialOnlineUsers.add(c.user._id || c.user.id);
                }
                // Check participants (Group)
                if (c.participants) {
                    c.participants.forEach((p: any) => {
                        if (p.isOnline) {
                            initialOnlineUsers.add(p._id || p.id);
                        }
                    });
                }
            });
            setOnlineUsers(initialOnlineUsers);

            setInvitationsCount(invRes.data.filter((i: any) => i.status === 'pending').length);
        } catch (error) {
            console.log('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        fetchConversations();
    }, []);

    // Socket listener for real-time conversation updates
    React.useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        const handleNewMessage = (message: any) => {
            console.log('💬 [Messages] Received new message:', message);
            // Update the conversation list
            setConversations((prev) => {
                const convIndex = prev.findIndex(c => c.id === message.conversationId);
                if (convIndex !== -1) {
                    // Update existing conversation
                    const updated = [...prev];
                    updated[convIndex] = {
                        ...updated[convIndex],
                        lastMessage: message.content,
                        lastMessageAt: message.createdAt,
                        timestamp: message.createdAt
                    };
                    // Move to top
                    const [conv] = updated.splice(convIndex, 1);
                    return [conv, ...updated];
                }
                return prev;
            });
        };

        const handleMessageNotification = (notification: any) => {
            console.log('💬 [Messages] Message notification:', notification);
            // Refresh conversations when receiving notification
            fetchConversations();
        };

        const handleTypingIndicator = ({ userId, conversationId, isTyping }: any) => {
            console.log('📝 [Messages] Typing indicator:', { userId, conversationId, isTyping });
            setTypingUsers(prev => ({
                ...prev,
                [conversationId]: isTyping
            }));

            // Clear typing after 3 seconds if still showing
            if (isTyping) {
                setTimeout(() => {
                    setTypingUsers(prev => ({
                        ...prev,
                        [conversationId]: false
                    }));
                }, 3000);
            }
        };

        const handleConversationUpdated = (updatedConv: any) => {
            console.log('🔄 [Messages] Conversation updated:', updatedConv);
            setConversations((prev) => {
                return prev.map(c => {
                    if (c.id === updatedConv.id || c._id === updatedConv.id) {
                        return {
                            ...c,
                            groupMetadata: updatedConv.groupMetadata,
                            participants: updatedConv.participants,
                            admins: updatedConv.admins
                        };
                    }
                    return c;
                });
            });
        };

        const handleUserOnline = ({ userId }: { userId: string }) => {
            setOnlineUsers(prev => {
                const newSet = new Set(prev);
                newSet.add(userId);
                return newSet;
            });
        };

        const handleUserOffline = ({ userId }: { userId: string }) => {
            setOnlineUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(userId);
                return newSet;
            });
        };

        socket.on('message:new', handleNewMessage);
        socket.on('notification:message', handleMessageNotification);
        socket.on('typing:indicator', handleTypingIndicator);
        socket.on('conversation:updated', handleConversationUpdated);
        socket.on('user:online', handleUserOnline);
        socket.on('user:offline', handleUserOffline);

        // request initial online status if backend supports it, or just rely on events
        socket.emit('get:online_users');

        return () => {
            socket.off('message:new', handleNewMessage);
            socket.off('notification:message', handleMessageNotification);
            socket.off('typing:indicator', handleTypingIndicator);
            socket.off('conversation:updated', handleConversationUpdated);
            socket.off('user:online', handleUserOnline);
            socket.off('user:offline', handleUserOffline);
        };
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchConversations();
        setRefreshing(false);
    };

    const filteredMessages = conversations.filter(dm => {
        const name = dm.type === 'group' ? dm.groupMetadata?.name : dm.user?.name;
        return (name || 'User').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (dm.lastMessage || '').toLowerCase().includes(searchQuery.toLowerCase());
    });

    const handleCreateMessage = () => {
        router.push('/messages/select-user');
    };

    const handleSelectUserConfirm = () => {
        setNewMessageModalVisible(false);
        router.push('/messages/select-user');
    };

    const getRelativeTime = (timestamp: string) => {
        if (!timestamp) return 'Now';
        try {
            return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
        } catch (error) {
            return 'Now';
        }
    };

    const getInitials = (name: string) => {
        if (!name) return 'U';
        const parts = name.trim().split(' ').filter(p => p.length > 0);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return parts[0] ? parts[0][0].toUpperCase() : 'U';
    };

    const handleConversationPress = useThrottledCallback((id: string) => {
        router.push(`/chat/${id}`);
    }, 1000);

    const renderItem = ({ item }: { item: any }) => {
        const isTyping = typingUsers[item.id];
        const isGroup = item.type === 'group';
        const userName = isGroup ? item.groupMetadata?.name : (item.user?.name || 'Unknown User');
        const userAvatar = isGroup ? item.groupMetadata?.avatar : item.user?.avatar;

        const isOnline = !isGroup && item.user?._id && onlineUsers.has(item.user._id);
        const onlineCount = isGroup ? (item.participants?.filter((p: any) => onlineUsers.has(p._id || p.id))?.length || 0) : 0;

        return (
            <TouchableOpacity
                style={[styles.messageItem, { borderBottomColor: colors.border }]}
                onPress={() => handleConversationPress(item.id)}
            >
                <View style={styles.avatarContainer}>
                    {userAvatar ? (
                        <Image source={{ uri: userAvatar }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.initialsContainer, { backgroundColor: colors.primary + '15' }]}>
                            <Text style={[styles.initialsText, { color: colors.primary }]}>
                                {getInitials(userName)}
                            </Text>
                        </View>
                    )}
                    {isOnline && <View style={[styles.onlineBadge, { borderColor: colors.background }]} />}
                </View>

                <View style={styles.messageContent}>
                    <View style={styles.messageHeader}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                            <Text
                                style={[styles.userName, { color: colors.text }]}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {userName}
                            </Text>
                            {(item.aiEnabledFor?.some((uid: any) => (uid._id || uid).toString() === (isGroup ? 'NONE' : item.user?._id?.toString()))) && (
                                <Ionicons name="sparkles" size={12} color={colors.primary} style={{ marginLeft: 4 }} />
                            )}
                            {isGroup ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 4 }}>
                                    <View style={{ backgroundColor: colors.primary + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 4 }}>
                                        <Text style={{ fontSize: 10, color: colors.primary, fontFamily: 'PlusJakartaSans_700Bold' }}>GROUP</Text>
                                    </View>
                                    {onlineCount > 0 && (
                                        <Text style={{ fontSize: 10, color: '#4ADE80', fontFamily: 'PlusJakartaSans_600SemiBold' }}>
                                            {onlineCount} online
                                        </Text>
                                    )}
                                </View>
                            ) : (
                                isOnline && (
                                    <View style={{ marginLeft: 4, backgroundColor: '#4ADE8020', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                        <Text style={{ fontSize: 10, color: '#4ADE80', fontFamily: 'PlusJakartaSans_700Bold' }}>ONLINE</Text>
                                    </View>
                                )
                            )}
                        </View>
                        {!isGroup && (
                            <Text style={[styles.timestamp, { color: colors.subtext }]}>
                                {getRelativeTime(item.lastMessageAt || item.timestamp)}
                            </Text>
                        )}
                    </View>

                    <View style={styles.messageFooter}>
                        {isTyping ? (
                            <Text style={[styles.typingText, { color: colors.primary }]}>typing...</Text>
                        ) : (
                            <Text
                                style={[
                                    styles.lastMessage,
                                    {
                                        color: item.unread ? colors.text : colors.subtext,
                                        fontWeight: item.unread ? '700' : '400'
                                    }
                                ]}
                                numberOfLines={1}
                            >
                                {item.lastMessage || 'No messages yet'}
                            </Text>
                        )}

                        {item.unreadCount > 0 && (
                            <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                                <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={{ paddingTop: insets.top, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Messages</Text>
                    <TouchableOpacity onPress={() => router.push('/messages/create-group')} style={styles.backBtn}>
                        <Ionicons name="add-circle-outline" size={28} color={colors.primary} />
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={filteredMessages}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
                ListHeaderComponent={() => (
                    <View>
                        <View style={styles.searchContainer}>
                            <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Ionicons name="search" size={20} color={colors.subtext} style={{ marginRight: 8 }} />
                                <TextInput
                                    placeholder="Search messages"
                                    placeholderTextColor={colors.subtext}
                                    style={[styles.searchInput, { color: colors.text }]}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />
                            </View>
                        </View>

                        {invitationsCount > 0 && (
                            <TouchableOpacity
                                style={[styles.invitationShortcut, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}
                                onPress={() => router.push('/messages/invitations')}
                            >
                                <View style={[styles.invitationIcon, { backgroundColor: colors.primary }]}>
                                    <Ionicons name="mail" size={20} color="#fff" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.invitationTitle, { color: colors.text }]}>Group Invitations</Text>
                                    <Text style={[styles.invitationSub, { color: colors.subtext }]}>You have {invitationsCount} pending invitation{invitationsCount > 1 ? 's' : ''}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={colors.primary} />
                            </TouchableOpacity>
                        )}
                    </View>
                )}
                ListEmptyComponent={() => !isLoading && (
                    <EmptyState
                        title="No Conversations Yet"
                        description="Start chatting with friends and classmates to see your messages here."
                        icon="chatbubble-ellipses-outline"
                        actionLabel="Start a Chat"
                        onAction={handleCreateMessage}
                        style={{ marginTop: 40 }}
                    />
                )}
            />

            {isLoading && <CustomLoader message="Loading messages..." />}

            <ActionSuccessModal
                visible={isNewMessageModalVisible}
                onClose={() => setNewMessageModalVisible(false)}
                title="New Message"
                description="Select a user to start a new conversation. Group chats coming soon!"
                buttonText="Select User"
                iconName="create"
                onConfirm={handleSelectUserConfirm}
            />
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
    listContent: {
        paddingBottom: 40,
    },
    searchContainer: {
        padding: 16,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        height: 44,
        fontFamily: 'PlusJakartaSans_400Regular',
        fontSize: 15,
    },
    messageItem: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 0.5,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        // marginRight: 16, // Moved to container
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 16,
    },
    onlineBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#4ADE80',
        borderWidth: 2,
        zIndex: 10,
    },
    initialsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    initialsText: {
        fontSize: 20,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    messageContent: {
        flex: 1,
        justifyContent: 'center',
    },
    messageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    userName: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_700Bold',
        flex: 1,
        marginRight: 12,
    },
    timestamp: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_400Regular',
    },
    messageFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    lastMessage: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_400Regular',
        flex: 1,
        marginRight: 8,
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    typingText: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontStyle: 'italic',
        flex: 1,
        marginRight: 8,
    },
    unreadBadge: {
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    unreadBadgeText: {
        fontSize: 11,
        fontFamily: 'PlusJakartaSans_700Bold',
        color: '#fff',
    },
    invitationShortcut: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 16,
        marginTop: 0,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    invitationIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    invitationTitle: {
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    invitationSub: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_400Regular',
        marginTop: 2,
    },
});
