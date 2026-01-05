import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Dimensions, Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

import CountdownTimer from '@/components/CountdownTimer';
import { electionAPI } from '@/utils/apiClient';
// ... imports

export default function VotingScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const router = useRouter();

    const [elections, setElections] = useState<any[]>([]);
    const [activeElections, setActiveElections] = useState<any[]>([]);
    const [upcomingElections, setUpcomingElections] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [news, setNews] = useState<any[]>([]);

    const fetchData = React.useCallback(async () => {
        try {
            const [electionsRes, newsRes] = await Promise.all([
                electionAPI.getElections(),
                electionAPI.getNews()
            ]);

            setElections(electionsRes.data);
            setActiveElections(electionsRes.data.filter((e: any) => e.status === 'active' || e.status === 'Open'));
            setUpcomingElections(electionsRes.data.filter((e: any) => e.status === 'upcoming'));
            setNews(newsRes.data);
        } catch (error) {
            console.log('Error fetching voting data:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, []);

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const renderActiveElection = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.electionCard, { backgroundColor: colors.card, borderColor: colors.primary }]}
            onPress={() => router.push(`/voting/election/${item._id || item.id}`)}
        >
            <View style={[styles.statusBadge, { backgroundColor: colors.primary }]}>
                <View style={styles.liveDot} />
                <Text style={styles.statusText}>Live Now</Text>
            </View>
            <Text style={[styles.electionTitle, { color: colors.text }]}>{item.title}</Text>
            <Text numberOfLines={2} style={[styles.electionDesc, { color: colors.subtext }]}>{item.description}</Text>

            <View style={styles.electionFooter}>
                <Text style={[styles.voterCount, { color: colors.text }]}>
                    {(item.votesCast || item.totalVotes || 0).toLocaleString()} votes cast
                </Text>
                <View style={[styles.timerBadge, { backgroundColor: colors.background }]}>
                    <CountdownTimer targetDate={item.endDate} mode="simple" />
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderNewsItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.newsCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(`/voting/news/${item._id || item.id}`)}
        >
            <Image source={{ uri: item.image }} style={styles.newsImage} />
            <View style={styles.newsContent}>
                <Text numberOfLines={2} style={[styles.newsTitle, { color: colors.text }]}>{item.title}</Text>
                <Text numberOfLines={2} style={[styles.newsSummary, { color: colors.subtext }]}>{item.summary}</Text>
                <Text style={[styles.newsDate, { color: colors.subtext }]}>{item.date}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header ... */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Voting Center</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.subtext }]}>Your voice, your power.</Text>
                </View>
                <TouchableOpacity
                    style={[styles.createBtn, { backgroundColor: colors.card }]}
                    onPress={() => router.push('/voting/create')}
                >
                    <Ionicons name="add" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
            >
                {/* Active Elections */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Elections</Text>
                    {isLoading ? (
                        <Text style={{ marginLeft: 20, color: colors.subtext }}>Loading elections...</Text>
                    ) : activeElections.length > 0 ? (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.horizontalList}
                            pagingEnabled
                            snapToInterval={width * 0.85 + 16}
                            decelerationRate="fast"
                        >
                            {activeElections.map(item => (
                                <View key={item._id || item.id}>
                                    {renderActiveElection({ item })}
                                </View>
                            ))}
                        </ScrollView>
                    ) : (
                        <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
                            <Ionicons name="stats-chart-outline" size={40} color={colors.subtext} />
                            <Text style={[styles.emptyText, { color: colors.subtext }]}>No active elections at the moment.</Text>
                        </View>
                    )}
                </View>

                {/* News Feed ... (rest of the file) */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Election News</Text>
                        <TouchableOpacity onPress={() => router.push('/voting/news')}>
                            <Text style={[styles.viewAll, { color: colors.primary }]}>View All</Text>
                        </TouchableOpacity>
                    </View>
                    {news.length > 0 ? (
                        news.map(item => (
                            <View key={item._id || item.id} style={{ marginBottom: 16, paddingHorizontal: 20 }}>
                                {renderNewsItem({ item })}
                            </View>
                        ))
                    ) : (
                        <View style={[styles.emptySection, { backgroundColor: colors.card, marginHorizontal: 20 }]}>
                            <Ionicons name="newspaper-outline" size={40} color={colors.subtext} />
                            <Text style={[styles.emptyText, { color: colors.subtext }]}>No election news today.</Text>
                        </View>
                    )}
                </View>

                {/* Upcoming */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming</Text>
                    {upcomingElections.length > 0 ? (
                        upcomingElections.map(item => (
                            <TouchableOpacity
                                key={item._id || item.id}
                                style={[styles.upcomingCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                                onPress={() => router.push(`/voting/election/${item._id || item.id}`)}
                            >
                                <View style={styles.dateBox}>
                                    <Text style={[styles.dateDay, { color: colors.text }]}>
                                        {new Date(item.startDate).getDate()}
                                    </Text>
                                    <Text style={[styles.dateMonth, { color: colors.subtext }]}>
                                        {new Date(item.startDate).toLocaleString('en', { month: 'short' }).toUpperCase()}
                                    </Text>
                                </View>
                                <View style={styles.upcomingInfo}>
                                    <Text style={[styles.upcomingTitle, { color: colors.text }]}>{item.title}</Text>
                                    <Text style={[styles.upcomingDesc, { color: colors.subtext }]} numberOfLines={1}>{item.description}</Text>
                                </View>
                                <View style={[styles.notifyBtn, { backgroundColor: colors.primary + '15' }]}>
                                    <Ionicons name="chevron-forward" size={20} color={colors.primary} />
                                </View>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={[styles.emptySection, { backgroundColor: colors.card, marginHorizontal: 20 }]}>
                            <Ionicons name="calendar-outline" size={40} color={colors.subtext} />
                            <Text style={[styles.emptyText, { color: colors.subtext }]}>No upcoming elections scheduled.</Text>
                        </View>
                    )}
                </View>

                {/* Results Banner */}
                <TouchableOpacity
                    style={[styles.resultsBanner, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => router.push(`/voting/results/${activeElections[0]?._id || activeElections[0]?.id || 'latest'}`)}
                >
                    <View style={[styles.iconBox, { backgroundColor: colors.primary + '20' }]}>
                        <Ionicons name="bar-chart" size={24} color={colors.primary} />
                    </View>
                    <View style={styles.resultsInfo}>
                        <Text style={[styles.resultsTitle, { color: colors.text }]}>Past Results</Text>
                        <Text style={[styles.resultsDesc, { color: colors.subtext }]}>View winners and stats from previous elections</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerTitle: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 28,
    },
    headerSubtitle: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
    },
    historyBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    createBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        paddingBottom: 100,
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    sectionTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
        marginLeft: 20,
        marginBottom: 16,
    },
    viewAll: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
        marginRight: 20,
    },
    horizontalList: {
        paddingHorizontal: 20,
        gap: 16,
    },
    electionCard: {
        width: width * 0.85,
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        marginBottom: 12,
        gap: 6,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#fff',
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    electionTitle: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 22,
        marginBottom: 8,
    },
    electionDesc: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 20,
    },
    electionFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    voterCount: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
    timerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 4,
    },
    timerText: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    emptySection: {
        padding: 32,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        borderStyle: 'dashed',
    },
    emptyText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
        textAlign: 'center',
    },
    emptyCard: {
        marginHorizontal: 20,
        padding: 40,
        borderRadius: 24,
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: 'rgba(0,0,0,0.05)',
    },
    newsCard: {
        flexDirection: 'row',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
    },
    newsImage: {
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: '#eee',
    },
    newsContent: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'space-between',
    },
    newsTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
        lineHeight: 20,
    },
    newsSummary: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
        lineHeight: 18,
    },
    newsDate: {
        fontSize: 10,
        marginTop: 4,
    },
    upcomingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginBottom: 12,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    dateBox: {
        alignItems: 'center',
        marginRight: 16,
        width: 40,
    },
    dateDay: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 20,
    },
    dateMonth: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 10,
    },
    upcomingInfo: {
        flex: 1,
    },
    upcomingTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
    upcomingDesc: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
    },
    notifyBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resultsBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    resultsInfo: {
        flex: 1,
    },
    resultsTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
    resultsDesc: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
    },
});
