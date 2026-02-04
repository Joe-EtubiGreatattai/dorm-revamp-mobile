import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { Animated, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

interface Option {
    label: string;
    value: string;
    icon?: keyof typeof Ionicons.glyphMap;
    color?: string;
}

interface CustomDropdownProps {
    value: string;
    options: Option[];
    onSelect: (value: string) => void;
    placeholder?: string;
    label?: string;
    searchPlaceholder?: string;
}

export default function CustomDropdown({ value, options, onSelect, placeholder = 'Select an option', label, searchPlaceholder }: CustomDropdownProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const [visible, setVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
    const [searchText, setSearchText] = useState('');
    const buttonRef = useRef<View>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    const toggleDropdown = () => {
        if (visible) {
            closeDropdown();
        } else {
            openDropdown();
        }
    };

    const openDropdown = () => {
        buttonRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
            setPosition({ top: y + height + 8, left: x, width });
            setVisible(true);
            setSearchText(''); // Reset search on open
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]).start();
        });
    };

    const closeDropdown = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 0.95,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start(() => setVisible(false));
    };

    const handleSelect = (optionValue: string) => {
        onSelect(optionValue);
        closeDropdown();
    };

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchText.toLowerCase())
    );

    const selectedOption = options.find((opt) => opt.value === value);

    return (
        <View>
            {label && <Text style={[styles.label, { color: colors.text }]}>{label}</Text>}
            <TouchableOpacity
                ref={buttonRef}
                style={[styles.button, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={toggleDropdown}
                activeOpacity={0.7}
            >
                <View style={styles.selectedContent}>
                    {selectedOption?.icon && (
                        <Ionicons name={selectedOption.icon} size={18} color={selectedOption.color || colors.text} style={{ marginRight: 8 }} />
                    )}
                    <Text numberOfLines={1} style={[styles.buttonText, { color: selectedOption ? colors.text : colors.subtext, flex: 1 }]}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </Text>
                </View>
                <Ionicons name={visible ? 'chevron-up' : 'chevron-down'} size={20} color={colors.subtext} />
            </TouchableOpacity>

            <Modal visible={visible} transparent animationType="none">
                <TouchableWithoutFeedback onPress={closeDropdown}>
                    <View style={styles.overlay}>
                        <Animated.View
                            style={[
                                styles.dropdown,
                                {
                                    top: position.top,
                                    left: position.left,
                                    width: position.width,
                                    backgroundColor: colors.card,
                                    borderColor: colors.border,
                                    opacity: fadeAnim,
                                    transform: [{ scale: scaleAnim }],
                                    maxHeight: 300, // Limit height
                                },
                            ]}
                        >
                            {/* Search Input */}
                            <View style={[styles.searchContainer, { borderBottomColor: colors.border }]}>
                                <Ionicons name="search" size={16} color={colors.subtext} style={{ marginRight: 8 }} />
                                <TextInput
                                    style={[styles.searchInput, { color: colors.text }]}
                                    placeholder={searchPlaceholder || "Search..."}
                                    placeholderTextColor={colors.subtext}
                                    value={searchText}
                                    onChangeText={setSearchText}
                                />
                            </View>

                            <ScrollView
                                nestedScrollEnabled
                                keyboardShouldPersistTaps="handled"
                                contentContainerStyle={{ paddingBottom: 8 }}
                            >
                                {filteredOptions.length > 0 ? (
                                    filteredOptions.map((option, index) => (
                                        <TouchableOpacity
                                            key={option.value}
                                            style={[
                                                styles.optionItem,
                                                { borderBottomColor: colors.border },
                                                index === filteredOptions.length - 1 && { borderBottomWidth: 0 },
                                                value === option.value && { backgroundColor: colors.primary + '10' }
                                            ]}
                                            onPress={() => handleSelect(option.value)}
                                        >
                                            <View style={styles.optionContent}>
                                                {option.icon && (
                                                    <Ionicons name={option.icon} size={18} color={option.color || colors.text} style={{ marginRight: 8 }} />
                                                )}
                                                <Text
                                                    style={[
                                                        styles.optionText,
                                                        {
                                                            color: value === option.value ? colors.primary : colors.text,
                                                            fontFamily: value === option.value ? 'PlusJakartaSans_700Bold' : 'PlusJakartaSans_500Medium'
                                                        }
                                                    ]}
                                                >
                                                    {option.label}
                                                </Text>
                                            </View>
                                            {value === option.value && (
                                                <Ionicons name="checkmark" size={18} color={colors.primary} />
                                            )}
                                        </TouchableOpacity>
                                    ))
                                ) : (
                                    <View style={styles.emptyState}>
                                        <Text style={{ color: colors.subtext, fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium' }}>No results found</Text>
                                    </View>
                                )}
                            </ScrollView>
                        </Animated.View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    label: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 13,
        marginBottom: 6,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    selectedContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
    },
    buttonText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 14,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    dropdown: {
        position: 'absolute',
        borderRadius: 12,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
        overflow: 'hidden',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderBottomWidth: 1,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_500Medium',
        padding: 0,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 0.5,
    },
    optionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    optionText: {
        fontSize: 14,
    },
    emptyState: {
        padding: 16,
        alignItems: 'center',
    },
});
