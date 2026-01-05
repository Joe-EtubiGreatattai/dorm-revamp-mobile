import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { libraryAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PersonalLibrary() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('Downloads');

    const [materials, setMaterials] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchPersonalLibrary = async (showLoading = true) => {
        if (showLoading) setIsLoading(true);
        try {
            const { data } = await libraryAPI.getPersonalLibrary({ tab: activeTab.toLowerCase() });

            // Map fields for UI consistency
            const formattedMaterials = (data || []).map((m: any) => ({
                ...m,
                id: m._id,
                type: m.fileType || 'pdf',
                previewImage: m.fileUrl // In a real app, this might be a generated thumbnail
            }));

            setMaterials(formattedMaterials);
        } catch (error) {
            console.log('Error fetching personal library:', error);
            setMaterials([]);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchPersonalLibrary();
    }, [activeTab]);

    const onRefresh = () => {
        setIsRefreshing(true);
        fetchPersonalLibrary(false);
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>My Library</Text>
            <View style={{ width: 24 }} />
        </View>
    );

    const renderTabs = () => (
        <View style={styles.tabContainer}>
            {['Downloads', 'Saved', 'Contributions'].map((tab) => (
                <TouchableOpacity
                    key={tab}
                    style={[
                        styles.tab,
                        {
                            borderBottomColor: activeTab === tab ? colors.primary : 'transparent',
                        }
                    ]}
                    onPress={() => setActiveTab(tab)}
                >
                    <Text
                        style={[
                            styles.tabText,
                            {
                                color: activeTab === tab ? colors.primary : colors.subtext,
                                fontFamily: activeTab === tab ? 'PlusJakartaSans_700Bold' : 'PlusJakartaSans_500Medium',
                            }
                        ]}
                    >
                        {tab}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Ionicons
                name={
                    activeTab === 'Downloads' ? 'download-outline' :
                        activeTab === 'Saved' ? 'bookmark-outline' : 'cloud-upload-outline'
                }
                size={64}
                color={colors.subtext + '50'}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No {activeTab} yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.subtext }]}>
                {activeTab === 'Contributions'
                    ? "Upload your first material to help others."
                    : "Materials you interact with will appear here."}
            </Text>
            {activeTab === 'Contributions' && (
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                    onPress={() => router.push('/library/upload')}
                >
                    <Text style={styles.actionBtnText}>Upload Material</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    const renderMaterialItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(`/library/material/${item.id}`)}
        >
            <Image source={{ uri: item.previewImage }} style={styles.itemImage} />
            <View style={styles.itemContent}>
                <Text numberOfLines={1} style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.itemMeta, { color: colors.subtext }]}>{item.courseCode} • {item.type}</Text>
                {activeTab === 'Contributions' && (
                    <View style={styles.statsRow}>
                        <Ionicons name="eye-outline" size={14} color={colors.primary} />
                        <Text style={[styles.statsText, { color: colors.primary }]}>{item.views || 0} views</Text>
                        <Ionicons name="download-outline" size={14} color={colors.primary} style={{ marginLeft: 8 }} />
                        <Text style={[styles.statsText, { color: colors.primary }]}>{item.downloads || 0} downloads</Text>
                    </View>
                )}
            </View>
            {activeTab === 'Contributions' ? (
                <TouchableOpacity
                    style={{ padding: 8 }}
                    onPress={() => router.push(`/library/edit/${item.id}`)}
                >
                    <Ionicons name="create-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
            ) : (
                <TouchableOpacity style={{ padding: 8 }}>
                    <Ionicons name="ellipsis-vertical" size={20} color={colors.subtext} />
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            {renderHeader()}
            {renderTabs()}

            {isLoading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={materials}
                    renderItem={renderMaterialItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={renderEmptyState}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={onRefresh}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                        />
                    }
                />
            )}
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
        padding: 20,
    },
    headerTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    tab: {
        marginRight: 24,
        paddingBottom: 12,
        borderBottomWidth: 2,
    },
    tabText: {
        fontSize: 15,
    },
    listContent: {
        padding: 20,
        flexGrow: 1,
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
        width: 48,
        height: 48,
        borderRadius: 8,
        marginRight: 12,
        backgroundColor: '#eee',
    },
    itemContent: {
        flex: 1,
    },
    itemTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 15,
        marginBottom: 4,
    },
    itemMeta: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 13,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        gap: 4,
    },
    statsText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 12,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
    },
    emptyTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
        textAlign: 'center',
        maxWidth: 250,
        marginBottom: 24,
    },
    actionBtn: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 20,
    },
    actionBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        color: '#fff',
        fontSize: 14,
    },
});
