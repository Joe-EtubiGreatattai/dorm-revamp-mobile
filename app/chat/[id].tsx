import CustomLoader from '@/components/CustomLoader';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useCall } from '@/context/CallContext';
import { chatAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface Message {
    _id: string; // MongoDB ID
    id?: string;
    content: string; // Changed from text to content to match backend
    text?: string; // Fallback
    senderId: string;
    conversationId?: string | any;
    receiverId?: string;
    isRead?: boolean;
    createdAt?: string; // Backend returns createdAt
    timestamp?: Date | string;
}

export default function ChatScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const flatListRef = useRef<FlatList>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [otherUser, setOtherUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [inputText, setInputText] = useState('');
    const [isOnline, setIsOnline] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const { user: currentUser } = useAuth();
    const { startCall } = useCall();

    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

    React.useEffect(() => {
        const fetchChatData = async () => {
            let conversationId = id as string; // Start with param

            try {
                // If opening via direct message (dm_USERID), get/create conversation first
                if (conversationId.startsWith('dm_')) {
                    const recipientId = conversationId.replace('dm_', '');
                    const { data } = await chatAPI.createConversation(recipientId);
                    conversationId = data._id;
                }

                setActiveConversationId(conversationId); // Store resolved ID

                // Fetch conversation details and messages in parallel
                const [convRes, msgRes] = await Promise.all([
                    chatAPI.getConversation(conversationId),
                    chatAPI.getMessages(conversationId)
                ]);

                // ... rest of logic

                // Find other user from participants or direct user object
                const conversation = convRes.data;
                const other = conversation.user || conversation.participants?.find((p: any) => p._id !== currentUser?._id && p.id !== currentUser?._id)
                    || { id: 'unknown', name: 'Unknown User', avatar: 'https://i.pravatar.cc/150', isOnline: false };

                setOtherUser(other);
                setIsOnline(other.isOnline || false);

                // Map messages to ensure compatibility
                const formattedMessages = msgRes.data.map((m: any) => ({
                    ...m,
                    id: m._id,
                    text: m.content, // Fallback for UI if it uses text
                    timestamp: new Date(m.createdAt || m.timestamp)
                }));
                setMessages(formattedMessages);
            } catch (error) {
                console.log('Error fetching chat:', error);
                // Fallback for demo if API fails
                setOtherUser({ id: 'temp', name: 'User', avatar: 'https://i.pravatar.cc/150' });
            } finally {
                setIsLoading(false);
            }
        };
        if (currentUser && id) {
            fetchChatData();
        }
    }, [id, currentUser]);

    // Socket Listener for Status & Messages
    React.useEffect(() => {
        if (!activeConversationId) return; // Wait for ID resolution

        console.log('🔵 [ChatScreen] Setting up socket listeners');
        console.log('🔵 [ChatScreen] Conversation ID:', activeConversationId);

        const { getSocket } = require('@/utils/socket');
        const socket = getSocket();

        // Join Conversation Room
        if (socket && socket.connected) {
            console.log(`📤 [ChatScreen] Emitting conversation:join for room: ${activeConversationId}`);
            socket.emit('conversation:join', activeConversationId);
            console.log(`✅ [ChatScreen] Joined conversation room: ${activeConversationId}`);
        }

        const handleOnline = ({ userId }: { userId: string }) => {
            if (userId === otherUser?._id) setIsOnline(true);
        };

        const handleOffline = ({ userId }: { userId: string }) => {
            if (userId === otherUser?._id) setIsOnline(false);
        };

        const handleNewMessage = (message: Message) => {
            console.log('📩 [ChatScreen] Received new message:', message);
            // Verify it belongs to this conversation
            // message.conversationId might be string or populated object, check both
            if (message.conversationId === activeConversationId || (typeof message.conversationId === 'object' && (message.conversationId as any)?._id === activeConversationId)) {
                setMessages(prev => {
                    // Check if optimistic message exists
                    const optimisticIndex = prev.findIndex(m =>
                        m.id?.startsWith('temp-') &&
                        m.content === message.content &&
                        m.senderId === message.senderId
                    );

                    if (optimisticIndex !== -1) {
                        // Replace optimistic message with real one
                        const updated = [...prev];
                        updated[optimisticIndex] = message;
                        return updated;
                    }

                    // Check if message already exists (avoid duplicates)
                    const exists = prev.some(m => m._id === message._id);
                    if (exists) {
                        return prev;
                    }

                    return [...prev, message];
                });
            }
        };

        const handleTypingIndicator = ({ userId, isTyping }: any) => {
            if (userId === otherUser?._id) {
                setIsTyping(isTyping);
            }
        };

        socket.on('user:online', handleOnline);
        socket.on('user:offline', handleOffline);
        socket.on('message:new', handleNewMessage);
        socket.on('typing:indicator', handleTypingIndicator);

        return () => {
            // Leave room? Maybe not strictly necessary if socket implementation handles it?
            // But good practice.
            socket.emit('conversation:leave', activeConversationId);

            socket.off('user:online', handleOnline);
            socket.off('user:offline', handleOffline);
            socket.off('message:new', handleNewMessage);
            socket.off('typing:indicator', handleTypingIndicator);
        };
    }, [activeConversationId, otherUser]); // Depend on resolved ID

    if (isLoading || !otherUser) {
        return (
            <>
                <Stack.Screen options={{ headerShown: false }} />
                <CustomLoader />
            </>
        );
    }



    const handleCall = () => {
        if (!otherUser) return;
        console.log('📞 [ChatScreen] Starting call with user:', otherUser);
        startCall({
            _id: otherUser._id,
            name: otherUser.name,
            avatar: otherUser.avatar
        });
    };

    const handleInputChange = (text: string) => {
        setInputText(text);

        const { getSocket } = require('@/utils/socket');
        const socket = getSocket();

        if (!socket || !otherUser) return;

        // Emit typing:start
        if (text.length > 0 && inputText.length === 0) {
            console.log('📝 [ChatScreen] Emitting typing:start');
            socket.emit('typing:start', {
                conversationId: id,
                receiverId: otherUser._id
            });
        }

        // Clear previous timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Set new timeout to stop typing after 2 seconds of inactivity
        if (text.length > 0) {
            typingTimeoutRef.current = setTimeout(() => {
                console.log('📝 [ChatScreen] Emitting typing:stop (timeout)');
                socket.emit('typing:stop', {
                    conversationId: id,
                    receiverId: otherUser._id
                });
            }, 2000);
        } else {
            // Empty text, emit stop immediately
            console.log('📝 [ChatScreen] Emitting typing:stop (empty)');
            socket.emit('typing:stop', {
                conversationId: id,
                receiverId: otherUser._id
            });
        }
    };

    const sendMessage = async () => {
        console.log('📤 [ChatScreen] ========== SENDING MESSAGE ==========');
        console.log('📤 [ChatScreen] Input text:', inputText);
        console.log('📤 [ChatScreen] Conversation ID:', id);

        if (!inputText.trim()) {
            console.log('⚠️ [ChatScreen] Empty message, aborting');
            return;
        }

        const optimisiticMessage: any = {
            id: `temp-${Date.now()}`,
            _id: `temp-${Date.now()}`,
            content: inputText.trim(), // Use content
            text: inputText.trim(), // Keep text for render fallback if needed
            senderId: currentUser?._id || 'temp',
            timestamp: new Date(),
            createdAt: new Date().toISOString()
        };

        console.log('📤 [ChatScreen] Optimistic message:', optimisiticMessage);
        setMessages(prev => [...prev, optimisiticMessage]);
        setInputText('');

        try {
            console.log('📤 [ChatScreen] Calling API to send message...');
            // Use activeConversationId if available, otherwise fallback to id (but id might be dm_...)
            const targetId = activeConversationId || id as string;
            const response = await chatAPI.sendMessage(targetId, optimisiticMessage.content);
            console.log('✅ [ChatScreen] Message sent successfully:', response.data);
            // Real message will replace optimistic one via socket
        } catch (error) {
            console.log('Error sending message:', error);
            // Remove optimistic message on error
            setMessages(prev => prev.filter(m => m.id !== optimisiticMessage.id));
            alert('Failed to send message. Please try again.');
        }
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isMe = item.senderId === currentUser?._id;
        return (
            <View style={[
                styles.messageBubble,
                isMe ? styles.userBubble : styles.supportBubble,
                { backgroundColor: isMe ? colors.primary : colors.card }
            ]}>
                <Text style={[
                    styles.messageText,
                    { color: isMe ? '#fff' : colors.text }
                ]}>
                    {item.content || item.text}
                </Text>
                <Text style={[
                    styles.timestamp,
                    { color: isMe ? 'rgba(255,255,255,0.7)' : colors.subtext }
                ]}>
                    {new Date(item.timestamp || item.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.push(`/user/${otherUser._id}`)} style={styles.userInfo}>
                    <Image source={{ uri: otherUser.avatar }} style={styles.headerAvatar} />
                    <View>
                        <Text style={[styles.headerName, { color: colors.text }]}>{otherUser.name}</Text>
                        <View style={styles.statusRow}>
                            {isTyping ? (
                                <Text style={[styles.typingText, { color: colors.primary }]}>typing...</Text>
                            ) : (
                                <>
                                    <View style={[styles.onlineDot, { backgroundColor: isOnline ? '#10b981' : colors.subtext }]} />
                                    <Text style={[styles.headerStatus, { color: isOnline ? colors.primary : colors.subtext }]}>
                                        {isOnline ? 'Online' : 'Offline'}
                                    </Text>
                                </>
                            )}
                        </View>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleCall} style={[styles.backBtn, { backgroundColor: colors.card }]}>
                    <Ionicons name="call-outline" size={22} color={colors.text} />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.id || item._id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.chatContent}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                />

                <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                    <TouchableOpacity style={styles.attachBtn}>
                        <Ionicons name="add" size={24} color={colors.primary} />
                    </TouchableOpacity>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                        placeholder="Type a message..."
                        placeholderTextColor={colors.subtext}
                        value={inputText}
                        onChangeText={handleInputChange}
                        onSubmitEditing={sendMessage}
                    />
                    <TouchableOpacity
                        style={[styles.sendBtn, { backgroundColor: inputText.trim() ? colors.primary : colors.border }]}
                        onPress={sendMessage}
                        disabled={!inputText.trim()}
                    >
                        <Ionicons name="send" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
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
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    userInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginHorizontal: 10,
    },
    headerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    headerName: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    onlineDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10b981',
        marginRight: 4,
    },
    headerStatus: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    typingText: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontStyle: 'italic',
    },
    chatContent: {
        padding: 20,
        paddingBottom: 20,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 20,
        marginBottom: 12,
    },
    userBubble: {
        alignSelf: 'flex-end',
        borderBottomRightRadius: 4,
    },
    supportBubble: {
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 15,
        lineHeight: 22,
    },
    timestamp: {
        fontSize: 10,
        fontFamily: 'PlusJakartaSans_500Medium',
        alignSelf: 'flex-end',
        marginTop: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        paddingBottom: Platform.OS === 'ios' ? 34 : 12,
        borderTopWidth: 1,
    },
    attachBtn: {
        padding: 8,
        marginRight: 8,
    },
    input: {
        flex: 1,
        height: 44,
        borderRadius: 22,
        paddingHorizontal: 16,
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 15,
        marginRight: 12,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
