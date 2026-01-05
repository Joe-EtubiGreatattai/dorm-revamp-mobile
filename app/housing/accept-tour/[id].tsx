import ActionSuccessModal from '@/components/ActionSuccessModal';
import CustomLoader from '@/components/CustomLoader';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { tourAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PREDEFINED_POINTS = [
    'School Main Gate',
    'Faculty Lounge',
    'Student Union Building (SUB)',
    'Campus Shuttle Station',
    'Hostel Porter\'s Lodge'
];

export default function AcceptTourScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [tour, setTour] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [selectedPoint, setSelectedPoint] = useState(PREDEFINED_POINTS[0]);
    const [customPoint, setCustomPoint] = useState('');
    const [isCustom, setIsCustom] = useState(false);
    const [isSuccessVisible, setSuccessVisible] = useState(false);
    const [isAccepting, setIsAccepting] = useState(false);

    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [time, setTime] = useState(new Date());
    const [showTimePicker, setShowTimePicker] = useState(false);

    const scrollViewRef = React.useRef<ScrollView>(null);

    useEffect(() => {
        const fetchTour = async () => {
            try {
                const { data } = await tourAPI.getTour(id as string);
                setTour(data);
                if (data.preferredDate) setDate(new Date(data.preferredDate));
                if (data.preferredTime) {
                    // Try to parse time string like "10:00 AM" or similar if possible
                    // For now just keep current time but label it
                }
            } catch (error) {
                console.log('Error fetching tour request:', error);
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchTour();
    }, [id]);

    const handleAccept = async () => {
        const meetingPoint = isCustom ? customPoint : selectedPoint;
        if (!meetingPoint.trim()) {
            alert('Please select or enter a meeting point');
            return;
        }

        try {
            setIsAccepting(true);
            await tourAPI.acceptTour(id as string, meetingPoint, {
                preferredDate: date.toISOString(),
                preferredTime: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
            setSuccessVisible(true);
        } catch (error) {
            console.log('Error accepting tour:', error);
            alert('Failed to accept tour. Please try again.');
        } finally {
            setIsAccepting(false);
        }
    };

    const handleSuccessClose = () => {
        setSuccessVisible(false);
        router.push('/(tabs)/housing');
    };

    const toggleCustom = (value: boolean) => {
        setIsCustom(value);
        if (value) {
            // Give layout a moment to render the input before scrolling
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
                <Stack.Screen options={{ headerShown: false }} />
                <CustomLoader message="Loading tour request..." />
            </SafeAreaView>
        );
    }

    if (!tour) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <Text style={{ color: colors.text }}>Tour request not found</Text>
            </SafeAreaView>
        );
    }

    const requester = tour.requesterId || { name: 'Student', avatar: null };
    const houseTitle = tour.listingId?.title || 'the apartment';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            <Stack.Screen options={{
                headerShown: false,
            }} />

            {/* Custom Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={[styles.backBtn, { backgroundColor: colors.card }]}
                >
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Accept Tour Request</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
                style={{ flex: 1 }}
            >
                <ScrollView
                    ref={scrollViewRef}
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.requesterInfo}>
                            <Image
                                source={{ uri: requester.avatar || 'https://ui-avatars.com/api/?name=' + requester.name }}
                                style={styles.requesterAvatar}
                            />
                            <View style={styles.requesterText}>
                                <Text style={[styles.requesterName, { color: colors.text }]}>{requester.name}</Text>
                                <Text style={[styles.subtitle, { color: colors.subtext }]}>wants to tour "{houseTitle}"</Text>
                            </View>
                        </View>
                    </View>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Meeting Point</Text>
                    <Text style={[styles.sectionSubtitle, { color: colors.subtext }]}>Choose where you'd like to meet the student.</Text>

                    <View style={styles.pointsGrid}>
                        {PREDEFINED_POINTS.map((point) => (
                            <TouchableOpacity
                                key={point}
                                style={[
                                    styles.pointItem,
                                    { borderColor: colors.border, backgroundColor: colors.card },
                                    selectedPoint === point && !isCustom && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
                                ]}
                                onPress={() => {
                                    setSelectedPoint(point);
                                    setIsCustom(false);
                                }}
                            >
                                <Text style={[
                                    styles.pointText,
                                    { color: colors.text },
                                    selectedPoint === point && !isCustom && { color: colors.primary, fontFamily: 'PlusJakartaSans_700Bold' }
                                ]}>
                                    {point}
                                </Text>
                                {selectedPoint === point && !isCustom && (
                                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                                )}
                            </TouchableOpacity>
                        ))}

                        <TouchableOpacity
                            style={[
                                styles.pointItem,
                                { borderColor: colors.border, backgroundColor: colors.card },
                                isCustom && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
                            ]}
                            onPress={() => toggleCustom(true)}
                        >
                            <Text style={[
                                styles.pointText,
                                { color: colors.text },
                                isCustom && { color: colors.primary, fontFamily: 'PlusJakartaSans_700Bold' }
                            ]}>
                                Custom Location
                            </Text>
                            {isCustom && (
                                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                            )}
                        </TouchableOpacity>
                    </View>

                    {isCustom && (
                        <View style={styles.customInputContainer}>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                                placeholder="Enter meeting point..."
                                placeholderTextColor={colors.subtext}
                                value={customPoint}
                                onChangeText={setCustomPoint}
                                autoFocus
                            />
                        </View>
                    )}

                    <View style={{ height: 32 }} />

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Schedule Date & Time</Text>
                    <Text style={[styles.sectionSubtitle, { color: colors.subtext }]}>Confirm or change the appointment time.</Text>

                    <View style={styles.scheduleContainer}>
                        <TouchableOpacity
                            style={[styles.pickerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                            <Text style={[styles.pickerBtnText, { color: colors.text }]}>
                                {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.pickerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={() => setShowTimePicker(true)}
                        >
                            <Ionicons name="time-outline" size={20} color={colors.primary} />
                            <Text style={[styles.pickerBtnText, { color: colors.text }]}>
                                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {showDatePicker && (
                        <DateTimePicker
                            value={date}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(event, selectedDate) => {
                                setShowDatePicker(false);
                                if (selectedDate) setDate(selectedDate);
                            }}
                            minimumDate={new Date()}
                        />
                    )}

                    {showTimePicker && (
                        <DateTimePicker
                            value={time}
                            mode="time"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(event, selectedTime) => {
                                setShowTimePicker(false);
                                if (selectedTime) setTime(selectedTime);
                            }}
                        />
                    )}
                </ScrollView>

                <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                    <TouchableOpacity
                        style={[styles.acceptBtn, { backgroundColor: colors.primary }]}
                        onPress={handleAccept}
                        disabled={isAccepting}
                    >
                        {isAccepting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.acceptBtnText}>Confirm and Notify Student</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            <ActionSuccessModal
                visible={isSuccessVisible}
                onClose={handleSuccessClose}
                title="Tour Accepted!"
                description={`${requester.name} has been notified to meet you at ${isCustom ? customPoint : selectedPoint} on ${date.toLocaleDateString('en-GB')} at ${time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`}
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
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
    },
    scrollContent: {
        padding: 20,
    },
    infoCard: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 24,
    },
    requesterInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    requesterAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    requesterText: {
        flex: 1,
    },
    requesterName: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
    subtitle: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
    },
    sectionTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
        marginBottom: 20,
    },
    pointsGrid: {
        gap: 12,
    },
    pointItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    pointText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 15,
    },
    customInputContainer: {
        marginTop: 12,
    },
    input: {
        height: 56,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 16,
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 15,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
    },
    acceptBtn: {
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
    acceptBtnText: {
        color: '#fff',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
    scheduleContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 32,
    },
    pickerBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        gap: 10,
    },
    pickerBtnText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
    },
});
