import { notificationAPI } from '@/utils/apiClient';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
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
            // https://docs.expo.dev/push-notifications/push-notifications-setup/#configure-projectid
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
