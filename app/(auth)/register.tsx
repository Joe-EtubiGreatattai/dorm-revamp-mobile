import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import { authAPI, setAuthToken } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const Input = ({ label, icon, colors, rightIcon, onRightIconPress, ...props }: any) => (
    <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {icon && <Ionicons name={icon} size={20} color={colors.subtext} />}
            <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholderTextColor={colors.subtext}
                {...props}
            />
            {rightIcon && (
                <TouchableOpacity onPress={onRightIconPress}>
                    <Ionicons name={rightIcon} size={20} color={colors.subtext} />
                </TouchableOpacity>
            )}
        </View>
    </View>
);

export default function RegisterScreen() {
    const router = useRouter();
    const { refreshUser } = useAuth();
    const { showAlert } = useAlert();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [isLoading, setIsLoading] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [uniSuggestions, setUniSuggestions] = useState<string[]>([]);
    const [facultySuggestions, setFacultySuggestions] = useState<string[]>([]);
    const [levelSuggestions, setLevelSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState<'uni' | 'faculty' | 'level' | null>(null);
    const otpInputRef = useRef<TextInput>(null);
    const [tempToken, setTempToken] = useState<string | null>(null);

    // Timer State
    const [resendTimer, setResendTimer] = useState(59);

    useEffect(() => {
        let interval: any;
        if (currentStep === 5 && resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [currentStep, resendTimer]);

    useEffect(() => {
        if (currentStep === 5) {
            setTimeout(() => otpInputRef.current?.focus(), 500); // Increased delay
        }
    }, [currentStep]);

    const [universities, setUniversities] = useState<string[]>([]);
    const [faculties, setFaculties] = useState<string[]>([]);
    const [levels, setLevels] = useState<string[]>([]);
    const [avatar, setAvatar] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [uniRes, facRes, levelRes] = await Promise.all([
                    authAPI.getUniversities(),
                    authAPI.getFaculties(),
                    authAPI.getLevels()
                ]);
                setUniversities(uniRes.data);
                setFaculties(facRes.data);
                setLevels(levelRes.data);
            } catch (e) {
                console.log('Error fetching academic data', e);
            }
        };
        fetchData();
    }, []);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setAvatar(result.assets[0].uri);
        }
    };

    // Form State
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        dob: new Date(),
        university: '',
        faculty: '',
        department: '',
        level: '',
        matricNo: '',
        bio: '',
        email: '',
        password: '',
        confirmPassword: '',
        otp: '',
        identityNumber: '',
        identityType: 'bvn', // Default to BVN
        kycDocument: null as string | null,
    });

    const nextStep = () => {
        if (currentStep === 4) {
            initiateRegistration();
        } else if (currentStep === 5) {
            handleVerifyEmail();
        } else {
            setCurrentStep((prev) => (prev + 1) as Step);
        }
    };

    const prevStep = () => setCurrentStep((prev) => (prev - 1) as Step);

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setFormData({ ...formData, dob: selectedDate });
        }
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    // Step 3 -> 4: Actually Create User & Send Email
    const initiateRegistration = async () => {
        setIsLoading(true);
        try {
            const data = new FormData();
            data.append('name', formData.fullName);
            data.append('email', formData.email);
            data.append('bio', formData.bio);
            data.append('password', formData.password);
            data.append('university', formData.university);
            data.append('matricNo', formData.matricNo);
            data.append('identityNumber', formData.identityNumber);
            data.append('identityType', formData.identityType);

            if (avatar) {
                // @ts-ignore
                data.append('avatar', {
                    uri: avatar,
                    type: 'image/jpeg',
                    name: 'profile_photo.jpg',
                });
            }

            // Direct API call to avoid 'router.replace' in context
            const response = await authAPI.register(data as any);
            const { token } = response.data;

            // Store token temporarily, do NOT log in yet to prevent redirect
            setTempToken(token);

            setIsLoading(false);
            setCurrentStep(5); // Move to OTP
        } catch (e: any) {
            setIsLoading(false);
            console.error(e);
            showAlert({
                title: 'Registration Error',
                description: e.response?.data?.message || 'Registration failed. Please try again.',
                type: 'error'
            });
        }
    };

    // Step 4: Verify OTP
    const handleVerifyEmail = async (codeOverride?: string) => {
        const code = codeOverride || formData.otp;
        if (code.length !== 6) return;

        setIsLoading(true);
        try {
            await authAPI.verifyEmail(code, formData.email);

            // SUCCESS: Only now we move to Step 6
            setIsLoading(false);
            setCurrentStep(6); // Move to Biometrics
        } catch (e: any) {
            setIsLoading(false);
            console.error('Verification Error:', e);
            showAlert({
                title: 'Verification Failed',
                description: e.response?.data?.message || 'The code you entered is invalid.',
                type: 'error'
            });
            // If it fails, we stay on Step 4 and clear OTP if needed or just let them try again
        }
    };

    const handleResendCode = async () => {
        if (resendTimer > 0) return;
        setIsLoading(true);
        try {
            await authAPI.resendCode(formData.email);
            setResendTimer(59);
            showAlert({
                title: 'OTP Resent',
                description: 'A new verification code has been sent to your email.',
                type: 'success'
            });
        } catch (e: any) {
            showAlert({
                title: 'Error',
                description: e.response?.data?.message || 'Failed to resend code',
                type: 'error'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleFinalize = async () => {
        setIsLoading(true);
        try {
            if (tempToken) {
                await SecureStore.setItemAsync('token', tempToken);
                setAuthToken(tempToken);
                await refreshUser(); // This triggers the redirect in _layout
            } else {
                router.replace('/(auth)/login');
            }
        } catch (e) {
            console.error('Finalize error', e);
            router.replace('/(auth)/login');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBiometricSetup = async () => {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        if (hasHardware) {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Setup Biometric Login',
            });
            if (result.success) {
                try {
                    // Securely store credentials for future login
                    await SecureStore.setItemAsync('biometric_email', formData.email);
                    await SecureStore.setItemAsync('biometric_password', formData.password);
                    showAlert({
                        title: 'Biometrics Enabled',
                        description: 'You can now use biometrics to log in next time.',
                        type: 'success'
                    });
                } catch (error) {
                    console.log('Error saving biometric credentials:', error);
                }
            }
        }
        handleFinalize();
    };

    const renderProgressBar = () => (
        <View style={styles.progressContainer}>
            {[1, 2, 3, 4, 5, 6].map((step) => (
                <View
                    key={step}
                    style={[
                        styles.progressSegment,
                        { backgroundColor: step <= currentStep ? colors.primary : colors.border },
                    ]}
                />
            ))}
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => (currentStep === 1 ? router.back() : prevStep())} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    {renderProgressBar()}
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[
                        styles.scrollContent,
                        showSuggestions && { paddingBottom: 250 }
                    ]}
                    keyboardShouldPersistTaps="handled"
                >

                    {currentStep === 1 && (
                        <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContent}>
                            <Text style={[styles.stepTitle, { color: colors.text }]}>Personal Details</Text>
                            <Text style={[styles.stepSubtitle, { color: colors.subtext }]}>Let's start with your basics</Text>
                            <View style={styles.form}>
                                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                    <TouchableOpacity onPress={pickImage} style={styles.avatarUpload}>
                                        {avatar ? (
                                            <Image source={{ uri: avatar }} style={styles.avatarImage} />
                                        ) : (
                                            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                                <Ionicons name="camera-outline" size={30} color={colors.subtext} />
                                                <Text style={[styles.avatarText, { color: colors.subtext }]}>Add Photo</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                </View>
                                <Input
                                    label="Full Name"
                                    placeholder="e.g. John Doe"
                                    value={formData.fullName}
                                    onChangeText={(v: string) => setFormData({ ...formData, fullName: v })}
                                    icon="person-outline"
                                    colors={colors}
                                />
                                <Input
                                    label="Bio"
                                    placeholder="Tell us about yourself"
                                    value={formData.bio}
                                    onChangeText={(v: string) => setFormData({ ...formData, bio: v })}
                                    icon="information-circle-outline"
                                    colors={colors}
                                />
                                <Input
                                    label="Phone Number"
                                    placeholder="+234 ..."
                                    value={formData.phone}
                                    onChangeText={(v: string) => setFormData({ ...formData, phone: v })}
                                    icon="call-outline"
                                    keyboardType="phone-pad"
                                    colors={colors}
                                />

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: colors.text }]}>Date of Birth</Text>
                                    <TouchableOpacity
                                        onPress={() => setShowDatePicker(true)}
                                        style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}
                                    >
                                        <Ionicons name="calendar-outline" size={20} color={colors.subtext} />
                                        <Text style={[styles.input, { color: colors.text, paddingTop: 16 }]}>
                                            {formatDate(formData.dob)}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {showDatePicker && (
                                    <DateTimePicker
                                        value={formData.dob}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={handleDateChange}
                                        maximumDate={new Date()}
                                    />
                                )}
                            </View>
                        </Animated.View>
                    )}

                    {currentStep === 2 && (
                        <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContent}>
                            <Text style={[styles.stepTitle, { color: colors.text }]}>Academic Profile</Text>
                            <Text style={[styles.stepSubtitle, { color: colors.subtext }]}>Tell us about your school</Text>
                            <View style={styles.form}>
                                <View style={{ zIndex: 1000 }}>
                                    <Input
                                        label="University"
                                        placeholder="Search University..."
                                        value={formData.university}
                                        onChangeText={(v: string) => {
                                            setFormData({ ...formData, university: v });
                                            if (v.trim().length > 0) {
                                                const filtered = universities.filter(u =>
                                                    u.toLowerCase().includes(v.toLowerCase())
                                                );
                                                setUniSuggestions(filtered);
                                                setShowSuggestions('uni');
                                            } else {
                                                setShowSuggestions(null);
                                            }
                                        }}
                                        icon="school-outline"
                                        colors={colors}
                                        onFocus={() => {
                                            setUniSuggestions(universities);
                                            setShowSuggestions('uni');
                                        }}
                                        onBlur={() => setTimeout(() => setShowSuggestions(null), 200)}
                                    />
                                    {showSuggestions === 'uni' && uniSuggestions.length > 0 && (
                                        <View style={[styles.suggestionsBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                            <ScrollView
                                                style={{ maxHeight: 200 }}
                                                nestedScrollEnabled={true}
                                                keyboardShouldPersistTaps="always"
                                                showsVerticalScrollIndicator={true}
                                                bounces={false}
                                            >
                                                {uniSuggestions.map((uni, idx) => (
                                                    <TouchableOpacity
                                                        key={idx}
                                                        activeOpacity={0.7}
                                                        style={[styles.suggestionItem, idx !== uniSuggestions.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}
                                                        onPress={() => {
                                                            setFormData({ ...formData, university: uni });
                                                            setShowSuggestions(null);
                                                        }}
                                                    >
                                                        <Text style={[styles.suggestionText, { color: colors.text }]}>{uni}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    )}
                                </View>
                                <View style={styles.row}>
                                    <View style={{ flex: 1, zIndex: 900 }}>
                                        <Input
                                            label="Faculty"
                                            placeholder="Select"
                                            value={formData.faculty}
                                            onChangeText={(v: string) => {
                                                setFormData({ ...formData, faculty: v });
                                                if (v.trim().length > 0) {
                                                    const filtered = faculties.filter(f => f.toLowerCase().includes(v.toLowerCase()));
                                                    setFacultySuggestions(filtered);
                                                    setShowSuggestions('faculty');
                                                } else {
                                                    setShowSuggestions(null);
                                                }
                                            }}
                                            onFocus={() => {
                                                setFacultySuggestions(faculties);
                                                setShowSuggestions('faculty');
                                            }}
                                            onBlur={() => setTimeout(() => setShowSuggestions(null), 200)}
                                            colors={colors}
                                        />
                                        {showSuggestions === 'faculty' && facultySuggestions.length > 0 && (
                                            <View style={[styles.suggestionsBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                                <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled={true} keyboardShouldPersistTaps="always">
                                                    {facultySuggestions.map((fac, idx) => (
                                                        <TouchableOpacity
                                                            key={idx}
                                                            style={[styles.suggestionItem, idx !== facultySuggestions.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}
                                                            onPress={() => {
                                                                setFormData({ ...formData, faculty: fac });
                                                                setShowSuggestions(null);
                                                            }}
                                                        >
                                                            <Text style={[styles.suggestionText, { color: colors.text }]}>{fac}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>
                                            </View>
                                        )}
                                    </View>
                                    <View style={{ flex: 1, zIndex: 800 }}>
                                        <Input
                                            label="Level"
                                            placeholder="Select"
                                            value={formData.level}
                                            onChangeText={(v: string) => {
                                                setFormData({ ...formData, level: v });
                                                if (v.trim().length > 0) {
                                                    const filtered = levels.filter(l => l.toLowerCase().includes(v.toLowerCase()));
                                                    setLevelSuggestions(filtered);
                                                    setShowSuggestions('level');
                                                } else {
                                                    setShowSuggestions(null);
                                                }
                                            }}
                                            onFocus={() => {
                                                setLevelSuggestions(levels);
                                                setShowSuggestions('level');
                                            }}
                                            onBlur={() => setTimeout(() => setShowSuggestions(null), 200)}
                                            colors={colors}
                                        />
                                        {showSuggestions === 'level' && levelSuggestions.length > 0 && (
                                            <View style={[styles.suggestionsBox, { backgroundColor: colors.card, borderColor: colors.border, right: 0, left: -20, minWidth: 120 }]}>
                                                <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled={true} keyboardShouldPersistTaps="always">
                                                    {levelSuggestions.map((lvl, idx) => (
                                                        <TouchableOpacity
                                                            key={idx}
                                                            style={[styles.suggestionItem, idx !== levelSuggestions.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}
                                                            onPress={() => {
                                                                setFormData({ ...formData, level: lvl });
                                                                setShowSuggestions(null);
                                                            }}
                                                        >
                                                            <Text style={[styles.suggestionText, { color: colors.text }]}>{lvl}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>
                                            </View>
                                        )}
                                    </View>
                                </View>
                                <Input
                                    label="Matric / Student ID"
                                    placeholder="2024..."
                                    value={formData.matricNo}
                                    onChangeText={(v: string) => setFormData({ ...formData, matricNo: v })}
                                    icon="card-outline"
                                    colors={colors}
                                />
                            </View>
                        </Animated.View>
                    )}

                    {currentStep === 3 && (
                        <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContent}>
                            <Text style={[styles.stepTitle, { color: colors.text }]}>Identity Verification</Text>
                            <Text style={[styles.stepSubtitle, { color: colors.subtext }]}>Help us verify it's really you</Text>
                            <View style={styles.form}>
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: colors.text }]}>Identity Type</Text>
                                    <View style={{ flexDirection: 'row', gap: 12 }}>
                                        {['bvn', 'nin'].map((type) => (
                                            <TouchableOpacity
                                                key={type}
                                                onPress={() => setFormData({ ...formData, identityType: type })}
                                                style={[
                                                    styles.radioBtn,
                                                    {
                                                        borderColor: formData.identityType === type ? colors.primary : colors.border,
                                                        backgroundColor: formData.identityType === type ? colors.primary + '15' : 'transparent'
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
                                    placeholder={`Enter your 11-digit ${formData.identityType.toUpperCase()}`}
                                    value={formData.identityNumber}
                                    onChangeText={(v: string) => setFormData({ ...formData, identityNumber: v })}
                                    icon="shield-checkmark-outline"
                                    keyboardType="number-pad"
                                    maxLength={11}
                                    colors={colors}
                                />

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: colors.text }]}>Upload ID Document (Optional)</Text>
                                    <TouchableOpacity
                                        onPress={async () => {
                                            const result = await ImagePicker.launchImageLibraryAsync({
                                                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                                quality: 0.5,
                                            });
                                            if (!result.canceled) {
                                                setFormData({ ...formData, kycDocument: result.assets[0].uri });
                                            }
                                        }}
                                        style={[
                                            styles.uploadBox,
                                            {
                                                backgroundColor: colors.card,
                                                borderColor: colors.border,
                                                borderStyle: 'dashed'
                                            }
                                        ]}
                                    >
                                        {formData.kycDocument ? (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                                                <Text style={[styles.uploadText, { color: colors.text }]}>Document Selected</Text>
                                                <TouchableOpacity
                                                    onPress={() => setFormData({ ...formData, kycDocument: null })}
                                                    style={{ marginLeft: 'auto' }}
                                                >
                                                    <Ionicons name="close-circle" size={24} color={colors.subtext} />
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            <>
                                                <Ionicons name="cloud-upload-outline" size={32} color={colors.subtext} />
                                                <Text style={[styles.uploadText, { color: colors.subtext }]}>Tap to upload Student ID or NIN Slip</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </Animated.View>
                    )}

                    {currentStep === 4 && (
                        <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContent}>
                            <Text style={[styles.stepTitle, { color: colors.text }]}>Security</Text>
                            <Text style={[styles.stepSubtitle, { color: colors.subtext }]}>Create your access credentials</Text>
                            <View style={styles.form}>
                                <Input
                                    label="University Email"
                                    placeholder="user@university.edu.ng"
                                    value={formData.email}
                                    onChangeText={(v: string) => setFormData({ ...formData, email: v })}
                                    icon="mail-outline"
                                    autoCapitalize="none"
                                    colors={colors}
                                />
                                <Input
                                    label="Password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChangeText={(v: string) => setFormData({ ...formData, password: v })}
                                    icon="lock-closed-outline"
                                    secureTextEntry={!showPassword}
                                    rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
                                    onRightIconPress={() => setShowPassword(!showPassword)}
                                    colors={colors}
                                />
                                <Input
                                    label="Confirm Password"
                                    placeholder="••••••••"
                                    value={formData.confirmPassword}
                                    onChangeText={(v: string) => setFormData({ ...formData, confirmPassword: v })}
                                    icon="lock-closed-outline"
                                    secureTextEntry={!showConfirmPassword}
                                    rightIcon={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                                    onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                    colors={colors}
                                />
                            </View>
                        </Animated.View>
                    )}

                    {currentStep === 5 && (
                        <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContent}>
                            <Text style={[styles.stepTitle, { color: colors.text }]}>Verify Email</Text>
                            <Text style={[styles.stepSubtitle, { color: colors.subtext }]}>
                                We sent a 6-digit code to {formData.email}
                            </Text>
                            <View style={[styles.form, { alignItems: 'center', marginTop: 40 }]}>
                                <TouchableOpacity
                                    activeOpacity={1}
                                    onPress={() => otpInputRef.current?.focus()}
                                    style={styles.otpRow}
                                >
                                    <TextInput
                                        ref={otpInputRef}
                                        value={formData.otp}
                                        onChangeText={(v) => {
                                            if (v.length <= 6) {
                                                setFormData({ ...formData, otp: v });
                                                // Auto submit when 6 digits are entered
                                                if (v.length === 6) {
                                                    handleVerifyEmail(v);
                                                }
                                            }
                                        }}
                                        keyboardType="number-pad"
                                        maxLength={6}
                                        style={[styles.hiddenInput, { opacity: 0.01 }]}
                                        autoFocus={true}
                                    />
                                    {[0, 1, 2, 3, 4, 5].map((i) => (
                                        <View
                                            key={i}
                                            style={[
                                                styles.otpBox,
                                                {
                                                    backgroundColor: colors.card,
                                                    borderColor: formData.otp.length === i ? colors.primary : colors.border,
                                                    borderWidth: formData.otp.length === i ? 2 : 1
                                                }
                                            ]}
                                        >
                                            <Text style={[styles.otpDigit, { color: colors.text }]}>
                                                {formData.otp[i] || ''}
                                            </Text>
                                        </View>
                                    ))}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={{ marginTop: 24, padding: 8 }}
                                    onPress={handleResendCode}
                                    disabled={resendTimer > 0}
                                >
                                    <Text style={{
                                        color: resendTimer > 0 ? colors.subtext : colors.primary,
                                        fontFamily: 'PlusJakartaSans_700Bold'
                                    }}>
                                        {resendTimer > 0 ? `Resend Code in 0:${resendTimer < 10 ? '0' + resendTimer : resendTimer}` : 'Resend Code'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    )}

                    {currentStep === 6 && (
                        <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContent}>
                            <View style={styles.biometricHeader}>
                                <View style={[styles.bioIconBox, { backgroundColor: colors.primary + '15' }]}>
                                    <Ionicons name="finger-print" size={60} color={colors.primary} />
                                </View>
                                <Text style={[styles.stepTitle, { color: colors.text, textAlign: 'center' }]}>Safety First</Text>
                                <Text style={[styles.stepSubtitle, { color: colors.subtext, textAlign: 'center' }]}>
                                    Secure your account with biometrics for faster and safer access next time.
                                </Text>
                            </View>
                            <View style={[styles.form, { gap: 16 }]}>
                                <TouchableOpacity
                                    style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                                    onPress={handleBiometricSetup}
                                >
                                    <Text style={styles.primaryBtnText}>Enable Biometrics</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.skipBtn} onPress={handleFinalize}>
                                    <Text style={[styles.skipBtnText, { color: colors.subtext }]}>Maybe later</Text>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    )}
                </ScrollView>

                {currentStep < 6 && (
                    <View style={[styles.footer, { borderTopColor: colors.border }]}>
                        <TouchableOpacity
                            style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: isLoading ? 0.7 : 1 }]}
                            onPress={nextStep}
                            disabled={isLoading}
                        >
                            <Text style={styles.primaryBtnText}>
                                {isLoading ? 'Please wait...' : 'Continue'}
                            </Text>
                            {!isLoading && <Ionicons name="arrow-forward" size={20} color="#fff" />}
                        </TouchableOpacity>
                    </View>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressContainer: {
        flex: 1,
        flexDirection: 'row',
        gap: 6,
        marginHorizontal: 12,
    },
    progressSegment: {
        flex: 1,
        height: 4,
        borderRadius: 2,
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 40,
    },
    stepContent: {
        flex: 1,
    },
    stepTitle: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 28,
        marginBottom: 8,
    },
    stepSubtitle: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 32,
    },
    form: { gap: 20 },
    row: { flexDirection: 'row', gap: 16 },
    inputGroup: { gap: 8 },
    label: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 56,
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 16,
        gap: 12,
    },
    input: {
        flex: 1,
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 16,
    },
    otpRow: {
        flexDirection: 'row',
        gap: 10,
    },
    otpBox: {
        width: 45,
        height: 56,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    otpDigit: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 20,
    },
    hiddenInput: {
        position: 'absolute',
        width: '100%',
        height: 56, // Match height of OTP box
        opacity: 0,
        zIndex: 2, // Ensure it's on top of the visual boxes
    },
    suggestionsBox: {
        position: 'absolute',
        top: 85,
        left: 0,
        right: 0,
        borderRadius: 16,
        borderWidth: 1,
        zIndex: 2000,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        overflow: 'hidden',
    },
    suggestionItem: {
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    suggestionText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 15,
    },
    biometricHeader: {
        alignItems: 'center',
        marginTop: 40,
        marginBottom: 40,
    },
    bioIconBox: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    footer: {
        padding: 24,
        borderTopWidth: 1,
    },
    primaryBtn: {
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    primaryBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
        color: '#fff',
    },
    skipBtn: {
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
    },
    skipBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
    avatarUpload: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 1,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    avatarText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
    },
    radioBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        gap: 8,
        flex: 1,
    },
    radioText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
    uploadBox: {
        height: 120,
        borderRadius: 16,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 16,
    },
    uploadText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
    },
});
