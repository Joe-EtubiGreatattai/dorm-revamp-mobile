import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SecuritySettings() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [twoFactor, setTwoFactor] = useState(false);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Security & Login</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

                <Text style={[styles.sectionTitle, { color: colors.subtext }]}>Login</Text>
                <TouchableOpacity style={[styles.actionRow, { backgroundColor: colors.card }]}>
                    <Text style={[styles.actionLabel, { color: colors.text }]}>Change Password</Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
                </TouchableOpacity>

                <View style={[styles.actionRow, { backgroundColor: colors.card, marginTop: 12 }]}>
                    <View>
                        <Text style={[styles.actionLabel, { color: colors.text }]}>Two-Factor Authentication</Text>
                        <Text style={[styles.actionSub, { color: colors.subtext }]}>Secure your account with 2FA</Text>
                    </View>
                    <Switch
                        value={twoFactor}
                        onValueChange={setTwoFactor}
                        trackColor={{ false: colors.border, true: colors.primary }}
                    />
                </View>

                <Text style={[styles.sectionTitle, { color: colors.subtext, marginTop: 32 }]}>Danger Zone</Text>
                <TouchableOpacity style={[styles.actionRow, { backgroundColor: '#fee2e2' }]}>
                    <Text style={[styles.actionLabel, { color: '#ef4444' }]}>Delete Account</Text>
                </TouchableOpacity>

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
        fontSize: 14,
        marginBottom: 16,
        marginLeft: 4,
        textTransform: 'uppercase',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
    },
    actionLabel: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 15,
    },
    actionSub: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
        marginTop: 2,
    },
});
