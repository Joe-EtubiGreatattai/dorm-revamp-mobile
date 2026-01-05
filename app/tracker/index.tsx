import CustomLoader from '@/components/CustomLoader';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { getSocket } from '@/utils/socket';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { orderAPI } from '@/utils/apiClient';
// ... imports

export default function OrderHistoryScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [orders, setOrders] = React.useState<any[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);

    const fetchOrders = React.useCallback(async () => {
        try {
            const { data } = await orderAPI.getOrders();
            console.log('📦 Orders Data:', JSON.stringify(data, null, 2));
            console.log('📦 First Order Sample:', data[0]);
            setOrders(data);
        } catch (error) {
            console.log('Error fetching orders:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, []);

    React.useEffect(() => {
        fetchOrders();

        // Set up socket listener for real-time order updates
        const socket = getSocket();
        if (socket) {
            console.log('📡 [ORDERS] Setting up socket listener for order updates');

            socket.on('order:statusUpdate', (data: any) => {
                console.log('📡 [ORDERS] Received order update:', data);
                // Refetch orders to show updated status/ETA
                fetchOrders();
            });

            // Cleanup listener on unmount
            return () => {
                console.log('📡 [ORDERS] Cleaning up socket listener');
                socket.off('order:statusUpdate');
            };
        }
    }, [fetchOrders]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchOrders();
    };

    const activeOrders = orders.filter(o => !['delivered', 'cancelled', 'declined'].includes(o.status?.toLowerCase()));
    const pastOrders = orders.filter(o => ['delivered', 'cancelled', 'declined'].includes(o.status?.toLowerCase()));

    const renderOrderCard = ({ item, isActive }: { item: any, isActive: boolean }) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => isActive ? router.push(`/tracker/${item._id || item.id}`) : null}
            activeOpacity={isActive ? 0.7 : 1}
        >
            <Image source={{ uri: item.itemId?.images?.[0] || item.itemId?.image || 'https://via.placeholder.com/64' }} style={styles.cardImage} />
            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{item.itemId?.title || 'Unknown Item'}</Text>
                    <View style={[
                        styles.statusBadge,
                        { backgroundColor: isActive ? colors.primary + '15' : colors.border }
                    ]}>
                        <Text style={[
                            styles.statusText,
                            { color: isActive ? colors.primary : colors.subtext }
                        ]}>
                            {item.status}
                        </Text>
                    </View>
                </View>
                <Text style={[styles.cardPrice, { color: colors.subtext }]}>₦{(item.amount || 0).toLocaleString()}</Text>

                {isActive && (
                    <View style={styles.activeFooter}>
                        <View style={styles.etaContainer}>
                            <Ionicons name="time-outline" size={14} color={colors.subtext} />
                            <Text style={[styles.etaText, { color: colors.subtext }]}>{item.eta || 'Calculating...'}</Text>
                        </View>
                        <View style={[styles.trackBtn, { borderColor: colors.primary }]}>
                            <Text style={[styles.trackBtnText, { color: colors.primary }]}>Track</Text>
                        </View>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );

    const listData = [
        ...(activeOrders.length > 0 ? [{ type: 'header', title: 'Active Orders' }, ...activeOrders] : []),
        ...(pastOrders.length > 0 ? [{ type: 'header', title: 'Past Orders' }, ...pastOrders] : [])
    ];

    if (isLoading) {
        return (
            <>
                <Stack.Screen options={{ headerShown: false }} />
                <CustomLoader message="Loading orders..." />
            </>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>My Orders</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                contentContainerStyle={styles.listContent}
                data={listData}
                keyExtractor={(item, index) => (item as any)._id || index.toString()}
                renderItem={({ item }) => {
                    if ((item as any).type === 'header') {
                        return (
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>
                                {(item as any).title}
                            </Text>
                        );
                    }
                    const isPast = ['delivered', 'cancelled', 'declined'].includes((item as any).status?.toLowerCase());
                    return renderOrderCard({ item, isActive: !isPast });
                }}
                refreshing={refreshing}
                onRefresh={onRefresh}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="receipt-outline" size={64} color={colors.subtext} />
                        <Text style={[styles.emptyText, { color: colors.subtext }]}>No orders yet</Text>
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
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 0.5,
    },
    headerTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
    },
    backBtn: {
        padding: 4,
    },
    listContent: {
        padding: 16,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
        marginTop: 16,
        marginBottom: 12,
    },
    card: {
        flexDirection: 'row',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 12,
        alignItems: 'center',
    },
    cardImage: {
        width: 64,
        height: 64,
        borderRadius: 12,
        marginRight: 12,
        backgroundColor: '#eee',
    },
    cardContent: {
        flex: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    cardTitle: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 15,
        flex: 1,
        marginRight: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    statusText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 10,
        textTransform: 'uppercase',
    },
    cardPrice: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 13,
    },
    activeFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    etaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    etaText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
    },
    trackBtn: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    trackBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 12,
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
