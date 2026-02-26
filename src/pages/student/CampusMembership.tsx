import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    Crown,
    CheckCircle2,
    Clock,
    Zap,
    ChevronLeft,
    CreditCard,
    AlertCircle,
    TrendingUp,
    Percent,
    History
} from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function CampusMembership() {
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [membershipActive, setMembershipActive] = useState(false);
    const [lastOrderDate, setLastOrderDate] = useState<string | null>(null);
    const [daysSinceLastOrder, setDaysSinceLastOrder] = useState<number | null>(null);

    useEffect(() => {
        const checkMembershipStatus = async () => {
            if (!user) return;

            try {
                // Check eligibility using the RPC function we created
                const { data: isEligible, error: eligibilityError } = await supabase
                    .rpc('is_member_eligible', { p_user_id: user.id });

                if (eligibilityError) throw eligibilityError;
                setMembershipActive(!!isEligible);

                // Fetch last order of ₹70 or more
                const { data: lastOrder, error: orderError } = await supabase
                    .from('orders')
                    .select('created_at')
                    .eq('user_id', user.id)
                    .gte('total', 70)
                    .in('status', ['completed', 'ready', 'accepted'])
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (lastOrder) {
                    setLastOrderDate(lastOrder.created_at);
                    const lastOrderDate = new Date(lastOrder.created_at);
                    const now = new Date();
                    const diffInMs = now.getTime() - lastOrderDate.getTime();
                    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
                    setDaysSinceLastOrder(diffInDays);
                }
            } catch (error) {
                console.error('Error checking membership:', error);
            } finally {
                setIsLoading(false);
            }
        };

        checkMembershipStatus();
    }, [user]);

    const handlePurchase = async () => {
        if (!user || !profile) {
            toast.error('Please log in to purchase membership');
            return;
        }

        setIsProcessing(true);
        try {
            // In a real app, this would initiate a Cashfree payment of ₹29
            // For this implementation, we'll simulate success and update the profile

            const { error } = await supabase
                .from('profiles')
                .update({
                    membership_status: 'ACTIVE',
                    membership_purchase_date: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) throw error;

            toast.success('Welcome to the Campus Club! Membership activated.');
            // Refresh state
            setMembershipActive(true);
            window.location.reload();
        } catch (error) {
            console.error('Error purchasing membership:', error);
            toast.error('Failed to process purchase. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-mcd-cream">
            <LoadingSpinner text="Checking membership status..." />
        </div>;
    }

    const isMember = profile?.membership_status === 'ACTIVE';

    return (
        <div className="min-h-screen bg-mcd-cream pb-20">
            <header className="sticky top-0 z-50 bg-mcd-cream/80 backdrop-blur-md border-b border-mcd-border px-4 py-4 flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
                    <ChevronLeft className="h-6 w-6" />
                </Button>
                <h1 className="text-xl font-bold font-outfit">Campus Membership</h1>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
                {/* Status Card */}
                <Card className={`overflow-hidden border-2 ${isMember ? (membershipActive ? 'border-green-500 shadow-green-100' : 'border-amber-500 shadow-amber-100') : 'border-mcd-red shadow-mcd-red/10'} shadow-xl rounded-3xl`}>
                    <div className={`p-6 text-white ${isMember ? (membershipActive ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-amber-500 to-orange-600') : 'bg-gradient-to-br from-red-600 to-mcd-red'}`}>
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-white/80 text-sm font-medium uppercase tracking-wider">Your Status</p>
                                <h2 className="text-3xl font-black">
                                    {isMember ? (membershipActive ? 'ACTIVE MEMBER' : 'INACTIVE MEMBER') : 'GUEST USER'}
                                </h2>
                            </div>
                            <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl">
                                <Crown className={`h-8 w-8 ${isMember ? 'text-yellow-300 fill-yellow-300' : 'text-white'}`} />
                            </div>
                        </div>

                        {isMember && (
                            <div className="mt-6 flex items-center gap-2 bg-black/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                                {membershipActive ? (
                                    <>
                                        <CheckCircle2 className="h-5 w-5 text-white" />
                                        <p className="text-sm font-medium">Benefits active! Keep ordering every 3 days.</p>
                                    </>
                                ) : (
                                    <>
                                        <Clock className="h-5 w-5 text-white" />
                                        <p className="text-sm font-medium">Order ₹70+ to reactivate benefits.</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <CardContent className="p-6 bg-white">
                        {!isMember ? (
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <h3 className="font-bold text-xl text-foreground">Why join Campus Club?</h3>
                                    <div className="grid gap-4">
                                        <BenefitItem
                                            icon={<Percent className="text-mcd-red" />}
                                            title="Vendor Discounts"
                                            description="Get special discounts set by your favorite canteens on every preorder."
                                        />
                                        <BenefitItem
                                            icon={<Zap className="text-mcd-red" />}
                                            title="Priority Preorders"
                                            description="Exclusive access to member-only deals and faster processing."
                                        />
                                        <BenefitItem
                                            icon={<TrendingUp className="text-mcd-red" />}
                                            title="Save More"
                                            description="Regular members save an average of ₹500 monthly."
                                        />
                                    </div>
                                </div>

                                <div className="bg-mcd-cream rounded-2xl p-5 border border-mcd-border space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-muted-foreground text-sm">One-time membership</p>
                                            <p className="text-3xl font-black text-foreground">₹29</p>
                                        </div>
                                        <Badge className="bg-mcd-red hover:bg-mcd-red text-white py-1 px-3 rounded-full">Best Value</Badge>
                                    </div>
                                    <Button
                                        className="w-full h-14 rounded-2xl bg-mcd-red hover:bg-red-700 text-white font-bold text-lg shadow-lg shadow-mcd-red/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                        onClick={handlePurchase}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? 'Processing...' : 'Get Membership Now'}
                                    </Button>
                                    <p className="text-[10px] text-center text-muted-foreground flex items-center justify-center gap-1">
                                        <CreditCard className="h-3 w-3" /> Secure payment via Cashfree
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex items-center gap-4 p-4 rounded-2xl bg-mcd-cream border border-mcd-border">
                                    <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                                        <History className="h-6 w-6 text-mcd-red" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-muted-foreground font-medium">Last Qualifying Order</p>
                                        <p className="font-bold text-foreground">
                                            {lastOrderDate ? new Date(lastOrderDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'No recent qualifying orders'}
                                        </p>
                                    </div>
                                    {daysSinceLastOrder !== null && (
                                        <Badge variant={daysSinceLastOrder <= 3 ? "secondary" : "destructive"} className="rounded-full">
                                            {daysSinceLastOrder} days ago
                                        </Badge>
                                    )}
                                </div>

                                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-start gap-3">
                                    <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-blue-900">How to keep benefits active?</p>
                                        <p className="text-xs text-blue-700 leading-relaxed">
                                            Your member discounts are available as long as you place at least one order of ₹70 or more every 3 days.
                                            Preorder your next meal now to stay active!
                                        </p>
                                    </div>
                                </div>

                                <Button
                                    className="w-full h-14 rounded-2xl bg-foreground hover:bg-black text-white font-bold text-lg shadow-lg"
                                    onClick={() => navigate('/student/dashboard')}
                                >
                                    Order Now to Reactivate
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <section className="space-y-4">
                    <h3 className="font-bold text-lg px-2">Frequently Asked Questions</h3>
                    <div className="space-y-3">
                        <FaqItem
                            question="What is the 3-day rule?"
                            answer="To encourage local usage and keep the system fair for vendors, membership benefits stay active for 3 days after every order of ₹70 or more. Any order above ₹70 resets your 3-day 'active' window."
                        />
                        <FaqItem
                            question="Where can I see my discount?"
                            answer="Once logic checks that you are an active member, discounts set by vendors will automatically appear on the menu and checkout pages for preorders."
                        />
                        <FaqItem
                            question="Is it a subscription?"
                            answer="No, it's a one-time activation fee of ₹29. There are no monthly charges."
                        />
                    </div>
                </section>
            </main>
        </div>
    );
}

function BenefitItem({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <div className="flex gap-4 items-start group">
            <div className="h-10 w-10 rounded-xl bg-mcd-cream flex items-center justify-center shrink-0 border border-mcd-border group-hover:bg-mcd-yellow transition-colors duration-300">
                {icon}
            </div>
            <div>
                <h4 className="font-bold text-foreground text-sm">{title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
            </div>
        </div>
    );
}

function FaqItem({ question, answer }: { question: string, answer: string }) {
    return (
        <div className="bg-white rounded-2xl p-5 border border-mcd-border shadow-sm">
            <h4 className="font-bold text-foreground text-sm mb-2">{question}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed italic">"{answer}"</p>
        </div>
    );
}
