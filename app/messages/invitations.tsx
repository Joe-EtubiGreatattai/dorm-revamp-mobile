import ActionSuccessModal from '@/components/ActionSuccessModal';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { chatAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function InvitationsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [invitations, setInvitations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Status Modal States
    const [statusModal, setStatusModal] = useState({
        visible: false,
        title: '',
        description: '',
        iconName: 'checkmark-circle' as any,
        iconColor: '',
    });

    const hideStatusModal = () => setStatusModal(prev => ({ ...prev, visible: false }));
    const showStatusModal = (config: Partial<typeof statusModal>) => {
        setStatusModal(prev => ({ ...prev, ...config, visible: true }));
    };

    const fetchInvitations = async () => {
        try {
            const { data } = await chatAPI.getInvitations();
            setInvitations(data);
        } catch (error) {
            console.log('Error fetching invitations:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvitations();
    }, []);

    const handleAction = async (invitationId: string, action: 'accept' | 'decline') => {
        setActionLoading(invitationId);
        try {
            await chatAPI.handleInvitation(invitationId, action);
            setInvitations(prev => prev.filter(inv => inv._id !== invitationId));

            showStatusModal({
                title: action === 'accept' ? 'Joined!' : 'Declined',
                description: action === 'accept'
                    ? 'You have successfully joined the group.'
                    : 'Group invitation has been declined.',
                iconName: action === 'accept' ? 'checkmark-circle' : 'close-circle',
                iconColor: action === 'accept' ? colors.primary : '#FF3B30'
            });
        } catch (error) {
            console.log(`Error ${action}ing invitation:`, error);
            showStatusModal({
                title: 'Error',
                description: `Failed to ${action} invitation. Please try again.`,
                iconName: 'alert-circle',
                iconColor: '#FF3B30'
            });
        } finally {
            setActionLoading(null);
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={[styles.invitationCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
                <Image
                    source={{ uri: item.groupId?.groupMetadata?.avatar || 'https://ui-avatars.com/api/?name=' + item.groupId?.groupMetadata?.name }}
                    style={styles.groupAvatar}
                />
                <View style={styles.groupInfo}>
                    <Text style={[styles.groupName, { color: colors.text }]}>{item.groupId?.groupMetadata?.name}</Text>
                    <Text style={[styles.inviterText, { color: colors.subtext }]}>
                        Invited by <Text style={{ fontWeight: 'bold' }}>{item.inviterId?.name}</Text>
                    </Text>
                </View>
                <Text style={[styles.timeText, { color: colors.subtext }]}>
                    {format(new Date(item.createdAt), 'MMM d')}
                </Text>
            </View>

            {item.groupId?.groupMetadata?.description && (
                <Text style={[styles.description, { color: colors.subtext }]} numberOfLines={2}>
                    {item.groupId.groupMetadata.description}
                </Text>
            )}

            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.declineBtn, { borderColor: colors.border }]}
                    onPress={() => handleAction(item._id, 'decline')}
                    disabled={!!actionLoading}
                >
                    <Text style={[styles.declineText, { color: colors.text }]}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.acceptBtn, { backgroundColor: colors.primary }]}
                    onPress={() => handleAction(item._id, 'accept')}
                    disabled={!!actionLoading}
                >
                    {actionLoading === item._id ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.acceptText}>Accept</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={{ paddingTop: insets.top, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Invitations</Text>
                    <View style={{ width: 40 }} />
                </View>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={invitations}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="mail-unread-outline" size={64} color={colors.subtext} />
                            <Text style={[styles.emptyText, { color: colors.subtext }]}>
                                No pending group invitations
                            </Text>
                        </View>
                    }
                />
            )}

            <ActionSuccessModal
                visible={statusModal.visible}
                onClose={hideStatusModal}
                title={statusModal.title}
                description={statusModal.description}
                iconName={statusModal.iconName}
                iconColor={statusModal.iconColor}
            />
        </View>
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
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: {
        padding: 16,
    },
    invitationCard: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    groupAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
    },
    groupInfo: {
        flex: 1,
    },
    groupName: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginBottom: 2,
    },
    inviterText: {
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_400Regular',
    },
    timeText: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_400Regular',
    },
    description: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_400Regular',
        marginTop: 12,
        lineHeight: 20,
    },
    actions: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 12,
    },
    actionBtn: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    declineBtn: {
        borderWidth: 1,
    },
    acceptBtn: {},
    declineText: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    acceptText: {
        color: '#fff',
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
    },
    emptyText: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_500Medium',
        marginTop: 16,
    },
});
