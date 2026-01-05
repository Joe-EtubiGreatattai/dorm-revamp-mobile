import ActionSuccessModal from '@/components/ActionSuccessModal';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { housingAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const STEPS = [
    { title: 'Basics', icon: 'home-outline' },
    { title: 'Media', icon: 'images-outline' },
    { title: 'Features', icon: 'list-outline' },
    { title: 'Review', icon: 'checkmark-circle-outline' },
];

export default function AddProperty() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const [currentStep, setCurrentStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        category: 'Self-Con',
        price: '',
        tourFee: '',
        address: '',
        description: '',
        amenities: [] as string[],
        images: [] as string[],
    });

    const [errorModalVisible, setErrorModalVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const categories = ['Self-Con', 'Flat', 'Roommate', 'Hostel'];
    const availableAmenities = ['Water 24/7', 'Security', 'Tiled Floor', 'Fenced Compound', 'Prepaid Meter', 'Borehole'];

    const handleNext = async () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            // Validate before submission
            if (!formData.title.trim()) {
                setErrorMessage('Please enter a property title');
                setErrorModalVisible(true);
                return;
            }

            if (!formData.price || formData.price === '0') {
                setErrorMessage('Please enter a price');
                setErrorModalVisible(true);
                return;
            }

            if (formData.images.length === 0) {
                setErrorMessage('Please upload at least one image');
                setErrorModalVisible(true);
                return;
            }

            const priceNum = parseInt(formData.price.replace(/,/g, ''));
            const tourFeeNum = formData.tourFee ? parseInt(formData.tourFee.replace(/,/g, '')) : 0;

            if (tourFeeNum > priceNum * 0.05) {
                setErrorMessage('Touring fee cannot exceed 5% of the property price');
                setErrorModalVisible(true);
                return;
            }

            // Submit logic
            if (isSubmitting) return;
            setIsSubmitting(true);

            console.log('📝 [ADD PROPERTY] Starting property submission');
            console.log('📝 [ADD PROPERTY] Form data:', formData);

            try {
                const payload = new FormData();
                payload.append('title', formData.title);
                payload.append('category', formData.category);

                const priceNum = formData.price.replace(/,/g, '');
                payload.append('price', priceNum);

                if (formData.tourFee) {
                    const tourFeeNum = formData.tourFee.replace(/,/g, '');
                    payload.append('tourFee', tourFeeNum);
                }

                payload.append('address', formData.address);
                payload.append('description', formData.description);

                console.log('📝 [ADD PROPERTY] Amenities:', formData.amenities);
                formData.amenities.forEach(am => payload.append('amenities[]', am));

                console.log('📝 [ADD PROPERTY] Images count:', formData.images.length);
                formData.images.forEach((uri, index) => {
                    const filename = uri.split('/').pop();
                    const match = /\.(\w+)$/.exec(filename || '');
                    const type = match ? `image/${match[1]}` : 'image/jpeg';
                    console.log(`📝 [ADD PROPERTY] Image ${index}:`, { filename, type, uri: uri.substring(0, 50) });
                    payload.append('images', { uri, name: filename || `p_${index}.jpg`, type } as any);
                });

                console.log('📝 [ADD PROPERTY] Calling API...');
                const response = await housingAPI.createListing(payload);
                console.log('✅ [ADD PROPERTY] Success! Response:', response.data);

                router.back();
            } catch (error: any) {
                console.error('❌ [ADD PROPERTY] Failed to create listing:', {
                    error,
                    message: error?.message,
                    response: error?.response?.data,
                    status: error?.response?.status,
                    headers: error?.response?.headers
                });

                const errorMsg = error?.response?.data?.message || error?.message || 'Failed to list property. Please try again.';
                setErrorMessage(errorMsg);
                setErrorModalVisible(true);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        } else {
            router.back();
        }
    };

    const toggleAmenity = (amenity: string) => {
        setFormData(prev => ({
            ...prev,
            amenities: prev.amenities.includes(amenity)
                ? prev.amenities.filter(a => a !== amenity)
                : [...prev.amenities, amenity]
        }));
    };

    const pickImages = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            selectionLimit: 5 - formData.images.length, // Allow picking up to the remaining limit
            quality: 0.8,
        });

        if (!result.canceled) {
            const newImages = result.assets.map(asset => asset.uri);
            setFormData(prev => ({
                ...prev,
                images: [...prev.images, ...newImages].slice(0, 5) // Ensure max 5 images
            }));
        }
    };

    const removeImage = (index: number) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
    };


    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return (
                    <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContainer}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Property Basics</Text>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.subtext }]}>Property Title</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                                placeholder="e.g. Luxury Self-Con at Akoka"
                                placeholderTextColor={colors.subtext}
                                value={formData.title}
                                onChangeText={(text) => setFormData({ ...formData, title: text })}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.subtext }]}>Category</Text>
                            <View style={styles.categoryGrid}>
                                {categories.map(cat => (
                                    <TouchableOpacity
                                        key={cat}
                                        style={[
                                            styles.categoryChip,
                                            { borderColor: colors.border },
                                            formData.category === cat && { backgroundColor: colors.primary, borderColor: colors.primary }
                                        ]}
                                        onPress={() => setFormData({ ...formData, category: cat })}
                                    >
                                        <Text style={[styles.categoryText, { color: formData.category === cat ? '#fff' : colors.text }]}>
                                            {cat}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.subtext }]}>Price (₦ / Year)</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                                placeholder="500,000"
                                placeholderTextColor={colors.subtext}
                                keyboardType="numeric"
                                value={formData.price}
                                onChangeText={(text) => {
                                    const numbers = text.replace(/[^0-9]/g, '');
                                    const formatted = numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                                    setFormData({ ...formData, price: formatted });
                                }}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={[styles.label, { color: colors.subtext }]}>Touring Fee (Optional)</Text>
                                <Text style={[styles.limitText, { color: colors.subtext }]}>Max 5%</Text>
                            </View>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                                placeholder="5,000"
                                placeholderTextColor={colors.subtext}
                                keyboardType="numeric"
                                value={formData.tourFee}
                                onChangeText={(text) => {
                                    const numbers = text.replace(/[^0-9]/g, '');
                                    const formatted = numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                                    setFormData({ ...formData, tourFee: formatted });
                                }}
                            />
                            {formData.tourFee && formData.price && (
                                <Text style={[
                                    styles.feeNote,
                                    {
                                        color: (parseInt(formData.tourFee.replace(/,/g, '')) > parseInt(formData.price.replace(/,/g, '')) * 0.05)
                                            ? '#ef4444'
                                            : colors.subtext
                                    }
                                ]}>
                                    Max allowed: ₦{(parseInt(formData.price.replace(/,/g, '')) * 0.05).toLocaleString()} (5% of rent)
                                </Text>
                            )}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.subtext }]}>Full Address</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text, height: 80 }]}
                                placeholder="Enter property address"
                                placeholderTextColor={colors.subtext}
                                multiline
                                value={formData.address}
                                onChangeText={(text) => setFormData({ ...formData, address: text })}
                            />
                        </View>
                    </Animated.View>
                );
            case 1:
                return (
                    <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContainer}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Upload Photos</Text>
                        <Text style={[styles.subtitle, { color: colors.subtext }]}>Add up to 5 high-quality photos to attract more students.</Text>

                        <TouchableOpacity
                            style={[styles.uploadBox, { borderColor: colors.primary, borderStyle: 'dashed' }]}
                            onPress={pickImages}
                        >
                            <Ionicons name="cloud-upload-outline" size={40} color={colors.primary} />
                            <Text style={[styles.uploadText, { color: colors.primary }]}>Select Images</Text>
                            <Text style={[styles.uploadSubtext, { color: colors.subtext }]}>{formData.images.length} / 5 selected</Text>
                        </TouchableOpacity>

                        <View style={styles.imageGrid}>
                            {formData.images.map((uri, index) => (
                                <View key={index} style={styles.imageWrapper}>
                                    <Image source={{ uri }} style={styles.selectedImage} contentFit="cover" />
                                    <TouchableOpacity
                                        style={[styles.removeImageBtn, { backgroundColor: colors.card }]}
                                        onPress={() => removeImage(index)}
                                    >
                                        <Ionicons name="close" size={16} color={colors.text} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                            {[...Array(Math.max(0, 3 - formData.images.length))].map((_, i) => (
                                <View key={`placeholder-${i}`} style={[styles.imagePlaceholder, { backgroundColor: colors.card, borderColor: colors.border }]} />
                            ))}
                        </View>
                    </Animated.View>
                );
            case 2:
                return (
                    <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContainer}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Features & Amenities</Text>

                        <View style={styles.amenitiesGrid}>
                            {availableAmenities.map(amenity => (
                                <TouchableOpacity
                                    key={amenity}
                                    style={[
                                        styles.amenityChip,
                                        { borderColor: colors.border, backgroundColor: colors.card },
                                        formData.amenities.includes(amenity) && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
                                    ]}
                                    onPress={() => toggleAmenity(amenity)}
                                >
                                    <Ionicons
                                        name={formData.amenities.includes(amenity) ? "checkbox" : "square-outline"}
                                        size={20}
                                        color={formData.amenities.includes(amenity) ? colors.primary : colors.subtext}
                                    />
                                    <Text style={[styles.amenityText, { color: colors.text }]}>{amenity}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={[styles.inputGroup, { marginTop: 24 }]}>
                            <Text style={[styles.label, { color: colors.subtext }]}>Detailed Description</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text, height: 120 }]}
                                placeholder="Describe the property, surrounding environment, etc."
                                placeholderTextColor={colors.subtext}
                                multiline
                                value={formData.description}
                                onChangeText={(text) => setFormData({ ...formData, description: text })}
                            />
                        </View>
                    </Animated.View>
                );
            case 3:
                return (
                    <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContainer}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Final Review</Text>

                        {formData.images.length > 0 && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewImages}>
                                {formData.images.map((uri, index) => (
                                    <Image key={index} source={{ uri }} style={styles.reviewImage} contentFit="cover" />
                                ))}
                            </ScrollView>
                        )}

                        <View style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>

                            <Text style={[styles.reviewLabel, { color: colors.subtext }]}>Title</Text>
                            <Text style={[styles.reviewValue, { color: colors.text }]}>{formData.title || 'Untitled Property'}</Text>

                            <View style={styles.reviewRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.reviewLabel, { color: colors.subtext }]}>Category</Text>
                                    <Text style={[styles.reviewValue, { color: colors.text }]}>{formData.category}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.reviewLabel, { color: colors.subtext }]}>Price</Text>
                                    <Text style={[styles.reviewValue, { color: colors.primary }]}>₦{formData.price || '0'}</Text>
                                </View>
                            </View>

                            {formData.tourFee && (
                                <>
                                    <Text style={[styles.reviewLabel, { color: colors.subtext }]}>Touring Fee</Text>
                                    <Text style={[styles.reviewValue, { color: colors.text }]}>₦{formData.tourFee}</Text>
                                </>
                            )}

                            <Text style={[styles.reviewLabel, { color: colors.subtext }]}>Address</Text>
                            <Text style={[styles.reviewValue, { color: colors.text }]}>{formData.address || 'No address provided'}</Text>
                        </View>

                        <View style={styles.infoBox}>
                            <Ionicons name="information-circle-outline" size={20} color={colors.subtext} />
                            <Text style={[styles.infoText, { color: colors.subtext }]}>
                                Your listing will be reviewed by our team before going live. This typically takes 2-4 hours.
                            </Text>
                        </View>
                    </Animated.View>
                );
            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Stack.Screen options={{
                headerShown: true,
                title: 'List Property',
                headerTitleStyle: { fontFamily: 'PlusJakartaSans_700Bold' },
                headerLeft: () => (
                    <TouchableOpacity onPress={handleBack} style={{ marginLeft: 8 }}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                )
            }} />

            {/* Stepper Header */}
            <View style={[styles.stepperContainer, { borderBottomColor: colors.border }]}>
                {STEPS.map((step, index) => (
                    <View key={index} style={styles.stepItem}>
                        <View style={[
                            styles.stepCircle,
                            { backgroundColor: index <= currentStep ? colors.primary : colors.card, borderColor: index <= currentStep ? colors.primary : colors.border }
                        ]}>
                            <Ionicons
                                name={index < currentStep ? 'checkmark' : (step.icon as any)}
                                size={18}
                                color={index <= currentStep ? '#fff' : colors.subtext}
                            />
                        </View>
                        <Text style={[
                            styles.stepTitle,
                            { color: index <= currentStep ? colors.text : colors.subtext, fontFamily: index === currentStep ? 'PlusJakartaSans_700Bold' : 'PlusJakartaSans_500Medium' }
                        ]}>
                            {step.title}
                        </Text>
                        {index < STEPS.length - 1 && (
                            <View style={[styles.stepLine, { backgroundColor: index < currentStep ? colors.primary : colors.border }]} />
                        )}
                    </View>
                ))}
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={100}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {renderStepContent()}
                </ScrollView>

                <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                    <TouchableOpacity
                        style={[styles.nextBtn, { backgroundColor: colors.primary }]}
                        onPress={handleNext}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.nextBtnText}>
                                    {currentStep === STEPS.length - 1 ? 'Submit Listing' : 'Continue'}
                                </Text>
                                {currentStep < STEPS.length - 1 && <Ionicons name="arrow-forward" size={20} color="#fff" />}
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* Error Modal */}
            <ActionSuccessModal
                visible={errorModalVisible}
                onClose={() => setErrorModalVisible(false)}
                title="Failed to List Property"
                description={errorMessage}
                iconName="close-circle"
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    stepperContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    stepItem: {
        alignItems: 'center',
        flex: 1,
        position: 'relative',
    },
    stepCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        marginBottom: 4,
        zIndex: 2,
    },
    stepTitle: {
        fontSize: 10,
    },
    stepLine: {
        position: 'absolute',
        top: 18,
        left: '50%',
        width: '100%',
        height: 1,
        zIndex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    stepContainer: {
        flex: 1,
    },
    sectionTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 22,
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
        marginBottom: 24,
    },
    limitText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 12,
        marginBottom: 8,
    },
    feeNote: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 11,
        marginTop: 4,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 16,
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
    },
    categoryText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
    },
    uploadBox: {
        width: '100%',
        height: 150,
        borderRadius: 16,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    uploadText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
        marginTop: 8,
    },
    uploadSubtext: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
        marginTop: 4,
    },
    imageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    imageWrapper: {
        position: 'relative',
        width: (width - 60) / 3,
        height: (width - 60) / 3,
    },
    selectedImage: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
    },
    removeImageBtn: {
        position: 'absolute',
        top: -8,
        right: -8,
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    imagePlaceholder: {
        width: (width - 60) / 3,
        height: (width - 60) / 3,
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    reviewImages: {
        marginBottom: 20,
    },
    reviewImage: {
        width: 120,
        height: 120,
        borderRadius: 12,
        marginRight: 12,
    },
    amenitiesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    amenityChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        gap: 8,
        width: '48%',
    },
    amenityText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 13,
    },
    reviewCard: {
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 24,
    },
    reviewLabel: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 12,
        marginBottom: 4,
    },
    reviewValue: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
        marginBottom: 16,
    },
    reviewRow: {
        flexDirection: 'row',
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.03)',
        padding: 16,
        borderRadius: 12,
        gap: 10,
        alignItems: 'center',
    },
    infoText: {
        flex: 1,
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
        lineHeight: 18,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
    },
    nextBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        gap: 8,
    },
    nextBtnText: {
        color: '#fff',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
});
