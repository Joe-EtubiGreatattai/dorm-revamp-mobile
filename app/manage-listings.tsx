import CustomLoader from '@/components/CustomLoader';
import SellItemModal from '@/components/SellItemModal';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import { marketAPI, orderAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, Image, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
                    </View>
                </View>

                {/* ETA Input */}
                <View style={styles.managementSection}>
                    <Text style={[styles.fieldLabel, { color: colors.text }]}>ETA</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                        placeholder="e.g., 30 mins, 2 hours"
                        placeholderTextColor={colors.subtext}
                        value={currentETA}
                        onChangeText={(text) => handleETAChange(item._id, text)}
                    />
                </View>

                {/* Status Picker */}
                <View style={styles.managementSection}>
                    <Text style={[styles.fieldLabel, { color: colors.text }]}>Status</Text>
                    <View style={[styles.pickerContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <Picker
                            selectedValue={currentStatus}
                            onValueChange={(value: string) => handleStatusChange(item._id, value)}
                            style={{ color: colors.text }}
                        >
                            <Picker.Item label="Pending" value="pending" />
                            <Picker.Item label="Processing" value="processing" />
                            <Picker.Item label="Shipping" value="shipping" />
                            <Picker.Item label="Delivered" value="delivered" />
                        </Picker>
                    </View>
                </View>

                {/* Update Button */}
                {hasChanges && (
                    <TouchableOpacity
                        style={[styles.updateBtn, { backgroundColor: colors.primary }]}
                        onPress={() => updateOrder(item._id)}
                    >
                        <Text style={styles.updateBtnText}>Update Order</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
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
});
