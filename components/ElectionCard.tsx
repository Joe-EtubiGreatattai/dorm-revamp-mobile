import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Candidate {
    id: string;
    name: string;
    image: string;
    bio: string;
}

interface ElectionProps {
    id: string;
    title: string;
    candidates: Candidate[];
    endsAt: string;
}

export default function ElectionCard({ election }: { election: ElectionProps }) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    return (
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.header}>
                <Ionicons name="megaphone-outline" size={24} color={colors.primary} />
                <View style={styles.headerText}>
                    <Text style={[styles.title, { color: colors.text }]}>{election.title}</Text>
                    <Text style={[styles.date, { color: colors.subtext }]}>Ends: {new Date(election.endsAt).toLocaleDateString()}</Text>
                </View>
            </View>

            <Text style={[styles.label, { color: colors.text }]}>Candidates</Text>
            <View style={styles.candidatesRow}>
                {election.candidates.map((candidate) => (
                    <View key={candidate.id} style={styles.candidate}>
                        <Image source={{ uri: candidate.image }} style={styles.candidateImg} />
                        <Text style={[styles.candidateName, { color: colors.text }]}>{candidate.name}</Text>
                    </View>
                ))}
            </View>

            <TouchableOpacity style={[styles.voteBtn, { backgroundColor: colors.primary }]}>
                <Text style={styles.voteBtnText}>Enter Voting Booth</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        marginBottom: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
    },
    headerText: {
        flex: 1,
    },
    title: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
        fontWeight: 'bold',
    },
    date: {
        fontFamily: 'PlusJakartaSans_400Regular',
        fontSize: 12,
        marginTop: 2,
    },
    label: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
    },
    candidatesRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 24,
    },
    candidate: {
        alignItems: 'center',
        gap: 8,
    },
    candidateImg: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#eee',
    },
    candidateName: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
        fontWeight: '500',
    },
    voteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 16,
    },
    voteBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
