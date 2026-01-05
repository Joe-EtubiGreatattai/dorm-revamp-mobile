import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import React, { useEffect } from 'react';
import { DimensionValue, ViewStyle } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming
} from 'react-native-reanimated';

interface SkeletonProps {
    width?: DimensionValue;
    height?: DimensionValue;
    borderRadius?: number;
    style?: ViewStyle;
    circle?: boolean;
}

export default function Skeleton({
    width,
    height,
    borderRadius = 8,
    style,
    circle,
}: SkeletonProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const opacity = useSharedValue(0.5);

    useEffect(() => {
        opacity.value = withRepeat(
            withTiming(1, { duration: 800 }),
            -1,
            true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
        };
    });

    const skeletonStyle: ViewStyle = {
        width: width,
        height: height,
        borderRadius: circle ? 1000 : borderRadius,
        backgroundColor: colorScheme === 'dark' ? '#262626' : '#E5E7EB',
    };

    return <Animated.View style={[skeletonStyle, animatedStyle, style]} />;
}
