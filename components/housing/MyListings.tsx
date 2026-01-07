import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { housingAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import HousingCard from '../HousingCard';

export default function MyListings() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const router = useRouter();
    const { user } = useAuth();
    const [listings, setListings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMyListings = useCallback(async () => {
        if (!user) return;

        setLoading(true);

        try {
            const { data } = await housingAPI.getListings({ ownerId: user._id });

            // The response structure is data.listings, not data directly
            const allListings = data.listings || data || [];

            // Filter by ownerId (compare as strings)
            const myListings = allListings.filter((h: any) =>
                h.ownerId?._id?.toString() === user._id.toString() ||
                h.ownerId?.toString() === user._id.toString()
            );

            setListings(myListings);
        } catch (error) {
            console.error('❌ [MY LISTINGS] Error fetching:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Fetch on mount and when user changes
    useFocusEffect(
        useCallback(() => {
            fetchMyListings();
        }, [fetchMyListings])
    );

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>My Listings</Text>
                <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.primary }]}
                    onPress={() => router.push('/housing/add')}
                >
                    <Ionicons name="add" size={20} color="#fff" />
                    <Text style={styles.addButtonText}>Add New</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={listings}
                keyExtractor={(item) => item._id || item.id}
                renderItem={({ item }) => (
                    <View style={styles.cardContainer}>
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => router.push(`/listing/${item._id || item.id}`)}
                            style={{ flex: 1 }}
                        >
                            <HousingCard house={item} />
                        </TouchableOpacity>
                        <View style={[styles.statusBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={[styles.statusDot, { backgroundColor: '#10b981' }]} />
                            <Text style={[styles.statusText, { color: colors.text }]}>Active</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.editBtn}
                            onPress={() => router.push(`/housing/edit/${item._id || item.id}`)}
                        >
                            <Ionicons name="create-outline" size={20} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                )}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="home-outline" size={64} color={colors.subtext} />
                        <Text style={[styles.emptyText, { color: colors.subtext }]}>No listings yet</Text>
                    </View>
                }
            />
        </View>
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
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    title: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 4,
    },
    addButtonText: {
        color: '#fff',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 12,
    },
    cardContainer: {
        position: 'relative',
        marginBottom: 8,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    statusBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        gap: 4,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 10,
    },
    editBtn: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        gap: 12,
    },
    emptyText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 16,
    },
});
