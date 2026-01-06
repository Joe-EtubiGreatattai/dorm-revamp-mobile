import PostCard from '@/components/PostCard';
import WalletTransactionModal from '@/components/WalletTransactionModal';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { API_URL, postAPI } from '@/utils/apiClient';

export default function MyProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { user, refreshUser } = useAuth(); // Use proper auth context

    const [activeTab, setActiveTab] = useState<'Posts' | 'Media' | 'Likes' | 'Saved'>('Posts');
    const [transactionModalVisible, setTransactionModalVisible] = useState(false);
    const [transactionType, setTransactionType] = useState<'topup' | 'withdraw'>('topup');
    const [isLoading, setIsLoading] = useState(false);
    const [myPosts, setMyPosts] = useState<any[]>([]);

    // Refresh user data on mount to get latest followers/following
    React.useEffect(() => {
        refreshUser();
    }, []);

    React.useEffect(() => {
        const fetchPosts = async () => {
            if (user?._id) {
                try {
                    setIsLoading(true); // Re-use isLoading for content
                    const { data } = await postAPI.getUserPosts(user._id, activeTab);
                    setMyPosts(data);
                } catch (error) {
                    console.log('Error fetching user posts:', error);
                } finally {
                    setIsLoading(false);
                }
            }
        };
        fetchPosts();
    }, [user, activeTab]);

    const handleBack = () => router.back();
    const handleSettings = () => router.push('/settings');

    const handleTopUp = () => {
        setTransactionType('topup');
        setTransactionModalVisible(true);
    };

    const handleWithdraw = () => {
        setTransactionType('withdraw');
        setTransactionModalVisible(true);
    };

    const onTransactionSuccess = async (amount: number) => {
        try {
            await refreshUser(); // Update balance
            setTransactionModalVisible(false);
        } catch (error) {
            console.log('Error refreshing user:', error);
        }
    };

    const getAvatarUri = (avatarPath?: string) => {
        if (!avatarPath) return null;
        if (avatarPath.startsWith('http')) return avatarPath;
        const normalizedPath = avatarPath.replace(/\\/g, '/');
        return `${API_URL.replace('/api', '')}/${normalizedPath}`;
    };

    const ProfileAvatar = ({ size = 80 }: { size?: number }) => {
        const avatarUri = getAvatarUri(user?.avatar);
        const initials = user?.name
            ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            : 'U';

        if (avatarUri) {
            return (
                <Image
                    source={{ uri: avatarUri }}
                    style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
                    contentFit="cover"
                    transition={200}
                />
            );
        }

        return (
            <View style={[styles.avatar, styles.initialsContainer, { width: size, height: size, borderRadius: size / 2 }]}>
                <Text style={[styles.initialsText, { fontSize: size * 0.4 }]}>{initials}</Text>
            </View>
        );
    };

    if (!user) return null; // Or loading spinner

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={{ paddingTop: insets.top, backgroundColor: colors.card }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>My Profile</Text>
                    <TouchableOpacity onPress={handleSettings} style={styles.headerBtn}>
                        <Ionicons name="settings-outline" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Profile Header Card */}
                <View style={[styles.profileCard, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                    <View style={styles.profileMain}>
                        <ProfileAvatar size={80} />
                        <View style={styles.profileInfo}>
                            <Text style={[styles.name, { color: colors.text }]}>{user.name}</Text>
                            <Text style={[styles.university, { color: colors.subtext }]}>{user.university}</Text>
                        </View>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.text }]}>{myPosts.length}</Text>
                            <Text style={[styles.statLabel, { color: colors.subtext }]}>Posts</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.text }]}>{user.followers?.length || 0}</Text>
                            <Text style={[styles.statLabel, { color: colors.subtext }]}>Followers</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.text }]}>{user.following?.length || 0}</Text>
                            <Text style={[styles.statLabel, { color: colors.subtext }]}>Following</Text>
                        </View>
                    </View>

                    {/* Dorm Wallet Card */}
                    <TouchableOpacity
                        style={[styles.walletCard, { backgroundColor: colors.primary }]}
                        activeOpacity={0.9}
                        onPress={() => router.push('/wallet')}
                    >
                        <View style={styles.walletHeader}>
                            <View>
                                <Text style={styles.walletLabel}>Dorm Wallet</Text>
                                <Text style={styles.walletBalance}>₦{user.walletBalance.toLocaleString()}</Text>
                            </View>
                            <Ionicons name="wallet-outline" size={32} color="#fff" />
                        </View>
                        {user.escrowBalance > 0 && (
                            <View style={styles.escrowContainer}>
                                <View style={styles.escrowLine} />
                                <View style={styles.escrowContent}>
                                    <Ionicons name="shield-checkmark-outline" size={16} color="#fff" style={{ opacity: 0.9 }} />
                                    <Text style={styles.escrowText}>
                                        ₦{user.escrowBalance.toLocaleString()} held in escrow
                                    </Text>
                                </View>
                            </View>
                        )}
                        <View style={styles.walletActions}>
                            <TouchableOpacity style={styles.walletActionBtn} onPress={handleTopUp}>
                                <Text style={styles.walletActionText}>Top Up</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.walletActionBtn} onPress={() => router.push('/wallet/send-money')}>
                                <Text style={styles.walletActionText}>Transfer</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.walletActionBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                                onPress={handleWithdraw}
                            >
                                <Text style={[styles.walletActionText, { color: '#fff' }]}>Withdraw</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Content Tabs */}
                <View style={[styles.contentSection, { backgroundColor: colors.background }]}>
                    <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
                        {['Posts', 'Media', 'Likes', 'Saved'].map((tab) => (
                            <TouchableOpacity
                                key={tab}
                                onPress={() => setActiveTab(tab as any)}
                                style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary }]}
                            >
                                <Text style={[styles.tabText, { color: activeTab === tab ? colors.text : colors.subtext }]}>
                                    {tab}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.postsList}>
                        {isLoading ? (
                            <View style={{ padding: 40, alignItems: 'center' }}>
                                <ActivityIndicator size="large" color={colors.primary} />
                            </View>
                        ) : myPosts.length > 0 ? (
                            myPosts.map(post => (
                                <PostCard key={post._id || post.id} post={post as any} />
                            ))
                        ) : (
                            <View style={styles.emptyState}>
                                <View style={[styles.emptyIllustration, { backgroundColor: colors.card }]}>
                                    <Ionicons name="folder-open-outline" size={48} color={colors.primary} />
                                </View>
                                <Text style={[styles.emptyTitleText, { color: colors.text }]}>No {activeTab} yet</Text>
                                <Text style={[styles.emptySubtitle, { color: colors.subtext }]}>Your {activeTab.toLowerCase()} will appear here once you have some!</Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView >

            {/* Edit Profile Modal Removed */}

            < WalletTransactionModal
                visible={transactionModalVisible}
                onClose={() => setTransactionModalVisible(false)
                }
                type={transactionType}
                onSuccess={onTransactionSuccess}
            />
        </View >
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
    headerBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    profileCard: {
        padding: 24,
        borderBottomWidth: 1,
    },
    profileMain: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
        marginBottom: 24,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    initialsContainer: {
        backgroundColor: '#6366f1',
        justifyContent: 'center',
        alignItems: 'center',
    },
    initialsText: {
        color: '#fff',
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    profileInfo: {
        flex: 1,
    },
    name: {
        fontSize: 22,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginBottom: 4,
    },
    university: {
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_400Regular',
        marginBottom: 12,
    },
    editBtn: {
        alignSelf: 'flex-start',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 18,
        borderWidth: 1,
    },
    editBtnText: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: 16,
        borderTopWidth: 0.5,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    statLabel: {
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_400Regular',
    },
    contentSection: {
        flex: 1,
    },
    tabBar: {
        flexDirection: 'row',
        borderBottomWidth: 0.5,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabText: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    postsList: {
        paddingBottom: 40,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 40,
        gap: 12,
    },
    emptyIllustration: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    emptyTitleText: {
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    emptySubtitle: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_400Regular',
        textAlign: 'center',
        lineHeight: 20,
    },
    emptyText: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_400Regular',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        height: '80%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomWidth: 0.5,
    },
    modalTitle: {
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    modalCancel: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_400Regular',
    },
    modalSave: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    modalBody: {
        padding: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        marginBottom: 8,
    },
    input: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_400Regular',
        paddingVertical: 8,
        borderBottomWidth: 1,
    },
    walletCard: {
        marginTop: 24,
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    walletHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    walletLabel: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        marginBottom: 4,
    },
    walletBalance: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        color: '#fff',
        fontSize: 32,
    },
    escrowContainer: {
        marginBottom: 16,
    },
    escrowLine: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginBottom: 12,
    },
    escrowContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    escrowText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        color: '#fff',
        fontSize: 14,
        opacity: 0.9,
    },
    walletActions: {
        flexDirection: 'row',
        gap: 12,
    },
    walletActionBtn: {
        flex: 1,
        backgroundColor: '#fff',
        paddingVertical: 10,
        borderRadius: 12,
        alignItems: 'center',
    },
    walletActionText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
        color: '#000',
    },
});
