import ActionSuccessModal from '@/components/ActionSuccessModal';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { authAPI, libraryAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function UploadMaterial() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const router = useRouter();

    const [step, setStep] = useState(1); // 1: Select, 2: Details, 3: Success
    const [file, setFile] = useState<any>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isSuccessModalVisible, setSuccessModalVisible] = useState(false);
    const [isErrorModalVisible, setErrorModalVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Form State
    const [title, setTitle] = useState('');
    const [courseCode, setCourseCode] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [categories, setCategories] = useState<any[]>([]);
    const [faculty, setFaculty] = useState('');
    const [faculties, setFaculties] = useState<string[]>([]);
    const [department, setDepartment] = useState('');
    const [level, setLevel] = useState('');
    const [levels, setLevels] = useState<string[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [catRes, facRes, levelRes] = await Promise.all([
                    libraryAPI.getCategories(),
                    libraryAPI.getFaculties(),
                    authAPI.getLevels()
                ]);
                setCategories(catRes.data || []);
                // Extract titles from library faculty objects
                const facList = (facRes.data || []).map((f: any) => f.title || f.name);
                setFaculties(facList);
                setLevels(levelRes.data || []);
            } catch (error) {
                console.log('Error fetching metadata:', error);
            }
        };
        fetchData();
    }, []);

    const handleFileSelect = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/*'],
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            const asset = result.assets[0];
            setFile({
                name: asset.name,
                size: (asset.size ? (asset.size / 1024 / 1024).toFixed(2) : '0') + ' MB',
                uri: asset.uri,
                mimeType: asset.mimeType,
                type: asset.mimeType
            });
        } catch (err) {
            console.log('Error selecting file:', err);
        }
    };

    const handleScanAndUpload = async () => {
        setIsScanning(true);
        // Simulate anti-virus scan
        setTimeout(async () => {
            setIsScanning(false);
            setIsUploading(true);

            try {
                const formData = new FormData();
                formData.append('title', title);
                formData.append('courseCode', courseCode);
                formData.append('description', description);
                formData.append('category', category);
                formData.append('faculty', faculty);
                formData.append('department', department);
                formData.append('level', level);

                // Append file properly for React Native FormData
                formData.append('file', {
                    uri: file.uri,
                    name: file.name,
                    type: file.mimeType || 'application/octet-stream'
                } as any);

                console.log('Starting API upload call...');
                const response = await libraryAPI.uploadMaterial(formData);
                console.log('Upload API Success:', response.data);

                setSuccessModalVisible(true);
            } catch (error: any) {
                console.error('Error uploading material:', error);
                const msg = error.response?.data?.message || 'Failed to upload material. Please try again.';
                setErrorMessage(msg);
                setErrorModalVisible(true);
            } finally {
                setIsUploading(false);
                console.log('--- Frontend Upload Process Finished ---');
            }
        }, 1500);
    };

    const handleFinish = () => {
        setSuccessModalVisible(false);
        router.back();
    };

    const renderStep1 = () => (
        <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Share Knowledge</Text>
            <Text style={[styles.stepSubtitle, { color: colors.subtext }]}>
                Upload visuals, notes, or past questions to earn Scholar Credits.
            </Text>

            <TouchableOpacity
                style={[styles.uploadBox, { borderColor: colors.border, backgroundColor: colors.card }]}
                onPress={handleFileSelect}
            >
                {file ? (
                    <View style={styles.filePreview}>
                        <Ionicons name="document-text" size={48} color={colors.primary} />
                        <Text style={[styles.fileName, { color: colors.text }]}>{file.name}</Text>
                        <Text style={[styles.fileSize, { color: colors.subtext }]}>{file.size}</Text>
                        <TouchableOpacity onPress={(e) => { e.stopPropagation(); setFile(null); }}>
                            <Text style={[styles.removeFile, { color: colors.error }]}>Remove</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <View style={[styles.iconCircle, { backgroundColor: colors.primary + '15' }]}>
                            <Ionicons name="cloud-upload" size={32} color={colors.primary} />
                        </View>
                        <Text style={[styles.uploadPrompt, { color: colors.text }]}>Tap to select a file</Text>
                        <Text style={[styles.uploadFormats, { color: colors.subtext }]}>PDF, DOCX, IMG (Max 25MB)</Text>
                    </>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.btn, { backgroundColor: file ? colors.primary : colors.subtext }]}
                disabled={!file}
                onPress={() => setStep(2)}
            >
                <Text style={styles.btnText}>Continue</Text>
            </TouchableOpacity>
        </View>
    );

    const renderStep2 = () => (
        <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Add Details</Text>
            <Text style={[styles.stepSubtitle, { color: colors.subtext }]}>
                Help others find this material easily.
            </Text>

            <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Title</Text>
                <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                    placeholder="e.g., MTH 201 2024 Exam"
                    placeholderTextColor={colors.subtext}
                    value={title}
                    onChangeText={setTitle}
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Course Code</Text>
                <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                    placeholder="e.g., CSC 201"
                    placeholderTextColor={colors.subtext}
                    value={courseCode}
                    onChangeText={setCourseCode}
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Academic Faculty</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChips}>
                    {faculties.length > 0 ? (
                        faculties.map((fac, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.chip,
                                    {
                                        backgroundColor: faculty === fac ? colors.primary : colors.card,
                                        borderColor: faculty === fac ? colors.primary : colors.border
                                    }
                                ]}
                                onPress={() => setFaculty(fac)}
                            >
                                <Text style={[styles.chipText, { color: faculty === fac ? '#fff' : colors.text }]}>
                                    {fac}
                                </Text>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <ActivityIndicator color={colors.primary} size="small" />
                    )}
                </ScrollView>
            </View>

            <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Level</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChips}>
                    {levels.length > 0 ? (
                        levels.map((lvl, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.chip,
                                    {
                                        backgroundColor: level === lvl ? colors.primary : colors.card,
                                        borderColor: level === lvl ? colors.primary : colors.border
                                    }
                                ]}
                                onPress={() => setLevel(lvl)}
                            >
                                <Text style={[styles.chipText, { color: level === lvl ? '#fff' : colors.text }]}>
                                    {lvl}
                                </Text>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <ActivityIndicator color={colors.primary} size="small" />
                    )}
                </ScrollView>
            </View>

            <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Department</Text>
                <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                    placeholder="Enter your department"
                    placeholderTextColor={colors.subtext}
                    value={department}
                    onChangeText={setDepartment}
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>File Classification</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChips}>
                    {categories.length > 0 ? (
                        categories.map((cat, index) => (
                            <TouchableOpacity
                                key={cat.id || index}
                                style={[
                                    styles.chip,
                                    {
                                        backgroundColor: category === cat.id ? colors.primary : colors.card,
                                        borderColor: category === cat.id ? colors.primary : colors.border
                                    }
                                ]}
                                onPress={() => setCategory(cat.id)}
                            >
                                <Text style={[styles.chipText, { color: category === cat.id ? '#fff' : colors.text }]}>
                                    {cat.title || cat.name}
                                </Text>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <ActivityIndicator color={colors.primary} size="small" />
                    )}
                </ScrollView>
            </View>

            <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Description (Optional)</Text>
                <TextInput
                    style={[styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                    placeholder="Add context about this material..."
                    placeholderTextColor={colors.subtext}
                    multiline
                    numberOfLines={4}
                    value={description}
                    onChangeText={setDescription}
                />
            </View>

            {isScanning || isUploading ? (
                <View style={styles.scanningState}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.scanningText, { color: colors.subtext }]}>
                        {isScanning ? 'Scanning file for viruses...' : 'Uploading material...'}
                    </Text>
                </View>
            ) : (
                <TouchableOpacity
                    style={[
                        styles.btn,
                        { backgroundColor: (title && courseCode && category && faculty && level && department) ? colors.primary : colors.subtext }
                    ]}
                    disabled={!title || !courseCode || !category || !faculty || !level || !department}
                    onPress={handleScanAndUpload}
                >
                    <Text style={styles.btnText}>Proceed to Upload</Text>
                </TouchableOpacity>
            )}
        </ScrollView>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => step === 1 ? router.back() : setStep(step - 1)}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Upload Material</Text>
                <View style={{ width: 24 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <View style={styles.content}>
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                </View>
            </KeyboardAvoidingView>

            <ActionSuccessModal
                visible={isSuccessModalVisible}
                onClose={handleFinish}
                title="Upload Successful!"
                description="Your material is now live. You earned +10 Scholar Credits!"
                buttonText="Return directly to Library"
                iconName="ribbon"
                onConfirm={handleFinish}
            />

            <ActionSuccessModal
                visible={isErrorModalVisible}
                onClose={() => setErrorModalVisible(false)}
                title="Upload Failed"
                description={errorMessage}
                buttonText="Try Again"
                iconName="alert-circle"
                onConfirm={() => setErrorModalVisible(false)}
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
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
    },
    headerTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    stepContainer: {
        flex: 1,
    },
    stepTitle: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 24,
        marginBottom: 8,
    },
    stepSubtitle: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 16,
        marginBottom: 32,
    },
    uploadBox: {
        width: '100%',
        height: 250,
        borderRadius: 20,
        borderWidth: 2,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    uploadPrompt: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
        marginBottom: 8,
    },
    uploadFormats: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
    },
    filePreview: {
        alignItems: 'center',
    },
    fileName: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
        marginTop: 12,
        marginBottom: 4,
    },
    fileSize: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
        marginBottom: 16,
    },
    removeFile: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
    },
    btn: {
        paddingVertical: 18,
        borderRadius: 30,
        alignItems: 'center',
    },
    btnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        color: '#fff',
        fontSize: 16,
    },
    formGroup: {
        marginBottom: 24,
    },
    label: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
        marginBottom: 8,
    },
    input: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 16,
    },
    textArea: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 16,
        height: 120,
        textAlignVertical: 'top',
    },
    categoryChips: {
        gap: 10,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
    },
    chipText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
    },
    scanningState: {
        alignItems: 'center',
        padding: 20,
    },
    scanningText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
        marginTop: 16,
    },
});
