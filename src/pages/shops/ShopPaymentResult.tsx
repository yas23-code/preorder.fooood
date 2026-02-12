import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useShopCart } from '@/context/ShopCartContext';
import { useActiveShopOrderTimer } from '@/hooks/useActiveShopOrderTimer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { CheckCircle, XCircle, AlertTriangle, Copy, Store } from 'lucide-react';
import { toast } from 'sonner';

export default function ShopPaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart } = useShopCart();
  const { setActiveShopOrder } = useActiveShopOrderTimer();
  
  const orderId = searchParams.get('order_id');
  
  const [verifying, setVerifying] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'failed' | 'pending'>('pending');
  const [pickupCode, setPickupCode] = useState<string | null>(null);
  const [shopId, setShopId] = useState<string | null>(null);
  const [shopName, setShopName] = useState<string | null>(null);
  const [orderNo, setOrderNo] = useState<number | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      if (!orderId) {
        setPaymentStatus('failed');
        setVerifying(false);
        return;
      }

      try {
        // First get the shop info for clearing cart and setting active order
        const { data: orderData } = await supabase
          .from('shop_orders')
          .select('shop_id, estimated_ready_time, pickup_code, order_no, shops(shop_name)')
          .eq('id', orderId)
          .single();

        if (orderData) {
          setShopId(orderData.shop_id);
          setShopName((orderData.shops as any)?.shop_name || null);
          setOrderNo(orderData.order_no);
        }

        // Verify payment with Cashfree
        const { data, error } = await supabase.functions.invoke('verify-shop-cashfree-payment', {
          body: { orderId },
        });

        if (error) {
          console.error('Payment verification error:', error);
          setPaymentStatus('failed');
          return;
        }

        console.log('Shop payment verification result:', data);

        if (data.success) {
          setPaymentStatus('success');
          setPickupCode(data.pickupCode);
          
          // Set active shop order for tracking on dashboard
          if (orderData?.shop_id && orderId) {
            setActiveShopOrder({
              orderId: orderId,
              shopId: orderData.shop_id,
              shopName: (orderData.shops as any)?.shop_name || 'Shop',
              pickupCode: data.pickupCode || orderData.pickup_code || '',
              estimatedReadyTime: orderData.estimated_ready_time || new Date(Date.now() + 10 * 60000).toISOString(),
            });
          }
          
          // Clear the cart for this shop
          if (orderData?.shop_id) {
            clearCart(orderData.shop_id);
          }
          
          toast.success('Payment successful! Your order has been placed.');
        } else {
          setPaymentStatus('failed');
          toast.error('Payment verification failed');
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        setPaymentStatus('failed');
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [orderId, clearCart, setActiveShopOrder]);

  const copyPickupCode = () => {
    if (pickupCode) {
      navigator.clipboard.writeText(pickupCode);
      toast.success('Pickup code copied!');
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <LoadingSpinner />
          <p className="text-muted-foreground">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-md mx-auto px-4 py-8">
        <Card>
          <CardHeader className="text-center pb-2">
            {paymentStatus === 'success' ? (
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
            ) : paymentStatus === 'failed' ? (
              <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
            ) : (
              <div className="mx-auto w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
                <AlertTriangle className="w-10 h-10 text-yellow-600" />
              </div>
            )}
            <CardTitle className="text-xl">
              {paymentStatus === 'success' 
                ? 'Payment Successful!' 
                : paymentStatus === 'failed'
                ? 'Payment Failed'
                : 'Payment Pending'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            {paymentStatus === 'success' && pickupCode && (
              <>
                {shopName && (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Store className="w-4 h-4" />
                    <span>{shopName}</span>
                  </div>
                )}
                
                {/* Order Number - Prominent Display */}
                {orderNo && (
                  <div className="bg-accent/20 border-2 border-accent rounded-xl p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Order No</p>
                    <p className="text-4xl font-bold text-accent">#{orderNo}</p>
                  </div>
                )}
                
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-6">
                  <p className="text-sm text-muted-foreground mb-2">Your Pickup Code</p>
                  <p className="text-5xl font-bold text-primary tracking-[0.3em]">
                    {pickupCode}
                  </p>
                  <p className="text-sm text-muted-foreground mt-3">
                    Show this code to the shop vendor when picking up your order
                  </p>
                </div>
                <Button 
                  onClick={() => navigate('/student/dashboard', { state: { orderSuccess: true } })}
                  className="w-full"
                  size="lg"
                >
                  Got it!
                </Button>
              </>
            )}

            {paymentStatus === 'failed' && (
              <p className="text-muted-foreground">
                Your payment could not be processed. Please try again or contact support.
              </p>
            )}

            {paymentStatus === 'failed' && (
              <div className="flex flex-col gap-3">
                <Button 
                  onClick={() => navigate('/shops/orders')}
                  className="w-full"
                >
                  View My Orders
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/shops')}
                  className="w-full"
                >
                  Browse More Shops
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
