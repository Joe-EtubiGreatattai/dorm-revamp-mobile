import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2;

interface MarketItemProps {
    id?: string;
    _id?: string;
    title: string;
    price: number;
    category: string;
    type: 'item' | 'food' | 'service';
    images: string[];
    description: string;
}

export default function MarketItem({ item }: { item: MarketItemProps }) {
    if (!item || (!item.id && !item._id) || !item.title) return null;
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'] || Colors.light;
    const [isLiked, setIsLiked] = React.useState(false);
    const router = useRouter();

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => {
                const id = item._id || item.id;
                const route = item.type === 'item' ? `/market/${id}` : `/market/${item.type}/${id}`;
                router.push(route as any);
            }}
        >
            <View style={styles.imageContainer}>
                <Image
                    source={{ uri: item.images?.[0] || 'https://via.placeholder.com/300x200?text=No+Image' }}
                    style={styles.image}
                    contentFit="cover"
                />
                <TouchableOpacity
                    style={[styles.likeBtn, { backgroundColor: colors.card }]}
                    onPress={() => setIsLiked(!isLiked)}
                >
                    <Ionicons
                        name={isLiked ? "heart" : "heart-outline"}
                        size={16}
                        color={isLiked ? colors.error : colors.subtext}
                    />
                </TouchableOpacity>
            </View>
            <View style={styles.info}>
                <Text style={[styles.category, { color: colors.primary }]}>{item.category}</Text>
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                <View style={styles.footer}>
                    <Text style={[styles.price, { color: colors.text }]}>₦{(item.price || 0).toLocaleString()}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        width: COLUMN_WIDTH,
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
        marginBottom: 16,
    },
    imageContainer: {
        width: '100%',
        height: 140,
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
        backgroundColor: '#f1f5f9',
    },
    likeBtn: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    info: {
        padding: 12,
    },
    category: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 10,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    title: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
        marginBottom: 8,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    price: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
});
