import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function WalletResult() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
    const [newBalance, setNewBalance] = useState<number | null>(null);

    const orderId = searchParams.get('order_id');

    useEffect(() => {
        const verifyPayment = async () => {
            if (!orderId) {
                console.error('No order_id in URL');
                setStatus('failed');
                return;
            }

            console.log('Verifying wallet payment for order:', orderId);

            try {
                const { data, error } = await supabase.functions.invoke('verify-cashfree-payment', {
                    body: { orderId },
                });

                console.log('Verification response:', data, error);

                if (error) {
                    console.error('Verification error:', error);
                    setStatus('failed');
                    toast.error('Payment verification failed');
                    return;
                }

                if (data.success) {
                    setStatus('success');
                    toast.success('Wallet loaded successfully!');

                    // Try to fetch updated balance
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        const { data: profileData } = await (supabase
                            .from('profiles')
                            .select('wallet_balance')
                            .eq('id', user.id)
                            .single() as any);
                        if (profileData) {
                            setNewBalance(profileData.wallet_balance);
                        }
                    }
                } else {
                    setStatus('failed');
                    toast.error(data.error || 'Payment was not completed');
                }
            } catch (error) {
                console.error('Error verifying payment:', error);
                setStatus('failed');
                toast.error('Failed to verify payment');
            }
        };

        verifyPayment();
    }, [orderId]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-foreground">Verifying wallet payment...</h2>
                    <p className="text-muted-foreground mt-2">Please wait while we confirm your top-up</p>
                </div>
            </div>
        );
    }

    if (status === 'failed') {
        return (
            <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
                    <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-foreground mb-2">Top-up Failed</h2>
                    <p className="text-muted-foreground mb-6">
                        Your wallet top-up could not be completed. Please try again.
                    </p>
                    <Button onClick={() => navigate('/student/wallet')} variant="default" className="w-full">
                        Back to Wallet
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-foreground mb-2">Wallet Loaded!</h2>
                <p className="text-muted-foreground mb-4">
                    Your wallet has been topped up successfully.
                </p>

                {newBalance !== null && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                        <p className="text-sm text-green-700 font-medium">New Balance</p>
                        <p className="text-3xl font-bold text-green-800">₹{newBalance.toFixed(2)}</p>
                    </div>
                )}

                <Button onClick={() => navigate('/student/wallet')} variant="default" className="w-full">
                    Go to Wallet
                </Button>
            </div>
        </div>
    );
}
