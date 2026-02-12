import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useCart } from '@/context/CartContext';
import { QRCodeSVG } from 'qrcode.react';

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [canteenId, setCanteenId] = useState<string | null>(null);
  const [estimatedReadyTime, setEstimatedReadyTime] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [orderNo, setOrderNo] = useState<number | null>(null);

  const orderId = searchParams.get('order_id');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!orderId) {
        setStatus('failed');
        return;
      }

      try {
        // Call the verify payment edge function
        const { data, error } = await supabase.functions.invoke('verify-cashfree-payment', {
          body: { orderId },
        });

        if (error) {
          console.error('Verification error:', error);
          setStatus('failed');
          toast.error('Payment verification failed');
          return;
        }

        if (data.success) {
          // Get the order details including QR token and status
          const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .select('qr_token, canteen_id, estimated_ready_time, status, order_no')
            .eq('id', orderId)
            .single();

          if (orderError) {
            console.error('Error fetching order:', orderError);
            setStatus('failed');
            return;
          }

          setQrToken(orderData.qr_token);
          setCanteenId(orderData.canteen_id);
          setEstimatedReadyTime(orderData.estimated_ready_time);
          setOrderStatus(orderData.status);
          setOrderNo(orderData.order_no);
          setStatus('success');
          
          // Clear the cart for this canteen
          if (orderData.canteen_id) {
            clearCart(orderData.canteen_id);
          }
          
          toast.success('Payment successful!');
        } else {
          setStatus('failed');
          toast.error('Payment was not completed');
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        setStatus('failed');
        toast.error('Failed to verify payment');
      }
    };

    verifyPayment();
  }, [orderId, clearCart]);

  const handleViewOrders = () => {
    navigate('/student/orders');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground">Verifying payment...</h2>
          <p className="text-muted-foreground mt-2">Please wait while we confirm your payment</p>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Payment Failed</h2>
          <p className="text-muted-foreground mb-6">
            Your payment could not be completed. Please try again.
          </p>
          <div className="space-y-3">
            <Button asChild variant="default" className="w-full">
              <Link to="/student/carts">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Cart
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/student/dashboard">Browse Canteens</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Payment Successful!</h2>
        <p className="text-muted-foreground mb-4">
          Your order has been placed successfully.
        </p>

        {/* Order Number Badge */}
        {orderNo && (
          <div className="bg-primary/10 text-primary px-4 py-2 rounded-xl inline-flex items-center gap-2 mb-4">
            <span className="text-sm font-medium">ORDER</span>
            <span className="text-2xl font-bold">#{orderNo}</span>
          </div>
        )}
        
        {/* QR Code Display */}
        {qrToken && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-4">
            <p className="text-sm text-muted-foreground mb-3">Show this QR code to collect your order</p>
            <div className="bg-white rounded-lg p-4 inline-block shadow-sm">
              <QRCodeSVG
                value={qrToken}
                size={180}
                level="H"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Vendor will scan this when your order is ready
            </p>
          </div>
        )}

        {/* Only show ETA if order is accepted by vendor */}
        {orderStatus === 'accepted' && estimatedReadyTime ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-700 font-medium">Estimated Ready Time</p>
                <p className="text-lg font-bold text-amber-800">
                  {new Date(estimatedReadyTime).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                    timeZone: 'Asia/Kolkata'
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-amber-700 font-medium">Approx Wait</p>
                <p className="text-lg font-bold text-amber-800">
                  {(() => {
                    const waitMins = Math.max(0, Math.round((new Date(estimatedReadyTime).getTime() - Date.now()) / 60000));
                    return waitMins > 0 ? `~${waitMins} min` : 'Any moment';
                  })()}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="text-center">
              <p className="text-xs text-amber-700 font-medium mb-1">Order Status</p>
              <p className="text-lg font-bold text-amber-800">⏳ Awaiting vendor confirmation</p>
              <p className="text-xs text-amber-600 mt-1">You'll be notified when accepted</p>
            </div>
          </div>
        )}

        <Button onClick={handleViewOrders} variant="default" className="w-full">
          View My Orders
        </Button>
      </div>
    </div>
  );
}
