import { useMembership } from '@/hooks/useMembership';
import { Crown, Check, ShoppingBag, Sparkles } from 'lucide-react';

interface MembershipBannerProps {
    subtotal: number;
    membershipDiscount: number; // from vendor's canteen settings
}

export function MembershipBanner({ subtotal, membershipDiscount }: MembershipBannerProps) {
    const { isActive, isMembershipActive, isEligibleForDiscount, isLoading } = useMembership();

    if (isLoading || !isActive) return null;

    const meetsMinimumOrder = subtotal >= 70;
    const canApplyDiscount = isEligibleForDiscount && meetsMinimumOrder && membershipDiscount > 0;

    // Eligible for discount - show success banner
    if (canApplyDiscount) {
        return (
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-3">
                <div className="bg-emerald-100 p-1.5 rounded-lg flex-shrink-0">
                    <Crown className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                        <p className="text-sm font-medium text-emerald-700">
                            Member Discount Applied
                        </p>
                    </div>
                    <p className="text-xs text-emerald-600 mt-0.5">
                        You save ₹{membershipDiscount} on this order!
                    </p>
                </div>
                <div className="flex items-center gap-1 bg-emerald-100 px-2 py-1 rounded-md">
                    <Sparkles className="h-3 w-3 text-emerald-600" />
                    <span className="text-sm font-bold text-emerald-700">-₹{membershipDiscount}</span>
                </div>
            </div>
        );
    }

    // Is a member but doesn't meet conditions - show info banner
    if (isActive && !isMembershipActive) {
        return (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
                <div className="bg-amber-100 p-1.5 rounded-lg flex-shrink-0 mt-0.5">
                    <Crown className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                    <p className="text-sm font-medium text-amber-700">
                        Member Discount Inactive
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                        <ShoppingBag className="h-3 w-3 flex-shrink-0" />
                        Order ₹70+ to unlock your ₹{membershipDiscount} member discount
                    </p>
                </div>
            </div>
        );
    }

    // Is a member with activity but order is below ₹70
    if (isActive && isMembershipActive && !meetsMinimumOrder) {
        return (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 flex items-start gap-3">
                <div className="bg-blue-100 p-1.5 rounded-lg flex-shrink-0 mt-0.5">
                    <Crown className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                    <p className="text-sm font-medium text-blue-700">
                        Almost there!
                    </p>
                    <p className="text-xs text-blue-600 mt-0.5">
                        Add ₹{(70 - subtotal).toFixed(0)} more to get ₹{membershipDiscount} member discount
                    </p>
                </div>
            </div>
        );
    }

    return null;
}
