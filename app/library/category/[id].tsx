import LibraryFilterModal, { FilterState } from '@/components/LibraryFilterModal';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { libraryAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LibraryCategory() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [searchQuery, setSearchQuery] = useState('');
    const [isFilterModalVisible, setFilterModalVisible] = useState(false);
    const [activeFilters, setActiveFilters] = useState<FilterState>({
        level: [],
        department: [],
        type: [],
        sortBy: 'Relevance',
    });

    const [materials, setMaterials] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pageTitle, setPageTitle] = useState('Materials');

    React.useEffect(() => {
        const fetchCategoryData = async () => {
            setIsLoading(true);
            try {
                // Determine parameters based on ID
                let params: any = {};
                let title = 'Materials';

                if (id === 'recent') {
                    title = 'Recent Uploads';
                } else if (id === 'trending') {
                    title = 'Trending Now';
                } else {
                    // Check if it's a faculty or a category
                    const [catRes, facRes] = await Promise.all([
                        libraryAPI.getCategories(),
                        libraryAPI.getFaculties()
                    ]);

                    const categories = catRes.data || [];
                    const faculties = facRes.data || [];

                    const faculty = faculties.find((f: any) => f.id === id || f.title.toLowerCase() === (id as string).toLowerCase());

                    if (faculty) {
                        params.faculty = faculty.title;
                        title = faculty.title;
                    } else {
                        params.category = id;
                        const cat = categories.find((c: any) => c.id === id);
                        if (cat) title = cat.title || cat.name;
                    }
                }
                setPageTitle(title);

                const { data } = await libraryAPI.getMaterials({
                    ...params,
                    search: searchQuery || undefined,
                    type: activeFilters.type.length > 0 ? activeFilters.type[0] : undefined,
                });

                // Backend returns { materials, total, ... }
                const rawMaterials = data.materials || data;
                const formattedMaterials = (Array.isArray(rawMaterials) ? rawMaterials : []).map((m: any) => ({
                    ...m,
                    id: m._id || m.id,
                    type: m.fileType || 'pdf',
                    previewImage: m.fileUrl,
                    size: m.fileSize ? `${(m.fileSize / 1024 / 1024).toFixed(1)} MB` : '0.5 MB',
                }));
                setMaterials(formattedMaterials);
            } catch (error) {
                console.log('Error fetching category materials:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCategoryData();
    }, [id, searchQuery, activeFilters]);

    // Client-side sorting/filtering (optional if API handles it, but good for robust UI)
    const filteredMaterials = useMemo(() => {
        return (Array.isArray(materials) ? materials : []).filter((item) => {
            // Search is handled by API, but extra safety
            return true;
        }).sort((a, b) => {
            if (activeFilters.sortBy === 'Popularity') return (b.downloads || 0) - (a.downloads || 0);
            if (activeFilters.sortBy === 'Rating') return (b.rating || 0) - (a.rating || 0);
            // Default sort for Recent/Trending usually comes from API, but we can enforce:
            if (id === 'recent') return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
            if (id === 'trending') return (b.downloads || 0) - (a.downloads || 0);
            return 0;
        });
    }, [materials, activeFilters, id]);

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
                <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{pageTitle}</Text>
            <TouchableOpacity onPress={() => setFilterModalVisible(true)} style={[styles.filterBtn, { backgroundColor: colors.card }]}>
                <Ionicons name="options-outline" size={20} color={colors.text} />
            </TouchableOpacity>
        </View>
    );

    const renderSearchBar = () => (
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="search" size={20} color={colors.subtext} />
            <TextInput
                placeholder={`Search in ${pageTitle}...`}
                placeholderTextColor={colors.subtext}
                style={[styles.searchInput, { color: colors.text }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
            />
        </View>
    );

    const renderMaterialItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(`/library/material/${item.id}`)}
        >
            <Image source={{ uri: item.previewImage }} style={styles.itemImage} />
            <View style={styles.itemContent}>
                <View style={styles.rowBetween}>
                    <Text numberOfLines={1} style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
                    <View style={[styles.ratingBadge, { backgroundColor: colors.background }]}>
                        <Ionicons name="star" size={10} color="#fbbf24" />
                        <Text style={[styles.ratingText, { color: colors.text }]}>{item.rating}</Text>
                    </View>
                </View>

                <Text style={[styles.itemMeta, { color: colors.subtext }]}>{item.courseCode} • {item.type} • {item.size}</Text>

                <View style={styles.statsRow}>
                    <Ionicons name="download-outline" size={14} color={colors.primary} />
                    <Text style={[styles.statsText, { color: colors.primary }]}>{item.downloads} downloads</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />
            {renderHeader()}

            <View style={styles.content}>
                {renderSearchBar()}

                <FlatList
                    data={filteredMaterials}
                    renderItem={renderMaterialItem}
                    keyExtractor={item => item._id || item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        isLoading ? (
                            <View style={[styles.emptyState, { paddingTop: 100 }]}>
                                <Text style={{ color: colors.subtext }}>Loading...</Text>
                            </View>
                        ) : (
                            <View style={styles.emptyState}>
                                <Text style={{ color: colors.subtext }}>No materials found.</Text>
                            </View>
                        )
                    }
                />
            </View>

            <LibraryFilterModal
                visible={isFilterModalVisible}
                onClose={() => setFilterModalVisible(false)}
                onApply={setActiveFilters}
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
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 48,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 15,
        height: '100%',
    },
    listContent: {
        paddingBottom: 40,
    },
    itemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 12,
    },
    itemImage: {
        width: 60,
        height: 60,
        borderRadius: 10,
        marginRight: 12,
        backgroundColor: '#eee',
    },
    itemContent: {
        flex: 1,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    itemTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 15,
        flex: 1,
        marginRight: 8,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        gap: 2,
    },
    ratingText: {
        fontSize: 10,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    itemMeta: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
        marginBottom: 6,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statsText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 12,
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
});
