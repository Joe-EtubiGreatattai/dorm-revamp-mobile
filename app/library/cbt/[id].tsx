import ActionSuccessModal from '@/components/ActionSuccessModal';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { libraryAPI, postAPI } from '@/utils/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function CBTScreen() {
    const { id, questions: passedQuestions } = useLocalSearchParams();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'] || Colors.light;

    const [questions, setQuestions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [currentStep, setCurrentStep] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
    const [isFinished, setIsFinished] = useState(false);
    const [score, setScore] = useState(0);
    const [isSharing, setIsSharing] = useState(false);
    const [showShareSuccess, setShowShareSuccess] = useState(false);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);

    const [cbtId, setCbtId] = useState<string | null>(null);

    useEffect(() => {
        const loadQuestions = async () => {
            try {
                if (passedQuestions) {
                    const parsed = JSON.parse(passedQuestions as string);
                    setQuestions(parsed);
                    setSelectedAnswers(new Array(parsed.length).fill(-1));
                    setIsLoading(false);
                    return;
                }

                if (!id) {
                    setError('No CBT ID provided.');
                    setIsLoading(false);
                    return;
                }
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
        if (id || passedQuestions) loadQuestions();
    }, [id, passedQuestions]);

    // Timer Logic
    useEffect(() => {
        if (!isLoading && !isFinished && timeLeft > 0) {
            const timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        handleFinish(); // Auto-submit
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [isLoading, isFinished, timeLeft]);


    const handleShare = async () => {
        setIsSharing(true);
        try {
            const content = `🎯 I just completed a CBT practice test on Dorm! \n\nI scored ${score}/${questions.length} on the practice test. Ready for the real thing! 🚀\n\n#StudyWithDorm #DormApp #CBT`;
            await postAPI.createPost({ content });
            setShowShareSuccess(true);
        } catch (error) {
            console.error('Error sharing score:', error);
        } finally {
            setIsSharing(false);
        }
    };

    const handleGenerateReport = async () => {
        setIsGeneratingReport(true);
        try {
            const actualTimeSpent = 300 - timeLeft; // Calculate time used in seconds
            const { data } = await libraryAPI.generateCBTReport({
                questions,
                userAnswers: selectedAnswers,
                score,
                totalQuestions: questions.length,
                timeSpent: actualTimeSpent,
                cbtId: cbtId || id
            });

            // Navigate to report page with data
            router.push({
                pathname: '/library/cbt/report',
                params: { report: JSON.stringify(data) }
            });
        } catch (error) {
            console.error('Failed to generate report:', error);
        } finally {
            setIsGeneratingReport(false);
        }
    };

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
        const percentage = Math.round((score / questions.length) * 100);
        const isPassing = percentage >= 70;

        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />

                <ScrollView contentContainerStyle={styles.resultsScroll}>
                    {/* Header with Gradient */}
                    <LinearGradient
                        colors={isPassing ? ['#22c55e', '#16a34a'] : [colors.primary, colors.primary + 'CC']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.resultsHeader}
                    >
                        <Ionicons name={isPassing ? "trophy" : "ribbon"} size={64} color="#fff" />
                        <Text style={styles.resultsTitle}>Test Completed!</Text>
                        <View style={styles.scoreDisplay}>
                            <Text style={styles.scoreNumber}>{score}</Text>
                            <Text style={styles.scoreDivider}>/</Text>
                            <Text style={styles.scoreTotalNumber}>{questions.length}</Text>
                        </View>
                        <View style={styles.percentageBadge}>
                            <Text style={styles.percentageText}>{percentage}%</Text>
                        </View>
                        <Text style={styles.resultsMessage}>
                            {isPassing ? "Excellent work! You're ready for the real thing!" : "Good effort! Review the topics below and try again."}
                        </Text>
                    </LinearGradient>

                    <View style={styles.actionsContainer}>
                        {/* AI Report Button */}
                        <TouchableOpacity
                            style={[styles.aiReportBtn, { backgroundColor: '#8b5cf6' }]}
                            onPress={handleGenerateReport}
                            disabled={isGeneratingReport}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                {isGeneratingReport ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Ionicons name="sparkles" size={20} color="#fff" />
                                )}
                                <Text style={styles.primaryBtnText}>
                                    {isGeneratingReport ? 'Generating...' : 'Get AI Performance Report'}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        {/* Share Button */}
                        <TouchableOpacity
                            style={[styles.secondaryBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={handleShare}
                            disabled={isSharing}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                {isSharing ? (
                                    <ActivityIndicator color={colors.text} size="small" />
                                ) : (
                                    <Ionicons name="share-social-outline" size={20} color={colors.text} />
                                )}
                                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
                                    {isSharing ? 'Sharing...' : 'Share to Feed'}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        {/* Back Button */}
                        <TouchableOpacity
                            style={[styles.secondaryBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={() => router.back()}
                        >
                            <Ionicons name="arrow-back" size={20} color={colors.text} />
                            <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Back to Library</Text>
                        </TouchableOpacity>
                    </View>

                    <ActionSuccessModal
                        visible={showShareSuccess}
                        onClose={() => setShowShareSuccess(false)}
                        title="Shared Successfully!"
                        description="Your score has been shared as a post on your feed. Keep grinding!"
                        buttonText="Sweet"
                        iconName="checkmark-circle"
                    />
                </ScrollView>
            </SafeAreaView>
        );
    }

    const currentQuestion = questions[currentStep];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{
                title: 'CBT Practice',
                headerRight: () => null // Remove from header
            }} />

            {/* Prominent Timer Bar */}
            <View style={[styles.timerBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <View style={[styles.timerPill, { backgroundColor: timeLeft < 60 ? '#fee2e2' : colors.primary + '15' }]}>
                    <Ionicons name="time" size={18} color={timeLeft < 60 ? '#ef4444' : colors.primary} />
                    <Text style={[styles.timerPillText, { color: timeLeft < 60 ? '#ef4444' : colors.primary }]}>
                        {formatTime(timeLeft)}
                    </Text>
                </View>
                {!isFinished && (
                    <Text style={{ fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: colors.subtext }}>
                        Time Remaining
                    </Text>
                )}
            </View>

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
    timerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    timerPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    timerPillText: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 16,
        fontVariant: ['tabular-nums'],
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
    resultsScroll: {
        flexGrow: 1,
    },
    resultsHeader: {
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    resultsTitle: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 28,
        color: '#fff',
        marginTop: 20,
        marginBottom: 24,
    },
    scoreDisplay: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 16,
    },
    scoreNumber: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 72,
        color: '#fff',
    },
    scoreDivider: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 48,
        color: 'rgba(255,255,255,0.7)',
        marginHorizontal: 8,
    },
    scoreTotalNumber: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 48,
        color: 'rgba(255,255,255,0.9)',
    },
    percentageBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 16,
    },
    percentageText: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 20,
        color: '#fff',
    },
    resultsMessage: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 16,
        color: '#fff',
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 20,
    },
    actionsContainer: {
        padding: 20,
        gap: 12,
    },
    aiReportBtn: {
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryBtn: {
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        flexDirection: 'row',
        gap: 8,
    },
    secondaryBtnText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 15,
    },
});
