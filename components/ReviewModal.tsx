import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface ReviewModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (rating: number, comment: string) => void;
}

export default function ReviewModal({ visible, onClose, onSubmit }: ReviewModalProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');

    const handleSubmit = () => {
        if (rating === 0) return;
        onSubmit(rating, comment);
        setRating(0);
        setComment('');
        onClose();
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.overlay}
            >
                <View style={[styles.modalContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>Write a Review</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.label, { color: colors.text }]}>Rate your experience</Text>
                    <View style={styles.starsContainer}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity key={star} onPress={() => setRating(star)}>
                                <Ionicons
                                    name={star <= rating ? "star" : "star-outline"}
                                    size={32}
                                    color={star <= rating ? "#fbbf24" : colors.subtext}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={[styles.label, { color: colors.text }]}>Your Review</Text>
                    <TextInput
                        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                        placeholder="Share your thoughts about this place..."
                        placeholderTextColor={colors.subtext}
                        multiline
                        numberOfLines={4}
                        value={comment}
                        onChangeText={setComment}
                    />

                    <TouchableOpacity
                        style={[
                            styles.submitBtn,
                            { backgroundColor: rating > 0 ? colors.primary : colors.subtext }
                        ]}
                        disabled={rating === 0}
                        onPress={handleSubmit}
                    >
                        <Text style={styles.submitBtnText}>Submit Review</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'transparent',
        borderBottomWidth: 0,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 20,
    },
    label: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 16,
        marginBottom: 12,
    },
    starsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    input: {
        fontFamily: 'PlusJakartaSans_400Regular',
        fontSize: 16,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        textAlignVertical: 'top',
        height: 120,
        marginBottom: 24,
    },
    submitBtn: {
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
    },
    submitBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        color: '#fff',
        fontSize: 16,
    },
});
