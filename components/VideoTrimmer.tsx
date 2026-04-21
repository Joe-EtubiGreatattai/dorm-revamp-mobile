import { Ionicons } from '@expo/vector-icons';
import * as VideoThumbnails from 'expo-video-thumbnails';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    PanResponder,
    StyleSheet,
    Text,
    View
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TRIMMER_WIDTH = SCREEN_WIDTH - 64; // Padding
const TRIMMER_HEIGHT = 60;
const HANDLE_WIDTH = 15;

interface VideoTrimmerProps {
    videoUri: string;
    duration: number; // in seconds
    onTrimChange: (trim: { start: number; end: number }) => void;
    onSeek?: (time: number) => void;
    maxDuration?: number; // default 120s
    currentTime?: number; // in seconds
}

export default function VideoTrimmer({ videoUri, duration, onTrimChange, onSeek, maxDuration = 120, currentTime = 0 }: VideoTrimmerProps) {
    const [thumbnails, setThumbnails] = useState<string[]>([]);
    const [trim, setTrim] = useState({ start: 0, end: Math.min(duration, maxDuration) });
    const [isSeeking, setIsSeeking] = useState(false);
    const playheadX = useRef(new Animated.Value(0)).current;

    // Animation/State for handles
    const leftHandleX = useRef(new Animated.Value(0)).current;
    const rightHandleX = useRef(new Animated.Value(TRIMMER_WIDTH)).current;

    const leftPos = useRef(0);
    const rightPos = useRef(TRIMMER_WIDTH);

    useEffect(() => {
        generateThumbnails();
        // Initial trim sync
        const initialEnd = Math.min(duration, maxDuration);
        const initialRightPos = (initialEnd / duration) * TRIMMER_WIDTH;
        rightPos.current = initialRightPos;
        rightHandleX.setValue(initialRightPos);
        setTrim({ start: 0, end: initialEnd });
    }, [videoUri, duration]);

    // Handle playhead movement (only when not manually seeking)
    useEffect(() => {
        if (!isSeeking) {
            const targetX = (currentTime / duration) * TRIMMER_WIDTH;
            Animated.timing(playheadX, {
                toValue: targetX,
                duration: 100, // Small duration for smoothness
                useNativeDriver: true,
            }).start();
        }
    }, [currentTime, duration, isSeeking]);

    const generateThumbnails = async () => {
        try {
            const count = 8;
            const newThumbnails = [];
            for (let i = 0; i < count; i++) {
                const time = Math.floor((duration / count) * i * 1000);
                const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
                    time,
                    quality: 0.5,
                });
                newThumbnails.push(uri);
            }
            setThumbnails(newThumbnails);
        } catch (e) {
            console.warn('Failed to generate thumbnails', e);
        }
    };

    const updateTrim = useCallback((isDragging = false) => {
        const start = (leftPos.current / TRIMMER_WIDTH) * duration;
        const end = (rightPos.current / TRIMMER_WIDTH) * duration;
        const newTrim = {
            start: Math.max(0, parseFloat(start.toFixed(1))),
            end: Math.min(duration, parseFloat(end.toFixed(1)))
        };
        setTrim(newTrim);
        onTrimChange(newTrim);
    }, [duration, onTrimChange]);

    const leftPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderMove: (_, gestureState) => {
                let newX = leftPos.current + gestureState.dx;
                // Constraints
                if (newX < 0) newX = 0;
                if (newX > rightPos.current - HANDLE_WIDTH * 2) newX = rightPos.current - HANDLE_WIDTH * 2;

                leftHandleX.setValue(newX);

                // Real-time update for preview
                const start = (newX / TRIMMER_WIDTH) * duration;
                setTrim(prev => ({ ...prev, start: parseFloat(start.toFixed(1)) }));
                onTrimChange({ start: parseFloat(start.toFixed(1)), end: trim.end });
            },
            onPanResponderRelease: (_, gestureState) => {
                leftPos.current += gestureState.dx;
                if (leftPos.current < 0) leftPos.current = 0;
                if (leftPos.current > rightPos.current - HANDLE_WIDTH * 2) leftPos.current = rightPos.current - HANDLE_WIDTH * 2;
                updateTrim();
            },
        })
    ).current;

    const rightPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderMove: (_, gestureState) => {
                let newX = rightPos.current + gestureState.dx;
                // Constraints
                if (newX > TRIMMER_WIDTH) newX = TRIMMER_WIDTH;
                if (newX < leftPos.current + HANDLE_WIDTH * 2) newX = leftPos.current + HANDLE_WIDTH * 2;

                // Enforce max duration constraint if moving right handle
                const durationAtPos = (newX / TRIMMER_WIDTH) * duration - (leftPos.current / TRIMMER_WIDTH) * duration;
                if (durationAtPos > maxDuration) {
                    newX = ((maxDuration + (leftPos.current / TRIMMER_WIDTH) * duration) / duration) * TRIMMER_WIDTH;
                }

                rightHandleX.setValue(newX);

                // Real-time update for preview
                const end = (newX / TRIMMER_WIDTH) * duration;
                setTrim(prev => ({ ...prev, end: parseFloat(end.toFixed(1)) }));
                onTrimChange({ start: trim.start, end: parseFloat(end.toFixed(1)) });
            },
            onPanResponderRelease: (_, gestureState) => {
                rightPos.current += gestureState.dx;
                if (rightPos.current > TRIMMER_WIDTH) rightPos.current = TRIMMER_WIDTH;
                if (rightPos.current < leftPos.current + HANDLE_WIDTH * 2) rightPos.current = leftPos.current + HANDLE_WIDTH * 2;

                const durationAtPos = (rightPos.current / TRIMMER_WIDTH) * duration - (leftPos.current / TRIMMER_WIDTH) * duration;
                if (durationAtPos > maxDuration) {
                    rightPos.current = ((maxDuration + (leftPos.current / TRIMMER_WIDTH) * duration) / duration) * TRIMMER_WIDTH;
                    rightHandleX.setValue(rightPos.current);
                }

                updateTrim();
            },
        })
    ).current;

    const playheadPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                setIsSeeking(true);
            },
            onPanResponderMove: (_, gestureState) => {
                // Determine current position relative to start of playhead drag
                const currentPos = (currentTime / duration) * TRIMMER_WIDTH;
                let newX = currentPos + gestureState.dx;

                // Constraints
                if (newX < 0) newX = 0;
                if (newX > TRIMMER_WIDTH) newX = TRIMMER_WIDTH;

                playheadX.setValue(newX);

                // Seek update
                const newTime = (newX / TRIMMER_WIDTH) * duration;
                onSeek?.(parseFloat(newTime.toFixed(1)));
            },
            onPanResponderRelease: () => {
                setIsSeeking(false);
            },
        })
    ).current;

    return (
        <View style={styles.container}>
            <View style={styles.timeInfo}>
                <Text style={styles.timeLabel}>Start: {trim.start}s</Text>
                <Text style={styles.durationText}>{Math.max(0, (trim.end - trim.start)).toFixed(1)}s selected</Text>
                <Text style={styles.timeLabel}>End: {trim.end}s</Text>
            </View>

            <View style={styles.trimmerWrapper}>
                {/* Filmstrip */}
                <View style={styles.filmstrip}>
                    {thumbnails.map((uri, i) => (
                        <Image key={i} source={{ uri }} style={styles.thumbnail} resizeMode="cover" />
                    ))}
                    {thumbnails.length === 0 && (
                        <View style={[styles.thumbnail, { backgroundColor: '#333' }]} />
                    )}
                </View>

                {/* Selection Overlay (Dimmed outside areas) */}
                <Animated.View style={[styles.overlay, { left: 0, width: leftHandleX }]} />
                <Animated.View style={[styles.overlay, { right: 0, left: rightHandleX }]} />

                {/* Handles */}
                <Animated.View
                    style={[styles.handle, styles.leftHandle, { transform: [{ translateX: leftHandleX }] }]}
                    {...leftPanResponder.panHandlers}
                >
                    <View style={styles.handleBar} />
                </Animated.View>

                <Animated.View
                    style={[styles.handle, styles.rightHandle, { transform: [{ translateX: Animated.subtract(rightHandleX, HANDLE_WIDTH) }] }]}
                    {...rightPanResponder.panHandlers}
                >
                    <View style={styles.handleBar} />
                </Animated.View>

                {/* Border Frame */}
                <Animated.View style={[
                    styles.selectionFrame,
                    {
                        left: leftHandleX,
                        width: Animated.subtract(rightHandleX, leftHandleX)
                    }
                ]} pointerEvents="none" />

                {/* Playhead */}
                <Animated.View style={[
                    styles.playhead,
                    { transform: [{ translateX: playheadX }] }
                ]} {...playheadPanResponder.panHandlers} />
            </View>

            <View style={styles.hintContainer}>
                <Ionicons name="information-circle-outline" size={14} color="#aaa" />
                <Text style={styles.hintText}>Drag the handles to trim your video (Max 2 mins)</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        paddingVertical: 10,
    },
    timeInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    timeLabel: {
        color: '#fff',
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    durationText: {
        color: '#ff2d55',
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    trimmerWrapper: {
        width: TRIMMER_WIDTH,
        height: TRIMMER_HEIGHT,
        alignSelf: 'center',
        position: 'relative',
        backgroundColor: '#1a1a1a',
        borderRadius: 4,
        overflow: 'hidden',
    },
    filmstrip: {
        flexDirection: 'row',
        ...StyleSheet.absoluteFillObject,
    },
    thumbnail: {
        flex: 1,
        height: '100%',
    },
    overlay: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    selectionFrame: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        borderTopWidth: 2,
        borderBottomWidth: 2,
        borderColor: '#ff2d55',
    },
    handle: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: HANDLE_WIDTH,
        backgroundColor: '#ff2d55',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    leftHandle: {
        borderTopLeftRadius: 4,
        borderBottomLeftRadius: 4,
    },
    rightHandle: {
        borderTopRightRadius: 4,
        borderBottomRightRadius: 4,
    },
    handleBar: {
        width: 2,
        height: 20,
        backgroundColor: 'rgba(255,255,255,0.5)',
        borderRadius: 1,
    },
    playhead: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 2,
        backgroundColor: '#fff',
        zIndex: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 2,
    },
    hintContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        gap: 6,
    },
    hintText: {
        color: '#aaa',
        fontSize: 11,
        fontFamily: 'PlusJakartaSans_400Regular',
    }
});
