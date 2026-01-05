import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ReportBug() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const [description, setDescription] = useState('');

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Report a Bug</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                <Text style={[styles.label, { color: colors.text }]}>What went wrong?</Text>
                <Text style={[styles.subLabel, { color: colors.subtext }]}>Please describe the issue in detail. What were you doing when it happened?</Text>

                <TextInput
                    style={[styles.textArea, { backgroundColor: colors.card, color: colors.text }]}
                    placeholder="Describe the bug..."
                    placeholderTextColor={colors.subtext}
                    multiline
                    value={description}
                    onChangeText={setDescription}
                />

                <TouchableOpacity style={[styles.uploadBtn, { borderColor: colors.border, borderStyle: 'dashed' }]}>
                    <Ionicons name="image-outline" size={24} color={colors.primary} />
                    <Text style={[styles.uploadText, { color: colors.primary }]}>Add Screenshot</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: description ? 1 : 0.5 }]} disabled={!description}>
                    <Text style={styles.submitText}>Submit Report</Text>
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
    },
    label: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
        marginBottom: 8,
    },
    subLabel: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
        marginBottom: 24,
        lineHeight: 20,
    },
    textArea: {
        height: 150,
        borderRadius: 16,
        padding: 16,
        paddingTop: 16,
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_500Medium',
        textAlignVertical: 'top',
        marginBottom: 24,
    },
    uploadBtn: {
        height: 60,
        borderRadius: 16,
        borderWidth: 1.5,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 32,
    },
    uploadText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
    submitBtn: {
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitText: {
        color: '#fff',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    }
});
