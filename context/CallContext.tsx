import CallModal from '@/components/CallModal';
import { useAuth } from '@/context/AuthContext';
import { getSocket, initSocket } from '@/utils/socket';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

// Check if we're in Expo Go (doesn't support WebRTC)
const isExpoGo = Constants.appOwnership === 'expo';

// Conditionally import WebRTC (only in development builds)
let MediaStream: any, RTCPeerConnection: any, RTCSessionDescription: any, RTCIceCandidate: any, mediaDevices: any;

if (!isExpoGo) {
    try {
        const webRTC = require('react-native-webrtc');
        MediaStream = webRTC.MediaStream;
        RTCPeerConnection = webRTC.RTCPeerConnection;
        RTCSessionDescription = webRTC.RTCSessionDescription;
        RTCIceCandidate = webRTC.RTCIceCandidate;
        mediaDevices = webRTC.mediaDevices;
    } catch (error) {
        console.warn('⚠️ [CallContext] WebRTC not available - calls will not have audio/video');
    }
}

type User = {
    _id: string;
    name: string;
    avatar: string;
};

type CallState = 'idle' | 'incoming' | 'outgoing' | 'connected';

type CallContextType = {
    callState: CallState;
    activeCallUser: User | null;
    localStream: any | null;
    remoteStream: any | null;
    startCall: (user: User, isVideo?: boolean) => void;
    endCall: () => void;
    acceptCall: () => void;
    declineCall: () => void;
    toggleMute: () => void;
    isMuted: boolean;
};

const CallContext = createContext<CallContextType>({
    callState: 'idle',
    activeCallUser: null,
    localStream: null,
    remoteStream: null,
    startCall: () => { },
    endCall: () => { },
    acceptCall: () => { },
    declineCall: () => { },
    toggleMute: () => { },
    isMuted: false,
});

export const useCall = () => useContext(CallContext);

// STUN servers for NAT traversal
const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

export const CallProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const [callState, setCallState] = useState<CallState>('idle');
    const [activeCallUser, setActiveCallUser] = useState<User | null>(null);
    const [isVideo, setIsVideo] = useState(false);
    const [localStream, setLocalStream] = useState<any | null>(null);
    const [remoteStream, setRemoteStream] = useState<any | null>(null);
    const [isMuted, setIsMuted] = useState(false);

    const peerConnection = useRef<any | null>(null);

    useEffect(() => {
        // Initialize socket if user is logged in
        if (user) {
            initSocketAndListeners();
        }

        return () => {
            cleanup();
        };
    }, [user]);

    const initSocketAndListeners = async () => {
        const token = await SecureStore.getItemAsync('token');
        const socket = initSocket(token || undefined);

        if (!socket) return;

        // Call signaling events
        socket.on('call:incoming', ({ caller, isVideo: _isVideo }) => {
            console.log('📞 [CallContext] Incoming call from:', caller);
            setActiveCallUser(caller);
            setIsVideo(_isVideo);
            setCallState('incoming');
        });

        socket.on('call:accepted', async ({ responderId }) => {
            console.log('📞 [CallContext] Call accepted by:', responderId);
            setCallState('connected');
        });

        socket.on('call:declined', () => {
            console.log('📞 [CallContext] Call declined');
            cleanup();
        });

        socket.on('call:ended', () => {
            console.log('📞 [CallContext] Call ended');
            cleanup();
        });

        // Only set up WebRTC signaling if not in Expo Go
        if (!isExpoGo && RTCPeerConnection) {
            socket.on('call:offer', async ({ from, offer }) => {
                console.log('📞 [CallContext] Received offer from:', from);
                await handleIncomingOffer(offer);
            });

            socket.on('call:answer', async ({ from, answer }) => {
                console.log('📞 [CallContext] Received answer from:', from);
                await handleAnswer(answer);
            });

            socket.on('call:ice-candidate', async ({ from, candidate }) => {
                console.log('📞 [CallContext] Received ICE candidate from:', from);
                await handleIceCandidate(candidate);
            });
        }
    };

    const setupLocalMedia = async (video: boolean = false) => {
        if (isExpoGo || !mediaDevices) {
            console.warn('⚠️ [CallContext] WebRTC not available in Expo Go');
            alert('Voice/Video calls require a development build. Please rebuild the app.');
            return null;
        }

        try {
            console.log('📞 [CallContext] Requesting media permissions...');
            const stream = await mediaDevices.getUserMedia({
                audio: true,
                video: video
            });

            console.log('📞 [CallContext] Media stream acquired:', stream.id);
            setLocalStream(stream);
            return stream;
        } catch (error) {
            console.error('📞 [CallContext] Error getting media:', error);
            alert('Failed to access microphone/camera. Please check permissions.');
            return null;
        }
    };

    const createPeerConnection = (stream: any) => {
        if (isExpoGo || !RTCPeerConnection) {
            console.warn('⚠️ [CallContext] RTCPeerConnection not available');
            return null;
        }

        console.log('📞 [CallContext] Creating peer connection...');
        const pc = new RTCPeerConnection(rtcConfig);

        // Add local stream tracks
        stream.getTracks().forEach((track: any) => {
            console.log('📞 [CallContext] Adding track:', track.kind);
            pc.addTrack(track, stream);
        });

        // Handle remote stream
        pc.ontrack = (event: any) => {
            console.log('📞 [CallContext] Received remote track:', event.track.kind);
            if (event.streams && event.streams[0]) {
                const stream = event.streams[0];
                console.log('📞 [CallContext] Remote stream attached:', stream.id);
                setRemoteStream(stream);
            }
        };

        // Handle ICE candidates
        pc.onicecandidate = (event: any) => {
            if (event.candidate) {
                console.log('📞 [CallContext] Sending ICE candidate');
                const socket = getSocket();
                socket?.emit('call:ice-candidate', {
                    to: activeCallUser?._id,
                    candidate: event.candidate
                });
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log('📞 [CallContext] ICE connection state:', pc.iceConnectionState);
        };

        peerConnection.current = pc;
        return pc;
    };

    const startCall = async (targetUser: User, video: boolean = false) => {
        console.log('📞 [CallContext] Starting call to:', targetUser.name);
        setActiveCallUser(targetUser);
        setCallState('outgoing');
        setIsVideo(video);

        // Emit call:start for signaling (works in Expo Go)
        const socket = getSocket();
        socket?.emit('call:start', { receiverId: targetUser._id, isVideo: video });

        // Skip WebRTC setup if in Expo Go
        if (isExpoGo || !RTCPeerConnection) {
            console.warn('⚠️ [CallContext] WebRTC not available - audio/video disabled');
            return;
        }

        // Get local media
        const stream = await setupLocalMedia(video);
        if (!stream) {
            cleanup();
            return;
        }

        // Create peer connection
        const pc = createPeerConnection(stream);
        if (!pc) {
            cleanup();
            return;
        }

        // Create and send offer
        try {
            const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: video
            });
            await pc.setLocalDescription(offer);

            console.log('📞 [CallContext] Sending offer');
            socket?.emit('call:offer', {
                to: targetUser._id,
                offer: offer
            });
        } catch (error) {
            console.error('📞 [CallContext] Error creating offer:', error);
            cleanup();
        }
    };

    const handleIncomingOffer = async (offer: any) => {
        if (isExpoGo || !RTCSessionDescription) return;

        console.log('📞 [CallContext] Handling incoming offer');

        // Get local media
        const stream = await setupLocalMedia(isVideo);
        if (!stream) return;

        // Create peer connection
        const pc = createPeerConnection(stream);
        if (!pc) return;

        try {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            console.log('📞 [CallContext] Sending answer');
            const socket = getSocket();
            socket?.emit('call:answer', {
                to: activeCallUser?._id,
                answer: answer
            });
        } catch (error) {
            console.error('📞 [CallContext] Error handling offer:', error);
        }
    };

    const handleAnswer = async (answer: any) => {
        if (isExpoGo || !RTCSessionDescription) return;

        console.log('📞 [CallContext] Setting remote description from answer');
        try {
            await peerConnection.current?.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (error) {
            console.error('📞 [CallContext] Error setting remote description:', error);
        }
    };

    const handleIceCandidate = async (candidate: any) => {
        if (isExpoGo || !RTCIceCandidate) return;

        console.log('📞 [CallContext] Adding ICE candidate');
        try {
            await peerConnection.current?.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
            console.error('📞 [CallContext] Error adding ICE candidate:', error);
        }
    };

    const acceptCall = async () => {
        console.log('📞 [CallContext] Accepting call');
        const socket = getSocket();
        if (!socket || !activeCallUser) return;

        setCallState('connected');
        socket.emit('call:accept', { callerId: activeCallUser._id });
    };

    const declineCall = () => {
        console.log('📞 [CallContext] Declining call');
        const socket = getSocket();
        if (!socket || !activeCallUser) return;

        socket.emit('call:decline', { callerId: activeCallUser._id });
        cleanup();
    };

    const endCall = () => {
        console.log('📞 [CallContext] Ending call');
        const socket = getSocket();
        if (socket && activeCallUser) {
            socket.emit('call:end', { otherUserId: activeCallUser._id });
        }
        cleanup();
    };

    const toggleMute = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
                console.log('📞 [CallContext] Mute:', !audioTrack.enabled);
            }
        }
    };

    const cleanup = () => {
        console.log('📞 [CallContext] Cleaning up call resources');

        // Stop local stream
        if (localStream) {
            localStream.getTracks().forEach((track: any) => track.stop());
            setLocalStream(null);
        }

        // Close peer connection
        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }

        setRemoteStream(null);
        setCallState('idle');
        setActiveCallUser(null);
        setIsMuted(false);
    };

    return (
        <CallContext.Provider value={{
            callState,
            activeCallUser,
            localStream,
            remoteStream,
            startCall,
            endCall,
            acceptCall,
            declineCall,
            toggleMute,
            isMuted
        }}>
            {children}
            {/* Render Call Modal Globally */}
            {callState !== 'idle' && activeCallUser && (
                <CallModal
                    visible={true}
                    onClose={callState === 'connected' ? endCall : declineCall}
                    user={{
                        name: activeCallUser.name,
                        avatar: activeCallUser.avatar,
                    }}
                    status={callState}
                    onAccept={acceptCall}
                    onDecline={declineCall}
                    onEnd={endCall}
                />
            )}
        </CallContext.Provider>
    );
};
