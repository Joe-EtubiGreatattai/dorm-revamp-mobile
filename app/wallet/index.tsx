import TransactionDetailsModal from '@/components/TransactionDetailsModal';
import { useColorScheme } from '@/components/useColorScheme';
import WalletTransactionModal from '@/components/WalletTransactionModal';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { walletAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WalletScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { user, refreshUser } = useAuth();

    const [transactions, setTransactions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'topup' | 'withdraw'>('topup');
    const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

    const fetchWalletData = useCallback(async () => {
        try {
            const { data } = await walletAPI.getTransactions(1, 5); // Limit to 5
            setTransactions(data);
            await refreshUser();
        } catch (error) {
            console.error('Error fetching wallet data:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [refreshUser]);

    useEffect(() => {
        fetchWalletData();
    }, [fetchWalletData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchWalletData();
    };

    const handleAction = (type: 'send' | 'topup' | 'withdraw') => {
        if (type === 'send') {
            router.push('/wallet/send-money');
        } else {
            setModalType(type);
            setModalVisible(true);
        }
    };

    const getTransactionIcon = (type: string) => {
        switch (type) {
            case 'topup': return { name: 'add', color: '#10b981', bg: '#10b98120' };
            case 'withdrawal': return { name: 'arrow-down', color: '#ef4444', bg: '#ef444420' };
            case 'transfer_in': return { name: 'arrow-down-outline', color: '#3b82f6', bg: '#3b82f620' };
            case 'transfer_out': return { name: 'arrow-up-outline', color: '#f59e0b', bg: '#f59e0b20' };
            case 'rent_payment': return { name: 'home-outline', color: '#8b5cf6', bg: '#8b5cf620' };
            case 'rent_receive': return { name: 'home', color: '#10b981', bg: '#10b98120' };
            case 'tour_payment': return { name: 'eye-outline', color: '#6366f1', bg: '#6366f120' };
            case 'tour_receive': return { name: 'eye', color: '#10b981', bg: '#10b98120' };
            case 'escrow_hold': return { name: 'cart-outline', color: '#ec4899', bg: '#ec489920' };
            case 'escrow_release': return { name: 'checkmark-circle-outline', color: '#10b981', bg: '#10b98120' };
            case 'contestant_fee': return { name: 'trophy-outline', color: '#f97316', bg: '#f9731620' };
            default: return { name: 'wallet-outline', color: colors.subtext, bg: colors.card };
        }
    };

    const renderTransaction = ({ item }: { item: any }) => {
        const icon = getTransactionIcon(item.type);
        const isCredit = item.amount > 0;

        let title = item.description;
        if (item.relatedUserId?.name) {
            title = item.relatedUserId.name;
        } else {
            switch (item.type) {
                case 'topup': title = 'Top Up'; break;
                case 'withdrawal': title = 'Withdrawal'; break;
                case 'rent_payment': title = 'Rent Payment'; break;
                case 'rent_receive': title = 'Rent Received'; break;
                case 'tour_payment': title = 'Inspection Fee'; break;
                case 'tour_receive': title = 'Inspection Fee Received'; break;
                case 'escrow_hold': title = 'Market Purchase'; break;
                case 'escrow_release': title = 'Market Sale Revenue'; break;
                case 'contestant_fee': title = 'Contestant Fee'; break;
            }
        }

        return (
            <TouchableOpacity
                style={[styles.transactionItem, { borderBottomColor: colors.border }]}
                onPress={() => setSelectedTransaction(item)}
            >
                <View style={[styles.iconContainer, { backgroundColor: icon.bg }]}>
                    <Ionicons name={icon.name as any} size={20} color={icon.color} />
                </View>
                <View style={styles.txContent}>
                    <Text style={[styles.txTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
                    <Text style={[styles.txDate, { color: colors.subtext }]}>
                        {new Date(item.createdAt).toLocaleDateString()}, {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
                <Text style={[
                    styles.txAmount,
                    { color: isCredit ? '#10b981' : colors.text }
                ]}>
                    {isCredit ? '+' : ''}₦{Math.abs(item.amount).toLocaleString()}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header and Balance Card (unchanged) */}
            <Stack.Screen options={{ headerShown: false }} />
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>My Wallet</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.balanceContainer}>
                <View style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
                    <Text style={styles.balanceLabel}>Total Balance</Text>
                    <Text style={styles.balanceAmount}>₦{user?.walletBalance?.toLocaleString() || '0.00'}</Text>

                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction('send')}>
                            <View style={styles.actionIcon}>
                                <Ionicons name="send" size={20} color={colors.primary} />
                            </View>
                            <Text style={styles.actionText}>Send</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction('topup')}>
                            <View style={styles.actionIcon}>
                                <Ionicons name="add" size={24} color={colors.primary} />
                            </View>
                            <Text style={styles.actionText}>Top Up</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction('withdraw')}>
                            <View style={styles.actionIcon}>
                                <Ionicons name="arrow-down" size={24} color={colors.primary} />
                            </View>
                            <Text style={styles.actionText}>Withdraw</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <View style={styles.listContainer}>
                <View style={[styles.sectionHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
                    <TouchableOpacity onPress={() => router.push('/wallet/history')}>
                        <Text style={[styles.seeAllText, { color: colors.primary, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14 }]}>See All</Text>
                    </TouchableOpacity>
                </View>

                {isLoading ? (
                    <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
                ) : (
                    <FlatList
                        data={transactions}
                        keyExtractor={(item) => item._id}
                        renderItem={renderTransaction}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="wallet-outline" size={48} color={colors.subtext} />
                                <Text style={[styles.emptyText, { color: colors.subtext }]}>No transactions yet</Text>
                            </View>
                        }
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>

            <WalletTransactionModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                type={modalType}
                onSuccess={(amount) => {
                    fetchWalletData();
                }}
            />

            {/* Details Modal */}
            <TransactionDetailsModal
                visible={!!selectedTransaction}
                transaction={selectedTransaction}
                onClose={() => setSelectedTransaction(null)}
            />
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
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
    },
    balanceContainer: {
        padding: 20,
    },
    balanceCard: {
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    balanceLabel: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 8,
    },
    balanceAmount: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 36,
        color: '#fff',
        marginBottom: 24,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 20,
    },
    actionBtn: {
        alignItems: 'center',
        gap: 8,
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 12,
        color: '#fff',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    seeAllText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
    },
    listContainer: {
        flex: 1,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
        marginBottom: 16,
    },
    listContent: {
        paddingBottom: 20,
    },
    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    txContent: {
        flex: 1,
    },
    txTitle: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
        marginBottom: 4,
    },
    txDate: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
    },
    txAmount: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
        gap: 12,
    },
    emptyText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
    },
});
