import CustomLoader from '@/components/CustomLoader';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import { supportAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SupportChat() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { user } = useAuth();
    const { showAlert } = useAlert();

    const [activeTicket, setActiveTicket] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [messages, setMessages] = useState<any[]>([]);

    // For new ticket
    const [subject, setSubject] = useState('');
    const [initialMessage, setInitialMessage] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // For chat
    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        fetchActiveTicket();
    }, []);

    const fetchActiveTicket = async () => {
        try {
            const res = await supportAPI.getTickets('open');
            if (res.data.data && res.data.data.length > 0) {
                const ticket = res.data.data[0];
                setActiveTicket(ticket);
                setMessages(ticket.messages || []);
            }
        } catch (error) {
            console.error('Error fetching tickets', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Socket Listener
    useEffect(() => {
        if (!activeTicket) return;

        const { getSocket } = require('@/utils/socket');
        const socket = getSocket();

        if (socket) {
            const handleSupportMessage = (data: { ticketId: string, message: any }) => {
                // If checking ticketId matches
                if (data.ticketId === activeTicket._id) {
                    setMessages(prev => [...prev, data.message]);
                }
            };

            // Support controller emits 'support:message' to user room
            socket.on('support:message', handleSupportMessage);

            return () => {
                socket.off('support:message', handleSupportMessage);
            };
        }
    }, [activeTicket]);

    const handleCreateTicket = async () => {
        if (!subject.trim() || !initialMessage.trim()) return;
        setIsCreating(true);
        try {
            const res = await supportAPI.createTicket({ subject, message: initialMessage });
            setActiveTicket(res.data);
            setMessages(res.data.messages);
            setSubject('');
            setInitialMessage('');
        } catch (error) {
            showAlert({ title: 'Error', description: 'Failed to create ticket', type: 'error' });
        } finally {
            setIsCreating(false);
        }
    };

    const handleSendMessage = async () => {
        if (!inputText.trim() || !activeTicket) return;

        const content = inputText.trim();
        setInputText('');
        setIsSending(true);

        // Optimistic update
        const tempMsg = {
            sender: 'user',
            content: content,
            timestamp: new Date().toISOString(),
            _id: Date.now().toString()
        };
        setMessages(prev => [...prev, tempMsg]);

        try {
            await supportAPI.sendMessage(activeTicket._id, { content });
            // The real message will come via socket or we can replace if API returns it
        } catch (error) {
            setMessages(prev => prev.filter(m => m._id !== tempMsg._id)); // Revert
            showAlert({ title: 'Error', description: 'Failed to send message', type: 'error' });
        } finally {
            setIsSending(false);
        }
    };

    const renderMessage = ({ item }: { item: any }) => {
        const isMe = item.sender === 'user';
        return (
            <View style={[
                styles.messageBubble,
                isMe ? styles.userBubble : styles.supportBubble,
                { backgroundColor: isMe ? colors.primary : colors.card }
            ]}>
                <Text style={[styles.messageText, { color: isMe ? '#fff' : colors.text }]}>
                    {item.content}
                </Text>
                <Text style={[styles.timestamp, { color: isMe ? 'rgba(255,255,255,0.7)' : colors.subtext }]}>
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        );
    };

    if (isLoading) return <CustomLoader />;

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <View>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>
                            {activeTicket ? 'Support Chat' : 'New Ticket'}
                        </Text>
                        {activeTicket && (
                            <Text style={[styles.headerSubtitle, { color: colors.subtext }]}>
                                {activeTicket.subject}
                            </Text>
                        )}
                    </View>
                    <View style={{ width: 44 }} />
                </View>

                {!activeTicket ? (
                    <View style={styles.formContainer}>
                        <Text style={[styles.label, { color: colors.text }]}>Subject</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                            placeholder="e.g., Payment Issue"
                            placeholderTextColor={colors.subtext}
                            value={subject}
                            onChangeText={setSubject}
                        />

                        <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>Message</Text>
                        <TextInput
                            style={[styles.textArea, { backgroundColor: colors.card, color: colors.text }]}
                            placeholder="Describe your issue..."
                            placeholderTextColor={colors.subtext}
                            multiline
                            textAlignVertical="top"
                            value={initialMessage}
                            onChangeText={setInitialMessage}
                        />

                        <TouchableOpacity
                            style={[styles.btn, { backgroundColor: colors.primary, opacity: (subject && initialMessage) ? 1 : 0.5 }]}
                            disabled={!subject || !initialMessage || isCreating}
                            onPress={handleCreateTicket}
                        >
                            {isCreating ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Start Chat</Text>}
                        </TouchableOpacity>
                    </View>
                ) : (
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                        style={{ flex: 1 }}
                    >
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            keyExtractor={(item, index) => index.toString()}
                            renderItem={renderMessage}
                            contentContainerStyle={styles.chatContent}
                            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                            style={{ flex: 1 }}
                        />

                        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                            <TextInput
                                style={[styles.chatInput, { backgroundColor: colors.background, color: colors.text }]}
                                placeholder="Type a message..."
                                placeholderTextColor={colors.subtext}
                                value={inputText}
                                onChangeText={setInputText}
                            />
                            <TouchableOpacity
                                style={[styles.sendBtn, { backgroundColor: inputText.trim() ? colors.primary : colors.border }]}
                                onPress={handleSendMessage}
                                disabled={!inputText.trim() || isSending}
                            >
                                <Ionicons name="send" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                )}
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
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
    headerTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
        textAlign: 'center',
    },
    headerSubtitle: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
        textAlign: 'center',
    },
    formContainer: {
        padding: 24,
    },
    label: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
        marginBottom: 8,
    },
    input: {
        height: 50,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    textArea: {
        height: 120,
        borderRadius: 12,
        padding: 16,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    btn: {
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
    },
    btnText: {
        color: '#fff',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
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
        paddingBottom: Platform.OS === 'ios' ? 34 : 14,
        borderTopWidth: 1,
    },
    chatInput: {
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
