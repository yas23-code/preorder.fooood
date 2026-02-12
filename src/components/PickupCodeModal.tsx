import { CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface PickupCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  pickupCode: string;
}

export function PickupCodeModal({ isOpen, onClose, pickupCode }: PickupCodeModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <div className="mx-auto h-16 w-16 bg-accent/20 rounded-full flex items-center justify-center mb-4 animate-scale-in">
            <CheckCircle className="h-8 w-8 text-accent" />
          </div>
          <DialogTitle className="text-2xl">Order Placed!</DialogTitle>
          <DialogDescription>
            Show this code when picking up your order
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-6">
          <div className="bg-gradient-hero rounded-2xl p-6">
            <p className="text-sm text-muted-foreground mb-2">Your Pickup Code</p>
            <p className="text-5xl font-bold text-accent tracking-[0.3em] animate-pulse-warm">
              {pickupCode}
            </p>
          </div>
        </div>
        
        <Button variant="gradient" size="lg" onClick={onClose} className="w-full">
          Got it!
        </Button>
      </DialogContent>
    </Dialog>
  );
}
