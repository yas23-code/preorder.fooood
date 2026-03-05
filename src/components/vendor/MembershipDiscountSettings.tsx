import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Crown, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface MembershipDiscountSettingsProps {
    canteenId: string;
    currentDiscount: number;
    onUpdate: (discount: number) => void;
}

export function MembershipDiscountSettings({ canteenId, currentDiscount, onUpdate }: MembershipDiscountSettingsProps) {
    const [discount, setDiscount] = useState(currentDiscount.toString());
    const [isSaving, setIsSaving] = useState(false);

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
                .update({ membership_discount: discountValue } as any)
                .eq('id', canteenId);

            if (error) throw error;

            onUpdate(discountValue);
            toast.success(`Membership discount set to ₹${discountValue}`);
        } catch (error) {
            console.error('Error updating membership discount:', error);
            toast.error('Failed to update discount');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-mcd-border p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
                <div className="bg-amber-100 p-1.5 rounded-lg">
                    <Crown className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                    <h3 className="font-semibold text-sm text-foreground">Member Discount</h3>
                    <p className="text-xs text-muted-foreground">Set discount for campus members</p>
                </div>
            </div>

            <div className="flex items-end gap-2">
                <div className="flex-1">
                    <Label htmlFor="membership-discount" className="text-xs text-muted-foreground">
                        Flat discount (₹)
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
                        />
                    </div>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-600 text-white h-9 px-3"
                >
                    {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <>
                            <Save className="h-3.5 w-3.5 mr-1" />
                            Save
                        </>
                    )}
                </Button>
            </div>

            <p className="text-[10px] text-muted-foreground mt-2">
                Applied on preorders ≥₹70 from active members only
            </p>
        </div>
    );
}
