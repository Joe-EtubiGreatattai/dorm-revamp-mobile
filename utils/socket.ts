import io, { Socket } from 'socket.io-client';
import { API_URL } from '../config/api';

let socket: Socket | null = null;

export const initSocket = (token?: string) => {
    if (socket) return socket;

    // Remove '/api' from URL if present for socket connection
    const socketUrl = API_URL.replace('/api', '');

    socket = io(socketUrl, {
        auth: { token },
        transports: ['websocket'],
        autoConnect: true,
    });

    socket.on('connect', () => {
        console.log('Socket connected:', socket?.id);
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected');
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
