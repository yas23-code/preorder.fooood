import { useState } from 'react';
import { useMembership } from '@/hooks/useMembership';
import { Button } from '@/components/ui/button';
import { Crown, Sparkles, Clock, ShoppingBag, Loader2, Check, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export function MembershipCard() {
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
    const navigate = useNavigate();

    const handlePurchase = async () => {
        setIsPurchasing(true);
        try {
            const result = await purchaseMembership();
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
                                <p className="font-bold text-white text-base">Membership Activated! 🎉</p>
                                <p className="text-white/80 text-sm">You're now a campus member</p>
                            </div>
                        </div>
                    ),
                    { duration: 4000 }
                );
            } else {
                toast.error(result.error || 'Failed to initialize payment. Please try again.');
            }
        } finally {
            setIsPurchasing(false);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-sm animate-pulse">
                <div className="h-20 bg-gray-200 rounded-lg" />
            </div>
        );
    }

    // Not a member yet - show purchase CTA
    if (!membership || !isActive) {
        return (
            <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 rounded-xl p-4 shadow-lg">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12" />

                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-white/20 p-1.5 rounded-lg">
                            <Crown className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-base">Campus Membership</h3>
                            <p className="text-white/80 text-xs">Unlock exclusive discounts</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mt-3">
                        <div className="flex-1">
                            <div className="flex items-center gap-1.5 text-white/90 text-xs mb-1">
                                <Sparkles className="h-3.5 w-3.5" />
                                <span>₹5 flat discount on preorders ≥₹70</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-white/90 text-xs">
                                <Zap className="h-3.5 w-3.5" />
                                <span>One-time payment of just ₹29</span>
                            </div>
                        </div>
                        <Button
                            onClick={handlePurchase}
                            disabled={isPurchasing}
                            className="bg-white text-orange-600 hover:bg-white/90 font-bold px-4 py-2 rounded-lg text-sm shadow-md hover:shadow-lg transition-all"
                        >
                            {isPurchasing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>₹29</>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Active member - show status
    return (
        <div className={`relative overflow-hidden rounded-xl p-4 shadow-lg transition-all ${isEligibleForDiscount
            ? 'bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600'
            : 'bg-gradient-to-br from-gray-500 via-gray-600 to-gray-700'
            }`}>
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-10 translate-x-10" />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className="bg-white/20 p-1.5 rounded-lg">
                            <Crown className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-sm">Campus Member</h3>
                            {isEligibleForDiscount ? (
                                <div className="flex items-center gap-1">
                                    <Check className="h-3 w-3 text-green-200" />
                                    <span className="text-green-200 text-xs font-medium">Discount Active</span>
                                </div>
                            ) : (
                                <span className="text-white/70 text-xs">Discount Inactive</span>
                            )}
                        </div>
                    </div>

                    {isEligibleForDiscount && daysRemaining > 0 ? (
                        <div className="bg-white/20 px-2.5 py-1 rounded-lg">
                            <div className="flex items-center gap-1 text-white text-xs font-medium">
                                <Clock className="h-3 w-3" />
                                <span>{daysRemaining}d left</span>
                            </div>
                        </div>
                    ) : null}
                </div>

                {!isMembershipActive && (
                    <div className="mt-2 bg-white/15 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                            <ShoppingBag className="h-4 w-4 text-white/80 flex-shrink-0" />
                            <p className="text-white/90 text-xs">
                                Order ₹70+ to unlock your member discount
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
