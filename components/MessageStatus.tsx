import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface MessageStatusProps {
    status: 'sent' | 'delivered' | 'read';
    color?: string;
    size?: number;
    isMe?: boolean;
}

export default function MessageStatus({ status, color = '#fff', size = 16, isMe }: MessageStatusProps) {
    if (!isMe) return null;

    return (
        <View style={styles.container}>
            {status === 'sent' && (
                <Ionicons name="checkmark" size={size} color={color} />
            )}
            {status === 'delivered' && (
                <View style={styles.doubleTick}>
                    <Ionicons name="checkmark" size={size} color={color} />
                    <Ionicons name="checkmark" size={size} color={color} style={styles.secondTick} />
                </View>
            )}
            {status === 'read' && (
                <View style={styles.doubleTick}>
                    <Ionicons name="checkmark-done" size={size} color="#4ADE80" />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginLeft: 4,
        justifyContent: 'flex-end',
    },
    doubleTick: {
        flexDirection: 'row',
    },
    secondTick: {
        marginLeft: -10, // Overlap for double tick effect if using single ticks, but using checkmark-done for read
    }
});
