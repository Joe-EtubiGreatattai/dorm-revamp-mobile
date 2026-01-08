import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { authAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MonetizationScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { user, refreshUser } = useAuth();
    const [isToggling, setIsToggling] = React.useState(false);

    const followerCount = user?.followers?.length || 0;
    const threshold = 1000;
    const progress = Math.min(followerCount / threshold, 1);
    const isEligible = followerCount >= threshold;

    const handleToggleMonetization = async () => {
        if (isToggling) return;
        setIsToggling(true);
        try {
            await authAPI.toggleMonetization();
            await refreshUser();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to toggle monetization');
        } finally {
            setIsToggling(false);
        }
    };

    const stats = [
        { label: 'Followers', value: followerCount.toLocaleString(), target: threshold.toLocaleString(), icon: 'people-outline', color: '#3b82f6' },
        { label: 'Total Earnings', value: `₦${(user?.totalMonetizationEarnings || 0).toLocaleString()}`, icon: 'wallet-outline', color: '#10b981' },
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Monetization</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={[styles.card, { backgroundColor: colors.card }]}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconBox, { backgroundColor: isEligible ? '#dcfce7' : '#fef3c7' }]}>
                            <Ionicons
                                name={isEligible ? "checkmark-circle" : "time-outline"}
                                size={24}
                                color={isEligible ? "#166534" : "#92400e"}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.statusTitle, { color: colors.text }]}>
                                {isEligible ? 'Monetization Active' : 'Monetization Eligibility'}
                            </Text>
                            <Text style={[styles.statusSub, { color: colors.subtext }]}>
                                {isEligible ? 'You are earning from your content' : 'Reach 1,000 followers to start earning'}
                            </Text>
                        </View>
                        {isEligible && (
                            <Switch
                                value={user?.monetizationEnabled}
                                onValueChange={handleToggleMonetization}
                                trackColor={{ false: colors.border, true: colors.primary }}
                                thumbColor="#fff"
                                disabled={isToggling}
                            />
                        )}
                    </View>

                    <View style={styles.progressContainer}>
                        <View style={styles.progressHeader}>
                            <Text style={[styles.progressLabel, { color: colors.text }]}>Follower Goal</Text>
                            <Text style={[styles.progressValue, { color: colors.primary }]}>{followerCount} / {threshold}</Text>
                        </View>
                        <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                            <View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: colors.primary }]} />
                        </View>
                    </View>
                </View>

                <View style={styles.statsGrid}>
                    {stats.map((stat, index) => (
                        <View key={index} style={[styles.statCard, { backgroundColor: colors.card }]}>
                            <View style={[styles.statIconBox, { backgroundColor: stat.color + '15' }]}>
                                <Ionicons name={stat.icon as any} size={20} color={stat.color} />
                            </View>
                            <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
                            <Text style={[styles.statLabel, { color: colors.subtext }]}>{stat.label}</Text>
                        </View>
                    ))}
                </View>

                <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
                    <Text style={[styles.infoTitle, { color: colors.text }]}>How it works</Text>
                    <View style={styles.infoRow}>
                        <Ionicons name="heart" size={18} color="#ec4899" />
                        <Text style={[styles.infoText, { color: colors.text }]}>Earn <Text style={{ fontWeight: '700' }}>₦1</Text> for every 100 likes on your posts.</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Ionicons name="chatbubble" size={18} color="#3b82f6" />
                        <Text style={[styles.infoText, { color: colors.text }]}>Earn <Text style={{ fontWeight: '700' }}>₦1</Text> for every comment you receive.</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Ionicons name="wallet" size={18} color="#10b981" />
                        <Text style={[styles.infoText, { color: colors.text }]}>Earnings are paid directly to your wallet.</Text>
                    </View>
                </View>
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
        gap: 20,
    },
    card: {
        padding: 20,
        borderRadius: 24,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
    statusSub: {
        fontFamily: 'PlusJakartaSans_400Regular',
        fontSize: 13,
        marginTop: 2,
    },
    progressContainer: {
        gap: 12,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    progressLabel: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
    },
    progressValue: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
    progressBarBg: {
        height: 10,
        borderRadius: 5,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 5,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 16,
    },
    statCard: {
        flex: 1,
        padding: 16,
        borderRadius: 20,
        alignItems: 'center',
    },
    statIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    statValue: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
        marginBottom: 4,
    },
    statLabel: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
    },
    infoCard: {
        padding: 20,
        borderRadius: 24,
        gap: 16,
    },
    infoTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
        marginBottom: 4,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontFamily: 'PlusJakartaSans_400Regular',
        fontSize: 14,
        lineHeight: 20,
    },
});
