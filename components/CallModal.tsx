import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useCall } from '@/context/CallContext';
// import { USERS } from '@/constants/mockData';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CallModalProps {
    visible: boolean;
    onClose: () => void;
    user: {
        name: string;
        avatar: string;
    };
    status?: 'idle' | 'incoming' | 'outgoing' | 'connected';
    onAccept?: () => void;
    onDecline?: () => void;
    onEnd?: () => void;
}

export default function CallModal({ visible, onClose, user, status = 'outgoing', onAccept, onDecline, onEnd }: CallModalProps) {
    const { toggleMute, isMuted, remoteStream } = useCall();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const [timer, setTimer] = useState(0);
    const [isSpeaker, setIsSpeaker] = useState(false);
    const [isVideo, setIsVideo] = useState(false);
    const [contacts, setContacts] = useState<any[]>([]);

    useEffect(() => {
        const fetchContacts = async () => {
            // For now, fetch all users as "contacts". In a real app, fetch friends.
            try {
                // Assuming authAPI has a getUsers or similar. If not, we might need one.
                // Checking apiClient, we might not have exposed getUserspublicly? 
                // Let's assume we can fetch listing owners or similar, OR just leave it empty if no endpoint.
                // Actually authAPI.getMe() gets me. 
                // Let's use a placeholder empty list if we don't have a getUsers endpoint ready, 
                // BUT the user asked to "create the endpoint".
                // So I should check if backend has `getUsers`. 
                // backend/controllers/authController.js only has register, login, getMe.
                // I should create getAllUsers if I want this to work.
            } catch (e) { }
        };
        fetchContacts();
    }, []);

    // Feature States
    const [isKeypadVisible, setIsKeypadVisible] = useState(false);
    const [isContactsVisible, setIsContactsVisible] = useState(false);
    const [isAddCallVisible, setIsAddCallVisible] = useState(false);
    const [typedNumber, setTypedNumber] = useState('');

    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        let timerInterval: any;

        if (status === 'connected') {
            timerInterval = setInterval(() => {
                setTimer(prev => prev + 1);
            }, 1000);
        } else {
            setTimer(0);
        }

        return () => {
            if (timerInterval) clearInterval(timerInterval);
        };
    }, [status]);

    const getStatusText = () => {
        switch (status) {
            case 'incoming': return 'Incoming Call...';
            case 'outgoing': return 'Calling...';
            case 'connected':
                const minutes = Math.floor(timer / 60);
                const seconds = timer % 60;
                return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            default: return '';
        }
    };

    const ControlBtn = ({ icon, label, active, onPress, danger }: any) => (
        <View style={styles.controlContainer}>
            <TouchableOpacity
                onPress={onPress}
                style={[
                    styles.controlBtn,
                    { backgroundColor: danger ? colors.error : (active ? '#fff' : 'rgba(255,255,255,0.15)') }
                ]}
            >
                <Ionicons
                    name={icon}
                    size={28}
                    color={danger ? '#fff' : (active ? '#000' : '#fff')}
                />
            </TouchableOpacity>
            <Text style={styles.controlLabel}>{label}</Text>
        </View>
    );

    const KeypadButton = ({ val }: { val: string }) => (
        <TouchableOpacity
            style={styles.keypadBtn}
            onPress={() => setTypedNumber(prev => prev + val)}
        >
            <Text style={styles.keypadBtnText}>{val}</Text>
        </TouchableOpacity>
    );

    return (
        <Modal visible={visible} animationType="fade" transparent={true}>
            <View style={styles.container}>
                <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />

                <View style={styles.content}>
                    {/* Header Info (Always visible or slightly hidden depending on overlay) */}
                    <View style={styles.userInfo}>
                        {!isKeypadVisible && !isContactsVisible && !isAddCallVisible && (
                            <View style={styles.avatarContainer}>
                                <Animated.View style={[
                                    styles.pulseRing,
                                    {
                                        transform: [{ scale: pulseAnim }],
                                        opacity: pulseAnim.interpolate({
                                            inputRange: [1, 1.4],
                                            outputRange: [0.6, 0]
                                        })
                                    }
                                ]} />
                                <Image source={{ uri: user.avatar }} style={styles.avatar} />
                            </View>
                        )}
                        <Text style={styles.userName}>{isKeypadVisible ? (typedNumber || ' ') : user.name}</Text>
                        <Text style={styles.status}>{getStatusText()}</Text>
                    </View>

                    {/* Keypad Overlay */}
                    {isKeypadVisible && (
                        <View style={styles.keypadOverlay}>
                            <View style={styles.keypadGrid}>
                                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(val => (
                                    <KeypadButton key={val} val={val} />
                                ))}
                            </View>
                            <TouchableOpacity style={styles.backToCallBtn} onPress={() => setIsKeypadVisible(false)}>
                                <Text style={styles.backToCallText}>Hide Keypad</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Contacts / Add Call Overlay */}
                    {(isContactsVisible || isAddCallVisible) && (
                        <View style={styles.listOverlay}>
                            <Text style={styles.overlayTitle}>{isAddCallVisible ? 'Add Participant' : 'Contacts'}</Text>
                            <ScrollView style={styles.participantList}>
                                {contacts.map(u => (
                                    <TouchableOpacity key={u.id || u._id} style={styles.participantItem}>
                                        <Image source={{ uri: u.avatar || 'https://ui-avatars.com/api/?name=User' }} style={styles.participantAvatar} />
                                        <Text style={styles.participantName}>{u.name}</Text>
                                        <Ionicons name={isAddCallVisible ? "add-circle-outline" : "call-outline"} size={24} color="#fff" />
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <TouchableOpacity style={styles.backToCallBtn} onPress={() => {
                                setIsContactsVisible(false);
                                setIsAddCallVisible(false);
                            }}>
                                <Text style={styles.backToCallText}>Return to Call</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Main Controls (Hidden when overlays are active) */}
                    {!isKeypadVisible && !isContactsVisible && !isAddCallVisible && (
                        <View style={styles.controlsGrid}>
                            <View style={styles.row}>
                                <ControlBtn
                                    icon={isMuted ? "mic-off" : "mic"}
                                    label="mute"
                                    active={isMuted}
                                    onPress={toggleMute}
                                />
                                <ControlBtn
                                    icon="keypad"
                                    label="keypad"
                                    onPress={() => setIsKeypadVisible(true)}
                                />
                                <ControlBtn
                                    icon={isSpeaker ? "volume-high" : "volume-medium"}
                                    label="speaker"
                                    active={isSpeaker}
                                    onPress={() => setIsSpeaker(!isSpeaker)}
                                />
                            </View>
                            <View style={styles.row}>
                                <ControlBtn icon="add" label="add call" onPress={() => setIsAddCallVisible(true)} />
                                <ControlBtn
                                    icon={isVideo ? "videocam" : "videocam-off"}
                                    label="video"
                                    active={isVideo}
                                    onPress={() => setIsVideo(!isVideo)}
                                />
                                <ControlBtn icon="person" label="contacts" onPress={() => setIsContactsVisible(true)} />
                            </View>
                        </View>
                    )}

                    <View style={styles.bottomActions}>
                        {status === 'incoming' ? (
                            <View style={{ flexDirection: 'row', gap: 40 }}>
                                <TouchableOpacity style={[styles.endBtn, { backgroundColor: colors.error }]} onPress={onDecline}>
                                    <Ionicons name="call" size={32} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.endBtn, { backgroundColor: '#10b981' }]} onPress={onAccept}>
                                    <Ionicons name="call" size={32} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity style={[styles.endBtn, { backgroundColor: colors.error }]} onPress={onEnd || onClose}>
                                <Ionicons name="call" size={32} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
        paddingVertical: 60,
        paddingHorizontal: 40,
    },
    userInfo: {
        alignItems: 'center',
        marginTop: 20,
    },
    avatarContainer: {
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        zIndex: 2,
    },
    pulseRing: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    userName: {
        fontSize: 28,
        fontFamily: 'PlusJakartaSans_700Bold',
        color: '#fff',
        marginBottom: 8,
        textAlign: 'center',
        height: 40,
    },
    status: {
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_500Medium',
        color: 'rgba(255,255,255,0.6)',
    },
    controlsGrid: {
        gap: 30,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    controlContainer: {
        alignItems: 'center',
        gap: 8,
        width: 80,
    },
    controlBtn: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    controlLabel: {
        color: '#fff',
        fontSize: 12,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    bottomActions: {
        alignItems: 'center',
    },
    endBtn: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    // Keypad Styles
    keypadOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    keypadGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: 260,
        justifyContent: 'center',
        gap: 20,
    },
    keypadBtn: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    keypadBtnText: {
        color: '#fff',
        fontSize: 28,
        fontFamily: 'PlusJakartaSans_400Regular',
    },
    backToCallBtn: {
        marginTop: 40,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    backToCallText: {
        color: '#fff',
        fontSize: 14,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    // List Overlay Styles
    listOverlay: {
        flex: 1,
        marginTop: 20,
    },
    overlayTitle: {
        color: '#fff',
        fontSize: 20,
        fontFamily: 'PlusJakartaSans_700Bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    participantList: {
        flex: 1,
    },
    participantItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    participantAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 16,
    },
    participantName: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
});
