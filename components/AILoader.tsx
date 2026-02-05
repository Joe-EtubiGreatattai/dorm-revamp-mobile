import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import { useColorScheme } from './useColorScheme';

const { width } = Dimensions.get('window');

const MESSAGES = [
    "Analyzing document context...",
    "Extracting key information...",
    "Summarizing main points...",
    "Polishing for clarity...",
    "Almost ready..."
];

export default function AILoader({ visible }: { visible: boolean }) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = Colors[colorScheme ?? 'light'];

    const [messageIndex, setMessageIndex] = useState(0);
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const rotateAnim = React.useRef(new Animated.Value(0)).current;
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (visible) {
            // Fade in
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }).start();

            // Continuous rotation for the "halo"
            const rotation = Animated.loop(
                Animated.timing(rotateAnim, {
                    toValue: 1,
                    duration: 3000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            );
            rotation.start();

            // Pulsing scale
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(scaleAnim, {
                        toValue: 1.1,
                        duration: 1500,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 1,
                        duration: 1500,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: true,
                    })
                ])
            );
            pulse.start();

            // Dynamic messages
            const interval = setInterval(() => {
                setMessageIndex((prev) => (prev + 1) % MESSAGES.length);
            }, 2500);

            return () => {
                rotation.stop();
                pulse.stop();
                clearInterval(interval);
            };
        } else {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    if (!visible) return null;

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <Animated.View style={[styles.container, {
            opacity: fadeAnim,
            backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.75)'
        }]}>
            <BlurView intensity={isDark ? 80 : 90} style={StyleSheet.absoluteFill} tint={isDark ? 'dark' : 'light'} />

            <View style={styles.content}>
                <View style={styles.animationContainer}>
                    {/* Background Halo */}
                    <Animated.View style={[
                        styles.halo,
                        {
                            transform: [{ rotate: spin }],
                            borderColor: colors.primary + '40', // 40 is hex opacity
                        }
                    ]}>
                        <LinearGradient
                            colors={[colors.primary, '#a855f7', colors.primary]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                    </Animated.View>

                    {/* Inner Circle with AI Icon */}
                    <Animated.View style={[
                        styles.innerCircle,
                        {
                            backgroundColor: isDark ? '#1e293b' : '#fff',
                            transform: [{ scale: scaleAnim }]
                        }
                    ]}>
                        <Image
                            source={require('@/assets/images/DORM APP ICON.gif')}
                            style={{ width: 60, height: 60, borderRadius: 30 }}
                            contentFit="cover"
                        />
                    </Animated.View>

                    {/* Orbiting dots for extra flair */}
                    <Animated.View style={[styles.orbiter, { transform: [{ rotate: spin }] }]}>
                        <View style={[styles.dot, { backgroundColor: '#a855f7', top: -45 }]} />
                        <View style={[styles.dot, { backgroundColor: colors.primary, bottom: -45 }]} />
                    </Animated.View>
                </View>

                <View style={styles.textContainer}>
                    <Text style={[styles.aiTitle, { color: colors.text }]}>Gemini AI is thinking</Text>
                    <Text style={[styles.message, { color: colors.subtext }]}>{MESSAGES[messageIndex]}</Text>
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
    },
    content: {
        alignItems: 'center',
        gap: 32,
    },
    animationContainer: {
        width: 120,
        height: 120,
        alignItems: 'center',
        justifyContent: 'center',
    },
    halo: {
        position: 'absolute',
        width: 110,
        height: 110,
        borderRadius: 55,
        borderWidth: 2,
        overflow: 'hidden',
        opacity: 0.6,
    },
    innerCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 10,
    },
    orbiter: {
        position: 'absolute',
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dot: {
        position: 'absolute',
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    textContainer: {
        alignItems: 'center',
        gap: 8,
    },
    aiTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
        letterSpacing: -0.5,
    },
    message: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 15,
        textAlign: 'center',
        width: width * 0.7,
    }
});
