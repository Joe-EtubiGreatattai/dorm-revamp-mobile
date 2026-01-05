import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface LibraryItemProps {
    id: string;
    title: string;
    subject: string;
    type: string;
    downloads: number;
    previewImage: string;
}

export default function LibraryItem({ item }: { item: LibraryItemProps }) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    return (
        <TouchableOpacity style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Image source={{ uri: item.previewImage }} style={styles.preview} contentFit="cover" />
            <View style={styles.info}>
                <View style={styles.badgeContainer}>
                    <View style={[styles.typeBadge, { backgroundColor: colors.primary + '20' }]}>
                        <Text style={[styles.typeText, { color: colors.primary }]}>{item.type}</Text>
                    </View>
                    <Text style={[styles.subject, { color: colors.subtext }]}>{item.subject}</Text>
                </View>
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
                <View style={styles.footer}>
                    <View style={styles.stats}>
                        <Ionicons name="download-outline" size={14} color={colors.subtext} />
                        <Text style={[styles.statsText, { color: colors.subtext }]}>{item.downloads}</Text>
                    </View>
                    <TouchableOpacity style={[styles.downloadBtn, { backgroundColor: colors.background }]}>
                        <Ionicons name="arrow-down" size={16} color={colors.text} />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
        padding: 12,
        marginBottom: 16,
        gap: 12,
    },
    preview: {
        width: 80,
        height: 100,
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
    },
    info: {
        flex: 1,
        justifyContent: 'space-between',
    },
    badgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    typeBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    typeText: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 10,
    },
    subject: {
        fontFamily: 'PlusJakartaSans_400Regular',
        fontSize: 12,
    },
    title: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 15,
        lineHeight: 20,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    stats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statsText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
    },
    downloadBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
