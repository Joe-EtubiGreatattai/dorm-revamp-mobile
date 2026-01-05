import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.primary, '#FF6B3D', '#FF8F6B']}
                style={styles.background}
            />

            <SafeAreaView style={styles.content}>
                <View style={styles.logoSection}>
                    <View style={styles.logoBox}>
                        <Ionicons name="school" size={60} color="#fff" />
                    </View>
                    <Text style={styles.brandName}>Dorm</Text>
                    <Text style={styles.tagline}>Revolutionizing Student Life</Text>
                </View>

                <View style={styles.benefitSection}>
                    <View style={styles.benefitItem}>
                        <Ionicons name="cart" size={24} color="#fff" />
                        <Text style={styles.benefitText}>Hyper-local Campus Market</Text>
                    </View>
                    <View style={styles.benefitItem}>
                        <Ionicons name="stats-chart" size={24} color="#fff" />
                        <Text style={styles.benefitText}>Seamless Digital Voting</Text>
                    </View>
                    <View style={styles.benefitItem}>
                        <Ionicons name="business" size={24} color="#fff" />
                        <Text style={styles.benefitText}>Verified Student Housing</Text>
                    </View>
                </View>

                <View style={styles.actionSection}>
                    <TouchableOpacity
                        style={[styles.primaryBtn, { backgroundColor: '#fff' }]}
                        onPress={() => router.push('/(auth)/register')}
                    >
                        <Text style={[styles.primaryBtnText, { color: colors.primary }]}>Get Started</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryBtn}
                        onPress={() => router.push('/(auth)/login')}
                    >
                        <Text style={styles.secondaryBtnText}>I already have an account</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    background: {
        ...StyleSheet.absoluteFillObject,
    },
    content: {
        flex: 1,
        padding: 30,
        justifyContent: 'space-between',
    },
    logoSection: {
        alignItems: 'center',
        marginTop: 60,
    },
    logoBox: {
        width: 100,
        height: 100,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    brandName: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 48,
        color: '#fff',
        letterSpacing: -1,
    },
    tagline: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 16,
        color: 'rgba(255,255,255,0.9)',
        marginTop: 8,
    },
    benefitSection: {
        gap: 20,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    benefitText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 16,
        color: '#fff',
    },
    actionSection: {
        gap: 16,
        marginBottom: 20,
    },
    primaryBtn: {
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    primaryBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
    },
    secondaryBtn: {
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
        color: '#fff',
    },
});
