import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, postAPI } from './apiClient';

const UPLOAD_QUEUE_KEY = '@dorm_upload_queue';

export interface PendingUpload {
    id: string;
    payload: any;
    status: 'pending' | 'uploading' | 'failed';
    attempts: number;
    error?: string;
}

class UploadService {
    private queue: PendingUpload[] = [];
    private isProcessing = false;
    private listeners: ((queue: PendingUpload[]) => void)[] = [];

    constructor() {
        this.loadQueue();
    }

    private async loadQueue() {
        const stored = await AsyncStorage.getItem(UPLOAD_QUEUE_KEY);
        if (stored) {
            this.queue = JSON.parse(stored);
            this.notifyListeners();
            // Start processing if there are items
            this.processQueue();
        }
    }

    private async saveQueue() {
        await AsyncStorage.setItem(UPLOAD_QUEUE_KEY, JSON.stringify(this.queue));
        this.notifyListeners();
    }

    public addListener(cb: (queue: PendingUpload[]) => void) {
        this.listeners.push(cb);
        cb(this.queue);
    }

    public removeListener(cb: (queue: PendingUpload[]) => void) {
        this.listeners = this.listeners.filter(l => l !== cb);
    }

    private notifyListeners() {
        this.listeners.forEach(l => l(this.queue));
    }

    public async addToQueue(payload: any) {
        const upload: PendingUpload = {
            id: Math.random().toString(36).substring(7),
            payload,
            status: 'pending',
            attempts: 0
        };
        this.queue.push(upload);
        await this.saveQueue();
        this.processQueue();
    }

    public async processQueue() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        while (this.queue.some(u => u.status !== 'uploading' && u.attempts < 5)) {
            const next = this.queue.find(u => u.status !== 'uploading' && u.attempts < 5);
            if (!next) break;

            try {
                next.status = 'uploading';
                this.notifyListeners();

                // 1. Handle Video Upload
                let videoUrl = next.payload.video;
                if (videoUrl && !videoUrl.startsWith('http')) {
                    videoUrl = await authAPI.uploadImage(videoUrl);
                }

                // 2. Handle Images Upload
                const uploadedImages = await Promise.all(
                    (next.payload.images || []).map(async (img: string) => {
                        if (img.startsWith('http')) return img;
                        return await authAPI.uploadImage(img);
                    })
                );

                // 3. Create Post
                const finalPayload = {
                    ...next.payload,
                    video: videoUrl,
                    images: uploadedImages
                };

                await postAPI.createPost(finalPayload);

                // Success! Remove from queue
                this.queue = this.queue.filter(u => u.id !== next.id);
                await this.saveQueue();
            } catch (error: any) {
                console.error('[UploadService] Failed:', error);
                next.status = 'failed';
                next.attempts += 1;
                next.error = error.message;
                this.notifyListeners();
                await this.saveQueue();

                // Break and wait if it's a network error (assuming all errors here are network for retry)
                // In a real app we'd check error status
                break;
            }
        }

        this.isProcessing = false;
    }

    public getQueue() {
        return this.queue;
    }

    public async clearFailed() {
        this.queue = this.queue.filter(u => u.status !== 'failed');
        await this.saveQueue();
    }
}

export const uploadService = new UploadService();
