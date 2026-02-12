import { X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OrderRejectionBannerProps {
  canteenName: string;
  rejectionReason?: string | null;
  onDismiss: () => void;
}

export function OrderRejectionBanner({ canteenName, rejectionReason, onDismiss }: OrderRejectionBannerProps) {
  return (
    <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-3 animate-in slide-in-from-top-5 duration-300">
      <div className="max-w-7xl mx-auto flex items-start gap-3">
        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-sm">Order Cancelled by {canteenName}</p>
          <p className="text-red-100 text-xs mt-1">
            We apologize for the inconvenience. Your order could not be fulfilled at this time.
            {rejectionReason && (
              <span className="block mt-1">Reason: {rejectionReason}</span>
            )}
          </p>
          <p className="text-red-200 text-xs mt-2">
            💰 Don't worry! Your payment will be refunded within 3-5 business days.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-red-400/30 h-8 w-8 flex-shrink-0"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
