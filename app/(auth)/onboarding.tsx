import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    Dimensions,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, {
    Extrapolation,
    interpolate,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        title: 'Welcome to your\nCampus Hub',
        description: 'Track your university life, manage tasks, and get real-time updates—all in one simple, powerful dashboard.',
        image: require('@/assets/images/onboarding_hub.png'),
    },
    {
        id: '2',
        title: 'Your Campus\nMarketplace',
        description: 'Buy, sell, and trade safely with verified students. From textbooks to treats, find everything locally.',
        image: require('@/assets/images/onboarding_market.png'),
    },
    {
        id: '3',
        title: 'Secure & Simple\nVoting',
        description: 'Democracy in your hands. Participate in secure student elections and view live results instantly.',
        image: require('@/assets/images/onboarding_voting.png'),
    },
    {
        id: '4',
        title: 'Verified\nHousing',
        description: 'Find your perfect home away from home with verified listings and direct landlord connections.',
        image: require('@/assets/images/onboarding_housing.png'),
    },
];

const Paginator = ({ data, scrollX }: { data: typeof SLIDES; scrollX: any }) => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    return (
        <View style={styles.paginatorContainer}>
            {data.map((_, i) => {
                const animatedDotStyle = useAnimatedStyle(() => {
                    const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                    const dotWidth = interpolate(
                        scrollX.value,
                        inputRange,
                        [8, 24, 8],
                        Extrapolation.CLAMP
                    );
                    const opacity = interpolate(
                        scrollX.value,
                        inputRange,
                        [0.4, 1, 0.4],
                        Extrapolation.CLAMP
                    );
                    return { width: dotWidth, opacity };
                });

                return (
                    <Animated.View
                        key={i.toString()}
                        style={[
                            styles.dot,
                            { backgroundColor: colors.text },
                            animatedDotStyle,
                        ]}
                    />
                );
            })}
        </View>
    );
};

const SlideItem = ({ item, index, scrollX }: { item: typeof SLIDES[0]; index: number; scrollX: any }) => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const animatedImageStyle = useAnimatedStyle(() => {
        const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
        const scale = interpolate(scrollX.value, inputRange, [0.5, 1, 0.5], Extrapolation.CLAMP);
        const translateY = interpolate(scrollX.value, inputRange, [100, 0, 100], Extrapolation.CLAMP);
        return {
            transform: [{ scale }, { translateY }],
        };
    });

    const animatedContentStyle = useAnimatedStyle(() => {
        const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
        const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP);
        const translateY = interpolate(scrollX.value, inputRange, [50, 0, 50], Extrapolation.CLAMP);
        return {
            opacity,
            transform: [{ translateY }],
        };
    });

    return (
        <View style={styles.slide}>
            <Animated.View style={[styles.imageContainer, animatedImageStyle]}>
                <View style={[styles.circleBackdrop, { backgroundColor: colors.primary + '15' }]} />
                <Image source={item.image} style={styles.image} resizeMode="contain" />
            </Animated.View>

            <Animated.View style={[styles.contentContainer, animatedContentStyle]}>
                <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.description, { color: colors.subtext }]}>{item.description}</Text>
            </Animated.View>
        </View>
    );
};

export default function OnboardingScreen() {
    const router = useRouter();
    const { completeOnboarding } = useAuth();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const flatListRef = useRef<Animated.FlatList<any>>(null);
    const scrollX = useSharedValue(0);
    const [activeIndex, setActiveIndex] = useState(0);

    const onScroll = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollX.value = event.contentOffset.x;
        },
    });

    const handleNext = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (activeIndex < SLIDES.length - 1) {
            flatListRef.current?.scrollToIndex({ index: activeIndex + 1 });
        } else {
            await handleComplete();
        }
    };

    const handleComplete = async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await completeOnboarding();
        router.replace('/(auth)');
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleComplete} style={styles.skipBtn}>
                    {activeIndex !== SLIDES.length - 1 && (
                        <Text style={[styles.skipText, { color: colors.subtext }]}>Skip</Text>
                    )}
                </TouchableOpacity>
            </View>

            <Animated.FlatList
                ref={flatListRef as any}
                data={SLIDES}
                renderItem={({ item, index }) => <SlideItem item={item} index={index} scrollX={scrollX} />}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
                onMomentumScrollEnd={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / width);
                    setActiveIndex(index);
                }}
            />

            <View style={styles.footer}>
                <Paginator data={SLIDES} scrollX={scrollX} />

                <TouchableOpacity
                    style={[
                        styles.nextBtn,
                        { backgroundColor: colors.primary },
                        activeIndex === SLIDES.length - 1 ? { width: 150 } : { width: 60 }
                    ]}
                    onPress={handleNext}
                    activeOpacity={0.8}
                >
                    {activeIndex === SLIDES.length - 1 ? (
                        <Text style={styles.nextBtnText}>Get Started</Text>
                    ) : (
                        <Ionicons name="arrow-forward" size={24} color="#fff" />
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        height: 60,
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingHorizontal: 20,
    },
    skipBtn: {
        padding: 10,
    },
    skipText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
    },
    slide: {
        width: width,
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    imageContainer: {
        flex: 0.6,
        justifyContent: 'center',
        alignItems: 'center',
        width: width,
        marginBottom: 20,
    },
    circleBackdrop: {
        position: 'absolute',
        width: width * 0.7,
        height: width * 0.7,
        borderRadius: width * 0.35,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    image: {
        width: width * 0.8,
        height: width * 0.8,
    },
    contentContainer: {
        flex: 0.3,
        alignItems: 'center',
    },
    title: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 32,
        marginBottom: 16,
        textAlign: 'center',
        lineHeight: 38,
    },
    description: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 16,
    },
    footer: {
        flex: 0.15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 30,
    },
    paginatorContainer: {
        flexDirection: 'row',
        height: 64,
        alignItems: 'center',
    },
    dot: {
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
    },
    nextBtn: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 8,
    },
    nextBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        color: '#fff',
        fontSize: 16,
        paddingHorizontal: 8,
    }
});
