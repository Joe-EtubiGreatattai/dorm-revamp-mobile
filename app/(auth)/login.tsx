import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
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
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
    const router = useRouter();
    const { login } = useAuth();
    const { showAlert } = useAlert();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) return;
        setIsLoading(true);
        try {
            await login(email, password);
            router.replace('/(tabs)');
        } catch (e: any) {
            console.error(e);
            showAlert({
                title: 'Login Failed',
                description: e.message || 'Please check your credentials and try again.',
                type: 'error'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleBiometric = async () => {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        if (!hasHardware) return;

        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Login to Dorm',
            fallbackLabel: 'Use Password',
        });

        if (result.success) {
            try {
                const bioEmail = await SecureStore.getItemAsync('biometric_email');
                const bioPassword = await SecureStore.getItemAsync('biometric_password');

                if (bioEmail && bioPassword) {
                    await login(bioEmail, bioPassword);
                    router.replace('/(tabs)');
                } else {
                    showAlert({
                        title: 'Biometric Login Not Set Up',
                        description: 'Please log in with your password first, then enable biometrics if you want to use it.',
                        type: 'error'
                    });
                }
            } catch (error) {
                console.log('Biometric login error:', error);
                showAlert({
                    title: 'Login Error',
                    description: 'Could not retrieve credentials. Please login manually.',
                    type: 'error'
                });
            }
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
                        <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
                        <Text style={[styles.subtitle, { color: colors.subtext }]}>Sign in to continue to your campus hub</Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.text }]}>Email Address</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Ionicons name="mail-outline" size={20} color={colors.subtext} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="name@university.edu.ng"
                                    placeholderTextColor={colors.subtext}
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.text }]}>Password</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Ionicons name="lock-closed-outline" size={20} color={colors.subtext} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="Enter your password"
                                    placeholderTextColor={colors.subtext}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    <Ionicons
                                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                                        size={20}
                                        color={colors.subtext}
                                    />
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity
                                onPress={() => router.push('/(auth)/forgot-password')}
                                style={styles.forgotBtn}
                            >
                                <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot Password?</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[styles.loginBtn, { backgroundColor: colors.primary, opacity: (email && password) ? 1 : 0.6 }]}
                            onPress={handleLogin}
                            disabled={isLoading || !email || !password}
                        >
                            <Text style={styles.loginBtnText}>{isLoading ? 'Signing in...' : 'Sign In'}</Text>
                        </TouchableOpacity>

                        <View style={styles.divider}>
                            <View style={[styles.line, { backgroundColor: colors.border }]} />
                            <Text style={[styles.dividerText, { color: colors.subtext }]}>OR SIGN IN WITH</Text>
                            <View style={[styles.line, { backgroundColor: colors.border }]} />
                        </View>

                        <TouchableOpacity
                            style={[styles.biometricBtn, { borderColor: colors.border }]}
                            onPress={handleBiometric}
                        >
                            <Ionicons name="finger-print-outline" size={24} color={colors.primary} />
                            <Text style={[styles.biometricText, { color: colors.text }]}>Biometric Unlock</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: colors.subtext }]}>Don't have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                            <Text style={[styles.footerLink, { color: colors.primary }]}>Sign Up</Text>
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
    input: {
        flex: 1,
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 16,
    },
    forgotBtn: {
        alignSelf: 'flex-end',
        marginTop: 4,
    },
    forgotText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
    loginBtn: {
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
    loginBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
        color: '#fff',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginVertical: 10,
    },
    line: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 12,
        letterSpacing: 1,
    },
    biometricBtn: {
        height: 56,
        borderRadius: 16,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    biometricText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 40,
    },
    footerText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 15,
    },
    footerLink: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 15,
    },
});
