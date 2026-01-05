import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { getSocket } from '@/utils/socket';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import React, { useState } from 'react';
import {
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type FilterType = 'All' | 'Likes' | 'Mentions';

import { notificationAPI } from '@/utils/apiClient';
// ... imports

export default function NotificationsScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const [activeFilter, setActiveFilter] = useState<FilterType>('All');
    const [refreshing, setRefreshing] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchNotifications = React.useCallback(async () => {
        try {
            const { data } = await notificationAPI.getNotifications();
            setNotifications(data);
        } catch (error) {
            console.log('Error fetching notifications:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, []);

    React.useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    React.useEffect(() => {
        const socket = getSocket();
        if (socket) {
            socket.on('notification:new', (newNotification: any) => {
                console.log('🔔 [NOTIFICATIONS] New notification received via socket:', newNotification);
                setNotifications(prev => [newNotification, ...prev]);
            });

            return () => {
                socket.off('notification:new');
            };
        }
    }, []);

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchNotifications();
    }, [fetchNotifications]);

    const handleMarkAllRead = async () => {
        try {
            await notificationAPI.markAllAsRead();
            fetchNotifications();
        } catch (error) {
            console.log('Error marking all as read:', error);
        }
    };

    const handlePressNotification = async (notification: any) => {
        if (!notification.isRead) {
            try {
                await notificationAPI.markAsRead(notification._id || notification.id);
                // Update local state to mark as read
                setNotifications(prev => prev.map(n =>
                    (n._id === notification._id || n.id === notification.id)
                        ? { ...n, isRead: true }
                        : n
                ));
            } catch (error) {
                console.log('Error marking notification read:', error);
            }
        }

        switch (notification.type) {
            case 'like':
            case 'comment':
                router.push({ pathname: '/post/[id]', params: { id: notification.relatedId } });
                break;
            case 'follow':
                router.push({ pathname: '/user/[id]', params: { id: notification.relatedId } });
                break;
            case 'system':
                if (notification.relatedId) {
                    router.push({ pathname: '/listing/[id]', params: { id: notification.relatedId } });
                }
                break;
            case 'order':
                // Check if it's a rent payment notification
                if (notification.title?.includes('Rent') || notification.content?.toLowerCase().includes('paid')) {
                    router.push({ pathname: '/housing/receipt/[id]', params: { id: notification.relatedId } });
                } else {
                    router.push({ pathname: '/tracker/[id]', params: { id: notification.relatedId } });
                }
                break;
            case 'tour':
                if (notification.title === 'Rent Payment Received' || notification.content?.toLowerCase().includes('paid')) {
                    router.push({ pathname: '/housing/receipt/[id]', params: { id: notification.relatedId } });
                } else {
                    router.push({ pathname: '/housing/tour-detail/[id]', params: { id: notification.relatedId } });
                }
                break;
            default:
                break;
        }
    };

    const filteredNotifications = notifications.filter(notif => {
        if (activeFilter === 'Likes') return notif.type === 'like';
        if (activeFilter === 'Mentions') return notif.type === 'comment';
        return true;
    });

    const getIcon = (type: string) => {
        switch (type) {
            case 'like': return { name: 'heart', color: '#ef4444' };
            case 'comment': return { name: 'chatbubble', color: colors.primary };
            case 'follow': return { name: 'person-add', color: '#3b82f6' };
            case 'system': return { name: 'shield-checkmark', color: '#10b981' };
            case 'tour': return { name: 'home', color: colors.primary };
            case 'order': return { name: 'receipt', color: colors.primary };
            default: return { name: 'notifications', color: colors.subtext };
        }
    };

    const renderNotification = ({ item }: { item: any }) => {
        const icon = getIcon(item.type);

        return (
            <TouchableOpacity
                style={[
                    styles.notificationItem,
                    { borderBottomColor: colors.border },
                    !item.isRead && { backgroundColor: colors.primary + '05' }
                ]}
                activeOpacity={0.7}
                onPress={() => handlePressNotification(item)}
            >
                <View style={styles.avatarContainer}>
                    {item.user ? (
                        <Image source={{ uri: item.user.avatar || 'https://ui-avatars.com/api/?name=User' }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.systemIcon, { backgroundColor: colors.card }]}>
                            <Ionicons name={icon.name as any} size={20} color={icon.color} />
                        </View>
                    )}
                    {item.user && (
                        <View style={[styles.typeBadge, { backgroundColor: icon.color }]}>
                            <Ionicons name={icon.name as any} size={10} color="#fff" />
                        </View>
                    )}
                </View>

                <View style={styles.contentContainer}>
                    <Text style={[styles.contentText, { color: colors.text }]}>
                        {item.user && <Text style={styles.userName}>{item.user.name} </Text>}
                        {item.content}
                    </Text>
                    <Text style={[styles.timestamp, { color: colors.subtext }]}>
                        {new Date(item.createdAt || item.timestamp).toLocaleDateString()}
                    </Text>
                </View>

                {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.filterContainer}>
                {(['All', 'Likes', 'Mentions'] as FilterType[]).map((filter) => (
                    <TouchableOpacity
                        key={filter}
                        onPress={() => setActiveFilter(filter)}
                        style={[
                            styles.filterChip,
                            activeFilter === filter && { backgroundColor: colors.text, borderColor: colors.text }
                        ]}
                    >
                        <Text style={[
                            styles.filterText,
                            { color: activeFilter === filter ? colors.background : colors.subtext }
                        ]}>
                            {filter}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <FlatList
                data={filteredNotifications}
                keyExtractor={(item) => item._id || item.id}
                renderItem={renderNotification}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        {isLoading ? (
                            <Text style={[styles.emptyText, { color: colors.subtext }]}>Loading notifications...</Text>
                        ) : (
                            <>
                                <Ionicons name="notifications-off-outline" size={64} color={colors.subtext} />
                                <Text style={[styles.emptyText, { color: colors.subtext }]}>No notifications yet</Text>
                            </>
                        )}
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
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 20,
    },
    markReadBtn: {
        padding: 4,
    },
    markReadText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 12,
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    filterText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
    listContent: {
        flexGrow: 1,
    },
    notificationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 0.5,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    systemIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    typeBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    contentContainer: {
        flex: 1,
    },
    contentText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
        lineHeight: 20,
    },
    userName: {
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    timestamp: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
        marginTop: 4,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: 8,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
        gap: 12,
    },
    emptyText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 16,
    },
});
