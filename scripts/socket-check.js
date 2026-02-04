const io = require('socket.io-client');

// Configuration - Update these as needed
const SOCKET_URL = 'http://localhost:5000'; // Or your backend URL
const TOKEN = 'YOUR_TEST_TOKEN'; // You would need a valid JWT token here

console.log('🧪 [Socket-Test] Starting Socket Diagnostic Script...');
console.log(`🔗 [Socket-Test] Target URL: ${SOCKET_URL}`);

const socket = io(SOCKET_URL, {
    auth: { token: TOKEN },
    transports: ['websocket'],
    autoConnect: true
});

socket.on('connect', () => {
    console.log('✅ [Socket-Test] Connected! Socket ID:', socket.id);

    // Test Room Joining
    const testConversationId = 'TEST_CONV_ID';
    console.log(`📤 [Socket-Test] Joining room: ${testConversationId}`);
    socket.emit('conversation:join', testConversationId);
});

socket.on('connect_error', (error) => {
    console.error('❌ [Socket-Test] Connection Error:', error.message);
});

socket.on('disconnect', (reason) => {
    console.log('⚠️ [Socket-Test] Disconnected:', reason);
});

// Listener for Online Status
socket.on('user:online', (data) => {
    console.log('🟢 [Socket-Event] User Online:', data);
});

socket.on('user:offline', (data) => {
    console.log('🔴 [Socket-Event] User Offline:', data);
});

// Listener for Messages
socket.on('message:receive', (data) => {
    console.log('📩 [Socket-Event] Received Message:', data);
});

// Listener for Typing
socket.on('typing:indicator', (data) => {
    console.log('📝 [Socket-Event] Typing Indicator:', data);
});

// Keep process alive
console.log('⏳ [Socket-Test] Listening for events... Press Ctrl+C to stop.');
process.stdin.resume();
