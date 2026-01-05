import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { height } = Dimensions.get('window');

interface ActionSuccessModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm?: () => void;
    title: string;
    description: string;
    buttonText?: string;
    cancelText?: string;
    showCancel?: boolean;
    iconName?: keyof typeof Ionicons.glyphMap;
    iconColor?: string;
    isLoading?: boolean;
}

export default function ActionSuccessModal({
    visible,
    onClose,
    onConfirm,
    title,
    description,
    buttonText = "Got it",
    cancelText = "Cancel",
    showCancel = false,
    iconName = "checkmark-circle",
    iconColor,
    isLoading = false
}: ActionSuccessModalProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={styles.dismissArea}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                    <View style={styles.dragHandle} />

                    <View style={styles.iconContainer}>
                        <Ionicons
                            name={iconName}
                            size={72}
                            color={iconColor || colors.primary}
                        />
                    </View>

                    <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                    <Text style={[styles.description, { color: colors.subtext }]}>
                        {description}
                    </Text>

                    <View style={styles.buttonContainer}>
                        {showCancel && (
                            <TouchableOpacity
                                style={[styles.secondaryButton, { borderColor: colors.border }]}
                                onPress={onClose}
                            >
                                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>{cancelText}</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: colors.primary, flex: showCancel ? 1 : undefined, width: showCancel ? undefined : '100%' }]}
                            onPress={() => {
                                if (isLoading) return;
                                if (onConfirm) onConfirm();
                                else onClose();
                            }}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>{buttonText}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    dismissArea: {
        flex: 1,
    },
    modalContent: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 24,
        paddingBottom: 40,
        paddingTop: 12,
        alignItems: 'center',
        maxHeight: height * 0.7,
    },
    dragHandle: {
        width: 40,
        height: 5,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 2.5,
        marginBottom: 32,
    },
    iconContainer: {
        marginBottom: 24,
    },
    title: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 24,
        textAlign: 'center',
        marginBottom: 12,
    },
    description: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
        paddingHorizontal: 12,
    },
    buttonContainer: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },
    button: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 120, // Added to ensure single button looks good
    },
    buttonText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        color: '#fff',
        fontSize: 16,
    },
    secondaryButton: {
        flex: 1,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    secondaryButtonText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
});
