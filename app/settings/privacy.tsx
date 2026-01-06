import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { authAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PrivacySettings() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const { user, refreshUser } = useAuth();
    const settings = user?.privacySettings || {
        appLock: false,
        onlineStatus: true,
        readReceipts: true
    };

    const [appLock, setAppLock] = useState(settings.appLock);
    const [onlineStatus, setOnlineStatus] = useState(settings.onlineStatus);
    const [readReceipts, setReadReceipts] = useState(settings.readReceipts);

    const updatePrivacySetting = async (key: string, value: boolean) => {
        try {
            // Update UI immediately
            if (key === 'appLock') setAppLock(value);
            if (key === 'onlineStatus') setOnlineStatus(value);
            if (key === 'readReceipts') setReadReceipts(value);

            await authAPI.updateProfile({
                privacySettings: { [key]: value }
            });

            // refreshUser();
        } catch (error) {
            console.error('Failed to update privacy setting:', error);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Privacy & Data</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

                <Text style={[styles.sectionTitle, { color: colors.subtext }]}>Security</Text>
                <View style={[styles.section, { backgroundColor: colors.card }]}>
                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.label, { color: colors.text }]}>App Lock</Text>
                            <Text style={[styles.subLabel, { color: colors.subtext }]}>Require FaceID to open app</Text>
                        </View>
                        <Switch
                            value={appLock}
                            onValueChange={(val) => updatePrivacySetting('appLock', val)}
                            trackColor={{ false: colors.border, true: colors.primary }}
                        />
                    </View>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.subtext }]}>Activity Status</Text>
                <View style={[styles.section, { backgroundColor: colors.card }]}>
                    <View style={[styles.row, { borderBottomWidth: 1, borderColor: 'rgba(0,0,0,0.05)' }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.label, { color: colors.text }]}>Show Online Status</Text>
                            <Text style={[styles.subLabel, { color: colors.subtext }]}>Allow others to see when you're active</Text>
                        </View>
                        <Switch
                            value={onlineStatus}
                            onValueChange={(val) => updatePrivacySetting('onlineStatus', val)}
                            trackColor={{ false: colors.border, true: colors.primary }}
                        />
                    </View>
                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.label, { color: colors.text }]}>Read Receipts</Text>
                        </View>
                        <Switch
                            value={readReceipts}
                            onValueChange={(val) => updatePrivacySetting('readReceipts', val)}
                            trackColor={{ false: colors.border, true: colors.primary }}
                        />
                    </View>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.subtext }]}>Data</Text>
                <View style={[styles.section, { backgroundColor: colors.card }]}>
                    <TouchableOpacity
                        onPress={() => router.push('/settings/blocked')}
                        style={styles.actionRow}
                    >
                        <Text style={[styles.label, { color: colors.text }]}>Blocked Users</Text>
                        <View style={styles.badge}>
                            <Text style={[styles.badgeText, { color: colors.subtext }]}>{user?.blockedUsers?.length || 0}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
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
        padding: 24,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 13,
        marginBottom: 12,
        marginLeft: 4,
        marginTop: 24,
        textTransform: 'uppercase',
    },
    section: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    label: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 15,
        flex: 1,
    },
    subLabel: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
        marginTop: 4,
        paddingRight: 16,
    },
    badge: {
        backgroundColor: 'rgba(0,0,0,0.05)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        marginRight: 8,
    },
    badgeText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 12,
    },
});
