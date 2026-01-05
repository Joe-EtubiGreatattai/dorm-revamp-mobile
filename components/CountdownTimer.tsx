import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface CountdownTimerProps {
    targetDate: string | Date;
    mode?: 'simple' | 'detailed';
    onEnd?: () => void;
}

export default function CountdownTimer({ targetDate, mode = 'simple', onEnd }: CountdownTimerProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const [timeLeft, setTimeLeft] = useState<{
        days: number;
        hours: number;
        minutes: number;
        seconds: number;
        isEnded: boolean;
    }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isEnded: false });

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date().getTime();
            const target = new Date(targetDate).getTime();
            const difference = target - now;

            if (difference < 0) {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isEnded: true });
                if (onEnd) onEnd();
                return true;
            }

            setTimeLeft({
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((difference % (1000 * 60)) / 1000),
                isEnded: false
            });
            return false;
        };

        const isAlreadyEnded = calculateTimeLeft();
        if (isAlreadyEnded) return;

        const interval = setInterval(calculateTimeLeft, 1000);
        return () => clearInterval(interval);
    }, [targetDate]);

    if (timeLeft.isEnded) {
        return (
            <View style={[styles.endedContainer, mode === 'simple' && styles.simpleContainer]}>
                <Ionicons name="time-outline" size={mode === 'simple' ? 14 : 20} color={colors.subtext} />
                <Text style={[styles.endedText, { color: colors.subtext }, mode === 'simple' && { fontSize: 12 }]}>
                    Ended
                </Text>
            </View>
        );
    }

    if (mode === 'simple') {
        const timeString = timeLeft.days > 0
            ? `${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m`
            : `${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s`;

        return (
            <View style={styles.simpleContainer}>
                <Ionicons name="time-outline" size={14} color={colors.text} />
                <Text style={[styles.timerText, { color: colors.text }]}>{timeString}</Text>
            </View>
        );
    }

    return (
        <View style={styles.detailedContainer}>
            <View style={styles.timerUnit}>
                <View style={[styles.unitBox, { backgroundColor: colors.background }]}>
                    <Text style={[styles.unitValue, { color: colors.text }]}>
                        {timeLeft.days.toString().padStart(2, '0')}
                    </Text>
                </View>
                <Text style={[styles.unitLabel, { color: colors.subtext }]}>DAYS</Text>
            </View>
            <Text style={[styles.separator, { color: colors.border }]}>:</Text>

            <View style={styles.timerUnit}>
                <View style={[styles.unitBox, { backgroundColor: colors.background }]}>
                    <Text style={[styles.unitValue, { color: colors.text }]}>
                        {timeLeft.hours.toString().padStart(2, '0')}
                    </Text>
                </View>
                <Text style={[styles.unitLabel, { color: colors.subtext }]}>HOURS</Text>
            </View>
            <Text style={[styles.separator, { color: colors.border }]}>:</Text>

            <View style={styles.timerUnit}>
                <View style={[styles.unitBox, { backgroundColor: colors.background }]}>
                    <Text style={[styles.unitValue, { color: colors.text }]}>
                        {timeLeft.minutes.toString().padStart(2, '0')}
                    </Text>
                </View>
                <Text style={[styles.unitLabel, { color: colors.subtext }]}>MINS</Text>
            </View>
            <Text style={[styles.separator, { color: colors.border }]}>:</Text>

            <View style={styles.timerUnit}>
                <View style={[styles.unitBox, { backgroundColor: colors.background }]}>
                    <Text style={[styles.unitValue, { color: colors.text }]}>
                        {timeLeft.seconds.toString().padStart(2, '0')}
                    </Text>
                </View>
                <Text style={[styles.unitLabel, { color: colors.subtext }]}>SECS</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    simpleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    timerText: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    detailedContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
    },
    timerUnit: {
        alignItems: 'center',
        gap: 4,
    },
    unitBox: {
        minWidth: 50,
        height: 50,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    unitValue: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 22,
        fontVariant: ['tabular-nums'],
    },
    unitLabel: {
        fontSize: 10,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        letterSpacing: 0.5,
    },
    separator: {
        fontSize: 24,
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        marginBottom: 16,
    },
    endedContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    endedText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    }
});
