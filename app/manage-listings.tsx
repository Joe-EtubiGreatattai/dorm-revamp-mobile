import CustomDropdown from '@/components/CustomDropdown';
import CustomLoader from '@/components/CustomLoader';
import SellItemModal from '@/components/SellItemModal';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import { marketAPI, orderAPI } from '@/utils/apiClient';
import { getSocket } from '@/utils/socket';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Helper to format currency
const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
};

export default function ManageListingsScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const router = useRouter();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { showAlert } = useAlert();
    const [activeTab, setActiveTab] = useState<'items' | 'sales'>('items');
    const [editItem, setEditItem] = useState<any>(null);
    const [isEditModalVisible, setEditModalVisible] = useState(false);
    const [orderUpdates, setOrderUpdates] = useState<Record<string, { status?: string; eta?: string }>>({});
    const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

    // Fetch user items
    const { data: myItems = [], isLoading: loadingItems, refetch: refetchItems } = useQuery({
        queryKey: ['myItems'],
        queryFn: async () => {
            const res = await marketAPI.getUserItems();
            return res.data;
        }
    });

    // Fetch user sales (orders where user is seller)
    const { data: myOrders = [], isLoading: loadingOrders, refetch: refetchOrders } = useQuery({
        queryKey: ['mySales'],
        queryFn: async () => {
            const res = await orderAPI.getOrders('seller');
            return res.data;
        },
        enabled: !!user
    });

    // Refresh on focus
    useFocusEffect(
        useCallback(() => {
            if (activeTab === 'items') refetchItems();
            else refetchOrders();
        }, [activeTab])
    );

    // Socket listeners for real-time updates
    useEffect(() => {
        const socket = getSocket();

        // Listen for order cancellations (seller receives this)
        socket.on('order:cancelled', (data: any) => {
            console.log('📢 Order cancelled:', data);
            refetchOrders();
        });

        // Listen for order status updates (buyer receives this, but seller might want to know too)
        socket.on('order:statusUpdate', (data: any) => {
            console.log('📢 Order status updated:', data);
            refetchOrders();
        });

        return () => {
            socket.off('order:cancelled');
            socket.off('order:statusUpdate');
        };
    }, []);

    const handleDeleteItem = (id: string, title: string) => {
        showAlert({
            title: 'Delete Item',
            description: `Are you sure you want to delete "${title}"?`,
            type: 'error',
            buttonText: 'Delete',
            cancelText: 'Cancel',
            showCancel: true,
            onConfirm: async () => {
                try {
                    await marketAPI.deleteItem(id);
                    refetchItems();
                    showAlert({
                        title: 'Success',
                        description: 'Item deleted successfully',
                        type: 'success'
                    });
                } catch (error) {
                    showAlert({
                        title: 'Error',
                        description: 'Failed to delete item',
                        type: 'error'
                    });
                }
            }
        });
    };

    const handleEditItem = (item: any) => {
        setEditItem(item);
        setEditModalVisible(true);
    };

    const handleStatusChange = (orderId: string, status: string) => {
        setOrderUpdates(prev => ({ ...prev, [orderId]: { ...prev[orderId], status } }));
    };

    const handleETAChange = (orderId: string, eta: string) => {
        setOrderUpdates(prev => ({ ...prev, [orderId]: { ...prev[orderId], eta } }));
    };

    const updateOrder = async (orderId: string) => {
        console.log('🔄 [UPDATE] Starting order update for:', orderId);
        setUpdatingOrderId(orderId);
        try {
            const updates = orderUpdates[orderId];
            console.log('🔄 [UPDATE] Updates to apply:', updates);

            if (!updates) {
                console.log('⚠️ [UPDATE] No updates found for orderId:', orderId);
                return;
            }

            console.log('🔄 [UPDATE] Calling orderAPI.updateStatus...');
            const response = await orderAPI.updateStatus(orderId, updates);
            console.log('✅ [UPDATE] API Response:', response.data);

            // Clear updates for this order
            setOrderUpdates(prev => {
                const newUpdates = { ...prev };
                delete newUpdates[orderId];
                console.log('🔄 [UPDATE] Cleared updates, remaining:', newUpdates);
                return newUpdates;
            });

            console.log('🔄 [UPDATE] Refetching orders...');
            refetchOrders();

            showAlert({
                title: 'Success',
                description: 'Order updated successfully',
                type: 'success'
            });
            console.log('✅ [UPDATE] Order update completed successfully');
        } catch (error: any) {
            console.error('❌ [UPDATE] Order update failed:', {
                error,
                message: error?.message,
                response: error?.response?.data,
                status: error?.response?.status,
                orderId
            });
            showAlert({
                title: 'Error',
                description: 'Failed to update order',
                type: 'error'
            });
        } finally {
            setUpdatingOrderId(null);
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Image source={{ uri: item.images[0] }} style={styles.itemImage} />
            <View style={styles.itemContent}>
                <View style={styles.itemHeader}>
                    <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                    <Text style={[styles.itemPrice, { color: colors.primary }]}>{formatCurrency(item.price)}</Text>
                </View>
                <Text style={[styles.itemStatus, {
                    color: item.status === 'available' ? 'green' :
                        item.status === 'sold' ? colors.subtext : 'orange'
                }]}>
                    {item.status.toUpperCase()}
                </Text>

                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { borderColor: colors.border, marginRight: 8 }]}
                        onPress={() => handleEditItem(item)}
                    >
                        <Ionicons name="create-outline" size={18} color={colors.primary} />
                        <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, { borderColor: colors.border }]}
                        onPress={() => handleDeleteItem(item._id, item.title)}
                    >
                        <Ionicons name="trash-outline" size={18} color={colors.error} />
                        <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    const renderOrder = ({ item }: { item: any }) => {
        const currentStatus = orderUpdates[item._id]?.status || item.status;
        const currentETA = orderUpdates[item._id]?.eta !== undefined ? orderUpdates[item._id].eta : item.eta;
        const hasChanges = !!orderUpdates[item._id];

        return (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.orderHeader}>
                    <Text style={[styles.orderId, { color: colors.subtext }]}>Order #{item._id.slice(-6)}</Text>
                    <Text style={[styles.orderDate, { color: colors.subtext }]}>
                        {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                </View>

                <View style={styles.orderBody}>
                    {item.itemId?.images?.[0] && (
                        <Image source={{ uri: item.itemId.images[0] }} style={styles.orderImage} />
                    )}
                    <View style={styles.orderInfo}>
                        <Text style={[styles.itemTitle, { color: colors.text }]}>{item.itemId?.title || 'Item Unavailable'}</Text>
                        <Text style={[styles.itemPrice, { color: colors.primary }]}>{formatCurrency(item.amount)}</Text>
                        <View style={styles.buyerRow}>
                            <Text style={[styles.buyerLabel, { color: colors.subtext }]}>Buyer: </Text>
                            <Text style={[styles.buyerName, { color: colors.text }]}>{item.buyerId?.name || 'Unknown'}</Text>
                        </View>
                        {item.status === 'cancelled' && (
                            <View style={[styles.cancelledBadge, { backgroundColor: colors.error + '20', borderColor: colors.error }]}>
                                <Ionicons name="close-circle" size={16} color={colors.error} />
                                <Text style={[styles.cancelledText, { color: colors.error }]}>CANCELLED</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* ETA Input */}
                {item.status !== 'cancelled' && (
                    <View style={styles.managementSection}>
                        <CustomDropdown
                            label="ETA"
                            value={currentETA || ''}
                            options={[
                                { label: '15 minutes', value: '15 mins', icon: 'flash-outline', color: '#10b981' },
                                { label: '30 minutes', value: '30 mins', icon: 'time-outline', color: '#3b82f6' },
                                { label: '1 hour', value: '1 hour', icon: 'hourglass-outline', color: '#6366f1' },
                                { label: '2 hours', value: '2 hours', icon: 'hourglass-outline', color: '#8b5cf6' },
                                { label: '3-4 hours', value: '3-4 hours', icon: 'calendar-outline', color: '#f59e0b' },
                                { label: 'Same day', value: 'Same day', icon: 'today-outline', color: '#ec4899' },
                                { label: 'Next day', value: 'Next day', icon: 'calendar-outline', color: '#ef4444' },
                            ]}
                            onSelect={(value) => handleETAChange(item._id, value)}
                            placeholder="Select delivery time"
                        />
                    </View>
                )}

                {/* Status Picker */}
                {item.status !== 'cancelled' && (
                    <View style={styles.managementSection}>
                        <CustomDropdown
                            label="Status"
                            value={currentStatus}
                            options={[
                                { label: 'Pending', value: 'pending', icon: 'time-outline', color: '#f59e0b' },
                                { label: 'Processing', value: 'processing', icon: 'sync-outline', color: '#3b82f6' },
                                { label: 'Shipping', value: 'shipping', icon: 'airplane-outline', color: '#6366f1' },
                                { label: 'Delivered', value: 'delivered', icon: 'checkmark-circle-outline', color: '#10b981' },
                            ]}
                            onSelect={(value) => handleStatusChange(item._id, value)}
                        />
                    </View>
                )}

                {/* Update Button */}
                {hasChanges && item.status !== 'cancelled' && (
                    <TouchableOpacity
                        style={[styles.updateBtn, { backgroundColor: colors.primary, opacity: updatingOrderId === item._id ? 0.7 : 1 }]}
                        onPress={() => updateOrder(item._id)}
                        disabled={updatingOrderId === item._id}
                    >
                        {updatingOrderId === item._id ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.updateBtnText}>Update Order</Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Manage Listings</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'items' && { borderBottomColor: colors.primary }]}
                    onPress={() => setActiveTab('items')}
                >
                    <Text style={[
                        styles.tabText,
                        { color: activeTab === 'items' ? colors.primary : colors.subtext }
                    ]}>My Items</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'sales' && { borderBottomColor: colors.primary }]}
                    onPress={() => setActiveTab('sales')}
                >
                    <Text style={[
                        styles.tabText,
                        { color: activeTab === 'sales' ? colors.primary : colors.subtext }
                    ]}>My Sales</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'items' ? (
                loadingItems ? <CustomLoader /> : (
                    <FlatList
                        data={myItems}
                        renderItem={renderItem}
                        keyExtractor={item => item._id}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Text style={[styles.emptyText, { color: colors.subtext }]}>No items listed yet</Text>
                            </View>
                        }
                    />
                )
            ) : (
                loadingOrders ? <CustomLoader /> : (
                    <FlatList
                        data={myOrders}
                        renderItem={renderOrder}
                        keyExtractor={item => item._id}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Text style={[styles.emptyText, { color: colors.subtext }]}>No sales yet</Text>
                            </View>
                        }
                    />
                )
            )}

            <SellItemModal
                visible={isEditModalVisible}
                onClose={() => {
                    setEditModalVisible(false);
                    setEditItem(null);
                }}
                onSuccess={() => {
                    refetchItems();
                }}
                initialData={editItem}
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
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    backBtn: {
        padding: 4,
    },
    tabs: {
        flexDirection: 'row',
        borderBottomWidth: 1,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
    },
    listContent: {
        padding: 16,
        gap: 16,
    },
    card: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 12,
        marginBottom: 16,
    },
    itemImage: {
        width: '100%',
        height: 150,
        borderRadius: 8,
        marginBottom: 12,
        backgroundColor: '#eee',
    },
    itemContent: {
        gap: 8,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemTitle: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 16,
        flex: 1,
        marginRight: 8,
    },
    itemPrice: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
    itemStatus: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 12,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 8,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        gap: 4,
    },
    actionText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 12,
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 16,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    orderId: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
    },
    orderDate: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
    },
    orderBody: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    orderImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: '#eee',
    },
    orderInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    buyerRow: {
        flexDirection: 'row',
        marginTop: 4,
    },
    buyerLabel: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_400Regular',
    },
    buyerName: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    orderFooter: {
        borderTopWidth: 1,
        paddingTop: 12,
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusText: {
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    managementSection: {
        marginBottom: 12,
    },
    fieldLabel: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 13,
        marginBottom: 6,
    },
    input: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        fontFamily: 'PlusJakartaSans_400Regular',
        fontSize: 14,
    },
    pickerContainer: {
        borderRadius: 8,
        borderWidth: 1,
        overflow: 'hidden',
    },
    updateBtn: {
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 8,
    },
    updateBtnText: {
        color: '#fff',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
    cancelledBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        marginTop: 8,
        alignSelf: 'flex-start',
    },
    cancelledText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 12,
        letterSpacing: 0.5,
    },
});
