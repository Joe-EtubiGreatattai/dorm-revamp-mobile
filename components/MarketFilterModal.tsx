import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface MarketFilterModalProps {
    visible: boolean;
    onClose: () => void;
    onApply: (filters: FilterState) => void;
    currentFilters: FilterState;
    type: 'item' | 'food' | 'service' | 'housing';
}

export interface FilterState {
    minPrice: string;
    maxPrice: string;
    condition: string;
    onCampus: boolean;
    rating: number;
}

export default function MarketFilterModal({ visible, onClose, onApply, currentFilters, type }: MarketFilterModalProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'] || Colors.light;

    const [filters, setFilters] = useState<FilterState>(currentFilters);

    const handleApply = () => {
        onApply(filters);
        onClose();
    };

    const resetFilters = () => {
        setFilters({
            minPrice: '',
            maxPrice: '',
            condition: 'Any',
            onCampus: true,
            rating: 0,
        });
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <View style={[styles.header, { borderBottomColor: colors.border }]}>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={28} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.title, { color: colors.text }]}>Filters</Text>
                        <TouchableOpacity onPress={resetFilters}>
                            <Text style={[styles.resetBtn, { color: colors.primary }]}>Reset</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Price Range</Text>
                            <View style={styles.priceRow}>
                                <View style={[styles.priceInput, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                    <Text style={{ color: colors.subtext }}>Min ₦</Text>
                                    <Text style={{ color: colors.text }}>{filters.minPrice || '0'}</Text>
                                </View>
                                <View style={[styles.priceInput, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                    <Text style={{ color: colors.subtext }}>Max ₦</Text>
                                    <Text style={{ color: colors.text }}>{filters.maxPrice || '∞'}</Text>
                                </View>
                            </View>
                        </View>

                        {type === 'item' && (
                            <View style={styles.section}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Condition</Text>
                                <View style={styles.chipRow}>
                                    {['Any', 'New', 'Used', 'Fair'].map(cond => (
                                        <TouchableOpacity
                                            key={cond}
                                            onPress={() => setFilters({ ...filters, condition: cond })}
                                            style={[
                                                styles.chip,
                                                { borderColor: colors.border },
                                                filters.condition === cond && { backgroundColor: colors.primary, borderColor: colors.primary }
                                            ]}
                                        >
                                            <Text style={[styles.chipText, { color: filters.condition === cond ? '#fff' : colors.subtext }]}>
                                                {cond}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        <View style={styles.section}>
                            <View style={styles.switchRow}>
                                <View>
                                    <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 4 }]}>On Campus Only</Text>
                                    <Text style={[styles.subtext, { color: colors.subtext }]}>Only show sellers within the university</Text>
                                </View>
                                <Switch
                                    value={filters.onCampus}
                                    onValueChange={(val) => setFilters({ ...filters, onCampus: val })}
                                    trackColor={{ false: colors.border, true: colors.primary + '80' }}
                                    thumbColor={filters.onCampus ? colors.primary : '#f4f3f4'}
                                />
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Minimum Rating</Text>
                            <View style={styles.starRow}>
                                {[1, 2, 3, 4, 5].map(star => (
                                    <TouchableOpacity
                                        key={star}
                                        onPress={() => setFilters({ ...filters, rating: star })}
                                    >
                                        <Ionicons
                                            name={filters.rating >= star ? "star" : "star-outline"}
                                            size={32}
                                            color={filters.rating >= star ? "#fbbf24" : colors.subtext}
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </ScrollView>

                    <View style={[styles.footer, { borderTopColor: colors.border }]}>
                        <TouchableOpacity style={[styles.applyBtn, { backgroundColor: colors.primary }]} onPress={handleApply}>
                            <Text style={styles.applyBtnText}>Show Results</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        height: '80%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 0.5,
    },
    title: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
    },
    resetBtn: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
    },
    content: {
        padding: 20,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
        marginBottom: 16,
    },
    priceRow: {
        flexDirection: 'row',
        gap: 12,
    },
    priceInput: {
        flex: 1,
        height: 50,
        borderRadius: 12,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        gap: 4,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    chipText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    subtext: {
        fontFamily: 'PlusJakartaSans_400Regular',
        fontSize: 13,
    },
    starRow: {
        flexDirection: 'row',
        gap: 12,
    },
    footer: {
        padding: 20,
        borderTopWidth: 0.5,
    },
    applyBtn: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    applyBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        color: '#fff',
        fontSize: 16,
    },
});
