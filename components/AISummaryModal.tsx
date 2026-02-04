import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Dimensions, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useColorScheme } from './useColorScheme';

const { height } = Dimensions.get('window');

interface AISummaryModalProps {
    visible: boolean;
    onClose: () => void;
    summary: string;
    onSave?: () => void;
    isSaving?: boolean;
}

export default function AISummaryModal({
    visible,
    onClose,
    summary,
    onSave,
    isSaving = false
}: AISummaryModalProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const renderFormattedContent = (text: string) => {
        if (!text) return null;

        // Simple Markdown-ish formatting
        const lines = text.split('\n');
        return lines.map((line, index) => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return <View key={index} style={{ height: 12 }} />;

            // Headers (e.g., ### Title)
            if (trimmedLine.startsWith('###')) {
                return (
                    <Text key={index} style={[styles.header3, { color: colors.text }]}>
                        {trimmedLine.replace(/^###\s*/, '')}
                    </Text>
                );
            }
            if (trimmedLine.startsWith('##')) {
                return (
                    <Text key={index} style={[styles.header2, { color: colors.text }]}>
                        {trimmedLine.replace(/^##\s*/, '')}
                    </Text>
                );
            }
            if (trimmedLine.startsWith('#')) {
                return (
                    <Text key={index} style={[styles.header1, { color: colors.text }]}>
                        {trimmedLine.replace(/^#\s*/, '')}
                    </Text>
                );
            }

            // Bold text (**text**) - simplistic version
            const parts = trimmedLine.split(/(\*\*.*?\*\*)/g);
            const content = parts.map((part, pIndex) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return (
                        <Text key={pIndex} style={styles.boldText}>
                            {part.slice(2, -2)}
                        </Text>
                    );
                }
                return part;
            });

            // List items (e.g., * Item or - Item)
            if (trimmedLine.startsWith('*') || trimmedLine.startsWith('-') || trimmedLine.startsWith('•')) {
                return (
                    <View key={index} style={styles.listItem}>
                        <Text style={[styles.bulletPoint, { color: colors.primary }]}>•</Text>
                        <Text style={[styles.paragraph, { color: colors.text, flex: 1 }]}>
                            {content}
                        </Text>
                    </View>
                );
            }

            return (
                <Text key={index} style={[styles.paragraph, { color: colors.text }]}>
                    {content}
                </Text>
            );
        });
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                    <View style={styles.dragHandle} />

                    <View style={styles.header}>
                        <View style={styles.titleContainer}>
                            <Ionicons name="sparkles" size={24} color={colors.primary} />
                            <Text style={[styles.title, { color: colors.text }]}>AI Summary</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color={colors.subtext} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {renderFormattedContent(summary)}
                    </ScrollView>

                    <View style={[styles.footer, { borderTopColor: colors.border }]}>
                        {onSave && (
                            <TouchableOpacity
                                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                                onPress={onSave}
                                disabled={isSaving}
                            >
                                <Ionicons name="bookmark-outline" size={20} color="#fff" />
                                <Text style={styles.saveBtnText}>{isSaving ? 'Saving...' : 'Save for Later'}</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[styles.doneBtn, { borderColor: colors.border }]}
                            onPress={onClose}
                        >
                            <Text style={[styles.doneBtnText, { color: colors.text }]}>Done</Text>
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
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: height * 0.85,
        paddingBottom: 20,
    },
    dragHandle: {
        width: 40,
        height: 5,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 2.5,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 22,
    },
    closeBtn: {
        padding: 4,
    },
    scrollView: {
        paddingHorizontal: 24,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    paragraph: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 16,
        lineHeight: 26,
        marginBottom: 8,
    },
    header1: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 24,
        marginTop: 16,
        marginBottom: 12,
    },
    header2: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 20,
        marginTop: 16,
        marginBottom: 8,
    },
    header3: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
        marginTop: 12,
        marginBottom: 6,
    },
    boldText: {
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    listItem: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 8,
    },
    bulletPoint: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: -2,
    },
    footer: {
        padding: 24,
        flexDirection: 'row',
        gap: 12,
        borderTopWidth: 1,
    },
    saveBtn: {
        flex: 1,
        height: 54,
        borderRadius: 27,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    saveBtnText: {
        color: '#fff',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
    doneBtn: {
        flex: 1,
        height: 54,
        borderRadius: 27,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    doneBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    }
});
