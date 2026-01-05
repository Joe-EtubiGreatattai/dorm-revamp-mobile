import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import { API_URL, authAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AccountSettings() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { user, refreshUser } = useAuth();
    const { showAlert } = useAlert();
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [name, setName] = useState(user?.name || '');
    const [bio, setBio] = useState(user?.bio || '');
    const [avatar, setAvatar] = useState(user?.avatar || null);
    const [newImageSelected, setNewImageSelected] = useState(false);

    // Helper for Avatar URI
    const getAvatarUri = (avatarPath?: string | null) => {
        if (!avatarPath) return null;
        if (avatarPath.startsWith('http') || avatarPath.startsWith('file://')) return avatarPath;
        const normalizedPath = avatarPath.replace(/\\/g, '/');
        return `${API_URL.replace('/api', '')}/${normalizedPath}`;
    };

    // Avatar Component for Settings
    const AccountAvatar = ({ size = 100 }: { size?: number }) => {
        const avatarUri = getAvatarUri(avatar);
        const initials = user?.name
            ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            : 'U';

        if (avatarUri) {
            return (
                <Image
                    source={{ uri: avatarUri }}
                    style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
                    contentFit="cover"
                    transition={200}
                />
            );
        }

        return (
            <View style={[styles.avatar, styles.initialsContainer, { width: size, height: size, borderRadius: size / 2 }]}>
                <Text style={[styles.initialsText, { fontSize: size * 0.4 }]}>{initials}</Text>
            </View>
        );
    };

    // Image Picker
    const pickImage = async () => {
        const { launchImageLibraryAsync, MediaTypeOptions } = await import('expo-image-picker');

        let result = await launchImageLibraryAsync({
            mediaTypes: MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setAvatar(result.assets[0].uri);
            setNewImageSelected(true);
        }
    };

    const handleSave = async () => {
        setIsLoading(true);
        console.log('--- Frontend Save Profile ---');
        console.log('Name:', name);
        console.log('Bio:', bio);
        console.log('New Image Selected:', newImageSelected);

        try {
            let updateData: any;

            if (newImageSelected && avatar) {
                console.log('Uploading avatar image:', avatar);
                const imageUrl = await authAPI.uploadImage(avatar);
                updateData = {
                    name,
                    bio,
                    avatar: imageUrl
                };
            } else {
                updateData = { name, bio };
            }

            const response = await authAPI.updateProfile(updateData);
            console.log('Profile update response:', response.data);

            await refreshUser();
            showAlert({
                title: 'Success',
                description: 'Profile updated successfully!',
                type: 'success'
            });
            router.back();
        } catch (error: any) {
            console.error('--- Frontend Profile Update Error ---');
            if (error.response) {
                console.error('Status:', error.response.status);
                console.error('Data:', error.response.data);
            } else {
                console.error('Error:', error.message);
            }
            showAlert({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to update profile',
                type: 'error'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Personal Information</Text>
                <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: isLoading ? 0.7 : 1 }]}
                    onPress={handleSave}
                    disabled={isLoading}
                >
                    <Text style={styles.saveText}>{isLoading ? 'Saving...' : 'Save'}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

                <View style={styles.avatarSection}>
                    <AccountAvatar size={100} />
                    <TouchableOpacity
                        style={[styles.changePhotoBtn, { backgroundColor: colors.card }]}
                        onPress={pickImage}
                    >
                        <Ionicons name="camera" size={20} color={colors.primary} />
                        <Text style={[styles.changePhotoText, { color: colors.primary }]}>Change Photo</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                        value={name}
                        onChangeText={setName}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>University</Text>
                    <View style={[styles.input, { backgroundColor: colors.card, justifyContent: 'center' }]}>
                        <Text style={{ color: colors.subtext }}>{user?.university}</Text>
                        <Ionicons name="lock-closed" size={14} color={colors.subtext} style={{ position: 'absolute', right: 16 }} />
                    </View>
                    <Text style={[styles.helperText, { color: colors.subtext }]}>Contact support to change your university.</Text>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Bio</Text>
                    <TextInput
                        style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.text }]}
                        value={bio}
                        onChangeText={setBio}
                        multiline
                    />
                </View>

            </ScrollView>
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
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 10,
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
        fontSize: 18,
    },
    saveBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    saveText: {
        color: '#fff',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
    content: {
        padding: 24,
        paddingBottom: 40,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 16,
    },
    initialsContainer: {
        backgroundColor: '#6366f1',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    initialsText: {
        color: '#fff',
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    changePhotoBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 8,
    },
    changePhotoText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
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
        height: 50,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 15,
    },
    textArea: {
        height: 100,
        paddingTop: 16,
        textAlignVertical: 'top',
    },
    helperText: {
        fontSize: 12,
        marginTop: 6,
        marginLeft: 4,
    },
});
