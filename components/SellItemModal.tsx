import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { authAPI, marketAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SellItemModal({
    visible,
    onClose,
    onSuccess,
    initialType = 'item',
    initialData = null
}: {
    visible: boolean,
    onClose: () => void,
    onSuccess?: () => void,
    initialType?: 'item' | 'food' | 'service',
    initialData?: any
}) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { showAlert } = useAlert();
    const insets = useSafeAreaInsets();

    const [title, setTitle] = useState('');
    const [price, setPrice] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        if (visible) {
            if (initialData) {
                // Pre-fill for editing
                setTitle(initialData.title);
                setPrice(formatPrice(initialData.price.toString()));
                setDescription(initialData.description);
                setCategory(initialData.category);
                setSelectedImages(initialData.images || []);
            } else {
                // Reset for new item
                const defaultCats = getCategories();
                setCategory(defaultCats[0]);
                setTitle('');
                setPrice('');
                setDescription('');
                setSelectedImages([]);
            }
            setLoading(false);
        }
    }, [visible, initialType, initialData]);

    const getCategories = () => {
        const type = initialData?.type || initialType;
        switch (type) {
            case 'food': return ['African', 'American', 'Asian', 'Healthy', 'Snacks'];
            case 'service': return ['Academic', 'Grooming', 'Cleaning', 'Technical', 'Art'];
            default: return ['Electronics', 'Books', 'Furniture', 'Fashion', 'Others'];
        }
    };

    const getTitle = () => {
        if (initialData) return 'Edit Listing';
        const type = initialType;
        switch (type) {
            case 'food': return 'Sell Food';
            case 'service': return 'Offer Service';
            default: return 'Sell Item';
        }
    };

    const formatPrice = (value: string) => {
        // Remove all non-digit characters
        const digits = value.replace(/\D/g, '');
        // Add commas
        return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    const handlePriceChange = (text: string) => {
        const formatted = formatPrice(text);
        setPrice(formatted);
    };

    const handleAddImage = async () => {
        if (selectedImages.length >= 5) {
            showAlert({
                title: 'Maximum Reached',
                description: 'You can only add up to 5 images',
                type: 'info',
            });
            return;
        }

        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsMultipleSelection: true,
                selectionLimit: 5 - selectedImages.length,
                quality: 0.8,
            });

            if (!result.canceled && result.assets) {
                const newImages = result.assets.map(asset => asset.uri);
                setSelectedImages([...selectedImages, ...newImages].slice(0, 5));
            }
        } catch (error) {
            showAlert({
                title: 'Error',
                description: 'Failed to pick image. Please try again.',
                type: 'error',
            });
        }
    };

    const removeImage = (index: number) => {
        setSelectedImages(selectedImages.filter((_, i) => i !== index));
    };

    const handleList = async () => {

        if (!title || !price || selectedImages.length === 0) {
            showAlert({
                title: 'Missing Information',
                description: 'Please fill in all required fields and add at least one image',
                type: 'error',
            });
            return;
        }

        setLoading(true);
        try {
            // Upload images first
            const uploadedImageUrls = await Promise.all(
                selectedImages.map(async (uri) => {
                    return await authAPI.uploadImage(uri);
                })
            );

            const itemData = {
                title,
                price: parseFloat(price.replace(/,/g, '')),
                description,
                category,
                type: initialData?.type || initialType,
                images: uploadedImageUrls,
            };

            let response;
            if (initialData) {
                response = await marketAPI.updateItem(initialData._id, itemData);
            } else {
                response = await marketAPI.createItem(itemData);
            }

            setLoading(false);
            onClose();
            onSuccess?.();

            showAlert({
                title: 'Success!',
                description: initialData ? 'Item updated successfully' : 'Your item has been listed successfully',
                type: 'success',
            });
        } catch (error: any) {
            setLoading(false);
            showAlert({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to list item. Please try again.',
                type: 'error',
            });
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Platform.OS === 'ios' ? insets.top : 0 }]}>
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={28} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: colors.text }]}>{getTitle()}</Text>
                    <TouchableOpacity
                        disabled={!title.trim() || !price.trim() || selectedImages.length === 0 || loading}
                        style={[styles.listBtn, { backgroundColor: colors.primary, opacity: (title.trim() && price.trim() && selectedImages.length > 0 && !loading) ? 1 : 0.5 }]}
                        onPress={handleList}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.listBtnText}>{initialData ? 'Update' : 'List'}</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                >
                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        <View style={styles.imageSection}>
                            <Text style={[styles.label, { color: colors.subtext, marginBottom: 12 }]}>Photos ({selectedImages.length}/5)</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
                                {selectedImages.map((img, index) => (
                                    <View key={index} style={styles.imageItem}>
                                        <Image source={{ uri: img }} style={styles.selectedImg} />
                                        <TouchableOpacity
                                            style={styles.removeImgBtn}
                                            onPress={() => removeImage(index)}
                                        >
                                            <Ionicons name="close-circle" size={24} color={colors.error} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                                {selectedImages.length < 5 && (
                                    <TouchableOpacity
                                        style={[styles.addImage, { backgroundColor: colors.card, borderColor: colors.border }]}
                                        onPress={handleAddImage}
                                    >
                                        <Ionicons name="camera-outline" size={32} color={colors.primary} />
                                        <Text style={[styles.addImageText, { color: colors.subtext }]}>Add Photo</Text>
                                    </TouchableOpacity>
                                )}
                            </ScrollView>
                        </View>

                        <View style={styles.form}>
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.subtext }]}>Title</Text>
                                <TextInput
                                    placeholder={initialType === 'service' ? "What service do you offer?" : "What are you selling?"}
                                    placeholderTextColor={colors.subtext}
                                    style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                                    value={title}
                                    onChangeText={setTitle}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.subtext }]}>Price</Text>
                                <View style={[styles.priceInputRow, { borderColor: colors.border }]}>
                                    <Text style={[styles.currency, { color: colors.text }]}>₦</Text>
                                    <TextInput
                                        placeholder="0"
                                        placeholderTextColor={colors.subtext}
                                        style={[styles.priceInput, { color: colors.text }]}
                                        value={price}
                                        onChangeText={handlePriceChange}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.subtext }]}>Category</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                                    {getCategories().map(cat => (
                                        <TouchableOpacity
                                            key={cat}
                                            onPress={() => setCategory(cat)}
                                            style={[
                                                styles.catChip,
                                                { borderColor: colors.border },
                                                category === cat && { backgroundColor: colors.primary, borderColor: colors.primary }
                                            ]}
                                        >
                                            <Text style={[styles.catText, { color: category === cat ? '#fff' : colors.subtext }]}>
                                                {cat}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.subtext }]}>Description</Text>
                                <TextInput
                                    placeholder={initialType === 'service' ? "Describe your service..." : "Describe your item..."}
                                    placeholderTextColor={colors.subtext}
                                    style={[styles.textArea, { color: colors.text, borderColor: colors.border }]}
                                    value={description}
                                    onChangeText={setDescription}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                />
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </Modal >
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
        borderBottomWidth: 0.5,
    },
    title: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
    },
    listBtn: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 70,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        color: '#fff',
        fontSize: 14,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    imageSection: {
        marginBottom: 30,
    },
    imageScroll: {
        flexDirection: 'row',
    },
    imageItem: {
        position: 'relative',
        marginRight: 12,
    },
    selectedImg: {
        width: 120,
        height: 120,
        borderRadius: 12,
    },
    removeImgBtn: {
        position: 'absolute',
        top: -8,
        right: -8,
        zIndex: 2,
    },
    addImage: {
        width: 120,
        height: 120,
        borderRadius: 12,
        borderWidth: 2,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
    },
    addImageText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 12,
    },
    form: {
        gap: 24,
        paddingBottom: 40,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 13,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_400Regular',
    },
    priceInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 50,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
    },
    currency: {
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginRight: 4,
    },
    priceInput: {
        flex: 1,
        fontSize: 18,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    categoryScroll: {
        flexDirection: 'row',
    },
    catChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 10,
    },
    catText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
    },
    textArea: {
        minHeight: 120,
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_400Regular',
    },
});
