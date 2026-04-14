import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMembership } from '@/hooks/useMembership';
import { Button } from '@/components/ui/button';
import { Crown, ArrowLeft, Sparkles, Zap, Shield, Clock, Check, ShoppingBag, Loader2, Star, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useCollegeLocation } from '@/hooks/useCollegeLocation';

export default function Membership() {
    const {
        membership,
        isActive,
        isMembershipActive,
        isEligibleForDiscount,
        daysRemaining,
        isLoading,
        purchaseMembership,
    } = useMembership();
    const { enableCampusMembership } = useCollegeLocation();
    const [isPurchasing, setIsPurchasing] = useState(false);

    const handlePurchase = async (amount: number) => {
        setIsPurchasing(true);
        try {
            const result = await purchaseMembership(amount);
            if (result.success) {
                toast.custom(
                    (t) => (
                        <div
                            className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border border-yellow-400/30 animate-in slide-in-from-top-5 duration-300"
                            style={{
                                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            }}
                            onClick={() => toast.dismiss(t)}
                        >
                            <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                <Crown className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-white text-base">Welcome to Campus Membership! 🎉</p>
                                <p className="text-white/80 text-sm">Start ordering to activate your discounts</p>
                            </div>
                        </div>
                    ),
                    { duration: 5000 }
                );
            } else {
                toast.error(result.error || 'Failed to initialize payment. Please try again.');
            }
        } finally {
            setIsPurchasing(false);
        }
    };

    const benefits = [
        {
            icon: ShoppingBag,
            title: 'Free Packing',
            description: 'Save ₹7-₹15 on every order with free item packing',
            color: 'text-amber-600',
            bgColor: 'bg-amber-100',
        },
        {
            icon: Zap,
            title: 'Instant Savings',
            description: 'Packing charges removed automatically at checkout',
            color: 'text-blue-600',
            bgColor: 'bg-blue-100',
        },
        {
            icon: Clock,
            title: 'Flexible Plans',
            description: 'Choose between 3 or 5 free packing orders',
            color: 'text-purple-600',
            bgColor: 'bg-purple-100',
        },
    ];

    const plans = [
        {
            id: 'basic',
            name: 'Basic',
            price: 25,
            orders: 3,
            validity: '1 week',
            popular: false,
            color: 'border-mcd-border',
            bgColor: 'bg-white'
        },
        {
            id: 'pro',
            name: 'Pro',
            price: 35,
            orders: 5,
            validity: '1 week',
            popular: true,
            color: 'border-amber-400 shadow-amber-100',
            bgColor: 'bg-amber-50/30'
        }
    ];

    return (
        <div className="min-h-screen bg-mcd-cream">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-mcd-border shadow-sm">
                <div className="container mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            to="/student/dashboard"
                            className="p-2 hover:bg-mcd-selected rounded-full transition-colors group"
                        >
                            <ArrowLeft className="h-5 w-5 text-mcd-red group-hover:-translate-x-1 transition-transform" />
                        </Link>
                        <div className="flex items-center gap-2">
                            <div className="bg-amber-100 p-1.5 rounded-lg">
                                <Crown className="h-5 w-5 text-amber-500" />
                            </div>
                            <h1 className="text-lg font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                                Campus Membership 🎓
                            </h1>
                        </div>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-3 md:px-4 py-6 max-w-lg">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                    </div>
                ) : (
                    <div className="relative">
                        <div className="space-y-6">
                            {/* Plans Selection */}
                            <div className="grid grid-cols-1 gap-4">
                                {plans.map((plan) => (
                                    <div 
                                        key={plan.id}
                                        className={`relative overflow-hidden rounded-2xl border-2 p-5 transition-all ${plan.color} ${plan.bgColor}`}
                                    >
                                        {plan.popular && (
                                            <div className="absolute top-0 right-0 bg-amber-400 text-amber-950 text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                                                🔥 Most Popular
                                            </div>
                                        )}
                                        
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-xl font-black text-foreground">{plan.name} Membership</h3>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    ✔ Free packing on <span className="font-bold text-foreground">{plan.orders} orders</span>
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1 italic">
                                                    ✔ Valid for {plan.validity}
                                                </p>
                                                {plan.id === 'pro' && (
                                                    <p className="text-xs font-medium text-amber-600 mt-0.5">
                                                        ✔ Best value for regular buyers
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-black text-mcd-red">₹{plan.price}</div>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={() => handlePurchase(plan.price)}
                                            disabled={isPurchasing}
                                            variant={plan.popular ? 'gradient' : 'outline'}
                                            className="w-full h-11 rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
                                        >
                                            {isPurchasing ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                `Join ${plan.name} now`
                                            )}
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            {/* Benefits List */}
                            <div className="bg-white/50 rounded-2xl p-5 border border-mcd-border border-dashed">
                                <h3 className="font-bold text-foreground text-sm mb-4 uppercase tracking-widest text-center opacity-70">
                                    👉 Join now & save on every order
                                </h3>
                                <div className="space-y-4">
                                    {benefits.map((benefit, index) => (
                                        <div
                                            key={index}
                                            className="flex items-start gap-4"
                                        >
                                            <div className={`${benefit.bgColor} p-2.5 rounded-xl shadow-sm`}>
                                                <benefit.icon className={`h-5 w-5 ${benefit.color}`} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-foreground text-sm">{benefit.title}</p>
                                                <p className="text-muted-foreground text-xs mt-0.5">{benefit.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
