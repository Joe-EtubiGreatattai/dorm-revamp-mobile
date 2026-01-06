import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { authAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BlockedUsersScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { refreshUser } = useAuth();

    const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [unblockingId, setUnblockingId] = useState<string | null>(null);

    const fetchBlockedUsers = async () => {
        try {
            const { data } = await authAPI.getBlockedUsers();
            setBlockedUsers(data);
        } catch (error) {
            console.error('Failed to fetch blocked users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBlockedUsers();
    }, []);

    const handleUnblock = async (userId: string) => {
        setUnblockingId(userId);
        try {
            await authAPI.unblockUser(userId);
            setBlockedUsers(prev => prev.filter(user => user._id !== userId));
            await refreshUser();
        } catch (error) {
            console.error('Failed to unblock user:', error);
        } finally {
            setUnblockingId(null);
        }
    };

    const renderUser = ({ item }: { item: any }) => (
        <View style={[styles.userCard, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Image
                source={{ uri: item.avatar || 'https://ui-avatars.com/api/?name=' + item.name }}
                style={styles.avatar}
            />
            <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.university, { color: colors.subtext }]}>{item.university}</Text>
            </View>
            <TouchableOpacity
                onPress={() => handleUnblock(item._id)}
                disabled={unblockingId === item._id}
                style={[styles.unblockBtn, { borderColor: colors.primary }]}
            >
                {unblockingId === item._id ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                    <Text style={[styles.unblockText, { color: colors.primary }]}>Unblock</Text>
                )}
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Blocked Users</Text>
                <View style={{ width: 44 }} />
            </View>

            {isLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={blockedUsers}
                    keyExtractor={(item) => item._id}
                    renderItem={renderUser}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.card }]}>
                                <Ionicons name="shield-checkmark-outline" size={48} color={colors.subtext} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Blocked Users</Text>
                            <Text style={[styles.emptySubtitle, { color: colors.subtext }]}>
                                Users you block will appear here. You won't see their content and they can't message you.
                            </Text>
                        </View>
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: {
        padding: 20,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderBottomWidth: 1,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 16,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
    university: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
        marginTop: 2,
    },
    unblockBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1.5,
    },
    unblockText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        paddingHorizontal: 40,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 20,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
});
