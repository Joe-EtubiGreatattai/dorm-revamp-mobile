import ActionSuccessModal from '@/components/ActionSuccessModal';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { chatAPI } from '@/utils/apiClient';
import { getSocket } from '@/utils/socket';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

    const fetchConversations = async () => {
        try {
            const { data } = await chatAPI.getConversations();
            setConversations(data);
        } catch (error) {
            console.log('Error fetching conversations:', error);
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

        socket.on('message:new', handleNewMessage);
        socket.on('notification:message', handleMessageNotification);
        socket.on('typing:indicator', handleTypingIndicator);

        return () => {
            socket.off('message:new', handleNewMessage);
            socket.off('notification:message', handleMessageNotification);
            socket.off('typing:indicator', handleTypingIndicator);
        };
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchConversations();
        setRefreshing(false);
    };

    const filteredMessages = conversations.filter(dm =>
        (dm.user?.name || 'User').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (dm.lastMessage || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

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

    const renderItem = ({ item }: { item: any }) => {
        const isTyping = typingUsers[item.id];

        return (
            <TouchableOpacity
                style={[styles.messageItem, { borderBottomColor: colors.border }]}
                onPress={() => router.push(`/chat/${item.id}`)}
            >
                <Image source={{ uri: item.user?.avatar || 'https://i.pravatar.cc/150' }} style={styles.avatar} />
                <View style={styles.messageContent}>
                    <View style={styles.messageHeader}>
                        <Text style={[styles.userName, { color: colors.text }]}>{item.user?.name || 'Unknown User'}</Text>
                        <Text style={[styles.timestamp, { color: colors.subtext }]}>
                            {getRelativeTime(item.lastMessageAt || item.timestamp)}
                        </Text>
                    </View>
                    <View style={styles.messageFooter}>
                        {isTyping ? (
                            <Text style={[styles.typingText, { color: colors.primary }]}>typing...</Text>
                        ) : (
                            <Text style={[styles.lastMessage, { color: item.unread ? colors.text : colors.subtext, fontWeight: item.unread ? '700' : '400' }]} numberOfLines={1}>
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
                    <TouchableOpacity onPress={handleCreateMessage} style={styles.backBtn}>
                        <Ionicons name="create-outline" size={24} color={colors.text} />
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
                )}
            />

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
        marginRight: 16,
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
});
