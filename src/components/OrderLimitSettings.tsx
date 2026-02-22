import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface OrderLimitSettingsProps {
  canteenId: string;
  currentLimit: number | null;
  activeOrderCount: number;
  onUpdate: (limit: number | null) => void;
}

export function OrderLimitSettings({
  canteenId,
  currentLimit,
  activeOrderCount,
  onUpdate,
}: OrderLimitSettingsProps) {
  const [limit, setLimit] = useState<string>(currentLimit?.toString() || '50');
  const [isSaving, setIsSaving] = useState(false);

  const isAtLimit = currentLimit !== null && activeOrderCount >= currentLimit;
  const percentFilled = currentLimit ? Math.min((activeOrderCount / currentLimit) * 100, 100) : 0;

  const handleSave = async () => {
    setIsSaving(true);
    const newLimit = limit ? parseInt(limit, 10) : null;
    
    const { error } = await supabase
      .from('canteens')
      .update({ order_limit: newLimit })
      .eq('id', canteenId);
    
    if (error) {
      toast.error('Failed to update order limit');
    } else {
      onUpdate(newLimit);
      toast.success('Order limit updated!');
    }
    setIsSaving(false);
  };

  return (
    <div className="bg-white rounded-xl border border-mcd-border p-4 md:p-6 shadow-card">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-mcd-selected p-2 rounded-lg">
          <Settings className="h-5 w-5 text-mcd-red" />
        </div>
        <div>
          <h2 className="text-lg font-bold font-poppins text-mcd-text">Order Limit</h2>
          <p className="text-xs text-mcd-text/70">Control how many active orders you can handle</p>
        </div>
      </div>

      {/* Active Orders Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-mcd-text">
            Active Orders: <span className="font-bold">{activeOrderCount}</span>
            {currentLimit && <span className="text-mcd-text/70"> / {currentLimit}</span>}
          </span>
          {isAtLimit && (
            <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
              <AlertTriangle className="h-3 w-3" />
              Limit Reached
            </span>
          )}
        </div>
        <div className="h-2 bg-mcd-selected rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              percentFilled >= 100 ? 'bg-mcd-red' : 
              percentFilled >= 80 ? 'bg-amber-500' : 'bg-green-500'
            }`}
            style={{ width: `${percentFilled}%` }}
          />
        </div>
      </div>

      {/* Settings */}
      <div>
        <label className="text-sm font-medium text-mcd-text mb-1.5 block">
          Maximum Active Orders
        </label>
        <div className="flex gap-2">
          <Input
            type="number"
            min="1"
            max="999"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            placeholder="e.g., 50"
            className="flex-1 bg-mcd-selected border-mcd-border"
          />
          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-mcd-yellow hover:bg-mcd-yellow/90 text-mcd-text font-bold px-6"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
        <p className="text-xs text-mcd-text/50 mt-2">
          Orders will automatically pause when limit is reached
        </p>
      </div>
    </div>
  );
}
