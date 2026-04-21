import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { getSocket } from '@/utils/socket';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack, useFocusEffect } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    SectionList,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


import { useAlert } from '@/context/AlertContext';
import { notificationAPI, walletAPI } from '@/utils/apiClient';
// ... imports

export default function NotificationsScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { showAlert } = useAlert(); // Access alert context
    const [refreshing, setRefreshing] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    const [loadingId, setLoadingId] = useState<string | null>(null);

    const fetchNotifications = React.useCallback(async (pageNum = 1, append = false) => {
        try {
            if (append) setIsFetchingMore(true);
            else setIsLoading(true);

            const { data } = await notificationAPI.getNotifications(pageNum);

            if (data.length < 50) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }

            if (append) {
                setNotifications(prev => {
                    const newNotifs = data.filter((n: any) => !prev.some(p => p._id === n._id || p.id === n.id));
                    return [...prev, ...newNotifs];
                });
            } else {
                setNotifications(data);
                setPage(1);
            }
        } catch (error) {
            console.log('Error fetching notifications:', error);
        } finally {
            setIsLoading(false);
            setIsFetchingMore(false);
            setRefreshing(false);
        }
    }, []);

    React.useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    useFocusEffect(
        React.useCallback(() => {
            // Refresh notifications when screen comes into focus
            // This ensures read status is synced if updated elsewhere
            fetchNotifications(1, false);
        }, [fetchNotifications])
    );

    React.useEffect(() => {
        const socket = getSocket();
        if (socket) {
            socket.on('notification:new', (newNotification: any) => {
                console.log('🔔 [NOTIFICATIONS] New notification received via socket:', newNotification);
                setNotifications(prev => {
                    // Prevent duplicates
                    if (prev.some(n => n._id === newNotification._id)) return prev;
                    return [newNotification, ...prev];
                });
            });

            return () => {
                socket.off('notification:new');
            };
        }
    }, []);

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchNotifications(1, false);
    }, [fetchNotifications]);

    const handleLoadMore = () => {
        if (isFetchingMore || !hasMore) return;
        const nextPage = page + 1;
        setPage(nextPage);
        fetchNotifications(nextPage, true);
    };

    const handleMarkAllRead = async () => {
        try {
            await notificationAPI.markAllAsRead();
            fetchNotifications();
        } catch (error) {
            console.log('Error marking all as read:', error);
        }
    };

    const handleAcceptTransfer = async (notification: any) => {
        if (loadingId) return;
        setLoadingId(notification._id);
        try {
            await walletAPI.acceptTransfer(notification.relatedId);
            showAlert({ title: 'Success', description: 'Transfer accepted successfully!', type: 'success' });
            // Mark notification as read and update type to prevent re-action
            await notificationAPI.markAsRead(notification._id);
            fetchNotifications();
        } catch (error: any) {
            showAlert({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to accept transfer',
                type: 'error'
            });
        } finally {
            setLoadingId(null);
        }
    };

    const handleRejectTransfer = async (notification: any) => {
        if (loadingId) return;
        setLoadingId(notification._id);
        try {
            await walletAPI.rejectTransfer(notification.relatedId);
            showAlert({ title: 'Rejected', description: 'Transfer rejected.', type: 'success' });
            await notificationAPI.markAsRead(notification._id);
            fetchNotifications();
        } catch (error: any) {
            showAlert({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to reject transfer',
                type: 'error'
            });
        } finally {
            setLoadingId(null);
        }
    };



    const getGroupedNotifications = React.useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        const sections: { title: string, data: any[] }[] = [
            { title: 'New', data: [] },
            { title: 'Today', data: [] },
            { title: 'Earlier', data: [] }
        ];

        notifications.forEach(notif => {
            const notifDate = new Date(notif.createdAt || notif.timestamp).getTime();

            if (!notif.isRead) {
                sections[0].data.push(notif);
            } else if (notifDate >= startOfToday) {
                sections[1].data.push(notif);
            } else {
                sections[2].data.push(notif);
            }
        });

        return sections.filter(section => section.data.length > 0);
    }, [notifications]);

    const handlePressNotification = (notification: any) => {
        // Optimistic update: mark as read in background without blocking navigation
        if (!notification.isRead) {
            // Fire and forget - don't await
            notificationAPI.markAsRead(notification._id || notification.id).catch(err => {
                 console.log('Error marking notification read in background:', err);
                 // Optionally revert state if needed, but for read status it's usually fine
            });
            
            // Update local state immediately
            setNotifications(prev => prev.map(n =>
                (n._id === notification._id || n.id === notification.id)
                    ? { ...n, isRead: true }
                    : n
            ));
        }

        const relatedId = notification.relatedId || notification.data?.relatedId;

        switch (notification.type) {
            case 'like':
            case 'comment':
            case 'mention':
            case 'share':
                router.push({ pathname: '/post/[id]', params: { id: relatedId } });
                break;
            case 'follow':
                router.push({ pathname: '/user/[id]', params: { id: relatedId } });
                break;
            case 'system':
                if (notification.title === 'Bug Report Update') {
                    showAlert({
                        title: notification.title,
                        description: notification.content || notification.message,
                        type: 'info'
                    });
                    break;
                }
                // Check if it's a broadcast or general system notification
                if (relatedId === 'admin_broadcast' || !relatedId) {
                    router.push({ pathname: '/notification/[id]', params: { id: notification._id || notification.id } });
                } else if (relatedId) {
                    // Try to be smart - if it's a mention or something related to a post, go to post
                    if (notification.content?.toLowerCase().includes('post')) {
                        router.push({ pathname: '/post/[id]', params: { id: relatedId } });
                    } else {
                        // Default system related items are usually listings
                        router.push({ pathname: '/listing/[id]', params: { id: relatedId } });
                    }
                }
                break;
            case 'order':
                if (!relatedId) break;
                // Check if it's a rent payment notification
                if (notification.title?.includes('Rent') || notification.content?.toLowerCase().includes('paid')) {
                    router.push({ pathname: '/housing/receipt/[id]', params: { id: relatedId } });
                } else {
                    router.push({ pathname: '/tracker/[id]', params: { id: relatedId } });
                }
                break;
            case 'tour':
                if (!relatedId) break;
                if (notification.title === 'Rent Payment Received' || notification.content?.toLowerCase().includes('paid')) {
                    router.push({ pathname: '/housing/receipt/[id]', params: { id: relatedId } });
                } else {
                    router.push({ pathname: '/housing/tour-detail/[id]', params: { id: relatedId } });
                }
                break;
            case 'candidate_application':
            case 'application_approved':
            case 'application_rejected':
            case 'vote_cast':
            case 'election_created':
                router.push('/voting');
                break;
            case 'withdrawal_approved':
            case 'withdrawal_rejected':
                router.push('/profile');
                break;
            case 'payment_request':
                // No specific navigation, actions are usually inline
                break;
            case 'payment_accepted':
            case 'payment_rejected':
                router.push('/profile');
                break;
            default:
                break;
        }
    };

    const renderNotificationItem = React.useCallback(({ item }: { item: any }) => {
        return (
            <NotificationItem 
                item={item} 
                colors={colors} 
                colorScheme={colorScheme}
                onPress={handlePressNotification}
                onAccept={handleAcceptTransfer}
                onReject={handleRejectTransfer}
                loadingId={loadingId}
            />
        );
    }, [colors, colorScheme, loadingId, handlePressNotification, handleAcceptTransfer, handleRejectTransfer]);

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

            <SectionList
                sections={getGroupedNotifications}
                keyExtractor={(item, index) => item._id?.toString() || item.id?.toString() || index.toString()}
                renderItem={renderNotificationItem}
                renderSectionHeader={({ section: { title } }) => (
                    <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
                    </View>
                )}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                stickySectionHeadersEnabled={false}
                initialNumToRender={15}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={true}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
                ListFooterComponent={
                    notifications.length > 0 && hasMore ? (
                        <TouchableOpacity
                            style={styles.seePreviousBtn}
                            onPress={handleLoadMore}
                            disabled={isFetchingMore}
                        >
                            {isFetchingMore ? (
                                <ActivityIndicator size="small" color={colors.subtext} />
                            ) : (
                                <Text style={[styles.seePreviousText, { color: colors.subtext }]}>See previous notifications</Text>
                            )}
                        </TouchableOpacity>
                    ) : (
                        notifications.length > 0 ? <View style={{ height: 40 }} /> : null
                    )
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

// Helper functions moved outside component
const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.split(' ').filter(p => p.length > 0);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0] ? parts[0][0].toUpperCase() : 'U';
};

const getRelativeTime = (time: string | Date) => {
    if (!time) return '';
    try {
        const date = new Date(time);
        if (isNaN(date.getTime())) return '';

        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

        return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (error) {
        return '';
    }
};

const getIcon = (type: string, colors: any) => {
    switch (type) {
        case 'like': return { name: 'heart', color: '#ef4444' };
        case 'comment': return { name: 'chatbubble', color: colors.primary };
        case 'mention': return { name: 'at', color: '#8b5cf6' };
        case 'share': return { name: 'share-social', color: '#10b981' };
        case 'follow': return { name: 'person-add', color: '#3b82f6' };
        case 'payment_request': return { name: 'wallet', color: '#f59e0b' };
        case 'payment_accepted': return { name: 'checkmark-circle', color: '#10b981' };
        case 'payment_rejected': return { name: 'close-circle', color: '#ef4444' };
        case 'order': return { name: 'cart', color: colors.primary };
        case 'tour': return { name: 'calendar', color: '#8b5cf6' };
        case 'withdrawal_approved': return { name: 'cash-outline', color: '#10b981' };
        case 'withdrawal_rejected': return { name: 'alert-circle-outline', color: '#ef4444' };
        case 'candidate_application': return { name: 'document-text-outline', color: '#3b82f6' };
        case 'application_approved': return { name: 'ribbon-outline', color: '#10b981' };
        case 'application_rejected': return { name: 'close-circle-outline', color: '#ef4444' };
        case 'vote_cast': return { name: 'stats-chart-outline', color: colors.primary };
        case 'election_created': return { name: 'megaphone-outline', color: '#f59e0b' };
        case 'system': return { name: 'shield-checkmark', color: '#10b981' };
        default: return { name: 'notifications', color: colors.subtext };
    }
};

const NotificationItem = React.memo(({ item, colors, colorScheme, onPress, onAccept, onReject, loadingId }: any) => {
    const icon = getIcon(item.type, colors);
    const unreadBg = colorScheme === 'dark' ? '#1e293b' : '#eff6ff';

    return (
        <TouchableOpacity
            style={[
                styles.notificationItem,
                !item.isRead && { backgroundColor: unreadBg }
            ]}
            activeOpacity={0.7}
            onPress={() => onPress(item)}
        >
            <View style={styles.avatarContainer}>
                {item.user ? (
                    item.user.avatar ? (
                        <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.initialsContainer, { backgroundColor: colors.primary + '15' }]}>
                            <Text style={[styles.initialsText, { color: colors.primary, fontSize: 18 }]}>
                                {getInitials(item.user.name)}
                            </Text>
                        </View>
                    )
                ) : (
                    <View style={[styles.systemIcon, { backgroundColor: colors.card }]}>
                        <Ionicons name={icon.name as any} size={20} color={icon.color} />
                    </View>
                )}
                <View style={[styles.typeBadge, { backgroundColor: icon.color }]}>
                    <Ionicons name={icon.name as any} size={10} color="#fff" />
                </View>
            </View>

            <View style={styles.contentContainer}>
                <Text style={[
                    styles.contentText, 
                    { color: colors.text },
                    !item.isRead && { fontFamily: 'PlusJakartaSans_700Bold' }
                ]}>
                    {item.user && (
                        <Text style={styles.userName}>{item.user.name}{' '}</Text>
                    )}
                    {item.content}
                </Text>
                <Text style={[styles.timestamp, { color: colors.subtext }]}>
                    {getRelativeTime(item.createdAt || item.timestamp)}
                </Text>

                {item.type === 'payment_request' && !item.isActioned && (
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#10b981' }]}
                            onPress={(e) => {
                                e.stopPropagation();
                                onAccept(item);
                            }}
                            disabled={!!loadingId}
                        >
                            {loadingId === item._id ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.actionBtnText}>Accept</Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#ef4444' }]}
                            onPress={(e) => {
                                e.stopPropagation();
                                onReject(item);
                            }}
                            disabled={!!loadingId}
                        >
                            <Text style={styles.actionBtnText}>Reject</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <TouchableOpacity style={styles.menuIconBtn} onPress={(e) => e.stopPropagation()}>
                <Ionicons name="ellipsis-horizontal" size={18} color={colors.subtext} />
            </TouchableOpacity>
        </TouchableOpacity>
    );
});

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
        paddingBottom: 40,
    },
    sectionHeader: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    sectionTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
    },
    notificationItem: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 16,
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
    initialsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    initialsText: {
        fontFamily: 'PlusJakartaSans_700Bold',
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
        maxWidth: '100%',
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
    actionButtons: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 12,
    },
    actionBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    actionBtnText: {
        color: '#fff',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 12,
    },
    menuIconBtn: {
        padding: 4,
        marginLeft: 8,
    },
    seePreviousBtn: {
        padding: 20,
        marginHorizontal: 16,
        marginTop: 8,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 12,
        alignItems: 'center',
    },
    seePreviousText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
});
