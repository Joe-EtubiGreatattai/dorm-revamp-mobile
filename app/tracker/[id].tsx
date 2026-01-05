import ActionSuccessModal from '@/components/ActionSuccessModal';
import CustomLoader from '@/components/CustomLoader';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { orderAPI } from '@/utils/apiClient';
import { getSocket } from '@/utils/socket';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TrackerScreen() {
    const { id, type } = useLocalSearchParams();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [order, setOrder] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [escrowStatus, setEscrowStatus] = useState<'held' | 'released'>('held');
    const [isSuccessVisible, setSuccessVisible] = useState(false);
    const [isConfirmVisible, setConfirmVisible] = useState(false);
    const [isCancelVisible, setCancelVisible] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const { data } = await orderAPI.getOrder(id as string);
                setOrder(data);
                setEscrowStatus(data.escrowStatus || 'held');
            } catch (error) {
                console.log('Error fetching order:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrder();

        // Set up socket listener for real-time updates
        const socket = getSocket();
        if (socket) {
            console.log('📡 [TRACK] Setting up socket listener for order:', id);

            socket.on('order:statusUpdate', (data: any) => {
                console.log('📡 [TRACK] Received order update:', data);

                // Only update if it's for this order
                if (data.orderId === id || data.orderId?.toString() === id) {
                    console.log('📡 [TRACK] Updating order with new data');
                    setOrder((prevOrder: any) => ({
                        ...prevOrder,
                        status: data.status,
                        eta: data.eta
                    }));
                }
            });

            // Cleanup listener on unmount
            return () => {
                console.log('📡 [TRACK] Cleaning up socket listener');
                socket.off('order:statusUpdate');
            };
        }
    }, [id]);

    const handleConfirmReceipt = async () => {
        try {
            await orderAPI.confirmReceipt(id as string);
            setEscrowStatus('released');
            setSuccessVisible(true);
            setConfirmVisible(false);
        } catch (error) {
            console.log('Error confirming receipt:', error);
            alert('Failed to confirm receipt. Please try again.');
        }
    };

    const showConfirmDialog = () => {
        setConfirmVisible(true);
    };

    const handleCancelOrder = async () => {
        setIsCancelling(true);
        try {
            await orderAPI.cancelOrder(id as string);
            setOrder((prev: any) => ({ ...prev, status: 'cancelled' }));
            setCancelVisible(false);
            // Optionally show a success message or navigate back
            router.back();
        } catch (error) {
            console.log('Error cancelling order:', error);
            alert('Failed to cancel order. Please try again.');
        } finally {
            setIsCancelling(false);
        }
    };

    if (isLoading) {
        return (
            <>
                <Stack.Screen options={{ headerShown: false }} />
                <CustomLoader message="Loading order details..." />
            </>
        );
    }

    if (!order) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="document-text-outline" size={64} color={colors.subtext} />
                    <Text style={{ textAlign: 'center', marginTop: 20, color: colors.text, fontFamily: 'PlusJakartaSans_600SemiBold' }}>Order not found</Text>
                    <Text style={{ color: colors.subtext, marginTop: 8 }}>ID: {id}</Text>
                    <TouchableOpacity style={{ marginTop: 20 }} onPress={() => router.back()}>
                        <Text style={{ color: colors.primary, fontFamily: 'PlusJakartaSans_700Bold' }}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const item = order.itemId || {};
    const seller = order.sellerId || {};

    // Define steps based on type and status
    // Assuming order.timeline is provided by backend [ { title, time, completed, current } ]
    // or we construct it from order.status
    const getSteps = () => {
        if (order.timeline) return order.timeline;

        // Fallback logic if timeline not provided
        const steps: { title: string; time: any; completed: boolean; current?: boolean }[] = [
            { title: 'Order Placed', time: order.createdAt || 'Pending', completed: true },
            { title: 'Processing', time: '-', completed: order.status !== 'pending' },
            { title: 'In Transit', time: '-', completed: order.status === 'shipping' || order.status === 'delivered' },
            { title: 'Delivered', time: '-', completed: order.status === 'delivered' },
        ];

        // Mark current
        let foundCurrent = false;
        for (let i = steps.length - 1; i >= 0; i--) {
            if (steps[i].completed && !foundCurrent) {
                steps[i].current = true; // Actually current is usually the first incomplete or last completed?
                // Visual logic: current is the active one.
                // If "Processing" is completed, but "In Transit" is not, then "In Transit" is current status?
                // Let's simplified:
            }
        }
        return steps;
    };

    const steps = order.timeline || getSteps();
    const currentStepIndex = steps.findIndex((s: any) => s.current) !== -1 ? steps.findIndex((s: any) => s.current) : steps.length - 1;
    const progress = (currentStepIndex / (steps.length - 1)) * 100;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Track Order</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                {/* Status Card */}
                <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.statusHeader}>
                        <View>
                            <Text style={[styles.statusLabel, { color: colors.subtext }]}>Estimated Arrival</Text>
                            <Text style={[styles.statusTime, { color: colors.text }]}>{order.eta || 'Calculating...'}</Text>
                        </View>
                        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                            <Ionicons
                                name={type === 'food' ? "fast-food" : type === 'service' ? "briefcase" : "cube"}
                                size={32}
                                color={colors.primary}
                            />
                        </View>
                    </View>
                    <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                        <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${progress}%` }]} />
                    </View>
                    <View style={styles.statusFooter}>
                        <Text style={[styles.currentStatus, { color: colors.primary }]}>
                            {steps[currentStepIndex]?.title || order.status}
                        </Text>
                        <View style={[styles.escrowBadge, { backgroundColor: escrowStatus === 'held' ? colors.primary + '15' : '#10b98115' }]}>
                            <Ionicons
                                name={escrowStatus === 'held' ? "shield-checkmark" : "checkmark-circle"}
                                size={14}
                                color={escrowStatus === 'held' ? colors.primary : '#10b981'}
                            />
                            <Text style={[styles.escrowBadgeText, { color: escrowStatus === 'held' ? colors.primary : '#10b981' }]}>
                                {escrowStatus === 'held' ? 'Escrow Protected' : 'Funds Released'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Tracking Steps */}
                <View style={[styles.stepsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {steps.map((step: any, index: number) => (
                        <View key={index} style={styles.stepRow}>
                            <View style={styles.stepIndicatorContainer}>
                                <View style={[
                                    styles.stepDot,
                                    {
                                        backgroundColor: step.completed || step.current ? colors.primary : colors.border,
                                        borderColor: step.current ? colors.primary : 'transparent',
                                        borderWidth: step.current ? 4 : 0
                                    }
                                ]}>
                                    {step.completed && <Ionicons name="checkmark" size={12} color="#fff" />}
                                </View>
                                {index < steps.length - 1 && (
                                    <View style={[
                                        styles.stepLine,
                                        { backgroundColor: step.completed ? colors.primary : colors.border }
                                    ]} />
                                )}
                            </View>
                            <View style={[styles.stepContent, { paddingBottom: index === steps.length - 1 ? 0 : 32 }]}>
                                <Text style={[
                                    styles.stepTitle,
                                    { color: step.completed || step.current ? colors.text : colors.subtext, fontWeight: step.current ? '700' : '600' }
                                ]}>
                                    {step.title}
                                </Text>
                                <Text style={[styles.stepTime, { color: colors.subtext }]}>{step.time}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Order Summary */}
                <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Order Details</Text>
                    <View style={styles.itemRow}>
                        <Image source={{ uri: item.image || item.images?.[0] }} style={styles.itemImage} />
                        <View style={styles.itemInfo}>
                            <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
                            <Text style={[styles.itemPrice, { color: colors.primary }]}>₦{item.price?.toLocaleString()}</Text>
                        </View>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <View style={styles.orderMeta}>
                        <Text style={[styles.orderId, { color: colors.subtext }]}>Order ID: #{order._id?.slice(-6)}</Text>
                        <TouchableOpacity>
                            <Text style={[styles.copyBtn, { color: colors.primary }]}>Copy</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Actions */}
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                    onPress={() => router.push(`/chat/dm_${seller._id || seller.id}`)}
                >
                    <Ionicons name="chatbubble-ellipses-outline" size={20} color="#fff" />
                    <Text style={styles.actionBtnText}>Message {type === 'service' ? 'Provider' : 'Seller'}</Text>
                </TouchableOpacity>

                {(order.status === 'pending' || order.status === 'processing') && (
                    <TouchableOpacity
                        style={[styles.secondaryBtn, { borderColor: colors.border }]}
                        onPress={() => setCancelVisible(true)}
                    >
                        <Text style={[styles.secondaryBtnText, { color: '#ff4444' }]}>Cancel Order</Text>
                    </TouchableOpacity>
                )}

                {/* Confirm Receipt & Escrow Section */}
                <View style={[styles.escrowCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.escrowHeader}>
                        <Ionicons name="shield-checkmark" size={24} color={escrowStatus === 'held' ? colors.primary : '#10b981'} />
                        <View>
                            <Text style={[styles.escrowTitle, { color: colors.text }]}>
                                {escrowStatus === 'held' ? 'Escrow Protection' : 'Funds Released'}
                            </Text>
                            <Text style={[styles.escrowSubtitle, { color: colors.subtext }]}>
                                {escrowStatus === 'held'
                                    ? 'Money is held safely until you confirm receipt.'
                                    : 'The seller has been paid for this order.'}
                            </Text>
                        </View>
                    </View>

                    {escrowStatus === 'held' && (
                        <TouchableOpacity
                            style={[styles.confirmBtn, { backgroundColor: colors.text }]}
                            onPress={showConfirmDialog}
                        >
                            <Text style={[styles.confirmBtnText, { color: colors.background }]}>Confirm Receipt & Release Funds</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            <ActionSuccessModal
                visible={isSuccessVisible}
                onClose={() => setSuccessVisible(false)}
                title="Funds Released!"
                description="The payment has been released to the seller. Thank you for using Dorm Escrow!"
            />

            {/* Confirmation Modal */}
            <ActionSuccessModal
                visible={isConfirmVisible}
                onClose={() => setConfirmVisible(false)}
                onConfirm={handleConfirmReceipt}
                title="Confirm Receipt?"
                description="Please confirm that you have received your order and are satisfied with it. Once confirmed, the funds will be released to the seller and cannot be reversed."
                buttonText="Yes, Release Funds"
                cancelText="Not Yet"
                iconName="warning"
                showCancel={true}
            />

            {/* Cancel Confirmation Modal */}
            <ActionSuccessModal
                visible={isCancelVisible}
                onClose={() => setCancelVisible(false)}
                onConfirm={handleCancelOrder}
                title="Cancel Order?"
                description="Are you sure you want to cancel this order? Your funds will be immediately returned to your wallet balance."
                buttonText="Cancel Order"
                cancelText="Keep Order"
                iconName="close-circle"
                showCancel={true}
                isLoading={isCancelling}
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
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
    },
    content: {
        padding: 16,
        gap: 20,
    },
    statusCard: {
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
    },
    statusHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    statusLabel: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 12,
        marginBottom: 4,
    },
    statusTime: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 24,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressBar: {
        height: 6,
        borderRadius: 3,
        marginBottom: 12,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    currentStatus: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
    statusFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    escrowBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    escrowBadgeText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 12,
    },
    stepsContainer: {
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
    },
    stepRow: {
        flexDirection: 'row',
    },
    stepIndicatorContainer: {
        alignItems: 'center',
        marginRight: 16,
    },
    stepDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    stepLine: {
        width: 2,
        flex: 1,
        marginVertical: 4,
    },
    stepContent: {
        flex: 1,
    },
    stepTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 15,
        marginBottom: 4,
    },
    stepTime: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
    },
    summaryCard: {
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
    },
    sectionTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
        marginBottom: 16,
    },
    itemRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    itemImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: '#eee',
    },
    itemInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    itemTitle: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 15,
        marginBottom: 4,
    },
    itemPrice: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
    divider: {
        height: 1,
        marginBottom: 12,
    },
    orderMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    orderId: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 13,
    },
    copyBtn: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 13,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        gap: 8,
    },
    actionBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        color: '#fff',
        fontSize: 16,
    },
    secondaryBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    secondaryBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
    escrowCard: {
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderStyle: 'dashed',
        marginTop: 10,
    },
    escrowHeader: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 20,
    },
    escrowTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
        marginBottom: 4,
    },
    escrowSubtitle: {
        fontFamily: 'PlusJakartaSans_400Regular',
        fontSize: 13,
        lineHeight: 18,
        paddingRight: 20,
    },
    confirmBtn: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    confirmBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
});
