import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
    visible: boolean;
    onClose: () => void;
    transaction: any;
}

const TransactionDetailsModal = ({ visible, onClose, transaction }: Props) => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    if (!transaction) return null;

    const isCredit = transaction.amount > 0;

    // Determine title
    let title = transaction.description;
    if (transaction.relatedUserId?.name) {
        title = transaction.relatedUserId.name;
    } else {
        switch (transaction.type) {
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

    const DetailItem = ({ label, value, isAmount = false }: { label: string, value: string, isAmount?: boolean }) => (
        <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.detailLabel, { color: colors.subtext }]}>{label}</Text>
            <Text style={[
                styles.detailValue,
                { color: colors.text },
                isAmount && { color: isCredit ? '#10b981' : colors.text }
            ]}>
                {value}
            </Text>
        </View>
    );

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                    <View style={styles.header}>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>Transaction Details</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.content}>
                        <View style={styles.amountContainer}>
                            <View style={[
                                styles.iconCircle,
                                { backgroundColor: isCredit ? '#10b98120' : '#ef444420' }
                            ]}>
                                <Ionicons
                                    name={isCredit ? "arrow-down" : "arrow-up"}
                                    size={32}
                                    color={isCredit ? "#10b981" : "#ef4444"}
                                />
                            </View>
                            <Text style={[styles.amount, { color: isCredit ? '#10b981' : '#ef4444' }]}>
                                {isCredit ? '+' : '-'}₦{Math.abs(transaction.amount).toLocaleString()}
                            </Text>
                            <Text style={[styles.status, {
                                color: transaction.status === 'completed' ? '#10b981' :
                                    transaction.status === 'pending' ? '#f59e0b' : '#ef4444',
                                backgroundColor: transaction.status === 'completed' ? '#10b98120' :
                                    transaction.status === 'pending' ? '#f59e0b20' : '#ef444420'
                            }]}>
                                {transaction.status.toUpperCase()}
                            </Text>
                        </View>

                        {transaction.relatedUserId && (
                            <View style={styles.userCard}>
                                <Image
                                    source={{ uri: transaction.relatedUserId.avatar || 'https://via.placeholder.com/100' }}
                                    style={styles.avatar}
                                />
                                <View>
                                    <Text style={[styles.userName, { color: colors.text }]}>{transaction.relatedUserId.name}</Text>
                                    <Text style={[styles.userRole, { color: colors.subtext }]}>
                                        {transaction.type === 'transfer_out' ? 'Recipient' : 'Sender'}
                                    </Text>
                                </View>
                            </View>
                        )}

                        <View style={styles.detailsList}>
                            <DetailItem label="Type" value={title} />
                            <DetailItem label="Date" value={new Date(transaction.createdAt).toLocaleDateString()} />
                            <DetailItem label="Time" value={new Date(transaction.createdAt).toLocaleTimeString()} />
                            <DetailItem label="Reference" value={transaction.reference || transaction._id.substring(0, 8).toUpperCase()} />
                            <DetailItem label="Description" value={transaction.description || '-'} />
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        minHeight: '70%',
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    headerTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
    },
    closeBtn: {
        padding: 4,
    },
    content: {
        padding: 24,
    },
    amountContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    amount: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 32,
        marginBottom: 8,
    },
    status: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        overflow: 'hidden',
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.03)',
        marginBottom: 32,
        gap: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    userName: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
    userRole: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
    },
    detailsList: {
        gap: 0,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    detailLabel: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
    },
    detailValue: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
        flex: 1,
        textAlign: 'right',
        marginLeft: 20,
    },
});

export default TransactionDetailsModal;
