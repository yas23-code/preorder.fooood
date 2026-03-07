import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Crown, Save, Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface MembershipDiscountSettingsProps {
    canteenId: string;
    currentDiscount: number;
    onUpdate: (discount: number, startTime: string | null) => void;
}

export function MembershipDiscountSettings({ canteenId, currentDiscount, onUpdate }: MembershipDiscountSettingsProps) {
    const [discount, setDiscount] = useState(currentDiscount.toString());
    const [startTime, setStartTime] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch existing settings on mount
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data } = await supabase
                    .from('canteens')
                    .select('membership_discount, membership_discount_start_time')
                    .eq('id', canteenId)
                    .maybeSingle();
                if (data) {
                    if (data.membership_discount !== null && data.membership_discount !== undefined) {
                        setDiscount(data.membership_discount.toString());
                    }
                    if (data.membership_discount_start_time) {
                        // Stored as HH:MM:SS – slice to HH:MM for the time input
                        setStartTime(data.membership_discount_start_time.substring(0, 5));
                    }
                }
            } catch (error) {
                console.error('Error fetching membership discount settings:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, [canteenId]);

    const handleSave = async () => {
        const discountValue = parseFloat(discount);
        if (isNaN(discountValue) || discountValue < 0) {
            toast.error('Please enter a valid discount amount');
            return;
        }

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('canteens')
                .update({
                    membership_discount: discountValue,
                    membership_discount_start_time: startTime ? (`${startTime}:00` as any) : null,
                })
                .eq('id', canteenId);

            if (error) throw error;

            onUpdate(discountValue, startTime || null);

            const timeLabel = startTime
                ? (() => {
                    const [h, m] = startTime.split(':').map(Number);
                    const displayH = h % 12 || 12;
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    return ` (active after ${displayH}:${m.toString().padStart(2, '0')} ${ampm})`;
                })()
                : '';
            toast.success(`Membership discount set to ₹${discountValue}${timeLabel}`);
        } catch (error) {
            console.error('Error updating membership discount:', error);
            toast.error('Failed to update discount settings');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-mcd-border p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <div className="bg-amber-100 p-1.5 rounded-lg">
                    <Crown className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                    <h3 className="font-semibold text-sm text-foreground">Member Discount</h3>
                    <p className="text-xs text-muted-foreground">Set discount & time window for campus members</p>
                </div>
            </div>

            <div className="flex flex-col gap-3">
                {/* Discount Amount */}
                <div>
                    <Label htmlFor="membership-discount" className="text-xs text-muted-foreground">
                        Flat discount amount (₹)
                    </Label>
                    <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-sm text-muted-foreground">₹</span>
                        <Input
                            id="membership-discount"
                            type="number"
                            min="0"
                            max="50"
                            step="1"
                            value={discount}
                            onChange={(e) => setDiscount(e.target.value)}
                            className="border-mcd-border h-9 text-sm"
                            placeholder="5"
                            disabled={isLoading}
                        />
                    </div>
                </div>

                {/* Start Time */}
                <div>
                    <Label htmlFor="discount-start-time" className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Discount applicable after (leave empty for always)
                    </Label>
                    <Input
                        id="discount-start-time"
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="border-mcd-border h-9 text-sm mt-1"
                        disabled={isLoading}
                    />
                    {startTime && (
                        <p className="text-[10px] text-amber-600 mt-1">
                            ⏰ Discount will only apply to orders placed after{' '}
                            {(() => {
                                const [h, m] = startTime.split(':').map(Number);
                                const displayH = h % 12 || 12;
                                const ampm = h >= 12 ? 'PM' : 'AM';
                                return `${displayH}:${m.toString().padStart(2, '0')} ${ampm}`;
                            })()}
                        </p>
                    )}
                </div>

                {/* Save Button */}
                <Button
                    onClick={handleSave}
                    disabled={isSaving || isLoading}
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-600 text-white h-9 px-4 w-full"
                >
                    {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <>
                            <Save className="h-3.5 w-3.5 mr-1.5" />
                            Save Discount Settings
                        </>
                    )}
                </Button>
            </div>

            <p className="text-[10px] text-muted-foreground mt-3">
                Applied on preorders ≥₹70 from active campus members only
            </p>
        </div>
    );
}
