import CustomLoader from '@/components/CustomLoader';
import EmptyState from '@/components/EmptyState';
import LibraryFilterModal, { FilterState } from '@/components/LibraryFilterModal';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useDebounce } from '@/hooks/useDebounce';
import { useOfflineData } from '@/hooks/useOfflineData';
import { libraryAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LibraryScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'] || Colors.light;
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [isFilterModalVisible, setFilterModalVisible] = useState(false);
    const [activeFilters, setActiveFilters] = useState<FilterState>({
        level: [],
        department: [],
        type: [],
        sortBy: 'Relevance',
    });

    // Offline Data Hooks
    const transformResponse = useMemo(() => (res: any) => {
        const data = res.data;
        if (!data) return [];

        // Handle materials response object
        if (data.materials && Array.isArray(data.materials)) {
            return data.materials.map((m: any) => ({
                ...m,
                id: m._id || m.id,
                type: m.fileType || 'pdf',
                previewImage: m.coverUrl || (m.fileType === 'video' ? m.fileUrl : 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=1000&auto=format&fit=crop'),
                size: m.fileSize ? `${(m.fileSize / 1024 / 1024).toFixed(1)} MB` : '0.5 MB',
                rating: m.rating || 0,
                downloads: m.downloads || 0
            }));
        }

        // Handle faculties array
        if (Array.isArray(data)) {
            return data.map((item: any) => ({
                ...item,
                id: item._id || item.id
            }));
        }

        return data;
    }, []);

    const {
        data: cachedFaculties,
        isLoading: facLoading,
        refetch: refetchFaculties
    } = useOfflineData(
        'library_faculties',
        libraryAPI.getFaculties,
        [] as any[],
        transformResponse
    );

    const debouncedSearch = useDebounce(searchQuery, 500);

    const materialsKey = `library_materials_${debouncedSearch}_${JSON.stringify(activeFilters)}`;
    const {
        data: cachedMaterials,
        isLoading: matLoading,
        isRefetching: matRefetching,
        refetch: refetchMaterials
    } = useOfflineData(
        materialsKey,
        () => libraryAPI.getMaterials({
            search: debouncedSearch || undefined,
            type: activeFilters.type.length > 0 ? activeFilters.type[0] : undefined,
        }),
        [] as any[],
        transformResponse
    );

    // Sync hook data to local state for rendering (or just use hook data directly)
    // Using hook data directly is cleaner
    const displayMaterials = cachedMaterials || [];
    const displayFaculties = cachedFaculties || [];
    const isLoading = facLoading || matLoading; // Initial load (cache read or first fetch)
    const isRefetching = matRefetching;

    const onRefresh = () => {
        refetchFaculties();
        refetchMaterials();
    };

    // Client-side sorting on the displayed data
    const filteredMaterials = useMemo(() => {
        return (Array.isArray(displayMaterials) ? [...displayMaterials] : []).sort((a, b) => {
            if (activeFilters.sortBy === 'Popularity') return (b.downloads || 0) - (a.downloads || 0);
            if (activeFilters.sortBy === 'Rating') return (b.rating || 0) - (a.rating || 0);
            return 0; // Relevance/Date default
        });
    }, [displayMaterials, activeFilters]);

    const renderHeader = () => (
        <View style={styles.header}>
            <View>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Library</Text>
                <Text style={[styles.headerSubtitle, { color: colors.subtext }]}>Your academic vault</Text>
            </View>
            <View style={styles.headerActions}>
                <TouchableOpacity
                    style={[styles.iconBtn, { backgroundColor: colors.card }]}
                    onPress={() => router.push('/library/personal')}
                >
                    <Ionicons name="bookmarks-outline" size={20} color={colors.text} />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderSearchBar = () => (
        <View style={styles.searchSection}>
            <View style={[styles.searchRow, { gap: 12, paddingHorizontal: 20, marginBottom: 16 }]}>
                <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border, flex: 1, marginBottom: 0 }]}>
                    <Ionicons name="search" size={20} color={colors.subtext} />
                    <TextInput
                        placeholder="Search materials, subjects..."
                        placeholderTextColor={colors.subtext}
                        style={[styles.searchInput, { color: colors.text }]}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
                <TouchableOpacity
                    style={[styles.filterBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => setFilterModalVisible(true)}
                >
                    <Ionicons name="options-outline" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickChips}>
                {['Past Questions', 'Start-up Pack', 'Textbooks', 'Lecture Notes'].map((chip, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => setSearchQuery(chip)}
                    >
                        <Text style={[styles.chipText, { color: colors.text }]}>{chip}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    const renderCategories = () => (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Faculties</Text>
            <View style={styles.categoriesGrid}>
                {Array.isArray(displayFaculties) && displayFaculties.map((cat: any) => (
                    <TouchableOpacity
                        key={cat._id || cat.id}
                        style={[styles.categoryCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => router.push(`/library/category/${cat._id || cat.id}`)}
                    >
                        <View style={[styles.catIcon, { backgroundColor: colors.primary + '15' }]}>
                            <Ionicons name={cat.icon || 'school'} size={24} color={colors.primary} />
                        </View>
                        <Text style={[styles.catTitle, { color: colors.text }]}>{cat.title}</Text>
                        <Text style={[styles.catCount, { color: colors.subtext }]}>{cat.count || 0} files</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderMaterialCard = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.materialCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(`/library/material/${item.id}`)}
        >
            <Image source={{ uri: item.previewImage }} style={styles.previewImage} />
            <View style={styles.cardContent}>
                <View style={styles.cardTop}>
                    <View style={[styles.typeBadge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.typeText}>{item.type}</Text>
                    </View>
                    <View style={styles.ratingRow}>
                        <Ionicons name="star" size={12} color="#fbbf24" />
                        <Text style={[styles.ratingText, { color: colors.text }]}>{item.rating}</Text>
                    </View>
                </View>
                <Text numberOfLines={2} style={[styles.materialTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.courseCode, { color: colors.subtext }]}>{item.courseCode} • {item.size}</Text>
                <View style={styles.downloadRow}>
                    <Ionicons name="download-outline" size={14} color={colors.subtext} />
                    <Text style={[styles.downloadCount, { color: colors.subtext }]}>{item.downloads}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {renderHeader()}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />
                }
            >
                {renderSearchBar()}

                {searchQuery.length > 0 ? (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 16 }]}>Search Results</Text>
                        <View style={styles.categoriesGrid}>
                            {filteredMaterials.map((item) => (
                                <View key={item.id} style={{ width: '48%', marginBottom: 16 }}>
                                    {renderMaterialCard({ item })}
                                </View>
                            ))}
                        </View>
                        {filteredMaterials.length === 0 && (
                            <EmptyState
                                title="No matching materials"
                                description="Try adjusting your search or filters to find what you need."
                                icon="search-outline"
                            />
                        )}
                    </View>
                ) : (
                    <>
                        {renderCategories()}

                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Uploads</Text>
                                <TouchableOpacity>
                                    <Text style={[styles.viewAll, { color: colors.primary }]}>View All</Text>
                                </TouchableOpacity>
                            </View>
                            {isLoading ? (
                                <View style={{ height: 200, justifyContent: 'center' }}>
                                    <ActivityIndicator color={colors.primary} />
                                </View>
                            ) : displayMaterials.length === 0 ? (
                                <EmptyState
                                    title="No Recent Uploads"
                                    description="Be the first to share study materials with your peers."
                                    icon="cloud-upload-outline"
                                    actionLabel="Upload Now"
                                    onAction={() => router.push('/library/upload')}
                                    style={{ paddingVertical: 20, minHeight: 200 }}
                                />
                            ) : (
                                <FlatList
                                    data={(Array.isArray(displayMaterials) ? displayMaterials : []).slice(0, 10)} // Show only recent ones here
                                    renderItem={renderMaterialCard}
                                    keyExtractor={(item: any) => item._id || item.id}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.horizontalList}
                                />
                            )}
                        </View>

                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Trending Now</Text>
                                <TouchableOpacity>
                                    <Text style={[styles.viewAll, { color: colors.primary }]}>View All</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={{ paddingHorizontal: 20, gap: 16 }}>
                                {(Array.isArray(displayMaterials) ? displayMaterials : []).slice(0, 3).map((item: any) => (
                                    <View key={item._id || item.id}>
                                        {renderMaterialCard({ item })}
                                    </View>
                                ))}
                            </View>
                        </View>

                        {isLoading && <CustomLoader message="Loading your library..." />}
                    </>
                )}
            </ScrollView>

            {/* Upload FAB */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/library/upload')}
            >
                <Ionicons name="add" size={30} color="#fff" />
            </TouchableOpacity>

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
    headerTitle: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 28,
    },
    headerSubtitle: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        paddingBottom: 100,
    },
    searchSection: {
        marginBottom: 24,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 50,
        borderRadius: 14,
        borderWidth: 1,
    },
    filterBtn: {
        width: 50,
        height: 50,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 15,
        height: '100%',
    },
    quickChips: {
        paddingHorizontal: 20,
        gap: 10,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    chipText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 13,
    },
    section: {
        marginBottom: 24,
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
        marginLeft: 20, // For non-header sections
    },
    viewAll: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
    },
    categoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        paddingHorizontal: 20,
        marginTop: 16,
    },
    categoryCard: {
        width: '48%',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
    },
    catIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    catTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 4,
    },
    catCount: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
    },
    horizontalList: {
        paddingHorizontal: 20,
        gap: 16,
    },
    materialCard: {
        width: 200, // Fixed width for horizontal items
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    previewImage: {
        width: '100%',
        height: 120,
        backgroundColor: '#eee',
    },
    cardContent: {
        padding: 12,
    },
    cardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    typeBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    typeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    materialTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
        marginBottom: 4,
        height: 40, // consistent height
    },
    courseCode: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
        marginBottom: 8,
    },
    downloadRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    downloadCount: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 16,
        marginTop: 12,
    },
});
