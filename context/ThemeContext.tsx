import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: 'light' | 'dark'; // Actual resolved theme
    themePreference: ThemeMode; // User preference
    setTheme: (theme: ThemeMode) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const nativeColorScheme = useNativeColorScheme();
    const [themePreference, setThemePreference] = useState<ThemeMode>('system');
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(nativeColorScheme ?? 'light');

    useEffect(() => {
        const loadTheme = async () => {
            try {
                const savedTheme = await AsyncStorage.getItem('theme');
                if (savedTheme) {
                    setThemePreference(savedTheme as ThemeMode);
                }
            } catch (error) {
                console.log('Failed to load theme', error);
            }
        };
        loadTheme();
    }, []);

    useEffect(() => {
        if (themePreference === 'system') {
            setResolvedTheme(nativeColorScheme ?? 'light');
        } else {
            setResolvedTheme(themePreference);
        }
    }, [themePreference, nativeColorScheme]);

    // Listen to system changes if no explicit preference override? 
    // For now, let's say if user manually sets it, we respect it. 
    // If not, we could track system. But usually easier to just stick to saved or manual.

    const setTheme = async (newTheme: ThemeMode) => {
        setThemePreference(newTheme);
        try {
            await AsyncStorage.setItem('theme', newTheme);
        } catch (error) {
            console.log('Failed to save theme', error);
        }
    };

    const toggleTheme = async () => {
        const newTheme = resolvedTheme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme: resolvedTheme, themePreference, setTheme, toggleTheme }}>
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
