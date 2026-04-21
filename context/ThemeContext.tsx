import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'system';
export type FontSizeMode = 'small' | 'medium' | 'large';

interface ThemeContextType {
    theme: 'light' | 'dark'; // Actual resolved theme
    themePreference: ThemeMode; // User preference
    fontSize: FontSizeMode;
    fontSizeMultiplier: number;
    setTheme: (theme: ThemeMode) => void;
    setFontSize: (size: FontSizeMode) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const FONT_SIZE_MULTIPLIERS = {
    small: 0.85,
    medium: 1.0,
    large: 1.2,
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const nativeColorScheme = useNativeColorScheme();
    const [themePreference, setThemePreference] = useState<ThemeMode>('system');
    const [fontSize, setFontSizeState] = useState<FontSizeMode>('medium');
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(nativeColorScheme ?? 'light');

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const [savedTheme, savedFontSize] = await Promise.all([
                    AsyncStorage.getItem('theme'),
                    AsyncStorage.getItem('fontSize'),
                ]);

                if (savedTheme) {
                    setThemePreference(savedTheme as ThemeMode);
                }
                if (savedFontSize) {
                    setFontSizeState(savedFontSize as FontSizeMode);
                }
            } catch (error) {
                console.log('Failed to load theme settings', error);
            }
        };
        loadSettings();
    }, []);

    useEffect(() => {
        if (themePreference === 'system') {
            setResolvedTheme(nativeColorScheme ?? 'light');
        } else {
            setResolvedTheme(themePreference);
        }
    }, [themePreference, nativeColorScheme]);

    const setTheme = async (newTheme: ThemeMode) => {
        setThemePreference(newTheme);
        try {
            await AsyncStorage.setItem('theme', newTheme);
        } catch (error) {
            console.log('Failed to save theme', error);
        }
    };

    const setFontSize = async (newSize: FontSizeMode) => {
        setFontSizeState(newSize);
        try {
            await AsyncStorage.setItem('fontSize', newSize);
        } catch (error) {
            console.log('Failed to save font size', error);
        }
    };

    const toggleTheme = async () => {
        const newTheme = resolvedTheme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    };

    const fontSizeMultiplier = FONT_SIZE_MULTIPLIERS[fontSize];

    const value = React.useMemo(() => ({
        theme: resolvedTheme,
        themePreference,
        fontSize,
        fontSizeMultiplier,
        setTheme,
        setFontSize,
        toggleTheme
    }), [resolvedTheme, themePreference, fontSize, fontSizeMultiplier]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useColorScheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useColorScheme must be used within a ThemeProvider');
    }
    return context.theme;
}

export function useFontSize() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useFontSize must be used within a ThemeProvider');
    }
    return {
        fontSize: context.fontSize,
        fontSizeMultiplier: context.fontSizeMultiplier,
        setFontSize: context.setFontSize
    };
}

export function useThemeHandlers() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useThemeHandlers must be used within a ThemeProvider');
    }
    return {
        toggleTheme: context.toggleTheme,
        setTheme: context.setTheme,
        themePreference: context.themePreference
    };
}
