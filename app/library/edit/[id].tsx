import ActionSuccessModal from '@/components/ActionSuccessModal';
import CustomLoader from '@/components/CustomLoader';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { authAPI, libraryAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EditMaterial() {
    const { id } = useLocalSearchParams();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isSuccessModalVisible, setSuccessModalVisible] = useState(false);
    const [isErrorModalVisible, setErrorModalVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Form State
    const [title, setTitle] = useState('');
    const [courseCode, setCourseCode] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [faculty, setFaculty] = useState('');
    const [department, setDepartment] = useState('');
    const [level, setLevel] = useState('');

    // Metadata Options
    const [categories, setCategories] = useState<any[]>([]);
    const [faculties, setFaculties] = useState<string[]>([]);
    const [levels, setLevels] = useState<string[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [catRes, facRes, levelRes, matRes] = await Promise.all([
                    libraryAPI.getCategories(),
                    libraryAPI.getFaculties(),
                    authAPI.getLevels(),
                    libraryAPI.getMaterial(id as string)
                ]);

                setCategories(catRes.data || []);
                const facList = (facRes.data || []).map((f: any) => f.title || f.name);
                setFaculties(facList);
                setLevels(levelRes.data || []);

                const material = matRes.data;
                console.log('Material data for editing:', material);
                if (material) {
                    setTitle(material.title || '');
                    setCourseCode(material.courseCode || '');
                    setDescription(material.description || '');
                    setCategory(material.category || '');
                    setFaculty(material.faculty || '');
                    setDepartment(material.department || '');
                    setLevel(material.level || '');
                }
            } catch (error) {
                console.log('Error fetching metadata or material:', error);
                setErrorMessage('Failed to load material details.');
                setErrorModalVisible(true);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleUpdate = async () => {
        setIsUpdating(true);
        try {
            const updateData = {
                title,
                courseCode,
                description,
                category,
                faculty,
                department,
                level
            };

            await libraryAPI.updateMaterial(id as string, updateData);
            setSuccessModalVisible(true);
        } catch (error: any) {
            console.error('Error updating material:', error);
            const msg = error.response?.data?.message || 'Failed to update material. Please try again.';
            setErrorMessage(msg);
            setErrorModalVisible(true);
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {isLoading ? (
                <CustomLoader message="Loading material details..." />
            ) : (
                <View style={{ flex: 1 }}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Material</Text>
                        <View style={{ width: 24 }} />
                    </View>

                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={{ flex: 1 }}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                    >
                        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Title</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                                    placeholder="Title"
                                    placeholderTextColor={colors.subtext}
                                    value={title}
                                    onChangeText={setTitle}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Course Code</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                                    placeholder="Course Code"
                                    placeholderTextColor={colors.subtext}
                                    value={courseCode}
                                    onChangeText={setCourseCode}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Academic Faculty</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
                                    {faculties.map((fac, index) => (
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
                                    ))}
                                </ScrollView>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Level</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
                                    {levels.map((lvl, index) => (
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
                                    ))}
                                </ScrollView>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Department</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                                    placeholder="Department"
                                    placeholderTextColor={colors.subtext}
                                    value={department}
                                    onChangeText={setDepartment}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Category</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
                                    {categories.map((cat, index) => (
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
                                    ))}
                                </ScrollView>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Description</Text>
                                <TextInput
                                    style={[styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                                    placeholder="Description"
                                    placeholderTextColor={colors.subtext}
                                    multiline
                                    numberOfLines={4}
                                    value={description}
                                    onChangeText={setDescription}
                                />
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.btn,
                                    { backgroundColor: (title && courseCode && category && faculty && level && department) ? colors.primary : colors.subtext }
                                ]}
                                disabled={!title || !courseCode || !category || !faculty || !level || !department || isUpdating}
                                onPress={handleUpdate}
                            >
                                {isUpdating ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Update Material</Text>}
                            </TouchableOpacity>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </View>
            )}

            <ActionSuccessModal
                visible={isSuccessModalVisible}
                onClose={() => {
                    setSuccessModalVisible(false);
                    router.back();
                }}
                title="Update Successful"
                description="Your material has been updated and will sync across the app in real-time."
                buttonText="Back to Library"
            />

            <ActionSuccessModal
                visible={isErrorModalVisible}
                onClose={() => setErrorModalVisible(false)}
                title="Update Failed"
                description={errorMessage}
                iconName="alert-circle"
                iconColor="#ef4444"
                buttonText="Got it"
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
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
    content: { padding: 20 },
    formGroup: { marginBottom: 20 },
    label: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
    },
    chipsContainer: { gap: 10, paddingBottom: 5 },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    chipText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 13,
    },
    textArea: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        height: 100,
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
        textAlignVertical: 'top',
    },
    btn: {
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 40,
    },
    btnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        color: '#fff',
        fontSize: 16,
    },
});
