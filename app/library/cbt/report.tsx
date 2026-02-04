import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CBTReportScreen() {
    const { report: reportString } = useLocalSearchParams();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'] || Colors.light;
    const [report, setReport] = useState<any>(null);

    useEffect(() => {
        if (reportString) {
            try {
                const parsed = JSON.parse(reportString as string);
                setReport(parsed);
            } catch (error) {
                console.error('Failed to parse report:', error);
            }
        }
    }, [reportString]);

    if (!report) return null;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Performance Analysis</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Overall Analysis Card */}
                <LinearGradient
                    colors={[colors.primary, colors.primary + 'CC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.analysisCard}
                >
                    <View style={styles.cardHeader}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="analytics" size={24} color="#fff" />
                        </View>
                        <Text style={styles.cardTitle}>Overall Analysis</Text>
                    </View>
                    <Text style={styles.analysisText}>
                        {report.overallAnalysis}
                    </Text>
                </LinearGradient>

                {/* Strengths */}
                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="trending-up" size={20} color="#22c55e" />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Strengths</Text>
                    </View>
                    <View style={styles.list}>
                        {report.strengths.map((item: string, index: number) => (
                            <View key={index} style={styles.listItem}>
                                <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                                <Text style={[styles.listText, { color: colors.text }]}>{item}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Weaknesses */}
                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="trending-down" size={20} color="#ef4444" />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Areas to Improve</Text>
                    </View>
                    <View style={styles.list}>
                        {report.weaknesses.map((item: string, index: number) => (
                            <View key={index} style={styles.listItem}>
                                <Ionicons name="alert-circle" size={18} color="#ef4444" />
                                <Text style={[styles.listText, { color: colors.text }]}>{item}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Tips */}
                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="bulb" size={20} color="#eab308" />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Actionable Tips</Text>
                    </View>
                    <View style={styles.list}>
                        {report.tips.map((item: string, index: number) => (
                            <View key={index} style={styles.listItem}>
                                <Ionicons name="information-circle" size={18} color="#eab308" />
                                <Text style={[styles.listText, { color: colors.text }]}>{item}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                    onPress={() => router.dismissAll()}
                >
                    <Text style={styles.primaryBtnText}>Back to Library</Text>
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
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        gap: 16,
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 20,
    },
    content: {
        padding: 20,
        gap: 20,
        paddingBottom: 40,
    },
    analysisCard: {
        padding: 24,
        borderRadius: 24,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
        color: '#fff',
    },
    analysisText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 15,
        color: '#fff',
        lineHeight: 24,
    },
    section: {
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    sectionTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
    list: {
        gap: 12,
    },
    listItem: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-start',
    },
    listText: {
        flex: 1,
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
        lineHeight: 20,
    },
    primaryBtn: {
        marginTop: 20,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryBtnText: {
        color: '#fff',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
});
