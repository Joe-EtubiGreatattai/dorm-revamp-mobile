import ActionSuccessModal from '@/components/ActionSuccessModal';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { authAPI, chatAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CreateGroupScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { user: currentUser } = useAuth();

    const [groupName, setGroupName] = useState('');
    const [groupDesc, setGroupDesc] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [groupAvatar, setGroupAvatar] = useState<string | null>(null);

    // Status Modal States
    const [statusModal, setStatusModal] = useState({
        visible: false,
        title: '',
        description: '',
        iconName: 'alert-circle' as any,
        iconColor: '#FF3B30'
    });

    const hideStatusModal = () => setStatusModal(prev => ({ ...prev, visible: false }));
    const showStatusModal = (config: Partial<typeof statusModal>) => {
        setStatusModal(prev => ({ ...prev, ...config, visible: true }));
    };

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const { data } = await authAPI.getUsers();
                const filtered = data.filter((u: any) =>
                    u._id !== currentUser?._id &&
                    u.university === currentUser?.university
                );
                setUsers(filtered);
            } catch (error) {
                console.log('Error fetching users:', error);
            } finally {
                setLoading(false);
            }
        };

        if (currentUser) {
            fetchUsers();
        }
    }, [currentUser]);

    const toggleUser = (userId: string) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            setGroupAvatar(result.assets[0].uri);
        }
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim()) {
            showStatusModal({
                title: 'Name Required',
                description: 'Please enter a name for your group.',
                iconName: 'alert-circle'
            });
            return;
        }
        if (selectedUsers.length === 0) {
            showStatusModal({
                title: 'Members Required',
                description: 'Please select at least one member to join the group.',
                iconName: 'people-outline'
            });
            return;
        }

        setIsCreating(true);
        try {
            let avatarUrl = undefined;
            if (groupAvatar) {
                avatarUrl = await authAPI.uploadImage(groupAvatar);
            }

            const { data } = await chatAPI.createGroup({
                name: groupName,
                description: groupDesc,
                avatar: avatarUrl,
                initialMembers: selectedUsers
            });
            router.replace(`/chat/${data._id || data.id}`);
        } catch (error) {
            console.log('Error creating group:', error);
            showStatusModal({
                title: 'Creation Failed',
                description: 'Something went wrong while creating the group. Please try again.',
                iconName: 'alert-circle'
            });
        } finally {
            setIsCreating(false);
        }
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderItem = ({ item }: { item: any }) => {
        const isSelected = selectedUsers.includes(item._id);
        return (
            <TouchableOpacity
                style={[styles.userItem, { borderBottomColor: colors.border }]}
                onPress={() => toggleUser(item._id)}
            >
                <Image
                    source={{ uri: item.avatar || 'https://ui-avatars.com/api/?name=' + item.name }}
                    style={styles.avatar}
                />
                <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.userSchool, { color: colors.subtext }]}>{item.university}</Text>
                </View>
                <View style={[
                    styles.checkbox,
                    { borderColor: isSelected ? colors.primary : colors.subtext, backgroundColor: isSelected ? colors.primary : 'transparent' }
                ]}>
                    {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={{ paddingTop: insets.top, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>New Group</Text>
                    <TouchableOpacity
                        onPress={handleCreateGroup}
                        style={[styles.createBtn, { opacity: (groupName && selectedUsers.length > 0) ? 1 : 0.5 }]}
                        disabled={!groupName || selectedUsers.length === 0 || isCreating}
                    >
                        {isCreating ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={[styles.createBtnText, { color: colors.primary }]}>Create</Text>}
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView stickyHeaderIndices={[2]} showsVerticalScrollIndicator={false}>
                <View style={styles.inputSection}>
                    <TouchableOpacity
                        onPress={handlePickImage}
                        style={[styles.avatarUpload, { backgroundColor: colors.card, borderColor: colors.border }]}
                    >
                        {groupAvatar ? (
                            <Image source={{ uri: groupAvatar }} style={styles.avatarPreview} />
                        ) : (
                            <Ionicons name="camera" size={32} color={colors.subtext} />
                        )}
                    </TouchableOpacity>
                    <View style={styles.inputs}>
                        <TextInput
                            placeholder="Group Name"
                            placeholderTextColor={colors.subtext}
                            style={[styles.input, { color: colors.text, borderBottomColor: colors.border }]}
                            value={groupName}
                            onChangeText={setGroupName}
                        />
                        <TextInput
                            placeholder="Description (Optional)"
                            placeholderTextColor={colors.subtext}
                            style={[styles.input, { color: colors.text, borderBottomColor: colors.border }]}
                            value={groupDesc}
                            onChangeText={setGroupDesc}
                            multiline
                        />
                    </View>
                </View>

                <View style={styles.membersHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.subtext }]}>SELECT MEMBERS</Text>
                    <Text style={[styles.memberCount, { color: colors.primary }]}>{selectedUsers.length} selected</Text>
                </View>

                <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
                    <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Ionicons name="search" size={20} color={colors.subtext} style={{ marginRight: 8 }} />
                        <TextInput
                            placeholder="Search students"
                            placeholderTextColor={colors.subtext}
                            style={[styles.searchInput, { color: colors.text }]}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                </View>

                {loading ? (
                    <ActivityIndicator style={{ marginTop: 40 }} size="large" color={colors.primary} />
                ) : (
                    <FlatList
                        data={filteredUsers}
                        keyExtractor={(item) => item._id}
                        renderItem={renderItem}
                        scrollEnabled={false}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={{ color: colors.subtext }}>No students found</Text>
                            </View>
                        }
                    />
                )}
            </ScrollView>

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
    createBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    createBtnText: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    inputSection: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
    },
    avatarUpload: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 1,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        overflow: 'hidden',
    },
    avatarPreview: {
        width: '100%',
        height: '100%',
    },
    inputs: {
        flex: 1,
    },
    input: {
        paddingVertical: 8,
        borderBottomWidth: 1,
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_500Medium',
        marginBottom: 8,
    },
    membersHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    sectionTitle: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_700Bold',
        letterSpacing: 1,
    },
    memberCount: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    searchContainer: {
        padding: 16,
        paddingTop: 0,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        height: 44,
        fontFamily: 'PlusJakartaSans_400Regular',
        fontSize: 15,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 0.5,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    userSchool: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_400Regular',
        marginTop: 2,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        padding: 40,
    },
});
