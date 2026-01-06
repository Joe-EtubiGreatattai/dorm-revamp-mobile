import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { authAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotificationSettings() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { user } = useAuth();

    // Load initial settings from user data
    const [pauseAll, setPauseAll] = useState(false);
    // Determine defaults safely
    const settings = user?.notificationSettings || {};

    const [mentions, setMentions] = useState(settings.mentions ?? true);
    const [replies, setReplies] = useState(settings.comments ?? true);
    const [followers, setFollowers] = useState(settings.follows ?? true);
    const [messages, setMessages] = useState(settings.messages ?? true);
    const [shares, setShares] = useState(settings.shares ?? true);

    // UI Only (not in backend model yet)
    const [priceAlerts, setPriceAlerts] = useState(settings.priceAlerts ?? true);
    const [orderUpdates, setOrderUpdates] = useState(settings.orderUpdates ?? true);
    const [electionReminders, setElectionReminders] = useState(settings.electionReminders ?? true);

    const updateSetting = async (key: string, value: boolean) => {
        try {
            // We update local state immediately for UI 
            if (key === 'mentions') setMentions(value);
            if (key === 'comments') setReplies(value);
            if (key === 'follows') setFollowers(value);
            if (key === 'messages') setMessages(value);
            if (key === 'shares') setShares(value);
            if (key === 'priceAlerts') setPriceAlerts(value);
            if (key === 'orderUpdates') setOrderUpdates(value);
            if (key === 'electionReminders') setElectionReminders(value);

            // Debounce or fire and forget? Let's just fire.
            await authAPI.updateProfile({
                notificationSettings: {
                    [key]: value
                }
            });
            // refreshUser(); // Optional: Sync context
        } catch (error) {
            console.log('Failed to update setting', error);
        }
    };

    const renderToggle = (label: string, value: boolean, onValueChange: (val: boolean) => void, description?: string) => (
        <View style={[styles.toggleRow, { borderBottomColor: 'rgba(0,0,0,0.05)' }]}>
            <View style={{ flex: 1, paddingRight: 16 }}>
                <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
                {description && <Text style={[styles.description, { color: colors.subtext }]}>{description}</Text>}
            </View>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: colors.border, true: colors.primary }}
                disabled={pauseAll && label !== 'Pause All Notifications'}
            />
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

                <View style={[styles.card, { backgroundColor: colors.card, marginBottom: 24 }]}>
                    {renderToggle('Pause All Notifications', pauseAll, setPauseAll, 'Temporarily disable all push notifications.')}
                </View>

                {/* Community */}
                <Text style={[styles.sectionTitle, { color: colors.subtext }]}>Community</Text>
                <View style={[styles.card, { backgroundColor: colors.card, marginBottom: 24 }]}>
                    {renderToggle('Mentions', mentions, (val) => updateSetting('mentions', val))}
                    {renderToggle('Replies', replies, (val) => updateSetting('comments', val))}
                    {renderToggle('New Followers', followers, (val) => updateSetting('follows', val))}
                    {renderToggle('Shares', shares, (val) => updateSetting('shares', val))}
                </View>

                {/* Marketplace */}
                <Text style={[styles.sectionTitle, { color: colors.subtext }]}>Marketplace</Text>
                <View style={[styles.card, { backgroundColor: colors.card, marginBottom: 24 }]}>
                    {renderToggle('Price Alerts', priceAlerts, (val) => updateSetting('priceAlerts', val))}
                    {renderToggle('Order Updates', orderUpdates, (val) => updateSetting('orderUpdates', val))}
                    {renderToggle('Direct Messages', messages, (val) => updateSetting('messages', val))}
                </View>

                {/* Elections */}
                <Text style={[styles.sectionTitle, { color: colors.subtext }]}>Elections</Text>
                <View style={[styles.card, { backgroundColor: colors.card }]}>
                    {renderToggle('Voting Reminders', electionReminders, (val) => updateSetting('electionReminders', val))}
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
        textTransform: 'uppercase',
    },
    card: {
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    label: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 15,
    },
    description: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
        marginTop: 4,
    },
});
