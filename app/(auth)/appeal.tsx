import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { authAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AppealScreen() {
    const router = useRouter();
    const { email: initialEmail } = useLocalSearchParams<{ email: string }>();
    const { showAlert } = useAlert();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [email, setEmail] = useState(initialEmail || '');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (!email || !message) return;
        setIsLoading(true);
        try {
            await authAPI.submitAppeal({ email, message });
            showAlert({
                title: 'Appeal Submitted',
                description: 'Your appeal has been received and will be reviewed by our team.',
                type: 'success',
                onConfirm: () => router.replace('/(auth)/login')
            });
        } catch (e: any) {
            console.error(e);
            showAlert({
                title: 'Submission Failed',
                description: e.response?.data?.message || 'Could not submit appeal. Please try again later.',
                type: 'error'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>

                    <View style={styles.headerSection}>
                        <Text style={[styles.title, { color: colors.text }]}>Appeal Ban</Text>
                        <Text style={[styles.subtitle, { color: colors.subtext }]}>
                            If you believe your account was banned in error, please provide details below for review.
                        </Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.text }]}>Email Address</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Ionicons name="mail-outline" size={20} color={colors.subtext} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="Your registered email"
                                    placeholderTextColor={colors.subtext}
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.text }]}>Your Message</Text>
                            <View style={[styles.textAreaWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <TextInput
                                    style={[styles.textArea, { color: colors.text }]}
                                    placeholder="Explain why your account should be unbanned..."
                                    placeholderTextColor={colors.subtext}
                                    value={message}
                                    onChangeText={setMessage}
                                    multiline
                                    numberOfLines={6}
                                    textAlignVertical="top"
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: (email && message) ? 1 : 0.6 }]}
                            onPress={handleSubmit}
                            disabled={isLoading || !email || !message}
                        >
                            <Text style={styles.submitBtnText}>{isLoading ? 'Submitting...' : 'Submit Appeal'}</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 40,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    headerSection: {
        marginBottom: 40,
    },
    title: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 32,
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 16,
        lineHeight: 24,
    },
    form: {
        gap: 24,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 56,
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 16,
        gap: 12,
    },
    textAreaWrapper: {
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingTop: 12,
        minHeight: 150,
    },
    input: {
        flex: 1,
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 16,
    },
    textArea: {
        flex: 1,
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 16,
        minHeight: 120,
    },
    submitBtn: {
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    submitBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
        color: '#fff',
    },
});
