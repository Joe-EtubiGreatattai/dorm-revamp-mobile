import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { libraryAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SummaryPage() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [material, setMaterial] = useState<any>(null);
    const [bulletPoints, setBulletPoints] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const { data } = await libraryAPI.getSummary(id as string);
                setMaterial(data.material);
                setBulletPoints(data.summaryPoints || []);
            } catch (err) {
                console.log('Error fetching summary:', err);
                setError('Failed to load summary');
            } finally {
                setIsLoading(false);
            }
        };

        if (id) {
            fetchSummary();
        }
    }, [id]);

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    if (error || !material) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: colors.text, textAlign: 'center', marginTop: 20 }}>
                        {error || 'Material not found'}
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Stack.Screen options={{
                title: 'AI Study Summary',
                headerTitleStyle: { fontFamily: 'PlusJakartaSans_700Bold' },
                headerTitleAlign: 'center',
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                ),
            }} />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.headerSection}>
                    <View style={[styles.aiBadge, { backgroundColor: colors.primary + '15' }]}>
                        <Ionicons name="sparkles" size={16} color={colors.primary} />
                        <Text style={[styles.aiBadgeText, { color: colors.primary }]}>AI Generated</Text>
                    </View>
                    <Text style={[styles.title, { color: colors.text }]}>{material.title}</Text>
                    <Text style={[styles.subtitle, { color: colors.subtext }]}>Course: {material.courseCode}</Text>
                </View>

                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.introText, { color: colors.text }]}>
                        This summary condenses the full lecture notes into key takeaways designed for quick revision and conceptual understanding.
                    </Text>

                    <View style={styles.bulletList}>
                        {bulletPoints.length > 0 ? (
                            bulletPoints.map((point, index) => (
                                <View key={index} style={styles.bulletRow}>
                                    <View style={[styles.bulletPoint, { backgroundColor: colors.primary }]} />
                                    <Text style={[styles.bulletText, { color: colors.text }]}>{point}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={{ color: colors.subtext, textAlign: 'center' }}>No summary points available.</Text>
                        )}
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.actionCard, { backgroundColor: colors.primary }]}
                    onPress={() => router.push(`/library/cbt/${id}`)}
                >
                    <View>
                        <Text style={styles.actionTitle}>Ready to Test?</Text>
                        <Text style={styles.actionSubtitle}>Take a quick CBT based on this summary.</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#fff" />
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 16,
    },
    backBtn: {
        marginLeft: 0, // Adjusted as it's inside headerLeft or custom header func
    },
    scrollContent: {
        padding: 20,
    },
    headerSection: {
        marginBottom: 24,
    },
    aiBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
        marginBottom: 12,
    },
    aiBadgeText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 12,
        textTransform: 'uppercase',
    },
    title: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 26,
        lineHeight: 32,
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 16,
    },
    card: {
        padding: 24,
        borderRadius: 24,
        borderWidth: 1,
        marginBottom: 24,
    },
    introText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 24,
        fontStyle: 'italic',
        opacity: 0.8,
    },
    bulletList: {
        gap: 20,
    },
    bulletRow: {
        flexDirection: 'row',
        gap: 16,
    },
    bulletPoint: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginTop: 8,
    },
    bulletText: {
        flex: 1,
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 15,
        lineHeight: 22,
    },
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 24,
        borderRadius: 24,
        marginBottom: 20,
    },
    actionTitle: {
        color: '#fff',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
        marginBottom: 4,
    },
    actionSubtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
    },
});
