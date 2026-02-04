import { notificationAPI } from '@/utils/apiClient';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

// Only set handler if not in Expo Go on Android (or handle gracefully)
try {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });
} catch (error) {
    console.warn('Notifications handler could not be set (likely Expo Go limitation):', error);
}

export const usePushNotifications = () => {
    const router = useRouter();

    useEffect(() => {
        // Handle notification taps (when app is in background/foreground)
        const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
            const data = response.notification.request.content.data;
            handleNotificationNavigation(data);
        });

        // Handle notification received while app is in foreground
        const foregroundSubscription = Notifications.addNotificationReceivedListener((notification) => {
            console.log('📬 Notification received in foreground:', notification.request.content.data);
        });

        return () => {
            subscription.remove();
            foregroundSubscription.remove();
        };
    }, [router]);

    const handleNotificationNavigation = (data: any) => {
        console.log('📬 Handling notification navigation:', data);

        if (!data || !data.type) return;

        try {
            switch (data.type) {
                case 'message':
                case 'new_message':
                    if (data.chatId) {
                        router.push(`/chat/${data.chatId}`);
                    }
                    break;

                case 'comment':
                case 'like':
                case 'post':
                    if (data.postId) {
                        router.push(`/post/${data.postId}`);
                    }
                    break;

                case 'order':
                case 'order_update':
                case 'order_payment':
                case 'order_cancelled':
                    if (data.orderId) {
                        router.push(`/market/orders`);
                    }
                    break;

                case 'follow':
                case 'user':
                    if (data.userId) {
                        router.push(`/user/${data.userId}`);
                    }
                    break;

                case 'call_incoming':
                    // Call notifications are handled by CallContext
                    break;

                case 'admin_action':
                case 'ban':
                case 'appeal':
                    // These are informational, no navigation needed
                    break;

                default:
                    console.log('📬 Unknown notification type:', data.type);
            }
        } catch (error) {
            console.error('📬 Error navigating from notification:', error);
        }
    };

    async function registerForPushNotificationsAsync() {
        let token;

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                return;
            }

            // Learn more about projectId:
            // https://docs.expo.dev/push-notifications/push-notifications-setup/#configure-projectId
            // In Expo Go, projectId is not strictly required but recommended in real build
            const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;

            if (!projectId) {
                console.warn('No projectId found in app.json. Push notifications will not work in production/standalone builds.');
                return;
            }

            token = (await Notifications.getExpoPushTokenAsync({
                projectId,
            })).data;


            // Send to backend
            try {
                await notificationAPI.registerPushToken(token);
            } catch (error) {
                console.error('Error registering push token:', error);
            }

        } else {
        }

        return token;
    }

    return {
        registerForPushNotificationsAsync,
    };
};
