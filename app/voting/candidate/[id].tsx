import CustomLoader from '@/components/CustomLoader';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { electionAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function CandidateProfile() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [candidate, setCandidate] = React.useState<any>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchCandidate = async () => {
            try {
                const { data } = await electionAPI.getCandidate(id as string);
                setCandidate(data);
            } catch (error) {
                console.log('Error fetching candidate:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchCandidate();
    }, [id]);

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <CustomLoader message="Loading candidate..." />
            </SafeAreaView>
        );
    }

    if (!candidate) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <Text style={{ color: colors.text, textAlign: 'center', marginTop: 20 }}>Candidate not found</Text>
            </SafeAreaView>
        );
    }

    // Fallback if derived fields are missing
    const position = candidate.position || { title: 'Unknown Position', _id: 'unknown' };
    const election = candidate.election || { title: 'Unknown Election', _id: 'unknown' };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                <View style={styles.imageContainer}>
                    <Image source={{ uri: candidate.image || candidate.avatar }} style={styles.profileImage} contentFit="cover" />
                    <View style={styles.overlay}>
                        <TouchableOpacity
                            style={[styles.backBtn, { backgroundColor: 'rgba(0,0,0,0.3)' }]}
                            onPress={() => router.back()}
                        >
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={[styles.content, { backgroundColor: colors.background }]}>
                    <View style={styles.headerInfo}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.name, { color: colors.text }]}>{candidate.name}</Text>
                            <Text style={[styles.nickname, { color: colors.primary }]}>"{candidate.nickname || 'Candidate'}"</Text>
                            <Text style={[styles.position, { color: colors.subtext }]}>Running for {position.title}</Text>
                        </View>
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Manifesto</Text>
                    <Text style={[styles.manifestoText, { color: colors.subtext }]}>{candidate.manifesto}</Text>

                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    imageContainer: {
        width: width,
        height: width * 0.9,
    },
    profileImage: {
        width: '100%',
        height: '100%',
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: 50,
        paddingHorizontal: 20,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        padding: 24,
        marginTop: -30,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
    },
    headerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    name: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 24,
        marginBottom: 4,
    },
    nickname: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 16,
        fontStyle: 'italic',
        marginBottom: 4,
    },
    position: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
    divider: {
        height: 1,
        marginBottom: 24,
    },
    sectionTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
        marginBottom: 16,
    },
    manifestoText: {
        fontFamily: 'PlusJakartaSans_400Regular',
        fontSize: 16,
        lineHeight: 26,
        marginBottom: 24,
    },
});
