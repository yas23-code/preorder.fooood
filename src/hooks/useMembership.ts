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
    purchaseMembership: () => Promise<{ success: boolean; error?: string }>;
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

    const purchaseMembership = async (): Promise<{ success: boolean; error?: string }> => {
        if (!user) return { success: false, error: 'Not authenticated' };

        try {
            // Redirect to Cashfree payment
            const orderId = `${user.id}_mem_${Date.now()}`;
            const returnUrl = `${window.location.origin}/student/payment-result?order_id=${orderId}`;

            // Create Cashfree payment order using edge function
            const { data: profileData } = await supabase
                .from('profiles')
                .select('name, email')
                .eq('id', user.id)
                .single();

            const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-cashfree-order', {
                body: {
                    orderId,
                    amount: 29, // Membership price
                    customerName: profileData?.name || 'Customer',
                    customerEmail: profileData?.email || 'customer@example.com',
                    customerPhone: '9999999999', // Placeholder as it's required by PG
                    returnUrl,
                },
            });

            if (paymentError) {
                console.error('Payment order creation failed:', paymentError);
                return { success: false, error: paymentError.message || 'Payment initialization failed' };
            }
            if (!paymentData?.paymentSessionId) {
                console.error('No payment session ID:', paymentData);
                return { success: false, error: paymentData?.error || 'Failed to create payment session' };
            }

            // Require Cashfree SDK on frontend
            if ((window as any).Cashfree) {
                const cashfree = (window as any).Cashfree({ mode: 'production' }); // Or 'sandbox'
                const result = await cashfree.checkout({
                    paymentSessionId: paymentData.paymentSessionId,
                    redirectTarget: '_self',
                });

                if (result && result.error) {
                    console.error('Cashfree error:', result.error);
                    return { success: false, error: result.error.message || 'Payment checkout failed' };
                }

                // Hang the promise infinitely because the browser is redirecting away to Cashfree
                return new Promise(() => { });
            } else {
                console.error('Cashfree SDK not loaded');
                return { success: false, error: 'Payment gateway SDK not loaded' };
            }
        } catch (err: any) {
            console.error('Failed to purchase membership:', err);
            return { success: false, error: err.message || 'An unexpected error occurred' };
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
