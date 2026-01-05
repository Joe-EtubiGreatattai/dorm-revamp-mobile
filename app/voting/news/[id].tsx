import CustomLoader from '@/components/CustomLoader';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { electionAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ElectionNewsDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [newsItem, setNewsItem] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchNewsItem = async () => {
            try {
                const { data } = await electionAPI.getNewsItem(id!);
                setNewsItem(data);
            } catch (error) {
                console.log('Error fetching news item:', error);
            } finally {
                setIsLoading(false);
            }
        };
        if (id) fetchNewsItem();
    }, [id]);

    if (isLoading) {
        return (
            <>
                <Stack.Screen options={{ headerShown: false }} />
                <CustomLoader />
            </>
        );
    }

    if (!newsItem) {
        return (
            <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <Ionicons name="alert-circle-outline" size={64} color={colors.subtext} />
                <Text style={[styles.errorText, { color: colors.text }]}>News item not found</Text>
                <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
                    <Text style={styles.backBtnText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.card }]}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>News Update</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <Image source={{ uri: newsItem.image }} style={styles.mainImage} />

                <View style={styles.contentSection}>
                    <View style={styles.metaRow}>
                        <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '15' }]}>
                            <Text style={[styles.categoryText, { color: colors.primary }]}>Elections</Text>
                        </View>
                        <Text style={[styles.dateText, { color: colors.subtext }]}>{newsItem.date}</Text>
                    </View>

                    <Text style={[styles.title, { color: colors.text }]}>{newsItem.title}</Text>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <Text style={[styles.summary, { color: colors.subtext }]}>{newsItem.summary}</Text>

                    <Text style={[styles.content, { color: colors.text }]}>
                        {newsItem.content}
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
        marginTop: 16,
        marginBottom: 24,
    },
    backBtn: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    backBtnText: {
        color: '#fff',
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    headerTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
    },
    iconBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    mainImage: {
        width: '100%',
        height: 250,
        backgroundColor: '#eee',
    },
    contentSection: {
        padding: 20,
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    categoryBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    categoryText: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_700Bold',
        textTransform: 'uppercase',
    },
    dateText: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    title: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 24,
        lineHeight: 32,
        marginBottom: 16,
    },
    divider: {
        height: 1,
        width: '100%',
        marginBottom: 16,
    },
    summary: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 24,
    },
    content: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 15,
        lineHeight: 26,
    },
});
