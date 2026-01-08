import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { logout, user } = useAuth();

    const getAvatarUri = (avatarPath?: string) => {
        if (!avatarPath) return null;
        if (avatarPath.startsWith('http')) return avatarPath;
        const normalizedPath = avatarPath.replace(/\\/g, '/');
        return `${API_URL.replace('/api', '')}/${normalizedPath}`;
    };

    const ProfileAvatar = ({ size = 60 }: { size?: number }) => {
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

    const renderSettingItem = (
        icon: keyof typeof Ionicons.glyphMap,
        label: string,
        path: string,
        color: string = colors.primary,
        isDestructive: boolean = false
    ) => (
        <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
            onPress={() => router.push(path as any)}
        >
            <View style={[styles.iconBox, { backgroundColor: isDestructive ? '#fee2e2' : color + '15' }]}>
                <Ionicons name={icon} size={20} color={isDestructive ? '#ef4444' : color} />
            </View>
            <Text style={[styles.settingLabel, { color: isDestructive ? '#ef4444' : colors.text }]}>{label}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

                {/* Profile Card */}
                <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
                    <ProfileAvatar size={60} />
                    <View style={styles.profileInfo}>
                        <Text style={[styles.name, { color: colors.text }]}>{user?.name || 'User'}</Text>
                        <Text style={[styles.school, { color: colors.subtext }]}>{user?.university || 'University'}</Text>
                        <View style={[styles.badge, { backgroundColor: '#dcfce7' }]}>
                            <Text style={[styles.badgeText, { color: '#166534' }]}>Verified Student</Text>
                        </View>
                    </View>
                </View>

                {/* Account */}
                <Text style={[styles.sectionTitle, { color: colors.subtext }]}>Account</Text>
                <View style={[styles.section, { backgroundColor: colors.card }]}>
                    {renderSettingItem('person-outline', 'Personal Information', '/settings/account')}
                    {renderSettingItem('cash-outline', 'Monetization', '/settings/monetization', '#f59e0b')}
                    {renderSettingItem('shield-checkmark-outline', 'Security & Login', '/settings/security')}
                </View>

                {/* App Settings */}
                <Text style={[styles.sectionTitle, { color: colors.subtext }]}>App Settings</Text>
                <View style={[styles.section, { backgroundColor: colors.card }]}>
                    {renderSettingItem('notifications-outline', 'Notifications', '/settings/notifications', '#8b5cf6')}
                    {renderSettingItem('color-palette-outline', 'Appearance', '/settings/preferences', '#f59e0b')}
                    {renderSettingItem('lock-closed-outline', 'Privacy', '/settings/privacy', '#10b981')}
                </View>

                {/* Support */}
                <Text style={[styles.sectionTitle, { color: colors.subtext }]}>Support</Text>
                <View style={[styles.section, { backgroundColor: colors.card }]}>
                    {renderSettingItem('help-buoy-outline', 'Help Center', '/settings/help', '#3b82f6')}
                    {renderSettingItem('bug-outline', 'Report a Bug', '/settings/bug_report', '#ef4444')}
                    {renderSettingItem('information-circle-outline', 'About Dorm Revamp', '/settings/about', '#6b7280')}
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={[styles.version, { color: colors.subtext }]}>Version 1.0.0 (Build 124)</Text>
                    <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
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
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 24,
        marginBottom: 32,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#eee',
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
        marginLeft: 16,
    },
    name: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
        marginBottom: 4,
    },
    school: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 13,
        marginBottom: 8,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    badgeText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 10,
    },
    editBtn: {
        padding: 8,
    },
    sectionTitle: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 13,
        marginBottom: 12,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    section: {
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 24,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    settingLabel: {
        flex: 1,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 15,
    },
    footer: {
        alignItems: 'center',
        marginTop: 20,
        gap: 16,
    },
    version: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
    },
    logoutBtn: {
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    logoutText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 15,
        color: '#ef4444',
    },
});
