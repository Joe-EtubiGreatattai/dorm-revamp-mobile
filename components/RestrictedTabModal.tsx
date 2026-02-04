import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useRestrictions } from '@/context/RestrictionContext';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter, useSegments } from 'expo-router';
import React from 'react';
import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function RestrictedTabModal() {
    const { checkRestriction, restrictions } = useRestrictions();
    const segments = useSegments();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const insets = useSafeAreaInsets();

    // Calculate tab bar height (matches the height defined in (tabs)/_layout.tsx)
    const tabBarHeight = Platform.OS === 'ios' ? 88 : 64;

    // Map segments to tab names defined in backend enum
    // Tabs: market, housing, library, voting, feed
    // Segments: (tabs)/market, (tabs)/housing, etc.
    // Index 0: (tabs), Index 1: route name

    // We only care if we are inside (tabs)
    const isInsideTabs = segments[0] === '(tabs)';
    const currentTab = segments[1] || 'index'; // 'index' is Feed usually

    let activeRestriction = null;

    if (isInsideTabs) {
        let mappedTabName = '';
        if (currentTab === 'index') mappedTabName = 'feed';
        else mappedTabName = currentTab;

        activeRestriction = checkRestriction(mappedTabName);
    }

    // Logic to force navigation away OR just blocking cover?
    // User asked for "cover that tab with blur background".
    // So we show it if activeRestriction exists.

    if (!activeRestriction) return null;

    return (
        <View style={[styles.overlay, { bottom: tabBarHeight }]}>
            <BlurView intensity={90} tint={colorScheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill}>
                <View style={styles.content}>
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                            <Ionicons name="lock-closed" size={40} color={colors.primary} />
                        </View>
                        <Text style={[styles.title, { color: colors.text }]}>Access Restricted</Text>
                        <Text style={[styles.reason, { color: colors.subtext }]}>
                            {activeRestriction.reason || 'This feature is temporarily unavailable.'}
                        </Text>

                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>MAINTENANCE MODE</Text>
                        </View>
                    </View>
                </View>
            </BlurView>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        width: width * 0.85,
        padding: 24,
        borderRadius: 24,
        alignItems: 'center',
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 20,
        marginBottom: 8,
        textAlign: 'center',
    },
    reason: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 20,
    },
    badge: {
        backgroundColor: '#F59E0B',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        color: '#fff',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 12,
    }
});
