import CustomLoader from '@/components/CustomLoader';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { tourAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function RentReceiptScreen() {
    const { id } = useLocalSearchParams();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [tour, setTour] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTour = async () => {
            try {
                // Try fetching directly as a tour ID
                const { data } = await tourAPI.getTour(id as string);
                setTour(data);
            } catch (error) {
                console.log('Direct tour fetch failed, trying fallback search:', error);

                // FALLBACK: If direct fetch fails, the ID might be a listing ID (from older notifications)
                // We'll fetch all user tours and see if one matches this listing and is 'paid' or 'completed'
                try {
                    const { data: allTours } = await tourAPI.getTours();
                    const matchingTour = allTours.find((t: any) =>
                        (t.listingId?._id === id || t.listingId?.id === id) &&
                        (t.status === 'paid' || t.status === 'completed')
                    );

                    if (matchingTour) {
                        // Get full details for this tour
                        const { data: fullTour } = await tourAPI.getTour(matchingTour._id || matchingTour.id);
                        setTour(fullTour);
                    }
                } catch (fallbackError) {
                    console.log('Fallback search failed:', fallbackError);
                }
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchTour();
    }, [id]);

    const isPaid = tour?.status === 'paid';

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <Stack.Screen options={{ headerShown: false }} />
            {loading ? (
                <View style={{ flex: 1 }}>
                    <CustomLoader message="Loading receipt..." />
                </View>
            ) : !tour ? (
                <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
                    <View style={[styles.header, { borderBottomColor: colors.border }]}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                            <Ionicons name="arrow-back" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>Receipt Not Found</Text>
                        <View style={{ width: 40 }} />
                    </View>
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                        <Ionicons name="receipt-outline" size={64} color={colors.subtext} />
                        <Text style={{ color: colors.text, fontSize: 18, fontFamily: 'PlusJakartaSans_700Bold', marginTop: 16 }}>Receipt Not Found</Text>
                        <Text style={{ color: colors.subtext, textAlign: 'center', marginTop: 8 }}>We couldn't find the transaction record for this ID. Please check your wallet history for receipts.</Text>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={{ marginTop: 24, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
                        >
                            <Text style={{ color: '#fff', fontFamily: 'PlusJakartaSans_700Bold' }}>Go Back</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            ) : (
                <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
                    <View style={[styles.header, { borderBottomColor: colors.border }]}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>Transaction Receipt</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        {/* Process Summary */}
                        <View style={styles.processCard}>
                            <View style={styles.step}>
                                <View style={[styles.stepDot, { backgroundColor: '#10b981' }]}>
                                    <Ionicons name="checkmark" size={14} color="#fff" />
                                </View>
                                <View style={styles.stepContent}>
                                    <Text style={[styles.stepTitle, { color: colors.text }]}>Tour Requested</Text>
                                    <Text style={[styles.stepDate, { color: colors.subtext }]}>{new Date(tour.createdAt).toDateString()}</Text>
                                </View>
                            </View>
                            <View style={styles.stepLine} />
                            <View style={styles.step}>
                                <View style={[styles.stepDot, { backgroundColor: '#10b981' }]}>
                                    <Ionicons name="checkmark" size={14} color="#fff" />
                                </View>
                                <View style={styles.stepContent}>
                                    <Text style={[styles.stepTitle, { color: colors.text }]}>Tour Completed</Text>
                                    <Text style={[styles.stepDate, { color: colors.subtext }]}>Verified by Agent</Text>
                                </View>
                            </View>
                            <View style={styles.stepLine} />
                            <View style={styles.step}>
                                <View style={[styles.stepDot, { backgroundColor: isPaid ? '#10b981' : colors.border }]}>
                                    {isPaid && <Ionicons name="checkmark" size={14} color="#fff" />}
                                </View>
                                <View style={styles.stepContent}>
                                    <Text style={[styles.stepTitle, { color: colors.text }]}>Payment Successfully Confirmed</Text>
                                    <Text style={[styles.stepDate, { color: colors.subtext }]}>{isPaid ? 'Credited to Wallet' : 'Pending'}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Main Receipt Card */}
                        <View style={[styles.receiptCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={styles.receiptHeader}>
                                <View style={[styles.checkIcon, { backgroundColor: '#10b98120' }]}>
                                    <Ionicons name="checkmark-circle" size={40} color="#10b981" />
                                </View>
                                <Text style={[styles.receiptStatus, { color: '#10b981' }]}>Payment Successful</Text>
                                <Text style={[styles.receiptAmount, { color: colors.text }]}>₦{tour.listingId.price.toLocaleString()}</Text>
                            </View>

                            <View style={[styles.divider, { backgroundColor: colors.border }]} />

                            <View style={styles.detailsList}>
                                <View style={styles.detailItem}>
                                    <Text style={[styles.detailLabel, { color: colors.subtext }]}>Reference ID</Text>
                                    <Text style={[styles.detailValue, { color: colors.text }]}>{tour._id.slice(-12).toUpperCase()}</Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <Text style={[styles.detailLabel, { color: colors.subtext }]}>Payment Date</Text>
                                    <Text style={[styles.detailValue, { color: colors.text }]}>{new Date(tour.updatedAt).toLocaleString()}</Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <Text style={[styles.detailLabel, { color: colors.subtext }]}>Student Name</Text>
                                    <Text style={[styles.detailValue, { color: colors.text }]}>{tour.requesterId.name}</Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <Text style={[styles.detailLabel, { color: colors.subtext }]}>Property</Text>
                                    <Text style={[styles.detailValue, { color: colors.text }]}>{tour.listingId.title}</Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <Text style={[styles.detailLabel, { color: colors.subtext }]}>Payment Method</Text>
                                    <View style={styles.methodRow}>
                                        <Ionicons name="wallet-outline" size={16} color={colors.primary} />
                                        <Text style={[styles.detailValue, { color: colors.text }]}>Dorm Wallet</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={[styles.footerDecoration, { backgroundColor: colors.background }]}>
                                {[...Array(15)].map((_, i) => (
                                    <View key={i} style={[styles.tooth, { backgroundColor: colors.card }]} />
                                ))}
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.doneBtn, { backgroundColor: colors.primary }]}
                            onPress={() => router.replace('/(tabs)/housing')}
                        >
                            <Text style={styles.doneBtnText}>Back to Housing</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </SafeAreaView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
    },
    scrollContent: {
        padding: 24,
    },
    processCard: {
        marginBottom: 32,
    },
    step: {
        flexDirection: 'row',
        gap: 16,
        alignItems: 'flex-start',
    },
    stepDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    stepLine: {
        width: 2,
        height: 30,
        backgroundColor: '#10b981',
        marginLeft: 11,
        marginVertical: -2,
    },
    stepContent: {
        flex: 1,
    },
    stepTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 15,
        marginBottom: 2,
    },
    stepDate: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
    },
    receiptCard: {
        borderRadius: 20,
        borderWidth: 1,
        paddingTop: 32,
        overflow: 'hidden',
        marginBottom: 32,
    },
    receiptHeader: {
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    checkIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    receiptStatus: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
        marginBottom: 8,
    },
    receiptAmount: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 32,
    },
    divider: {
        height: 1,
        marginHorizontal: 20,
        marginBottom: 24,
        borderStyle: 'dashed',
    },
    detailsList: {
        paddingHorizontal: 24,
        gap: 16,
        paddingBottom: 40,
    },
    detailItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailLabel: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
    },
    detailValue: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
    methodRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    footerDecoration: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingBottom: 2,
    },
    tooth: {
        width: 20,
        height: 10,
        borderRadius: 5,
        marginTop: -5,
    },
    doneBtn: {
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    doneBtnText: {
        color: '#fff',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    }
});
