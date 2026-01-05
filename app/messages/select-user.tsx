import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { authAPI, chatAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SelectUserScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { user: currentUser } = useAuth();

    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [creatingChat, setCreatingChat] = useState(false);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const { data } = await authAPI.getUsers();
                // Filter users by same university and exclude current user
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

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.university && u.university.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleSelectUser = async (userId: string) => {
        if (creatingChat) return;
        setCreatingChat(true);
        try {
            const { data } = await chatAPI.createConversation(userId);
            router.push(`/chat/${data._id || data.id}`);
        } catch (error) {
            console.log('Error creating conversation:', error);
            alert('Failed to start chat');
        } finally {
            setCreatingChat(false);
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.userItem, { borderBottomColor: colors.border }]}
            onPress={() => handleSelectUser(item._id)}
            disabled={creatingChat}
        >
            <Image
                source={{ uri: item.avatar || 'https://ui-avatars.com/api/?name=' + item.name }}
                style={styles.avatar}
            />
            <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.userSchool, { color: colors.subtext }]}>{item.university}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={{ paddingTop: insets.top, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>New Message</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.searchContainer}>
                    <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Ionicons name="search" size={20} color={colors.subtext} style={{ marginRight: 8 }} />
                        <TextInput
                            placeholder="Search students"
                            placeholderTextColor={colors.subtext}
                            style={[styles.searchInput, { color: colors.text }]}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoFocus
                        />
                    </View>
                </View>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredUsers}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="people-outline" size={64} color={colors.subtext} />
                            <Text style={[styles.emptyText, { color: colors.subtext }]}>
                                {searchQuery ? 'No students found matching your search' : 'No other students found in your school'}
                            </Text>
                        </View>
                    }
                />
            )}

            {creatingChat && (
                <View style={[StyleSheet.absoluteFill, styles.overlay]}>
                    <ActivityIndicator size="large" color="#fff" />
                </View>
            )}
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
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: {
        paddingBottom: 40,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 0.5,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 16,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    userSchool: {
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_400Regular',
        marginTop: 2,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
        paddingHorizontal: 40,
    },
    emptyText: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_500Medium',
        textAlign: 'center',
        marginTop: 16,
        lineHeight: 24,
    },
    overlay: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    }
});
