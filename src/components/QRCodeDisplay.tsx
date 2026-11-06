import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle, Clock, Package } from 'lucide-react';

interface QRCodeDisplayProps {
  qrToken: string | null;
  orderStatus: string;
  paymentStatus: string;
  qrUsed?: boolean;
  size?: number;
}

export function QRCodeDisplay({ 
  qrToken, 
  orderStatus, 
  paymentStatus, 
  qrUsed = false,
  size = 180 
}: QRCodeDisplayProps) {
  // 1. If QR has been used or order is completed
  if (qrUsed || orderStatus === 'completed') {
    return (
      <div className="bg-accent/10 border border-accent/30 rounded-xl p-6 text-center">
        <CheckCircle className="h-12 w-12 text-accent mx-auto mb-3" />
        <p className="text-lg font-semibold text-accent">Order Collected Successfully</p>
        <p className="text-sm text-accent/80 mt-1">Thank you for your order!</p>
      </div>
    );
  }

  // 2. If unpaid or no token yet
  if (paymentStatus !== 'paid' || !qrToken) {
    return (
      <div className="bg-muted/50 rounded-xl p-6 text-center">
        <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          QR code will appear after payment is confirmed
        </p>
      </div>
    );
  }

  // 3. Awaiting vendor confirmation (pending or confirmed)
  if (orderStatus === 'pending' || orderStatus === 'confirmed') {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 text-center">
        <Clock className="h-8 w-8 text-amber-500 mx-auto mb-2" />
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
          Awaiting vendor confirmation
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Pickup PIN & QR code will appear once food is marked ready
        </p>
      </div>
    );
  }

  // 4. Vendor accepted and food is being prepared
  if (orderStatus === 'accepted' || orderStatus === 'preparing' || orderStatus === 'in_progress') {
    return (
      <div className="bg-primary/10 border border-primary/30 rounded-xl p-5 text-center">
        <Clock className="h-8 w-8 text-primary mx-auto mb-2 animate-pulse" />
        <p className="text-sm font-semibold text-primary">
          Food is being prepared!
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Pickup PIN & QR code will appear as soon as the vendor marks it ready
        </p>
      </div>
    );
  }

  // 5. Vendor marked food as ready -> Show the QR code!
  if (orderStatus === 'ready') {
    return (
      <div className="rounded-xl p-4 text-center border bg-accent/10 border-accent/30">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Package className="h-5 w-5 text-accent" />
          <span className="text-sm font-medium text-accent">
            Order ready! Show this QR to the vendor
          </span>
        </div>

        <div className="bg-white rounded-lg p-4 inline-block shadow-sm ring-2 ring-accent ring-offset-2">
          <QRCodeSVG
            value={qrToken}
            size={size}
            level="H"
            includeMargin={false}
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>

        <p className="text-xs mt-3 text-accent">
          Scan to collect your order
        </p>

        <div className="mt-3 flex items-center justify-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
          </span>
          <span className="text-sm font-semibold text-accent">Ready for pickup!</span>
        </div>
      </div>
    );
  }

  // Fallback for cancelled or other states
  return (
    <div className="bg-muted/50 rounded-xl p-5 text-center">
      <Clock className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">Order status: {orderStatus}</p>
    </div>
  );
}
