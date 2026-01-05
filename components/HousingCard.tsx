import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface HousingProps {
    id: string;
    title: string;
    price: number;
    address: string;
    images: string[];
    amenities: string[];
    description: string;
}

export default function HousingCard({ house }: { house: HousingProps }) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    return (
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Image source={{ uri: house.images[0] }} style={styles.image} contentFit="cover" />
            <View style={styles.info}>
                <View style={styles.header}>
                    <Text style={[styles.price, { color: colors.primary }]}>₦{house.price.toLocaleString()}/mo</Text>
                    <TouchableOpacity>
                        <Ionicons name="bookmark-outline" size={20} color={colors.subtext} />
                    </TouchableOpacity>
                </View>
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{house.title}</Text>
                <View style={styles.location}>
                    <Ionicons name="location-outline" size={14} color={colors.subtext} />
                    <Text style={[styles.address, { color: colors.subtext }]}>{house.address}</Text>
                </View>
                <View style={styles.amenities}>
                    {house.amenities.slice(0, 3).map((amt, i) => (
                        <View key={amt} style={[styles.amtBadge, { backgroundColor: colors.background }]}>
                            <Text style={[styles.amtText, { color: colors.subtext }]}>{amt}</Text>
                        </View>
                    ))}
                    {house.amenities.length > 3 && (
                        <Text style={[styles.amtText, { color: colors.subtext }]}>+{house.amenities.length - 3}</Text>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    image: {
        width: '100%',
        height: 200,
        backgroundColor: '#f1f5f9',
    },
    info: {
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    price: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 20,
        fontWeight: 'bold',
    },
    title: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    location: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 12,
    },
    address: {
        fontFamily: 'PlusJakartaSans_400Regular',
        fontSize: 14,
    },
    amenities: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    amtBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    amtText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 12,
        fontWeight: '500',
    },
});
