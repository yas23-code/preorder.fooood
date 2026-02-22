import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { VendorOrderCard } from '@/components/VendorOrderCard';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { OrderLimitSettings } from '@/components/OrderLimitSettings';
import { DailyStockManager } from '@/components/vendor/DailyStockManager';
import { DemandPrediction } from '@/components/vendor/DemandPrediction';
import { Logo } from '@/components/Logo';
import { QRCodeScanner } from '@/components/QRCodeScanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useQRVerification } from '@/hooks/useQRVerification';
import { ClipboardList, Clock, CheckCircle, Package, Plus, LogOut, Tag, Search, X, IndianRupee, ShoppingBag, AlertCircle, XCircle, QrCode } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useNotificationSound } from '@/hooks/useNotificationSound';

interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  user_id: string;
  canteen_id: string;
  total: number;
  status: 'pending' | 'accepted' | 'ready' | 'completed' | 'rejected';
  pickup_code: string;
  payment_status?: string;
  created_at: string;
  updated_at: string;
  estimated_ready_time?: string;
  order_no?: number | null;
  items?: OrderItem[];
}

interface Canteen {
  id: string;
  name: string;
  location: string;
  is_open: boolean;
  order_limit: number | null;
  is_accepting_orders: boolean;
  approval_status: 'pending' | 'approved' | 'rejected';
  stock_mode: 'simple' | 'daily';
}

interface CustomerProfile {
  id: string;
  name: string;
}

type TabType = 'pending' | 'ready' | 'completed';

export default function VendorDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [orders, setOrders] = useState<Order[]>([]);
  const [canteen, setCanteen] = useState<Canteen | null>(null);
  const [customers, setCustomers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [pickupCode, setPickupCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [todayIncome, setTodayIncome] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [isBanned, setIsBanned] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const { user, logout, checkBanStatus } = useAuth();
  const { playNotificationSound } = useNotificationSound();
  const { verifyCanteenOrder } = useQRVerification();

  // Helper to get today's date boundaries in UTC (server time)
  const getTodayBoundaries = () => {
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    return { startOfDay: startOfDay.toISOString(), endOfDay: endOfDay.toISOString() };
  };

  // Helper to get current month's date boundaries in UTC (server time)
  const getMonthBoundaries = () => {
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    return { startOfMonth: startOfMonth.toISOString(), endOfMonth: endOfMonth.toISOString() };
  };

  // Calculate today's income from completed orders (actual food amount, excluding platform fee)
  const calculateTodayIncome = (ordersList: Order[]) => {
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
  const calculateMonthlyIncome = (ordersList: Order[]) => {
    const { startOfMonth, endOfMonth } = getMonthBoundaries();
    const monthlyCompleted = ordersList.filter(order => 
      order.status === 'completed' && 
      order.payment_status === 'paid' &&
      order.created_at >= startOfMonth && 
      order.created_at <= endOfMonth
    );
    return monthlyCompleted.reduce((sum, order) => sum + Number(order.total) - Number((order as any).platform_fee || 0), 0);
  };

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // First get the vendor's canteen
      const { data: canteenData } = await supabase
        .from('canteens')
        .select('id, name, location, is_open, order_limit, is_accepting_orders, approval_status, stock_mode')
        .eq('vendor_id', user.id)
        .maybeSingle();
      
      if (!canteenData) {
        setIsLoading(false);
        return;
      }

      setCanteen(canteenData as Canteen);

      // Check if canteen is banned
      const banned = await checkBanStatus(canteenData.id, 'canteen');
      setIsBanned(banned);

      // Cleanup completed orders older than 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const cutoffDate = sevenDaysAgo.toISOString();

      // Get old completed orders to delete their items first
      const { data: oldOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('canteen_id', canteenData.id)
        .eq('status', 'completed')
        .lt('created_at', cutoffDate);

      if (oldOrders && oldOrders.length > 0) {
        const oldOrderIds = oldOrders.map(o => o.id);
        
        // Delete order items first
        await supabase
          .from('order_items')
          .delete()
          .in('order_id', oldOrderIds);
        
        // Then delete old completed orders
        await supabase
          .from('orders')
          .delete()
          .in('id', oldOrderIds);
      }

      // Fetch orders for this canteen
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('canteen_id', canteenData.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching orders:', error);
      } else {
        const formattedOrders = (ordersData || []).map(order => ({
          ...order,
          items: order.order_items,
        }));
        setOrders(formattedOrders);
        setTodayIncome(calculateTodayIncome(formattedOrders));
        setMonthlyIncome(calculateMonthlyIncome(formattedOrders));

        // Fetch customer names
        const userIds = [...new Set(formattedOrders.map(o => o.user_id))];
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, name')
            .in('id', userIds);
          
          if (profiles) {
            const customerMap: Record<string, string> = {};
            profiles.forEach((p: CustomerProfile) => {
              customerMap[p.id] = p.name;
            });
            setCustomers(customerMap);
          }
        }
      }
      setIsLoading(false);
    };

    fetchData();
  }, [user]);

  // Set up realtime subscription
  useEffect(() => {
    if (!canteen?.id) return;

    const channel = supabase
      .channel('vendor-orders')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `canteen_id=eq.${canteen.id}`,
        },
        async (payload) => {
          const newOrder = payload.new as any;
          const oldOrder = payload.old as any;
          
          // Check if payment just became successful (payment_status changed to 'paid')
          if (newOrder.payment_status === 'paid' && oldOrder.payment_status !== 'paid') {
            // Fetch the complete order with items
            const { data } = await supabase
              .from('orders')
              .select(`*, order_items (*)`)
              .eq('id', newOrder.id)
              .single();
            
            if (data) {
              // Add new paid order to the list
              setOrders(prev => {
                // Check if order already exists (avoid duplicates)
                const exists = prev.some(o => o.id === data.id);
                if (exists) {
                  return prev.map(o => o.id === data.id ? { ...data, items: data.order_items } : o);
                }
                return [{ ...data, items: data.order_items }, ...prev];
              });
              
              // Fetch customer name for notification
              let customerName = customers[data.user_id] || 'Customer';
              if (!customers[data.user_id]) {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('id, name')
                  .eq('id', data.user_id)
                  .single();
                
                if (profile) {
                  customerName = profile.name;
                  setCustomers(prev => ({ ...prev, [profile.id]: profile.name }));
                }
              }
              
              // Format order items for notification
              const orderItems = data.order_items || [];
              const itemsSummary = orderItems
                .map((item: any) => `${item.quantity}x ${item.name}`)
                .join(', ');
              
              // Play notification sound
              playNotificationSound();
              
              // Show enhanced toast notification with student name and items
              toast.custom(
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
                      toast.dismiss(t);
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
                      onClick={() => toast.dismiss(t)}
                    >
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 text-white flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm leading-tight">{customerName} • ₹{Number(data.total).toFixed(0)}</p>
                          <p className="text-xs text-white/80 truncate">{itemsSummary}</p>
                        </div>
                        <span className="text-white/60 text-xs">×</span>
                      </div>
                    </div>
                  );
                },
                { duration: 8000 }
              );
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `canteen_id=eq.${canteen.id}`,
        },
        (payload) => {
          setOrders(prev => {
            const updatedOrders = prev.map(order => 
              order.id === payload.new.id 
                ? { ...order, ...payload.new }
                : order
            );
            // Recalculate income when order status changes
            setTodayIncome(calculateTodayIncome(updatedOrders));
            setMonthlyIncome(calculateMonthlyIncome(updatedOrders));
            return updatedOrders;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [canteen?.id, customers]);

  const handleMarkReady = async (orderId: string) => {
    // Get order details first
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      toast.error('Order not found');
      return;
    }

    const { error } = await supabase
      .from('orders')
      .update({ status: 'ready' })
      .eq('id', orderId);
    
    if (error) {
      toast.error('Failed to update order');
      return;
    }

    toast.success('Order marked as ready!');
    
    // Trigger email notification to customer
    console.log("Order marked ready - triggering email for order:", orderId);
    
    try {
      const { data, error: emailError } = await supabase.functions.invoke('send-brevo-email', {
        body: {
          order_id: orderId,
          user_id: order.user_id,
          pickup_code: order.pickup_code,
          canteen_id: canteen?.id || '',
          canteen_name: canteen?.name || ''
        }
      });

      if (emailError) {
        console.error('Error sending order ready email:', emailError);
      } else {
        console.log('Order ready email sent successfully:', data);
      }
    } catch (err) {
      console.error('Failed to trigger order ready email:', err);
    }
  };

  const handleMarkCompleted = async (orderId: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'completed' })
      .eq('id', orderId);
    
    if (error) {
      toast.error('Failed to update order');
    } else {
      // Show enhanced green success toast
      toast.custom(
        (t) => (
          <div 
            className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border border-green-400/30 animate-in slide-in-from-top-5 duration-300"
            style={{ 
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            }}
            onClick={() => toast.dismiss(t)}
          >
            <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-white text-base">Order Completed!</p>
              <p className="text-white/80 text-sm">Customer picked up successfully</p>
            </div>
            <div className="text-2xl">🎉</div>
          </div>
        ),
        { duration: 4000 }
      );
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order || !canteen) {
      toast.error('Order not found');
      return;
    }

    // Get item IDs for ETA calculation
    const itemIds = order.items?.map(item => item.menu_item_id) || [];

    // Calculate ETA using database function
    const { data: etaData, error: etaError } = await supabase
      .rpc('calculate_order_eta', {
        p_canteen_id: canteen.id,
        p_item_ids: itemIds
      });

    if (etaError) {
      console.error('Error calculating ETA:', etaError);
      toast.error('Failed to calculate ETA');
      return;
    }

    // Update order status to 'accepted' and set ETA
    const { error } = await supabase
      .from('orders')
      .update({ 
        status: 'accepted',
        estimated_ready_time: etaData
      })
      .eq('id', orderId);
    
    if (error) {
      toast.error('Failed to accept order');
      return;
    }

    toast.success('Order accepted! Timer started.');
  };

  const handleRejectOrder = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order || !canteen) {
      toast.error('Order not found');
      return;
    }

    // Update order status to rejected
    const { error: orderError } = await supabase
      .from('orders')
      .update({ status: 'rejected' })
      .eq('id', orderId);

    if (orderError) {
      toast.error('Failed to reject order');
      return;
    }

    // Create rejection notification for the student
    const { error: notifError } = await supabase
      .from('order_rejection_notifications')
      .insert({
        order_id: orderId,
        user_id: order.user_id,
        canteen_id: canteen.id,
        canteen_name: canteen.name,
        rejection_reason: 'Unable to fulfill order at this time'
      });

    if (notifError) {
      console.error('Failed to create rejection notification:', notifError);
    }

    // Remove order from local state
    setOrders(prev => prev.filter(o => o.id !== orderId));
    toast.success('Order rejected. Student has been notified.');
  };

  const handleToggleOpen = async () => {
    if (!canteen) return;
    
    const newStatus = !canteen.is_open;
    const { error } = await supabase
      .from('canteens')
      .update({ is_open: newStatus })
      .eq('id', canteen.id);
    
    if (error) {
      toast.error('Failed to update canteen status');
    } else {
      setCanteen({ ...canteen, is_open: newStatus });
      toast.success(newStatus ? 'Canteen is now open!' : 'Canteen is now closed');
    }
  };

  const handleCompleteByCode = async () => {
    if (!pickupCode.trim()) {
      toast.error('Please enter a pickup code');
      return;
    }

    const order = orders.find(o => o.pickup_code === pickupCode.trim() && o.status === 'ready');
    if (!order) {
      toast.error('No ready order found with this pickup code');
      return;
    }

    await handleMarkCompleted(order.id);
    setPickupCode('');
  };

  const handleQRScan = async (qrToken: string) => {
    const result = await verifyCanteenOrder(qrToken);
    if (result.success) {
      // Update local state to reflect the completed order
      setOrders(prev => prev.map(order => 
        order.id === result.orderId 
          ? { ...order, status: 'completed' as const }
          : order
      ));
      // Show enhanced green success toast
      toast.custom(
        (t) => (
          <div 
            className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border border-green-400/30 animate-in slide-in-from-top-5 duration-300"
            style={{ 
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            }}
            onClick={() => toast.dismiss(t)}
          >
            <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-white text-base">Order Completed!</p>
              <p className="text-white/80 text-sm">Customer picked up successfully</p>
            </div>
            <div className="text-2xl">🎉</div>
          </div>
        ),
        { duration: 4000 }
      );
    }
    return result;
  };

  // Only show orders that are paid
  const paidOrders = orders.filter(o => o.payment_status === 'paid');
  // Pending tab shows both 'pending' (awaiting acceptance) and 'accepted' (in progress) orders
  const pendingOrders = paidOrders.filter(o => o.status === 'pending');
  const acceptedOrders = paidOrders.filter(o => o.status === 'accepted');
  const inProgressOrders = [...pendingOrders, ...acceptedOrders];
  const readyOrders = paidOrders.filter(o => o.status === 'ready');
  const completedOrders = paidOrders.filter(o => o.status === 'completed');
  // Both pending and accepted orders count toward the limit
  const activeOrderCount = inProgressOrders.length;

  const handleOrderLimitUpdate = (limit: number | null) => {
    if (canteen) {
      setCanteen({ ...canteen, order_limit: limit });
    }
  };

  const handleStockModeChange = (mode: 'simple' | 'daily') => {
    if (canteen) {
      setCanteen({ ...canteen, stock_mode: mode });
    }
  };

  // Get urgency priority for sorting (lower = more urgent)
  const getUrgencyPriority = (order: Order): number => {
    if (!order.estimated_ready_time) return 3; // No ETA, lowest priority
    const now = new Date();
    const eta = new Date(order.estimated_ready_time);
    const minutesRemaining = Math.floor((eta.getTime() - now.getTime()) / 60000);
    
    if (minutesRemaining <= 0) return 0; // Overdue - highest priority
    if (minutesRemaining <= 5) return 1; // Warning - medium priority
    return 2; // On-time - lower priority
  };

  const getFilteredOrders = () => {
    let tabOrders: Order[];
    switch (activeTab) {
      case 'pending': tabOrders = inProgressOrders; break; // Show both pending and accepted
      case 'ready': tabOrders = readyOrders; break;
      case 'completed': tabOrders = completedOrders; break;
      default: tabOrders = [];
    }
    
    // Sort in-progress orders: pending first (need action), then accepted by urgency
    if (activeTab === 'pending') {
      tabOrders = [...tabOrders].sort((a, b) => {
        // Pending orders (need acceptance) first
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        
        // For accepted orders, sort by urgency
        if (a.status === 'accepted' && b.status === 'accepted') {
          const priorityA = getUrgencyPriority(a);
          const priorityB = getUrgencyPriority(b);
          if (priorityA !== priorityB) return priorityA - priorityB;
          // If same priority, sort by ETA (earlier first)
          const etaA = a.estimated_ready_time ? new Date(a.estimated_ready_time).getTime() : Infinity;
          const etaB = b.estimated_ready_time ? new Date(b.estimated_ready_time).getTime() : Infinity;
          return etaA - etaB;
        }
        return 0;
      });
    }
    
    if (!searchQuery.trim()) return tabOrders;
    
    const query = searchQuery.toLowerCase().trim();
    return tabOrders.filter(order => {
      const customerName = customers[order.user_id]?.toLowerCase() || '';
      return customerName.includes(query);
    });
  };

  const tabs = [
    { key: 'pending' as TabType, label: 'In Progress', count: inProgressOrders.length, icon: Clock },
    { key: 'ready' as TabType, label: 'Ready', count: readyOrders.length, icon: Package },
    { key: 'completed' as TabType, label: 'Completed', count: completedOrders.length, icon: CheckCircle },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-mcd-cream">
        <div className="page-container flex justify-center py-12">
          <LoadingSpinner text="Loading orders..." />
        </div>
      </div>
    );
  }

  if (!canteen) {
    return (
      <div className="min-h-screen bg-mcd-cream">
        <div className="page-container">
          <EmptyState
            icon={ClipboardList}
            title="No canteen registered"
            description="Please register your canteen first to start receiving orders"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mcd-cream">
      {/* Approval Status Banner */}
      {canteen.approval_status === 'pending' && (
        <div className="bg-amber-500 text-white px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <p className="font-medium">Your canteen registration is under review. It will be visible to students after admin approval.</p>
          </div>
        </div>
      )}
      {canteen.approval_status === 'rejected' && (
        <div className="bg-destructive text-destructive-foreground px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-2">
            <XCircle className="h-5 w-5" />
            <p className="font-medium">Your canteen registration was rejected. Please contact support for more information.</p>
          </div>
        </div>
      )}
      {/* Banned Warning Banner */}
      {isBanned && (
        <div className="bg-destructive text-destructive-foreground px-4 py-3 text-center">
          <p className="font-semibold">Your canteen has been suspended. You cannot accept new orders. Please contact support.</p>
        </div>
      )}
      {/* Custom Vendor Header */}
      <header className="sticky top-0 z-50 bg-mcd-cream border-b border-mcd-border shadow-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <Logo size="sm" />
              <div className="h-8 w-px bg-mcd-border hidden sm:block" />
              <div className="min-w-0 hidden sm:block">
                <h1 className="text-base md:text-xl font-bold font-poppins text-mcd-text truncate">{canteen.name}</h1>
                <p className="text-xs md:text-sm text-mcd-text/70 truncate">{canteen.location}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-4 shrink-0">
              <div className="flex items-center gap-1 md:gap-2">
                <span className={`text-xs md:text-sm font-medium ${canteen.is_open ? 'text-green-600' : 'text-mcd-red'}`}>
                  {canteen.is_open ? 'Open' : 'Closed'}
                </span>
                <Switch 
                  checked={canteen.is_open} 
                  onCheckedChange={handleToggleOpen}
                />
              </div>
              <Button asChild className="hidden md:flex bg-mcd-yellow hover:bg-mcd-yellow/90 text-mcd-text font-bold border-0">
                <Link to="/vendor/menu">
                  <Plus className="h-4 w-4 mr-2" />
                  Manage Menu
                </Link>
              </Button>
              <Button asChild className="hidden md:flex" variant="outline">
                <Link to="/vendor/coupons">
                  <Tag className="h-4 w-4 mr-2" />
                  Coupons
                </Link>
              </Button>
              <Button asChild size="icon" className="md:hidden bg-mcd-yellow hover:bg-mcd-yellow/90 text-mcd-text">
                <Link to="/vendor/menu">
                  <Plus className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="icon" variant="outline" className="md:hidden">
                <Link to="/vendor/coupons">
                  <Tag className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="ghost" onClick={logout} className="hidden md:flex text-mcd-text hover:text-mcd-red hover:bg-mcd-selected">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
              <Button variant="ghost" size="icon" onClick={logout} className="md:hidden text-mcd-text hover:text-mcd-red hover:bg-mcd-selected">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="page-container">
        {/* Income Card */}
        <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-600 rounded-lg p-2.5 md:p-3 mb-4 md:mb-5 shadow-card">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="grid grid-cols-2 gap-2 md:gap-4">
                <div>
                  <p className="text-white/80 text-[10px] font-medium">Today's Income</p>
                  <p className="text-white text-base md:text-lg font-bold font-poppins">
                    ₹ {todayIncome.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="border-l border-white/20 pl-2 md:pl-4">
                  <p className="text-white/80 text-[10px] font-medium">This Month</p>
                  <p className="text-white text-base md:text-lg font-bold font-poppins">
                    ₹ {monthlyIncome.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white/20 p-1.5 md:p-2 rounded-full ml-2 hidden sm:block">
              <IndianRupee className="h-4 w-4 md:h-5 md:w-5 text-white" />
            </div>
          </div>
        </div>

        {/* AI Demand Prediction */}
        <DemandPrediction canteenId={canteen.id} />

        {/* Daily Stock Manager */}
        <DailyStockManager
          canteenId={canteen.id}
          stockMode={canteen.stock_mode || 'simple'}
          onStockModeChange={handleStockModeChange}
        />

        {/* Order Limit Settings */}
        <div className="mb-6 md:mb-8">
          <OrderLimitSettings
            canteenId={canteen.id}
            currentLimit={canteen.order_limit}
            activeOrderCount={activeOrderCount}
            onUpdate={handleOrderLimitUpdate}
          />
        </div>

        {/* Complete Order by QR Code */}
        <div className="bg-white rounded-xl border border-mcd-border p-4 md:p-6 mb-6 md:mb-8 shadow-card">
          <h2 className="text-lg md:text-xl font-bold font-poppins text-mcd-text mb-1">
            Complete an Order
          </h2>
          <p className="text-xs md:text-sm text-mcd-text/70 mb-3 md:mb-4">
            Scan student's QR code or enter pickup code manually
          </p>
          
          {/* QR Scan Button */}
          <Button 
            onClick={() => setIsScannerOpen(true)}
            className="w-full mb-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 text-lg"
          >
            <QrCode className="h-6 w-6 mr-3" />
            Scan QR Code
          </Button>
          
          {/* Manual Pickup Code Entry (fallback) */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-mcd-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">or enter manually</span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mt-4">
            <Input
              placeholder="Enter Pickup Code"
              value={pickupCode}
              onChange={(e) => setPickupCode(e.target.value.toUpperCase())}
              className="flex-1 bg-mcd-selected border-mcd-border focus:border-mcd-yellow"
              onKeyDown={(e) => e.key === 'Enter' && handleCompleteByCode()}
            />
            <Button 
              onClick={handleCompleteByCode}
              variant="outline"
              className="border-mcd-yellow text-mcd-text hover:bg-mcd-yellow font-bold px-6 md:px-8 w-full sm:w-auto"
            >
              Complete Order
            </Button>
          </div>
        </div>

        {/* QR Scanner Modal */}
        <QRCodeScanner
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScan={handleQRScan}
          title="Scan Student QR Code"
        />

        {/* Search and Tab Navigation */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4 md:mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name..."
              className="pl-10 pr-10 bg-white border-mcd-border"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-mcd-selected rounded"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 sm:pb-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isActive 
                      ? 'bg-mcd-yellow text-mcd-text' 
                      : 'bg-mcd-selected text-mcd-text/70 hover:bg-mcd-yellow/30'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 md:h-4 md:w-4 ${isActive ? 'text-mcd-text' : 'text-mcd-red'}`} />
                  {tab.label} ({tab.count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Orders Grid */}
        {getFilteredOrders().length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getFilteredOrders().map((order, index) => (
              <div
                key={order.id}
                className="animate-fade-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <VendorOrderCard
                  order={order}
                  customerName={customers[order.user_id]}
                  onMarkReady={handleMarkReady}
                  onMarkCompleted={handleMarkCompleted}
                  onAcceptOrder={handleAcceptOrder}
                  onRejectOrder={handleRejectOrder}
                  showAcceptReject={order.status === 'pending'}
                />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ClipboardList}
            title={`No ${activeTab} orders`}
            description={activeTab === 'pending' ? 'New orders will appear here' : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} orders will appear here`}
          />
        )}
      </main>
    </div>
  );
}
