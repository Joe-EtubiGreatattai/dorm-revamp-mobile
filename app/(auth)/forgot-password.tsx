import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { authAPI, setAuthToken } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

type Step = 1 | 2 | 3;

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const { showAlert } = useAlert();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [token, setToken] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSendCode = async () => {
        setIsLoading(true);
        try {
            await authAPI.forgotPassword(email);
            setCurrentStep(2);
        } catch (error: any) {
            console.log(error);
            showAlert({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to send reset code',
                type: 'error'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = () => {
        // In this flow, we don't verify token separately, we just move to next step 
        // and send token with new password.
        if (token.length < 6) {
            showAlert({
                title: 'Invalid Token',
                description: 'Please enter the 6-digit token sent to your email',
                type: 'error'
            });
            return;
        }
        setCurrentStep(3);
    };

    const handleReset = async () => {
        if (newPassword !== confirmPassword) {
            showAlert({
                title: 'Match Error',
                description: 'Passwords do not match. Please try again.',
                type: 'error'
            });
            return;
        }

        setIsLoading(true);
        try {
            const { data } = await authAPI.resetPassword({
                token,
                password: newPassword
            });

            // Auto login or redirect
            if (data.token) {
                await SecureStore.setItemAsync('token', data.token);
                setAuthToken(data.token);
            }

            showAlert({
                title: 'Reset Successful',
                description: 'Your password has been updated. Please login.',
                type: 'success'
            });
            router.replace('/(auth)/login');
        } catch (error: any) {
            console.log(error);
            showAlert({
                title: 'Reset Failed',
                description: error.response?.data?.message || 'Failed to reset password',
                type: 'error'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Reset Password</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {currentStep === 1 && (
                        <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContent}>
                            <Text style={[styles.title, { color: colors.text }]}>Forgot Password?</Text>
                            <Text style={[styles.subtitle, { color: colors.subtext }]}>
                                Enter your university email and we'll send you a pin to reset your password.
                            </Text>

                            <View style={styles.form}>
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: colors.text }]}>Email Address</Text>
                                    <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                        <Ionicons name="mail-outline" size={20} color={colors.subtext} />
                                        <TextInput
                                            style={[styles.input, { color: colors.text }]}
                                            placeholder="user@university.edu.ng"
                                            placeholderTextColor={colors.subtext}
                                            value={email}
                                            onChangeText={setEmail}
                                            autoCapitalize="none"
                                            keyboardType="email-address"
                                        />
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: isLoading ? 0.7 : 1 }]}
                                    onPress={handleSendCode}
                                    disabled={isLoading}
                                >
                                    <Text style={styles.primaryBtnText}>{isLoading ? 'Sending...' : 'Send Reset Link'}</Text>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    )}

                    {currentStep === 2 && (
                        <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContent}>
                            <Text style={[styles.title, { color: colors.text }]}>Verify OTP</Text>
                            <Text style={[styles.subtitle, { color: colors.subtext }]}>
                                Enter the 6-digit code we sent to your email.
                            </Text>

                            <View style={styles.form}>
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: colors.text }]}>Reset Token</Text>
                                    <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                        <Ionicons name="key-outline" size={20} color={colors.subtext} />
                                        <TextInput
                                            style={[styles.input, { color: colors.text }]}
                                            placeholder="Enter the code sent to email"
                                            placeholderTextColor={colors.subtext}
                                            value={token}
                                            onChangeText={setToken}
                                            autoCapitalize="none"
                                        />
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 24 }]}
                                    onPress={handleVerify}
                                >
                                    <Text style={styles.primaryBtnText}>Continue</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={{ alignSelf: 'center', marginTop: 20 }}>
                                    <Text style={{ color: colors.primary, fontFamily: 'PlusJakartaSans_700Bold' }}>Resend Code</Text>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    )}

                    {currentStep === 3 && (
                        <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContent}>
                            <Text style={[styles.title, { color: colors.text }]}>Create New Password</Text>
                            <Text style={[styles.subtitle, { color: colors.subtext }]}>
                                Your new password must be different from previous ones.
                            </Text>

                            <View style={styles.form}>
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: colors.text }]}>New Password</Text>
                                    <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                        <Ionicons name="lock-closed-outline" size={20} color={colors.subtext} />
                                        <TextInput
                                            style={[styles.input, { color: colors.text }]}
                                            placeholder="Min. 8 characters"
                                            placeholderTextColor={colors.subtext}
                                            value={newPassword}
                                            onChangeText={setNewPassword}
                                            secureTextEntry
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: colors.text }]}>Confirm New Password</Text>
                                    <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                        <Ionicons name="lock-closed-outline" size={20} color={colors.subtext} />
                                        <TextInput
                                            style={[styles.input, { color: colors.text }]}
                                            placeholder="Re-enter password"
                                            placeholderTextColor={colors.subtext}
                                            value={confirmPassword}
                                            onChangeText={setConfirmPassword}
                                            secureTextEntry
                                        />
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 10, opacity: isLoading ? 0.7 : 1 }]}
                                    onPress={handleReset}
                                    disabled={isLoading}
                                >
                                    <Text style={styles.primaryBtnText}>{isLoading ? 'Resetting...' : 'Reset Password'}</Text>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        padding: 24,
    },
    stepContent: { flex: 1 },
    title: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 32,
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 40,
    },
    form: { gap: 24 },
    inputGroup: { gap: 8 },
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
    input: {
        flex: 1,
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 16,
    },
    primaryBtn: {
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
        color: '#fff',
    },
    otpRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
    },
    otpBox: {
        width: 45,
        height: 56,
        borderRadius: 12,
        borderWidth: 1,
    },
});
