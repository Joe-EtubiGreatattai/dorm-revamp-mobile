import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { API_URL, apiClient } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function DeductFundsScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { showAlert } = useAlert();

    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [foundUser, setFoundUser] = useState<any>(null);
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [processing, setProcessing] = useState(false);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setSearching(true);
        setFoundUser(null);
        try {
            // We reuse the admin users list endpoint but filter/search
            // OR ideally create a dedicated search endpoint. 
            // For now, let's try to deduce identifying user from admin/users listing filtering which supports keyword
            const { data } = await apiClient.get(`/admin/users?keyword=${searchQuery}&limit=1`);

            if (data.users && data.users.length > 0) {
                // To be safe, ensure exact match if possible or just take first result and let admin confirm
                setFoundUser(data.users[0]);
            } else {
                showAlert('User Not Found', 'No user matched that email or name.', 'error');
            }
        } catch (error: any) {
            showAlert('Error', error.response?.data?.message || 'Failed to search user', 'error');
        } finally {
            setSearching(false);
        }
    };

    const handleDeduct = async () => {
        if (!foundUser || !amount || !reason) return;

        setProcessing(true);
        try {
            await apiClient.post('/admin/deduct-funds', {
                identifier: foundUser.email, // Passing email as identifier
                amount: Number(amount),
                reason
            });

            showAlert('Success', `Successfully deducted ₦${Number(amount).toLocaleString()} from ${foundUser.name}.`, 'success');

            // Reset
            setFoundUser(null);
            setAmount('');
            setReason('');
            setSearchQuery('');
        } catch (error: any) {
            showAlert('Failed', error.response?.data?.message || 'Deduction failed.', 'error');
        } finally {
            setProcessing(false);
        }
    };

    const getAvatarUri = (avatarPath?: string) => {
        if (!avatarPath) return null;
        if (avatarPath.startsWith('http')) return avatarPath;
        const normalizedPath = avatarPath.replace(/\\/g, '/');
        return `${API_URL.replace('/api', '')}/${normalizedPath}`;
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: 20 }}>

                <Text style={[styles.label, { color: colors.text }]}>Find User</Text>
                <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="search" size={20} color={colors.subtext} />
                    <TextInput
                        alignContent="center"
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Enter Email or Name"
                        placeholderTextColor={colors.subtext}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                    {searching ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                        <TouchableOpacity onPress={handleSearch} disabled={!searchQuery.trim()}>
                            <Text style={[styles.searchBtnText, { color: searchQuery.trim() ? colors.primary : colors.subtext }]}>Search</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {foundUser && (
                    <View style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.userInfo}>
                            <Image
                                source={{ uri: getAvatarUri(foundUser.avatar) }}
                                style={styles.avatar}
                                contentFit="cover"
                            />
                            <View>
                                <Text style={[styles.userName, { color: colors.text }]}>{foundUser.name}</Text>
                                <Text style={[styles.userEmail, { color: colors.subtext }]}>{foundUser.email}</Text>
                                <Text style={[styles.userBalance, { color: colors.primary }]}>
                                    Balance: ₦{foundUser.walletBalance?.toLocaleString() ?? '0'}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {foundUser && (
                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.text }]}>Amount to Deduct</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                                placeholder="0.00"
                                placeholderTextColor={colors.subtext}
                                keyboardType="numeric"
                                value={amount}
                                onChangeText={setAmount}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.text }]}>Reason for Deduction</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text, height: 100 }]}
                                placeholder="e.g. Correction of error, fine, etc."
                                placeholderTextColor={colors.subtext}
                                multiline
                                textAlignVertical="top"
                                value={reason}
                                onChangeText={setReason}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.deductBtn, { opacity: (processing || !amount || !reason) ? 0.6 : 1 }]}
                            onPress={handleDeduct}
                            disabled={processing || !amount || !reason}
                        >
                            {processing ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.deductBtnText}>Deduct Funds</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    label: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
        marginBottom: 8,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 24,
        gap: 12,
    },
    searchInput: {
        flex: 1,
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 16,
        height: '100%'
    },
    searchBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
    userCard: {
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 24,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#eee',
    },
    userName: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
    },
    userEmail: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
        marginBottom: 4,
    },
    userBalance: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 16,
    },
    form: {
        gap: 20,
    },
    inputGroup: {
        gap: 8,
    },
    input: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 16,
    },
    deductBtn: {
        backgroundColor: '#ef4444',
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 10,
    },
    deductBtnText: {
        color: '#fff',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
});
