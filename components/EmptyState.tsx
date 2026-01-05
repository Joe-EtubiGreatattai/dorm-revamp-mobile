import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useColorScheme } from './useColorScheme';

interface EmptyStateProps {
    title?: string;
    description?: string;
    icon?: keyof typeof Ionicons.glyphMap;
    actionLabel?: string;
    onAction?: () => void;
    style?: StyleProp<ViewStyle>;
}

export default function EmptyState({
    title = "No Data Found",
    description = "It looks like there's nothing here yet.",
    icon = "folder-open-outline",
    actionLabel,
    onAction,
    style
}: EmptyStateProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    return (
        <View style={[styles.container, style]}>
            <View style={[styles.iconContainer, { backgroundColor: colors.card }]}>
                <Ionicons name={icon} size={48} color={colors.subtext} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.description, { color: colors.subtext }]}>{description}</Text>

            {actionLabel && onAction && (
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.primary }]}
                    onPress={onAction}
                >
                    <Text style={styles.buttonText}>{actionLabel}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        minHeight: 300,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    title: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 20,
        marginBottom: 8,
        textAlign: 'center',
    },
    description: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 22,
        maxWidth: 280,
    },
    button: {
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 30,
    },
    buttonText: {
        color: '#fff',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    }
});
