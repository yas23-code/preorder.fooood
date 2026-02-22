import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { QRCodeScanner } from '@/components/QRCodeScanner';
import { useQRVerification } from '@/hooks/useQRVerification';
import { 
  Clock, 
  CheckCircle, 
  Package, 
  Phone,
  User,
  Loader2,
  RefreshCw,
  Search,
  X,
  IndianRupee,
  ShoppingBag,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Timer,
  QrCode
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { toast as sonnerToast } from 'sonner';
import { format } from 'date-fns';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface ShopOrder {
  id: string;
  pickup_code: string;
  total: number;
  status: string;
  payment_status: string;
  customer_name: string | null;
  customer_phone: string | null;
  notes: string | null;
  created_at: string;
  user_id: string;
  estimated_ready_time: string | null;
  order_no: number | null;
  items: OrderItem[];
}

interface ShopOrdersManagementProps {
  shopId: string;
  shopName?: string;
}

type TabType = 'pending' | 'ready' | 'completed';
type TimeStatus = 'on-time' | 'warning' | 'overdue';

export function ShopOrdersManagement({ shopId, shopName }: ShopOrdersManagementProps) {
  const { toast } = useToast();
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [pickupCode, setPickupCode] = useState('');
  const [todayIncome, setTodayIncome] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [, setTick] = useState(0); // For timer refresh
  const { playNotificationSound, playOverdueSound } = useNotificationSound();
  const { verifyShopOrder } = useQRVerification();
  const overdueAlertsPlayed = useRef<Set<string>>(new Set());

  // Auto-refresh timer every 30 seconds for ETA updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Helper to get today's date boundaries
  const getTodayBoundaries = () => {
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    return { startOfDay: startOfDay.toISOString(), endOfDay: endOfDay.toISOString() };
  };

  // Helper to get current month's date boundaries
  const getMonthBoundaries = () => {
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    return { startOfMonth: startOfMonth.toISOString(), endOfMonth: endOfMonth.toISOString() };
  };

  // Calculate today's income from completed orders (actual food amount, excluding platform fee)
  const calculateTodayIncome = (ordersList: ShopOrder[]) => {
    const { startOfDay, endOfDay } = getTodayBoundaries();
    const todayCompleted = ordersList.filter(order => 
      order.status === 'completed' && 
      order.payment_status === 'paid' &&
      order.created_at >= startOfDay && 
      order.created_at <= endOfDay
    );
    return todayCompleted.reduce((sum, order) => sum + Number(order.total) - Number((order as any).platform_fee || 0), 0);
  };

  // Calculate monthly income from completed orders (actual food amount, excluding platform fee)
  const calculateMonthlyIncome = (ordersList: ShopOrder[]) => {
    const { startOfMonth, endOfMonth } = getMonthBoundaries();
    const monthlyCompleted = ordersList.filter(order => 
      order.status === 'completed' && 
      order.payment_status === 'paid' &&
      order.created_at >= startOfMonth && 
      order.created_at <= endOfMonth
    );
    return monthlyCompleted.reduce((sum, order) => sum + Number(order.total) - Number((order as any).platform_fee || 0), 0);
  };

  const fetchOrders = async () => {
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('shop_orders')
        .select('*')
        .eq('shop_id', shopId)
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch order items for each order
      const ordersWithItems = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { data: items } = await supabase
            .from('shop_order_items')
            .select('*')
            .eq('order_id', order.id);
          
          return { ...order, items: items || [] };
        })
      );

      setOrders(ordersWithItems);
      setTodayIncome(calculateTodayIncome(ordersWithItems));
      setMonthlyIncome(calculateMonthlyIncome(ordersWithItems));
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to load orders',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Set up realtime subscription for orders
    const channel = supabase
      .channel(`shop-orders-management-${shopId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'shop_orders',
          filter: `shop_id=eq.${shopId}`,
        },
        async (payload) => {
          console.log('Shop order realtime event:', payload.eventType, payload);
          
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as any;
            // Only add if payment is already paid
            if (newOrder.payment_status === 'paid') {
              const { data: items } = await supabase
                .from('shop_order_items')
                .select('*')
                .eq('order_id', newOrder.id);

              const completeOrder = { ...newOrder, items: items || [] };

              setOrders(prev => {
                const exists = prev.some(o => o.id === completeOrder.id);
                if (exists) return prev;
                return [completeOrder, ...prev];
              });

              playNotificationSound();
              showOrderNotification(newOrder, items || []);
            }
          } else if (payload.eventType === 'UPDATE') {
            const newOrder = payload.new as any;
            const oldOrder = payload.old as any;

            // Check if payment just became successful
            if (newOrder.payment_status === 'paid' && oldOrder?.payment_status !== 'paid') {
              // Fetch complete order with items
              const { data: items } = await supabase
                .from('shop_order_items')
                .select('*')
                .eq('order_id', newOrder.id);

              const completeOrder = { ...newOrder, items: items || [] };

              setOrders(prev => {
                const exists = prev.some(o => o.id === completeOrder.id);
                if (exists) {
                  return prev.map(o => o.id === completeOrder.id ? completeOrder : o);
                }
                return [completeOrder, ...prev];
              });

              playNotificationSound();
              showOrderNotification(newOrder, items || []);
            } else if (newOrder.payment_status === 'paid') {
              // Regular status update for paid order
              setOrders(prev => {
                const updatedOrders = prev.map(order => 
                  order.id === newOrder.id ? { ...order, ...newOrder } : order
                );
                setTodayIncome(calculateTodayIncome(updatedOrders));
                setMonthlyIncome(calculateMonthlyIncome(updatedOrders));
                return updatedOrders;
              });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Shop orders subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId, playNotificationSound]);

  // Helper function to show order notification toast
  const showOrderNotification = (order: any, items: any[]) => {
    const itemsSummary = items
      .map((item: any) => `${item.quantity}x ${item.name}`)
      .join(', ');

    sonnerToast.custom(
      (t) => {
        let startX = 0;
        let currentX = 0;
        
        const handleTouchStart = (e: React.TouchEvent) => {
          startX = e.touches[0].clientX;
        };
        
        const handleTouchMove = (e: React.TouchEvent) => {
          currentX = e.touches[0].clientX;
          const diff = currentX - startX;
          if (diff > 0) {
            (e.currentTarget as HTMLElement).style.transform = `translateX(${diff}px)`;
            (e.currentTarget as HTMLElement).style.opacity = `${Math.max(0, 1 - diff / 150)}`;
          }
        };
        
        const handleTouchEnd = (e: React.TouchEvent) => {
          const diff = currentX - startX;
          if (diff > 80) {
            sonnerToast.dismiss(t);
          } else {
            (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
            (e.currentTarget as HTMLElement).style.opacity = '1';
          }
        };
        
        return (
          <div 
            className="text-white px-3 py-2 rounded-lg shadow-lg border border-red-400/30 max-w-xs animate-in slide-in-from-top-5 duration-300 cursor-grab active:cursor-grabbing transition-opacity animate-pulse"
            style={{ 
              background: 'linear-gradient(to right, #ff2121, #e01b1b)',
              animation: 'pulse 1.5s ease-in-out infinite, slide-in-from-top 0.3s ease-out'
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={() => sonnerToast.dismiss(t)}
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-white flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-tight">
                  {order.customer_name || 'Customer'} • ₹{Number(order.total).toFixed(0)}
                </p>
                <p className="text-xs text-white/80 truncate">{itemsSummary}</p>
              </div>
              <span className="text-white/60 text-xs">×</span>
            </div>
          </div>
        );
      },
      { duration: 8000 }
    );
  };

  const handleMarkReady = async (orderId: string) => {
    setUpdatingOrder(orderId);
    const order = orders.find(o => o.id === orderId);
    
    try {
      const { error } = await supabase
        .from('shop_orders')
        .update({ status: 'ready' })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => 
        prev.map(o => 
          o.id === orderId ? { ...o, status: 'ready' } : o
        )
      );

      toast({
        title: 'Order Ready!',
        description: 'Customer has been notified',
      });

      // Send email notification to customer when order is ready
      if (order?.user_id) {
        try {
          await supabase.functions.invoke('send-shop-brevo-email', {
            body: {
              order_id: orderId,
              user_id: order.user_id,
              pickup_code: order.pickup_code,
              shop_id: shopId,
              shop_name: shopName || 'Shop'
            }
          });
          console.log('Shop order ready email sent successfully');
        } catch (err) {
          console.error('Failed to send shop notification email:', err);
        }
      }
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: 'Error',
        description: 'Failed to update order status',
        variant: 'destructive',
      });
    } finally {
      setUpdatingOrder(null);
    }
  };

  const handleMarkCompleted = async (orderId: string) => {
    setUpdatingOrder(orderId);
    try {
      const { error } = await supabase
        .from('shop_orders')
        .update({ status: 'completed' })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => {
        const updatedOrders = prev.map(o => 
          o.id === orderId ? { ...o, status: 'completed' } : o
        );
        setTodayIncome(calculateTodayIncome(updatedOrders));
        setMonthlyIncome(calculateMonthlyIncome(updatedOrders));
        return updatedOrders;
      });

      toast({
        title: 'Order Completed!',
        description: 'Order has been marked as completed',
      });
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: 'Error',
        description: 'Failed to update order status',
        variant: 'destructive',
      });
    } finally {
      setUpdatingOrder(null);
    }
  };

  const handleCompleteByCode = async () => {
    if (!pickupCode.trim() || pickupCode.length < 4) {
      toast({
        title: 'Invalid Code',
        description: 'Please enter a valid 4-digit pickup code',
        variant: 'destructive',
      });
      return;
    }

    const order = orders.find(o => o.pickup_code === pickupCode.trim() && o.status === 'ready');
    if (!order) {
      toast({
        title: 'Order Not Found',
        description: 'No ready order found with this pickup code',
        variant: 'destructive',
      });
      return;
    }

    await handleMarkCompleted(order.id);
    setPickupCode('');
  };

  const handleQRScan = async (qrToken: string) => {
    const result = await verifyShopOrder(qrToken);
    if (result.success) {
      // Update local state to reflect the completed order
      setOrders(prev => {
        const updatedOrders = prev.map(order => 
          order.id === result.orderId 
            ? { ...order, status: 'completed' }
            : order
        );
        setTodayIncome(calculateTodayIncome(updatedOrders));
        setMonthlyIncome(calculateMonthlyIncome(updatedOrders));
        return updatedOrders;
      });
      toast({
        title: 'Order Completed!',
        description: 'Order has been verified and completed successfully',
      });
    }
    return result;
  };

  // Filter orders by status (include 'confirmed' in pending for backwards compatibility)
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'confirmed');
  const readyOrders = orders.filter(o => o.status === 'ready');
  const completedOrders = orders.filter(o => o.status === 'completed');

  // Get urgency priority for sorting (lower = more urgent)
  const getUrgencyPriority = (order: ShopOrder): number => {
    if (!order.estimated_ready_time) return 3;
    const now = new Date();
    const eta = new Date(order.estimated_ready_time);
    const minutesRemaining = Math.floor((eta.getTime() - now.getTime()) / 60000);
    
    if (minutesRemaining <= 0) return 0; // Overdue - highest priority
    if (minutesRemaining <= 5) return 1; // Warning - medium priority
    return 2; // On-time - lower priority
  };

  // Calculate time status for an order
  const getTimeStatus = (order: ShopOrder): TimeStatus | null => {
    if (order.status !== 'pending' || !order.estimated_ready_time) return null;
    const now = new Date();
    const eta = new Date(order.estimated_ready_time);
    const minutesRemaining = Math.ceil((eta.getTime() - now.getTime()) / 60000);
    
    if (minutesRemaining <= 0) return 'overdue';
    if (minutesRemaining <= 5) return 'warning';
    return 'on-time';
  };

  // Get minutes remaining for ETA
  const getMinutesRemaining = (order: ShopOrder): number | null => {
    if (!order.estimated_ready_time) return null;
    const now = new Date();
    const eta = new Date(order.estimated_ready_time);
    const diffMs = eta.getTime() - now.getTime();
    return Math.ceil(diffMs / 60000);
  };

  // Play overdue sound for orders that just became overdue
  useEffect(() => {
    pendingOrders.forEach(order => {
      const timeStatus = getTimeStatus(order);
      if (timeStatus === 'overdue' && !overdueAlertsPlayed.current.has(order.id)) {
        const soundKey = `overdue-sound-shop-${order.id}`;
        if (!localStorage.getItem(soundKey)) {
          playOverdueSound();
          localStorage.setItem(soundKey, 'played');
          overdueAlertsPlayed.current.add(order.id);
        }
      }
    });
  }, [pendingOrders, playOverdueSound]);

  const getFilteredOrders = () => {
    let tabOrders: ShopOrder[];
    switch (activeTab) {
      case 'pending': tabOrders = pendingOrders; break;
      case 'ready': tabOrders = readyOrders; break;
      case 'completed': tabOrders = completedOrders; break;
      default: tabOrders = [];
    }

    // Sort pending orders by urgency (overdue first, then warning, then on-time)
    if (activeTab === 'pending') {
      tabOrders = [...tabOrders].sort((a, b) => {
        const priorityA = getUrgencyPriority(a);
        const priorityB = getUrgencyPriority(b);
        if (priorityA !== priorityB) return priorityA - priorityB;
        // If same priority, sort by ETA (earlier first)
        const etaA = a.estimated_ready_time ? new Date(a.estimated_ready_time).getTime() : Infinity;
        const etaB = b.estimated_ready_time ? new Date(b.estimated_ready_time).getTime() : Infinity;
        return etaA - etaB;
      });
    }

    if (!searchQuery.trim()) return tabOrders;

    const query = searchQuery.toLowerCase().trim();
    return tabOrders.filter(order => 
      order.pickup_code.toLowerCase().includes(query) ||
      order.customer_name?.toLowerCase().includes(query) ||
      order.items?.some(item => item.name.toLowerCase().includes(query))
    );
  };

  const filteredOrders = getFilteredOrders();

  const tabs = [
    { id: 'pending' as TabType, label: 'Pending', icon: Clock, count: pendingOrders.length },
    { id: 'ready' as TabType, label: 'Ready', icon: Package, count: readyOrders.length },
    { id: 'completed' as TabType, label: 'Done', icon: CheckCircle, count: completedOrders.length },
  ];

  // Status config for urgency indicators
  const statusConfig = {
    'on-time': {
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      textColor: 'text-green-600',
      icon: CheckCircle2,
    },
    'warning': {
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
      textColor: 'text-yellow-600',
      icon: AlertTriangle,
    },
    'overdue': {
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      textColor: 'text-red-600',
      icon: AlertCircle,
    },
  };

  // Order card component
  const ShopOrderCard = ({ order }: { order: ShopOrder }) => {
    const orderDate = new Date(order.created_at);
    const timeStatus = getTimeStatus(order);
    const minutesRemaining = getMinutesRemaining(order);
    const estimatedReadyTime = order.estimated_ready_time ? new Date(order.estimated_ready_time) : null;

    return (
      <Card className={cn(
        "overflow-hidden shadow-warm transition-all",
        timeStatus ? statusConfig[timeStatus].borderColor : "border-border/50"
      )}>
        <CardContent className="p-5 space-y-4">
          {/* Time Status Indicator */}
          {timeStatus && order.status === 'pending' && (
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full w-fit",
              statusConfig[timeStatus].bgColor
            )}>
              {(() => {
                const StatusIcon = statusConfig[timeStatus].icon;
                return <StatusIcon className={cn("h-4 w-4", statusConfig[timeStatus].textColor)} />;
              })()}
              <span className={cn("text-sm font-semibold", statusConfig[timeStatus].textColor)}>
                {timeStatus === 'overdue' 
                  ? 'Overdue!' 
                  : `${minutesRemaining} min left`
                }
              </span>
            </div>
          )}

          {/* Order Number Badge */}
          {order.order_no && (
            <div className="flex items-center gap-2">
              <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg">
                <span className="text-xs font-medium">ORDER NO</span>
                <span className="ml-2 text-lg font-bold">{order.order_no}</span>
              </div>
            </div>
          )}

          {/* Header - Customer & Total */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold font-display text-foreground">
                {order.customer_name || 'Customer'}
              </h3>
              <p className="text-lg font-semibold text-accent">₹{(Number(order.total) - Number((order as any).platform_fee || 0)).toFixed(0)}</p>
            </div>
            <Badge 
              className={cn(
                "text-white",
                order.status === 'pending' && "bg-yellow-500",
                order.status === 'ready' && "bg-green-500",
                order.status === 'completed' && "bg-muted text-muted-foreground"
              )}
            >
              {order.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
              {order.status === 'ready' && <Package className="w-3 h-3 mr-1" />}
              {order.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Badge>
          </div>

          {/* Order Date & Time */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{format(orderDate, 'dd MMM yyyy, hh:mm a')}</span>
          </div>

          {/* Estimated Ready Time / ETA */}
          {order.status === 'pending' && estimatedReadyTime && (
            <div className="flex items-center gap-1.5 text-sm">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                ETA: {format(estimatedReadyTime, 'hh:mm a')}
              </span>
            </div>
          )}

          {order.status !== 'pending' && estimatedReadyTime && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Timer className="h-4 w-4" />
              <span>ETA was: {format(estimatedReadyTime, 'hh:mm a')}</span>
            </div>
          )}

          {/* Customer Contact */}
          {order.customer_phone && (
            <a 
              href={`tel:${order.customer_phone}`}
              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <Phone className="w-4 h-4" />
              <span>{order.customer_phone}</span>
            </a>
          )}

          {/* Order Items */}
          <div className="space-y-1">
            {order.items?.map(item => (
              <p key={item.id} className="text-foreground">
                <span className="text-accent font-medium">{item.quantity}×</span>{' '}
                {item.name}
              </p>
            ))}
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="text-sm bg-muted/50 p-2 rounded">
              <span className="text-muted-foreground">Note: </span>
              <span className="italic">{order.notes}</span>
            </div>
          )}

          {/* Action Button */}
          {order.status === 'pending' && (
            <Button 
              className={cn(
                "w-full font-semibold py-3 rounded-lg",
                timeStatus === 'overdue' 
                  ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" 
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              )}
              onClick={() => handleMarkReady(order.id)}
              disabled={updatingOrder === order.id}
            >
              {updatingOrder === order.id ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Package className="w-4 h-4 mr-2" />
              )}
              {timeStatus === 'overdue' ? 'Mark Ready (Overdue!)' : 'Mark Ready'}
            </Button>
          )}

          {order.status === 'ready' && (
            <div className="bg-accent/10 rounded-lg p-3 text-center">
              <p className="text-sm text-muted-foreground">Waiting for pickup</p>
              <p className="text-xs text-muted-foreground mt-1">
                Ask customer for pickup code to complete
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Income Summary */}
      <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-0">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-full">
                <IndianRupee className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today's Income</p>
                <p className="text-2xl font-bold text-foreground">₹{todayIncome.toFixed(0)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">This Month</p>
              <p className="text-lg font-semibold text-foreground">₹{monthlyIncome.toFixed(0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Complete Order by QR Code Section */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground mb-3">Complete an Order</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Scan customer's QR code or enter pickup code manually
          </p>
          
          {/* QR Scan Button */}
          <Button 
            onClick={() => setIsScannerOpen(true)}
            className="w-full mb-4 py-6 text-lg"
          >
            <QrCode className="h-6 w-6 mr-3" />
            Scan QR Code
          </Button>
          
          {/* Manual Entry Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or enter manually</span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex justify-center">
              <InputOTP
                maxLength={6}
                value={pickupCode}
                onChange={(value) => setPickupCode(value)}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="w-10 h-12 text-lg" />
                  <InputOTPSlot index={1} className="w-10 h-12 text-lg" />
                  <InputOTPSlot index={2} className="w-10 h-12 text-lg" />
                  <InputOTPSlot index={3} className="w-10 h-12 text-lg" />
                  <InputOTPSlot index={4} className="w-10 h-12 text-lg" />
                  <InputOTPSlot index={5} className="w-10 h-12 text-lg" />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button 
              onClick={handleCompleteByCode}
              disabled={pickupCode.length < 6}
              variant="outline"
              className="sm:w-auto"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Complete Order
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* QR Scanner Modal */}
      <QRCodeScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleQRScan}
        title="Scan Customer QR Code"
      />

      {/* Search & Refresh */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Button variant="outline" size="icon" onClick={fetchOrders}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count > 0 && (
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-xs",
                activeTab === tab.id
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-background text-foreground"
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            {activeTab === 'pending' && <Clock className="w-12 h-12 text-muted-foreground" />}
            {activeTab === 'ready' && <Package className="w-12 h-12 text-muted-foreground" />}
            {activeTab === 'completed' && <CheckCircle className="w-12 h-12 text-muted-foreground" />}
            <div className="text-center">
              <h3 className="font-semibold">No {activeTab} orders</h3>
              <p className="text-sm text-muted-foreground">
                {activeTab === 'pending' && 'New orders will appear here'}
                {activeTab === 'ready' && 'Orders ready for pickup will appear here'}
                {activeTab === 'completed' && 'Completed orders will appear here'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredOrders.map((order) => (
            <ShopOrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
