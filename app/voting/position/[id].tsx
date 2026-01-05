import CustomLoader from '@/components/CustomLoader';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { electionAPI } from '@/utils/apiClient';
import { getSocket } from '@/utils/socket';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function PositionDetail() {
    const { id, electionId } = useLocalSearchParams();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [position, setPosition] = React.useState<any>(null);
    const [election, setElection] = React.useState<any>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchPosition = async () => {
            try {
                const { data } = await electionAPI.getPosition(id as string);
                setPosition(data);
                if (data.election) setElection(data.election);
            } catch (error) {
                console.log('Error fetching position:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPosition();

        // Listen for real-time updates
        const socket = getSocket();
        socket.on('election:updated', (data) => {
            const currentElectionId = election?._id || election?.id || position?.election?._id || position?.electionId;
            if (data.electionId === currentElectionId) {
                // Find and update the specific position in the broadcasted data
                const updatedPos = data.positions.find((p: any) => (p._id || p.id) === id);
                if (updatedPos) {
                    setPosition((prev: any) => ({ ...prev, candidates: updatedPos.candidates }));
                }
            }
        });

        return () => {
            socket.off('election:updated');
        };
    }, [id, election?._id, election?.id, position?.election?._id, position?.electionId]);

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <CustomLoader message="Loading position..." />
            </SafeAreaView>
        );
    }

    if (!position) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <Text style={{ color: colors.text, textAlign: 'center', marginTop: 20 }}>Position not found</Text>
            </SafeAreaView>
        );
    }

    const renderCandidate = ({ item }: { item: any }) => (
        <View style={[styles.candidateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Image
                source={{ uri: item.user?.avatar || item.user?.image || item.avatar || item.image }}
                style={styles.candidateImage}
                contentFit="cover"
            />

            <View style={styles.content}>
                <View style={styles.infoRow}>
                    <View>
                        <Text style={[styles.name, { color: colors.text }]}>{item.user?.name || item.name}</Text>
                        <Text style={[styles.nickname, { color: colors.subtext }]}>"{item.nickname || 'Candidate'}"</Text>
                    </View>
                </View>

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.profileBtn, { borderColor: colors.border }]}
                        onPress={() => router.push(`/voting/candidate/${item._id || item.id}`)}
                    >
                        <Text style={[styles.profileBtnText, { color: colors.text }]}>View Profile</Text>
                    </TouchableOpacity>

                    {position.hasVoted ? (
                        <View style={[styles.votedBadge, { backgroundColor: '#4CAF50' }]}>
                            <Ionicons name="checkmark-circle" size={16} color="#fff" />
                            <Text style={styles.votedBadgeText}>Voted</Text>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={[styles.voteBtn, { backgroundColor: colors.primary }]}
                            onPress={() => router.push({
                                pathname: '/voting/ballot',
                                params: {
                                    candidateId: item._id || item.id,
                                    positionId: position._id || position.id,
                                    electionId: position.electionId || position.election?._id || position.election?.id
                                }
                            })}
                        >
                            <Text style={styles.voteBtnText}>Select</Text>
                        </TouchableOpacity>
                    )}
                </View>
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
                <View style={{ flex: 1, alignItems: 'center', marginRight: 44 }}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>{position.title}</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.subtext }]}>{position.election?.title}</Text>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            >
                <Text style={[styles.instruction, { color: colors.subtext }]}>
                    Select a candidate to proceed to the ballot summary.
                </Text>

                {position.candidates?.map((item: any) => (
                    <View key={item._id || item.id}>
                        {renderCandidate({ item })}
                    </View>
                ))}
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
        fontSize: 18,
    },
    headerSubtitle: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    listContent: {
        padding: 20,
        paddingTop: 0,
    },
    instruction: {
        textAlign: 'center',
        marginBottom: 20,
        fontSize: 14,
    },
    candidateCard: {
        borderRadius: 24,
        borderWidth: 1,
        marginBottom: 20,
        overflow: 'hidden',
    },
    candidateImage: {
        width: '100%',
        height: 200,
    },
    content: {
        padding: 20,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    name: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 20,
        marginBottom: 2,
    },
    nickname: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
        fontStyle: 'italic',
    },
    partyLogo: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    partyBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginBottom: 20,
    },
    partyText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 12,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    profileBtn: {
        flex: 1,
        paddingVertical: 14,
        borderWidth: 1,
        borderRadius: 30,
        alignItems: 'center',
    },
    profileBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
    voteBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    voteBtnText: {
        color: '#fff',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
    votedBadge: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 30,
        gap: 6,
    },
    votedBadgeText: {
        color: '#fff',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
});
