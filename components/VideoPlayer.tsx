import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { ResizeMode, Video } from 'expo-av';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useColorScheme } from './useColorScheme';

interface VideoPlayerProps {
    uri: string;
    postId?: string;
    style?: any;
    resizeMode?: ResizeMode;
    isLooping?: boolean;
    autoPlay?: boolean;
    useNativeControls?: boolean; // We override this but keep for compatibility
}

export default function VideoPlayer({
    uri,
    postId,
    style,
    resizeMode = ResizeMode.CONTAIN,
    isLooping = true,
    autoPlay = false
}: VideoPlayerProps) {
    const router = useRouter();
    const videoRef = useRef<Video>(null);
    const isFocused = useIsFocused();
    const [status, setStatus] = useState<any>({});
    const [muted, setMuted] = useState(true);
    const [showControls, setShowControls] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const lastTap = useRef<number>(0);

    const togglePlay = async () => {
        if (!videoRef.current) return;
        if (status.isPlaying) {
            await videoRef.current.pauseAsync();
        } else {
            await videoRef.current.playAsync();
        }
    };

    const toggleMute = async () => {
        if (!videoRef.current) return;
        const newMuted = !muted;
        setMuted(newMuted);
        await videoRef.current.setIsMutedAsync(newMuted);
    };

    const toggleFullscreen = () => {
        if (postId) {
            router.push(`/reels?postId=${postId}`);
        } else if (videoRef.current) {
            videoRef.current.presentFullscreenPlayer();
        }
    };

    const handleVideoPress = () => {
        toggleFullscreen();
    };

    const handleDoubleTap = () => {
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;
        if (lastTap.current && now - lastTap.current < DOUBLE_TAP_DELAY) {
            // Fullscreen on double tap or just keep single tap for controls
            toggleFullscreen();
        } else {
            lastTap.current = now;
            setShowControls(!showControls);
        }
    };

    const formatTime = (millis: number) => {
        const totalSeconds = millis / 1000;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const getProgress = () => {
        if (status.durationMillis > 0 && status.positionMillis > 0) {
            return (status.positionMillis / status.durationMillis) * 100;
        }
        return 0;
    };

    useEffect(() => {
        if (!isFocused && status.isPlaying) {
            videoRef.current?.pauseAsync();
        }
    }, [isFocused]);

    useEffect(() => {
        if (autoPlay && isFocused) {
            videoRef.current?.playAsync();
        } else {
            videoRef.current?.pauseAsync();
        }
    }, [autoPlay, isFocused]);

    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;
        if (showControls && status.isPlaying) {
            timeout = setTimeout(() => setShowControls(false), 3000);
        }
        return () => clearTimeout(timeout);
    }, [showControls, status.isPlaying]);

    return (
        <View style={[styles.container, style]}>
            <TouchableOpacity
                activeOpacity={1}
                onPress={handleVideoPress}
                style={StyleSheet.absoluteFill}
            >
                <Video
                    ref={videoRef}
                    source={{ uri }}
                    style={StyleSheet.absoluteFill}
                    resizeMode={resizeMode}
                    isLooping={isLooping}
                    shouldPlay={autoPlay}
                    isMuted={muted}
                    onLoadStart={() => setIsLoading(true)}
                    onLoad={() => setIsLoading(false)}
                    onPlaybackStatusUpdate={(s) => setStatus(s)}
                />
            </TouchableOpacity>

            {/* Top-right Mute Toggle */}
            {!isLoading && (
                <TouchableOpacity
                    style={styles.muteOverlayButton}
                    onPress={(e) => {
                        e.stopPropagation();
                        toggleMute();
                    }}
                >
                    <Ionicons
                        name={muted ? "volume-mute" : "volume-high"}
                        size={20}
                        color="#fff"
                    />
                </TouchableOpacity>
            )}

            {isLoading && (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            )}

            {showControls && !isLoading && (
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={handleVideoPress}
                    style={styles.controlsOverlay}
                >
                    {/* Control Bar (Center) */}
                    <View style={styles.centerControls}>
                        <TouchableOpacity
                            style={styles.centerButton}
                            onPress={(e) => {
                                e.stopPropagation();
                                togglePlay();
                            }}
                        >
                            <Ionicons
                                name={status.isPlaying ? "pause" : "play"}
                                size={50}
                                color="#fff"
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Bottom Controls */}
                    <View style={styles.bottomBar}>
                        <View style={styles.progressContainer}>
                            <View style={[styles.progressBar, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
                                <View style={[styles.progressFill, { width: `${getProgress()}%`, backgroundColor: colors.primary }]} />
                            </View>
                        </View>

                        <View style={styles.rightActions}>
                            <TouchableOpacity
                                onPress={(e) => {
                                    e.stopPropagation();
                                    toggleMute();
                                }}
                                style={styles.controlIcon}
                            >
                                <Ionicons
                                    name={muted ? "volume-mute" : "volume-high"}
                                    size={24}
                                    color="#fff"
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#000',
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    loaderContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    controlsOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    centerControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 30,
    },
    skipButton: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    skipText: {
        color: '#fff',
        fontSize: 10,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginTop: -6,
    },
    centerButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        paddingTop: 30,
    },
    progressContainer: {
        marginBottom: 8,
    },
    progressBar: {
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
    },
    timeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    timeText: {
        color: '#fff',
        fontSize: 10,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    rightActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 12,
    },
    controlIcon: {
        padding: 4,
    },
    muteOverlayButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.5)',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    }
});
