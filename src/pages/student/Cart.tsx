import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CartItemRow } from '@/components/CartItemRow';
import { EmptyState } from '@/components/EmptyState';
import { FeeBreakdownCard } from '@/components/FeeBreakdownCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useCanteenOrderStatus } from '@/hooks/useCanteenOrderStatus';
import { supabase } from '@/integrations/supabase/client';
import { calculateFees } from '@/lib/fees';
import { ShoppingCart, ArrowLeft, Loader2, CreditCard, Tag, X, Check, AlertTriangle, Clock, Ban } from 'lucide-react';
import { toast } from 'sonner';

// Get default prep time based on category
const getDefaultPrepTime = (category?: string): number => {
  if (!category) return 10;
  const cat = category.toLowerCase();
  if (cat.includes('beverage') || cat.includes('drink') || cat.includes('juice') || cat.includes('shake') || cat.includes('tea') || cat.includes('coffee')) return 5;
  if (cat.includes('snack') || cat.includes('fast food') || cat.includes('sandwich') || cat.includes('burger')) return 10;
  if (cat.includes('main') || cat.includes('meal') || cat.includes('rice') || cat.includes('biryani') || cat.includes('thali')) return 20;
  if (cat.includes('dessert') || cat.includes('sweet') || cat.includes('ice cream')) return 7;
  return 10;
};

// Get peak hour multiplier
const getPeakMultiplier = (): number => {
  const now = new Date();
  // Convert to IST
  const istOffset = 5.5 * 60; // IST is UTC+5:30
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istTime = new Date(utc + (istOffset * 60000));
  const hour = istTime.getHours();
  
  if (hour >= 11 && hour < 14) return 1.3;
  if (hour >= 17 && hour < 19) return 1.2;
  return 1.0;
};

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

interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  is_active: boolean;
  canteen_id: string | null;
  minimum_amount: number;
}

export default function Cart() {
  const { canteenId } = useParams<{ canteenId: string }>();
  const { getCanteenItems, getTotal, getCanteenName, getActiveCanteenIds } = useCart();
  const { user, profile, checkBanStatus } = useAuth();
  const { canAcceptOrders, isAtLimit, orderLimit } = useCanteenOrderStatus(canteenId);
  const [isOrdering, setIsOrdering] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
  const [pendingOrderCount, setPendingOrderCount] = useState(0);
  const [isBannedStudent, setIsBannedStudent] = useState(false);
  const navigate = useNavigate();

  // Check if student is banned on mount
  useEffect(() => {
    const checkStudentBanStatus = async () => {
      if (!user) return;
      const banned = await checkBanStatus(user.id, 'student');
      setIsBannedStudent(banned);
    };
    checkStudentBanStatus();
  }, [user, checkBanStatus]);

  // Fetch pending order count for ETA calculation
  useEffect(() => {
    const fetchPendingOrders = async () => {
      if (!canteenId) return;
      
      try {
        const { data, error } = await supabase
          .rpc('get_active_order_count', { p_canteen_id: canteenId });
        
        if (!error && data !== null) {
          setPendingOrderCount(data);
        }
      } catch (error) {
        console.error('Error fetching pending orders:', error);
      }
    };

    fetchPendingOrders();
  }, [canteenId]);
  // Reset coupon state and fetch available coupons when canteen changes
  useEffect(() => {
    // Reset coupon state when switching canteens
    setAppliedCoupon(null);
    setCouponCode('');
    setAvailableCoupons([]);
    
    const fetchCoupons = async () => {
      if (!canteenId) return;
      
      try {
        // Fetch active coupons for this specific canteen
        const { data: coupons } = await supabase
          .from('coupons')
          .select('*')
          .eq('canteen_id', canteenId)
          .eq('is_active', true);

        if (coupons) {
          setAvailableCoupons(coupons as Coupon[]);
        }
      } catch (error) {
        console.error('Error fetching coupons:', error);
      }
    };

    fetchCoupons();
  }, [canteenId]);
  
  // Load Cashfree SDK
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.onload = () => {
      setSdkLoaded(true);
      console.log('Cashfree SDK loaded');
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

  // Redirect to carts page if no canteenId
  useEffect(() => {
    if (!canteenId) {
      const activeIds = getActiveCanteenIds();
      if (activeIds.length > 0) {
        navigate(`/student/cart/${activeIds[0]}`, { replace: true });
      } else {
        navigate('/student/carts', { replace: true });
      }
    }
  }, [canteenId, getActiveCanteenIds, navigate]);
  
  const items = canteenId ? getCanteenItems(canteenId) : [];
  const subtotal = canteenId ? getTotal(canteenId) : 0;
  const canteenName = canteenId ? getCanteenName(canteenId) : null;

  // Calculate estimated time for cart items
  const estimatedTime = useMemo(() => {
    if (items.length === 0) return 0;
    
    // Get max prep time from all items
    const maxPrepTime = Math.max(
      ...items.map(item => item.menuItem.prep_time || getDefaultPrepTime(item.menuItem.category))
    );
    
    // Calculate: (max_prep_time + (pending_orders * 2)) * peak_multiplier
    const peakMultiplier = getPeakMultiplier();
    const totalMinutes = Math.round((maxPrepTime + (pendingOrderCount * 2)) * peakMultiplier);
    
    return totalMinutes;
  }, [items, pendingOrderCount]);

  // Calculate discount
  const calculateDiscount = () => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discount_type === 'percentage') {
      return Math.min((subtotal * appliedCoupon.discount_value) / 100, subtotal);
    }
    return Math.min(appliedCoupon.discount_value, subtotal);
  };

  const discount = calculateDiscount();
  const discountedAmount = Math.max(subtotal - discount, 0);
  const fees = calculateFees(discountedAmount);
  const total = fees.totalPayable;

  const generatePickupCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }

    setIsApplyingCoupon(true);
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.trim().toUpperCase())
        .eq('is_active', true)
        .eq('canteen_id', canteenId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast.error('Invalid coupon code or not valid for this canteen');
        return;
      }

      // Check minimum amount requirement
      if (data.minimum_amount && subtotal < data.minimum_amount) {
        toast.error(`Order must be at least ₹${data.minimum_amount} to use this coupon`);
        return;
      }

      setAppliedCoupon(data as Coupon);
      setCouponCode('');
      toast.success(`Coupon applied! You saved ₹${
        data.discount_type === 'percentage' 
          ? Math.min((subtotal * data.discount_value) / 100, subtotal).toFixed(0)
          : Math.min(data.discount_value, subtotal).toFixed(0)
      }`);
    } catch (error) {
      console.error('Error applying coupon:', error);
      toast.error('Failed to apply coupon. Please try again.');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    toast.success('Coupon removed');
  };

  const handlePlaceOrder = async () => {
    if (!user || !canteenId || !profile) {
      toast.error('Please log in to place an order');
      return;
    }

    // Check if student is banned
    console.log('Checking ban status for user:', user.id);
    const isBanned = await checkBanStatus(user.id, 'student');
    console.log('User ban status:', isBanned);
    if (isBanned) {
      toast.error('Your account has been suspended. Please contact support.');
      setIsOrdering(false);
      return;
    }

    // Check if canteen is banned
    const isCanteenBanned = await checkBanStatus(canteenId, 'canteen');
    if (isCanteenBanned) {
      toast.error('This canteen is currently suspended and cannot accept orders.');
      return;
    }

    if (!canAcceptOrders) {
      toast.error('This vendor is not accepting new orders right now');
      return;
    }

    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    if (!sdkLoaded) {
      toast.error('Payment gateway is loading. Please try again.');
      return;
    }

    setIsOrdering(true);
    
    try {
      const code = generatePickupCode();
      const itemIds = items.map(item => item.menuItem.id);
      
      // Check canteen stock mode and validate stock for daily mode
      const { data: canteenData } = await supabase
        .from('canteens')
        .select('stock_mode')
        .eq('id', canteenId)
        .maybeSingle();
      
      if (canteenData?.stock_mode === 'daily') {
        // Validate stock for each item
        for (const cartItem of items) {
          const { data: result, error: stockError } = await supabase
            .rpc('reduce_daily_stock', {
              p_menu_item_id: cartItem.menuItem.id,
              p_quantity: cartItem.quantity
            });
          
          if (stockError) {
            console.error('Stock check error:', stockError);
            toast.error('Failed to validate stock. Please try again.');
            setIsOrdering(false);
            return;
          }
          
          const stockResult = result as { success: boolean; error?: string; remaining?: number };
          if (!stockResult.success) {
            toast.error(`${cartItem.menuItem.name}: ${stockResult.error || 'Not available'}`);
            setIsOrdering(false);
            return;
          }
        }
      }
      
      // Calculate ETA using the database function
      const { data: etaData, error: etaError } = await supabase
        .rpc('calculate_order_eta', {
          p_canteen_id: canteenId,
          p_item_ids: itemIds,
        });
      
      if (etaError) {
        console.error('Error calculating ETA:', etaError);
      }
      
      // Get next daily order number for this canteen
      const { data: orderNo } = await supabase
        .rpc('get_next_canteen_order_no', { p_canteen_id: canteenId });

      // Create order with ETA and fee breakdown
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          canteen_id: canteenId,
          total: fees.totalPayable,
          platform_fee: fees.platformFee,
          pg_fee: fees.pgFee,
          net_profit: fees.netProfit,
          status: 'pending',
          pickup_code: code,
          payment_status: 'pending',
          estimated_ready_time: etaData || null,
          order_no: orderNo || 1,
        })
        .select()
        .single();
      
      if (orderError) throw orderError;

      // Create order items with size info
      const orderItems = items.map(item => {
        const displayPrice = item.priceOverride ?? item.menuItem.price;
        const itemName = item.size 
          ? `${item.menuItem.name} (${item.size.charAt(0).toUpperCase() + item.size.slice(1)})`
          : item.menuItem.name;
        
        return {
          order_id: order.id,
          menu_item_id: item.menuItem.id,
          name: itemName,
          price: displayPrice,
          quantity: item.quantity,
        };
      });

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);
      
      if (itemsError) throw itemsError;

      // Get the return URL
      const returnUrl = `${window.location.origin}/student/payment-result?order_id=${order.id}`;

      // Create Cashfree payment order
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-cashfree-order', {
        body: {
          orderId: order.id,
          amount: total,
          customerName: profile.name,
          customerEmail: profile.email,
          customerPhone: phoneNumber,
          returnUrl,
        },
      });

      if (paymentError || !paymentData.paymentSessionId) {
        console.error('Payment order creation failed:', paymentError || paymentData);
        toast.error('Failed to initialize payment. Please try again.');
        setIsOrdering(false);
        return;
      }

      console.log('Payment session created:', paymentData);

      // Initialize Cashfree and redirect to checkout
      if (window.Cashfree) {
        const cashfree = window.Cashfree({ mode: 'production' }); // Use 'sandbox' for testing
        const result = await cashfree.checkout({
          paymentSessionId: paymentData.paymentSessionId,
          redirectTarget: '_self',
        });
        
        if (result.error) {
          console.error('Cashfree checkout error:', result.error);
          toast.error(result.error.message || 'Payment failed. Please try again.');
          setIsOrdering(false);
        }
      } else {
        toast.error('Payment gateway not loaded. Please refresh and try again.');
        setIsOrdering(false);
      }

    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order. Please try again.');
      setIsOrdering(false);
    }
  };

  if (!canteenId || items.length === 0) {
    return (
      <div className="min-h-screen bg-mcd-cream">
        <div className="border-b border-mcd-border bg-mcd-cream sticky top-0 z-10 shadow-card">
          <div className="container mx-auto px-4 h-[72px] md:h-24 flex items-center gap-3 md:gap-4">
            <Link 
              to="/student/carts"
              className="flex items-center gap-1 md:gap-2 text-muted-foreground hover:text-mcd-red transition-colors text-sm md:text-base"
            >
              <ArrowLeft className="h-4 w-4 text-mcd-red" />
              <span className="hidden sm:inline">Back</span>
            </Link>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 md:h-5 md:w-5 text-mcd-red" />
              <h1 className="text-lg md:text-xl font-bold">Your Cart</h1>
            </div>
          </div>
        </div>
        <main className="container mx-auto px-3 md:px-4 py-4 md:py-6">
          <EmptyState
            icon={ShoppingCart}
            title="Your cart is empty"
            description="Add some delicious items from a canteen to get started"
            action={
              <Button asChild variant="gradient">
                <Link to="/student/dashboard">Browse Canteens</Link>
              </Button>
            }
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mcd-cream">
      {/* Simple Header */}
      <div className="border-b border-mcd-border bg-mcd-cream sticky top-0 z-10 shadow-card">
        <div className="container mx-auto px-4 h-[72px] md:h-24 flex items-center gap-3 md:gap-4">
          <Link 
            to="/student/carts"
            className="flex items-center gap-1 md:gap-2 text-muted-foreground hover:text-mcd-red transition-colors text-sm md:text-base"
          >
            <ArrowLeft className="h-4 w-4 text-mcd-red" />
            <span className="hidden sm:inline">Back</span>
          </Link>
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 md:h-5 md:w-5 text-mcd-red" />
            <h1 className="text-lg md:text-xl font-bold">Your Cart</h1>
          </div>
        </div>
      </div>
      
      <main className="container mx-auto px-3 md:px-4 py-4 md:py-6 max-w-3xl">
        {/* Banned Student Warning Banner */}
        {isBannedStudent && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mb-4 flex items-start gap-3">
            <Ban className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-destructive">Account Suspended</p>
              <p className="text-sm text-destructive/80">
                Your account has been suspended and you cannot place orders. Please contact support for assistance.
              </p>
            </div>
          </div>
        )}

        {/* Order Status Warning Banner */}
        {!canAcceptOrders && !isBannedStudent && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">
                {isAtLimit ? 'Order limit reached' : 'Not accepting orders'}
              </p>
              <p className="text-sm text-amber-700">
                {isAtLimit 
                  ? `This vendor has reached their maximum of ${orderLimit} active orders. Please check back later.`
                  : 'This vendor is currently not accepting new orders. Please check back later.'
                }
              </p>
            </div>
          </div>
        )}

        {/* Single Card with everything */}
        <div className="bg-white rounded-xl md:rounded-2xl shadow-card p-4 md:p-6 border border-mcd-border">
          <div className="flex items-start justify-between mb-3 md:mb-4">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-foreground mb-1">{canteenName}</h2>
              <p className="text-sm text-muted-foreground">Your order from this canteen</p>
            </div>
            {/* Estimated Time Badge */}
            {estimatedTime > 0 && (
              <div className="flex items-center gap-1.5 bg-accent/10 text-accent px-3 py-1.5 rounded-lg">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-semibold">~{estimatedTime} min</span>
              </div>
            )}
          </div>
          
          {/* Cart Items */}
          <div className="mb-3 md:mb-4">
            {items.map(item => {
              // Create unique key including size for shake items
              const itemKey = item.size 
                ? `${item.menuItem.id}-${item.size}` 
                : item.menuItem.id;
              return (
                <CartItemRow key={itemKey} item={item} canteenId={canteenId} />
              );
            })}
          </div>

          {/* Coupon Section */}
          <div className="py-3 border-t border-mcd-border">
            <Label className="text-sm font-medium text-foreground flex items-center gap-1.5 mb-2">
              <Tag className="h-4 w-4 text-mcd-red" />
              Coupon Code
            </Label>

            {/* Available Coupons */}
            {availableCoupons.length > 0 && !appliedCoupon && (
              <div className="mb-3 space-y-2">
                <p className="text-xs text-muted-foreground">Available coupons:</p>
                <div className="flex flex-wrap gap-2">
                  {availableCoupons.map((coupon) => {
                    const meetsMinimum = subtotal >= (coupon.minimum_amount || 0);
                    return (
                      <button
                        key={coupon.id}
                        onClick={() => {
                          if (!meetsMinimum) {
                            toast.error(`Add ₹${(coupon.minimum_amount - subtotal).toFixed(0)} more to use this coupon`);
                            return;
                          }
                          setAppliedCoupon(coupon);
                          toast.success(`Coupon applied! You saved ₹${
                            coupon.discount_type === 'percentage' 
                              ? Math.min((subtotal * coupon.discount_value) / 100, subtotal).toFixed(0)
                              : Math.min(coupon.discount_value, subtotal).toFixed(0)
                          }`);
                        }}
                        className={`px-3 py-1.5 border border-dashed rounded-lg text-xs font-medium transition-colors ${
                          meetsMinimum 
                            ? 'bg-mcd-red/10 border-mcd-red text-mcd-red hover:bg-mcd-red/20'
                            : 'bg-muted/50 border-muted-foreground/30 text-muted-foreground cursor-not-allowed'
                        }`}
                      >
                        {coupon.code} • {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : `₹${coupon.discount_value} OFF`}
                        {coupon.minimum_amount > 0 && (
                          <span className="block text-[10px] opacity-75">Min. ₹{coupon.minimum_amount}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {appliedCoupon ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-700">
                      {appliedCoupon.code}
                    </p>
                    <p className="text-xs text-green-600">
                      You saved ₹{discount.toFixed(0)}!
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveCoupon}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="flex-1 border-mcd-border uppercase"
                />
                <Button
                  variant="outline"
                  onClick={handleApplyCoupon}
                  disabled={isApplyingCoupon || !couponCode.trim()}
                  className="border-mcd-red text-mcd-red hover:bg-mcd-red hover:text-white shrink-0"
                >
                  {isApplyingCoupon ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Apply'
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Price Summary with Fee Breakdown */}
          <div className="py-3 border-t border-mcd-border">
            <FeeBreakdownCard fees={fees} discount={discount} />
          </div>
          
          {/* Phone Number Input */}
          <div className="mt-4 mb-4">
            <Label htmlFor="phone" className="text-sm font-medium text-foreground">
              Phone Number (for payment)
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="Enter your 10-digit phone number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
              className="mt-1 border-mcd-border"
              maxLength={10}
            />
          </div>
          
          {/* Pay Now Button */}
          <Button 
            className="w-full mt-3 md:mt-4 bg-mcd-yellow hover:bg-yellow-400 text-foreground font-semibold h-11 md:h-12 rounded-xl text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handlePlaceOrder}
            disabled={isOrdering || !sdkLoaded || phoneNumber.length < 10 || !canAcceptOrders || isBannedStudent}
          >
            {isOrdering ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 md:h-5 md:w-5 animate-spin" />
                Processing...
              </>
            ) : isBannedStudent ? (
              <>
                <Ban className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                Account Suspended
              </>
            ) : !canAcceptOrders ? (
              'Orders Not Available'
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                Pay ₹{total % 1 === 0 ? total.toFixed(0) : total.toFixed(2)}
              </>
            )}
          </Button>
          
          {!sdkLoaded && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Loading payment gateway...
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
