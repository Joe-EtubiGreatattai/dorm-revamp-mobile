import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import { authAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Input = ({ label, icon, colors, ...props }: any) => (
    <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {icon && <Ionicons name={icon} size={20} color={colors.subtext} style={styles.inputIcon} />}
            <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholderTextColor={colors.subtext}
                {...props}
            />
        </View>
    </View>
);

export default function VerificationScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { user, refreshUser } = useAuth();
    const { showAlert } = useAlert();

    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        identityType: (user?.identityType as 'bvn' | 'nin') || 'bvn',
        identityNumber: user?.identityNumber || '',
        kycDocument: user?.kycDocument || null,
    });

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.5,
        });

        if (!result.canceled) {
            setFormData({ ...formData, kycDocument: result.assets[0].uri });
        }
    };

    const handleSubmit = async () => {
        if (!formData.identityNumber || formData.identityNumber.length < 11) {
            showAlert({
                title: 'Invalid Number',
                description: 'Please enter a valid 11-digit identity number.',
                type: 'error',
                buttonText: 'Try Again'
            });
            return;
        }

        setIsLoading(true);
        try {
            const data = new FormData();
            data.append('identityType', formData.identityType);
            data.append('identityNumber', formData.identityNumber);

            if (formData.kycDocument && formData.kycDocument.startsWith('file://')) {
                const filename = formData.kycDocument.split('/').pop();
                const match = /\.(\w+)$/.exec(filename || '');
                const type = match ? `image/${match[1]}` : `image`;
                // @ts-ignore
                data.append('kycDocument', {
                    uri: Platform.OS === 'ios' ? formData.kycDocument.replace('file://', '') : formData.kycDocument,
                    name: filename,
                    type,
                });
            }

            await authAPI.submitKyc(data);
            await refreshUser();
            showAlert({
                title: 'Submission Received',
                description: 'Your verification request has been submitted successfully! We will review it shortly.',
                type: 'success',
                buttonText: 'Done',
                onConfirm: () => router.back()
            });
        } catch (error: any) {
            console.error('KYC Submission Error:', error);
            showAlert({
                title: 'Submission Failed',
                description: error.response?.data?.message || 'Failed to submit verification request. Please try again.',
                type: 'error',
                buttonText: 'Try Again'
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (user?.kycStatus === 'verified') {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack.Screen
                    options={{
                        headerTitle: 'Identity Verification',
                        headerShadowVisible: false,
                        headerStyle: { backgroundColor: colors.background },
                        headerTintColor: colors.text,
                        headerLeft: () => (
                            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 10 }}>
                                <Ionicons name="arrow-back" size={24} color={colors.text} />
                            </TouchableOpacity>
                        ),
                    }}
                />
                <View style={[styles.successContainer, { paddingBottom: insets.bottom + 40 }]}>
                    <View style={[styles.successIconBox, { backgroundColor: '#dcfce7' }]}>
                        <Ionicons name="checkmark-done" size={64} color="#166534" />
                    </View>
                    <Text style={[styles.successTitle, { color: colors.text }]}>Identity Verified</Text>
                    <Text style={[styles.successDesc, { color: colors.subtext }]}>
                        You have successfully verified your identity. You can now access all monetization features.
                    </Text>

                    <View style={[styles.verifiedBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.verifiedRow}>
                            <Text style={[styles.verifiedLabel, { color: colors.subtext }]}>Status</Text>
                            <View style={styles.statusBadge}>
                                <Ionicons name="shield-checkmark" size={14} color="#166534" />
                                <Text style={styles.statusText}>Verified</Text>
                            </View>
                        </View>
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />
                        <View style={styles.verifiedRow}>
                            <Text style={[styles.verifiedLabel, { color: colors.subtext }]}>ID Type</Text>
                            <Text style={[styles.verifiedValue, { color: colors.text }]}>
                                {user?.identityType?.toUpperCase() || 'N/A'}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    }

    if (user?.kycStatus === 'pending') {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack.Screen
                    options={{
                        headerTitle: 'Identity Verification',
                        headerShadowVisible: false,
                        headerStyle: { backgroundColor: colors.background },
                        headerTintColor: colors.text,
                        headerLeft: () => (
                            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 10 }}>
                                <Ionicons name="arrow-back" size={24} color={colors.text} />
                            </TouchableOpacity>
                        ),
                    }}
                />
                <View style={[styles.successContainer, { paddingBottom: insets.bottom + 40 }]}>
                    <View style={[styles.successIconBox, { backgroundColor: '#fef3c7' }]}>
                        <Ionicons name="time-outline" size={64} color="#b45309" />
                    </View>
                    <Text style={[styles.successTitle, { color: colors.text }]}>Verification Pending</Text>
                    <Text style={[styles.successDesc, { color: colors.subtext }]}>
                        We are currently reviewing your submission. This usually takes 24-48 hours.
                    </Text>

                    <View style={[styles.verifiedBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.verifiedRow}>
                            <Text style={[styles.verifiedLabel, { color: colors.subtext }]}>Status</Text>
                            <View style={[styles.statusBadge, { backgroundColor: '#fef3c7' }]}>
                                <Ionicons name="time" size={14} color="#b45309" />
                                <Text style={[styles.statusText, { color: '#b45309' }]}>Pending Review</Text>
                            </View>
                        </View>
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />
                        <View style={styles.verifiedRow}>
                            <Text style={[styles.verifiedLabel, { color: colors.subtext }]}>Submitted</Text>
                            <Text style={[styles.verifiedValue, { color: colors.text }]}>Just now</Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen
                options={{
                    headerTitle: 'Identity Verification',
                    headerTitleStyle: { fontFamily: 'PlusJakartaSans_700Bold' },
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: colors.background },
                    headerTintColor: colors.text,
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 10 }}>
                            <Ionicons name="arrow-back" size={24} color={colors.text} />
                        </TouchableOpacity>
                    ),
                }}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={100}
            >
                <ScrollView
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.header}>
                        <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
                            <Ionicons name="shield-checkmark" size={32} color={colors.primary} />
                        </View>
                        <Text style={[styles.title, { color: colors.text }]}>Identity Verification</Text>
                        <Text style={[styles.subtitle, { color: colors.subtext }]}>
                            Submit your details to enable monetization and verify your identity.
                        </Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.text }]}>Identity Type</Text>
                            <View style={styles.radioGroup}>
                                {['bvn', 'nin'].map((type) => (
                                    <TouchableOpacity
                                        key={type}
                                        onPress={() => setFormData({ ...formData, identityType: type as any })}
                                        style={[
                                            styles.radioBtn,
                                            {
                                                borderColor: formData.identityType === type ? colors.primary : colors.border,
                                                backgroundColor: formData.identityType === type ? colors.primary + '10' : 'transparent'
                                            }
                                        ]}
                                    >
                                        <Ionicons
                                            name={formData.identityType === type ? "radio-button-on" : "radio-button-off"}
                                            size={20}
                                            color={formData.identityType === type ? colors.primary : colors.subtext}
                                        />
                                        <Text style={[styles.radioText, { color: colors.text }]}>{type.toUpperCase()}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <Input
                            label={`${formData.identityType.toUpperCase()} Number`}
                            placeholder={`Enter 11-digit ${formData.identityType.toUpperCase()}`}
                            value={formData.identityNumber}
                            onChangeText={(v: string) => setFormData({ ...formData, identityNumber: v })}
                            icon="card-outline"
                            keyboardType="number-pad"
                            maxLength={11}
                            colors={colors}
                        />

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.text }]}>Upload ID Document (Optional)</Text>
                            <TouchableOpacity
                                onPress={handlePickImage}
                                style={[
                                    styles.uploadBox,
                                    {
                                        backgroundColor: colors.card,
                                        borderColor: colors.border,
                                        borderStyle: formData.kycDocument ? 'solid' : 'dashed'
                                    }
                                ]}
                            >
                                {formData.kycDocument ? (
                                    <View style={styles.uploadSuccess}>
                                        <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                                        <Text style={[styles.uploadText, { color: colors.text }]}>Document Selected</Text>
                                        <TouchableOpacity onPress={() => setFormData({ ...formData, kycDocument: null })}>
                                            <Ionicons name="close-circle" size={24} color={colors.subtext} />
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <>
                                        <Ionicons name="cloud-upload-outline" size={32} color={colors.subtext} />
                                        <Text style={[styles.uploadText, { color: colors.subtext }]}>
                                            Tap to upload NIN slip or Student ID
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.infoBox}>
                        <Ionicons name="information-circle-outline" size={20} color={colors.subtext} />
                        <Text style={[styles.infoText, { color: colors.subtext }]}>
                            Your verification details are encrypted and securely stored. Review usually takes 24-48 hours.
                        </Text>
                    </View>
                </ScrollView>

                <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: colors.border }]}>
                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={isLoading}
                        style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: isLoading ? 0.7 : 1 }]}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.submitBtnText}>Submit for Review</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    iconBox: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_400Regular',
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 20,
    },
    form: {
        gap: 24,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 56,
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 16,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    radioGroup: {
        flexDirection: 'row',
        gap: 12,
    },
    radioBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
    },
    radioText: {
        fontSize: 15,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    uploadBox: {
        height: 120,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    uploadSuccess: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 20,
        width: '100%',
        justifyContent: 'space-between',
    },
    uploadText: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_500Medium',
        textAlign: 'center',
    },
    infoBox: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.02)',
        marginTop: 32,
        gap: 12,
        alignItems: 'center',
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_400Regular',
        lineHeight: 18,
    },
    footer: {
        padding: 24,
        borderTopWidth: 1,
    },
    submitBtn: {
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    submitBtnText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    successContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    successIconBox: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    successTitle: {
        fontSize: 24,
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        marginBottom: 12,
        textAlign: 'center',
    },
    successDesc: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_400Regular',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 40,
    },
    verifiedBadge: {
        width: '100%',
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        gap: 16,
    },
    verifiedRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    verifiedLabel: {
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    verifiedValue: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#dcfce7',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
    },
    statusText: {
        color: '#166534',
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    divider: {
        height: 1,
    },
});
