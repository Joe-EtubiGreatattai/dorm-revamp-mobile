import CustomLoader from '@/components/CustomLoader';
import EmptyState from '@/components/EmptyState';
import MyListings from '@/components/housing/MyListings';
import TourRequests from '@/components/housing/TourRequests';
import HousingCard from '@/components/HousingCard';
import MarketFilterModal, { FilterState } from '@/components/MarketFilterModal';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDebounce } from '@/hooks/useDebounce';
import { housingAPI } from '@/utils/apiClient';
import { getSocket } from '@/utils/socket';
import { useInfiniteQuery } from '@tanstack/react-query';
// ... imports

export default function HousingScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const router = useRouter();

    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 300);

    const [selectedType, setSelectedType] = useState('All');
    const [activeSegment, setActiveSegment] = useState<'explore' | 'manage'>('explore');
    const [manageTab, setManageTab] = useState<'listings' | 'tours'>('listings');
    const [isFilterModalVisible, setFilterModalVisible] = useState(false);

    const [filters, setFilters] = useState<FilterState>({
        minPrice: '',
        maxPrice: '',
        condition: 'Any',
        onCampus: true,
        rating: 0,
    });

    const {
        data,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
        refetch,
        isRefetching
    } = useInfiniteQuery({
        queryKey: ['housingListings', selectedType, debouncedSearch, filters],
        queryFn: async ({ pageParam = 1 }) => {
            const { data } = await housingAPI.getListings({
                type: selectedType !== 'All' ? selectedType : undefined,
                search: debouncedSearch || undefined,
                minPrice: filters.minPrice || undefined,
                maxPrice: filters.maxPrice || undefined,
                page: pageParam as number,
                limit: 10
            });
            return data.listings || [];
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            return lastPage.length >= 10 ? allPages.length + 1 : undefined;
        },
        enabled: activeSegment === 'explore',
    });

    const listings = data?.pages.flat() || [];

    const onRefresh = () => {
        refetch();
    };

    const loadMore = () => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    };

    // Socket listener for real-time updates
    React.useEffect(() => {
        const socket = getSocket();
        if (socket) {
            socket.on('housing:statusUpdate', (data: any) => {
                console.log('📡 [HOUSING] Status update received:', data);
                refetch();
            });

            return () => {
                socket.off('housing:statusUpdate');
            };
        }
    }, [refetch]);

    // Removed client-side filtering

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Housing</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.subtext }]}>
                        {activeSegment === 'explore' ? 'Find your next student home' : 'Manage your properties & tours'}
                    </Text>
                </View>
                <View style={styles.segmentSwitcher}>
                    <TouchableOpacity
                        style={[styles.segmentBtn, activeSegment === 'explore' && { backgroundColor: colors.primary }]}
                        onPress={() => setActiveSegment('explore')}
                    >
                        <Text style={[styles.segmentText, { color: activeSegment === 'explore' ? '#fff' : colors.subtext }]}>Explore</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.segmentBtn, activeSegment === 'manage' && { backgroundColor: colors.primary }]}
                        onPress={() => setActiveSegment('manage')}
                    >
                        <Text style={[styles.segmentText, { color: activeSegment === 'manage' ? '#fff' : colors.subtext }]}>Manage</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {activeSegment === 'explore' ? (
                <>
                    {/* Search Bar */}
                    <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Ionicons name="search" size={20} color={colors.subtext} />
                        <TextInput
                            placeholder="Search location, price..."
                            placeholderTextColor={colors.subtext}
                            style={[styles.searchInput, { color: colors.text }]}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        <TouchableOpacity onPress={() => setFilterModalVisible(true)}>
                            <Ionicons name="options-outline" size={20} color={colors.primary} />
                        </TouchableOpacity>
                    </View>

                    {/* Filters */}
                    <View style={styles.filterContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                            {['All', 'Self-Con', 'Flat', 'Roommate', 'Hostel'].map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    style={[
                                        styles.filterChip,
                                        { borderColor: colors.border },
                                        selectedType === type && { backgroundColor: colors.primary, borderColor: colors.primary }
                                    ]}
                                    onPress={() => setSelectedType(type)}
                                >
                                    <Text style={[
                                        styles.filterText,
                                        { color: selectedType === type ? '#fff' : colors.subtext }
                                    ]}>
                                        {type}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <FlatList
                        data={listings}
                        keyExtractor={(item) => item._id || item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                activeOpacity={0.9}
                                onPress={() => router.push(`/listing/${item._id || item.id}`)}
                            >
                                <HousingCard house={item} />
                            </TouchableOpacity>
                        )}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshing={isRefetching}
                        onRefresh={onRefresh}
                        ListEmptyComponent={
                            isLoading ? null : (
                                <EmptyState
                                    title="No places found"
                                    description="We couldn't find any housing options matching your search."
                                    icon="home-outline"
                                />
                            )
                        }
                    />
                    {isLoading && !isRefetching && listings.length === 0 && <CustomLoader message="Finding homes..." />}
                </>
            ) : (
                <View style={{ flex: 1 }}>
                    <View style={styles.manageTabs}>
                        <TouchableOpacity
                            style={[styles.manageTab, manageTab === 'listings' && { borderBottomColor: colors.primary }]}
                            onPress={() => setManageTab('listings')}
                        >
                            <Text style={[styles.manageTabText, { color: manageTab === 'listings' ? colors.primary : colors.subtext }]}>
                                My Listings
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.manageTab, manageTab === 'tours' && { borderBottomColor: colors.primary }]}
                            onPress={() => setManageTab('tours')}
                        >
                            <Text style={[styles.manageTabText, { color: manageTab === 'tours' ? colors.primary : colors.subtext }]}>
                                Tour Requests
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {manageTab === 'listings' ? <MyListings /> : <TourRequests />}
                </View>
            )}

            <MarketFilterModal
                visible={isFilterModalVisible}
                onClose={() => setFilterModalVisible(false)}
                onApply={setFilters}
                currentFilters={filters}
                type="housing"
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    headerTitle: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 28,
    },
    headerSubtitle: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
        marginTop: 4,
    },
    segmentSwitcher: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.05)',
        padding: 4,
        borderRadius: 12,
        gap: 4,
    },
    segmentBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    segmentText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 12,
    },
    manageTabs: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        marginBottom: 8,
    },
    manageTab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    manageTabText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        paddingHorizontal: 12,
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
    },
    searchInput: {
        fontFamily: 'PlusJakartaSans_400Regular',
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
    },
    filterContainer: {
        marginBottom: 16,
    },
    filterScroll: {
        paddingLeft: 16,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        borderWidth: 1,
    },
    filterText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 100,
        gap: 12,
    },
    emptyText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 16,
    },
});
