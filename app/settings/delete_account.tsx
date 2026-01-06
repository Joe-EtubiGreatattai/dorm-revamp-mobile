import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import { authAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DeleteAccountScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { user, logout } = useAuth();
    const { showAlert } = useAlert();

    const [step, setStep] = useState(0); // 0: Warning, 1: Reason, 2: Final
    const [selectedReason, setSelectedReason] = useState('');
    const [deleteInput, setDeleteInput] = useState('');
    const [password, setPassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [timer, setTimer] = useState(5);

    // Initial Warning Timer
    useEffect(() => {
        if (step === 0 && timer > 0) {
            const interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [step, timer]);

    const reasons = [
        "I'm not using the app anymore",
        "I have privacy concerns",
        "The app crashes too often",
        "I have another account",
        "Other"
    ];

    const handleNext = () => {
        if (step === 0) setStep(1);
        else if (step === 1 && selectedReason) setStep(2);
    };

    const handleDelete = async () => {
        if (deleteInput !== 'DELETE') {
            showAlert({
                title: 'Confirmation Failed',
                description: "Please type 'DELETE' exactly as shown.",
                type: 'error'
            });
            return;
        }

        if (!password) {
            showAlert({
                title: 'Password Required',
                description: "Please enter your password.",
                type: 'error'
            });
            return;
        }

        setIsDeleting(true);

        try {
            // 1. Verify password first
            await authAPI.login({ email: user?.email, password });

            // 2. Delete account
            await authAPI.deleteAccount();

            // 3. Logout/Cleanup
            logout();

            showAlert({
                title: 'Account Deleted',
                description: 'Your account has been permanently deleted.',
                type: 'success'
            });

            router.replace('/(auth)/welcome'); // Or initial screen

        } catch (error: any) {
            showAlert({
                title: 'Delete Failed',
                description: error.response?.data?.message || 'Incorrect password or network error.',
                type: 'error'
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const renderStep0 = () => (
        <View>
            <View style={[styles.warningBox, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}>
                <Ionicons name="warning" size={32} color="#dc2626" />
                <Text style={styles.warningTitle}>Warning: This is permanent!</Text>
                <Text style={styles.warningText}>
                    Deleting your account is irreversible. All your data, including profile, posts, wallet balance, and history will be permanently erased.
                </Text>
            </View>

            <View style={styles.consequences}>
                <Text style={[styles.listTitle, { color: colors.text }]}>You will lose access to:</Text>
                <View style={styles.listItem}>
                    <Ionicons name="wallet-outline" size={20} color={colors.subtext} />
                    <Text style={[styles.listText, { color: colors.subtext }]}>Your Wallet Balance & History</Text>
                </View>
                <View style={styles.listItem}>
                    <Ionicons name="cart-outline" size={20} color={colors.subtext} />
                    <Text style={[styles.listText, { color: colors.subtext }]}>Active Orders & Products</Text>
                </View>
                <View style={styles.listItem}>
                    <Ionicons name="chatbubbles-outline" size={20} color={colors.subtext} />
                    <Text style={[styles.listText, { color: colors.subtext }]}>Chats & Messages</Text>
                </View>
            </View>
        </View>
    );

    const renderStep1 = () => (
        <View>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Why are you leaving?</Text>
            <Text style={[styles.stepSub, { color: colors.subtext }]}>We're sorry to see you go. Please tell us why.</Text>

            <View style={styles.reasons}>
                {reasons.map((r) => (
                    <TouchableOpacity
                        key={r}
                        style={[
                            styles.reasonRow,
                            {
                                backgroundColor: colors.card,
                                borderColor: selectedReason === r ? colors.primary : 'transparent',
                                borderWidth: 1
                            }
                        ]}
                        onPress={() => setSelectedReason(r)}
                    >
                        <Text style={[styles.reasonText, { color: colors.text }]}>{r}</Text>
                        {selectedReason === r && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderStep2 = () => (
        <View>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Final Confirmation</Text>
            <Text style={[styles.stepSub, { color: colors.subtext }]}>
                To verify your intent, please type <Text style={{ fontWeight: 'bold' }}>DELETE</Text> and enter your password.
            </Text>

            <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Type "DELETE"</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                    value={deleteInput}
                    onChangeText={setDeleteInput}
                    placeholder="DELETE"
                    placeholderTextColor={colors.subtext}
                    autoCapitalize="characters"
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Password</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    placeholderTextColor={colors.subtext}
                    secureTextEntry
                />
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Delete Account</Text>
                <View style={{ width: 44 }} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content}>
                    {step === 0 && renderStep0()}
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                </ScrollView>

                <View style={[styles.footer, { borderTopColor: colors.border }]}>
                    {step < 2 ? (
                        <TouchableOpacity
                            style={[
                                styles.nextBtn,
                                {
                                    backgroundColor: colors.primary,
                                    opacity: (step === 0 && timer > 0) || (step === 1 && !selectedReason) ? 0.5 : 1
                                }
                            ]}
                            onPress={handleNext}
                            disabled={(step === 0 && timer > 0) || (step === 1 && !selectedReason)}
                        >
                            <Text style={styles.btnText}>
                                {step === 0 && timer > 0 ? `Wait ${timer}s` : 'Continue'}
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[
                                styles.deleteBtn,
                                { opacity: (deleteInput !== 'DELETE' || !password || isDeleting) ? 0.5 : 1 }
                            ]}
                            onPress={handleDelete}
                            disabled={deleteInput !== 'DELETE' || !password || isDeleting}
                        >
                            {isDeleting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Delete Account Forever</Text>}
                        </TouchableOpacity>
                    )}
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
    warningBox: {
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        marginBottom: 32,
    },
    warningTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
        color: '#dc2626',
        marginTop: 12,
        marginBottom: 8,
    },
    warningText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
        color: '#7f1d1d',
        textAlign: 'center',
        lineHeight: 22,
    },
    consequences: {
        gap: 16,
    },
    listTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
        marginBottom: 8,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    listText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 15,
    },
    stepTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 20,
        marginBottom: 8,
    },
    stepSub: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 15,
        marginBottom: 24,
    },
    reasons: {
        gap: 12,
    },
    reasonRow: {
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    reasonText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 15,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        height: 52,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 16,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        backgroundColor: 'transparent',
    },
    nextBtn: {
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteBtn: {
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ef4444',
    },
    btnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
        color: '#fff',
    },
});
