import axios from 'axios';
import { Platform } from 'react-native';
import { API_URL } from '../config/api';
export { API_URL } from '../config/api';

// Create axios instance with default config
const apiClient = axios.create({
    baseURL: API_URL,
    timeout: 30000, // Increased to 30s for image uploads
    headers: {
        'Content-Type': 'application/json',
    },
});

// Token storage (you'll need to implement secure storage with SecureStore or AsyncStorage)
let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
    authToken = token;
    if (token) {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete apiClient.defaults.headers.common['Authorization'];
    }
};

// Request interceptor
apiClient.interceptors.request.use(
    (config) => {
        if (authToken) {
            config.headers.Authorization = `Bearer ${authToken}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Handle unauthorized - redirect to login
        }
        return Promise.reject(error);
    }
);

// ============ AUTH ENDPOINTS ============
export const authAPI = {
    register: (data: any) =>
        apiClient.post('/auth/register', data, {
            headers: (data && typeof data.append === 'function') ? { 'Content-Type': 'multipart/form-data' } : undefined
        }),

    login: (credentials: any) => apiClient.post('/auth/login', credentials),

    getMe: () =>
        apiClient.get('/auth/me'),

    getUserProfile: (id: string) =>
        apiClient.get(`/auth/users/${id}`),

    getUsers: () => apiClient.get('/auth/users'),

    getUniversities: () => apiClient.get('/auth/universities'),

    getFaculties: () => apiClient.get('/auth/faculties'),

    getLevels: () => apiClient.get('/auth/levels'),

    updateProfile: (data: any) => apiClient.put('/auth/profile', data, {
        headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined
    }),

    changePassword: (data: any) => apiClient.put('/auth/password', data),

    forgotPassword: (email: string) => apiClient.post('/auth/forgot-password', { email }),

    resetPassword: (data: any) => apiClient.post('/auth/reset-password', data),

    verifyEmail: (token: string, email?: string) => apiClient.post('/auth/verify-email', { token, email }),

    resendCode: (email: string) => apiClient.post('/auth/resend-code', { email }),

    addBank: (data: { bankName: string; accountNumber: string; accountName: string }) =>
        apiClient.post('/auth/bank', data),

    getBanks: () => apiClient.get('/auth/bank'),

    followUser: (userId: string) => apiClient.post(`/auth/users/${userId}/follow`),

    unfollowUser: (userId: string) => apiClient.post(`/auth/users/${userId}/unfollow`),

    searchUsers: (query: string) => apiClient.get('/auth/search', { params: { query } }),

    blockUser: (userId: string) => apiClient.post(`/auth/users/${userId}/block`),

    unblockUser: (id: string) => apiClient.post(`/auth/users/${id}/unblock`),

    getBlockedUsers: () => apiClient.get('/auth/blocked'),

    deleteAccount: () => apiClient.delete('/auth/me'),

    toggleMonetization: () => apiClient.post('/auth/monetization/toggle'),

    submitKyc: (data: any) =>
        apiClient.put('/auth/kyc', data, {
            headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined
        }),

    submitAppeal: (data: { email: string; message: string }) =>
        apiClient.post('/auth/appeal', data),

    // Utils
    uploadImage: async (fileUri: string) => {
        const formData = new FormData();
        const filename = fileUri.split('/').pop() || 'file.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const ext = match ? match[1].toLowerCase() : 'jpg';

        let type = 'image/jpeg';
        if (['mp4', 'mov', 'm4v', 'avi'].includes(ext)) {
            type = `video/${ext === 'mov' ? 'quicktime' : 'mp4'}`;
        } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
            type = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
        }

        // @ts-ignore
        formData.append('image', {
            uri: Platform.OS === 'ios' ? fileUri.replace('file://', '') : fileUri,
            name: filename,
            type,
        });

        const response = await apiClient.post('/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 60000,
        });
        return response.data.url;
    },
};

// ============ WALLET ENDPOINTS ============
export const walletAPI = {
    getBalance: () =>
        apiClient.get('/wallet/balance'),

    topUp: (data: { amount: number; paymentMethod: string }) =>
        apiClient.post('/wallet/topup', data),

    withdraw: (data: {
        amount: number;
        bankDetails?: { account: string; bank: string; accountName: string };
        bankAccountId?: string;
        saveAccount?: boolean;
    }) =>
        apiClient.post('/wallet/withdraw', data),

    transfer: (data: { recipientId: string; amount: number; description: string }) =>
        apiClient.post('/wallet/transfer', data),

    getTransactions: (page = 1, limit = 20) =>
        apiClient.get(`/wallet/transactions?page=${page}&limit=${limit}`),

    initializePayment: (amount: number, email?: string) =>
        apiClient.post('/wallet/initialize', { amount, email }),

    verifyPayment: (reference: string) =>
        apiClient.post('/wallet/verify', { reference }),

    acceptTransfer: (id: string) =>
        apiClient.post(`/wallet/transfer/${id}/accept`),

    rejectTransfer: (id: string) =>
        apiClient.post(`/wallet/transfer/${id}/reject`),
};

// ============ POST ENDPOINTS ============
export const postAPI = {
    getFeed: (page = 1, limit = 20, tab?: string) =>
        apiClient.get(`/posts/feed`, { params: { page, limit, tab } }),

    getUserPosts: (userId: string, tab?: string) =>
        apiClient.get(`/posts/user/${userId}`, { params: { tab } }),

    getPost: (id: string) =>
        apiClient.get(`/posts/${id}`),

    createPost: (data: any) =>
        apiClient.post('/posts', data, {
            headers: (data && typeof data.append === 'function') ? { 'Content-Type': 'multipart/form-data' } : undefined,
            timeout: 60000 // 60 seconds specifically for post creation with images
        }),

    updatePost: (id: string, data: { content?: string; images?: string[]; visibility?: string }) =>
        apiClient.put(`/posts/${id}`, data),

    deletePost: (id: string) =>
        apiClient.delete(`/posts/${id}`),

    likePost: (id: string) =>
        apiClient.post(`/posts/${id}/like`),

    sharePost: (id: string) =>
        apiClient.post(`/posts/${id}/share`),

    bookmarkPost: (id: string) =>
        apiClient.post(`/posts/${id}/bookmark`),

    reportPost: (id: string, reason: string) =>
        apiClient.post(`/posts/${id}/report`, { reason }),

    notInterested: (id: string) =>
        apiClient.post(`/posts/${id}/not-interested`),

    incrementView: (id: string) =>
        apiClient.post(`/posts/${id}/view`),

    getVideos: (page = 1, limit = 10) =>
        apiClient.get(`/posts/videos?page=${page}&limit=${limit}`),
};

// ============ COMMENT ENDPOINTS ============
export const commentAPI = {
    getComments: (postId: string) =>
        apiClient.get(`/comments/post/${postId}`),

    createComment: (data: { postId: string; content: string; parentCommentId?: string }) =>
        apiClient.post('/comments', data),

    updateComment: (id: string, data: { content: string }) =>
        apiClient.put(`/comments/${id}`, data),

    deleteComment: (id: string) =>
        apiClient.delete(`/comments/${id}`),

    likeComment: (id: string) =>
        apiClient.post(`/comments/${id}/like`),
};

// ============ MARKET ENDPOINTS ============
export const marketAPI = {
    getItems: (params?: {
        type?: string;
        category?: string;
        search?: string;
        minPrice?: string;
        maxPrice?: string;
        condition?: string;
        page?: number;
        limit?: number
    }) =>
        apiClient.get('/market/items', { params }),

    getUserItems: () => apiClient.get('/market/my-items'),

    getItem: (id: string) =>
        apiClient.get(`/market/items/${id}`),

    createItem: (data: any) =>
        apiClient.post('/market/items', data),

    updateItem: (id: string, data: any) =>
        apiClient.put(`/market/items/${id}`, data),

    deleteItem: (id: string) =>
        apiClient.delete(`/market/items/${id}`),

    purchaseItem: (id: string) =>
        apiClient.post(`/market/items/${id}/purchase`),

    claimFreeMerch: (id: string) =>
        apiClient.post(`/market/merch/${id}/claim`),
};

// ============ ORDER ENDPOINTS ============
export const orderAPI = {
    getOrders: (role?: 'buyer' | 'seller' | 'all') =>
        apiClient.get('/orders', { params: { role } }),

    getOrder: (id: string) =>
        apiClient.get(`/orders/${id}`),

    updateStatus: (id: string, data: { status?: string; eta?: string }) =>
        apiClient.put(`/orders/${id}/status`, data),

    confirmReceipt: (id: string) =>
        apiClient.post(`/orders/${id}/confirm`),

    cancelOrder: (id: string) =>
        apiClient.post(`/orders/${id}/cancel`),
};

// ============ HOUSING ENDPOINTS ============
export const housingAPI = {
    getListings: (params?: any) =>
        apiClient.get('/housing/listings', { params }),

    getListing: (id: string) =>
        apiClient.get(`/housing/listings/${id}`),

    createListing: (data: FormData) =>
        apiClient.post('/housing/listings', data, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 60000 // 60 seconds for image uploads
        }),

    updateListing: (id: string, data: any) =>
        apiClient.put(`/housing/listings/${id}`, data),

    deleteListing: (id: string) =>
        apiClient.delete(`/housing/listings/${id}`),

    requestTour: (id: string, data: { preferredDate: string; preferredTime: string; message: string }) =>
        apiClient.post(`/housing/listings/${id}/tour`, data),

    createReview: (id: string, data: { rating: number; comment: string }) =>
        apiClient.post(`/housing/listings/${id}/review`, data),
};

// ============ TOUR ENDPOINTS ============
export const tourAPI = {
    getTours: () =>
        apiClient.get('/tours'),

    getTour: (id: string) =>
        apiClient.get(`/tours/${id}`),

    acceptTour: (id: string, meetingPoint: string, schedule?: { preferredDate: string; preferredTime: string }) =>
        apiClient.put(`/tours/${id}/accept`, { meetingPoint, ...schedule }),

    declineTour: (id: string) =>
        apiClient.put(`/tours/${id}/decline`),

    completeTour: (id: string) =>
        apiClient.put(`/tours/${id}/complete`),

    payRent: (id: string) =>
        apiClient.post(`/tours/${id}/pay`),
};

// ============ NOTIFICATION ENDPOINTS ============
export const notificationAPI = {
    getNotifications: () =>
        apiClient.get('/notifications'),

    getNotification: (id: string) =>
        apiClient.get(`/notifications/${id}`),

    markAsRead: (id: string) =>
        apiClient.put(`/notifications/${id}/read`),

    markAllAsRead: () =>
        apiClient.put('/notifications/read-all'),

    deleteNotification: (id: string) =>
        apiClient.delete(`/notifications/${id}`),

    registerPushToken: (token: string) =>
        apiClient.post('/notifications/push-token', { token }),
};

// ============ ELECTION ENDPOINTS ============
export const electionAPI = {
    getElections: (params?: any) =>
        apiClient.get('/elections', { params }),

    getElection: (id: string) => apiClient.get(`/elections/${id}`),
    getCandidate: (id: string) => apiClient.get(`/elections/candidates/${id}`),
    getPosition: (id: string) => apiClient.get(`/elections/positions/${id}`),

    getResults: (id: string) =>
        apiClient.get(`/elections/${id}/results`),

    castVote: (electionId: string, positionId: string, candidateId: string) =>
        apiClient.post(`/elections/${electionId}/vote`, { positionId, candidateId }),

    applyForPosition: (electionId: string, positionId: string, data: { manifesto: string, nickname?: string, media?: string[] }) =>
        apiClient.post(`/elections/${electionId}/positions/${positionId}/apply`, data),

    createElection: (data: any) => apiClient.post('/elections', data),

    getNews: () =>
        apiClient.get('/elections/news'),

    getNewsItem: (id: string) =>
        apiClient.get(`/elections/news/${id}`),

    getApplications: (electionId: string, status?: string) =>
        apiClient.get(`/elections/${electionId}/applications`, { params: { status } }),

    approveApplication: (applicationId: string) =>
        apiClient.patch(`/elections/applications/${applicationId}/approve`),

    rejectApplication: (applicationId: string, reason?: string) =>
        apiClient.patch(`/elections/applications/${applicationId}/reject`, { reason }),
};

// ============ LIBRARY ENDPOINTS ============
export const libraryAPI = {
    getMaterials: (params?: { search?: string; type?: string; department?: string; level?: string; university?: string }) =>
        apiClient.get('/library/materials', { params }),

    getMaterial: (id: string) =>
        apiClient.get(`/library/materials/${id}`),

    uploadMaterial: (data: FormData) =>
        apiClient.post('/library/materials', data, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),

    downloadMaterial: (id: string) =>
        apiClient.post(`/library/materials/${id}/download`),

    getFaculties: () =>
        apiClient.get('/library/faculties'),

    getCategories: () =>
        apiClient.get('/library/categories'),

    getPersonalLibrary: (params?: { tab?: string }) =>
        apiClient.get('/library/personal', { params }),

    saveMaterial: (id: string) =>
        apiClient.post(`/library/materials/${id}/save`),

    addReview: (id: string, data: { rating: number; comment: string }) =>
        apiClient.post(`/library/materials/${id}/review`, data),

    updateMaterial: (id: string, data: any) =>
        apiClient.put(`/library/materials/${id}`, data),

    getSummary: (id: string) =>
        apiClient.get(`/library/materials/${id}/summary`),

    getQuestions: (id: string) =>
        apiClient.get(`/library/materials/${id}/questions`), // Legacy mock ? 

    // New CBT endpoints
    getCBT: (id: string) => apiClient.get(`/library/cbt/${id}`),
    getCBTByMaterial: (materialId: string) => apiClient.get(`/library/cbt/material/${materialId}`),
    getAICBTs: () => apiClient.get('/library/cbt/ai/all'),

    submitCBT: (data: { cbtId: string; answers: any[]; timeSpent: number }) =>
        apiClient.post('/library/cbt/submit', data),

    generateCBTReport: (data: any) => apiClient.post('/ai/cbt-report', data),

    summarize: (data: { text: string; length?: string }) =>
        apiClient.post('/library/summarize', data),
};

// ============ CHAT ENDPOINTS ============
export const chatAPI = {
    getConversations: () => apiClient.get('/chat/conversations'),
    getConversation: (id: string) => apiClient.get(`/chat/conversations/${id}`),
    getMessages: (conversationId: string) => apiClient.get(`/chat/conversations/${conversationId}/messages`),
    sendMessage: (conversationId: string, data: { content: string; type?: string; mediaUrl?: string; replyTo?: string; marketItem?: string }) =>
        apiClient.post(`/chat/conversations/${conversationId}/messages`, data),
    createConversation: (recipientId: string) => apiClient.post('/chat/conversations', { recipientId }),
    getUnreadCount: () => apiClient.get('/chat/unread-count'),
    editMessage: (messageId: string, content: string) => apiClient.put(`/chat/messages/${messageId}`, { content }),
    deleteMessage: (messageId: string) => apiClient.delete(`/chat/messages/${messageId}`),
    reactToMessage: (messageId: string, emoji: string) => apiClient.post(`/chat/messages/${messageId}/react`, { emoji }),
    markAsRead: (conversationId: string, messageIds?: string[]) => apiClient.post('/chat/messages/mark-read', { conversationId, messageIds }),

    // Group Features
    createGroup: (data: { name: string; description?: string; avatar?: string; initialMembers?: string[] }) =>
        apiClient.post('/chat/groups', data),
    updateGroup: (groupId: string, data: { name?: string; description?: string; avatar?: string }) =>
        apiClient.put(`/chat/groups/${groupId}`, data),
    deleteGroup: (groupId: string) =>
        apiClient.delete(`/chat/groups/${groupId}`),
    inviteToGroup: (groupId: string, userIds: string[]) =>
        apiClient.post(`/chat/groups/${groupId}/invite`, { userIds }),
    leaveGroup: (groupId: string) =>
        apiClient.post(`/chat/groups/${groupId}/leave`),
    manageMember: (groupId: string, data: { userId: string; action: 'kick' | 'make_admin' | 'remove_admin' }) =>
        apiClient.post(`/chat/groups/${groupId}/manage-member`, data),
    getInvitations: () =>
        apiClient.get('/chat/invitations'),
    handleInvitation: (invitationId: string, action: 'accept' | 'decline') =>
        apiClient.post(`/chat/invitations/${invitationId}/${action}`),
};

// ============ SUPPORT/BUG ENDPOINTS ============
export const bugAPI = {
    reportBug: (data: { description: string; attachments?: string[] }) =>
        apiClient.post('/bugs', data),

    getReports: (page = 1, limit = 20, status?: string) =>
        apiClient.get('/bugs', { params: { page, limit, status } }),

    updateReport: (id: string, data: { status?: string; priority?: string; adminNotes?: string }) =>
        apiClient.put(`/bugs/${id}`, data),
};

// ============ SUPPORT ENDPOINTS ============
export const supportAPI = {
    getFAQs: () => apiClient.get('/support/faqs'),

    getTickets: (status?: string) => apiClient.get('/support/tickets', { params: { status } }),

    createTicket: (data: { subject: string; message: string }) =>
        apiClient.post('/support/tickets', data),

    getTicket: (id: string) => apiClient.get(`/support/tickets/${id}`),

    sendMessage: (id: string, data: { content: string; attachment?: string }) =>
        apiClient.post(`/support/tickets/${id}/message`, data),

    closeTicket: (id: string) => apiClient.put(`/support/tickets/${id}/close`),
};

// ============ REVIEW ENDPOINTS ============
export const reviewAPI = {
    submitReview: (data: { targetId: string; targetType: 'vendor' | 'housing' | 'material'; rating: number; content?: string }) =>
        apiClient.post('/reviews', data),

    getVendorReviews: (vendorId: string) =>
        apiClient.get(`/reviews/vendor/${vendorId}`),
};

// ============ AI ENDPOINTS ============
export const aiAPI = {
    summarize: (data: { materialId?: string; textContent?: string }) =>
        apiClient.post('/ai/summarize', data),

    generateCBT: (data: { materialId?: string; textContent?: string; numQuestions?: number }) =>
        apiClient.post('/ai/generate-cbt', data),
};

// ============ ADMIN ENDPOINTS ============
export const adminAPI = {
    banUser: (userId: string, data: { reason: string; banExpires?: string }) =>
        apiClient.put(`/admin/users/${userId}/ban`, data),

    getAppeals: () => apiClient.get('/admin/appeals'),

    updateAppealStatus: (id: string, data: { status: 'approved' | 'rejected'; adminNotes?: string }) =>
        apiClient.put(`/admin/appeals/${id}`, data),
};

export default apiClient;
