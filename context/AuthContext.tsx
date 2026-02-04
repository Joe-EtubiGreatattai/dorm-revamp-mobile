import { useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { authAPI, setAuthToken } from '../utils/apiClient';
import { getSocket, initSocket } from '../utils/socket';

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
        priceAlerts?: boolean;
        orderUpdates?: boolean;
        electionReminders?: boolean;
        shares?: boolean;
    };
    privacySettings?: {
        appLock: boolean;
        onlineStatus: boolean;
        readReceipts: boolean;
    };
    blockedUsers?: string[];
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
    monetizationEnabled?: boolean;
    totalMonetizationEarnings?: number;
    kycStatus?: 'pending' | 'verified' | 'rejected' | 'none';
    identityNumber?: string;
    identityType?: 'bvn' | 'nin';
    kycDocument?: string;
    role: 'user' | 'admin' | 'ambassador';
    isBanned?: boolean;
    banReason?: string;
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
                // Parallelize startup tasks
                const [onboarding, token] = await Promise.all([
                    SecureStore.getItemAsync('hasSeenOnboarding'),
                    SecureStore.getItemAsync('token'),
                ]);

                setHasSeenOnboarding(onboarding === 'true');

                if (token) {
                    setAuthToken(token);
                    // Fetch user info - we don't block isLoading on this if we want fastest splash hide,
                    // but we need the user object for initial routing. Let's parallelize the rest.
                    const { data } = await authAPI.getMe();
                    // Non-blocking initialization - Init socket first so effect can pick it up
                    initSocket(token);
                    setUser(data);

                    registerForPushNotificationsAsync().catch(err =>
                        console.log('Push notification registration failed:', err)
                    );
                }
            } catch (error: any) {
                console.log('Error loading user:', error);
                if (error.response?.status === 403) {
                    // User is banned
                    Alert.alert(
                        'Account Banned',
                        error.response.data.reason || 'Your account has been banned.',
                        [{ text: 'OK', onPress: () => logout() }]
                    );
                } else {
                    await SecureStore.deleteItemAsync('token');
                    setAuthToken(null);
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadUser();
    }, []);

    // Socket listener for real-time ban
    useEffect(() => {
        const socket = getSocket();
        if (!socket) {
            console.log('AuthContext: No socket available for ban listener');
            return;
        }

        console.log('AuthContext: Attaching user:banned listener. Current ID:', socket.id || 'Connecting...');

        const handleBan = (data: { reason: string }) => {
            console.log('AuthContext: Received user:banned event', data);
            Alert.alert(
                'Account Banned',
                data.reason || 'Your account has been banned by an administrator.',
                [{ text: 'OK', onPress: () => logout() }]
            );
        };

        socket.on('user:banned', handleBan);

        return () => {
            console.log('AuthContext: Detaching user:banned listener');
            socket.off('user:banned', handleBan);
        };
    }, [user]);

    const login = React.useCallback(async (email: string, password: string) => {
        try {
            const { data } = await authAPI.login({ email, password });
            const { token, ...userData } = data;

            await SecureStore.setItemAsync('token', token);
            setAuthToken(token);
            // Initialize socket with token first
            initSocket(token);
            setUser(userData);
            // Register Push Token
            await registerForPushNotificationsAsync();

            router.replace('/(tabs)');
        } catch (error: any) {
            throw new Error(error.response?.data?.message || 'Login failed');
        }
    }, [router, registerForPushNotificationsAsync]);

    const register = React.useCallback(async (userData: any) => {
        try {
            const { data } = await authAPI.register(userData);
            const { token, ...userResponse } = data;

            await SecureStore.setItemAsync('token', token);
            setAuthToken(token);
            setUser(userResponse);

            // Register Push Token
            await registerForPushNotificationsAsync();

            router.replace('/(tabs)');
        } catch (error: any) {
            throw new Error(error.response?.data?.message || 'Registration failed');
        }
    }, [router, registerForPushNotificationsAsync]);

    const logout = React.useCallback(async () => {
        await SecureStore.deleteItemAsync('token');
        setAuthToken(null);
        setUser(null);
        router.replace('/');
    }, [router]);

    const refreshUser = React.useCallback(async () => {
        try {
            const { data } = await authAPI.getMe();
            setUser(data);
        } catch (error) {
            console.log('Error refreshing user:', error);
        }
    }, []);

    const completeOnboarding = React.useCallback(async () => {
        await SecureStore.setItemAsync('hasSeenOnboarding', 'true');
        setHasSeenOnboarding(true);
    }, []);

    const value = React.useMemo(() => ({
        user,
        isLoading,
        hasSeenOnboarding,
        login,
        register,
        logout,
        refreshUser,
        completeOnboarding
    }), [user, isLoading, hasSeenOnboarding, login, register, logout, refreshUser, completeOnboarding]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
