import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Skeleton from './Skeleton';

const { width } = Dimensions.get('window');

export default function PostSkeleton() {
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Skeleton circle width={40} height={40} style={styles.avatar} />
                <View style={styles.userInfo}>
                    <Skeleton width={120} height={16} style={styles.userName} />
                    <Skeleton width={80} height={12} style={styles.timestamp} />
                </View>
                <Skeleton width={20} height={20} borderRadius={10} />
            </View>

            {/* Content */}
            <View style={styles.content}>
                <Skeleton width="100%" height={14} style={styles.line} />
                <Skeleton width="90%" height={14} style={styles.line} />
                <Skeleton width="60%" height={14} style={styles.line} />
            </View>

            {/* Simulated Image Area */}
            <Skeleton width="100%" height={200} borderRadius={12} style={styles.imagePlaceholder} />

            {/* Footer */}
            <View style={styles.footer}>
                <View style={styles.leftActions}>
                    <View style={styles.actionItem}>
                        <Skeleton width={24} height={24} borderRadius={12} />
                        <Skeleton width={30} height={14} />
                    </View>
                    <View style={styles.actionItem}>
                        <Skeleton width={24} height={24} borderRadius={12} />
                        <Skeleton width={30} height={14} />
                    </View>
                    <View style={styles.actionItem}>
                        <Skeleton width={24} height={24} borderRadius={12} />
                        <Skeleton width={30} height={14} />
                    </View>
                </View>
                <Skeleton width={24} height={24} borderRadius={12} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatar: {
        marginRight: 12,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        marginBottom: 6,
    },
    timestamp: {
        marginTop: 2,
    },
    content: {
        marginBottom: 16,
    },
    line: {
        marginBottom: 8,
    },
    imagePlaceholder: {
        marginBottom: 16,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    leftActions: {
        flexDirection: 'row',
        gap: 20,
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
});
