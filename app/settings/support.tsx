import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SupportSettings() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const renderItem = (icon: keyof typeof Ionicons.glyphMap, title: string, subtitle: string, onPress: () => void) => (
        <TouchableOpacity
            style={[styles.item, { backgroundColor: colors.card }]}
            onPress={onPress}
        >
            <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name={icon} size={24} color={colors.primary} />
            </View>
            <View style={styles.textContainer}>
                <Text style={[styles.itemTitle, { color: colors.text }]}>{title}</Text>
                <Text style={[styles.itemSubtitle, { color: colors.subtext }]}>{subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Support</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

                <Text style={[styles.sectionTitle, { color: colors.subtext }]}>Help & Contact</Text>
                {renderItem('help-buoy-outline', 'Help Center', 'FAQs and Guides', () => { })}
                {renderItem('mail-outline', 'Contact Us', 'Reach out to our support team', () => Linking.openURL('mailto:support@dormrevamp.com'))}
                {renderItem('logo-twitter', 'Twitter Support', '@DormRevampSupport', () => Linking.openURL('https://twitter.com'))}

                <Text style={[styles.sectionTitle, { color: colors.subtext, marginTop: 24 }]}>Feedback</Text>
                {renderItem('bug-outline', 'Report a Bug', 'Something not working?', () => { })}
                {renderItem('star-outline', 'Rate Us', 'Love the app? Let us know!', () => { })}

                <Text style={[styles.sectionTitle, { color: colors.subtext, marginTop: 24 }]}>Legal</Text>
                {renderItem('document-text-outline', 'Terms of Service', 'Read our terms', () => { })}
                {renderItem('shield-checkmark-outline', 'Privacy Policy', 'How we handle your data', () => { })}

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
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    },
    itemTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
        marginBottom: 2,
    },
    itemSubtitle: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 13,
    },
});
