import ActionSuccessModal from '@/components/ActionSuccessModal';
import CustomLoader from '@/components/CustomLoader';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useHaptics } from '@/context/HapticsContext';
import { aiAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AISettingsScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { user, refreshUser } = useAuth();
    const { triggerHaptic } = useHaptics();

    const [isEnabled, setIsEnabled] = useState(user?.aiSettings?.enabled || false);
    const [aiName, setAiName] = useState(user?.aiSettings?.aiName || 'AI Assistant');
    const [customContext, setCustomContext] = useState(user?.aiSettings?.customContext || '');
    const [isSaving, setIsSaving] = useState(false);
    const [showNamingModal, setShowNamingModal] = useState(false);
    const nameInputRef = useRef<TextInput>(null);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await aiAPI.updateSettings({
                enabled: isEnabled,
                aiName,
                customContext
            });
            await refreshUser();
            triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
            router.back();
        } catch (error) {
            console.error('Error saving AI settings:', error);
            triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>AI Auto-Responder</Text>
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={isSaving}
                    style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                >
                    <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                <View style={[styles.infoCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
                    <Ionicons name="sparkles" size={24} color={colors.primary} />
                    <Text style={[styles.infoText, { color: colors.text }]}>
                        Let your AI handle inquiries when you're busy. Especially useful for vendors to answer product questions.
                    </Text>
                </View>

                <View style={[styles.section, { backgroundColor: colors.card }]}>
                    <View style={styles.optionRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.label, { color: colors.text }]}>Enable Auto-Responder</Text>
                            <Text style={[styles.helperText, { color: colors.subtext }]}>AI will respond to messages on your behalf</Text>
                        </View>
                        <Switch
                            value={isEnabled}
                            onValueChange={(value) => {
                                setIsEnabled(value);
                                if (value && (aiName === 'AI Assistant' || !aiName)) {
                                    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                                    setTimeout(() => {
                                        nameInputRef.current?.focus();
                                    }, 100);
                                    setShowNamingModal(true);
                                }
                            }}
                            trackColor={{ false: colors.border, true: colors.primary }}
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.sectionTitle, { color: colors.subtext }]}>AI Name</Text>
                    <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <TextInput
                            ref={nameInputRef}
                            value={aiName}
                            onChangeText={setAiName}
                            style={[styles.input, { color: colors.text }]}
                            placeholder="e.g. Shop Assistant"
                            placeholderTextColor={colors.subtext}
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.sectionTitle, { color: colors.subtext }]}>Custom Context</Text>
                    <Text style={[styles.helperText, { color: colors.subtext, marginBottom: 8 }]}>
                        Tell your AI about yourself or your business so it can respond accurately.
                    </Text>
                    <View style={[styles.inputContainer, styles.textAreaContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <TextInput
                            value={customContext}
                            onChangeText={setCustomContext}
                            style={[styles.input, styles.textArea, { color: colors.text }]}
                            placeholder="e.g. I sell hand-made jewelry. Delivery takes 2-3 days. No refunds after 24 hours..."
                            placeholderTextColor={colors.subtext}
                            multiline
                            numberOfLines={6}
                            textAlignVertical="top"
                        />
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {isSaving && <CustomLoader message="Saving settings..." />}

            <ActionSuccessModal
                visible={showNamingModal}
                onClose={() => setShowNamingModal(false)}
                title="AI Naming"
                description="Please give your AI Assistant a name so users know who is responding. This makes the conversation feel more personal!"
                iconName="sparkles"
            />
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
    saveBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    saveBtnText: {
        color: '#fff',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
    content: {
        padding: 24,
    },
    infoCard: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 24,
        alignItems: 'center',
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
        lineHeight: 20,
    },
    section: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    label: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
        marginBottom: 4,
    },
    sectionTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
        marginBottom: 12,
        marginLeft: 4,
        textTransform: 'uppercase',
    },
    helperText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
    },
    inputGroup: {
        marginBottom: 24,
    },
    inputContainer: {
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 16,
    },
    input: {
        height: 56,
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 15,
    },
    textAreaContainer: {
        paddingVertical: 12,
    },
    textArea: {
        height: 120,
        paddingTop: 0,
    },
});
