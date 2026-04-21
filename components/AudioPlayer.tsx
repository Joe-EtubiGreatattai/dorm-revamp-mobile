import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColorScheme } from './useColorScheme';

interface AudioPlayerProps {
    uri: string;
    containerStyle?: any;
    accentColor?: string;
    iconColor?: string;
}

export default function AudioPlayer({ uri, containerStyle, accentColor, iconColor }: AudioPlayerProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const primaryColor = accentColor || colors.primary;
    const finalIconColor = iconColor || '#fff';

    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);

    const isMounted = useRef(true);

    useEffect(() => {
        return () => {
            isMounted.current = false;
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, [sound]);

    const onPlaybackStatusUpdate = (status: any) => {
        if (!status.isLoaded) {
            if (status.error) {
                console.log(`Encountered a fatal error during playback: ${status.error}`);
            }
        } else {
            setPosition(status.positionMillis);
            setDuration(status.durationMillis || 0);
            setIsPlaying(status.isPlaying);

            if (status.didJustFinish) {
                setIsPlaying(false);
                setPosition(0);
                sound?.setPositionAsync(0);
            }
        }
    };

    const playPause = async () => {
        if (sound) {
            try {
                if (isPlaying) {
                    await sound.pauseAsync();
                } else {
                    await sound.playAsync();
                }
            } catch (error: any) {
                console.log('Error controlling playback:', error);

                // If sound is not loaded (e.g. unloaded or error), try reloading
                if (error.message && error.message.includes('not loaded')) {
                    console.log('♻️ [AudioPlayer] Sound not loaded, reloading...');
                    setSound(null);
                    // Slight delay to ensure state clears
                    setTimeout(() => loadAndPlay(), 100);
                }
            }
        } else {
            loadAndPlay();
        }
    };

    const loadAndPlay = async () => {
        try {
            setIsLoading(true);

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                interruptionModeIOS: InterruptionModeIOS.DoNotMix,
                playsInSilentModeIOS: true,
                shouldDuckAndroid: true,
                interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
                playThroughEarpieceAndroid: false,
                staysActiveInBackground: false,
            });

            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri },
                { shouldPlay: true },
                onPlaybackStatusUpdate
            );

            if (isMounted.current) {
                setSound(newSound);
                setIsLoading(false);
            } else {
                await newSound.unloadAsync();
            }
        } catch (error) {
            console.log('Error loading sound', error);
            setIsLoading(false);
        }
    };

    const formatTime = (millis: number) => {
        const totalSeconds = millis / 1000;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const progressWidth = duration > 0 ? (position / duration) * 100 : 0;

    return (
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }, containerStyle]}>
            <TouchableOpacity onPress={playPause} style={[styles.playBtn, { backgroundColor: primaryColor }]}>
                {isLoading ? (
                    <ActivityIndicator size="small" color={finalIconColor} />
                ) : (
                    <Ionicons name={isPlaying ? "pause" : "play"} size={20} color={finalIconColor} />
                )}
            </TouchableOpacity>
            <View style={styles.waveformContainer}>
                <View style={[styles.progressBackground, { backgroundColor: colors.border }]}>
                    <View style={[styles.progressFill, { width: `${progressWidth}%`, backgroundColor: primaryColor }]} />
                </View>
                <View style={styles.timeRow}>
                    <Text style={[styles.timeText, { color: colors.subtext }]}>{formatTime(position)}</Text>
                    <Text style={[styles.timeText, { color: colors.subtext }]}>{formatTime(duration)}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 20,
        borderWidth: 1,
        gap: 12,
        minWidth: 200,
        marginVertical: 4,
    },
    playBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        // Ensure no extra border or background is leaking
        borderWidth: 0,
    },
    waveformContainer: {
        flex: 1,
        gap: 4,
    },
    progressBackground: {
        height: 4,
        borderRadius: 2,
        width: '100%',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    timeText: {
        fontSize: 10,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
});
