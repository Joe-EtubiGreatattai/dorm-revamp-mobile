import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import { authAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { Stack, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SecuritySettings() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { user } = useAuth();
    const { showAlert } = useAlert();


    const [isBiometricSupported, setIsBiometricSupported] = useState(false);
    const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);

    // Password Confirmation State
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [password, setPassword] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    useEffect(() => {
        checkBiometrics();
    }, []);

    const checkBiometrics = async () => {
        try {
            const compatible = await LocalAuthentication.hasHardwareAsync();
            const enrolled = await LocalAuthentication.isEnrolledAsync();
            setIsBiometricSupported(compatible && enrolled);

            if (compatible && enrolled) {
                const storedEmail = await SecureStore.getItemAsync('biometric_email');
                const storedEnabled = await SecureStore.getItemAsync('biometric_enabled');
                setIsBiometricEnabled(!!storedEmail && storedEnabled === 'true');
            }
        } catch (error) {
            console.error('Biometric check failed', error);
        }
    };

    const handleToggleBiometrics = async (value: boolean) => {
        if (value) {
            // Turning ON: Ask for password
            setShowPasswordModal(true);
        } else {
            // Turning OFF: Clear storage
            try {
                await SecureStore.deleteItemAsync('biometric_enabled');
                await SecureStore.deleteItemAsync('biometric_email');
                await SecureStore.deleteItemAsync('biometric_password');
                setIsBiometricEnabled(false);
            } catch (error) {
                console.error('Error disabling biometrics', error);
            }
        }
    };

    const confirmEnableBiometrics = async () => {
        if (!password || !user?.email) return;
        setIsVerifying(true);

        try {
            // 1. Verify credentials with backend
            await authAPI.login({ email: user.email, password });

            // 2. Verify Biometrics (User proves it's them)
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Authenticate to enable biometrics',
            });

            if (result.success) {
                // 3. Save credentials
                await SecureStore.setItemAsync('biometric_email', user.email);
                await SecureStore.setItemAsync('biometric_password', password);
                await SecureStore.setItemAsync('biometric_enabled', 'true');

                setIsBiometricEnabled(true);
                setShowPasswordModal(false);
                setPassword('');
                showAlert({
                    title: 'Success',
                    description: 'Biometric login enabled successfully',
                    type: 'success'
                });
            } else {
                showAlert({
                    title: 'Authentication Failed',
                    description: 'Biometric authentication failed. Please try again.',
                    type: 'error'
                });
            }
        } catch (error: any) {
            showAlert({
                title: 'Error',
                description: 'Incorrect password or network error',
                type: 'error'
            });
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Security & Login</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

                <Text style={[styles.sectionTitle, { color: colors.subtext }]}>Login</Text>
                <TouchableOpacity
                    style={[styles.actionRow, { backgroundColor: colors.card }]}
                    onPress={() => router.push('/settings/change_password')}
                >
                    <Text style={[styles.actionLabel, { color: colors.text }]}>Change Password</Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
                </TouchableOpacity>

                {isBiometricSupported && (
                    <View style={[styles.actionRow, { backgroundColor: colors.card, marginTop: 12 }]}>
                        <View>
                            <Text style={[styles.actionLabel, { color: colors.text }]}>Biometric Login</Text>
                            <Text style={[styles.actionSub, { color: colors.subtext }]}>Use FaceID/TouchID to log in</Text>
                        </View>
                        <Switch
                            value={isBiometricEnabled}
                            onValueChange={handleToggleBiometrics}
                            trackColor={{ false: colors.border, true: colors.primary }}
                        />
                    </View>
                )}



                <Text style={[styles.sectionTitle, { color: colors.subtext, marginTop: 32 }]}>Danger Zone</Text>
                <TouchableOpacity
                    style={[styles.actionRow, { backgroundColor: '#fee2e2' }]}
                    onPress={() => router.push('/settings/delete_account')}
                >
                    <Text style={[styles.actionLabel, { color: '#ef4444' }]}>Delete Account</Text>
                </TouchableOpacity>

            </ScrollView>

            <Modal
                visible={showPasswordModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowPasswordModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Confirm Password</Text>
                        <Text style={[styles.modalSub, { color: colors.subtext }]}>
                            Please enter your password to enable biometric login.
                        </Text>

                        <TextInput
                            style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                            placeholder="Password"
                            placeholderTextColor={colors.subtext}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoCapitalize="none"
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => { setShowPasswordModal(false); setPassword(''); }}
                            >
                                <Text style={[styles.btnText, { color: colors.subtext }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmBtn, { backgroundColor: colors.primary, opacity: isVerifying ? 0.7 : 1 }]}
                                onPress={confirmEnableBiometrics}
                                disabled={isVerifying || !password}
                            >
                                <Text style={[styles.btnText, { color: '#fff' }]}>
                                    {isVerifying ? 'Verifying...' : 'Confirm'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
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
    },
    content: {
        padding: 24,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
        marginBottom: 16,
        marginLeft: 4,
        textTransform: 'uppercase',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
    },
    actionLabel: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 15,
    },
    actionSub: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
        marginTop: 2,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        borderRadius: 20,
        padding: 24,
    },
    modalTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
        marginBottom: 8,
    },
    modalSub: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
        marginBottom: 20,
        lineHeight: 20,
    },
    input: {
        height: 50,
        borderRadius: 12,
        paddingHorizontal: 16,
        marginBottom: 20,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    cancelBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    confirmBtn: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 10,
    },
    btnText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
    }
});
