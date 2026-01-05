import Colors from '@/constants/Colors';
import React, { useEffect } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, View } from 'react-native';
import { useColorScheme } from './useColorScheme';

export default function CustomLoader({ message = "Loading..." }: { message?: string }) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const fadeAnim = React.useRef(new Animated.Value(0.3)).current;
    const scaleAnim = React.useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(fadeAnim, {
                        toValue: 0.3,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.sequence([
                    Animated.timing(scaleAnim, {
                        toValue: 1.1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 0.8,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ]),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                {/* Replace with your app logo if available, strictly using branding colors */}
                <View style={[styles.logoPlaceholder, { backgroundColor: colors.primary }]}>
                    <Text style={styles.logoText}>D</Text>
                </View>
            </Animated.View>
            <View style={{ marginTop: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.message, { color: colors.subtext, marginTop: 16 }]}>{message}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.30,
        shadowRadius: 4.65,
        elevation: 8,
    },
    logoText: {
        fontSize: 40,
        color: '#fff',
        fontWeight: 'bold',
        fontFamily: 'PlusJakartaSans_800ExtraBold',
    },
    message: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
    }
});
