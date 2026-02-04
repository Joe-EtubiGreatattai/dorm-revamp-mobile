import { API_URL } from '@/utils/apiClient';
import { getSocket } from '@/utils/socket';
import axios from 'axios';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

interface Restriction {
    _id: string;
    tab: string;
    scope: 'global' | 'school' | 'user';
    targetId?: string;
    reason: string;
    isActive: boolean;
    filters?: {
        type?: string;
        startDate?: string;
        endDate?: string;
        role?: string;
        kycStatus?: string;
        minBalance?: number;
        days?: number;
    };
}

interface RestrictionContextType {
    restrictions: Restriction[];
    checkRestriction: (tab: string) => Restriction | undefined;
    isLoading: boolean;
}

const RestrictionContext = createContext<RestrictionContextType>({
    restrictions: [],
    checkRestriction: () => undefined,
    isLoading: true,
});

export const useRestrictions = () => useContext(RestrictionContext);

export const RestrictionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [restrictions, setRestrictions] = useState<Restriction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user, token } = useAuth();

    // Fetch initial restrictions
    useEffect(() => {
        if (!user || !token) {
            setRestrictions([]);
            setIsLoading(false);
            return;
        }

        const fetchRestrictions = async () => {
            try {
                // Determine user's school ID locally or fetch from API
                // Assuming user object has it or we fetch /my endpoint which handles logic
                const res = await axios.get(`${API_URL}/restrictions/my`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setRestrictions(res.data);
            } catch (error) {
                console.log('Error fetching restrictions:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRestrictions();
    }, [user, token]);

    // Helper to check if a restriction applies to the current user
    const doesRestrictionApply = (restriction: any, currentUser: any) => {
        if (!currentUser) return false;

        const { scope, targetId, filters } = restriction;

        // 1. Direct Scope Checks
        if (scope === 'school' && currentUser.university !== targetId) return false;
        if (scope === 'user' && currentUser._id !== targetId) return false;

        // 2. Filter Checks (if any)
        if (filters && Object.keys(filters).length > 0) {
            const { type } = filters;

            if (type === 'date') {
                const nav = new Date();
                const start = filters.startDate ? new Date(filters.startDate) : null;
                const end = filters.endDate ? new Date(filters.endDate) : null;
                // Assuming user has createdAt, if not we can't check so return false (safe fail)
                if (!currentUser.createdAt) return false;
                const userDate = new Date(currentUser.createdAt);

                if (start && userDate < start) return false;
                if (end && userDate > end) return false;
            }

            if (type === 'role') {
                if (currentUser.role !== filters.role) return false;
            }

            if (type === 'kyc') {
                const userKyc = currentUser.kycStatus || 'none';
                if (userKyc !== filters.kycStatus) return false;
            }

            if (type === 'wealth') {
                if ((currentUser.walletBalance || 0) < filters.minBalance) return false;
            }

            // 'activity' filter omitted as it requires realtime lastSeen data which might be stale in context
        }

        return true;
    };

    // Socket listeners
    useEffect(() => {
        const socket = getSocket();
        if (!socket || !user) {
            console.log('🔇 [FRONTEND] Socket or user not available for restrictions');
            return;
        }

        console.log('🔌 [FRONTEND] Attaching restriction listeners for user:', user.name);

        const handleRestrictionActive = (data: any) => {
            console.log('\n📥 [FRONTEND] Received restriction:active event');
            console.log('   Data:', JSON.stringify(data, null, 2));
            console.log('   Current user:', user?.name, '(', user?._id, ')');
            console.log('   User university:', user?.university);

            const applies = doesRestrictionApply(data, user);
            console.log('   Does restriction apply to this user?', applies);

            if (applies) {
                setRestrictions(prev => {
                    // Avoid duplicates - Check tab, scope, targetId AND filters
                    const exists = prev.find(r =>
                        r.tab === data.tab &&
                        r.scope === data.scope &&
                        r.targetId === data.targetId &&
                        JSON.stringify(r.filters) === JSON.stringify(data.filters)
                    );

                    if (exists) {
                        console.log('   ⚠️ Restriction already exists in state, skipping');
                        return prev;
                    }
                    console.log('   ✅ Adding restriction to state. New count:', prev.length + 1);
                    return [...prev, data];
                });
            } else {
                console.log('   ❌ Restriction does not apply to this user, ignoring\n');
            }
        };

        const handleRestrictionLifted = (data: any) => {
            console.log('\n📥 [FRONTEND] Received restriction:lifted event');
            console.log('   Data:', JSON.stringify(data, null, 2));

            // Relaxed matching for lifting to ensure cleanup
            setRestrictions(prev => {
                const initialCount = prev.length;
                const filtered = prev.filter(r =>
                    !(r.tab === data.tab && r.scope === data.scope && (r.targetId === data.targetId || !r.targetId || !data.targetId))
                );

                if (filtered.length < initialCount) {
                    console.log(`   ✅ Removed ${initialCount - filtered.length} restriction(s). New count:`, filtered.length);
                } else {
                    console.log('   ⚠️ No matching restriction found to lift');
                }
                return filtered;
            });
        };

        socket.on('restriction:active', handleRestrictionActive);
        socket.on('restriction:lifted', handleRestrictionLifted);

        return () => {
            console.log('🔌 [FRONTEND] Detaching restriction listeners');
            socket.off('restriction:active', handleRestrictionActive);
            socket.off('restriction:lifted', handleRestrictionLifted);
        };
    }, [user, user?.university, user?.walletBalance]); // React to user changes to re-bind or re-evaluate


    // Initial Filter Check on Load
    // We also need to filter the INITIAL fetched restrictions list because the API might return global ones that have filters we need to check on client side.
    useEffect(() => {
        if (restrictions.length > 0 && user) {
            // Re-evaluate restrictions when user object changes or restrictions load
            // This ensures if user balance changes, restriction might apply/unapply
            // NOTE: This simple implementation just ensures we respect the latest logic.
            // Ideally we filter strictly, but for now we just keep them in state and 'checkRestriction' does the check? 
            // actually checkRestriction is safer to do the check.
        }
    }, [user, restrictions]);


    const checkRestriction = (tab: string) => {
        return restrictions.find(r => r.tab === tab && doesRestrictionApply(r, user));
    };

    return (
        <RestrictionContext.Provider value={{ restrictions, checkRestriction, isLoading }}>
            {children}
        </RestrictionContext.Provider>
    );
};
