import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { walletAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const { height, width } = Dimensions.get('window');

interface Props {
    visible: boolean;
    onClose: () => void;
    type: 'topup' | 'withdraw';
    onSuccess: (amount: number) => void;
}

export default function WalletTransactionModal({ visible, onClose, type, onSuccess }: Props) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [step, setStep] = useState(1);
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank' | 'ussd'>('card');
    const [bankDetails, setBankDetails] = useState({ account: '', name: '', accountName: '' });
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    const [saveAccount, setSaveAccount] = useState(false);
    const [reference, setReference] = useState<string | null>(null);

    const { user } = useAuth();

    const formatWithCommas = (val: string) => {
        const num = val.replace(/[^0-9]/g, '');
        if (!num) return '';
        return Number(num).toLocaleString();
    };

    const removeCommas = (val: string) => val.replace(/,/g, '');

    const handleAmountChange = (val: string) => {
        const clean = removeCommas(val);
        if (clean.length <= 9) {
            setAmount(formatWithCommas(clean));
        }
    };

    const reset = () => {
        setStep(1);
        setAmount('');
        setLoading(false);
        setBankDetails({ account: '', name: '', accountName: '' });
        setSelectedAccountId(null);
        setSaveAccount(false);
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleNext = async () => {
        if (step === 1) {
            const cleanAmount = removeCommas(amount);
            if (!cleanAmount || isNaN(Number(cleanAmount)) || Number(cleanAmount) <= 0) return;

            if (type === 'topup') {
                initiatePaystack();
            } else {
                setStep(2);
            }
        } else if (step === 2) {
            // Withdrawal Logic
            setLoading(true);
            try {
                const rawAmount = Number(removeCommas(amount));
                await walletAPI.withdraw({
                    amount: rawAmount,
                    bankDetails: selectedAccountId ? undefined : {
                        account: bankDetails.account,
                        bank: bankDetails.name,
                        accountName: bankDetails.accountName
                    },
                    bankAccountId: selectedAccountId || undefined,
                    saveAccount
                });

                setStatusModal({
                    visible: true,
                    type: 'success',
                    title: 'Withdrawal Initiated',
                    message: `₦${amount} will be sent to your bank account shortly.`,
                    onClose: () => {
                        onSuccess(rawAmount);
                        handleClose();
                    }
                });
            } catch (error: any) {
                setStatusModal({
                    visible: true,
                    type: 'error',
                    title: 'Withdrawal Failed',
                    message: error.response?.data?.message || 'Failed to process withdrawal'
                });
            } finally {
                setLoading(false);
            }
        }
    };

    const [showBankList, setShowBankList] = useState(false);
    const [statusModal, setStatusModal] = useState<{
        visible: boolean;
        type: 'success' | 'error';
        title: string;
        message: string;
        onClose?: () => void;
    }>({ visible: false, type: 'success', title: '', message: '' });

    const NIGERIAN_BANKS = [
        "Access Bank", "Access Bank (Diamond)", "ALAT by WEMA", "ASO Savings and Loans",
        "Bowen Microfinance Bank", "Carbon", "CEMCS Microfinance Bank", "Citibank Nigeria",
        "Ecobank Nigeria", "Ekondo Microfinance Bank", "Fidelity Bank", "First Bank of Nigeria",
        "First City Monument Bank", "Globus Bank", "Guaranty Trust Bank", "Hasal Microfinance Bank",
        "Heritage Bank", "Jaiz Bank", "Keystone Bank", "Kuda Bank", "Lagos Building Investment Company",
        "Moniepoint Microfinance Bank", "One Finance", "Opay", "Palmpay", "Parallex Bank",
        "Polaris Bank", "Providus Bank", "Rubies MFB", "Sparkle Microfinance Bank",
        "Stanbic IBTC Bank", "Standard Chartered Bank", "Sterling Bank", "Suntrust Bank",
        "Taj Bank", "TCF MFB", "Titan Bank", "Union Bank of Nigeria", "United Bank For Africa",
        "Unity Bank", "VFD Microfinance Bank", "Wema Bank", "Zenith Bank"
    ];

    const initiatePaystack = async () => {
        setLoading(true);
        try {
            const rawAmount = Number(removeCommas(amount));
            const { data } = await walletAPI.initializePayment(rawAmount);

            setReference(data.data.reference);
            await WebBrowser.openBrowserAsync(data.data.authorization_url);
            setStep(3);
        } catch (error: any) {
            setStatusModal({
                visible: true,
                type: 'error',
                title: 'Payment Initialization Failed',
                message: error.response?.data?.message || 'Failed to initialize payment'
            });
        } finally {
            setLoading(false);
        }
    };

    const verifyPayment = async () => {
        if (!reference) return;
        setLoading(true);
        try {
            const { data } = await walletAPI.verifyPayment(reference);
            if (data.message === 'Wallet funded successfully') {
                setStatusModal({
                    visible: true,
                    type: 'success',
                    title: 'Top Up Successful',
                    message: `₦${amount} has been added to your Dorm wallet.`,
                    onClose: () => {
                        onSuccess(Number(removeCommas(amount)));
                        handleClose();
                    }
                });
            } else {
                setStatusModal({
                    visible: true,
                    type: 'error',
                    title: 'Verification Pending',
                    message: 'Payment not yet verified. Please try again in a moment.'
                });
            }
        } catch (error: any) {
            setStatusModal({
                visible: true,
                type: 'error',
                title: 'Verification Failed',
                message: error.response?.data?.message || 'Verification failed'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleFinish = () => {
        setStatusModal({
            visible: true,
            type: 'success',
            title: 'Withdrawal Initiated',
            message: `₦${amount} will be sent to your bank account shortly.`,
            onClose: () => {
                onSuccess(Number(removeCommas(amount)));
                handleClose();
            }
        });
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    // ... (Step 1 implementation is same)
                    <View style={styles.stepContainer}>
                        <Text style={[styles.stepTitle, { color: colors.text }]}>
                            {type === 'topup' ? 'Top Up Amount' : 'Withdraw Amount'}
                        </Text>
                        <Text style={[styles.stepSub, { color: colors.subtext }]}>
                            How much would you like to {type === 'topup' ? 'add to' : 'withdraw from'} your wallet?
                        </Text>

                        <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Text style={[styles.currency, { color: colors.text }]}>₦</Text>
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="0.00"
                                placeholderTextColor={colors.subtext}
                                keyboardType="numeric"
                                value={amount}
                                onChangeText={handleAmountChange}
                                autoFocus
                            />
                        </View>

                        <View style={styles.presets}>
                            {[5000, 10000, 25000, 50000].map((p) => (
                                <TouchableOpacity
                                    key={p}
                                    style={[styles.presetBtn, { borderColor: colors.border }]}
                                    onPress={() => setAmount(p.toLocaleString())}
                                >
                                    <Text style={[styles.presetText, { color: colors.text }]}>+₦{p.toLocaleString()}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );
            case 2:
                // Withdrawal Details Step (Topup skips step 2)
                const hasSavedAccounts = user?.bankAccounts && user.bankAccounts.length > 0;

                return (
                    <View style={styles.stepContainer}>
                        <Text style={[styles.stepTitle, { color: colors.text }]}>Withdrawal Details</Text>
                        <Text style={[styles.stepSub, { color: colors.subtext }]}>Where should we send your money?</Text>

                        {hasSavedAccounts && user.bankAccounts && (
                            <View style={{ marginBottom: 20 }}>
                                <Text style={[styles.label, { color: colors.subtext, marginBottom: 12 }]}>Saved Accounts</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                                    {user.bankAccounts.map((acc: any) => (
                                        <TouchableOpacity
                                            key={acc._id}
                                            style={[
                                                styles.savedAccountCard,
                                                {
                                                    backgroundColor: colors.card,
                                                    borderColor: selectedAccountId === acc._id ? colors.primary : colors.border
                                                }
                                            ]}
                                            onPress={() => {
                                                setSelectedAccountId(acc._id);
                                                setBankDetails({ account: acc.accountNumber, name: acc.bankName, accountName: acc.accountName });
                                            }}
                                        >
                                            <Ionicons
                                                name="business-outline"
                                                size={20}
                                                color={selectedAccountId === acc._id ? colors.primary : colors.subtext}
                                            />
                                            <View>
                                                <Text style={[styles.accName, { color: colors.text }]} numberOfLines={1}>{acc.accountName}</Text>
                                                <Text style={[styles.accNumber, { color: colors.subtext }]}>{acc.bankName} • {acc.accountNumber.slice(-4)}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                    <TouchableOpacity
                                        style={[
                                            styles.savedAccountCard,
                                            { borderColor: selectedAccountId === null ? colors.primary : colors.border }
                                        ]}
                                        onPress={() => {
                                            setSelectedAccountId(null);
                                            setBankDetails({ account: '', name: '', accountName: '' });
                                        }}
                                    >
                                        <Ionicons name="add" size={24} color={selectedAccountId === null ? colors.primary : colors.subtext} />
                                        <Text style={[styles.accName, { color: colors.text }]}>New Account</Text>
                                    </TouchableOpacity>
                                </ScrollView>
                            </View>
                        )}

                        {(!hasSavedAccounts || selectedAccountId === null) && (
                            <>
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: colors.subtext }]}>Account Name</Text>
                                    <TextInput
                                        style={[styles.field, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                                        placeholder="e.g. John Doe"
                                        placeholderTextColor={colors.subtext}
                                        value={bankDetails.accountName}
                                        onChangeText={(t) => setBankDetails(p => ({ ...p, accountName: t }))}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: colors.subtext }]}>Account Number</Text>
                                    <TextInput
                                        style={[styles.field, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                                        placeholder="e.g. 0123456789"
                                        placeholderTextColor={colors.subtext}
                                        keyboardType="numeric"
                                        maxLength={10}
                                        value={bankDetails.account}
                                        onChangeText={(t) => setBankDetails(p => ({ ...p, account: t }))}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: colors.subtext }]}>Select Bank</Text>
                                    <TouchableOpacity
                                        style={[styles.field, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                                        onPress={() => setShowBankList(true)}
                                    >
                                        <Text style={{ color: bankDetails.name ? colors.text : colors.subtext }}>
                                            {bankDetails.name || "Choose Bank"}
                                        </Text>
                                        <Ionicons name="chevron-down" size={20} color={colors.subtext} />
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    style={styles.toggleRow}
                                    onPress={() => setSaveAccount(!saveAccount)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.toggleLabel, { color: colors.text }]}>Save for future use</Text>
                                    <Ionicons
                                        name={saveAccount ? "checkbox" : "square-outline"}
                                        size={24}
                                        color={saveAccount ? colors.primary : colors.border}
                                    />
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                );
            case 3:
                // With the new custom modal, we might not need this step's inline success view anymore,
                // or we can keep it as a confirmation step before the final modal.
                // However, the user asked to use the custom popup INSTEAD of alert.
                // The current implementation moves to step 3 to show success inline for withdrawals,
                // and for topup verification.
                // To reuse the component logic, we'll keep step 3 for the "Verify" state of topup,
                // but for success/error we'll use the modal.
                // Let's adjust slightly:
                // For Withdraw: HandleNext -> setStep(3) -> Wait -> handleFinish -> Show Modal
                // For Topup: initiatePaystack -> setStep(3) (Verify UI) -> verifyPayment -> Show Modal

                return (
                    <View style={[styles.stepContainer, { alignItems: 'center', paddingVertical: 40 }]}>
                        {/* We can repurpose Step 3 for "Processing/Verify" state instead of "Success" */}
                        {type === 'topup' ? (
                            <>
                                <View style={[styles.successIcon, { backgroundColor: colors.primary + '20' }]}>
                                    <Ionicons name="hourglass-outline" size={80} color={colors.primary} />
                                </View>
                                <Text style={[styles.successTitle, { color: colors.text }]}>
                                    verify Payment
                                </Text>
                                <Text style={[styles.successSub, { color: colors.subtext }]}>
                                    Please complete the payment in your browser, then click the button below to verify.
                                </Text>
                            </>
                        ) : (
                            // Keeping the simulated processing for withdrawal before showing modal
                            // Or we could have skipped directly to modal. But users like to see "Processing".
                            <View style={{ alignItems: 'center' }}>
                                <ActivityIndicator size="large" color={colors.primary} />
                                <Text style={[styles.successSub, { color: colors.subtext, marginTop: 20 }]}>
                                    Processing your request...
                                </Text>
                            </View>
                        )}
                    </View>
                );
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.overlay}
            >
                {/* ... (Dismiss area and Header same as before) */}
                <TouchableOpacity
                    style={styles.dismissArea}
                    activeOpacity={1}
                    onPress={step === 3 ? undefined : handleClose}
                />

                <View style={[styles.content, { backgroundColor: colors.background }]}>
                    <View style={styles.header}>
                        <View style={styles.dragHandle} />
                        {step < 3 && (
                            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color={colors.subtext} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {renderStep()}

                    {step < 3 && (
                        <TouchableOpacity
                            style={[styles.mainBtn, { backgroundColor: colors.primary }]}
                            onPress={handleNext}
                            disabled={loading || !amount || (step === 2 && type === 'withdraw' && (!bankDetails.account || !bankDetails.name))}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.mainBtnText}>
                                    {step === 1 ? 'Continue' : (type === 'topup' ? 'Complete Top Up' : 'Initiate Withdrawal')}
                                </Text>
                            )}
                        </TouchableOpacity>
                    )}

                    {step === 3 && type === 'topup' && (
                        <TouchableOpacity
                            style={[styles.mainBtn, { backgroundColor: colors.text }]}
                            onPress={verifyPayment}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color={colors.background} /> : (
                                <Text style={[styles.mainBtnText, { color: colors.background }]}>
                                    I have completed payment
                                </Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </KeyboardAvoidingView>

            {/* Bank Selection Overlay */}
            {showBankList && (
                <View style={[StyleSheet.absoluteFill, { zIndex: 100 }]}>
                    <View style={[styles.bankListContainer, { backgroundColor: colors.background }]}>
                        <View style={styles.header}>
                            <Text style={[styles.headerTitle, { color: colors.text }]}>Select Bank</Text>
                            <TouchableOpacity onPress={() => setShowBankList(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={{ padding: 20 }}>
                            {NIGERIAN_BANKS.map((bank) => (
                                <TouchableOpacity
                                    key={bank}
                                    style={[styles.bankItem, { borderBottomColor: colors.border }]}
                                    onPress={() => {
                                        setBankDetails(prev => ({ ...prev, name: bank }));
                                        setShowBankList(false);
                                    }}
                                >
                                    <Text style={[styles.bankName, { color: colors.text }]}>{bank}</Text>
                                    {bankDetails.name === bank && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            )}

            {/* Custom Status Overlay */}
            {statusModal.visible && (
                <View style={[styles.statusOverlay, StyleSheet.absoluteFill, { zIndex: 110 }]}>
                    <View style={[styles.statusContent, { backgroundColor: colors.background }]}>
                        <View style={[styles.statusIcon, {
                            backgroundColor: statusModal.type === 'success' ? '#10b98120' : '#ef444420'
                        }]}>
                            <Ionicons
                                name={statusModal.type === 'success' ? "checkmark-circle" : "alert-circle"}
                                size={60}
                                color={statusModal.type === 'success' ? "#10b981" : "#ef4444"}
                            />
                        </View>
                        <Text style={[styles.statusTitle, { color: colors.text }]}>{statusModal.title}</Text>
                        <Text style={[styles.statusMessage, { color: colors.subtext }]}>{statusModal.message}</Text>
                        <TouchableOpacity
                            style={[styles.statusBtn, { backgroundColor: colors.primary }]}
                            onPress={() => {
                                setStatusModal(prev => ({ ...prev, visible: false }));
                                statusModal.onClose?.();
                            }}
                        >
                            <Text style={styles.statusBtnText}>
                                {statusModal.type === 'success' ? 'Great!' : 'Try Again'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </Modal>
    );
}

const styles = StyleSheet.create({
    // ... (Existing styles)
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    // ...
    bankListContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    bankItem: {
        paddingVertical: 16,
        borderBottomWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    bankName: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    statusOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        padding: 24,
    },
    statusContent: {
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
    },
    statusIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    statusTitle: {
        fontSize: 22,
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        marginBottom: 12,
        textAlign: 'center',
    },
    statusMessage: {
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_500Medium',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    statusBtn: {
        width: '100%',
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusBtnText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    dismissArea: {
        flex: 1,
    },
    content: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 24,
        paddingBottom: Math.max(Platform.OS === 'ios' ? 40 : 24, 24),
    },
    header: {
        alignItems: 'center',
        paddingVertical: 12,
        position: 'relative',
    },
    dragHandle: {
        width: 40,
        height: 5,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 2.5,
    },
    closeBtn: {
        position: 'absolute',
        right: 0,
        top: 12,
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepContainer: {
        paddingTop: 10,
    },
    stepTitle: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 24,
        marginBottom: 8,
    },
    stepSub: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 16,
        marginBottom: 24,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 20,
    },
    currency: {
        fontSize: 24,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 32,
        fontFamily: 'PlusJakartaSans_800ExtraBold',
    },
    presets: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 30,
    },
    presetBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
    },
    presetText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
    },
    methodBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1.5,
        marginBottom: 12,
    },
    methodIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    methodInfo: {
        flex: 1,
    },
    methodTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
        marginBottom: 2,
    },
    methodSub: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 13,
    },
    mainBtn: {
        height: 56,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
    mainBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        color: '#fff',
        fontSize: 16,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
        marginBottom: 8,
    },
    field: {
        height: 56,
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 16,
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    successIcon: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    successTitle: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 24,
        marginBottom: 12,
        textAlign: 'center',
    },
    successSub: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 20,
    },
    savedAccountCard: {
        width: 160,
        padding: 16,
        borderRadius: 16,
        borderWidth: 2,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    accName: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    accNumber: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    toggleLabel: {
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
});
