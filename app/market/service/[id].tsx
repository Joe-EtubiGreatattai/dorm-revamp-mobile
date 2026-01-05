import ActionSuccessModal from '@/components/ActionSuccessModal';
import CustomLoader from '@/components/CustomLoader';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { marketAPI, walletAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
// import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@/context/AuthContext';
import React, { useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    NativeScrollEvent,
    NativeSyntheticEvent,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// @ts-ignore
const PaystackLib = require('react-native-paystack-webview');
// @ts-ignore
const PaystackWebView = PaystackLib?.Paystack || PaystackLib?.default || PaystackLib;

const { width } = Dimensions.get('window');

export default function ServiceDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [isBookConfirmVisible, setBookConfirmVisible] = useState(false);
    const [isSuccessModalVisible, setSuccessModalVisible] = useState(false);
    const [isErrorModalVisible, setErrorModalVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [purchasedOrderId, setPurchasedOrderId] = useState<string | null>(null);

    const [item, setItem] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();
    const paystackWebViewRef = useRef<any>(null);
    const [paystackParams, setPaystackParams] = useState({ amount: 0, email: '', access_code: '', reference: '' });

    useEffect(() => {
        const fetchItem = async () => {
            try {
                const { data } = await marketAPI.getItem(id as string);
                setItem(data);
            } catch (error) {
                console.log('Error fetching service:', error);
            } finally {
                setIsLoading(false);
            }
        };
        if (id) fetchItem();
    }, [id]);

    if (isLoading) {
        return (
            <>
                <Stack.Screen options={{ headerShown: false }} />
                <CustomLoader message="Loading service details..." />
            </>
        );
    }

    if (!item) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="alert-circle-outline" size={64} color={colors.subtext} />
                    <Text style={{ color: colors.text, marginTop: 16 }}>Service not found</Text>
                    <TouchableOpacity style={{ marginTop: 20 }} onPress={() => router.back()}>
                        <Text style={{ color: colors.primary, fontFamily: 'PlusJakartaSans_600SemiBold' }}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const sellerData = item?.ownerId;
    const seller = {
        id: sellerData?._id || 'unknown',
        name: sellerData?.name || 'Unknown User',
        avatar: sellerData?.avatar || 'https://i.pravatar.cc/150',
        university: sellerData?.university || 'Campus'
    };

    const handleBook = () => {
        setBookConfirmVisible(true);
    };

    const confirmBooking = async () => {
        if (isPurchasing) return;
        setIsPurchasing(true);
        try {
            // Attempt purchase
            const { data } = await marketAPI.purchaseItem(item._id || id);
            handlePurchaseSuccess(data);
        } catch (error: any) {
            console.log('Purchase error:', error);

            if (error.response?.data?.message === 'Insufficient wallet balance') {
                setErrorMessage('Insufficient wallet balance. Please top up your wallet first.');
            } else {
                setErrorMessage(error.response?.data?.message || 'Failed to complete booking. Please try again.');
            }
            setErrorModalVisible(true);
        } finally {
            setIsPurchasing(false);
            setBookConfirmVisible(false);
        }
    };

    const handlePaystackSuccess = async (res: any) => {
        // 3. Verify Payment
        try {
            console.log('Paystack success:', res);
            const { data: verifyData } = await walletAPI.verifyPayment(paystackParams.reference || res.transactionRef.reference);

            if (verifyData.message === 'Wallet funded successfully') {
                // 4. Retry Purchase
                const { data: retryData } = await marketAPI.purchaseItem(item._id || id);
                handlePurchaseSuccess(retryData);
            } else {
                alert('Payment verification failed.');
            }
        } catch (error) {
            console.log('Verification Error:', error);
            alert('Failed to verify payment.');
        }
    };

    const handlePurchaseSuccess = (data: any) => {
        setPurchasedOrderId(data.order?._id);
        setBookConfirmVisible(false);
        setTimeout(() => {
            setSuccessModalVisible(true);
        }, 500);
    };

    const handleTrackOrder = () => {
        setSuccessModalVisible(false);
        if (purchasedOrderId) {
            router.push(`/tracker/${purchasedOrderId}?type=service`);
        }
    };

    const handleChat = () => {
        if (seller.id !== 'unknown') {
            router.push(`/chat/dm_${seller.id}`);
        }
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out ${item.title} for ₦${item.price.toLocaleString()} on Dorm! ${item.description}`,
                title: item.title,
            });
        } catch (error) {
            console.log('Error sharing:', error);
        }
    };

    const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const slideSize = event.nativeEvent.layoutMeasurement.width;
        const index = event.nativeEvent.contentOffset.x / slideSize;
        setActiveImageIndex(Math.round(index));
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Image Slider */}
                <View style={styles.imageContainer}>
                    <FlatList
                        data={item.images || [item.image]}
                        keyExtractor={(img, index) => index.toString()}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onScroll={onScroll}
                        renderItem={({ item: imageUrl }) => (
                            <Image source={{ uri: imageUrl }} style={styles.sliderImage} />
                        )}
                    />

                    {(item.images?.length > 1) && (
                        <View style={styles.pagination}>
                            {item.images.map((_: any, index: number) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.dot,
                                        { backgroundColor: activeImageIndex === index ? colors.primary : 'rgba(255,255,255,0.5)' }
                                    ]}
                                />
                            ))}
                        </View>
                    )}

                    <TouchableOpacity
                        style={[styles.backBtn, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.shareBtn, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
                        onPress={handleShare}
                    >
                        <Ionicons name="share-social-outline" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    <View style={styles.headerInfo}>
                        <View style={styles.badgeRow}>
                            <View style={[styles.typeBadge, { backgroundColor: colors.primary + '20' }]}>
                                <Text style={[styles.typeBadgeText, { color: colors.primary }]}>{item.category || 'Service'}</Text>
                            </View>
                            <View style={[styles.tagBadge, { backgroundColor: colors.border }]}>
                                <Text style={[styles.tagBadgeText, { color: colors.subtext }]}>Service</Text>
                            </View>
                        </View>
                        <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>

                        <View style={styles.metaRow}>
                            <View style={styles.metaItem}>
                                <Ionicons name="timer-outline" size={18} color={colors.subtext} />
                                <Text style={[styles.metaText, { color: colors.subtext }]}>{item.duration || 'Flexible'}</Text>
                            </View>
                            <View style={styles.metaDivider} />
                            <View style={styles.metaItem}>
                                <Ionicons name="location-outline" size={18} color={colors.subtext} />
                                <Text style={[styles.metaText, { color: colors.subtext }]}>{item.platform || item.location || 'Online'}</Text>
                            </View>
                        </View>

                        <View style={styles.priceContainer}>
                            <Text style={[styles.priceLabel, { color: colors.subtext }]}>Rate:</Text>
                            <Text style={[styles.price, { color: colors.text }]}>₦{item.price?.toLocaleString()}</Text>
                        </View>
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.descriptionSection}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>About this Service</Text>
                        <Text style={[styles.description, { color: colors.subtext }]}>{item.description}</Text>
                    </View>

                    {/* Features - hardcoded for now, or fetch if available */}
                    <View style={styles.featuresGrid}>
                        <View style={[styles.featureItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                            <Text style={[styles.featureText, { color: colors.text }]}>Flexible Timing</Text>
                        </View>
                        <View style={[styles.featureItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Ionicons name="school-outline" size={20} color={colors.primary} />
                            <Text style={[styles.featureText, { color: colors.text }]}>Student Expert</Text>
                        </View>
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border, marginTop: 24 }]} />

                    {/* Seller Card */}
                    <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Professional Info</Text>
                    <TouchableOpacity
                        style={[styles.sellerCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => router.push(`/user/${seller.id}`)}
                    >
                        <Image source={{ uri: seller.avatar || 'https://i.pravatar.cc/150' }} style={styles.sellerAvatar} />
                        <View style={styles.sellerInfo}>
                            <Text style={[styles.sellerName, { color: colors.text }]}>{seller.name || 'Unknown'}</Text>
                            <Text style={[styles.sellerSchool, { color: colors.subtext }]}>{seller.university || 'University'}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
                    </TouchableOpacity>

                    <View style={[styles.infoBox, { backgroundColor: colors.primary + '10' }]}>
                        <Ionicons name="shield-outline" size={20} color={colors.primary} />
                        <Text style={[styles.infoBoxText, { color: colors.primary }]}>
                            Payments are handled through Dorm Escrow for your safety.
                        </Text>
                    </View>
                </View>
            </ScrollView>

            <SafeAreaView edges={['bottom']} style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                <TouchableOpacity
                    style={[styles.chatBtn, { borderColor: colors.primary }]}
                    onPress={handleChat}
                >
                    <Ionicons name="chatbubble-outline" size={22} color={colors.primary} />
                    <Text style={[styles.chatBtnText, { color: colors.primary }]}>Chat</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.bookBtn, { backgroundColor: colors.primary }]}
                    onPress={handleBook}
                >
                    <Text style={styles.bookBtnText}>Book Now</Text>
                </TouchableOpacity>
            </SafeAreaView>

            <ActionSuccessModal
                visible={isBookConfirmVisible}
                onClose={() => setBookConfirmVisible(false)}
                onConfirm={confirmBooking}
                title="Confirm Booking"
                description={`Book ${item.title} with ${seller.name} for ₦${item.price?.toLocaleString()}? Duration: ${item.duration || 'Flexible'}.`}
                buttonText={isPurchasing ? "Processing..." : "Request Booking"}
                showCancel={true}
                iconName="calendar"
            />
            {/* Success Modal */}
            <ActionSuccessModal
                visible={isSuccessModalVisible}
                onClose={() => setSuccessModalVisible(false)}
                onConfirm={handleTrackOrder}
                title="Booking Request Sent!"
                description={`Your request has been sent to ${seller.name}. You'll be notified when they accept.`}
                buttonText="Track Request"
                iconName="checkmark-circle"
            />
            {/* Error Modal */}
            <ActionSuccessModal
                visible={isErrorModalVisible}
                onClose={() => setErrorModalVisible(false)}
                onConfirm={() => setErrorModalVisible(false)}
                title="Booking Failed"
                description={errorMessage}
                buttonText="OK"
                iconName="alert-circle"
            />

            {/* PaystackWebView temporarily disabled
            <PaystackWebView
                paystackKey={PAYSTACK_PUBLIC_KEY}
                billingEmail={paystackParams.email}
                amount={paystackParams.amount}
                onCancel={(e: any) => {
                    console.log('User cancelled payment', e);
                    setIsPurchasing(false);
                }}
                onSuccess={handlePaystackSuccess}
                ref={paystackWebViewRef}
                channels={['card', 'bank', 'ussd', 'qr', 'mobile_money']}
            />
            */}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    imageContainer: {
        width: width,
        height: width * 0.7,
        position: 'relative',
    },
    sliderImage: {
        width: width,
        height: '100%',
    },
    pagination: {
        position: 'absolute',
        bottom: 16,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    backBtn: {
        position: 'absolute',
        top: 60,
        left: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    shareBtn: {
        position: 'absolute',
        top: 60,
        right: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 20,
    },
    headerInfo: {
        marginBottom: 20,
    },
    badgeRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    typeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    typeBadgeText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 10,
        textTransform: 'uppercase',
    },
    tagBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    tagBadgeText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 10,
    },
    title: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 26,
        marginBottom: 12,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 20,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaDivider: {
        width: 1,
        height: 14,
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    metaText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    priceLabel: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 16,
    },
    price: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 28,
    },
    divider: {
        height: 1,
        width: '100%',
        marginBottom: 24,
    },
    sectionTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
        marginBottom: 12,
    },
    descriptionSection: {
        marginBottom: 20,
    },
    description: {
        fontFamily: 'PlusJakartaSans_400Regular',
        fontSize: 16,
        lineHeight: 24,
    },
    featuresGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    featureItem: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        gap: 8,
    },
    featureText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 12,
    },
    sellerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 20,
    },
    sellerAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
    },
    sellerInfo: {
        flex: 1,
    },
    sellerName: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 15,
    },
    sellerSchool: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 12,
        marginBottom: 40,
    },
    infoBoxText: {
        flex: 1,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 13,
        lineHeight: 18,
    },
    bottomBar: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 24,
        borderTopWidth: 0.5,
        gap: 12,
    },
    chatBtn: {
        flex: 1,
        height: 52,
        borderRadius: 26,
        borderWidth: 1.5,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    chatBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
    bookBtn: {
        flex: 1.5,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bookBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        color: '#fff',
        fontSize: 16,
    },
});
