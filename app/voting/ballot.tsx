import ActionSuccessModal from '@/components/ActionSuccessModal';
import CustomLoader from '@/components/CustomLoader';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { electionAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as LocalAuthentication from 'expo-local-authentication';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BallotScreen() {
    const { candidateId, positionId, electionId } = useLocalSearchParams();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [isVerifying, setIsVerifying] = useState(false);
    const [isSuccessVisible, setSuccessVisible] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const [candidate, setCandidate] = React.useState<any>(null);
    const [position, setPosition] = React.useState<any>(null);
    const [election, setElection] = React.useState<any>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [errorModalVisible, setErrorModalVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                // Try to fetch candidate which might populate others, or fetch individually
                const { data: candData } = await electionAPI.getCandidate(candidateId as string);
                setCandidate(candData);

                // If the backend is nice, it populates these. If not, we might need more calls.
                // Assuming they are populated for now, or falling back to separate calls if IDs exist.
                if (candData.position) setPosition(candData.position);
                else if (positionId) {
                    const { data: posData } = await electionAPI.getPosition(positionId as string);
                    setPosition(posData);
                }

                if (candData.election) setElection(candData.election);
                else if (electionId) {
                    const { data: elecData } = await electionAPI.getElection(electionId as string);
                    setElection(elecData);
                }

            } catch (error) {
                console.log('Error fetching ballot data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [candidateId, positionId, electionId]);

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <CustomLoader message="Preparing ballot..." />
            </SafeAreaView>
        );
    }

    if (!candidate) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <Text style={{ textAlign: 'center', marginTop: 50, color: colors.text }}>Invalid Ballot Data</Text>
            </SafeAreaView>
        );
    }

    // Safely handle missing objects
    const safeElection = election || { title: 'Unknown Election' };
    const safePosition = position || { title: 'Unknown Position' };

    const handleCastVote = () => {
        setShowConfirmModal(true);
    };

    const confirmCastVote = async () => {
        setShowConfirmModal(false);
        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();

            if (hasHardware && isEnrolled) {
                const result = await LocalAuthentication.authenticateAsync({
                    promptMessage: 'Confirm your vote with biometrics',
                    fallbackLabel: 'Use Passcode',
                });

                if (!result.success) {
                    return; // Fail silently or handle error
                }
            }

            // Proceed if authenticated or no hardware (fallback)
            setIsVerifying(true);

            // Perform actual vote API call
            await electionAPI.castVote(
                safeElection._id || safeElection.id || electionId as string,
                safePosition._id || safePosition.id || positionId as string,
                candidate._id || candidate.id || candidateId as string
            );

            setSuccessVisible(true);
            setIsVerifying(false);
        } catch (e: any) {
            console.error('Vote storage error:', e);
            const errorMsg = e.response?.data?.message || 'Failed to cast vote. Please try again.';
            setErrorMessage(errorMsg);
            setErrorModalVisible(true);
            setIsVerifying(false);
        }
    };

    const handleSuccessClose = () => {
        setSuccessVisible(false);
        router.dismissAll(); // Go back to start
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ title: 'Cast Ballot', headerBackTitle: 'Cancel', headerTransparent: false }} />

            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>Confirm Your Vote</Text>
                    <Text style={[styles.subtitle, { color: colors.subtext }]}>Review your selection before finalizing.</Text>
                </View>

                {/* Ticket/Ballot Card */}
                <View style={[styles.ticket, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.ticketHeader, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.electionName, { color: colors.subtext }]}>{safeElection.title}</Text>
                        <Text style={[styles.positionName, { color: colors.text }]}>{safePosition.title}</Text>
                    </View>

                    <View style={styles.candidateSection}>
                        <Image source={{ uri: candidate.image || candidate.avatar }} style={styles.avatar} />
                        <Text style={[styles.candidateName, { color: colors.text }]}>{candidate.name}</Text>
                        <Text style={[styles.partyName, { color: colors.primary }]}>{candidate.party}</Text>
                    </View>

                    <View style={[styles.ticketFooter, { backgroundColor: colors.background }]}>
                        <Ionicons name="finger-print" size={24} color={colors.subtext} />
                        <Text style={[styles.verifyText, { color: colors.subtext }]}>Verified Ballot</Text>
                    </View>
                </View>

                <View style={styles.warningBox}>
                    <Ionicons name="information-circle" size={20} color={colors.text} />
                    <Text style={[styles.warningText, { color: colors.text }]}>
                        Votes are final and cannot be changed once submitted.
                    </Text>
                </View>
            </View>

            {/* Bottom Button */}
            <View style={[styles.footer, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                    style={[styles.castBtn, { backgroundColor: isVerifying ? colors.subtext : colors.primary }]}
                    onPress={handleCastVote}
                    disabled={isVerifying}
                >
                    {isVerifying ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-done" size={24} color="#fff" />
                            <Text style={styles.castBtnText}>Cast Vote Securely</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            <ActionSuccessModal
                visible={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={confirmCastVote}
                title="Finalize Ballot"
                description={`Are you sure you want to cast your vote for ${candidate.name}?`}
                buttonText="Confirm & Cast"
                showCancel={true}
                iconName="lock-closed"
            />

            <ActionSuccessModal
                visible={isSuccessVisible}
                onClose={handleSuccessClose}
                title="Vote Cast Successfully"
                description={`You have successfully voted for ${candidate.name} as ${safePosition.title}.`}
                buttonText="Return to Home"
                iconName="lock-closed"
            />

            <ActionSuccessModal
                visible={errorModalVisible}
                onClose={() => setErrorModalVisible(false)}
                onConfirm={() => {
                    setErrorModalVisible(false);
                    router.dismissAll(); // Often best to return if they've already voted
                }}
                title="Voting Error"
                description={errorMessage}
                buttonText="Back to Elections"
                showCancel={true}
                iconName="alert-circle"
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 24,
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 24,
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
    },
    ticket: {
        width: '100%',
        borderRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
        marginBottom: 24,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    ticketHeader: {
        padding: 20,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderStyle: 'dashed',
    },
    electionName: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    positionName: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 20,
    },
    candidateSection: {
        padding: 32,
        alignItems: 'center',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 16,
    },
    candidateName: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 22,
        marginBottom: 4,
    },
    partyName: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 16,
    },
    ticketFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        gap: 8,
    },
    verifyText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
    },
    warningBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 20,
    },
    warningText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 13,
        flex: 1,
    },
    footer: {
        padding: 24,
        borderTopWidth: 1,
    },
    castBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        borderRadius: 30,
        gap: 12,
    },
    castBtnText: {
        color: '#fff',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
});
