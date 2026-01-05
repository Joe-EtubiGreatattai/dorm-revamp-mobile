import CustomLoader from '@/components/CustomLoader';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import { useCall } from '@/context/CallContext';
import { tourAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TourDetailScreen() {
    const { id } = useLocalSearchParams();
    const { user, refreshUser } = useAuth();
    const { startCall } = useCall();
    const { showAlert } = useAlert();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [tour, setTour] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        const fetchTour = async () => {
            try {
                const { data } = await tourAPI.getTour(id as string);
                setTour(data);
            } catch (error) {
                console.log('Error fetching tour request:', error);
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchTour();
    }, [id]);

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <CustomLoader message="Loading tour details..." />
            </SafeAreaView>
        );
    }

    if (!tour) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <Text style={{ color: colors.text }}>Tour request not found</Text>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
                    <Text style={{ color: colors.primary }}>Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const isOwner = user?._id === tour.ownerId?._id || user?._id === tour.ownerId;
    const otherUser = isOwner ? tour.requesterId : tour.ownerId;
    const house = tour.listingId;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid':
            case 'completed':
            case 'accepted': return '#10b981';
            case 'declined': return '#ef4444';
            default: return '#fbbf24';
        }
    };

    const handleCall = () => {
        if (otherUser) {
            startCall({
                _id: otherUser._id || otherUser.id,
                name: otherUser.name,
                avatar: otherUser.avatar
            });
        }
    };

    const handleChat = () => {
        router.push(`/chat/dm_${otherUser?._id || otherUser?.id}`);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'Flexible';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const handleComplete = async () => {
        setActionLoading(true);
        try {
            const { data } = await tourAPI.completeTour(id as string);
            setTour(data);
            showAlert({
                title: 'Tour Completed',
                description: 'You have marked this tour as completed. The student can now proceed with rent payment.',
                type: 'success'
            });
        } catch (error) {
            console.log('Error completing tour:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handlePayRent = () => {
        showAlert({
            title: 'Confirm Payment',
            description: `Are you sure you want to pay ₦${house?.price?.toLocaleString()} rent for "${house?.title}" from your dorm wallet?`,
            buttonText: 'Pay Now',
            showCancel: true,
            onConfirm: async () => {
                setActionLoading(true);
                try {
                    await tourAPI.payRent(id as string);
                    refreshUser();
                    showAlert({
                        title: 'Payment Successful',
                        description: 'Your rent has been paid successfully to the agent.',
                        type: 'success'
                    });
                } catch (error: any) {
                    showAlert({
                        title: 'Payment Failed',
                        description: error.response?.data?.message || 'Transaction failed. Please check your wallet balance.',
                        type: 'error'
                    });
                } finally {
                    setActionLoading(false);
                }
            }
        });
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Custom Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={[styles.backBtn, { backgroundColor: colors.card }]}
                >
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Tour Details</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Status Badge */}
                <View style={[styles.statusBanner, { backgroundColor: getStatusColor(tour.status) + '15' }]}>
                    <Ionicons
                        name={tour.status === 'accepted' ? 'checkmark-circle' : tour.status === 'declined' ? 'close-circle' : 'time'}
                        size={28}
                        color={getStatusColor(tour.status)}
                    />
                    <Text style={[styles.statusText, { color: getStatusColor(tour.status) }]}>
                        {tour.status?.toUpperCase()}
                    </Text>
                </View>

                {/* Property Card */}
                <TouchableOpacity
                    style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => router.push(`/listing/${house?._id || house?.id}`)}
                >
                    <Text style={[styles.label, { color: colors.subtext }]}>PROPERTY</Text>
                    <View style={styles.propertyHeader}>
                        <Image source={{ uri: house?.images?.[0] || 'https://via.placeholder.com/150' }} style={styles.propertyImage} />
                        <View style={styles.propertyInfo}>
                            <Text style={[styles.propertyTitle, { color: colors.text }]}>{house?.title}</Text>
                            <Text style={[styles.propertyAddress, { color: colors.subtext }]} numberOfLines={2}>
                                {house?.address}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
                    </View>
                </TouchableOpacity>

                {/* Appointment Card */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.label, { color: colors.subtext }]}>APPOINTMENT</Text>
                    <View style={styles.infoRow}>
                        <View style={[styles.iconBox, { backgroundColor: colors.primary + '10' }]}>
                            <Ionicons name="calendar" size={20} color={colors.primary} />
                        </View>
                        <View>
                            <Text style={[styles.infoLabel, { color: colors.subtext }]}>Scheduled Date</Text>
                            <Text style={[styles.infoValue, { color: colors.text }]}>{formatDate(tour.preferredDate)}</Text>
                        </View>
                    </View>
                    <View style={styles.infoRow}>
                        <View style={[styles.iconBox, { backgroundColor: colors.primary + '10' }]}>
                            <Ionicons name="time" size={20} color={colors.primary} />
                        </View>
                        <View>
                            <Text style={[styles.infoLabel, { color: colors.subtext }]}>Scheduled Time</Text>
                            <Text style={[styles.infoValue, { color: colors.text }]}>{tour.preferredTime || 'Flexible'}</Text>
                        </View>
                    </View>
                    {tour.meetingPoint && (
                        <View style={styles.infoRow}>
                            <View style={[styles.iconBox, { backgroundColor: '#10b98115' }]}>
                                <Ionicons name="location" size={20} color="#10b981" />
                            </View>
                            <View>
                                <Text style={[styles.infoLabel, { color: colors.subtext }]}>Meeting Point</Text>
                                <Text style={[styles.infoValue, { color: '#10b981', fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                                    {tour.meetingPoint}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Counterpart Card */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.label, { color: colors.subtext }]}>{isOwner ? 'STUDENT' : 'PROPERTY AGENT'}</Text>
                    <View style={styles.userRow}>
                        <Image source={{ uri: otherUser?.avatar || 'https://ui-avatars.com/api/?name=' + otherUser?.name }} style={styles.userAvatar} />
                        <View style={styles.userInfo}>
                            <Text style={[styles.userName, { color: colors.text }]}>{otherUser?.name}</Text>
                            <Text style={[styles.userSub, { color: colors.subtext }]}>{otherUser?.university || 'Student'}</Text>
                        </View>
                    </View>
                    <View style={styles.actionButtons}>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary + '10' }]} onPress={handleCall}>
                            <Ionicons name="call" size={20} color={colors.primary} />
                            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Call</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={handleChat}>
                            <Ionicons name="chatbubble" size={20} color="#fff" />
                            <Text style={[styles.actionBtnText, { color: '#fff' }]}>Chat</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {tour.message && (
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.label, { color: colors.subtext }]}>MESSAGE</Text>
                        <Text style={[styles.messageText, { color: colors.text }]}>{tour.message}</Text>
                    </View>
                )}
            </ScrollView>

            {isOwner && tour.status === 'pending' && (
                <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                    <TouchableOpacity
                        style={[styles.acceptBtn, { backgroundColor: colors.primary }]}
                        onPress={() => router.push(`/housing/accept-tour/${id}`)}
                    >
                        <Text style={styles.acceptBtnText}>Respond to Request</Text>
                    </TouchableOpacity>
                </View>
            )}

            {isOwner && tour.status === 'accepted' && (
                <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                    <TouchableOpacity
                        style={[styles.acceptBtn, { backgroundColor: '#10b981' }]}
                        onPress={handleComplete}
                        disabled={actionLoading}
                    >
                        <Text style={styles.acceptBtnText}>{actionLoading ? 'Processing...' : 'Mark as Completed'}</Text>
                    </TouchableOpacity>
                </View>
            )}

            {!isOwner && tour.status === 'completed' && (
                <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                    <TouchableOpacity
                        style={[styles.acceptBtn, { backgroundColor: colors.primary }]}
                        onPress={handlePayRent}
                        disabled={actionLoading}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="wallet-outline" size={20} color="#fff" />
                            <Text style={styles.acceptBtnText}>{actionLoading ? 'Paying...' : `Pay Rent (₦${house?.price?.toLocaleString()})`}</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            )}

            {tour.status === 'paid' && (
                <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                    <View style={[styles.acceptBtn, { backgroundColor: '#10b981' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="checkmark-done-circle" size={24} color="#fff" />
                            <Text style={styles.acceptBtnText}>Rent Paid Successfully</Text>
                        </View>
                    </View>
                </View>
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backBtn: {
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
    scrollContent: {
        padding: 20,
        gap: 20,
    },
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 16,
        gap: 12,
    },
    statusText: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 16,
        letterSpacing: 1,
    },
    card: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    label: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 12,
        letterSpacing: 1,
        marginBottom: 12,
    },
    propertyHeader: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    propertyImage: {
        width: 60,
        height: 60,
        borderRadius: 12,
    },
    propertyInfo: {
        flex: 1,
    },
    propertyTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
        marginBottom: 4,
    },
    propertyAddress: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 13,
    },
    infoRow: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
        marginBottom: 16,
    },
    infoLabel: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
        marginBottom: 2,
    },
    infoValue: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 15,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    userRow: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
        marginBottom: 16,
    },
    userAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
        marginBottom: 2,
    },
    userSub: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 13,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
    },
    actionBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
    messageText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
        lineHeight: 20,
        fontStyle: 'italic',
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
    },
    acceptBtn: {
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    acceptBtnText: {
        color: '#fff',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
});
