import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMembership } from '@/hooks/useMembership';
import { Button } from '@/components/ui/button';
import { Crown, ArrowLeft, Sparkles, Zap, Shield, Clock, Check, ShoppingBag, Loader2, Star } from 'lucide-react';
import { toast } from 'sonner';

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
    const [isPurchasing, setIsPurchasing] = useState(false);

    const handlePurchase = async () => {
        setIsPurchasing(true);
        try {
            const success = await purchaseMembership();
            if (success) {
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
                toast.error('Failed to activate membership');
            }
        } finally {
            setIsPurchasing(false);
        }
    };

    const benefits = [
        {
            icon: Sparkles,
            title: '₹5 Flat Discount',
            description: 'Get ₹5 off on every preorder of ₹70 or more',
            color: 'text-amber-600',
            bgColor: 'bg-amber-100',
        },
        {
            icon: Zap,
            title: 'Instant Savings',
            description: 'Discount applied automatically at checkout',
            color: 'text-blue-600',
            bgColor: 'bg-blue-100',
        },
        {
            icon: Shield,
            title: 'Stay Active',
            description: 'Order ₹70+ every 3 days to keep discount active',
            color: 'text-green-600',
            bgColor: 'bg-green-100',
        },
        {
            icon: Star,
            title: 'One-Time Payment',
            description: 'Pay ₹29 once, enjoy forever',
            color: 'text-purple-600',
            bgColor: 'bg-purple-100',
        },
    ];

    return (
        <div className="min-h-screen bg-mcd-cream">
            {/* Header */}
            <div className="border-b border-mcd-border bg-mcd-cream sticky top-0 z-10 shadow-card">
                <div className="container mx-auto px-4 h-[72px] md:h-24 flex items-center gap-3 md:gap-4">
                    <Link
                        to="/student/dashboard"
                        className="flex items-center gap-1 md:gap-2 text-muted-foreground hover:text-mcd-red transition-colors text-sm md:text-base"
                    >
                        <ArrowLeft className="h-4 w-4 text-mcd-red" />
                        <span className="hidden sm:inline">Back</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 md:h-5 md:w-5 text-amber-500" />
                        <h1 className="text-lg md:text-xl font-bold">Campus Membership</h1>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-3 md:px-4 py-6 max-w-lg">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                    </div>
                ) : (
                    <>
                        {/* Status Card */}
                        {isActive && (
                            <div className={`relative overflow-hidden rounded-2xl p-5 shadow-lg mb-6 ${isEligibleForDiscount
                                    ? 'bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600'
                                    : 'bg-gradient-to-br from-gray-500 via-gray-600 to-gray-700'
                                }`}>
                                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20" />
                                <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/10 rounded-full translate-y-14 -translate-x-14" />

                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="bg-white/20 p-2 rounded-xl">
                                            <Crown className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="font-bold text-white text-lg">Campus Member</h2>
                                            <p className="text-white/70 text-xs">
                                                Since {membership?.membership_purchase_date
                                                    ? new Date(membership.membership_purchase_date).toLocaleDateString('en-IN', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric',
                                                    })
                                                    : 'N/A'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-white/15 rounded-xl p-3">
                                        {isEligibleForDiscount ? (
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Check className="h-5 w-5 text-green-200" />
                                                    <div>
                                                        <p className="text-white font-medium text-sm">Discount Active</p>
                                                        <p className="text-white/70 text-xs">₹5 off on preorders ≥₹70</p>
                                                    </div>
                                                </div>
                                                <div className="bg-white/20 px-3 py-1.5 rounded-lg">
                                                    <div className="flex items-center gap-1 text-white text-sm font-bold">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        <span>{daysRemaining}d</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <ShoppingBag className="h-5 w-5 text-white/80" />
                                                <div>
                                                    <p className="text-white font-medium text-sm">Discount Inactive</p>
                                                    <p className="text-white/70 text-xs">
                                                        Place an order of ₹70+ to reactivate your discount
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Benefits List */}
                        <div className="mb-6">
                            <h3 className="font-bold text-foreground text-base mb-3">Membership Benefits</h3>
                            <div className="space-y-3">
                                {benefits.map((benefit, index) => (
                                    <div
                                        key={index}
                                        className="bg-white rounded-xl border border-mcd-border p-4 flex items-start gap-3 shadow-sm hover:shadow-md transition-shadow"
                                    >
                                        <div className={`${benefit.bgColor} p-2 rounded-lg flex-shrink-0`}>
                                            <benefit.icon className={`h-5 w-5 ${benefit.color}`} />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground text-sm">{benefit.title}</p>
                                            <p className="text-muted-foreground text-xs mt-0.5">{benefit.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* How It Works */}
                        <div className="mb-6">
                            <h3 className="font-bold text-foreground text-base mb-3">How It Works</h3>
                            <div className="bg-white rounded-xl border border-mcd-border p-4 shadow-sm">
                                <ol className="space-y-3">
                                    <li className="flex items-start gap-3">
                                        <span className="bg-amber-100 text-amber-700 font-bold text-xs w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                                        <p className="text-sm text-muted-foreground">
                                            <span className="font-medium text-foreground">Purchase</span> — Pay ₹29 one-time to become a campus member
                                        </p>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="bg-amber-100 text-amber-700 font-bold text-xs w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                                        <p className="text-sm text-muted-foreground">
                                            <span className="font-medium text-foreground">Order</span> — Place a preorder of ₹70 or more to activate your discount
                                        </p>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="bg-amber-100 text-amber-700 font-bold text-xs w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                                        <p className="text-sm text-muted-foreground">
                                            <span className="font-medium text-foreground">Save</span> — Get ₹5 off automatically on every qualifying order
                                        </p>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="bg-amber-100 text-amber-700 font-bold text-xs w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                                        <p className="text-sm text-muted-foreground">
                                            <span className="font-medium text-foreground">Stay Active</span> — Order ₹70+ every 3 days to keep your discount alive
                                        </p>
                                    </li>
                                </ol>
                            </div>
                        </div>

                        {/* Purchase Button */}
                        {!isActive && (
                            <Button
                                onClick={handlePurchase}
                                disabled={isPurchasing}
                                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold h-12 rounded-xl text-base shadow-lg hover:shadow-xl transition-all"
                            >
                                {isPurchasing ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Activating...
                                    </>
                                ) : (
                                    <>
                                        <Crown className="mr-2 h-5 w-5" />
                                        Get Membership — ₹29
                                    </>
                                )}
                            </Button>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
