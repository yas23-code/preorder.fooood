import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useShopCart } from '@/context/ShopCartContext';
import { supabase } from '@/integrations/supabase/client';
import { calculateFees } from '@/lib/fees';
import { FeeBreakdownCard } from '@/components/FeeBreakdownCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Minus, 
  Plus, 
  Trash2, 
  ShoppingCart,
  Loader2,
  Store,
  CreditCard,
  Clock
} from 'lucide-react';

declare global {
  interface Window {
    Cashfree: (config: { mode: string }) => {
      checkout: (options: {
        paymentSessionId: string;
        redirectTarget: string;
      }) => Promise<{ error?: { message: string }; paymentDetails?: unknown }>;
    };
  }
}

// Get peak hour multiplier (IST timezone)
const getPeakMultiplier = (): number => {
  const now = new Date();
  const istOffset = 5.5 * 60; // IST is UTC+5:30
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istTime = new Date(utc + (istOffset * 60000));
  const hour = istTime.getHours();
  
  if (hour >= 11 && hour < 14) return 1.3;
  if (hour >= 17 && hour < 19) return 1.2;
  return 1.0;
};

export default function ShopCart() {
  const { shopId } = useParams<{ shopId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { carts, updateQuantity, removeItem, getCartTotal } = useShopCart();

  const [customerName, setCustomerName] = useState(profile?.name || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [pendingOrderCount, setPendingOrderCount] = useState(0);
  const [menuItemPrepTimes, setMenuItemPrepTimes] = useState<Record<string, number>>({});

  const cart = shopId ? carts[shopId] : null;
  const orderAmount = shopId ? getCartTotal(shopId) : 0;
  const fees = calculateFees(orderAmount);
  const total = fees.totalPayable;

  // Fetch pending order count and menu item prep times for ETA calculation
  useEffect(() => {
    const fetchEtaData = async () => {
      if (!shopId || !cart) return;
      
      try {
        // Fetch pending orders count
        const { count } = await supabase
          .from('shop_orders')
          .select('*', { count: 'exact', head: true })
          .eq('shop_id', shopId)
          .in('status', ['pending', 'confirmed', 'preparing']);
        
        setPendingOrderCount(count || 0);

        // Fetch prep times for cart items
        const itemIds = cart.items.map(item => item.menuItemId);
        const { data: menuItems } = await supabase
          .from('shop_menu_items')
          .select('id, prep_time')
          .in('id', itemIds);

        if (menuItems) {
          const prepTimes: Record<string, number> = {};
          menuItems.forEach(item => {
            prepTimes[item.id] = item.prep_time || 10;
          });
          setMenuItemPrepTimes(prepTimes);
        }
      } catch (error) {
        console.error('Error fetching ETA data:', error);
      }
    };

    fetchEtaData();
  }, [shopId, cart]);

  // Calculate estimated time
  const estimatedTime = useMemo(() => {
    if (!cart || cart.items.length === 0) return 0;
    
    // Get max prep time from all items
    const maxPrepTime = Math.max(
      ...cart.items.map(item => menuItemPrepTimes[item.menuItemId] || 10)
    );
    
    // Calculate: (max_prep_time + (pending_orders * 2)) * peak_multiplier
    const peakMultiplier = getPeakMultiplier();
    const totalMinutes = Math.round((maxPrepTime + (pendingOrderCount * 2)) * peakMultiplier);
    
    return totalMinutes;
  }, [cart, pendingOrderCount, menuItemPrepTimes]);

  // Load Cashfree SDK
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.onload = () => {
      setSdkLoaded(true);
      console.log('Cashfree SDK loaded for shop orders');
    };
    script.onerror = () => {
      console.error('Failed to load Cashfree SDK');
      toast.error('Failed to load payment gateway');
    };
    document.body.appendChild(script);

    return () => {
      const existingScript = document.querySelector('script[src="https://sdk.cashfree.com/js/v3/cashfree.js"]');
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
    };
  }, []);

  const generatePickupCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handlePlaceOrder = async () => {
    if (!user || !shopId || !cart || !profile) {
      toast.error('Please login to place an order');
      navigate('/auth');
      return;
    }

    if (!customerName || !customerPhone) {
      toast.error('Please provide your name and phone number');
      return;
    }

    if (customerPhone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    if (cart.items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    if (!sdkLoaded) {
      toast.error('Payment gateway is loading. Please try again.');
      return;
    }

    setIsSubmitting(true);

    try {
      const pickupCode = generatePickupCode();

      // Get item IDs for ETA calculation
      const itemIds = cart.items.map(item => item.menuItemId);

      // Calculate ETA using the database function
      const { data: etaData } = await supabase
        .rpc('calculate_shop_order_eta', {
          p_shop_id: shopId,
          p_item_ids: itemIds
        });

      // Get the next order number for this shop (resets daily)
      const { data: orderNo } = await supabase
        .rpc('get_next_shop_order_no', {
          p_shop_id: shopId
        });

      // Create order with pending payment status and fee breakdown
      const { data: order, error: orderError } = await supabase
        .from('shop_orders')
        .insert({
          user_id: user.id,
          shop_id: shopId,
          total: fees.totalPayable,
          platform_fee: fees.platformFee,
          pg_fee: fees.pgFee,
          net_profit: fees.netProfit,
          pickup_code: pickupCode,
          customer_name: customerName,
          customer_phone: customerPhone,
          notes: notes || null,
          status: 'pending',
          payment_status: 'pending',
          estimated_ready_time: etaData || null,
          order_no: orderNo || 1
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cart.items.map(item => ({
        order_id: order.id,
        menu_item_id: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      }));

      const { error: itemsError } = await supabase
        .from('shop_order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Get the return URL
      const returnUrl = `${window.location.origin}/shops/payment-result?order_id=${order.id}`;

      // Create Cashfree payment order
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-shop-cashfree-order', {
        body: {
          orderId: order.id,
          amount: total,
          customerName: customerName,
          customerEmail: profile.email,
          customerPhone: customerPhone,
          returnUrl,
        },
      });

      if (paymentError || !paymentData.paymentSessionId) {
        console.error('Payment order creation failed:', paymentError || paymentData);
        toast.error('Failed to initialize payment. Please try again.');
        setIsSubmitting(false);
        return;
      }

      console.log('Shop payment session created:', paymentData);

      // Initialize Cashfree and redirect to checkout
      if (window.Cashfree) {
        const cashfree = window.Cashfree({ mode: 'production' });
        const result = await cashfree.checkout({
          paymentSessionId: paymentData.paymentSessionId,
          redirectTarget: '_self',
        });
        
        if (result.error) {
          console.error('Cashfree checkout error:', result.error);
          toast.error(result.error.message || 'Payment failed. Please try again.');
          setIsSubmitting(false);
        }
      } else {
        toast.error('Payment gateway not loaded. Please refresh and try again.');
        setIsSubmitting(false);
      }

    } catch (error: any) {
      console.error('Error placing order:', error);
      toast.error(error.message || 'Failed to place order');
      setIsSubmitting(false);
    }
  };

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
          <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-semibold text-lg">Cart</h1>
          </div>
        </div>
        <div className="container max-w-4xl mx-auto px-4 py-16">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <ShoppingCart className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold">Your cart is empty</h2>
            <p className="text-muted-foreground text-center max-w-sm">
              Add some items from the shop menu to get started.
            </p>
            <Button onClick={() => navigate('/shops')}>
              Browse Shops
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-semibold text-lg">Cart</h1>
            <p className="text-sm text-muted-foreground">{cart.shopName}</p>
          </div>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 py-6">
        <div className="grid gap-6 md:grid-cols-[1fr_320px]">
          {/* Cart Items */}
          <div className="space-y-4">
            <h2 className="font-semibold">Order Items</h2>
            
            {cart.items.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                        <Store className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{item.name}</h3>
                      <p className="text-sm text-primary font-semibold">₹{item.price}</p>
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(shopId!, item.id, item.quantity - 1)}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(shopId!, item.id, item.quantity + 1)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeItem(shopId!, item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <p className="font-semibold">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Summary */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Your name"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Your phone number"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Special Instructions</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special requests?"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Order Summary</CardTitle>
                  {estimatedTime > 0 && (
                    <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-lg">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-medium">~{estimatedTime} min</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <FeeBreakdownCard fees={fees} />
                {estimatedTime > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Est. ready time</span>
                    <span>~{estimatedTime} minutes</span>
                  </div>
                )}
                
                {user ? (
                  <Button
                    onClick={handlePlaceOrder}
                    disabled={isSubmitting || !sdkLoaded}
                    className="w-full mt-4"
                    size="lg"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Pay ₹{total.toFixed(2)}
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={() => navigate('/auth')}
                    className="w-full mt-4"
                    size="lg"
                  >
                    Login to Order
                  </Button>
                )}

                <p className="text-xs text-muted-foreground text-center mt-2">
                  Pickup code will be generated after payment
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
