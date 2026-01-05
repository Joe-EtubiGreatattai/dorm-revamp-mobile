import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { electionAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AllElectionNews() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [news, setNews] = React.useState<any[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchNews = async () => {
            try {
                const { data } = await electionAPI.getNews();
                setNews(data);
            } catch (error) {
                console.log('Error fetching election news:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchNews();
    }, []);

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
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Election News</Text>
                <View style={{ width: 44 }} />
            </View>

            <FlatList
                data={news}
                renderItem={renderNewsItem}
                keyExtractor={item => item._id || item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', marginTop: 50 }}>
                        {isLoading ? (
                            <Text style={{ color: colors.subtext }}>Loading news...</Text>
                        ) : (
                            <Text style={{ color: colors.subtext }}>No news available</Text>
                        )}
                    </View>
                }
            />
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
    listContent: {
        padding: 20,
    },
    newsCard: {
        flexDirection: 'row',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 16,
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
});
