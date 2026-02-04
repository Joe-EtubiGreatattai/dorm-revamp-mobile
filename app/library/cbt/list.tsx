import CustomLoader from '@/components/CustomLoader';
import EmptyState from '@/components/EmptyState';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { libraryAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AiCbtListScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'] || Colors.light;
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [cbts, setCbts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchCbts = async () => {
        try {
            const { data } = await libraryAPI.getAICBTs();
            setCbts(data);
        } catch (error) {
            console.error('Error fetching AI CBTs:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchCbts();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchCbts();
    };

    const renderCbtItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.cbtCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push({
                pathname: "/library/cbt/[id]",
                params: { id: item._id }
            })}
        >
            <View style={[styles.cbtIcon, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="sparkles" size={24} color={colors.primary} />
            </View>
            <View style={styles.cbtContent}>
                <Text style={[styles.cbtTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.cbtSub, { color: colors.subtext }]}>
                    {item.courseCode} • {item.questions.length} Questions • {new Date(item.createdAt).toLocaleDateString()}
                </Text>
                {item.stats && (
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Ionicons name="trophy" size={12} color="#fbbf24" style={{ marginRight: 4 }} />
                            <Text style={[styles.statsText, { color: colors.subtext }]}>Best: {item.stats.highScore}/{item.questions.length}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Ionicons name="time" size={12} color={colors.primary} style={{ marginRight: 4 }} />
                            <Text style={[styles.statsText, { color: colors.subtext }]}>Min: {Math.floor(item.stats.fastestTime / 60)}m {item.stats.fastestTime % 60}s</Text>
                        </View>
                    </View>
                )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: colors.background }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>AI Practice Tests</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <CustomLoader message="Loading tests..." />
            ) : cbts.length === 0 ? (
                <EmptyState
                    title="No Generated Tests"
                    description="Go to a material and tap 'Generate Test' to start practicing."
                    icon="flask-outline"
                />
            ) : (
                <FlatList
                    data={cbts}
                    renderItem={renderCbtItem}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                    }
                />
            )}
        </View>
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
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    backBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
    },
    headerTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
    },
    listContent: {
        padding: 20,
        gap: 16,
    },
    cbtCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        gap: 16,
    },
    cbtIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cbtContent: {
        flex: 1,
    },
    cbtTitle: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 16,
        marginBottom: 4,
    },
    cbtSub: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 13,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        gap: 12,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statsText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
    },
});
