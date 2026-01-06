import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { authAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChangePasswordScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { showAlert } = useAlert();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Visibility toggles
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            showAlert({
                title: 'Missing Fields',
                description: 'Please fill in all fields.',
                type: 'error'
            });
            return;
        }

        if (newPassword !== confirmPassword) {
            showAlert({
                title: 'Password Mismatch',
                description: 'New passwords do not match.',
                type: 'error'
            });
            return;
        }

        if (newPassword.length < 6) {
            showAlert({
                title: 'Weak Password',
                description: 'Password must be at least 6 characters long.',
                type: 'error'
            });
            return;
        }

        setIsLoading(true);
        try {
            await authAPI.changePassword({ currentPassword, newPassword });

            // Sync Biometric Password if enabled
            try {
                const bioEnabled = await SecureStore.getItemAsync('biometric_enabled');
                if (bioEnabled === 'true') {
                    await SecureStore.setItemAsync('biometric_password', newPassword);
                }
            } catch (error) {
                console.error('Failed to sync biometric password', error);
            }

            showAlert({
                title: 'Success',
                description: 'Password changed successfully',
                type: 'success'
            });
            router.back();
        } catch (error: any) {
            showAlert({
                title: 'Failed',
                description: error.response?.data?.message || 'Could not change password',
                type: 'error'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Change Password</Text>
                <View style={{ width: 44 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <Text style={[styles.description, { color: colors.subtext }]}>
                        Your new password must be different from previous used passwords.
                    </Text>

                    <View style={styles.form}>
                        {/* Current Password */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.text }]}>Current Password</Text>
                            <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Ionicons name="lock-closed-outline" size={20} color={colors.subtext} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    value={currentPassword}
                                    onChangeText={setCurrentPassword}
                                    placeholder="Enter current password"
                                    placeholderTextColor={colors.subtext}
                                    secureTextEntry={!showCurrent}
                                />
                                <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
                                    <Ionicons name={showCurrent ? "eye-off-outline" : "eye-outline"} size={20} color={colors.subtext} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* New Password */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.text }]}>New Password</Text>
                            <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Ionicons name="key-outline" size={20} color={colors.subtext} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    placeholder="Enter new password"
                                    placeholderTextColor={colors.subtext}
                                    secureTextEntry={!showNew}
                                />
                                <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                                    <Ionicons name={showNew ? "eye-off-outline" : "eye-outline"} size={20} color={colors.subtext} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Confirm Password */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.text }]}>Confirm New Password</Text>
                            <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Ionicons name="checkmark-circle-outline" size={20} color={colors.subtext} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    placeholder="Re-enter new password"
                                    placeholderTextColor={colors.subtext}
                                    secureTextEntry={!showConfirm}
                                />
                                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                                    <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={20} color={colors.subtext} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: isLoading ? 0.7 : 1 }]}
                        onPress={handleChangePassword}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.saveBtnText}>Update Password</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
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
        fontSize: 18,
    },
    content: {
        padding: 24,
    },
    description: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
        marginBottom: 32,
        lineHeight: 22,
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
    inputContainer: {
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
        height: '100%',
    },
    saveBtn: {
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    saveBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
        color: '#fff',
    },
});
