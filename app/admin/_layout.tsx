import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { TouchableOpacity } from 'react-native';

export default function AdminLayout() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const router = useRouter();
    const { user } = useAuth();

    // Extra safety: Redirect if not admin
    React.useEffect(() => {
        if (user && user.role !== 'admin') {
            router.replace('/(tabs)');
        }
    }, [user, router]);

    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.text,
                headerTitleStyle: {
                    fontFamily: 'PlusJakartaSans_700Bold',
                },
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                ),
            }}
        >
            <Stack.Screen
                name="index"
                options={{
                    title: 'Admin Dashboard',
                    headerLargeTitle: true,
                }}
            />
            <Stack.Screen
                name="deduct-funds"
                options={{
                    title: 'Deduct Funds',
                    presentation: 'modal'
                }}
            />
        </Stack>
    );
}
