import ActionSuccessModal from '@/components/ActionSuccessModal';
import { Ionicons } from '@expo/vector-icons';
import React, { createContext, useContext, useState } from 'react';

type AlertType = 'success' | 'error' | 'info';

interface AlertOptions {
    title: string;
    description: string;
    type?: AlertType;
    buttonText?: string;
    cancelText?: string;
    showCancel?: boolean;
    onConfirm?: () => void;
}

interface AlertContextType {
    showAlert: (options: AlertOptions) => void;
    hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: React.ReactNode }) {
    const [visible, setVisible] = useState(false);
    const [options, setOptions] = useState<AlertOptions>({
        title: '',
        description: '',
        type: 'success'
    });

    const showAlert = (newOptions: AlertOptions) => {
        setOptions({
            ...newOptions,
            type: newOptions.type || 'success'
        });
        setVisible(true);
    };

    const hideAlert = () => {
        setVisible(false);
    };

    const getIcon = (type: AlertType): keyof typeof Ionicons.glyphMap => {
        switch (type) {
            case 'error': return 'alert-circle';
            case 'info': return 'information-circle';
            default: return 'checkmark-circle';
        }
    };

    const getIconColor = (type: AlertType): string | undefined => {
        switch (type) {
            case 'error': return '#ef4444'; // Red 500
            case 'info': return '#3b82f6'; // Blue 500
            default: return undefined; // Component default (primary)
        }
    };

    return (
        <AlertContext.Provider value={{ showAlert, hideAlert }}>
            {children}
            <ActionSuccessModal
                visible={visible}
                onClose={hideAlert}
                title={options.title}
                description={options.description}
                buttonText={options.buttonText}
                cancelText={options.cancelText}
                showCancel={options.showCancel}
                onConfirm={() => {
                    options.onConfirm?.();
                    hideAlert();
                }}
                iconName={getIcon(options.type || 'success')}
                iconColor={getIconColor(options.type || 'success')}
            />
        </AlertContext.Provider>
    );
}

export function useAlert() {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return context;
}
