# Frontend-Backend Integration Guide

## Backend Server Status
✅ **Server is running on:** https://dorm-revamp-backend.onrender.com  
✅ **Socket.io ready:** ws://192.168.0.130:5001

## Quick Start

### 1. Install Required Packages
```bash
npm install axios socket.io-client
```

### 2. API Configuration
The API config is already set up in `/config/api.ts`:
- REST API: `https://dorm-revamp-backend.onrender.com/api`
- Socket.io: `https://dorm-revamp-backend.onrender.com`

### 3. Using the API Client

#### Import and Setup
```typescript
import { authAPI, walletAPI, postAPI, setAuthToken } from '@/utils/apiClient';

// After login, set the token
const handleLogin = async (email: string, password: string) => {
    try {
        const response = await authAPI.login({ email, password });
        const { token, ...user } = response.data;
        
        // Save token
        setAuthToken(token);
        // Save user data to state/storage
        
    } catch (error) {
        console.error('Login failed:', error);
    }
};
```

#### Example API Calls

**Get Wallet Balance:**
```typescript
const fetchBalance = async () => {
    try {
        const response = await walletAPI.getBalance();
        console.log('Balance:', response.data);
    } catch (error) {
        console.error('Error:', error);
    }
};
```

**Create Post:**
```typescript
const createPost = async (content: string, images: string[]) => {
    try {
        const response = await postAPI.createPost({ content, images });
        console.log('Post created:', response.data);
    } catch (error) {
        console.error('Error:', error);
    }
};
```

**Top Up Wallet:**
```typescript
const topUpWallet = async (amount: number) => {
    try {
        const response = await walletAPI.topUp({
            amount,
            paymentMethod: 'card'
        });
        console.log('Top up successful:', response.data);
    } catch (error) {
        console.error('Error:', error);
    }
};
```

### 4. Socket.io Integration

#### Setup Socket Connection
```typescript
// utils/socket.ts
import { io } from 'socket.io-client';
import { SOCKET_URL } from '@/config/api';

export const initSocket = (token: string) => {
    const socket = io(SOCKET_URL, {
        auth: { token }
    });

    socket.on('connect', () => {
        console.log('✅ Socket connected:', socket.id);
    });

    socket.on('disconnect', () => {
        console.log('❌ Socket disconnected');
    });

    return socket;
};
```

#### Listen for Real-time Events
```typescript
// In your component
import { useEffect } from 'react';
import { initSocket } from '@/utils/socket';

export default function FeedScreen() {
    useEffect(() => {
        const socket = initSocket(userToken);

        // Listen for new posts
        socket.on('post:new', (post) => {
            console.log('New post:', post);
            // Update posts state
        });

        // Listen for post likes
        socket.on('post:liked', ({ postId, likerName }) => {
            console.log(`${likerName} liked post ${postId}`);
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    return <View>{/* Your UI */}</View>;
}
```

## Available API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Wallet
- `GET /api/wallet/balance` - Get balance
- `POST /api/wallet/topup` - Top up wallet
- `POST /api/wallet/withdraw` - Withdraw funds
- `GET /api/wallet/transactions` - Get transaction history

### Posts
- `GET /api/posts/feed` - Get feed
- `GET /api/posts/:id` - Get single post
- `POST /api/posts` - Create post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/like` - Like/unlike post

### Comments
- `GET /api/comments/post/:postId` - Get comments
- `POST /api/comments` - Create comment
- `PUT /api/comments/:id` - Update comment
- `DELETE /api/comments/:id` - Delete comment
- `POST /api/comments/:id/like` - Like comment

### Market
- `GET /api/market/items` - Get items
- `GET /api/market/items/:id` - Get item
- `POST /api/market/items` - Create item
- `PUT /api/market/items/:id` - Update item
- `DELETE /api/market/items/:id` - Delete item
- `POST /api/market/items/:id/purchase` - Purchase item

### Orders
- `GET /api/orders` - Get user's orders
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id/status` - Update order status
- `POST /api/orders/:id/confirm` - Confirm receipt & release escrow

### Housing
- `GET /api/housing/listings` - Get listings
- `GET /api/housing/listings/:id` - Get listing
- `POST /api/housing/listings` - Create listing
- `PUT /api/housing/listings/:id` - Update listing
- `DELETE /api/housing/listings/:id` - Delete listing
- `POST /api/housing/listings/:id/tour` - Request tour

### Tours
- `GET /api/tours` - Get tour requests
- `GET /api/tours/:id` - Get tour details
- `PUT /api/tours/:id/accept` - Accept tour
- `PUT /api/tours/:id/decline` - Decline tour

### Notifications
- `GET /api/notifications` - Get notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

## Testing the Connection

### Test from your device:
1. Make sure your phone/simulator is on the same network
2. Open the app
3. Try to login or register
4. Check backend terminal for requests

### Test API directly:
```bash
# Test from terminal
curl https://dorm-revamp-backend.onrender.com/api/auth/me

# Or test in browser
https://dorm-revamp-backend.onrender.com
```

## Troubleshooting

### Can't connect to backend:
1. Ensure backend server is running (`npm run dev` in backend folder)
2. Check firewall settings allow port 5001
3. Verify you're on the same WiFi network
4. Try pinging: `ping 192.168.0.130`

### Socket.io not connecting:
1. Check CORS settings in backend/server.js
2. Verify token is being sent in socket auth
3. Check backend logs for connection attempts

## Next Steps

1. ✅ Backend is running
2. ✅ API client is configured
3. ⏭️ Start using the APIs in your components
4. ⏭️ Implement authentication flow
5. ⏭️ Connect Socket.io for real-time features

