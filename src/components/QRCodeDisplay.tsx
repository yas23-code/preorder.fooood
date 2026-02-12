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
  // Don't show if not paid or no QR token
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

  // If QR has been used (order completed)
  if (qrUsed || orderStatus === 'completed') {
    return (
      <div className="bg-accent/10 border border-accent/30 rounded-xl p-6 text-center">
        <CheckCircle className="h-12 w-12 text-accent mx-auto mb-3" />
        <p className="text-lg font-semibold text-accent">Order Collected Successfully</p>
        <p className="text-sm text-accent/80 mt-1">Thank you for your order!</p>
      </div>
    );
  }

  // Get status message
  const getStatusMessage = () => {
    switch (orderStatus) {
      case 'pending':
      case 'accepted':
        return {
          icon: <Clock className="h-5 w-5 text-primary" />,
          text: 'Order is being prepared',
          subtext: 'Please wait for your order to be ready',
          bgClass: 'bg-primary/10 border-primary/30',
          textClass: 'text-primary'
        };
      case 'ready':
        return {
          icon: <Package className="h-5 w-5 text-accent" />,
          text: 'Order ready! Show this QR to the vendor',
          subtext: 'Scan to collect your order',
          bgClass: 'bg-accent/10 border-accent/30',
          textClass: 'text-accent'
        };
      default:
        return {
          icon: <Clock className="h-5 w-5 text-muted-foreground" />,
          text: 'Processing order...',
          subtext: '',
          bgClass: 'bg-muted/50 border-muted',
          textClass: 'text-muted-foreground'
        };
    }
  };

  const status = getStatusMessage();

  return (
    <div className={`rounded-xl p-4 text-center border ${status.bgClass}`}>
      {/* Status Message */}
      <div className="flex items-center justify-center gap-2 mb-3">
        {status.icon}
        <span className={`text-sm font-medium ${status.textClass}`}>
          {status.text}
        </span>
      </div>

      {/* QR Code */}
      <div className={`bg-white rounded-lg p-4 inline-block shadow-sm ${
        orderStatus === 'ready' ? 'ring-2 ring-accent ring-offset-2' : ''
      }`}>
        <QRCodeSVG
          value={qrToken}
          size={size}
          level="H"
          includeMargin={false}
          bgColor="#ffffff"
          fgColor="#000000"
        />
      </div>

      {/* Subtext */}
      {status.subtext && (
        <p className={`text-xs mt-3 ${status.textClass}`}>
          {status.subtext}
        </p>
      )}

      {/* Ready state pulsing indicator */}
      {orderStatus === 'ready' && (
        <div className="mt-3 flex items-center justify-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
          </span>
          <span className="text-sm font-semibold text-accent">Ready for pickup!</span>
        </div>
      )}
    </div>
  );
}
