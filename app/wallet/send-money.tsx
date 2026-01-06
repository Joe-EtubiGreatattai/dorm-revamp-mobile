import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import { authAPI, walletAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as LocalAuthentication from 'expo-local-authentication';
import { Stack, useRouter } from 'expo-router';
import { debounce } from 'lodash';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function SendMoneyScreen() {
    const router = useRouter();
    const { user, refreshUser } = useAuth();
    const { showAlert } = useAlert();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [success, setSuccess] = useState(false);

    // Debounced Search
    const performSearch = async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const { data } = await authAPI.searchUsers(query);
            setSearchResults(data);
        } catch (error) {
            console.error('Search error', error);
        } finally {
            setIsSearching(false);
        }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedSearch = useCallback(debounce(performSearch, 500), []);

    useEffect(() => {
        debouncedSearch(searchQuery);
    }, [searchQuery, debouncedSearch]);

    const handleSelectUser = (recipient: any) => {
        setSelectedUser(recipient);
        setSearchQuery('');
        setSearchResults([]);
        Keyboard.dismiss();
    };

    const handleAmountChange = (text: string) => {
        // Remove non-numeric chars except decimal
        let cleaned = text.replace(/[^0-9.]/g, '');

        // Prevent multiple decimals
        const parts = cleaned.split('.');
        if (parts.length > 2) {
            cleaned = parts[0] + '.' + parts.slice(1).join('');
        }

        if (cleaned) {
            const integerPart = parts[0];
            const decimalPart = parts.length > 1 ? '.' + parts[1] : '';

            // Add commas to integer part
            const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            setAmount(formattedInteger + decimalPart);
        } else {
            setAmount('');
        }
    };

    const handleTransfer = async () => {
        // Strip commas for internal calculation/validation
        const rawAmount = amount.replace(/,/g, '');

        if (!rawAmount || isNaN(Number(rawAmount)) || Number(rawAmount) <= 0) {
            showAlert({ title: 'Invalid Amount', description: 'Please enter a valid amount.', type: 'error' });
            return;
        }

        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        if (hasHardware) {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Confirm Transfer',
            });
            if (!result.success) {
                showAlert({ title: 'Authentication Failed', description: 'Biometric verification failed.', type: 'error' });
                return;
            }
        }

        setIsProcessing(true);
        try {
            await walletAPI.transfer({
                recipientId: selectedUser._id,
                amount: Number(rawAmount),
                description: description || 'P2P Transfer'
            });

            await refreshUser();
            setSuccess(true);
            setTimeout(() => {
                setShowConfirmModal(false);
                router.back();
            }, 2000);
        } catch (error: any) {
            showAlert({
                title: 'Transfer Failed',
                description: error.response?.data?.message || 'Transaction could not be completed.',
                type: 'error'
            });
            setShowConfirmModal(false);
        } finally {
            setIsProcessing(false);
        }
    };

    const formatCurrency = (val: string | number) => {
        if (!val) return '₦0.00';
        const num = String(val).replace(/,/g, '');
        return `₦${Number(num).toLocaleString()}`;
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Send Money</Text>
                <View style={{ width: 44 }} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content}>

                    {!selectedUser ? (
                        <View>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Who are you sending to?</Text>
                            <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Ionicons name="search" size={20} color={colors.subtext} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="Name, Wallet ID, or Matric No"
                                    placeholderTextColor={colors.subtext}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    autoFocus
                                />
                                {isSearching && <ActivityIndicator size="small" color={colors.primary} />}
                            </View>

                            {searchResults.length > 0 && (
                                <View style={styles.resultsList}>
                                    {searchResults.map((item) => (
                                        <TouchableOpacity
                                            key={item._id}
                                            style={[styles.resultItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                                            onPress={() => handleSelectUser(item)}
                                        >
                                            <Image source={{ uri: item.avatar || 'https://ui-avatars.com/api/?name=' + item.name }} style={styles.avatar} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.userName, { color: colors.text }]}>{item.name}</Text>
                                                <Text style={[styles.userDetails, { color: colors.subtext }]}>{item.matricNo || item.walletId}</Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            {searchQuery.length > 2 && searchResults.length === 0 && !isSearching && (
                                <Text style={[styles.emptyText, { color: colors.subtext }]}>No users found.</Text>
                            )}
                        </View>
                    ) : (
                        <Animated.View entering={FadeInUp} style={styles.transferForm}>
                            <View style={[styles.recipientCard, { backgroundColor: colors.card }]}>
                                <TouchableOpacity
                                    onPress={() => router.push(selectedUser._id === user?._id ? '/profile' : `/user/${selectedUser._id}`)}
                                    activeOpacity={0.7}
                                    style={{ alignItems: 'center' }}
                                >
                                    <Image source={{ uri: selectedUser.avatar || 'https://ui-avatars.com/api/?name=' + selectedUser.name }} style={styles.bigAvatar} />
                                    <Text style={[styles.uName, { color: colors.text }]}>{selectedUser.name}</Text>
                                    <Text style={[styles.uId, { color: colors.subtext }]}>{selectedUser.matricNo || selectedUser.walletId}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setSelectedUser(null)} style={styles.changeBtn}>
                                    <Text style={[styles.changeText, { color: colors.primary }]}>Change Recipient</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.amountContainer}>
                                <Text style={[styles.currency, { color: colors.text }]}>₦</Text>
                                <TextInput
                                    style={[styles.amountInput, { color: colors.text }]}
                                    placeholder="0"
                                    placeholderTextColor={colors.subtext}
                                    keyboardType="numeric"
                                    value={amount}
                                    onChangeText={handleAmountChange}
                                />
                            </View>

                            <TextInput
                                style={[styles.noteInput, { backgroundColor: colors.card, color: colors.text }]}
                                placeholder="Add a note (optional)"
                                placeholderTextColor={colors.subtext}
                                value={description}
                                onChangeText={setDescription}
                            />

                            <TouchableOpacity
                                style={[styles.sendBtn, { backgroundColor: colors.primary, opacity: !amount ? 0.5 : 1 }]}
                                onPress={() => setShowConfirmModal(true)}
                                disabled={!amount}
                            >
                                <Text style={styles.sendBtnText}>Continue</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                </ScrollView>
            </KeyboardAvoidingView>

            <Modal visible={showConfirmModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <Animated.View entering={FadeInDown} style={[styles.modalContent, { backgroundColor: colors.background }]}>
                        {success ? (
                            <View style={styles.successView}>
                                <Ionicons name="checkmark-circle" size={80} color={colors.primary} />
                                <Text style={[styles.successTitle, { color: colors.text }]}>Transfer Successful!</Text>
                                <Text style={[styles.successSub, { color: colors.subtext }]}>You sent {formatCurrency(amount)} to {selectedUser?.name}</Text>
                            </View>
                        ) : (
                            <>
                                <Text style={[styles.modalTitle, { color: colors.text }]}>Confirm Transfer</Text>
                                <View style={[styles.confirmRow, { borderBottomColor: colors.border }]}>
                                    <Text style={[styles.confirmLabel, { color: colors.subtext }]}>To</Text>
                                    <Text style={[styles.confirmValue, { color: colors.text }]}>{selectedUser?.name}</Text>
                                </View>
                                <View style={[styles.confirmRow, { borderBottomColor: colors.border }]}>
                                    <Text style={[styles.confirmLabel, { color: colors.subtext }]}>Amount</Text>
                                    <Text style={[styles.confirmValue, { color: colors.text }]}>{formatCurrency(amount)}</Text>
                                </View>
                                <View style={[styles.confirmRow, { borderBottomColor: 'transparent' }]}>
                                    <Text style={[styles.confirmLabel, { color: colors.subtext }]}>Fee</Text>
                                    <Text style={[styles.confirmValue, { color: colors.text }]}>₦0.00</Text>
                                </View>

                                <View style={{ flexDirection: 'row', gap: 16, marginTop: 24 }}>
                                    <TouchableOpacity
                                        style={[styles.modalBtn, { backgroundColor: colors.card }]}
                                        onPress={() => setShowConfirmModal(false)}
                                        disabled={isProcessing}
                                    >
                                        <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.modalBtn, { backgroundColor: colors.primary, flex: 2 }]}
                                        onPress={handleTransfer}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <Text style={[styles.modalBtnText, { color: '#fff' }]}>Confirm & Send</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </Animated.View>
                </View>
            </Modal>
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
    sectionTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 20,
        marginBottom: 16,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 56,
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 16,
        gap: 12,
        marginBottom: 24,
    },
    input: {
        flex: 1,
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 16,
        height: '100%',
    },
    resultsList: {
        gap: 12,
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        gap: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#eee',
    },
    userName: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
    userDetails: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
    },
    emptyText: {
        textAlign: 'center',
        fontFamily: 'PlusJakartaSans_500Medium',
        marginTop: 40,
    },
    transferForm: {
        gap: 24,
    },
    recipientCard: {
        alignItems: 'center',
        padding: 24,
        borderRadius: 24,
        marginBottom: 20,
    },
    bigAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginBottom: 12,
        backgroundColor: '#eee',
    },
    uName: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 20,
        marginBottom: 4,
    },
    uId: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
        marginBottom: 16,
    },
    changeBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    changeText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
    },
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    currency: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 40,
        marginRight: 4,
    },
    amountInput: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 48,
        minWidth: 50,
        textAlign: 'center',
    },
    noteInput: {
        height: 56,
        borderRadius: 16,
        paddingHorizontal: 16,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    sendBtn: {
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
    },
    sendBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
        color: '#fff',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        padding: 24,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingBottom: 40,
    },
    modalTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 20,
        textAlign: 'center',
        marginBottom: 24,
    },
    confirmRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    confirmLabel: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 16,
    },
    confirmValue: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
    modalBtn: {
        flex: 1,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
    successView: {
        alignItems: 'center',
        paddingVertical: 40,
        gap: 16,
    },
    successTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 24,
    },
    successSub: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 16,
        textAlign: 'center',
    },
});
