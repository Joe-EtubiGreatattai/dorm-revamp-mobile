import io, { Socket } from 'socket.io-client';
import { API_URL } from '../config/api';

let socket: Socket | null = null;

export const initSocket = (token?: string) => {
    if (socket) {
        if (token && socket.auth) {
            (socket.auth as any).token = token;
            if (socket.connected) {
                // If already connected, we might need to disconnect/reconnect to apply new token
                // depending on server setup, but usually updating auth and connecting works.
                socket.disconnect().connect();
            } else {
                socket.connect();
            }
        }
        return socket;
    }

    // Remove '/api' from URL if present for socket connection
    const socketUrl = API_URL.replace('/api', '');

    socket = io(socketUrl, {
        auth: { token },
        transports: ['websocket'],
        autoConnect: true,
    });

    socket.on('connect', () => {
        console.log('🔌 [Socket] Connected successfully with ID:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
        console.log('🔌 [Socket] Disconnected. Reason:', reason);
    });

    socket.on('connect_error', (error) => {
        console.log('🔌 [Socket] Connection Error:', error.message);
    });

    return socket;
};

export const getSocket = () => {
    if (!socket) {
        // If getting socket before auth, try init without token (or handle error)
        return initSocket();
    }
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
