import ActionSuccessModal from '@/components/ActionSuccessModal';
import CustomLoader from '@/components/CustomLoader';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { electionAPI } from '@/utils/apiClient';
import { getSocket } from '@/utils/socket';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    FlatList,
    Image,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ManageApplications() {
    const { id, title } = useLocalSearchParams();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [applications, setApplications] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal states
    const [selectedApp, setSelectedApp] = useState<any>(null);
    const [showManifesto, setShowManifesto] = useState(false);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const fetchApplications = async () => {
        try {
            const { data } = await electionAPI.getApplications(id as string);
            setApplications(data);
        } catch (error) {
            console.error('Error fetching applications:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchApplications();

        const socket = getSocket();
        const handleNewApplication = (data: any) => {
            if (data.electionId === id) {
                fetchApplications();
            }
        };

        socket.on('application:new', handleNewApplication);

        return () => {
            socket.off('application:new', handleNewApplication);
        };
    }, [id]);

    const handleApprove = async () => {
        if (!selectedApp) return;
        setIsProcessing(true);
        try {
            await electionAPI.approveApplication(selectedApp._id);
            setSuccessMessage(`${selectedApp.userId.name} has been approved as a candidate.`);
            setShowApproveModal(false);
            setShowSuccessModal(true);
            fetchApplications();
        } catch (error: any) {
            console.error('Approval error:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!selectedApp) return;
        setIsProcessing(true);
        try {
            await electionAPI.rejectApplication(selectedApp._id, rejectionReason);
            setSuccessMessage(`${selectedApp.userId.name}'s application has been rejected.`);
            setShowRejectModal(false);
            setShowSuccessModal(true);
            fetchApplications();
        } catch (error: any) {
            console.error('Rejection error:', error);
        } finally {
            setIsProcessing(false);
            setRejectionReason('');
        }
    };

    const renderApplicationItem = ({ item }: { item: any }) => (
        <View style={[styles.appCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.appHeader}>
                <Image
                    source={item.userId.avatar ? { uri: item.userId.avatar } : require('@/assets/images/icon.png')}
                    style={styles.avatar}
                />
                <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: colors.text }]}>{item.userId.name}</Text>
                    <Text style={[styles.userEmail, { color: colors.subtext }]}>{item.userId.email}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(item.status) }]}>{item.status.toUpperCase()}</Text>
                </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.appContent}>
                <View style={styles.contentRow}>
                    <Text style={[styles.contentLabel, { color: colors.subtext }]}>Fee Paid:</Text>
                    <Text style={[styles.feeText, { color: colors.text }]}>₦{item.feeAmount.toLocaleString()}</Text>
                </View>
                <View style={[styles.contentRow, { marginTop: 8 }]}>
                    <Text style={[styles.contentLabel, { color: colors.subtext }]}>Applied On:</Text>
                    <Text style={[styles.dateText, { color: colors.text }]}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
            </View>

            {item.status === 'pending' && (
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
                        onPress={() => {
                            setSelectedApp(item);
                            setShowManifesto(true);
                        }}
                    >
                        <Text style={[styles.actionBtnText, { color: colors.text }]}>View Manifesto</Text>
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                        <TouchableOpacity
                            style={[styles.rejectBtn, { borderColor: '#ef4444' }]}
                            onPress={() => {
                                setSelectedApp(item);
                                setShowRejectModal(true);
                            }}
                        >
                            <Text style={styles.rejectBtnText}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.approveBtn, { backgroundColor: colors.primary }]}
                            onPress={() => {
                                setSelectedApp(item);
                                setShowApproveModal(true);
                            }}
                        >
                            <Text style={styles.approveBtnText}>Approve</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {item.status !== 'pending' && (
                <TouchableOpacity
                    style={[styles.viewManifestoLink, { marginTop: 12 }]}
                    onPress={() => {
                        setSelectedApp(item);
                        setShowManifesto(true);
                    }}
                >
                    <Text style={[styles.viewManifestoText, { color: colors.primary }]}>View Manifesto</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                </TouchableOpacity>
            )}
        </View>
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return '#10b981';
            case 'rejected': return '#ef4444';
            default: return '#f59e0b';
        }
    };

    if (isLoading) {
        return (
            <>
                <Stack.Screen options={{ headerShown: false }} />
                <CustomLoader message="Loading applications..." />
            </>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Applications</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.subtext }]} numberOfLines={1}>{title}</Text>
                </View>
            </View>

            <FlatList
                data={applications}
                renderItem={renderApplicationItem}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContent}
                refreshing={refreshing}
                onRefresh={() => {
                    setRefreshing(true);
                    fetchApplications();
                }}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="documents-outline" size={64} color={colors.subtext} />
                        <Text style={[styles.emptyText, { color: colors.subtext }]}>No applications found for this election.</Text>
                    </View>
                }
            />

            {/* Manifesto Modal */}
            <Modal
                visible={showManifesto}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowManifesto(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Candidate Manifesto</Text>
                            <TouchableOpacity onPress={() => setShowManifesto(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <View style={[styles.manifestoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Text style={[styles.manifestoText, { color: colors.text }]}>
                                {selectedApp?.manifesto}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.closeModalBtn, { backgroundColor: colors.primary }]}
                            onPress={() => setShowManifesto(false)}
                        >
                            <Text style={styles.closeModalBtnText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Rejection Modal with Reason Input */}
            <Modal
                visible={showRejectModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowRejectModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.background, paddingBottom: 30 }]}>
                        <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 8 }]}>Reject Application</Text>
                        <Text style={[styles.modalDesc, { color: colors.subtext, marginBottom: 20 }]}>
                            Please provide a reason for rejecting {selectedApp?.userId.name}'s application. This will be shown to them.
                        </Text>
                        <TextInput
                            style={[styles.reasonInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                            placeholder="Enter reason (optional)..."
                            placeholderTextColor={colors.subtext + '80'}
                            multiline
                            value={rejectionReason}
                            onChangeText={setRejectionReason}
                        />
                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' }}>
                            <TouchableOpacity
                                style={[styles.modalSecondaryBtn, { borderColor: colors.border }]}
                                onPress={() => setShowRejectModal(false)}
                            >
                                <Text style={[styles.modalSecondaryBtnText, { color: colors.text }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalRejectBtn, { backgroundColor: '#ef4444' }]}
                                onPress={handleReject}
                                disabled={isProcessing}
                            >
                                <Text style={styles.modalRejectBtnText}>
                                    {isProcessing ? 'Processing...' : 'Reject Application'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Confirmation Modals (ActionSuccessModal) */}
            <ActionSuccessModal
                visible={showApproveModal}
                onClose={() => setShowApproveModal(false)}
                onConfirm={handleApprove}
                title="Approve Application"
                description={`Are you sure you want to approve ${selectedApp?.userId.name}? They will be officially added as a candidate and the contestant fee will be released to your wallet.`}
                buttonText="Approved Candidate"
                showCancel={true}
                isLoading={isProcessing}
                iconName="checkmark-circle"
            />

            <ActionSuccessModal
                visible={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                title="Success!"
                description={successMessage}
                buttonText="Continue"
                iconName="checkmark-done-circle"
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
        paddingHorizontal: 20,
        paddingVertical: 10,
        marginBottom: 10,
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
        fontSize: 20,
    },
    headerSubtitle: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_500Medium',
        marginTop: 2,
    },
    listContent: {
        padding: 20,
    },
    appCard: {
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 16,
    },
    appHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    userInfo: {
        flex: 1,
        marginLeft: 12,
    },
    userName: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
    userEmail: {
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusBadgeText: {
        fontSize: 10,
        fontFamily: 'PlusJakartaSans_800ExtraBold',
    },
    divider: {
        height: 1,
        marginVertical: 16,
    },
    appContent: {
        marginBottom: 8,
    },
    contentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    contentLabel: {
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    feeText: {
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    dateText: {
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    actions: {
        marginTop: 16,
    },
    actionBtn: {
        width: '100%',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    actionBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
    approveBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    approveBtnText: {
        color: '#fff',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
    rejectBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
    },
    rejectBtnText: {
        color: '#ef4444',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
    viewManifestoLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    viewManifestoText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        gap: 16,
    },
    emptyText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 15,
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        borderRadius: 24,
        padding: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 20,
    },
    modalDesc: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
        lineHeight: 22,
    },
    manifestoBox: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 24,
        maxHeight: 300,
    },
    manifestoText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 15,
        lineHeight: 24,
    },
    closeModalBtn: {
        paddingVertical: 14,
        borderRadius: 30,
        alignItems: 'center',
    },
    closeModalBtnText: {
        color: '#fff',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
    reasonInput: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        minHeight: 120,
        textAlignVertical: 'top',
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    modalSecondaryBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 30,
        alignItems: 'center',
        borderWidth: 1,
    },
    modalSecondaryBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 15,
    },
    modalRejectBtn: {
        flex: 2,
        paddingVertical: 14,
        borderRadius: 30,
        alignItems: 'center',
    },
    modalRejectBtnText: {
        color: '#fff',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 15,
    },
});
