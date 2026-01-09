import ActionSuccessModal from '@/components/ActionSuccessModal';
import CountdownTimer from '@/components/CountdownTimer';
import CustomLoader from '@/components/CustomLoader';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { authAPI, electionAPI } from '@/utils/apiClient';
import { getSocket } from '@/utils/socket';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    ActivityIndicator,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ElectionDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [election, setElection] = React.useState<any>(null);
    const [user, setUser] = React.useState<any>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [showApplyModal, setShowApplyModal] = React.useState(false);
    const [selectedPosition, setSelectedPosition] = React.useState<any>(null);

    const fetchData = async () => {
        try {
            const [electionRes, userRes] = await Promise.all([
                electionAPI.getElection(id as string),
                authAPI.getMe()
            ]);
            setElection(electionRes.data);
            setUser(userRes.data);
        } catch (error) {
            console.log('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        fetchData();

        // Set up socket listener for real-time updates
        const socket = getSocket();
        const handleElectionUpdate = (data: any) => {
            if (data.electionId === id) {
                fetchData();
            }
        };

        socket.on('election:updated', handleElectionUpdate);
        socket.on('application:approved', handleElectionUpdate);
        socket.on('application:rejected', handleElectionUpdate);

        // Cleanup on unmount
        return () => {
            socket.off('election:updated', handleElectionUpdate);
            socket.off('application:approved', handleElectionUpdate);
            socket.off('application:rejected', handleElectionUpdate);
        };
    }, [id]);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'approved': return 'checkmark-circle';
            case 'rejected': return 'close-circle';
            default: return 'time-outline';
        }
    };

    const getStatusTextColor = (status: string) => {
        switch (status) {
            case 'approved': return '#10b981';
            case 'rejected': return '#ef4444';
            default: return '#f59e0b';
        }
    };

    const getStatusBorderColor = (status: string) => {
        return getStatusTextColor(status) + '40';
    };

    const getStatusMessage = (status: string) => {
        switch (status) {
            case 'approved': return 'Congratulations! Your application has been approved. You are now officially a candidate.';
            case 'rejected': return 'Your application was unfortunately not approved. Any fees paid have been refunded to your wallet.';
            default: return 'Your application has been received and is currently being reviewed by the election host.';
        }
    };

    if (isLoading) {
        return (
            <>
                <Stack.Screen options={{ headerShown: false }} />
                <CustomLoader message="Loading election..." />
            </>
        );
    }

    if (!election) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.errorCenter}>
                    <Text style={{ color: colors.text }}>Election not found</Text>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text style={{ color: colors.primary, marginTop: 10 }}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const renderPositionCard = (position: any) => (
        <TouchableOpacity
            style={[styles.positionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(`/voting/position/${position._id || position.id}`)}
        >
            <View style={styles.posHeader}>
                <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name="person-outline" size={24} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.posTitle, { color: colors.text }]}>{position.title}</Text>
                    <Text style={[styles.posSubtitle, { color: colors.subtext }]}>{position.candidates?.length || 0} Candidates Contesting</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={colors.subtext} />
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            {position.hasVoted ? (
                <View style={[styles.votedContainer, { backgroundColor: '#4CAF50' + '15' }]}>
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                    <Text style={[styles.votedText, { color: '#4CAF50' }]}>Voted</Text>
                </View>
            ) : (
                <Text style={[styles.actionText, { color: colors.primary }]}>Cast Vote</Text>
            )}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={[styles.statusBadge, { backgroundColor: '#10b981' }]}>
                    <Text style={styles.statusText}>{election.status}</Text>
                </View>
                <TouchableOpacity
                    style={[styles.backBtn, { backgroundColor: colors.card }]}
                    onPress={() => {
                        Share.share({
                            message: `Check out ${election.title} on Dorm! ${election.description}`,
                        });
                    }}
                >
                    <Ionicons name="share-outline" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.heroSection}>
                    <Text style={[styles.title, { color: colors.text }]}>{election.title}</Text>
                    <Text style={[styles.description, { color: colors.subtext }]}>{election.description}</Text>

                    <View style={[styles.timerCard, { backgroundColor: colors.card }]}>
                        <Text style={[styles.timerLabel, { color: colors.subtext }]}>Time Remaining</Text>
                        <CountdownTimer targetDate={election.endDate} mode="detailed" />
                    </View>
                </View>

                {/* Creator Management Section */}
                {user && (election?.createdBy?.toString() === user._id?.toString()) && (
                    <View style={styles.section}>
                        <TouchableOpacity
                            style={[styles.manageBtn, { backgroundColor: colors.primary }]}
                            onPress={() => router.push({
                                pathname: '/voting/manage-applications/[id]',
                                params: { id: election._id, title: election.title }
                            })}
                        >
                            <Ionicons name="settings-outline" size={20} color="#fff" />
                            <Text style={styles.manageBtnText}>Manage Applications</Text>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>New</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Application Status (for Applicants) */}
                {election.myApplication && (
                    <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: getStatusBorderColor(election.myApplication.status) }]}>
                        <View style={styles.statusCardHeader}>
                            <Ionicons
                                name={getStatusIcon(election.myApplication.status)}
                                size={24}
                                color={getStatusTextColor(election.myApplication.status)}
                            />
                            <Text style={[styles.statusCardTitle, { color: getStatusTextColor(election.myApplication.status) }]}>
                                Application {election.myApplication.status.charAt(0).toUpperCase() + election.myApplication.status.slice(1)}
                            </Text>
                        </View>
                        <Text style={[styles.statusCardDesc, { color: colors.text }]}>
                            {getStatusMessage(election.myApplication.status)}
                        </Text>
                        {election.myApplication.status === 'pending' && (
                            <View style={styles.pendingIndicator}>
                                <ActivityIndicator size="small" color={colors.primary} />
                                <Text style={[styles.pendingText, { color: colors.subtext }]}>Waiting for host approval...</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Stats */}
                <View style={styles.statsRow}>
                    <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.statValue, { color: colors.text }]}>
                            {(election.votesCast || 0).toLocaleString()}
                        </Text>
                        <Text style={[styles.statLabel, { color: colors.subtext }]}>Votes Cast</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.statValue, { color: colors.text }]}>
                            {(election.totalVoters || 0).toLocaleString()}
                        </Text>
                        <Text style={[styles.statLabel, { color: colors.subtext }]}>Registered</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.statValue, { color: colors.text }]}>
                            {Math.round(((election.votesCast || 0) / (election.totalVoters || 1)) * 100)}%
                        </Text>
                        <Text style={[styles.statLabel, { color: colors.subtext }]}>Turnout</Text>
                    </View>
                </View>

                {/* Apply to Contest Section */}
                {election.contestantFee > 0 && election.status === 'upcoming' && !election.myApplication && (
                    <View style={[styles.applySection, { backgroundColor: colors.card, borderColor: colors.primary }]}>
                        <View style={styles.applySectionHeader}>
                            <Ionicons name="ribbon-outline" size={28} color={colors.primary} />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={[styles.applyTitle, { color: colors.text }]}>Run for a Position</Text>
                                <Text style={[styles.applyFee, { color: colors.primary }]}>
                                    Contestant Fee: ₦{election.contestantFee.toLocaleString()}
                                </Text>
                            </View>
                        </View>
                        <Text style={[styles.applyDesc, { color: colors.subtext }]}>
                            Select a position below to submit your candidacy application.
                        </Text>
                        <View style={styles.positionButtons}>
                            {election.positions?.map((pos: any) => (
                                <TouchableOpacity
                                    key={pos._id || pos.id}
                                    style={[styles.positionApplyBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
                                    onPress={() => {
                                        setSelectedPosition(pos);
                                        setShowApplyModal(true);
                                    }}
                                >
                                    <Text style={[styles.positionApplyText, { color: colors.primary }]}>{pos.title}</Text>
                                    <Ionicons name="arrow-forward" size={16} color={colors.primary} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {/* Apply Confirmation Modal */}
                <ActionSuccessModal
                    visible={showApplyModal}
                    onClose={() => {
                        setShowApplyModal(false);
                        setSelectedPosition(null);
                    }}
                    onConfirm={() => {
                        setShowApplyModal(false);
                        if (selectedPosition) {
                            router.push({
                                pathname: '/voting/apply/[id]',
                                params: {
                                    id: selectedPosition._id || selectedPosition.id,
                                    electionId: election._id,
                                    positionId: selectedPosition._id || selectedPosition.id,
                                    positionTitle: selectedPosition.title,
                                    contestantFee: election.contestantFee
                                }
                            });
                        }
                    }}
                    title={`Apply for ${selectedPosition?.title || 'Position'}`}
                    description={`You will be charged ₦${election?.contestantFee?.toLocaleString() || 0} from your wallet to submit your application. Continue?`}
                    buttonText="Continue"
                    cancelText="Cancel"
                    showCancel={true}
                    iconName="ribbon-outline"
                />

                {/* Positions */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Positions</Text>
                    {election.positions?.map((pos: any) => (
                        <View key={pos._id || pos.id}>
                            {renderPositionCard(pos)}
                        </View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    errorCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusText: {
        color: '#fff',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 12,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    heroSection: {
        padding: 20,
        alignItems: 'center',
    },
    title: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 24,
        textAlign: 'center',
        marginBottom: 8,
    },
    description: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    timerCard: {
        width: '100%',
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
    },
    timerLabel: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 12,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 12,
        marginBottom: 32,
    },
    statBox: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
    },
    statValue: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 20,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    section: {
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
        marginBottom: 16,
    },
    positionCard: {
        padding: 16,
        borderWidth: 1,
        borderRadius: 20,
        marginBottom: 16,
    },
    posHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 16,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    posTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
        marginBottom: 4,
    },
    posSubtitle: {
        fontSize: 13,
    },
    divider: {
        height: 1,
        marginBottom: 16,
    },
    actionText: {
        textAlign: 'center',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
    applySection: {
        marginHorizontal: 20,
        marginBottom: 24,
        padding: 20,
        borderRadius: 20,
        borderWidth: 2,
    },
    applySectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    applyTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
    },
    applyFee: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 14,
        marginTop: 2,
    },
    applyDesc: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 13,
        marginBottom: 16,
        lineHeight: 20,
    },
    positionButtons: {
        gap: 10,
    },
    positionApplyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    positionApplyText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
    },
    manageBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        gap: 12,
        marginBottom: 24,
    },
    manageBtnText: {
        color: '#fff',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
        flex: 1,
    },
    badge: {
        backgroundColor: '#fff',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        color: '#000',
        fontSize: 10,
        fontFamily: 'PlusJakartaSans_800ExtraBold',
    },
    statusCard: {
        marginHorizontal: 20,
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 24,
    },
    statusCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    statusCardTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
    statusCardDesc: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
        lineHeight: 20,
    },
    pendingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 12,
    },
    pendingText: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    votedContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 12,
        gap: 6,
    },
    votedText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
});
