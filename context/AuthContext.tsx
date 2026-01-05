import { useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { authAPI, setAuthToken } from '../utils/apiClient';
import { initSocket } from '../utils/socket';

type User = {
    _id: string;
    name: string;
    email: string;
    university: string;
    avatar?: string;
    bio?: string;
    notificationSettings?: {
        mentions?: boolean;
        comments?: boolean;
        follows?: boolean;
        messages?: boolean;
    };
    walletBalance: number;
    escrowBalance: number;
    bankAccounts?: {
        _id: string;
        bankName: string;
        accountNumber: string;
        accountName: string;
        isDefault?: boolean;
    }[];
    followers?: string[];
    following?: string[];
};

type AuthContextType = {
    user: User | null;
    isLoading: boolean;
    hasSeenOnboarding: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (userData: any) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    completeOnboarding: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: true,
    hasSeenOnboarding: false,
    login: async () => { },
    register: async () => { },
    logout: async () => { },
    refreshUser: async () => { },
    completeOnboarding: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
    const router = useRouter();
    const segments = useSegments();

    // Push Notification Hook
    const { registerForPushNotificationsAsync } = usePushNotifications();

    useEffect(() => {
        const loadUser = async () => {
            try {
                const onboarding = await SecureStore.getItemAsync('hasSeenOnboarding');
                setHasSeenOnboarding(onboarding === 'true');

                const token = await SecureStore.getItemAsync('token');
                if (token) {
                    setAuthToken(token);
                    const { data } = await authAPI.getMe();
                    setUser(data);
                    // Initialize socket with token
                    initSocket(token);
                    // Register Push Token on session restore too
                    registerForPushNotificationsAsync();
                }
            } catch (error) {
                console.log('Error loading user:', error);
                await SecureStore.deleteItemAsync('token');
                setAuthToken(null);
            } finally {
                setIsLoading(false);
            }
        };

        loadUser();
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const { data } = await authAPI.login({ email, password });
            const { token, ...userData } = data;

            await SecureStore.setItemAsync('token', token);
            setAuthToken(token);
            setUser(userData);

            // Initialize socket with token
            initSocket(token);
            // Register Push Token
            registerForPushNotificationsAsync();

            router.replace('/(tabs)');
        } catch (error: any) {
            throw new Error(error.response?.data?.message || 'Login failed');
        }
    };

    const register = async (userData: any) => {
        try {
            const { data } = await authAPI.register(userData);
            const { token, ...userResponse } = data;

            await SecureStore.setItemAsync('token', token);
            setAuthToken(token);
            setUser(userResponse);

            // Register Push Token
            registerForPushNotificationsAsync();

            router.replace('/(tabs)');
        } catch (error: any) {
            throw new Error(error.response?.data?.message || 'Registration failed');
        }
    };

    const logout = async () => {
        await SecureStore.deleteItemAsync('token');
        setAuthToken(null);
        setUser(null);
        router.replace('/');
    };

    const refreshUser = async () => {
        try {
            const { data } = await authAPI.getMe();
            setUser(data);
        } catch (error) {
            console.log('Error refreshing user:', error);
        }
    };

    const completeOnboarding = async () => {
        await SecureStore.setItemAsync('hasSeenOnboarding', 'true');
        setHasSeenOnboarding(true);
    };

    return (
        <AuthContext.Provider value={{
            user,
            isLoading,
            hasSeenOnboarding,
            login,
            register,
            logout,
            refreshUser,
            completeOnboarding
        }}>
            {children}
        </AuthContext.Provider>
    );
};
