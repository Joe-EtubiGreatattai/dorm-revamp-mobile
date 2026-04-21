const PORT = '5001';

// Production URL (HTTPS)
const PROD_URL = 'https://dorm-revamp.duckdns.org';

// Local IP (For development)
// const LOCAL_IP = '192.168.0.130';

// Use production URL
export const API_URL = `${PROD_URL}/api`;
export const SOCKET_URL = PROD_URL;
export const PAYSTACK_PUBLIC_KEY = 'pk_live_9c476b9f520955121693ca2e1bb8205d51462cfa';


export default {
    API_URL,
    SOCKET_URL,
    PAYSTACK_PUBLIC_KEY
};
