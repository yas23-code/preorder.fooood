import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface BanModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  targetType: 'student' | 'canteen';
  targetName: string;
  onBanComplete: () => void;
}

export function BanModal({ isOpen, onClose, targetId, targetType, targetName, onBanComplete }: BanModalProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [banType, setBanType] = useState<'temporary' | 'permanent'>('temporary');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for the ban');
      return;
    }

    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    setIsSubmitting(true);

    try {
      const expiresAt = banType === 'temporary' 
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { error } = await supabase
        .from('bans')
        .insert({
          target_id: targetId,
          target_type: targetType,
          reason: reason.trim(),
          ban_type: banType,
          expires_at: expiresAt,
          banned_by: user.id,
        });

      if (error) throw error;

      toast.success(`${targetType === 'student' ? 'Student' : 'Canteen'} has been banned`);
      onBanComplete();
      onClose();
      setReason('');
      setBanType('temporary');
      setExpiresInDays(7);
    } catch (error) {
      console.error('Error banning:', error);
      toast.error('Failed to ban. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-destructive">Ban {targetType === 'student' ? 'Student' : 'Canteen'}</DialogTitle>
          <DialogDescription>
            You are about to ban <strong>{targetName}</strong>. This will prevent them from {targetType === 'student' ? 'placing orders' : 'accepting orders'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for ban *</Label>
            <Textarea
              id="reason"
              placeholder="Enter the reason for this ban..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Ban Type</Label>
            <RadioGroup value={banType} onValueChange={(v) => setBanType(v as 'temporary' | 'permanent')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="temporary" id="temporary" />
                <Label htmlFor="temporary" className="font-normal">Temporary</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="permanent" id="permanent" />
                <Label htmlFor="permanent" className="font-normal">Permanent</Label>
              </div>
            </RadioGroup>
          </div>

          {banType === 'temporary' && (
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (days)</Label>
              <Input
                id="duration"
                type="number"
                min={1}
                max={365}
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 7)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Ban {targetType === 'student' ? 'Student' : 'Canteen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
