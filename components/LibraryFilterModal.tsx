import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface FilterModalProps {
    visible: boolean;
    onClose: () => void;
    onApply: (filters: FilterState) => void;
}

export interface FilterState {
    level: string[];
    department: string[];
    type: string[];
    sortBy: string;
}

const LEVELS = ['100L', '200L', '300L', '400L', '500L'];
const DEPARTMENTS = ['Computer Science', 'Mathematics', 'Engineering', 'Arts', 'Social Sciences'];
const TYPES = ['PDF', 'DOCX', 'PPT', 'IMG'];
const SORT_OPTIONS = ['Relevance', 'Date', 'Popularity', 'Rating'];

export default function LibraryFilterModal({ visible, onClose, onApply }: FilterModalProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [filters, setFilters] = useState<FilterState>({
        level: [],
        department: [],
        type: [],
        sortBy: 'Relevance',
    });

    const toggleFilter = (category: keyof FilterState, value: string) => {
        if (category === 'sortBy') {
            setFilters(prev => ({ ...prev, sortBy: value }));
        } else {
            setFilters(prev => {
                const list = prev[category] as string[];
                if (list.includes(value)) {
                    return { ...prev, [category]: list.filter(item => item !== value) };
                } else {
                    return { ...prev, [category]: [...list, value] };
                }
            });
        }
    };

    const handleApply = () => {
        onApply(filters);
        onClose();
    };

    const handleReset = () => {
        setFilters({
            level: [],
            department: [],
            type: [],
            sortBy: 'Relevance',
        });
    };

    const renderSection = (title: string, options: string[], category: keyof FilterState, multiSelect = true) => (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
            <View style={styles.optionsGrid}>
                {options.map((option) => {
                    const isSelected = category === 'sortBy'
                        ? filters.sortBy === option
                        : (filters[category] as string[]).includes(option);

                    return (
                        <TouchableOpacity
                            key={option}
                            style={[
                                styles.optionChip,
                                {
                                    backgroundColor: isSelected ? colors.primary : colors.card,
                                    borderColor: isSelected ? colors.primary : colors.border,
                                }
                            ]}
                            onPress={() => toggleFilter(category, option)}
                        >
                            <Text
                                style={[
                                    styles.optionText,
                                    { color: isSelected ? '#fff' : colors.text }
                                ]}
                            >
                                {option}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={[styles.cancelBtn, { color: colors.subtext }]}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Filters</Text>
                    <TouchableOpacity onPress={handleReset}>
                        <Text style={[styles.resetBtn, { color: colors.primary }]}>Reset</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                    {renderSection('Level', LEVELS, 'level')}
                    {renderSection('Department', DEPARTMENTS, 'department')}
                    {renderSection('File Type', TYPES, 'type')}
                    {renderSection('Sort By', SORT_OPTIONS, 'sortBy', false)}
                </ScrollView>

                <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                    <TouchableOpacity
                        style={[styles.applyBtn, { backgroundColor: colors.primary }]}
                        onPress={handleApply}
                    >
                        <Text style={styles.applyBtnText}>Apply Filters</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
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
        padding: 16,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 18,
    },
    cancelBtn: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 16,
    },
    resetBtn: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 16,
    },
    content: {
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 16,
        marginBottom: 12,
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    optionChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
    },
    optionText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
    },
    applyBtn: {
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
    },
    applyBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        color: '#fff',
        fontSize: 16,
    },
});
