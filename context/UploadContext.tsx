import React, { createContext, useContext, useEffect, useState } from 'react';
import { PendingUpload, uploadService } from '../utils/uploadService';

interface UploadContextType {
    queue: PendingUpload[];
    addToQueue: (payload: any) => Promise<void>;
    retryAll: () => void;
    clearFailed: () => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export const UploadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [queue, setQueue] = useState<PendingUpload[]>(uploadService.getQueue());

    useEffect(() => {
        const handleUpdate = (newQueue: PendingUpload[]) => {
            setQueue([...newQueue]);
        };

        uploadService.addListener(handleUpdate);
        return () => uploadService.removeListener(handleUpdate);
    }, []);

    const addToQueue = async (payload: any) => {
        await uploadService.addToQueue(payload);
    };

    const retryAll = () => {
        uploadService.processQueue();
    };

    const clearFailed = () => {
        uploadService.clearFailed();
    };

    return (
        <UploadContext.Provider value={{ queue, addToQueue, retryAll, clearFailed }}>
            {children}
        </UploadContext.Provider>
    );
};

export const useUpload = () => {
    const context = useContext(UploadContext);
    if (!context) {
        throw new Error('useUpload must be used within an UploadProvider');
    }
    return context;
};
