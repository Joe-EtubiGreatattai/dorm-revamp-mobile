import ActionSuccessModal from '@/components/ActionSuccessModal';
import CustomLoader from '@/components/CustomLoader';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { libraryAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Dimensions, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function MaterialReader() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [material, setMaterial] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [isMenuVisible, setMenuVisible] = useState(false);
    const [isModalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState({ title: '', description: '', icon: 'checkmark-circle' as any, color: '#0ea5e9' });
    const totalPages = 15; // Mock page count for simulation

    useEffect(() => {
        const fetchMaterial = async () => {
            try {
                const { data } = await libraryAPI.getMaterial(id as string);
                setMaterial(data);
            } catch (err) {
                console.log('Error fetching material:', err);
                setError('Failed to load material');
            } finally {
                setIsLoading(false);
            }
        };

        if (id) {
            fetchMaterial();
        }
    }, [id]);

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <CustomLoader message="Opening material..." />
            </SafeAreaView>
        );
    }

    if (error || !material) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="alert-circle-outline" size={64} color={colors.subtext} />
                    <Text style={{ color: colors.text, textAlign: 'center', marginTop: 20 }}>{error || 'Material not found'}</Text>
                    <TouchableOpacity
                        style={{ marginTop: 20 }}
                        onPress={() => router.back()}
                    >
                        <Text style={{ color: colors.primary, fontFamily: 'PlusJakartaSans_600SemiBold' }}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Toolbar */}
            <View style={[styles.toolbar, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                    <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>

                <View style={styles.titleContainer}>
                    <Text numberOfLines={1} style={[styles.docTitle, { color: colors.text }]}>{material.title}</Text>
                    <Text style={[styles.pageInfo, { color: colors.subtext }]}>Page {currentPage} of {totalPages}</Text>
                </View>

                <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => setMenuVisible(true)}
                >
                    <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

            {/* Ellipsis Menu Modal */}
            <Modal
                visible={isMenuVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setMenuVisible(false)}
            >
                <TouchableOpacity
                    style={styles.menuOverlay}
                    activeOpacity={1}
                    onPress={() => setMenuVisible(false)}
                >
                    <View style={[styles.menuContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {/* Summary Modal Logic will be separate, but let's trigger it directly here or add a new state */}
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={async () => {
                                setMenuVisible(false);
                                const ids = Array.isArray(id) ? id[0] : id;
                                try {
                                    // Try to get linked CBT
                                    const { data: cbtData } = await libraryAPI.getCBTByMaterial(ids);
                                    if (cbtData && cbtData._id) {
                                        router.push({ pathname: '/library/cbt/[id]', params: { id: cbtData._id } });
                                    } else {
                                        setModalConfig({
                                            title: 'CBT Not Found',
                                            description: 'No CBT practice available for this material yet.',
                                            icon: 'information-circle',
                                            color: '#fbbf24'
                                        });
                                        setModalVisible(true);
                                    }
                                } catch (e) {
                                    setModalConfig({
                                        title: 'CBT Not Found',
                                        description: 'No CBT practice available for this material yet.',
                                        icon: 'information-circle',
                                        color: '#fbbf24'
                                    });
                                    setModalVisible(true);
                                }
                            }}
                        >
                            <Ionicons name="school-outline" size={20} color={colors.text} />
                            <Text style={[styles.menuText, { color: colors.text }]}>Take CBT</Text>
                        </TouchableOpacity>

                        <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={async () => {
                                setMenuVisible(false);
                                setIsLoading(true); // Reuse loading or add new state
                                try {
                                    // Use first page text or whole text?
                                    // Mock text for now since 'material' doesn't have full content in this view
                                    const textToSummarize = "Academic Text Content...";
                                    const { data } = await libraryAPI.summarize({ text: textToSummarize });
                                    setModalConfig({
                                        title: 'Material Summary',
                                        description: data.summary,
                                        icon: 'sparkles',
                                        color: colors.primary
                                    });
                                    setModalVisible(true);
                                } catch (e) {
                                    setModalConfig({
                                        title: 'Summary Failed',
                                        description: 'Failed to generate summary. Please try again later.',
                                        icon: 'alert-circle',
                                        color: '#ef4444'
                                    });
                                    setModalVisible(true);
                                } finally {
                                    setIsLoading(false);
                                }
                            }}
                        >
                            <Ionicons name="sparkles-outline" size={20} color={colors.text} />
                            <Text style={[styles.menuText, { color: colors.text }]}>Get Summary</Text>
                        </TouchableOpacity>

                        <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => setMenuVisible(false)}
                        >
                            <Ionicons name="share-outline" size={20} color={colors.text} />
                            <Text style={[styles.menuText, { color: colors.text }]}>Share Page</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Content Area (Mock Reader) */}
            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                onScroll={(e) => {
                    // Simple mock for page updates on scroll
                    const offsetY = e.nativeEvent.contentOffset.y;
                    const page = Math.ceil((offsetY + 1) / 500);
                    if (page > 0 && page <= totalPages) setCurrentPage(page);
                }}
                scrollEventThrottle={16}
            >
                {/* Simulated Pages */}
                {Array.from({ length: totalPages }).map((_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.page,
                            {
                                backgroundColor: colors.card,
                                height: index === 0 ? 500 : 700
                            }
                        ]}
                    >
                        {index === 0 ? (
                            // Cover Page
                            <View style={styles.coverPage}>
                                <Image source={{ uri: material.previewImage }} style={styles.coverImage} contentFit="contain" />
                                <Text style={[styles.coverTitle, { color: colors.text }]}>{material.title}</Text>
                                <Text style={[styles.coverSubtitle, { color: colors.subtext }]}>{material.courseCode}</Text>
                            </View>
                        ) : (
                            // Content Text Mock
                            <View style={styles.textPage}>
                                <Text style={[styles.pageText, { color: colors.text }]}>
                                    {`Chapter ${index}\n\nThis is a simulated reader view for page ${index + 1}. In a real application, this would render PDF pages or extracted text content for '${material.title}'.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.`}
                                </Text>
                            </View>
                        )}
                        <Text style={[styles.footerPageNum, { color: colors.subtext }]}>{index + 1}</Text>
                    </View>
                ))}
            </ScrollView>

            {/* Bottom Controls */}
            <View style={[styles.bottomBar, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                <TouchableOpacity style={styles.controlBtn}>
                    <Ionicons name="list" size={20} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.scrubber}>
                    <View style={[styles.progress, { backgroundColor: colors.primary, width: `${(currentPage / totalPages) * 100}%` }]} />
                </View>
                <TouchableOpacity style={styles.controlBtn}>
                    <Ionicons name="settings-outline" size={20} color={colors.text} />
                </TouchableOpacity>
            </View>

            <ActionSuccessModal
                visible={isModalVisible}
                onClose={() => setModalVisible(false)}
                title={modalConfig.title}
                description={modalConfig.description}
                iconName={modalConfig.icon}
                iconColor={modalConfig.color}
                buttonText="Got it"
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    toolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        height: 56,
        borderBottomWidth: 1,
    },
    titleContainer: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    docTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
        marginBottom: 2,
    },
    pageInfo: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
    },
    iconBtn: {
        padding: 8,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
        gap: 16,
    },
    page: {
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        padding: 24,
        justifyContent: 'space-between',
    },
    coverPage: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    coverImage: {
        width: 200,
        height: 300,
        marginBottom: 24,
    },
    coverTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 24,
        textAlign: 'center',
        marginBottom: 8,
    },
    coverSubtitle: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 18,
    },
    textPage: {
        flex: 1,
    },
    pageText: {
        fontFamily: 'PlusJakartaSans_400Regular',
        fontSize: 16,
        lineHeight: 26,
    },
    footerPageNum: {
        textAlign: 'center',
        fontSize: 12,
        marginTop: 16,
    },
    bottomBar: {
        paddingHorizontal: 16,
        paddingBottom: 8,
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        gap: 16,
    },
    controlBtn: {
        padding: 8,
    },
    scrubber: {
        flex: 1,
        height: 4,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 2,
    },
    progress: {
        height: '100%',
        borderRadius: 2,
    },
    menuOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    menuContent: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 100 : 70,
        right: 16,
        width: 200,
        borderRadius: 16,
        padding: 8,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        gap: 12,
    },
    menuText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 15,
    },
    menuDivider: {
        height: 1,
        marginHorizontal: 8,
    },
});
