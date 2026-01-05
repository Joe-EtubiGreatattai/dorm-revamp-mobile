import ActionSuccessModal from '@/components/ActionSuccessModal';
import CustomLoader from '@/components/CustomLoader';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { marketAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
// import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@/context/AuthContext';
import React, { useRef, useState } from 'react';
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

export default function MarketItemDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [isBuyConfirmVisible, setBuyConfirmVisible] = useState(false);
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

    // Derived state
    // Derived state
    const sellerData = item?.ownerId;
    const seller = {
        id: sellerData?._id || 'unknown',
        name: sellerData?.name || 'Unknown User',
        avatar: sellerData?.avatar || 'https://i.pravatar.cc/150',
        university: sellerData?.university || 'Campus'
    };

    React.useEffect(() => {
        const fetchItem = async () => {
            try {
                const { data } = await marketAPI.getItem(id as string);
                setItem(data);
            } catch (error) {
                console.log('Error fetching item:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchItem();
    }, [id]);

    if (isLoading) {
        return (
            <>
                <Stack.Screen options={{ headerShown: false }} />
                <CustomLoader message="Loading item details..." />
            </>
        );
    }

    if (!item) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={{ padding: 20, alignItems: 'center' }}>
                    <Text style={{ color: colors.text }}>Item not found</Text>
                    <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
                        <Text style={{ color: colors.primary }}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const handleBuy = () => {
        setBuyConfirmVisible(true);
    };

    const confirmPurchase = async () => {
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
                setErrorMessage(error.response?.data?.message || 'Failed to execute purchase. Please try again.');
            }
            setErrorModalVisible(true);
        } finally {
            setIsPurchasing(false);
            setBuyConfirmVisible(false);
        }
    };

    const handlePurchaseSuccess = (data: any) => {
        setPurchasedOrderId(data.order?._id);
        setBuyConfirmVisible(false);
        setTimeout(() => {
            setSuccessModalVisible(true);
        }, 500);
    };

    const handleTrackOrder = () => {
        setSuccessModalVisible(false);
        if (purchasedOrderId) {
            router.push(`/tracker/${purchasedOrderId}?type=item`);
        }
    };

    const handleChat = () => {
        router.push(`/chat/dm_${seller.id}`);
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
                        data={item.images}
                        keyExtractor={(img, index) => index.toString()}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onScroll={onScroll}
                        renderItem={({ item: imageUrl }) => (
                            <Image source={{ uri: imageUrl }} style={styles.sliderImage} />
                        )}
                    />

                    {/* Pagination Dots */}
                    {item.images.length > 1 && (
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
                        <Ionicons name="share-outline" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Content */}
                <View style={styles.content}>
                    <View style={styles.headerInfo}>
                        <Text style={[styles.category, { color: colors.primary }]}>{item.category}</Text>
                        <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
                        <Text style={[styles.price, { color: colors.text }]}>₦{item.price.toLocaleString()}</Text>
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    {/* Seller Card */}
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Seller Information</Text>
                    <TouchableOpacity
                        style={[styles.sellerCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => router.push(`/user/${seller.id}`)}
                    >
                        <Image source={{ uri: seller.avatar }} style={styles.sellerAvatar} />
                        <View style={styles.sellerInfo}>
                            <Text style={[styles.sellerName, { color: colors.text }]}>{seller.name}</Text>
                            <Text style={[styles.sellerSchool, { color: colors.subtext }]}>{seller.university}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
                    </TouchableOpacity>

                    <View style={styles.descriptionSection}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
                        <Text style={[styles.description, { color: colors.subtext }]}>{item.description}</Text>
                    </View>

                    {/* Safety Tips */}
                    <View style={[styles.safetyTips, { backgroundColor: colors.primary + '10' }]}>
                        <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
                        <Text style={[styles.safetyText, { color: colors.primary }]}>
                            Meet in a public campus location for a safe transaction.
                        </Text>
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Actions */}
            <SafeAreaView edges={['bottom']} style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                <TouchableOpacity
                    style={[styles.chatBtn, { borderColor: colors.primary }]}
                    onPress={handleChat}
                >
                    <Ionicons name="chatbubble-outline" size={22} color={colors.primary} />
                    <Text style={[styles.chatBtnText, { color: colors.primary }]}>Chat</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.buyBtn, { backgroundColor: colors.primary }]}
                    onPress={handleBuy}
                >
                    <Text style={styles.buyBtnText}>Buy Now</Text>
                </TouchableOpacity>
            </SafeAreaView>

            <ActionSuccessModal
                visible={isBuyConfirmVisible}
                onClose={() => setBuyConfirmVisible(false)}
                onConfirm={confirmPurchase}
                title="Confirm Purchase"
                description={`Are you sure you want to buy ${item.title} for ₦${item.price.toLocaleString()}?`}
                buttonText="Confirm"
                showCancel={true}
                iconName="cart"
            />
            {/* Success Modal */}
            <ActionSuccessModal
                visible={isSuccessModalVisible}
                onClose={() => setSuccessModalVisible(false)}
                onConfirm={handleTrackOrder}
                title="Purchase Successful!"
                description={`You've successfully purchased ${item.title}. The seller will arrange delivery.`}
                buttonText="Track Order"
                iconName="checkmark-circle"
            />
            {/* Error Modal */}
            <ActionSuccessModal
                visible={isErrorModalVisible}
                onClose={() => setErrorModalVisible(false)}
                onConfirm={() => setErrorModalVisible(false)}
                title="Purchase Failed"
                description={errorMessage}
                buttonText="OK"
                iconName="alert-circle"
            />
            {/* PaystackWebView temporarily disabled - investigating library import issues
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
        height: width * 0.8,
        position: 'relative',
    },
    sliderImage: {
        width: width,
        height: '100%',
    },
    pagination: {
        position: 'absolute',
        bottom: 20,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
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
    category: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 12,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    title: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 24,
        marginBottom: 8,
    },
    price: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 28,
    },
    divider: {
        height: 1,
        width: '100%',
        marginBottom: 20,
    },
    sectionTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
        marginBottom: 12,
    },
    sellerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 24,
    },
    sellerAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
    },
    sellerInfo: {
        flex: 1,
    },
    sellerName: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
    sellerSchool: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 13,
    },
    descriptionSection: {
        marginBottom: 24,
    },
    description: {
        fontFamily: 'PlusJakartaSans_400Regular',
        fontSize: 16,
        lineHeight: 24,
    },
    safetyTips: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 12,
        marginBottom: 40,
    },
    safetyText: {
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
    buyBtn: {
        flex: 2,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buyBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        color: '#fff',
        fontSize: 16,
    },
});
