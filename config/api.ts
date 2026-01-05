import Constants from 'expo-constants';
import { Platform } from 'react-native';

const PORT = '5001';

const getLocalIP = () => {
    const debuggerHost = Constants.expoConfig?.hostUri;
    const localhost = Platform.OS === 'ios' ? 'localhost' : '10.0.2.2';
    return debuggerHost ? debuggerHost.split(':')[0] : localhost;
};

const LOCAL_IP = getLocalIP();

// Use environment variable or default to local IP
export const API_URL = `http://${LOCAL_IP}:${PORT}/api`;
export const SOCKET_URL = `http://${LOCAL_IP}:${PORT}`;
export const PAYSTACK_PUBLIC_KEY = 'pk_test_a15103affe18985815a036f9092bc2ffe442b3d5';

console.log('API_URL Configured:', API_URL);

export default {
    API_URL,
    SOCKET_URL,
    PAYSTACK_PUBLIC_KEY
};
