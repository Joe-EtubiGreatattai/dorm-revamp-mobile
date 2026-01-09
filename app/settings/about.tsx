import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function About() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>About</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

                <View style={styles.logoSection}>
                    <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
                        <Ionicons name="school" size={40} color="#fff" />
                    </View>
                    <Text style={[styles.appName, { color: colors.text }]}>Dorm</Text>
                    <Text style={[styles.version, { color: colors.subtext }]}>Version 1.0.0 (Build 124)</Text>
                    <View style={[styles.badge, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.badgeText, { color: colors.primary }]}>Early Access</Text>
                    </View>
                </View>

                <Text style={[styles.description, { color: colors.text }]}>
                    Dorm is the ultimate student companion app designed to simplify campus life. From voting to marketplaces, we've got you covered.
                </Text>

                <View style={[styles.section, { backgroundColor: colors.card }]}>
                    <TouchableOpacity
                        style={[styles.linkRow, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}
                        onPress={() => Linking.openURL('https://dorm.com')}
                    >
                        <Text style={[styles.linkLabel, { color: colors.text }]}>Website</Text>
                        <Ionicons name="open-outline" size={20} color={colors.subtext} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.linkRow, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}
                        onPress={() => Linking.openURL('https://twitter.com')}
                    >
                        <Text style={[styles.linkLabel, { color: colors.text }]}>Follow us on X</Text>
                        <Ionicons name="logo-twitter" size={20} color={colors.subtext} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.linkRow}
                        onPress={() => Linking.openURL('https://instagram.com')}
                    >
                        <Text style={[styles.linkLabel, { color: colors.text }]}>Instagram</Text>
                        <Ionicons name="logo-instagram" size={20} color={colors.subtext} />
                    </TouchableOpacity>
                </View>

                <Text style={[styles.footerText, { color: colors.subtext }]}>
                    Built with ❤️ by the Dorm Team using Expo & React Native.
                </Text>
                <Text style={[styles.footerText, { color: colors.subtext, marginTop: 4 }]}>
                    © 2026 Dorm Inc.
                </Text>

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
    logoSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logoBox: {
        width: 80,
        height: 80,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        transform: [{ rotate: '-10deg' }]
    },
    appName: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 24,
        marginBottom: 4,
    },
    version: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
        marginBottom: 16,
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
    },
    badgeText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 12,
    },
    description: {
        textAlign: 'center',
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 15,
        lineHeight: 24,
        marginBottom: 32,
        paddingHorizontal: 8,
    },
    section: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 32,
    },
    linkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    linkLabel: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 15,
    },
    footerText: {
        textAlign: 'center',
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
});
