import CustomLoader from '@/components/CustomLoader';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { electionAPI } from '@/utils/apiClient';
import { getSocket } from '@/utils/socket';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ElectionResults() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [result, setResult] = React.useState<any>(null);
    const [detailedResults, setDetailedResults] = React.useState<any[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchResults = async () => {
            try {
                const { data } = await electionAPI.getResults(id as string);
                setResult(data);
                setDetailedResults(data.positions || []);
            } catch (error: any) {
                if (error.response?.status !== 404) {
                    console.log('Error fetching results:', error);
                }
            } finally {
                setIsLoading(false);
            }
        };
        fetchResults();

        // Listen for real-time updates
        const socket = getSocket();
        socket.on('election:updated', (data) => {
            const currentElectionId = result?._id || result?.id || id;
            if (data.electionId === currentElectionId) {
                // Update votesCast summary
                setResult((prev: any) => prev ? ({ ...prev, votesCast: data.votesCast, positions: data.positions }) : null);
                // Update detailed list
                setDetailedResults(data.positions || []);
            }
        });

        return () => {
            socket.off('election:updated');
        };
    }, [id, result?._id, result?.id]);

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <CustomLoader message="Loading results..." />
            </SafeAreaView>
        );
    }

    if (!result) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <View style={{ width: 44 }} />
                </View>
                <View style={[styles.emptyContainer, { padding: 40, alignItems: 'center', justifyContent: 'center', flex: 1 }]}>
                    <View style={[styles.emptyIconContainer, { backgroundColor: colors.card, padding: 24, borderRadius: 32, marginBottom: 20 }]}>
                        <Ionicons name="bar-chart-outline" size={64} color={colors.primary} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>No Results Yet</Text>
                    <Text style={[styles.emptySubtitle, { color: colors.subtext }]}>The election results have not been certified or found. Check back later!</Text>
                    <TouchableOpacity
                        style={[styles.goBackBtn, { backgroundColor: colors.primary }]}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.goBackBtnText}>Return to Voting Center</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Past Results</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                {/* Summary Card */}
                <View style={[styles.summaryCard, { backgroundColor: colors.card, borderLeftWidth: 4, borderLeftColor: colors.primary }]}>
                    <Text style={[styles.electionTitle, { color: colors.text }]}>{result.title}</Text>
                    <Text style={[styles.electionDate, { color: colors.subtext }]}>Concluded {new Date(result.endDate).toLocaleDateString()}</Text>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.text }]}>
                                {Math.round((result.votesCast / (result.totalEligible || 100)) * 100)}%
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.subtext }]}>Turnout</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.text }]}>{(result.votesCast || 0).toLocaleString()}</Text>
                            <Text style={[styles.statLabel, { color: colors.subtext }]}>Votes Cast</Text>
                        </View>
                        <View style={styles.statItem}>
                            <View style={[styles.statusBadge, { backgroundColor: colors.primary + '15' }]}>
                                <Text style={[styles.statusText, { color: colors.primary }]}>Certified</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Detailed Results */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Final Breakdown</Text>
                {detailedResults.map((pos: any, index: number) => {
                    const totalPosVotes = pos.candidates.reduce((sum: number, c: any) => sum + (c.votes || 0), 0);
                    return (
                        <View key={pos._id || index} style={[styles.positionSection, { backgroundColor: colors.card, padding: 20, borderRadius: 24, marginBottom: 16 }]}>
                            <View style={styles.posHeader}>
                                <Ionicons name="person-circle-outline" size={24} color={colors.primary} />
                                <Text style={[styles.positionTitle, { color: colors.text }]}>{pos.title}</Text>
                            </View>

                            {pos.candidates.map((cand: any, i: number) => {
                                const percent = totalPosVotes > 0 ? Math.round((cand.votes / totalPosVotes) * 100) : 0;
                                const isWinner = i === 0 && cand.votes > 0; // Assuming sorted by votes in backend
                                return (
                                    <View key={i} style={styles.resultRow}>
                                        <View style={styles.rowHeader}>
                                            <View style={styles.candInfo}>
                                                <Text style={[styles.candName, { color: colors.text }]}>{cand.user?.name || 'Unknown'}</Text>
                                                {isWinner && (
                                                    <View style={[styles.winnerBadge, { backgroundColor: '#4CAF50' }]}>
                                                        <Ionicons name="trophy" size={10} color="#fff" />
                                                        <Text style={styles.winnerLabel}>Elected</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={[styles.candVotes, { color: colors.text }]}>{cand.votes.toLocaleString()} votes</Text>
                                        </View>

                                        <View style={[styles.barBg, { backgroundColor: colors.border }]}>
                                            <View
                                                style={[
                                                    styles.barFill,
                                                    {
                                                        width: `${percent}%`,
                                                        backgroundColor: i === 0 ? colors.primary : colors.subtext
                                                    }
                                                ]}
                                            />
                                        </View>
                                        <Text style={[styles.percentText, { color: colors.subtext }]}>{percent}%</Text>
                                    </View>
                                );
                            })}
                        </View>
                    );
                })}
            </ScrollView>
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
        padding: 20,
        paddingBottom: 40,
    },
    summaryCard: {
        padding: 24,
        borderRadius: 24,
        marginBottom: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    electionTitle: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 22,
        marginBottom: 4,
    },
    electionDate: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
    },
    divider: {
        height: 1,
        width: '100%',
        marginVertical: 20,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 20,
        marginBottom: 4,
    },
    statLabel: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 12,
    },
    sectionTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
        marginBottom: 16,
    },
    positionSection: {
        marginBottom: 16,
    },
    posHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    positionTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
    resultRow: {
        marginBottom: 16,
    },
    rowHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    candInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    candName: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
    },
    winnerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    winnerLabel: {
        color: '#fff',
        fontSize: 10,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    candVotes: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
    barBg: {
        height: 10,
        borderRadius: 5,
        width: '100%',
        marginBottom: 4,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: 5,
    },
    percentText: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        textAlign: 'right',
    },
    emptyContainer: {
        flex: 1,
    },
    emptyIconContainer: {
        // defined in line
    },
    emptyTitle: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 24,
        marginBottom: 12,
    },
    emptySubtitle: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    goBackBtn: {
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 16,
    },
    goBackBtnText: {
        color: '#fff',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
});
