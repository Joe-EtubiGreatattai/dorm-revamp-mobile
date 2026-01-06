import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useHaptics } from '@/context/HapticsContext';
import { useThemeHandlers } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AppPreferences() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { setTheme, themePreference } = useThemeHandlers();
    const { hapticsEnabled, setHapticsEnabled, triggerHaptic } = useHaptics();



    const renderOption = (label: string, value: string, selected: boolean, onSelect: () => void) => (
        <TouchableOpacity
            style={[styles.optionRow, { borderBottomColor: colors.border }]}
            onPress={onSelect}
        >
            <Text style={[styles.optionLabel, { color: colors.text }]}>{label}</Text>
            {selected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Preferences</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

                <Text style={[styles.sectionTitle, { color: colors.subtext }]}>Appearance</Text>
                <View style={[styles.section, { backgroundColor: colors.card }]}>
                    {renderOption('System Default', 'System', themePreference === 'system', () => setTheme('system'))}
                    {renderOption('Light Mode', 'Light', themePreference === 'light', () => setTheme('light'))}
                    {renderOption('Dark Mode', 'Dark', themePreference === 'dark', () => setTheme('dark'))}
                    <View style={styles.optionRow}>
                        <Text style={[styles.optionLabel, { color: colors.text }]}>Midnight Theme (OLED)</Text>
                        <Switch trackColor={{ false: colors.border, true: colors.primary }} />
                    </View>
                </View>



                <Text style={[styles.sectionTitle, { color: colors.subtext, marginTop: 24 }]}>Interaction</Text>
                <View style={[styles.section, { backgroundColor: colors.card }]}>
                    <View style={styles.optionRow}>
                        <View>
                            <Text style={[styles.optionLabel, { color: colors.text }]}>Haptic Feedback</Text>
                            <Text style={[styles.helperText, { color: colors.subtext }]}>Vibrate on taps and interactions</Text>
                        </View>
                        <Switch
                            value={hapticsEnabled}
                            onValueChange={(val) => {
                                setHapticsEnabled(val);
                                if (val) triggerHaptic(undefined, true);
                            }}
                            trackColor={{ false: colors.border, true: colors.primary }}
                        />
                    </View>
                </View>

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
    section: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    optionLabel: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 15,
    },
    helperText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
        marginTop: 4,
    },
});
