import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { notificationAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';

export default function NotificationDetailScreen() {
    const { id } = useLocalSearchParams();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [notification, setNotification] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchNotification = async () => {
            try {
                const { data } = await notificationAPI.getNotification(id as string);
                setNotification(data);
                // Mark as read when viewing
                if (!data.isRead) {
                    await notificationAPI.markAsRead(id as string);
                }
            } catch (error) {
                console.error('Error fetching notification:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (id) {
            fetchNotification();
        }
    }, [id]);

    if (isLoading) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!notification) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <Text style={{ color: colors.subtext }}>Notification not found</Text>
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
                    <Text style={{ color: colors.primary }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen
                options={{
                    headerTitle: 'Notification',
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
                            <Ionicons name="arrow-back" size={24} color={colors.text} />
                        </TouchableOpacity>
                    ),
                    headerTransparent: false,
                    headerStyle: { backgroundColor: colors.background },
                    headerTintColor: colors.text,
                    headerShadowVisible: false
                }}
            />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                        <Ionicons
                            name={notification.type === 'system' ? 'shield-checkmark' : 'notifications'}
                            size={32}
                            color={colors.primary}
                        />
                    </View>
                    <Text style={[styles.title, { color: colors.text }]}>{notification.title}</Text>
                    <Text style={[styles.date, { color: colors.subtext }]}>
                        {new Date(notification.createdAt).toLocaleString()}
                    </Text>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <View style={styles.messageContent}>
                    <Text style={[styles.message, { color: colors.text }]}>
                        {notification.message || notification.content}
                    </Text>
                </View>

                {notification.user && (
                    <View style={[styles.senderInfo, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.senderLabel, { color: colors.subtext }]}>Sent by:</Text>
                        <Text style={[styles.senderName, { color: colors.text }]}>{notification.user.name}</Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    scrollContent: {
        padding: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 22,
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        textAlign: 'center',
        marginBottom: 8,
    },
    date: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    divider: {
        height: 1,
        width: '100%',
        marginBottom: 24,
    },
    messageContent: {
        marginBottom: 32,
    },
    message: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_500Medium',
        lineHeight: 24,
    },
    backButton: {
        marginTop: 20,
    },
    senderInfo: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    senderLabel: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        marginBottom: 4,
    },
    senderName: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_700Bold',
    }
});
