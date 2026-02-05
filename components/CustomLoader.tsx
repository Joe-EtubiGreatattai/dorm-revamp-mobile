import { Text } from '@/components/Themed';
import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useColorScheme } from './useColorScheme';

export default function CustomLoader({ message }: { message?: string }) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <View style={[styles.container]}>
            {/* Blur view providing the actual blur effect */}
            {/* Fallback for BlurView which sometimes causes registry errors */}
            <View
                style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)' }
                ]}
            />

            <View style={styles.content}>
                <Image
                    source={require('@/assets/images/DORM APP ICON.gif')}
                    style={styles.logo}
                    contentFit="cover"
                />
                {message && (
                    <Text style={[styles.message, { color: isDark ? '#fff' : '#000' }]}>
                        {message}
                    </Text>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        // Ensure background is transparent so BlurView can see through
        backgroundColor: 'transparent',
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
        // Removed padding/radius from container to let image define the shape
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 8,
    },
    logo: {
        width: 120,
        height: 120,
        borderRadius: 60, // Circular
    },
    message: {
        marginTop: 16,
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        textAlign: 'center',
    }
});
