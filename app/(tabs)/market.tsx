import CustomLoader from '@/components/CustomLoader';
import MarketFilterModal, { FilterState } from '@/components/MarketFilterModal';
import MarketItem from '@/components/MarketItem';
import SellItemModal from '@/components/SellItemModal';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type MarketType = 'item' | 'food' | 'service';

import { useDebounce } from '@/hooks/useDebounce';
import { marketAPI, orderAPI } from '@/utils/apiClient';
import { getSocket } from '@/utils/socket';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
// ... imports

export default function MarketScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'] || Colors.light;
    const router = useRouter();

    const [searchQuery, setSearchQuery] = useState('');
    // Debounce search by 300ms
    const debouncedSearch = useDebounce(searchQuery, 300);

    const [selectedCategory, setSelectedCategory] = useState('All');
    const [activeSegment, setActiveSegment] = useState<MarketType>('item');
    const [isSellModalVisible, setSellModalVisible] = useState(false);
    const [isFilterModalVisible, setFilterModalVisible] = useState(false);
    const [isSwitcherOpen, setSwitcherOpen] = useState(false);

    const [filters, setFilters] = useState<FilterState>({
        minPrice: '',
        maxPrice: '',
        condition: 'Any',
        onCampus: true,
        rating: 0,
    });

    // Market Items Query (Infinite Loading)
    const {
        data,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
        refetch,
        isRefetching
    } = useInfiniteQuery({
        queryKey: ['marketItems', activeSegment, selectedCategory, debouncedSearch, filters],
        queryFn: async ({ pageParam = 1 }) => {
            const res = await marketAPI.getItems({
                type: activeSegment,
                category: selectedCategory !== 'All' ? selectedCategory : undefined,
                search: debouncedSearch || undefined,
                page: pageParam as number,
                minPrice: filters.minPrice,
                maxPrice: filters.maxPrice,
                condition: filters.condition !== 'Any' ? filters.condition : undefined,
            });
            return res.data;
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            // Check if there are more pages based on response metadata
            if (lastPage.currentPage < lastPage.totalPages) {
                return lastPage.currentPage + 1;
            }
            return undefined;
        },
    });

    const items = data?.pages.flatMap(page => page.items) || [];

    // Active Orders Query
    const { data: orders = [], refetch: refetchOrders } = useQuery({
        queryKey: ['myOrders'],
        queryFn: async () => {
            const res = await orderAPI.getOrders();
            return res.data;
        }
    });

    // Set up socket listener for real-time order updates
    React.useEffect(() => {
        const socket = getSocket();
        if (socket) {
            console.log('📡 [MARKET] Setting up socket listener for order badge updates');

            socket.on('order:statusUpdate', (data: any) => {
                console.log('📡 [MARKET] Received order update, refetching orders');
                refetchOrders();
            });

            return () => {
                console.log('📡 [MARKET] Cleaning up socket listener');
                socket.off('order:statusUpdate');
            };
        }
    }, [refetchOrders]);

    const activeOrderCount = orders.filter((o: any) =>
        !['delivered', 'cancelled', 'declined'].includes(o.status?.toLowerCase())
    ).length;

    const onRefresh = () => {
        refetch();
    };

    const loadMore = () => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    };

    const categories = {
        item: ['All', 'Electronics', 'Books', 'Furniture', 'Fashion', 'Others'],
        food: ['All', 'African', 'American', 'Asian', 'Healthy', 'Snacks'],
        service: ['All', 'Academic', 'Grooming', 'Cleaning', 'Technical', 'Art'],
    };

    const fadeAnim = React.useRef(new Animated.Value(1)).current;

    React.useEffect(() => {
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [activeSegment]);

    // ... existing helper functions

    const getSellButtonText = () => {
        switch (activeSegment) {
            case 'food': return 'Sell Food';
            case 'service': return 'Offer Service';
            default: return 'Sell Item';
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* ... Header ... */}
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Marketplace</Text>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    <TouchableOpacity
                        onPress={() => router.push('/manage-listings')}
                        style={[styles.manageBtn, { borderColor: colors.border }]}
                    >
                        <Ionicons name="list" size={20} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setSellModalVisible(true)}
                        style={[styles.sellBtn, { backgroundColor: colors.primary }]}
                    >
                        <Text style={styles.sellBtnText}>{getSellButtonText()}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search Bar */}
            <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="search" size={20} color={colors.subtext} />
                <TextInput
                    placeholder={`Search ${activeSegment}s...`}
                    placeholderTextColor={colors.subtext}
                    style={[styles.searchInput, { color: colors.text }]}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                <TouchableOpacity onPress={() => setFilterModalVisible(true)}>
                    <Ionicons name="options-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <Animated.FlatList
                data={items}
                keyExtractor={(item) => item._id || item.id}
                renderItem={({ item }) => <MarketItem item={item} />}
                numColumns={2}
                columnWrapperStyle={styles.row}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                style={{ opacity: fadeAnim }}
                refreshing={isRefetching}
                onRefresh={onRefresh}
                ListHeaderComponent={() => (
                    <View style={styles.categoriesContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.categories}>
                                {categories[activeSegment].map((cat) => (
                                    <TouchableOpacity
                                        key={cat}
                                        onPress={() => setSelectedCategory(cat)}
                                        style={[
                                            styles.categoryChip,
                                            { borderColor: colors.border },
                                            selectedCategory === cat && { backgroundColor: colors.primary, borderColor: colors.primary }
                                        ]}
                                    >
                                        <Text style={[
                                            styles.categoryText,
                                            { color: selectedCategory === cat ? '#fff' : colors.subtext }
                                        ]}>
                                            {cat}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </View>
                )}
                ListEmptyComponent={() => (
                    isLoading ? null : (
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: colors.subtext }]}>
                                {`The ${activeSegment === 'item' ? 'Market' : activeSegment} is empty`}
                            </Text>
                        </View>
                    )
                )}
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={isFetchingNextPage ? <View style={{ padding: 20 }}><Text style={{ textAlign: 'center', color: colors.subtext }}>Loading more...</Text></View> : null}
            />

            {isLoading && !isRefetching && items.length === 0 && <CustomLoader message="Loading marketplace..." />}

            {/* Expandable FAB Switcher */}
            {
                isSwitcherOpen && (
                    <View style={[styles.fabMenu, { backgroundColor: colors.card, shadowColor: "#000" }]}>
                        {(['item', 'food', 'service'] as const).map((segment) => {
                            const icons = {
                                item: 'cube-outline',
                                food: 'fast-food-outline',
                                service: 'people-outline'
                            };
                            const labels = {
                                item: 'Items',
                                food: 'Food',
                                service: 'Services'
                            };

                            return (
                                <TouchableOpacity
                                    key={segment}
                                    onPress={() => {
                                        setActiveSegment(segment);
                                        setSelectedCategory('All');
                                        setSwitcherOpen(false);
                                    }}
                                    style={[
                                        styles.fabOption,
                                        activeSegment === segment && { backgroundColor: colors.primary + '15' }
                                    ]}
                                >
                                    <Ionicons
                                        name={icons[segment] as any}
                                        size={24}
                                        color={activeSegment === segment ? colors.primary : colors.text}
                                    />
                                    <Text style={[
                                        styles.fabOptionText,
                                        { color: activeSegment === segment ? colors.primary : colors.text }
                                    ]}>
                                        {labels[segment]}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )
            }

            {/* Active Orders Tracker Button */}
            <TouchableOpacity
                style={[styles.trackerFab, { backgroundColor: colors.card, shadowColor: "#000" }]}
                onPress={() => router.push('/tracker')}
                activeOpacity={0.8}
            >
                <Ionicons name="bicycle-outline" size={24} color={colors.primary} />
                {activeOrderCount > 0 && (
                    <View style={[styles.badge, { backgroundColor: colors.primary, borderColor: colors.card }]}>
                        <Text style={styles.badgeText}>{activeOrderCount}</Text>
                    </View>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.fabMain, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
                onPress={() => setSwitcherOpen(!isSwitcherOpen)}
                activeOpacity={0.8}
            >
                <Ionicons
                    name={isSwitcherOpen ? "close" : (activeSegment === 'food' ? 'fast-food-outline' : activeSegment === 'service' ? 'people-outline' : 'cube-outline')}
                    size={28}
                    color="#fff"
                />
            </TouchableOpacity>

            <SellItemModal
                visible={isSellModalVisible}
                onClose={() => setSellModalVisible(false)}
                onSuccess={() => refetch()}
                initialType={activeSegment}
            />

            <MarketFilterModal
                visible={isFilterModalVisible}
                onClose={() => setFilterModalVisible(false)}
                onApply={setFilters}
                currentFilters={filters}
                type={activeSegment}
            />
        </SafeAreaView >
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
    headerTitle: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 24,
    },
    sellBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    sellBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        color: '#fff',
        fontSize: 14,
    },
    manageBtn: {
        width: 40,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    trackerFab: {
        position: 'absolute',
        bottom: 100,
        right: 28, // slight offset to align center with FAB (56 vs 40 width)
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 6,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        zIndex: 10,
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        paddingHorizontal: 4,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontFamily: 'PlusJakartaSans_800ExtraBold',
    },
    fabMain: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 8,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        zIndex: 20,
    },
    fabMenu: {
        position: 'absolute',
        bottom: 100,
        right: 80, // Moved to left of FAB to avoid collision with tracker button
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 8,
        gap: 4,
        elevation: 8,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        minWidth: 160,
        zIndex: 15,
    },
    fabOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        gap: 12,
    },
    fabOptionText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 15,
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
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    row: {
        justifyContent: 'space-between',
    },
    categoriesContainer: {
        marginBottom: 20,
    },
    categories: {
        flexDirection: 'row',
        paddingHorizontal: 4,
        gap: 8,
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    categoryText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 100,
        gap: 12,
    },
    emptyText: {
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
});
