import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HelpCenter() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const renderFaq = (question: string, answer: string) => (
        <View style={[styles.faqCard, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Text style={[styles.question, { color: colors.text }]}>{question}</Text>
            <Text style={[styles.answer, { color: colors.subtext }]}>{answer}</Text>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Help Center</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                <Text style={[styles.sectionTitle, { color: colors.subtext }]}>Frequently Asked Questions</Text>

                {renderFaq('How do I reset my password?', 'Go to Settings > Personal Information > Security & Login to change your password.')}
                {renderFaq('Can I change my university?', 'University affiliation is verified during registration. Please contact support if you need to transfer.')}
                {renderFaq('How does voting work?', 'Only verified students can vote in their respective faculty or departmental elections.')}

                <TouchableOpacity
                    style={[styles.contactBtn, { backgroundColor: colors.primary }]}
                    onPress={() => router.push('/settings/support_chat')}
                >
                    <Ionicons name="chatbubbles" size={20} color="#fff" />
                    <Text style={styles.contactText}>Chat with Support</Text>
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
        fontSize: 13,
        marginBottom: 16,
        marginLeft: 4,
        textTransform: 'uppercase',
    },
    faqCard: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    question: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
        marginBottom: 8,
    },
    answer: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
        lineHeight: 22,
    },
    contactBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        marginTop: 24,
        gap: 8,
    },
    contactText: {
        color: '#fff',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    }
});
