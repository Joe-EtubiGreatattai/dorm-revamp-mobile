const PORT = '5001';

// Production URL (Render)
const PROD_URL = 'https://dorm-revamp-backend.onrender.com';

// Local IP (For development)
// const LOCAL_IP = '192.168.0.130';

// Use production URL
export const API_URL = `${PROD_URL}/api`;
export const SOCKET_URL = PROD_URL;
export const PAYSTACK_PUBLIC_KEY = 'pk_test_a15103affe18985815a036f9092bc2ffe442b3d5';

console.log('API_URL Configured:', API_URL);

export default {
    API_URL,
    SOCKET_URL,
    PAYSTACK_PUBLIC_KEY
};
