import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface MembershipData {
    id: string;
    user_id: string;
    membership_status: 'ACTIVE' | 'INACTIVE';
    membership_purchase_date: string | null;
    created_at: string;
    updated_at: string;
}

export interface MembershipState {
    membership: MembershipData | null;
    isActive: boolean;          // membership_status === 'ACTIVE'
    isMembershipActive: boolean; // has qualifying order in last 3 days
    isEligibleForDiscount: boolean; // isActive && isMembershipActive
    daysRemaining: number;
    isLoading: boolean;
    purchaseMembership: () => Promise<boolean>;
    refreshMembership: () => Promise<void>;
}

export function useMembership(): MembershipState {
    const { user } = useAuth();
    const [membership, setMembership] = useState<MembershipData | null>(null);
    const [isMembershipActive, setIsMembershipActive] = useState(false);
    const [daysRemaining, setDaysRemaining] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const fetchMembership = useCallback(async () => {
        if (!user) {
            setMembership(null);
            setIsMembershipActive(false);
            setDaysRemaining(0);
            setIsLoading(false);
            return;
        }

        try {
            // Fetch membership record
            const { data: membershipData, error } = await supabase
                .from('memberships')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) {
                console.error('Error fetching membership:', error);
                setIsLoading(false);
                return;
            }

            setMembership(membershipData as MembershipData | null);

            // Check activity status if membership exists and is ACTIVE
            if (membershipData && membershipData.membership_status === 'ACTIVE') {
                const { data: activityData, error: activityError } = await supabase
                    .rpc('check_membership_activity', { p_user_id: user.id });

                if (!activityError) {
                    setIsMembershipActive(activityData === true);
                }

                // Get days remaining
                const { data: daysData, error: daysError } = await supabase
                    .rpc('get_membership_days_remaining', { p_user_id: user.id });

                if (!daysError && daysData !== null) {
                    setDaysRemaining(Number(daysData));
                }
            } else {
                setIsMembershipActive(false);
                setDaysRemaining(0);
            }
        } catch (err) {
            console.error('Failed to fetch membership:', err);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchMembership();
    }, [fetchMembership]);

    const purchaseMembership = async (): Promise<boolean> => {
        if (!user) return false;

        try {
            // Activate membership (upsert)
            const { error } = await supabase
                .rpc('activate_membership', { p_user_id: user.id });

            if (error) {
                console.error('Error activating membership:', error);
                return false;
            }

            // Refresh data
            await fetchMembership();
            return true;
        } catch (err) {
            console.error('Failed to purchase membership:', err);
            return false;
        }
    };

    const isActive = membership?.membership_status === 'ACTIVE';
    const isEligibleForDiscount = isActive && isMembershipActive;

    return {
        membership,
        isActive,
        isMembershipActive,
        isEligibleForDiscount,
        daysRemaining,
        isLoading,
        purchaseMembership,
        refreshMembership: fetchMembership,
    };
}
