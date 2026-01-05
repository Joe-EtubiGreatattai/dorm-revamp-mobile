import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { libraryAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function CBTScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [questions, setQuestions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [currentStep, setCurrentStep] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
    const [isFinished, setIsFinished] = useState(false);
    const [score, setScore] = useState(0);

    const [cbtId, setCbtId] = useState<string | null>(null);

    useEffect(() => {
        const fetchCBT = async () => {
            try {
                // If the ID passed is a Material ID, we might need a way to find the linked CBT.
                // OR, assuming ID IS the CBT ID. The user flow said "Take CBT" from Reader -> Push CBT ID.
                // Let's assume the ID passed to this route is the CBT ID.
                // However, the reader component pushes `/library/cbt/${id}` where ID is Material ID.
                // Backend: "getCBT" expects CBT ID. 
                // Issue: Material doesn't have a direct link to CBT in the schema I see?
                // Actually, my CBT Schema has `courseCode` etc.
                // Maybe I should add `linkedCBT` to Material or search CBT by material?
                // For now, let's assume the ID passed IS the CBT ID or I have an endpoint to get CBT by Material.
                // I'll update libraryController to findWith material ID or allow searching.

                // Correction: In `reader/[id].tsx`, I pushed `/library/cbt/${id}` (Material ID).
                // I need an endpoint `getCBTByMaterial` or similar. 
                // Or simply `getQuestions` was `library/materials/${id}/questions`.
                // My new `getCBT` gets by CBT ID.
                // Let's just update the previous `getQuestions` to logically return questions from a linked CBT or generated ones?
                // Minimal change: Use `getQuestions` in API which calls `library/materials/:id/questions`.
                // My `apiClient` maps `getQuestions` to that. I didn't verify if that route exists in backend!
                // Backend routes: `router.get('/materials/:id/questions', ...)`? NO. I added `/cbt/:id`.

                // Quick fix: Update Reader to verify if CBT exists for material, then push CBT ID.
                // OR: changing `getQuestions` on backend to `getCBTByMaterial`.

                // Let's stick to: The "CBT" feature might be independent or linked.
                // Ensure `libraryRoutes` has `/materials/:id/questions`? NO.
                // I will add `getQuestionsForMaterial` to libraryController which finds a CBT with matching courseCode or material reference.
                // BUT I wanted "Proper CBT".
                // I will use `libraryAPI.getCBT(id)` assuming `id` IS the CBT ID.
                // AND I will update Reader to navigate to the correct CBT ID (if known).
                // Since I don't have a way to know CBT ID from Material yet, I'll fallback to:
                // `libraryAPI.getCBT` call, but passing MaterialID, and I'll update backend `getCBT` to maybe search by materialId if not found by ID?
                // Or better: `router.get('/materials/:id/cbt', ...)`

                // Let's use `libraryAPI.getCBT(id)` and update this component.

                const { data } = await libraryAPI.getCBT(id as string);
                setCbtId(data._id);
                if (data.questions && data.questions.length > 0) {
                    setQuestions(data.questions);
                    setSelectedAnswers(new Array(data.questions.length).fill(-1));
                }
                if (data.duration) setTimeLeft(data.duration * 60); // minutes to seconds
            } catch (err) {
                // Fallback or error
                setError('CBT not found.');
            } finally {
                setIsLoading(false);
            }
        };
        if (id) fetchCBT();
    }, [id]);

    const handleSelectOption = (optionIndex: number) => {
        const newAnswers = [...selectedAnswers];
        newAnswers[currentStep] = optionIndex;
        setSelectedAnswers(newAnswers);
    };

    const handleNext = () => {
        if (currentStep < questions.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleFinish();
        }
    };

    const handleFinish = async () => {
        // Calculate local score for immediate feedback
        let finalScore = 0;
        const answersPayload = selectedAnswers.map((ans, index) => {
            const isCorrect = ans === questions[index].correctAnswer;
            if (isCorrect) finalScore++;
            return { questionIndex: index, selectedOption: ans };
        });

        setScore(finalScore);
        setIsFinished(true);

        // Submit to API
        try {
            if (cbtId) {
                await libraryAPI.submitCBT({
                    cbtId,
                    answers: answersPayload,
                    timeSpent: 300 - timeLeft // Approximate
                });
            }
        } catch (e) {
            console.log("Failed to submit score", e);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    if (error || questions.length === 0) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={[styles.header, { borderBottomWidth: 0 }]}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <Ionicons name="alert-circle-outline" size={64} color={colors.subtext} />
                    <Text style={{ color: colors.text, textAlign: 'center', marginTop: 20, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 16 }}>
                        {error || 'No questions found for this material.'}
                    </Text>
                    <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 20, width: 200 }]} onPress={() => router.back()}>
                        <Text style={styles.primaryBtnText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    if (isFinished) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ title: 'Test Results', headerLeft: () => null }} />
                <View style={styles.resultsContainer}>
                    <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Ionicons name="trophy" size={80} color={colors.primary} />
                        <Text style={[styles.scoreTitle, { color: colors.text }]}>Test Completed!</Text>
                        <Text style={[styles.scoreText, { color: colors.primary }]}>
                            {score} / {questions.length}
                        </Text>
                        <Text style={[styles.scoreSubtext, { color: colors.subtext }]}>
                            {score >= (questions.length * 0.7) ? "Excellent work! You're ready." : "Good try! A bit more study will help."}
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.primaryBtnText}>Back to Material</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const currentQuestion = questions[currentStep];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{
                title: 'CBT Practice',
                headerRight: () => (
                    <View style={styles.timerBadge}>
                        <Ionicons name="time-outline" size={16} color={colors.primary} />
                        <Text style={[styles.timerText, { color: colors.primary }]}>{formatTime(timeLeft)}</Text>
                    </View>
                )
            }} />

            <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                    <View
                        style={[
                            styles.progressFill,
                            {
                                backgroundColor: colors.primary,
                                width: `${((currentStep + 1) / questions.length) * 100}%`
                            }
                        ]}
                    />
                </View>
                <Text style={[styles.progressText, { color: colors.subtext }]}>
                    Question {currentStep + 1} of {questions.length}
                </Text>
            </View>

            <ScrollView contentContainerStyle={styles.quizContent}>
                <Text style={[styles.questionText, { color: colors.text }]}>
                    {currentQuestion.question}
                </Text>

                <View style={styles.optionsContainer}>
                    {currentQuestion.options.map((option: string, index: number) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.optionBtn,
                                { borderColor: colors.border, backgroundColor: colors.card },
                                selectedAnswers[currentStep] === index && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
                            ]}
                            onPress={() => handleSelectOption(index)}
                        >
                            <View style={[
                                styles.optionIndex,
                                { backgroundColor: colors.border },
                                selectedAnswers[currentStep] === index && { backgroundColor: colors.primary }
                            ]}>
                                <Text style={[
                                    styles.optionIndexText,
                                    selectedAnswers[currentStep] === index && { color: '#fff' }
                                ]}>
                                    {String.fromCharCode(65 + index)}
                                </Text>
                            </View>
                            <Text style={[
                                styles.optionText,
                                { color: colors.text },
                                selectedAnswers[currentStep] === index && { fontFamily: 'PlusJakartaSans_700Bold' }
                            ]}>
                                {option}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                    onPress={handleNext}
                >
                    <Text style={styles.primaryBtnText}>
                        {currentStep === questions.length - 1 ? 'Finish Test' : 'Next Question'}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
    },
    timerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        marginRight: 10,
    },
    timerText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
    progressContainer: {
        padding: 20,
    },
    progressBar: {
        height: 8,
        borderRadius: 4,
        marginBottom: 8,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
        textAlign: 'right',
    },
    quizContent: {
        padding: 20,
    },
    questionText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 20,
        lineHeight: 28,
        marginBottom: 32,
    },
    optionsContainer: {
        gap: 16,
    },
    optionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        gap: 16,
    },
    optionIndex: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionIndexText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
    },
    optionText: {
        flex: 1,
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 16,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
    },
    primaryBtn: {
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryBtnText: {
        color: '#fff',
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
    },
    resultsContainer: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
    },
    scoreCard: {
        alignItems: 'center',
        padding: 40,
        borderRadius: 32,
        borderWidth: 1,
        marginBottom: 40,
    },
    scoreTitle: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 24,
        marginTop: 20,
        marginBottom: 8,
    },
    scoreText: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 48,
        marginBottom: 16,
    },
    scoreSubtext: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 16,
        textAlign: 'center',
    },
});
