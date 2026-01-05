import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { tourAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function TourRequests() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const router = useRouter();
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const { data } = await tourAPI.getTours();
            setRequests(data);
        } catch (error) {
            console.log('Error fetching tour requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString || dateString === 'Flexible') return 'Flexible';

        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Reset time parts for comparison
        today.setHours(0, 0, 0, 0);
        tomorrow.setHours(0, 0, 0, 0);
        date.setHours(0, 0, 0, 0);

        if (date.getTime() === today.getTime()) {
            return 'Today';
        } else if (date.getTime() === tomorrow.getTime()) {
            return 'Tomorrow';
        } else {
            // Format as "Jan 3, 2026"
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        }
    };

    const handleAction = async (id: string, action: 'accept' | 'decline') => {
        try {
            if (action === 'accept') {
                router.push(`/housing/accept-tour/${id}`);
                // The acceptance logic is handled in the detail screen
            } else {
                await tourAPI.declineTour(id);
                // Optimistically remove from list or update status
                setRequests(prev => prev.map(r => (r._id || r.id) === id ? { ...r, status: 'declined' } : r));
            }
        } catch (error) {
            console.log(`Error ${action}ing tour:`, error);
        }
    };

    const renderRequest = ({ item }: { item: any }) => {
        // Backend populates: requesterId, ownerId, listingId
        const property = item.listingId || { title: 'Unknown Property' };
        const user = item.requesterId || { name: 'Unknown User', avatar: 'https://i.pravatar.cc/150', university: 'Unknown' };

        return (
            <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.requestCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(`/housing/tour-detail/${item._id || item.id}`)}
            >
                <View style={styles.requestHeader}>
                    <View style={styles.userInfo}>
                        <Image source={{ uri: user.avatar }} style={styles.avatar} />
                        <View>
                            <Text style={[styles.userName, { color: colors.text }]}>{user.name}</Text>
                            <Text style={[styles.userCollege, { color: colors.subtext }]}>{user.university || 'Student'}</Text>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: item.status === 'pending' ? colors.primary + '15' : '#10b98115' }]}>
                        <Text style={[styles.statusText, { color: item.status === 'pending' ? colors.primary : '#10b981' }]}>
                            {item.status?.toUpperCase() || 'PENDING'}
                        </Text>
                    </View>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <View style={styles.propertyInfo}>
                    <Ionicons name="home-outline" size={16} color={colors.subtext} />
                    <Text style={[styles.propertyName, { color: colors.text }]} numberOfLines={1}>
                        {property.title}
                    </Text>
                </View>

                <View style={styles.dateTimeRow}>
                    <View style={styles.dateTimeItem}>
                        <Ionicons name="calendar-outline" size={16} color={colors.subtext} />
                        <Text style={[styles.dateTimeText, { color: colors.text }]}>{formatDate(item.preferredDate)}</Text>
                    </View>
                    <View style={styles.dateTimeItem}>
                        <Ionicons name="time-outline" size={16} color={colors.subtext} />
                        <Text style={[styles.dateTimeText, { color: colors.text }]}>{item.preferredTime || 'Flexible'}</Text>
                    </View>
                </View>

                {item.status === 'pending' && (
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.declineBtn, { borderColor: colors.border }]}
                            onPress={() => handleAction(item._id || item.id, 'decline')}
                        >
                            <Text style={[styles.declineText, { color: colors.subtext }]}>Decline</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.acceptBtn, { backgroundColor: colors.primary }]}
                            onPress={() => handleAction(item._id || item.id, 'accept')}
                        >
                            <Text style={styles.acceptText}>Accept Request</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Incoming Requests</Text>
            </View>

            <FlatList
                data={requests}
                keyExtractor={(item) => item._id || item.id}
                renderItem={renderRequest}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="calendar-outline" size={64} color={colors.subtext} />
                        <Text style={[styles.emptyText, { color: colors.subtext }]}>No tour requests yet</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    title: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    requestCard: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 16,
    },
    requestHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    userName: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 15,
    },
    userCollege: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 10,
    },
    divider: {
        height: 1,
        marginVertical: 12,
    },
    propertyInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    propertyName: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
        flex: 1,
    },
    dateTimeRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
    },
    dateTimeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dateTimeText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 13,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
    },
    actionBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    declineBtn: {
        borderWidth: 1,
    },
    acceptBtn: {
        // dynamic bg
    },
    declineText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
    acceptText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
        color: '#fff',
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
