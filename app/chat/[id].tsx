import CustomLoader from '@/components/CustomLoader';
import MessageStatus from '@/components/MessageStatus';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import { useCall } from '@/context/CallContext';
import { useThrottledCallback } from '@/hooks/useThrottledCallback';
import { authAPI, chatAPI, walletAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface Message {
    _id: string; // MongoDB ID
    id?: string;
    content: string;
    text?: string; // Fallback
    type: 'text' | 'image' | 'voice' | 'file' | 'market_item' | 'transfer' | 'system';
    mediaUrl?: string;
    senderId: string;
    conversationId?: string | any;
    receiverId?: string;
    isRead?: boolean;
    createdAt?: string;
    timestamp?: Date | string;
    replyTo?: string | Message | any;
    reactions?: Array<{ userId: string; emoji: string }>;
    marketItem?: any;
    transfer?: any;
    transactionId?: any;
    readBy?: Array<{ userId: string; readAt: string }>;
}

export default function ChatScreen() {
    const { id, marketItemId } = useLocalSearchParams();
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

    // Market Context
    const [contextMarketItem, setContextMarketItem] = useState<any>(null);
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef<any>(null);

    const { user: currentUser } = useAuth();
    const { startCall } = useCall();
    const { showAlert } = useAlert();

    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

    // Media and Interaction states
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const recordingIntervalRef = useRef<any>(null);
    const [actionMessage, setActionMessage] = useState<Message | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);

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

                // Find other user from participants or direct user object
                const conversation = convRes.data;
                let other = conversation.user || conversation.participants?.find((p: any) => p._id !== currentUser?._id && p.id !== currentUser?._id)
                    || { id: 'unknown', name: 'Unknown User', avatar: 'https://i.pravatar.cc/150', isOnline: false };

                // If it's a group, override with group metadata
                if (conversation.type === 'group') {
                    other = {
                        ...other,
                        type: 'group',
                        groupMetadata: conversation.groupMetadata,
                        participants: conversation.participants,
                        admins: conversation.admins,
                        creatorId: conversation.creatorId
                    };
                }

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
                setMessages(formattedMessages);

                // Fetch market item if present
                if (marketItemId) {
                    try {
                        // We need an endpoint for public access if possible, or just use get item
                        // Assuming marketAPI is imported
                        const { marketAPI } = require('@/utils/apiClient');
                        const { data } = await marketAPI.getItem(marketItemId as string);
                        setContextMarketItem(data);
                    } catch (err) {
                        console.log('Error fetching context item:', err);
                    }
                }
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
    }, [id, currentUser, marketItemId]);

    // Mark as read when messages load or screen focuses
    React.useEffect(() => {
        if (activeConversationId && messages.length > 0 && currentUser) {
            const unreadMessages = messages.filter(m =>
                m.senderId !== currentUser._id &&
                !m.readBy?.some(r => r.userId === currentUser._id) &&
                !m.isRead // Fallback
            );

            if (unreadMessages.length > 0) {
                // Determine if we should mark all or specific
                // For simplicity, let's mark all for this conversation if we are here
                chatAPI.markAsRead(activeConversationId);
            }
        }
    }, [activeConversationId, messages.length, currentUser]);

    // Socket Listener for Status & Messages
    React.useEffect(() => {
        if (!activeConversationId) return; // Wait for ID resolution

        console.log('🔵 [ChatScreen] Setting up socket listeners');
        console.log('🔵 [ChatScreen] Conversation ID:', activeConversationId);

        const { getSocket } = require('@/utils/socket');
        const socket = getSocket();

        // Join Conversation Room Logic
        const joinRoom = () => {
            if (activeConversationId) {
                console.log(`📤 [ChatScreen] Emitting conversation:join for room: ${activeConversationId}`);
                socket.emit('conversation:join', activeConversationId);
                console.log(`✅ [ChatScreen] Joined conversation room: ${activeConversationId}`);
            }
        };

        if (socket.connected) {
            joinRoom();
        }

        socket.on('connect', joinRoom);
        socket.on('reconnect', joinRoom);

        socket.on('group:joined', () => {
            console.log('👥 [ChatScreen] Group joined event received');
        });

        const handleOnline = ({ userId }: { userId: string }) => {
            if (userId === otherUser?._id || userId === otherUser?.id) {
                setIsOnline(true);
            }
        };

        const handleOffline = ({ userId }: { userId: string }) => {
            if (userId === otherUser?._id || userId === otherUser?.id) {
                setIsOnline(false);
            }
        };

        const handleNewMessage = (message: Message) => {
            console.log('📩 [ChatScreen] Received message via socket:', message);
            // Verify it belongs to this conversation
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

                    // Check if message already exists (to handle updates)
                    const exists = prev.some(m => m._id === message._id);
                    if (exists) {
                        return prev.map(m => m._id === message._id ? message : m);
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

        const handleMessageEdit = (updatedMessage: Message) => {
            console.log('📩 [ChatScreen] Message edited via socket:', updatedMessage);
            setMessages(prev => prev.map(m => (m._id === updatedMessage._id || m.id === updatedMessage._id) ? updatedMessage : m));
        };

        const handleMessageDelete = ({ messageId }: { messageId: string }) => {
            console.log('📩 [ChatScreen] Message deleted via socket:', messageId);
            setMessages(prev => prev.filter(m => m._id !== messageId && m.id !== messageId));
        };

        const handleMessageReact = ({ messageId, reactions }: { messageId: string, reactions: any[] }) => {
            console.log('📩 [ChatScreen] Reactions updated via socket:', messageId, reactions);
            setMessages(prev => prev.map(m => (m._id === messageId || m.id === messageId) ? { ...m, reactions } : m));
        };

        const handleConversationUpdated = (updatedConv: any) => {
            if (updatedConv.id === activeConversationId || updatedConv._id === activeConversationId) {
                console.log('🔄 [ChatScreen] Active conversation updated:', updatedConv);
                setOtherUser((prev: any) => ({
                    ...prev,
                    groupMetadata: updatedConv.groupMetadata,
                    participants: updatedConv.participants,
                    admins: updatedConv.admins
                }));
            }
        };

        const handleReadUpdate = ({ conversationId, readerId, readAt }: any) => {
            if (conversationId !== activeConversationId) return;
            console.log('👀 [ChatScreen] Messages read by:', readerId);

            setMessages(prev => prev.map(msg => {
                // If I am the sender, and someone read it, update my view
                if (msg.senderId === currentUser?._id) {
                    const existingReads = msg.readBy || [];
                    if (!existingReads.some(r => r.userId === readerId)) {
                        return {
                            ...msg,
                            readBy: [...existingReads, { userId: readerId, readAt }]
                        };
                    }
                }
                return msg;
            }));
        };

        const handleReadAll = ({ conversationId, readerId, readAt }: any) => {
            if (conversationId !== activeConversationId) return;
            console.log('👀 [ChatScreen] All messages read by:', readerId);

            setMessages(prev => prev.map(msg => {
                if (msg.senderId === currentUser?._id) {
                    const existingReads = msg.readBy || [];
                    if (!existingReads.some(r => r.userId === readerId)) {
                        return {
                            ...msg,
                            readBy: [...existingReads, { userId: readerId, readAt }]
                        };
                    }
                }
                return msg;
            }));
        };

        socket.on('user:online', handleOnline);
        socket.on('user:offline', handleOffline);
        socket.on('message:receive', handleNewMessage);
        socket.on('message:new', handleNewMessage);
        socket.on('message:edit', handleMessageEdit);
        socket.on('message:delete', handleMessageDelete);
        socket.on('message:react', handleMessageReact);
        socket.on('typing:indicator', handleTypingIndicator);
        socket.on('conversation:updated', handleConversationUpdated);
        socket.on('message:read_update', handleReadUpdate);
        socket.on('message:read_all', handleReadAll);

        return () => {
            socket.emit('conversation:leave', activeConversationId);
            socket.off('user:online', handleOnline);
            socket.off('user:offline', handleOffline);
            socket.off('message:receive', handleNewMessage);
            socket.off('message:new', handleNewMessage);
            socket.off('message:edit', handleMessageEdit);
            socket.off('message:delete', handleMessageDelete);
            socket.off('message:react', handleMessageReact);
            socket.off('typing:indicator', handleTypingIndicator);
            socket.off('conversation:updated', handleConversationUpdated);
            socket.off('message:read_update', handleReadUpdate);
            socket.off('message:read_all', handleReadAll);
            socket.off('connect', joinRoom);
            socket.off('reconnect', joinRoom);
        };
    }, [activeConversationId, otherUser]); // Depend on resolved ID

    const handleCall = () => {
        if (!otherUser) return;
        console.log('📞 [ChatScreen] Starting call with user:', otherUser);
        startCall({
            _id: otherUser._id,
            name: otherUser.name,
            avatar: otherUser.avatar
        });
    };

    // Throttled navigation callbacks
    const handleBackPress = useThrottledCallback(() => router.back(), 1000);
    const handleProfilePress = useThrottledCallback(() => {
        if (otherUser?.type === 'group') {
            router.push(`/chat/settings/${id}`);
        } else if (otherUser?._id) {
            router.push(`/user/${otherUser._id}`);
        }
    }, 1000);
    const handleCallThrottled = useThrottledCallback(handleCall, 1000);

    const getInitials = (name: string) => {
        if (!name) return 'U';
        const parts = name.split(' ').filter(p => p.length > 0);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return parts[0] ? parts[0][0].toUpperCase() : 'U';
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
                conversationId: activeConversationId || id,
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
                    conversationId: activeConversationId || id,
                    receiverId: otherUser._id
                });
            }, 2000);
        } else {
            // Empty text, emit stop immediately
            console.log('📝 [ChatScreen] Emitting typing:stop (empty)');
            socket.emit('typing:stop', {
                conversationId: activeConversationId || id,
                receiverId: otherUser._id
            });
        }
    };

    // ============ MEDIA HANDLERS ============

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
        });

        if (!result.canceled && result.assets[0].uri) {
            await sendMediaMessage(result.assets[0].uri, 'image');
        }
    };

    const startRecording = async () => {
        try {
            console.log('🎙️ [ChatScreen] Starting recording...');
            const permission = await Audio.requestPermissionsAsync();
            if (permission.status !== 'granted') return;

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(recording);
            setIsRecording(true);
            setRecordingDuration(0);

            recordingIntervalRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    };

    const stopRecording = async () => {
        if (!recording) return;
        console.log('🎙️ [ChatScreen] Stopping recording...');

        setIsRecording(false);
        clearInterval(recordingIntervalRef.current);

        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setRecording(null);

            if (uri) {
                await sendMediaMessage(uri, 'voice');
            }
        } catch (err) {
            console.error('Failed to stop recording', err);
        }
    };

    const sendMediaMessage = async (uri: string, type: 'image' | 'voice') => {
        setIsUploading(true);
        const optimisticId = `temp-${Date.now()}`;

        const optimisticMessage: any = {
            id: optimisticId,
            _id: optimisticId,
            content: type === 'image' ? 'Image' : 'Voice note',
            type,
            mediaUrl: uri, // Temporary local URI
            senderId: currentUser?._id || 'temp',
            timestamp: new Date(),
            createdAt: new Date().toISOString(),
            replyTo: replyingTo?._id || replyingTo?.id || null
        };

        setMessages(prev => [...prev, optimisticMessage]);
        setReplyingTo(null);

        try {
            const mediaUrl = await authAPI.uploadImage(uri);
            const targetId = activeConversationId || id as string;

            await chatAPI.sendMessage(targetId, {
                content: type === 'image' ? 'Sent an image' : 'Sent a voice note',
                type,
                mediaUrl,
                replyTo: optimisticMessage.replyTo
            });
        } catch (error) {
            console.log(`Error sending ${type}:`, error);
            setMessages(prev => prev.filter(m => m.id !== optimisticId));
            Alert.alert('Error', `Failed to send ${type}`);
        } finally {
            setIsUploading(false);
        }
    };

    const handleEditMessage = (message: Message) => {
        setEditingMessage(message);
        setIsEditing(true);
        setInputText(message.content);
        setActionMessage(null);
    };

    const handleDeleteMessage = async (messageId: string) => {
        // Optimistic update
        setMessages(prev => prev.filter(m => m._id !== messageId && m.id !== messageId));
        setActionMessage(null);
        try {
            await chatAPI.deleteMessage(messageId);
        } catch (error) {
            console.log('Error deleting message:', error);
            Alert.alert('Error', 'Failed to delete message');
            // Re-fetch or handle error
        }
    };

    const sendMessage = async () => {
        if (!inputText.trim()) return;

        const optimisticId = `temp-${Date.now()}`;
        const content = inputText.trim();

        if (isEditing && editingMessage) {
            const messageId = editingMessage._id || editingMessage.id;
            // Optimistic update
            setMessages(prev => prev.map(m => (m._id === messageId || m.id === messageId) ? { ...m, content } : m));
            setInputText('');
            setIsEditing(false);
            setEditingMessage(null);

            try {
                await chatAPI.editMessage(messageId!, content);
            } catch (error) {
                console.log('Error editing message:', error);
                Alert.alert('Error', 'Failed to edit message');
            }
            return;
        }

        const optimisticMessage: any = {
            id: optimisticId,
            _id: optimisticId,
            content,
            text: content,
            type: contextMarketItem ? 'market_item' : 'text',
            senderId: currentUser?._id || 'temp',
            timestamp: new Date(),
            createdAt: new Date().toISOString(),
            replyTo: replyingTo?._id || replyingTo?.id || null,
            marketItem: contextMarketItem || null
        };

        setMessages(prev => [...prev, optimisticMessage]);
        setInputText('');
        setReplyingTo(null);
        setContextMarketItem(null); // Clear after sending

        try {
            const targetId = activeConversationId || id as string;
            await chatAPI.sendMessage(targetId, {
                content,
                type: optimisticMessage.type, // 'text' or 'market_item'
                replyTo: optimisticMessage.replyTo,
                marketItem: optimisticMessage.marketItem?._id
            });
        } catch (error: any) {
            console.log('Error sending message:', error);
            setMessages(prev => prev.filter(m => m.id !== optimisticId));
            const errorMessage = error.response?.data?.message || 'Failed to send message.';
            Alert.alert('Error', errorMessage);
        }
    };

    const handleReactToMessage = async (messageId: string, emoji: string) => {
        if (!currentUser) return;

        // Optimistic update
        setMessages(prev => prev.map(msg => {
            if (msg._id === messageId || msg.id === messageId) {
                const existingReactions = msg.reactions || [];
                const alreadyReacted = existingReactions.find(r => r.userId === currentUser._id && r.emoji === emoji);

                if (alreadyReacted) {
                    // Remove reaction
                    return {
                        ...msg,
                        reactions: existingReactions.filter(r => !(r.userId === currentUser._id && r.emoji === emoji))
                    };
                } else {
                    // Add/Replace reaction
                    return {
                        ...msg,
                        reactions: [...existingReactions.filter(r => r.userId !== currentUser._id), { userId: currentUser._id, emoji }]
                    };
                }
            }
            return msg;
        }));

        try {
            await chatAPI.reactToMessage(messageId, emoji);
        } catch (error) {
            console.log('Error reacting to message:', error);
            // Rollback could be implemented here if needed
        }
    };

    const handleTransferAction = async (messageId: string, action: 'accept' | 'reject') => {
        const message = messages.find(m => m._id === messageId || m.id === messageId);
        if (!message) return;

        const transferInfo = message.transactionId || message.transfer;
        if (!transferInfo || !transferInfo._id) return;

        const transferId = transferInfo._id;

        // Optimistic Update
        setMessages(prev => prev.map(m => {
            if (m._id === messageId || m.id === messageId) {
                const newStatus = action === 'accept' ? 'completed' : 'rejected';
                if (m.transactionId) return { ...m, transactionId: { ...m.transactionId, status: newStatus } };
                if (m.transfer) return { ...m, transfer: { ...m.transfer, status: newStatus } };
            }
            return m;
        }));

        try {
            if (action === 'accept') {
                await walletAPI.acceptTransfer(transferId);
            } else {
                await walletAPI.rejectTransfer(transferId);
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error: any) {
            console.log(`Error ${action}ing transfer:`, error);
            const errorMessage = error.response?.data?.message || `Failed to ${action} transfer.`;
            Alert.alert('Error', errorMessage);
        }
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const repliedMessage = typeof item.replyTo === 'string'
            ? messages.find(m => m._id === item.replyTo || m.id === item.replyTo)
            : item.replyTo;

        if (item.type === 'system') {
            return (
                <View style={styles.systemMessageContainer}>
                    <View style={[styles.systemMessageBadge, { backgroundColor: colorScheme === 'dark' ? '#262626' : '#F0F0F0' }]}>
                        <Text style={[styles.systemMessageText, { color: colors.subtext }]}>{item.content}</Text>
                    </View>
                </View>
            );
        }

        return (
            <MessageItem
                item={{ ...item, replyTo: repliedMessage }}
                isMe={item.senderId === currentUser?._id}
                onReply={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setReplyingTo(item);
                }}
                onReact={(emoji) => {
                    handleReactToMessage(item._id || item.id!, emoji);
                }}
                onLongPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setActionMessage(item);
                }}
                onTransferAction={(action) => handleTransferAction(item._id || item.id!, action)}
                showSenderName={otherUser?.type === 'group'}
                status={getMessageStatus(item)}
            />
        );
    };

    const getMessageStatus = (item: Message): 'sent' | 'delivered' | 'read' => {
        if (!item.readBy || item.readBy.length === 0) {
            // Fallback to isRead for Delivered vs Sent check? 
            // Ideally we need 'isDelivered' from backend but let's assume if we have it here, it's sent.
            // If we want 'delivered' logic we need a socket event 'message:delivered' which we haven't implemented yet.
            // So for now: 1 tick = sent to server.
            return 'sent';
        }

        // Check if read by others
        const readByOthers = item.readBy.filter(r => r.userId !== currentUser?._id);

        if (readByOthers.length > 0) {
            // In 1-on-1: if readByOthers > 0 -> read
            // In Group: if readByOthers > 0 -> read (simplification)
            return 'read';
        }

        return 'sent'; // Default
    };

    // If loading or otherUser missing, render minimal UI but keep hooks consistent
    if (isLoading || !otherUser) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
                <Stack.Screen options={{ headerShown: false }} />
                <CustomLoader message="Loading chat..." />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={colors.text} />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleProfilePress} style={styles.userInfo}>
                    <View style={styles.avatarContainer}>
                        {otherUser?.type === 'group' ? (
                            otherUser.groupMetadata?.avatar ? (
                                <Image source={{ uri: otherUser.groupMetadata.avatar }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                                    <Text style={[styles.avatarText, { color: colors.primary }]}>
                                        {otherUser.groupMetadata?.name?.[0]?.toUpperCase()}
                                    </Text>
                                </View>
                            )
                        ) : (
                            otherUser?.avatar ? (
                                <Image source={{ uri: otherUser.avatar }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                                    <Text style={[styles.avatarText, { color: colors.primary }]}>
                                        {getInitials(otherUser?.name)}
                                    </Text>
                                </View>
                            )
                        )}
                        {otherUser?.type !== 'group' && isOnline && <View style={styles.onlineBadge} />}
                    </View>
                    <View>
                        <Text style={styles.userName}>{otherUser?.type === 'group' ? otherUser.groupMetadata?.name : (otherUser?.name || 'User')}</Text>
                        <Text style={[styles.userStatus, { color: (otherUser?.type !== 'group' && isOnline) ? '#4ADE80' : colors.subtext }]}>
                            {otherUser?.type === 'group' ? `${otherUser.participants?.length || 0} members` : (isOnline ? 'Online' : 'Offline')}
                        </Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={handleCallThrottled} style={styles.actionButton}>
                        <Ionicons name="call-outline" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name="videocam-outline" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={item => item.id || item._id}
                    contentContainerStyle={styles.messagesList}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                />

                {isTyping && (
                    <View style={styles.typingIndicator}>
                        <Text style={[styles.typingText, { color: colors.subtext }]}>
                            {otherUser?.name} is typing...
                        </Text>
                    </View>
                )}

                {/* Input Area */}
                <View style={[styles.inputContainer, {
                    backgroundColor: colors.card,
                    paddingBottom: Math.max(insets.bottom, 15),
                    borderTopColor: colors.border
                }]}>
                    {contextMarketItem && !replyingTo && !isEditing && (
                        <View style={styles.marketPreview}>
                            <Image source={{ uri: contextMarketItem.images[0] }} style={styles.marketImage} />
                            <View style={styles.marketInfo}>
                                <Text style={[styles.marketTitle, { color: colors.text }]} numberOfLines={1}>{contextMarketItem.title}</Text>
                                <Text style={[styles.marketPrice, { color: colors.primary }]}>₦{contextMarketItem.price.toLocaleString()}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setContextMarketItem(null)}>
                                <Ionicons name="close-circle" size={24} color={colors.subtext} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {replyingTo && (
                        <View style={[styles.replyPreview, { backgroundColor: colorScheme === 'dark' ? '#262626' : '#F5F5F5' }]}>
                            <View style={[styles.replyBar, { backgroundColor: colors.primary }]} />
                            <View style={{ flex: 1, paddingLeft: 10 }}>
                                <Text style={[styles.replyUser, { color: colors.primary }]}>
                                    Replying to {replyingTo.senderId === currentUser?._id ? 'yourself' : otherUser?.name}
                                </Text>
                                <Text numberOfLines={1} style={[styles.replyText, { color: colors.subtext }]}>
                                    {replyingTo.content}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => { setReplyingTo(null); setIsEditing(false); setEditingMessage(null); setInputText(''); }}>
                                <Ionicons name="close-circle" size={24} color={colors.subtext} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {isEditing && (
                        <View style={[styles.replyPreview, { backgroundColor: colorScheme === 'dark' ? '#262626' : '#F5F5F5' }]}>
                            <View style={[styles.replyBar, { backgroundColor: '#FFD700' }]} />
                            <View style={{ flex: 1, paddingLeft: 10 }}>
                                <Text style={[styles.replyUser, { color: '#FFD700' }]}>Editing Message</Text>
                                <Text numberOfLines={1} style={[styles.replyText, { color: colors.subtext }]}>
                                    {editingMessage?.content}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => { setIsEditing(false); setEditingMessage(null); setInputText(''); }}>
                                <Ionicons name="close-circle" size={24} color={colors.subtext} />
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={styles.inputRow}>
                        <TouchableOpacity onPress={pickImage} style={styles.attachButton}>
                            <Ionicons name="add" size={28} color={colors.primary} />
                        </TouchableOpacity>

                        <TextInput
                            style={[styles.input, { color: colors.text, backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#F5F8FA' }]}
                            placeholder="Type a message..."
                            placeholderTextColor={colors.subtext}
                            value={inputText}
                            onChangeText={handleInputChange}
                            multiline
                        />

                        {inputText.trim() || isUploading ? (
                            <TouchableOpacity
                                onPress={sendMessage}
                                disabled={!inputText.trim() || isUploading}
                                style={[styles.sendButton, { backgroundColor: colors.primary }]}
                            >
                                {isUploading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Ionicons name="send" size={20} color="#fff" />
                                )}
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                onLongPress={startRecording}
                                onPressOut={stopRecording}
                                style={[styles.micButton, { backgroundColor: isRecording ? '#FF3B30' : colors.primary }]}
                            >
                                <Ionicons name={isRecording ? "stop" : "mic"} size={24} color="#fff" />
                            </TouchableOpacity>
                        )}
                    </View>
                    {isRecording && (
                        <View style={styles.recordingPrompt}>
                            <Text style={{ color: '#FF3B30', fontWeight: 'bold' }}>
                                Recording: {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                            </Text>
                            <Text style={{ color: colors.subtext, fontSize: 12 }}>Release to send</Text>
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>

            {/* Message Actions Modal */}
            <Modal
                visible={!!actionMessage}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setActionMessage(null)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setActionMessage(null)}
                >
                    <View style={[styles.actionSheet, { backgroundColor: colors.card }]}>
                        <View style={styles.reactionRow}>
                            {['❤️', '👍', '😂', '😮', '😢', '🔥'].map(emoji => {
                                const isActive = actionMessage?.reactions?.some(r => r.userId === currentUser?._id && r.emoji === emoji);
                                return (
                                    <TouchableOpacity
                                        key={emoji}
                                        onPress={() => {
                                            handleReactToMessage(actionMessage!._id || actionMessage!.id!, emoji);
                                            setActionMessage(null);
                                        }}
                                        style={[
                                            styles.reactionBtn,
                                            isActive && { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderRadius: 22 }
                                        ]}
                                    >
                                        <Text style={{ fontSize: 24 }}>{emoji}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <View style={styles.actionOptions}>
                            <TouchableOpacity
                                style={[styles.actionOption, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                                onPress={() => actionMessage && handleEditMessage(actionMessage)}
                            >
                                <Ionicons name="create-outline" size={20} color={colors.text} />
                                <Text style={[styles.actionOptionText, { color: colors.text }]}>Edit Message</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionOption}
                                onPress={() => actionMessage && handleDeleteMessage(actionMessage._id)}
                            >
                                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                                <Text style={[styles.actionOptionText, { color: '#FF3B30' }]}>Delete Message</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

// ============ SUB-COMPONENTS ============

const MessageItem = ({ item, isMe, onReply, onReact, onLongPress, onTransferAction, showSenderName, status }: { item: Message, isMe: boolean, onReply: () => void, onReact: (emoji: string) => void, onLongPress: () => void, onTransferAction: (action: 'accept' | 'reject') => void, showSenderName?: boolean, status: 'sent' | 'delivered' | 'read' }) => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { user: currentUser } = useAuth();
    const swipeableRef = useRef<Swipeable>(null);

    const [sender, setSender] = React.useState<any>(null);

    React.useEffect(() => {
        if (showSenderName && !isMe && item.senderId) {
            authAPI.getUserProfile(item.senderId).then(({ data }: any) => setSender(data)).catch(() => { });
        }
    }, [item.senderId, showSenderName, isMe]);
    const router = useRouter();

    // Voice Note States
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [playbackProgress, setPlaybackProgress] = useState(0); // 0 to 1

    const renderRightActions = () => (
        <View style={styles.replyActionContainer}>
            <Ionicons name="arrow-undo" size={24} color={colors.subtext} />
        </View>
    );

    const onSwipeOpen = () => {
        swipeableRef.current?.close();
        onReply();
    };

    // Voice Player Logic
    React.useEffect(() => {
        if (item.type === 'voice' && item.mediaUrl) {
            loadSound();
        }
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, [item.mediaUrl]);

    async function loadSound() {
        try {
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: item.mediaUrl! },
                { shouldPlay: false },
                onPlaybackStatusUpdate
            );
            setSound(newSound);
            setIsLoaded(true);
        } catch (error) {
            console.log('Error loading sound:', error);
        }
    }

    const onPlaybackStatusUpdate = (status: any) => {
        if (status.isLoaded) {
            setIsPlaying(status.isPlaying);
            if (status.durationMillis) {
                setPlaybackProgress(status.positionMillis / status.durationMillis);
            }
            if (status.didJustFinish) {
                setPlaybackProgress(0);
                setIsPlaying(false);
            }
        }
    };

    const togglePlayback = async () => {
        if (!sound || !isLoaded) return;

        if (isPlaying) {
            await sound.pauseAsync();
        } else {
            if (playbackProgress >= 1 || playbackProgress === 0) {
                await sound.setPositionAsync(0);
            }
            await sound.playAsync();
        }
    };

    return (
        <Swipeable
            ref={swipeableRef}
            // Reversed direction: If isMe, show right actions (swipe left). If !isMe, show left actions (swipe right).
            renderRightActions={isMe ? renderRightActions : undefined}
            renderLeftActions={isMe ? undefined : renderRightActions}
            onSwipeableOpen={onSwipeOpen}
        >
            <Pressable
                onLongPress={onLongPress}
                style={[styles.messageRow, isMe ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}
            >
                <View style={styles.bubbleWrapper}>
                    {!isMe && showSenderName && sender && (
                        <Text style={[styles.senderName, { color: colors.primary }]}>{sender.name}</Text>
                    )}
                    <View style={[
                        styles.messageBubble,
                        isMe ? styles.userBubble : styles.supportBubble,
                        { backgroundColor: isMe ? colors.primary : colors.card }
                    ]}>
                        {item.replyTo && (
                            <View style={[styles.messageReplyPreview, { backgroundColor: isMe ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                                <Text numberOfLines={1} style={[styles.replyPreviewText, { color: isMe ? '#fff' : colors.text, opacity: 0.7 }]}>
                                    {typeof item.replyTo === 'object' ? (item.replyTo.content || 'Media') : 'Replying...'}
                                </Text>
                            </View>
                        )}

                        {item.type === 'market_item' && item.marketItem && (
                            <TouchableOpacity
                                onPress={() => router.push(`/market/${item.marketItem._id || item.marketItem.id}`)}
                                style={styles.marketPreview}
                            >
                                {item.marketItem.images?.[0] && (
                                    <Image source={{ uri: item.marketItem.images[0] }} style={styles.marketImage} />
                                )}
                                <View style={styles.marketInfo}>
                                    <Text style={[styles.marketTitle, { color: isMe ? '#fff' : colors.text }]} numberOfLines={1}>
                                        {item.marketItem.title}
                                    </Text>
                                    <Text style={[styles.marketPrice, { color: isMe ? '#fff' : colors.primary }]}>
                                        ₦{item.marketItem.price?.toLocaleString()}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}

                        {item.type === 'image' && item.mediaUrl && (
                            <Image source={{ uri: item.mediaUrl }} style={styles.messageImage} contentFit="cover" />
                        )}

                        {item.type === 'voice' && (
                            <View style={styles.voiceMessage}>
                                <TouchableOpacity onPress={togglePlayback} disabled={!isLoaded}>
                                    {!isLoaded ? (
                                        <ActivityIndicator size="small" color={isMe ? '#fff' : colors.primary} />
                                    ) : (
                                        <Ionicons name={isPlaying ? "pause" : "play"} size={24} color={isMe ? '#fff' : colors.primary} />
                                    )}
                                </TouchableOpacity>
                                <View style={styles.voiceProgressContainer}>
                                    <View style={[styles.voiceProgressBar, { backgroundColor: isMe ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)' }]} />
                                    <View
                                        style={[
                                            styles.voiceProgressFill,
                                            {
                                                backgroundColor: isMe ? '#fff' : colors.primary,
                                                width: `${playbackProgress * 100}%`
                                            }
                                        ]}
                                    />
                                </View>
                            </View>
                        )}

                        {item.type === 'transfer' && (
                            <View style={styles.transferContainer}>
                                <View style={styles.transferHeader}>
                                    <Ionicons name="cash-outline" size={20} color={isMe ? '#fff' : colors.primary} />
                                    <Text style={[styles.transferTitle, { color: isMe ? '#fff' : colors.text }]}>Transfer</Text>
                                </View>
                                <Text style={[
                                    styles.transferAmount,
                                    { color: isMe ? '#fff' : colors.text },
                                    (item.transactionId?.status === 'rejected' || item.transfer?.status === 'rejected') && styles.rejectedAmount
                                ]}>
                                    ₦{Math.abs(item.transactionId?.amount || item.transfer?.amount || 0).toLocaleString()}
                                </Text>
                                <View style={[
                                    styles.statusBadge,
                                    { backgroundColor: (item.transactionId?.status === 'completed' || item.transfer?.status === 'completed') ? '#4ADE80' : (item.transactionId?.status === 'rejected' || item.transfer?.status === 'rejected') ? '#FF3B30' : '#FFD700' }
                                ]}>
                                    <Text style={styles.statusBadgeText}>
                                        {(item.transactionId?.status || item.transfer?.status || 'pending').replace('_', ' ').toUpperCase()}
                                    </Text>
                                </View>

                                {((item.transactionId?.status || item.transfer?.status || 'pending') === 'pending_acceptance' || (item.transactionId?.status || item.transfer?.status) === 'pending') && !isMe && (
                                    <View style={styles.transferActions}>
                                        <TouchableOpacity
                                            style={[styles.transferActionBtn, { backgroundColor: '#4ADE80' }]}
                                            onPress={() => onTransferAction('accept')}
                                        >
                                            <Text style={styles.transferActionText}>Accept</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.transferActionBtn, { backgroundColor: '#FF3B30' }]}
                                            onPress={() => onTransferAction('reject')}
                                        >
                                            <Text style={styles.transferActionText}>Reject</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        )}

                        {item.content && item.type !== 'transfer' && item.type !== 'voice' && item.content !== 'Sent an image' && (
                            <Text style={[
                                styles.messageText,
                                { color: isMe ? '#fff' : colors.text }
                            ]}>
                                {item.content}
                            </Text>
                        )}

                        <View style={styles.footerContainer}>
                            <Text style={[
                                styles.timestamp,
                                { color: isMe ? 'rgba(255,255,255,0.7)' : colors.subtext }
                            ]}>
                                {format(new Date(item.createdAt || Date.now()), 'HH:mm')}
                            </Text>
                            <MessageStatus status={status} isMe={isMe} color={isMe ? 'rgba(255,255,255,0.7)' : undefined} />
                        </View>

                        {item.reactions && item.reactions.length > 0 && (
                            <View style={styles.reactionsContainer}>
                                {item.reactions.map((r, i) => (
                                    <View key={i} style={[styles.reactionBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                        <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                </View>
            </Pressable>
        </Swipeable>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 15,
        paddingTop: 10,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 5,
        marginRight: 10,
    },
    userInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    onlineBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#4ADE80',
        borderWidth: 2,
        borderColor: '#fff',
    },
    userName: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    userStatus: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        padding: 8,
        marginLeft: 10,
    },
    messagesList: {
        paddingHorizontal: 16,
        paddingVertical: 20,
        paddingBottom: 40,
    },
    messageRow: {
        flexDirection: 'row',
        marginBottom: 24,
        width: '100%',
    },
    bubbleWrapper: {
        maxWidth: '80%',
    },
    messageBubble: {
        minWidth: 100,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 18,
        position: 'relative',
    },
    userBubble: {
        borderBottomRightRadius: 4,
    },
    supportBubble: {
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_500Medium',
        lineHeight: 21,
    },
    timestamp: {
        fontSize: 10,
        fontFamily: 'PlusJakartaSans_500Medium',
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    footerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 4,
    },
    messageImage: {
        width: Dimensions.get('window').width * 0.6,
        height: 200,
        borderRadius: 12,
        marginBottom: 8,
    },
    voiceMessage: {
        width: Dimensions.get('window').width * 0.6,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
    },
    messageReplyPreview: {
        padding: 8,
        borderRadius: 8,
        marginBottom: 8,
        borderLeftWidth: 3,
        borderLeftColor: 'rgba(255,255,255,0.5)',
    },
    replyPreviewText: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    transferContainer: {
        padding: 10,
        borderRadius: 12,
        width: 200,
        marginBottom: 8,
    },
    transferHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    transferTitle: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        marginLeft: 8,
    },
    transferAmount: {
        fontSize: 24,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginBottom: 10,
    },
    rejectedAmount: {
        textDecorationLine: 'line-through',
        opacity: 0.6,
    },
    transferActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 10,
    },
    transferActionBtn: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
    },
    transferActionText: {
        color: '#fff',
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    statusBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    reactionsContainer: {
        flexDirection: 'row',
        position: 'absolute',
        bottom: -15,
        right: 10,
    },
    reactionBadge: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 2,
        borderWidth: 1,
        borderColor: '#EFEFEF',
        marginLeft: -5,
    },
    reactionEmoji: {
        fontSize: 14,
    },
    typingIndicator: {
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    typingText: {
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    inputContainer: {
        borderTopWidth: 1,
        paddingHorizontal: 10,
        paddingTop: 10,
    },
    replyPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        marginHorizontal: 10,
        marginBottom: 10,
        borderRadius: 12,
    },
    replyBar: {
        width: 4,
        height: '100%',
        borderRadius: 2,
    },
    replyUser: {
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginBottom: 2,
    },
    replyText: {
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 5,
    },
    input: {
        flex: 1,
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingTop: 10,
        paddingBottom: 10,
        maxHeight: 100,
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_500Medium',
        marginHorizontal: 10,
    },
    attachButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    micButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    recordingPrompt: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 8,
    },
    replyActionContainer: {
        width: 80,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    actionSheet: {
        padding: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 40,
    },
    reactionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
        paddingHorizontal: 10,
    },
    reactionBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 22,
    },
    actionOptions: {
        borderRadius: 15,
        overflow: 'hidden',
    },
    actionOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        backgroundColor: 'rgba(150,150,150,0.05)',
    },
    actionOptionText: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        marginLeft: 12,
    },
    marketPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 12,
        padding: 8,
        marginBottom: 8,
        minWidth: 200,
    },
    marketImage: {
        width: 50,
        height: 50,
        borderRadius: 8,
    },
    marketInfo: {
        flex: 1,
        marginLeft: 10,
    },
    marketTitle: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    marketPrice: {
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginTop: 2,
    },
    voiceProgressContainer: {
        flex: 1,
        height: 30,
        marginLeft: 10,
        justifyContent: 'center',
        position: 'relative',
    },
    voiceProgressBar: {
        width: '100%',
        height: 4,
        borderRadius: 2,
    },
    voiceProgressFill: {
        position: 'absolute',
        left: 0,
        height: 4,
        borderRadius: 2,
    },
    systemMessageContainer: {
        alignItems: 'center',
        marginVertical: 12,
        paddingHorizontal: 30,
    },
    systemMessageBadge: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
    },
    systemMessageText: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        textAlign: 'center',
    },
    senderName: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginBottom: 4,
        marginLeft: 4,
    },
});
