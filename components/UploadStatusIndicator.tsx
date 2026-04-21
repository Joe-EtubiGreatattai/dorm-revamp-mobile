import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';
import { useUpload } from '../context/UploadContext';
import { useColorScheme } from './useColorScheme';

export default function UploadStatusIndicator() {
    const { queue, retryAll, clearFailed } = useUpload();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    if (queue.length === 0) return null;

    const uploadingItems = queue.filter(item => item.status === 'uploading' || item.status === 'pending');
    const failedItems = queue.filter(item => item.status === 'failed');

    if (uploadingItems.length === 0 && failedItems.length === 0) return null;

    return (
        <View style={[styles.container, { top: insets.top + 60, backgroundColor: colors.card }]}>
            {uploadingItems.length > 0 ? (
                <View style={styles.content}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.text, { color: colors.text }]}>
                        Uploading {uploadingItems.length} {uploadingItems.length === 1 ? 'post' : 'posts'}...
                    </Text>
                </View>
            ) : failedItems.length > 0 ? (
                <View style={styles.content}>
                    <Ionicons name="warning" size={18} color={colors.error} />
                    <Text style={[styles.text, { color: colors.error }]}>
                        {failedItems.length} upload failed. Bad network?
                    </Text>
                    <View style={styles.actions}>
                        <TouchableOpacity onPress={retryAll} style={[styles.actionBtn, { backgroundColor: colors.primary }]}>
                            <Text style={styles.actionText}>Retry</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={clearFailed} style={styles.closeBtn}>
                            <Ionicons name="close" size={18} color={colors.subtext} />
                        </TouchableOpacity>
                    </View>
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        alignSelf: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 9999,
        flexDirection: 'row',
        alignItems: 'center',
        width: '90%',
        maxWidth: 400,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 10,
    },
    text: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        flex: 1,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    actionBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
    },
    actionText: {
        color: '#fff',
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    closeBtn: {
        padding: 4,
    },
});
