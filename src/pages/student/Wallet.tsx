import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Wallet as WalletIcon, Plus, History, Loader2, IndianRupee, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface Transaction {
    id: string;
    amount: number;
    type: 'load' | 'payment' | 'refund' | 'bonus';
    description: string;
    created_at: string;
}

const TOP_UP_AMOUNTS = [100, 300, 500, 1000];

export default function Wallet() {
    const { user, profile } = useAuth();
    const [balance, setBalance] = useState<number>(0);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isTopUpLoading, setIsTopUpLoading] = useState(false);
    const [customAmount, setCustomAmount] = useState<string>('');

    const [searchParams, setSearchParams] = useSearchParams();
    const orderIdParam = searchParams.get('order_id');

    useEffect(() => {
        if (user) {
            fetchWalletData();
        }
    }, [user]);

    useEffect(() => {
        if (orderIdParam && orderIdParam.includes('_wallet_')) {
            verifyWalletPayment(orderIdParam);
        }
    }, [orderIdParam]);

    const verifyWalletPayment = async (orderId: string) => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('verify-cashfree-payment', {
                body: { orderId },
            });

            if (error) throw error;

            if (data.success) {
                toast.success('Wallet loaded successfully!');
                await fetchWalletData();
                // Remove order_id from URL
                setSearchParams({}, { replace: true });
            } else {
                toast.error('Payment was not completed');
                setSearchParams({}, { replace: true });
            }
        } catch (error) {
            console.error('Error verifying wallet payment:', error);
            toast.error('Failed to verify payment');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchWalletData = async () => {
        setIsLoading(true);
        try {
            // Fetch profile for balance
            const { data: profileData, error: profileError } = await (supabase
                .from('profiles')
                .select('wallet_balance')
                .eq('id', user?.id)
                .single() as any);

            if (profileError) throw profileError;
            setBalance(profileData.wallet_balance || 0);

            // Fetch transactions
            const { data: transData, error: transError } = await (supabase
                .from('wallet_transactions' as any)
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10) as any);

            if (transError) throw transError;
            setTransactions(transData as Transaction[]);
        } catch (error) {
            console.error('Error fetching wallet data:', error);
            toast.error('Failed to load wallet data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTopUp = async (amount: number) => {
        if (!user || !profile) return;

        setIsTopUpLoading(true);
        try {
            const orderId = `${user.id}_wallet_${Date.now()}`;
            const returnUrl = `${window.location.origin}/student/wallet`;

            const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-cashfree-order', {
                body: {
                    orderId,
                    amount,
                    customerName: profile.name,
                    customerEmail: profile.email,
                    customerPhone: profile.phone || '9999999999', // Fallback or prompt for phone
                    returnUrl,
                },
            });

            if (paymentError || !paymentData.paymentSessionId) {
                throw new Error('Failed to create payment order');
            }

            if (window.Cashfree) {
                const cashfree = window.Cashfree({ mode: 'production' });
                await cashfree.checkout({
                    paymentSessionId: paymentData.paymentSessionId,
                    redirectTarget: '_self',
                });
            } else {
                toast.error('Payment gateway not loaded');
            }
        } catch (error) {
            console.error('Error initiating top-up:', error);
            toast.error('Failed to initiate top-up');
        } finally {
            setIsTopUpLoading(false);
        }
    };

    const getBonusText = (amount: number) => {
        if (amount >= 500) return '10% Bonus';
        if (amount >= 300) return '7% Bonus';
        if (amount >= 100) return '5% Bonus';
        return null;
    };

    return (
        <div className="min-h-screen bg-mcd-cream pb-20">
            <div className="border-b border-mcd-border bg-white sticky top-0 z-10 shadow-sm">
                <div className="container mx-auto px-4 h-16 flex items-center gap-4">
                    <Link to="/student/dashboard" className="p-2 hover:bg-mcd-cream rounded-full transition-colors">
                        <ArrowLeft className="h-5 w-5 text-mcd-red" />
                    </Link>
                    <h1 className="text-xl font-bold">My Wallet</h1>
                </div>
            </div>

            <main className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
                {/* Balance Card */}
                <Card className="bg-gradient-to-br from-mcd-red to-red-600 text-white border-none shadow-xl">
                    <CardContent className="pt-8 pb-8">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-red-100 text-sm font-medium mb-1">Available Balance</p>
                                <div className="flex items-center gap-1">
                                    <span className="text-4xl font-bold">₹{balance.toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="bg-white/20 p-3 rounded-2xl">
                                <WalletIcon className="h-8 w-8 text-white" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Top Up Section */}
                <section className="space-y-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Plus className="h-5 w-5 text-mcd-red" />
                        Add Money
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        {TOP_UP_AMOUNTS.map((amount) => {
                            const bonusText = getBonusText(amount);
                            return (
                                <Button
                                    key={amount}
                                    variant="outline"
                                    className="h-auto py-4 flex flex-col items-center gap-1 border-2 border-white bg-white hover:border-mcd-red hover:bg-mcd-red/5 transition-all shadow-sm"
                                    onClick={() => handleTopUp(amount)}
                                    disabled={isTopUpLoading}
                                >
                                    <span className="text-xl font-bold text-foreground">₹{amount}</span>
                                    {bonusText && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                                            +{bonusText}
                                        </span>
                                    )}
                                </Button>
                            );
                        })}
                    </div>

                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                            <input
                                type="number"
                                placeholder="Custom amount"
                                className="w-full pl-7 pr-4 h-11 rounded-lg border border-mcd-border bg-white focus:outline-none focus:ring-2 focus:ring-mcd-red/20"
                                value={customAmount}
                                onChange={(e) => setCustomAmount(e.target.value)}
                            />
                        </div>
                        <Button
                            variant="gradient"
                            className="h-11 px-6 shadow-md"
                            onClick={() => handleTopUp(Number(customAmount))}
                            disabled={isTopUpLoading || !customAmount || Number(customAmount) < 10}
                        >
                            {isTopUpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                        </Button>
                    </div>

                    <div className="bg-mcd-yellow/10 border border-mcd-yellow/30 p-4 rounded-xl flex items-start gap-3">
                        <TrendingUp className="h-5 w-5 text-mcd-yellow mt-0.5" />
                        <div className="text-xs space-y-1">
                            <p className="font-bold text-mcd-yellow-700">Wallet Benefits</p>
                            <ul className="list-disc list-inside text-muted-foreground space-y-1">
                                <li>Load ₹100+ and get 5% bonus.</li>
                                <li>Load ₹300+ and get 7% bonus (Save ₹21).</li>
                                <li>Load ₹500+ and get 10% bonus (Save ₹50).</li>
                                <li>Zero platform fees on orders paid via wallet!</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Transaction History */}
                <section className="space-y-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <History className="h-5 w-5 text-mcd-red" />
                        Recent Activity
                    </h2>
                    <Card className="border-mcd-border bg-white overflow-hidden shadow-sm">
                        <CardContent className="p-0">
                            {isLoading ? (
                                <div className="p-8 flex justify-center">
                                    <Loader2 className="h-6 w-6 animate-spin text-mcd-red" />
                                </div>
                            ) : transactions.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground text-sm">
                                    No transactions yet
                                </div>
                            ) : (
                                <div className="divide-y divide-mcd-border">
                                    {transactions.map((tx) => (
                                        <div key={tx.id} className="p-4 flex justify-between items-center group hover:bg-mcd-cream/30 transition-colors">
                                            <div className="space-y-1">
                                                <p className="text-sm font-semibold text-foreground">{tx.description}</p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {new Date(tx.created_at).toLocaleDateString()} • {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            <span className={`text-sm font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </section>
            </main>
        </div>
    );
}
