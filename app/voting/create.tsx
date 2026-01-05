import ActionSuccessModal from '@/components/ActionSuccessModal';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { electionAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CreateElectionScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [positions, setPositions] = useState<string[]>(['President']);
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [contestantFee, setContestantFee] = useState('');
    const [isSuccessVisible, setSuccessVisible] = useState(false);
    const [isIncompleteVisible, setIncompleteVisible] = useState(false);
    const [isErrorVisible, setErrorVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Format number with commas for display
    const formatFeeWithCommas = (value: string) => {
        const numericValue = value.replace(/[^0-9]/g, '');
        if (!numericValue) return '';
        return Number(numericValue).toLocaleString();
    };

    const handleFeeChange = (text: string) => {
        // Remove commas and non-numeric characters, then format
        const numericValue = text.replace(/[^0-9]/g, '');
        setContestantFee(numericValue);
    };

    const handleAddPosition = () => {
        setPositions([...positions, '']);
    };

    const handleRemovePosition = (index: number) => {
        const newPositions = [...positions];
        newPositions.splice(index, 1);
        setPositions(newPositions);
    };

    const handlePositionChange = (text: string, index: number) => {
        const newPositions = [...positions];
        newPositions[index] = text;
        setPositions(newPositions);
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || date;
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        setDate(currentDate);
    };

    const handleSubmit = async () => {
        if (!title || !description || positions.some(p => !p.trim())) {
            setIncompleteVisible(true);
            return;
        }

        try {
            await electionAPI.createElection({
                title,
                description,
                positions,
                startDate: date,
                // Default end date +7 days for now, can add UI later
                endDate: new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000),
                contestantFee: contestantFee ? Number(contestantFee) : 0
            });
            setSuccessVisible(true);
        } catch (error: any) {
            console.log(error);
            setErrorMessage(error.response?.data?.message || 'Failed to create election');
            setErrorVisible(true);
        }
    };

    const handleSuccessClose = () => {
        setSuccessVisible(false);
        router.back();
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Create Election</Text>
                <TouchableOpacity onPress={handleSubmit} style={[styles.submitBtn, { backgroundColor: colors.primary }]}>
                    <Text style={styles.submitText}>Publish</Text>
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.content}
                >
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Basic Information</Text>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.subtext }]}>Election Title</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                            placeholder="e.g., Dept of CS Executives"
                            placeholderTextColor={colors.subtext}
                            value={title}
                            onChangeText={setTitle}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.subtext }]}>Description</Text>
                        <TextInput
                            style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.text }]}
                            placeholder="Briefly describe the purpose of this election..."
                            placeholderTextColor={colors.subtext}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.subtext }]}>Election Date</Text>
                        <TouchableOpacity
                            style={[styles.dateInput, { backgroundColor: colors.card }]}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Text style={[styles.dateText, { color: colors.text }]}>{date.toDateString()}</Text>
                            <Ionicons name="calendar-outline" size={20} color={colors.subtext} />
                        </TouchableOpacity>
                        {showDatePicker && (Platform.OS === 'ios' ? (
                            <DateTimePicker
                                testID="dateTimePicker"
                                value={date}
                                mode="date"
                                display="spinner"
                                onChange={handleDateChange}
                                style={styles.datePicker}
                                themeVariant={colorScheme ?? 'light'}
                            />
                        ) : (
                            <DateTimePicker
                                testID="dateTimePicker"
                                value={date}
                                mode="date"
                                display="default"
                                onChange={handleDateChange}
                            />
                        ))}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.subtext }]}>Contestant Fee (₦)</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                            placeholder="e.g., 5,000 (set 0 for free)"
                            placeholderTextColor={colors.subtext}
                            value={formatFeeWithCommas(contestantFee)}
                            onChangeText={handleFeeChange}
                            keyboardType="numeric"
                        />
                        <Text style={[styles.hintText, { color: colors.subtext }]}>
                            Candidates will pay this fee to apply. Leave empty or 0 for free elections.
                        </Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.positionsHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Positions</Text>
                        <TouchableOpacity onPress={handleAddPosition}>
                            <Text style={[styles.addText, { color: colors.primary }]}>+ Add Position</Text>
                        </TouchableOpacity>
                    </View>

                    {positions.map((pos, index) => (
                        <View key={index} style={styles.positionRow}>
                            <View style={[styles.positionInputWrap, { backgroundColor: colors.card }]}>
                                <TextInput
                                    style={[styles.positionInput, { color: colors.text }]}
                                    placeholder="Position Title"
                                    placeholderTextColor={colors.subtext}
                                    value={pos}
                                    onChangeText={(text) => handlePositionChange(text, index)}
                                />
                            </View>
                            {positions.length > 1 && (
                                <TouchableOpacity
                                    onPress={() => handleRemovePosition(index)}
                                    style={[styles.removeBtn, { backgroundColor: colors.card }]}
                                >
                                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                                </TouchableOpacity>
                            )}
                        </View>
                    ))}

                    <View style={[styles.infoBox, { backgroundColor: colors.primary + '15' }]}>
                        <Ionicons name="information-circle" size={20} color={colors.primary} />
                        <Text style={[styles.infoText, { color: colors.text }]}>
                            This election will be submitted for admin verification before going live.
                        </Text>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>

            <ActionSuccessModal
                visible={isSuccessVisible}
                onClose={handleSuccessClose}
                title="Election Submitted"
                description="Your election has been created and is pending approval."
                buttonText="Done"
                iconName="checkmark-circle"
            />

            <ActionSuccessModal
                visible={isIncompleteVisible}
                onClose={() => setIncompleteVisible(false)}
                title="Incomplete Details"
                description="Please fill in the election title, description, and at least one position."
                buttonText="Okay"
                iconName="alert-circle"
                iconColor="#ef4444"
            />

            <ActionSuccessModal
                visible={isErrorVisible}
                onClose={() => setErrorVisible(false)}
                title="Error"
                description={errorMessage}
                buttonText="Okay"
                iconName="close-circle"
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
    submitBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    submitText: {
        color: '#fff',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
    content: {
        padding: 24,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
        marginBottom: 16,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        marginBottom: 8,
    },
    input: {
        height: 50,
        borderRadius: 16,
        paddingHorizontal: 16,
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
    },
    dateInput: {
        height: 50,
        borderRadius: 16,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dateText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
    },
    datePicker: {
        marginTop: 10,
        height: 120,
    },
    textArea: {
        height: 100,
        paddingTop: 16,
        textAlignVertical: 'top',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.05)',
        marginVertical: 10,
        marginBottom: 24,
    },
    positionsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    addText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
    positionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 12,
    },
    positionInputWrap: {
        flex: 1,
        height: 50,
        borderRadius: 16,
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    positionInput: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
    },
    removeBtn: {
        width: 50,
        height: 50,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoBox: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 16,
        gap: 12,
        marginTop: 24,
    },
    infoText: {
        flex: 1,
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 13,
        lineHeight: 20,
    },
    hintText: {
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_500Medium',
        marginTop: 6,
        lineHeight: 18,
    },
});
