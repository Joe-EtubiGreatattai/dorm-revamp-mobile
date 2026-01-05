import ActionSuccessModal from '@/components/ActionSuccessModal';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { electionAPI, walletAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

export default function ApplyForPosition() {
    const { electionId, positionId, positionTitle, contestantFee } = useLocalSearchParams();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [manifesto, setManifesto] = useState('');
    const [nickname, setNickname] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Payment states
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
    const [paymentReference, setPaymentReference] = useState<string | null>(null);
    const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);

    // Modal states
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = () => {
        if (!manifesto.trim()) {
            setErrorMessage('Please enter your manifesto');
            setShowErrorModal(true);
            return;
        }

        if (!electionId || !positionId) {
            setErrorMessage('Invalid election or position');
            setShowErrorModal(true);
            return;
        }

        // Show confirmation modal
        setShowConfirmModal(true);
    };

    const handleConfirmSubmit = async () => {
        setShowConfirmModal(false);
        setIsSubmitting(true);

        try {
            // First initialize Paystack payment
            const amount = Number(contestantFee || 0);
            if (amount > 0) {
                const initRes = await walletAPI.initializePayment(amount);
                if (initRes.data?.data?.authorization_url) {
                    setPaymentUrl(initRes.data.data.authorization_url);
                    setPaymentReference(initRes.data.data.reference);
                    setShowPaymentModal(true);
                } else {
                    throw new Error('Could not initialize payment. Please try again.');
                }
            } else {
                // No fee, just apply
                await finalizeApplication();
            }
        } catch (error: any) {
            console.error('Application error:', error);
            setErrorMessage(error.response?.data?.message || error.message || 'Failed to initialize application. Please try again.');
            setShowErrorModal(true);
            setIsSubmitting(false);
        }
    };

    const handleNavigationStateChange = (navState: any) => {
        // Look for the callback URL (configured on Paystack)
        if (navState.url.includes('/verify-callback') || navState.url.includes('checkout-done')) {
            setShowPaymentModal(false);
            verifyAndSubmit();
        }
    };

    const verifyAndSubmit = async () => {
        if (!paymentReference) return;

        setIsVerifyingPayment(true);
        try {
            // 1. Verify payment and fund wallet
            await walletAPI.verifyPayment(paymentReference);

            // 2. Finalize application
            await finalizeApplication();
        } catch (error: any) {
            console.error('Verification error:', error);
            setErrorMessage(error.response?.data?.message || 'Payment verification failed. If you were debited, please contact support.');
            setShowErrorModal(true);
            setIsSubmitting(false);
        } finally {
            setIsVerifyingPayment(false);
        }
    };

    const finalizeApplication = async () => {
        try {
            await electionAPI.applyForPosition(
                electionId as string,
                positionId as string,
                { manifesto, nickname }
            );
            setShowSuccessModal(true);
        } catch (error: any) {
            console.error('Finalize error:', error);
            setErrorMessage(error.response?.data?.message || 'Payment was successful but application failed. Please contact support.');
            setShowErrorModal(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Apply for Position</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.subtext }]}>{positionTitle}</Text>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Fee Info */}
                <View style={[styles.feeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="cash-outline" size={32} color={colors.primary} />
                    <View style={{ flex: 1, marginLeft: 16 }}>
                        <Text style={[styles.feeLabel, { color: colors.subtext }]}>Contestant Fee</Text>
                        <Text style={[styles.feeAmount, { color: colors.text }]}>
                            ₦{Number(contestantFee || 0).toLocaleString()}
                        </Text>
                    </View>
                </View>

                {/* Nickname Input */}
                <View style={styles.section}>
                    <Text style={[styles.label, { color: colors.text }]}>Campaign Nickname</Text>
                    <TextInput
                        style={[
                            styles.input,
                            { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
                        ]}
                        value={nickname}
                        onChangeText={setNickname}
                        placeholder='e.g. "The Catalyst"'
                        placeholderTextColor={colors.subtext + '80'}
                    />
                </View>

                {/* Manifesto Input */}
                <View style={styles.section}>
                    <Text style={[styles.label, { color: colors.text }]}>Your Manifesto *</Text>
                    <Text style={[styles.hint, { color: colors.subtext }]}>
                        Tell voters why you're the best candidate for this position
                    </Text>
                    <TextInput
                        style={[
                            styles.textArea,
                            { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
                        ]}
                        value={manifesto}
                        onChangeText={setManifesto}
                        placeholder="Enter your manifesto..."
                        placeholderTextColor={colors.subtext + '80'}
                        multiline
                        numberOfLines={8}
                        textAlignVertical="top"
                    />
                </View>

                {/* Info Box */}
                <View style={[styles.infoBox, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
                    <Ionicons name="information-circle" size={24} color={colors.primary} />
                    <Text style={[styles.infoText, { color: colors.text }]}>
                        Your application will be reviewed by administrators. Once approved, you'll be listed as a candidate and voters can see your manifesto.
                    </Text>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    style={[
                        styles.submitBtn,
                        { backgroundColor: colors.primary },
                        (isSubmitting || isVerifyingPayment) && styles.submitBtnDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={isSubmitting || isVerifyingPayment}
                >
                    <Text style={styles.submitBtnText}>
                        {isSubmitting ? 'Processing...' : isVerifyingPayment ? 'Verifying Payment...' : 'Pay & Submit Application'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Paystack WebView Modal */}
            <Modal visible={showPaymentModal} animationType="slide">
                <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Secure Payment</Text>
                        <TouchableOpacity
                            onPress={() => {
                                setShowPaymentModal(false);
                                setIsSubmitting(false);
                            }}
                            style={styles.closeBtn}
                        >
                            <Ionicons name="close" size={24} color="#000" />
                        </TouchableOpacity>
                    </View>
                    {paymentUrl && (
                        <WebView
                            source={{ uri: paymentUrl }}
                            onNavigationStateChange={handleNavigationStateChange}
                            javaScriptEnabled={true}
                            domStorageEnabled={true}
                            startInLoadingState={true}
                            renderLoading={() => (
                                <View style={styles.webViewLoader}>
                                    <ActivityIndicator size="large" color={colors.primary} />
                                </View>
                            )}
                        />
                    )}
                </SafeAreaView>
            </Modal>

            {/* Confirmation Modal */}
            <ActionSuccessModal
                visible={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={handleConfirmSubmit}
                title="Confirm Application"
                description={`You will be processed for a payment of ₦${Number(contestantFee || 0).toLocaleString()} to proceed. Do you want to continue?`}
                buttonText="Pay & Apply"
                cancelText="Cancel"
                showCancel={true}
                iconName="wallet-outline"
                isLoading={isSubmitting}
            />

            {/* Success Modal */}
            <ActionSuccessModal
                visible={showSuccessModal}
                onClose={() => {
                    setShowSuccessModal(false);
                    router.back();
                }}
                title="Application Submitted!"
                description="Your payment was successful and your application has been submitted. You will be notified once it's reviewed."
                buttonText="Done"
                iconName="checkmark-circle"
            />

            {/* Error Modal */}
            <ActionSuccessModal
                visible={showErrorModal}
                onClose={() => setShowErrorModal(false)}
                title="Error"
                description={errorMessage}
                buttonText="OK"
                iconName="alert-circle"
                iconColor="#ef4444"
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        marginBottom: 10,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 20,
    },
    headerSubtitle: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_500Medium',
        marginTop: 2,
    },
    scrollContent: {
        padding: 20,
    },
    feeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 24,
    },
    feeLabel: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    feeAmount: {
        fontSize: 28,
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        marginTop: 4,
    },
    section: {
        marginBottom: 24,
    },
    label: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
        marginBottom: 4,
    },
    hint: {
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_500Medium',
        marginBottom: 12,
    },
    input: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_500Medium',
        marginBottom: 10,
    },
    textArea: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_500Medium',
        minHeight: 180,
    },
    infoBox: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 32,
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_500Medium',
        lineHeight: 20,
    },
    submitBtn: {
        paddingVertical: 18,
        borderRadius: 30,
        alignItems: 'center',
        marginBottom: 20,
    },
    submitBtnDisabled: {
        opacity: 0.6,
    },
    submitBtnText: {
        color: '#fff',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
    },
    closeBtn: {
        padding: 4,
    },
    webViewLoader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    }
});
