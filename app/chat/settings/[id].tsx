import ActionSuccessModal from '@/components/ActionSuccessModal';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { authAPI, chatAPI } from '@/utils/apiClient';
import { getSocket } from '@/utils/socket';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GroupSettingsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { user: currentUser } = useAuth();

    const [group, setGroup] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Status Modal States
    const [statusModal, setStatusModal] = useState({
        visible: false,
        title: '',
        description: '',
        iconName: 'checkmark-circle' as any,
        iconColor: '',
        onConfirm: undefined as (() => void) | undefined,
        showCancel: false,
        buttonText: 'Got it',
        cancelText: 'Cancel'
    });

    const hideStatusModal = () => setStatusModal(prev => ({ ...prev, visible: false }));
    const showStatusModal = (config: Partial<typeof statusModal>) => {
        setStatusModal(prev => ({ ...prev, ...config, visible: true }));
    };

    // Edit States
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editAvatar, setEditAvatar] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Invite Modal States
    const [inviteModalVisible, setInviteModalVisible] = useState(false);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [isInviting, setIsInviting] = useState(false);

    // Member Management Modal
    const [manageModalVisible, setManageModalVisible] = useState(false);
    const [selectedMember, setSelectedMember] = useState<any>(null);
    const [isMemberActionLoading, setIsMemberActionLoading] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

    const fetchGroupDetails = async () => {
        try {
            const { data } = await chatAPI.getConversation(id);
            setGroup(data);
            setEditName(data.groupMetadata?.name || '');
            setEditDesc(data.groupMetadata?.description || '');
            setEditAvatar(data.groupMetadata?.avatar || null);

            // Initialize online users
            if (data.participants) {
                const initialOnline = new Set<string>();
                data.participants.forEach((p: any) => {
                    if (p.isOnline) {
                        initialOnline.add(p._id);
                    }
                });
                setOnlineUsers(initialOnline);
            }
        } catch (error) {
            console.log('Error fetching group details:', error);
            showStatusModal({
                title: 'Error',
                description: 'Failed to load group details',
                iconName: 'alert-circle',
                iconColor: '#FF3B30'
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchAllUsers = async () => {
        try {
            const { data } = await authAPI.getUsers();
            // Filter out existing members
            const memberIds = group.participants.map((p: any) => p._id);
            const filtered = data.filter((u: any) =>
                u._id !== currentUser?._id &&
                !memberIds.includes(u._id)
            );
            setAllUsers(filtered);
        } catch (error) {
            console.log('Error fetching users:', error);
        }
    };

    useEffect(() => {
        fetchGroupDetails();

        const socket = getSocket();
        const handleConversationUpdated = (updatedConv: any) => {
            if (updatedConv.id === id || updatedConv._id === id) {
                console.log('🔄 [SettingsScreen] Group updated via socket:', updatedConv);
                setGroup((prev: any) => ({
                    ...prev,
                    groupMetadata: updatedConv.groupMetadata,
                    participants: updatedConv.participants,
                    admins: updatedConv.admins
                }));
            }
        };

        const handleUserOnline = ({ userId }: { userId: string }) => {
            setOnlineUsers(prev => {
                const newSet = new Set(prev);
                newSet.add(userId);
                return newSet;
            });
        };

        const handleUserOffline = ({ userId }: { userId: string }) => {
            setOnlineUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(userId);
                return newSet;
            });
        };

        socket.on('conversation:updated', handleConversationUpdated);
        socket.on('user:online', handleUserOnline);
        socket.on('user:offline', handleUserOffline);

        // request initial online status if needed
        socket.emit('get:online_users');

        return () => {
            socket.off('conversation:updated', handleConversationUpdated);
            socket.off('user:online', handleUserOnline);
            socket.off('user:offline', handleUserOffline);
        };
    }, [id]);

    useEffect(() => {
        if (inviteModalVisible) {
            fetchAllUsers();
        }
    }, [inviteModalVisible]);

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            setEditAvatar(result.assets[0].uri);
        }
    };

    const handleSaveGroup = async () => {
        if (!editName.trim()) {
            showStatusModal({
                title: 'Name Required',
                description: 'Group name is required',
                iconName: 'alert-circle',
                iconColor: '#FF3B30'
            });
            return;
        }

        setIsSaving(true);
        try {
            let avatarUrl = editAvatar;
            if (editAvatar && editAvatar.startsWith('file://')) {
                avatarUrl = await authAPI.uploadImage(editAvatar);
            }

            await chatAPI.updateGroup(id, {
                name: editName,
                description: editDesc,
                avatar: avatarUrl || undefined
            });

            await fetchGroupDetails();
            setIsEditing(false);
            showStatusModal({
                title: 'Success',
                description: 'Group updated successfully',
                iconName: 'checkmark-circle',
                iconColor: colors.primary
            });
        } catch (error) {
            console.log('Error updating group:', error);
            showStatusModal({
                title: 'Error',
                description: 'Failed to update group',
                iconName: 'alert-circle',
                iconColor: '#FF3B30'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleInviteMembers = async () => {
        if (selectedUsers.length === 0) return;

        setIsInviting(true);
        try {
            await chatAPI.inviteToGroup(id, selectedUsers);
            setInviteModalVisible(false);
            setSelectedUsers([]);
            showStatusModal({
                title: 'Invitations Sent',
                description: 'Your invitations have been sent successfully!',
                iconName: 'paper-plane',
                iconColor: colors.primary
            });
        } catch (error) {
            showStatusModal({
                title: 'Error',
                description: 'Failed to send invitations',
                iconName: 'alert-circle',
                iconColor: '#FF3B30'
            });
        } finally {
            setIsInviting(false);
        }
    };

    const handleManageMember = (member: any) => {
        if (member._id === currentUser?._id) return;
        if (member._id === group.creatorId) return;
        setSelectedMember(member);
        setManageModalVisible(true);
    };

    const performMemberAction = async (userId: string, action: 'kick' | 'make_admin' | 'remove_admin') => {
        try {
            await chatAPI.manageMember(id, { userId, action });
            await fetchGroupDetails();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            const titles = {
                kick: 'Member Removed',
                make_admin: 'Admin Added',
                remove_admin: 'Admin Removed'
            };

            showStatusModal({
                title: titles[action],
                description: 'Member status updated successfully',
                iconName: 'person-outline',
                iconColor: colors.primary
            });
        } catch (error) {
            showStatusModal({
                title: 'Error',
                description: 'Action failed',
                iconName: 'alert-circle',
                iconColor: '#FF3B30'
            });
        }
    };

    const handleLeaveGroup = () => {
        showStatusModal({
            title: 'Leave Group',
            description: 'Are you sure you want to leave this group?',
            iconName: 'log-out-outline',
            iconColor: '#FF3B30',
            showCancel: true,
            buttonText: 'Leave',
            onConfirm: async () => {
                try {
                    await chatAPI.leaveGroup(id);
                    router.replace('/messages');
                } catch (error) {
                    showStatusModal({
                        title: 'Error',
                        description: 'Failed to leave group',
                        iconName: 'alert-circle',
                        iconColor: '#FF3B30'
                    });
                }
            }
        });
    };

    const handleDeleteGroup = () => {
        showStatusModal({
            title: 'Delete Group',
            description: 'Are you sure? This will permanently delete the group and all messages for everyone.',
            iconName: 'trash-outline',
            iconColor: '#FF3B30',
            showCancel: true,
            buttonText: 'Delete',
            onConfirm: async () => {
                try {
                    await chatAPI.deleteGroup(id);
                    router.replace('/messages');
                } catch (error) {
                    showStatusModal({
                        title: 'Error',
                        description: 'Failed to delete group',
                        iconName: 'alert-circle',
                        iconColor: '#FF3B30'
                    });
                }
            }
        });
    };

    const isAdminOfGroup = group?.admins?.includes(currentUser?._id);
    const isCreator = group?.creatorId === currentUser?._id;

    const renderMember = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.memberItem}
            onLongPress={() => isAdminOfGroup && handleManageMember(item)}
            disabled={!isAdminOfGroup || item._id === currentUser?._id}
        >
            <Image
                source={{ uri: item.avatar || 'https://ui-avatars.com/api/?name=' + item.name }}
                style={styles.memberAvatar}
            />
            <View style={styles.memberInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.memberName, { color: colors.text }]}>{item.name}</Text>
                    {onlineUsers.has(item._id) && (
                        <View style={{ marginLeft: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ADE80' }} />
                    )}
                </View>
                <Text style={[styles.memberRole, { color: onlineUsers.has(item._id) ? '#4ADE80' : colors.subtext }]}>
                    {onlineUsers.has(item._id) ? 'Online' : (group.admins?.includes(item._id) ? 'Admin' : 'Member')}
                </Text>
            </View>
            {item._id === group.creatorId && (
                <View style={[styles.creatorBadge, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={{ fontSize: 10, color: colors.primary, fontWeight: 'bold' }}>CREATOR</Text>
                </View>
            )}
            {isAdminOfGroup && item._id !== currentUser?._id && item._id !== group.creatorId && (
                <Ionicons name="ellipsis-vertical" size={20} color={colors.subtext} />
            )}
        </TouchableOpacity>
    );

    const filteredInviteUsers = allUsers.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!group) return null;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={{ paddingTop: insets.top, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Group Info</Text>
                    {isAdminOfGroup ? (
                        <TouchableOpacity onPress={isEditing ? handleSaveGroup : () => setIsEditing(true)} style={styles.editBtn}>
                            {isSaving ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={{ color: colors.primary, fontWeight: '700' }}>{isEditing ? 'Save' : 'Edit'}</Text>}
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 40 }} />
                    )}
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.groupInfoCard}>
                    <TouchableOpacity disabled={!isEditing} onPress={handlePickImage} style={styles.avatarContainer}>
                        <Image
                            source={{ uri: (isEditing ? editAvatar : group.groupMetadata?.avatar) || 'https://ui-avatars.com/api/?name=' + group.groupMetadata?.name }}
                            style={styles.groupAvatar}
                        />
                        {isEditing && (
                            <View style={styles.avatarOverlay}>
                                <Ionicons name="camera" size={24} color="#FFF" />
                            </View>
                        )}
                    </TouchableOpacity>

                    {isEditing ? (
                        <View style={styles.editInputs}>
                            <TextInput
                                style={[styles.nameInput, { color: colors.text, borderBottomColor: colors.primary }]}
                                value={editName}
                                onChangeText={setEditName}
                                placeholder="Group Name"
                                placeholderTextColor={colors.subtext}
                            />
                            <TextInput
                                style={[styles.descInput, { color: colors.text, borderBottomColor: colors.border }]}
                                value={editDesc}
                                onChangeText={setEditDesc}
                                placeholder="Description"
                                placeholderTextColor={colors.subtext}
                                multiline
                            />
                        </View>
                    ) : (
                        <>
                            <Text style={[styles.groupName, { color: colors.text }]}>{group.groupMetadata?.name}</Text>
                            <Text style={[styles.participantCount, { color: colors.subtext }]}>{group.participants?.length} members</Text>
                            {group.groupMetadata?.description && (
                                <Text style={[styles.description, { color: colors.text }]}>{group.groupMetadata.description}</Text>
                            )}
                        </>
                    )}
                </View>

                <View style={[styles.section, { borderTopWidth: 8, borderTopColor: colors.card }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.subtext }]}>MEMBERS</Text>
                        {isAdminOfGroup && (
                            <TouchableOpacity onPress={() => setInviteModalVisible(true)}>
                                <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Add Members</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <FlatList
                        data={group.participants}
                        keyExtractor={(item) => item._id}
                        renderItem={renderMember}
                        scrollEnabled={false}
                    />
                </View>

                <View style={styles.footerSection}>
                    {!isCreator ? (
                        <TouchableOpacity style={styles.dangerBtn} onPress={handleLeaveGroup}>
                            <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
                            <Text style={styles.dangerBtnText}>Leave Group</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.dangerBtn} onPress={handleDeleteGroup}>
                            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                            <Text style={styles.dangerBtnText}>Delete Group</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>

            {/* Invite Modal */}
            <Modal visible={inviteModalVisible} animationType="slide">
                <View style={[styles.modalContainer, { backgroundColor: colors.background, paddingTop: insets.top }]}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setInviteModalVisible(false)}>
                            <Text style={{ color: colors.subtext }}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Add Members</Text>
                        <TouchableOpacity disabled={selectedUsers.length === 0 || isInviting} onPress={handleInviteMembers}>
                            {isInviting ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Invite</Text>}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.searchSection}>
                        <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
                            <Ionicons name="search" size={20} color={colors.subtext} />
                            <TextInput
                                style={[styles.searchInput, { color: colors.text }]}
                                placeholder="Search friends..."
                                placeholderTextColor={colors.subtext}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>
                    </View>

                    <FlatList
                        data={filteredInviteUsers}
                        keyExtractor={(item) => item._id}
                        renderItem={({ item }) => {
                            const isSelected = selectedUsers.includes(item._id);
                            return (
                                <TouchableOpacity
                                    style={styles.inviteItem}
                                    onPress={() => {
                                        setSelectedUsers(prev => isSelected ? prev.filter(uid => uid !== item._id) : [...prev, item._id]);
                                    }}
                                >
                                    <Image source={{ uri: item.avatar || 'https://ui-avatars.com/api/?name=' + item.name }} style={styles.memberAvatar} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: colors.text, fontWeight: '600' }}>{item.name}</Text>
                                        <Text style={{ color: colors.subtext, fontSize: 12 }}>{item.university}</Text>
                                    </View>
                                    <View style={[styles.checkbox, { borderColor: isSelected ? colors.primary : colors.subtext, backgroundColor: isSelected ? colors.primary : 'transparent' }]}>
                                        {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                    />
                </View>
            </Modal>

            {/* Member Management Modal */}
            <Modal
                visible={manageModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setManageModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setManageModalVisible(false)}
                >
                    <View style={[styles.actionSheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 20 }]}>
                        <View style={styles.dragHandle} />

                        <View style={styles.memberActionHeader}>
                            <Image
                                source={{ uri: selectedMember?.avatar || 'https://ui-avatars.com/api/?name=' + selectedMember?.name }}
                                style={styles.largeMemberAvatar}
                            />
                            <Text style={[styles.memberActionTitle, { color: colors.text }]}>{selectedMember?.name}</Text>
                            <Text style={[styles.memberActionSub, { color: colors.subtext }]}>
                                {group?.admins?.includes(selectedMember?._id) ? 'Admin' : 'Member'}
                            </Text>
                        </View>

                        <View style={styles.actionOptions}>
                            <TouchableOpacity
                                style={[styles.actionOption, { backgroundColor: colors.card }]}
                                onPress={() => {
                                    const action = group.admins.includes(selectedMember._id) ? 'remove_admin' : 'make_admin';
                                    performMemberAction(selectedMember._id, action);
                                    setManageModalVisible(false);
                                }}
                            >
                                <Ionicons
                                    name={group?.admins?.includes(selectedMember?._id) ? "person-remove-outline" : "shield-checkmark-outline"}
                                    size={22}
                                    color={colors.primary}
                                />
                                <Text style={[styles.actionOptionText, { color: colors.text }]}>
                                    {group?.admins?.includes(selectedMember?._id) ? 'Remove Admin' : 'Make Admin'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionOption, { backgroundColor: colors.card }]}
                                onPress={() => {
                                    setManageModalVisible(false);
                                    setTimeout(() => {
                                        showStatusModal({
                                            title: 'Kick Member',
                                            description: `Are you sure you want to remove ${selectedMember.name} from the group?`,
                                            iconName: 'person-remove-outline',
                                            iconColor: '#FF3B30',
                                            showCancel: true,
                                            buttonText: 'Kick',
                                            cancelText: 'Cancel',
                                            onConfirm: () => performMemberAction(selectedMember._id, 'kick')
                                        });
                                    }, 300);
                                }}
                            >
                                <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                                <Text style={[styles.actionOptionText, { color: '#FF3B30' }]}>Kick Member</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[styles.cancelBtn, { borderColor: colors.border }]}
                            onPress={() => setManageModalVisible(false)}
                        >
                            <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            <ActionSuccessModal
                visible={statusModal.visible}
                onClose={hideStatusModal}
                title={statusModal.title}
                description={statusModal.description}
                iconName={statusModal.iconName}
                iconColor={statusModal.iconColor}
                onConfirm={statusModal.onConfirm}
                showCancel={statusModal.showCancel}
                buttonText={statusModal.buttonText}
                cancelText={statusModal.cancelText}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backBtn: {
        padding: 8,
    },
    editBtn: {
        padding: 8,
        minWidth: 50,
        alignItems: 'flex-end',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    groupInfoCard: {
        alignItems: 'center',
        paddingVertical: 32,
        paddingHorizontal: 16,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    groupAvatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    avatarOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    groupName: {
        fontSize: 22,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginBottom: 4,
    },
    participantCount: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_400Regular',
        marginBottom: 16,
    },
    description: {
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_400Regular',
        textAlign: 'center',
        lineHeight: 22,
    },
    editInputs: {
        width: '100%',
        paddingHorizontal: 20,
    },
    nameInput: {
        fontSize: 20,
        fontWeight: '700',
        borderBottomWidth: 1,
        paddingVertical: 8,
        marginBottom: 16,
        textAlign: 'center',
    },
    descInput: {
        fontSize: 14,
        borderBottomWidth: 1,
        paddingVertical: 8,
        maxHeight: 100,
        textAlign: 'center',
    },
    section: {
        padding: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_700Bold',
        letterSpacing: 1,
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    memberAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
    },
    memberInfo: {
        flex: 1,
    },
    memberName: {
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        marginBottom: 2,
    },
    memberRole: {
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_400Regular',
    },
    creatorBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginRight: 8,
    },
    footerSection: {
        padding: 32,
        alignItems: 'center',
    },
    dangerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    dangerBtnText: {
        color: '#FF3B30',
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginLeft: 8,
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: '#EEE',
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: 'bold',
    },
    searchSection: {
        padding: 16,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        borderRadius: 10,
        height: 40,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
    },
    inviteItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: '#F0F0F0',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Member Action Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    actionSheet: {
        padding: 24,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
    },
    dragHandle: {
        width: 40,
        height: 5,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 2.5,
        alignSelf: 'center',
        marginBottom: 24,
    },
    memberActionHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    largeMemberAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginBottom: 12,
    },
    memberActionTitle: {
        fontSize: 20,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginBottom: 4,
    },
    memberActionSub: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    actionOptions: {
        gap: 12,
        marginBottom: 24,
    },
    actionOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        gap: 12,
    },
    actionOptionText: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    cancelBtn: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    cancelBtnText: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
});
