
// Production URL
const PRODUCTION_URL = 'https://dorm-revamp-backend.onrender.com';

export const API_URL = `${PRODUCTION_URL}/api`;
export const SOCKET_URL = PRODUCTION_URL;
export const PAYSTACK_PUBLIC_KEY = 'pk_test_a15103affe18985815a036f9092bc2ffe442b3d5';

console.log('API_URL Configured:', API_URL);

export default {
    API_URL,
    SOCKET_URL,
    PAYSTACK_PUBLIC_KEY
};
