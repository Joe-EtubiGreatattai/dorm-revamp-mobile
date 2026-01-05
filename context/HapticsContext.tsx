import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

interface HapticsContextType {
    hapticsEnabled: boolean;
    setHapticsEnabled: (enabled: boolean) => void;
    triggerHaptic: (style?: Haptics.ImpactFeedbackStyle, force?: boolean) => void;
}

const HapticsContext = createContext<HapticsContextType | undefined>(undefined);

export function HapticsProvider({ children }: { children: React.ReactNode }) {
    const [hapticsEnabled, setHapticsEnabledState] = useState(true);

    useEffect(() => {
        const loadHaptics = async () => {
            try {
                const saved = await AsyncStorage.getItem('hapticsEnabled');
                if (saved !== null) {
                    setHapticsEnabledState(JSON.parse(saved));
                }
            } catch (error) {
                console.log('Failed to load haptics preference', error);
            }
        };
        loadHaptics();
    }, []);

    const setHapticsEnabled = async (enabled: boolean) => {
        setHapticsEnabledState(enabled);
        try {
            await AsyncStorage.setItem('hapticsEnabled', JSON.stringify(enabled));
        } catch (error) {
            console.log('Failed to save haptics preference', error);
        }
    };

    const triggerHaptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium, force: boolean = false) => {
        if ((hapticsEnabled || force) && Platform.OS !== 'web') {
            Haptics.impactAsync(style);
        }
    };

    return (
        <HapticsContext.Provider value={{ hapticsEnabled, setHapticsEnabled, triggerHaptic }}>
            {children}
        </HapticsContext.Provider>
    );
}

export function useHaptics() {
    const context = useContext(HapticsContext);
    if (context === undefined) {
        throw new Error('useHaptics must be used within a HapticsProvider');
    }
    return context;
}
