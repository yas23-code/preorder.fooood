import { useMembership } from '@/hooks/useMembership';
import { Crown, Check, ShoppingBag, Sparkles, Clock } from 'lucide-react';
import { useCollegeLocation } from '@/hooks/useCollegeLocation';

interface MembershipBannerProps {
    subtotal: number;
    membershipDiscount: number; // from vendor's canteen settings
    startTime?: string | null;  // HH:MM:SS or HH:MM — vendor-set time restriction
}

// Helper: format "HH:MM:SS" or "HH:MM" → "5:00 PM"
function formatTime(t: string | null | undefined) {
    if (!t) return '';
    const parts = t.split(':');
    if (parts.length < 2) return t;

    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);

    if (isNaN(h) || isNaN(m)) return t;

    const displayH = h % 12 || 12;
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${displayH}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// Helper: is current IST time before startTime?
function isTooEarly(startTime: string | null | undefined): boolean {
    if (!startTime) return false;
    const parts = startTime.split(':');
    if (parts.length < 2) return false;

    const now = new Date();
    const istOffset = 5.5 * 60;
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const istTime = new Date(utc + istOffset * 60000);
    const currentH = istTime.getHours();
    const currentM = istTime.getMinutes();

    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);

    if (isNaN(h) || isNaN(m)) return false;

    return currentH < h || (currentH === h && currentM < m);
}

export function MembershipBanner({ subtotal, membershipDiscount, startTime }: MembershipBannerProps) {
    const { isActive, isMembershipActive, isEligibleForDiscount, isLoading } = useMembership();
    const { enableCampusMembership } = useCollegeLocation();

    if (isLoading || !isActive || !enableCampusMembership) return null;

    const meetsMinimumOrder = subtotal >= 70;
    const tooEarly = !!startTime && isTooEarly(startTime);
    const canApplyDiscount = isEligibleForDiscount && meetsMinimumOrder && membershipDiscount > 0 && !tooEarly;

    // ✅ Eligible & discount active
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

    // ⏰ Member is eligible but it's too early (vendor time restriction)
    if (isEligibleForDiscount && meetsMinimumOrder && tooEarly && startTime) {
        return (
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-3 flex items-start gap-3">
                <div className="bg-purple-100 p-1.5 rounded-lg flex-shrink-0 mt-0.5">
                    <Clock className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                    <p className="text-sm font-medium text-purple-700">
                        Discount available after {formatTime(startTime)}
                    </p>
                    <p className="text-xs text-purple-600 mt-0.5">
                        Your ₹{membershipDiscount} member discount will be active after {formatTime(startTime)}.
                    </p>
                </div>
            </div>
        );
    }

    // 🛍 Member but no qualifying recent order
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

    // 📦 Member with activity but order below ₹70
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
                        {startTime ? ` (after ${formatTime(startTime)})` : ''}
                    </p>
                </div>
            </div>
        );
    }

    return null;
}
