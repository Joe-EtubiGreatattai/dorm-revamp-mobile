import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Message = {
    id: string;
    text: string;
    sender: 'user' | 'support';
    timestamp: Date;
};

export default function SupportChat() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const flatListRef = useRef<FlatList>(null);

    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: 'Hi there! 👋\nHow can we help you today?',
            sender: 'support',
            timestamp: new Date(),
        }
    ]);
    const [inputText, setInputText] = useState('');

    const sendMessage = () => {
        if (!inputText.trim()) return;

        const newUserMsg: Message = {
            id: Date.now().toString(),
            text: inputText.trim(),
            sender: 'user',
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, newUserMsg]);
        setInputText('');

        // Simulate Support Reply
        setTimeout(() => {
            const replyMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: "Thanks for reaching out! A member of our team will get back to you shortly.",
                sender: 'support',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, replyMsg]);
        }, 1500);
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isUser = item.sender === 'user';
        return (
            <View style={[
                styles.messageBubble,
                isUser ? styles.userBubble : styles.supportBubble,
                { backgroundColor: isUser ? colors.primary : colors.card }
            ]}>
                <Text style={[
                    styles.messageText,
                    { color: isUser ? '#fff' : colors.text }
                ]}>
                    {item.text}
                </Text>
                <Text style={[
                    styles.timestamp,
                    { color: isUser ? 'rgba(255,255,255,0.7)' : colors.subtext }
                ]}>
                    {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Dorm Revamp Support</Text>
                    <View style={styles.statusRow}>
                        <View style={styles.onlineDot} />
                        <Text style={[styles.statusText, { color: colors.subtext }]}>Typically replies in 10m</Text>
                    </View>
                </View>
                <View style={{ width: 44 }} />
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
                    keyExtractor={item => item.id}
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
                        onChangeText={setInputText}
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
    headerTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    onlineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10b981',
        marginRight: 6,
    },
    statusText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
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
