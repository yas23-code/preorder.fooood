import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useCollegeLocation } from '@/hooks/useCollegeLocation';
import { ArrowLeft, ClipboardList, MapPin, Clock, Trash2, X, Building2, Store } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Order } from '@/lib/types';
import { format } from 'date-fns';

interface ShopOrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface ShopOrder {
  id: string;
  pickup_code: string;
  status: string;
  total: number;
  created_at: string;
  payment_status: string;
  estimated_ready_time: string | null;
  order_no: number | null;
  qr_token: string | null;
  qr_used: boolean;
  shop: {
    shop_name: string;
    address: string;
  } | null;
  shop_order_items: ShopOrderItem[];
}

type OrderTab = 'canteen' | 'shop';

const statusConfig = {
  pending: {
    label: 'awaiting confirmation',
    className: 'bg-amber-500 text-white hover:bg-amber-600',
  },
  accepted: {
    label: 'preparing',
    className: 'bg-blue-500 text-white hover:bg-blue-600',
  },
  confirmed: {
    label: 'confirmed',
    className: 'bg-blue-500 text-white hover:bg-blue-600',
  },
  ready: {
    label: 'ready',
    className: 'bg-green-500 text-white hover:bg-green-600',
  },
  completed: {
    label: 'completed',
    className: 'bg-gray-500 text-white hover:bg-gray-600',
  },
  rejected: {
    label: 'rejected',
    className: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  },
  cancelled: {
    label: 'cancelled',
    className: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  },
};

export default function StudentOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [shopOrders, setShopOrders] = useState<ShopOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isShopLoading, setIsShopLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Location-aware - strictly enforce visibility based on location
  const { isInsideCampus, isLoading: isLocationLoading } = useCollegeLocation();
  
  // Determine the active tab strictly based on location (no user toggle allowed)
  const activeTab: OrderTab = isInsideCampus === false ? 'shop' : 'canteen';
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [canteenFilter, setCanteenFilter] = useState<string>('all');
  const [shopFilter, setShopFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

  useEffect(() => {
    if (!user) return;

    const fetchOrders = async () => {
      // First, cleanup orders older than 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const cutoffDate = sevenDaysAgo.toISOString();

      // Get old orders to delete their items first
      const { data: oldOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', user.id)
        .lt('created_at', cutoffDate);

      if (oldOrders && oldOrders.length > 0) {
        const oldOrderIds = oldOrders.map(o => o.id);
        
        // Delete order items first
        await supabase
          .from('order_items')
          .delete()
          .in('order_id', oldOrderIds);
        
        // Then delete old orders
        await supabase
          .from('orders')
          .delete()
          .eq('user_id', user.id)
          .lt('created_at', cutoffDate);
      }

      // Now fetch remaining orders
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*),
          canteens (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching orders:', error);
      } else {
        const formattedOrders: Order[] = (ordersData || []).map(order => ({
          id: order.id,
          user_id: order.user_id,
          canteen_id: order.canteen_id,
          total: order.total,
          status: order.status,
          pickup_code: order.pickup_code,
          payment_status: (order as { payment_status?: string }).payment_status,
          estimated_ready_time: (order as { estimated_ready_time?: string }).estimated_ready_time,
          qr_token: (order as { qr_token?: string | null }).qr_token,
          qr_used: (order as { qr_used?: boolean }).qr_used,
          order_no: (order as { order_no?: number | null }).order_no,
          created_at: order.created_at,
          updated_at: order.updated_at,
          items: order.order_items,
          canteen: order.canteens,
        }));
        setOrders(formattedOrders);
      }
      setIsLoading(false);
    };

    fetchOrders();

    // Set up realtime subscription for order updates
    const channel = supabase
      .channel('student-orders')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setOrders(prev => 
            prev.map(order => 
              order.id === payload.new.id 
                ? { ...order, status: payload.new.status as Order['status'] }
                : order
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Fetch shop orders
  useEffect(() => {
    if (!user) return;

    const fetchShopOrders = async () => {
      const { data, error } = await supabase
        .from('shop_orders')
        .select(`
          id,
          pickup_code,
          status,
          total,
          created_at,
          payment_status,
          estimated_ready_time,
          order_no,
          qr_token,
          qr_used,
          shop:shops(shop_name, address),
          shop_order_items(id, name, quantity, price)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setShopOrders(data as unknown as ShopOrder[]);
      }
      setIsShopLoading(false);
    };

    fetchShopOrders();

    // Real-time subscription for shop orders
    const channel = supabase
      .channel('student-shop-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shop_orders',
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchShopOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Get unique canteens for filter dropdown
  const canteens = useMemo(() => {
    const uniqueCanteens = new Map();
    orders.forEach(order => {
      if (order.canteen) {
        uniqueCanteens.set(order.canteen.id, order.canteen.name);
      }
    });
    return Array.from(uniqueCanteens, ([id, name]) => ({ id, name }));
  }, [orders]);

  // Get unique shops for filter dropdown
  const shops = useMemo(() => {
    const uniqueShops = new Map();
    shopOrders.forEach(order => {
      if (order.shop) {
        uniqueShops.set(order.shop.shop_name, order.shop.shop_name);
      }
    });
    return Array.from(uniqueShops, ([name]) => ({ name }));
  }, [shopOrders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Status filter
      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false;
      }
      
      // Canteen filter
      if (canteenFilter !== 'all' && order.canteen_id !== canteenFilter) {
        return false;
      }
      
      // Date filter
      if (dateFilter) {
        const orderDate = format(new Date(order.created_at), 'yyyy-MM-dd');
        if (orderDate !== dateFilter) {
          return false;
        }
      }
      
      return true;
    });
  }, [orders, statusFilter, canteenFilter, dateFilter]);

  // Filtered shop orders
  const filteredShopOrders = useMemo(() => {
    return shopOrders.filter(order => {
      // Status filter
      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false;
      }
      
      // Shop filter
      if (shopFilter !== 'all' && order.shop?.shop_name !== shopFilter) {
        return false;
      }
      
      // Date filter
      if (dateFilter) {
        const orderDate = format(new Date(order.created_at), 'yyyy-MM-dd');
        if (orderDate !== dateFilter) {
          return false;
        }
      }
      
      return true;
    });
  }, [shopOrders, statusFilter, shopFilter, dateFilter]);

  const resetFilters = () => {
    setStatusFilter('all');
    setCanteenFilter('all');
    setShopFilter('all');
    setDateFilter('');
  };

  const clearOrderHistory = async () => {
    if (!user || orders.length === 0) return;
    
    setIsClearing(true);
    try {
      // Delete all order items first (due to foreign key constraint)
      const orderIds = orders.map(o => o.id);
      
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .in('order_id', orderIds);
      
      if (itemsError) throw itemsError;
      
      // Then delete all orders
      const { error: ordersError } = await supabase
        .from('orders')
        .delete()
        .eq('user_id', user.id);
      
      if (ordersError) throw ordersError;
      
      setOrders([]);
      toast({
        title: 'History cleared',
        description: 'All orders have been removed from your history.',
      });
    } catch (error) {
      console.error('Error clearing order history:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear order history. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsClearing(false);
    }
  };

  const deleteOrder = async (orderId: string) => {
    setDeletingOrderId(orderId);
    try {
      // Delete order items first
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);
      
      if (itemsError) throw itemsError;
      
      // Then delete the order
      const { error: orderError } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);
      
      if (orderError) throw orderError;
      
      setOrders(prev => prev.filter(o => o.id !== orderId));
      toast({
        title: 'Order deleted',
        description: 'Order has been removed from your history.',
      });
    } catch (error) {
      console.error('Error deleting order:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete order. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeletingOrderId(null);
    }
  };

  const formatOrderDate = (dateString: string) => {
    return format(new Date(dateString), "MMMM do, yyyy h:mm a");
  };

  return (
    <div className="min-h-screen bg-mcd-cream">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-mcd-cream border-b border-mcd-border shadow-card">
        <div className="container mx-auto px-4 h-[72px] md:h-24 flex items-center">
          <Link 
            to="/student/dashboard"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-mcd-red transition-colors font-medium"
          >
            <ArrowLeft className="h-4 w-4 text-mcd-red" />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </Link>
          <h1 className="flex-1 text-center text-lg md:text-xl font-bold">Order History</h1>
          <div className="w-10 md:w-32" />
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-4 md:py-6 max-w-4xl">

        {/* Location-based header - shows which order type is visible */}
        <div className="flex p-3 bg-white rounded-xl shadow-card border border-mcd-border mb-4">
          <div className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-semibold text-sm bg-mcd-red text-white">
            {activeTab === 'canteen' ? (
              <>
                <Building2 className="w-5 h-5" />
                Canteen Orders
                {orders.length > 0 && (
                  <span className="ml-1 text-xs opacity-80">({orders.length})</span>
                )}
              </>
            ) : (
              <>
                <Store className="w-5 h-5" />
                Shop Orders
                {shopOrders.length > 0 && (
                  <span className="ml-1 text-xs opacity-80">({shopOrders.length})</span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Filters Card */}
        <div className="bg-white rounded-2xl shadow-card border border-mcd-border p-6 mb-6">
          <h2 className="text-xl font-bold text-foreground mb-1">Filters</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Filter orders by status, {activeTab === 'canteen' ? 'canteen' : 'shop'}, or date
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Status
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full bg-mcd-selected border-mcd-border">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  {activeTab === 'shop' && <SelectItem value="confirmed">Confirmed</SelectItem>}
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  {activeTab === 'shop' && <SelectItem value="cancelled">Cancelled</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            
            {/* Canteen/Shop Filter */}
            {activeTab === 'canteen' ? (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Canteen
                </label>
                <Select value={canteenFilter} onValueChange={setCanteenFilter}>
                  <SelectTrigger className="w-full bg-mcd-selected border-mcd-border">
                    <SelectValue placeholder="All Canteens" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Canteens</SelectItem>
                    {canteens.map(canteen => (
                      <SelectItem key={canteen.id} value={canteen.id}>
                        {canteen.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Shop
                </label>
                <Select value={shopFilter} onValueChange={setShopFilter}>
                  <SelectTrigger className="w-full bg-mcd-selected border-mcd-border">
                    <SelectValue placeholder="All Shops" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shops</SelectItem>
                    {shops.map(shop => (
                      <SelectItem key={shop.name} value={shop.name}>
                        {shop.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Date Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Date
              </label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full bg-mcd-selected border-mcd-border"
              />
            </div>
          </div>
          
          <div className="flex justify-between gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  disabled={(activeTab === 'canteen' ? orders.length === 0 : shopOrders.length === 0) || isClearing}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isClearing ? 'Clearing...' : 'Clear History'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear Order History?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {activeTab === 'canteen' ? orders.length : shopOrders.length} {activeTab} orders from your history. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={clearOrderHistory}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Clear All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button 
              variant="outline" 
              onClick={resetFilters}
              className="border-mcd-red text-mcd-red hover:bg-mcd-red hover:text-white"
            >
              Reset Filters
            </Button>
          </div>
        </div>

        {/* Canteen Orders List */}
        {activeTab === 'canteen' && (
          <>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner text="Loading orders..." />
              </div>
            ) : filteredOrders.length > 0 ? (
              <div className="space-y-4">
                {filteredOrders.map((order, index) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl shadow-card border border-mcd-border p-6 animate-fade-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Header with canteen name, status, order no, and delete button */}
                     <div className="flex items-start justify-between mb-3">
                       <div className="flex flex-wrap items-center gap-3">
                         <h3 className="text-xl font-bold text-foreground">
                           {order.canteen?.name || 'Unknown Canteen'}
                         </h3>
                         <Badge className={statusConfig[order.status]?.className || statusConfig.pending.className}>
                           {statusConfig[order.status]?.label || order.status}
                         </Badge>
                       </div>
                       <div className="flex items-center gap-2">
                       {order.order_no && (
                           <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                             <span className="text-xs font-medium">ORDER</span>
                             <span className="text-lg font-bold">#{order.order_no}</span>
                           </div>
                         )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            disabled={deletingOrderId === order.id}
                          >
                            {deletingOrderId === order.id ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this order?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove this order from your history. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteOrder(order.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                       </div>
                     </div>
                    
                    {/* Location */}
                    {order.canteen?.location && (
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm">{order.canteen.location}</span>
                      </div>
                    )}
                    
                    {/* Date */}
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">{formatOrderDate(order.created_at)}</span>
                    </div>
                    
                    {/* ETA Display - Only after vendor accepts order */}
                    {order.status === 'accepted' && order.estimated_ready_time && order.payment_status === 'paid' && (() => {
                      const minutesLeft = Math.ceil((new Date(order.estimated_ready_time).getTime() - Date.now()) / 60000);
                      const isOverdue = minutesLeft <= 0;
                      return isOverdue ? (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-red-600 animate-pulse" />
                            <span className="text-sm font-medium text-red-700">
                              😅 Sorry for the wait! Almost ready...
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-amber-600" />
                            <span className="text-sm font-medium text-amber-800">
                              ⏱ Ready in {minutesLeft} min (approx)
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                    
                    {/* Items and Total */}
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-foreground mb-1">Items:</p>
                        <div className="space-y-0.5">
                          {order.items?.map(item => (
                            <p key={item.id} className="text-sm text-muted-foreground">
                              {item.quantity}x {item.name}
                            </p>
                          ))}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-2xl md:text-3xl font-bold text-mcd-red">
                          ₹{Number(order.total).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Pickup Code Display - Only for paid orders */}
                    {order.payment_status === 'paid' && order.pickup_code && order.status !== 'completed' && order.status !== 'rejected' && (
                      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-4">
                        <p className="text-xs text-muted-foreground text-center mb-1">Pickup Code</p>
                        <p className="text-3xl font-bold text-primary text-center tracking-widest">
                          {order.pickup_code}
                        </p>
                      </div>
                    )}

                    {/* QR Code Display */}
                    <div className="mt-4 pt-4 border-t border-mcd-border">
                      <QRCodeDisplay
                        qrToken={order.qr_token || null}
                        orderStatus={order.status}
                        paymentStatus={order.payment_status || 'pending'}
                        qrUsed={order.qr_used}
                        size={160}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={ClipboardList}
                title="No canteen orders found"
                description={
                  statusFilter !== 'all' || canteenFilter !== 'all' || dateFilter
                    ? "Try adjusting your filters"
                    : "Your canteen orders will appear here"
                }
                action={
                  (statusFilter !== 'all' || canteenFilter !== 'all' || dateFilter) && (
                    <Button variant="outline" onClick={resetFilters} className="border-mcd-red text-mcd-red hover:bg-mcd-red hover:text-white">
                      Reset Filters
                    </Button>
                  )
                }
              />
            )}
          </>
        )}

        {/* Shop Orders List */}
        {activeTab === 'shop' && (
          <>
            {isShopLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner text="Loading shop orders..." />
              </div>
            ) : filteredShopOrders.length > 0 ? (
              <div className="space-y-4">
                {filteredShopOrders.map((order, index) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl shadow-card border border-mcd-border p-6 animate-fade-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Header with shop name and status */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-bold text-foreground">
                          {order.shop?.shop_name || 'Unknown Shop'}
                        </h3>
                        <Badge className={statusConfig[order.status as keyof typeof statusConfig]?.className || statusConfig.pending.className}>
                          {statusConfig[order.status as keyof typeof statusConfig]?.label || order.status}
                        </Badge>
                      </div>
                      {/* Order Number Badge */}
                      {order.order_no && (
                        <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg flex items-center gap-2">
                          <span className="text-xs font-medium">ORDER</span>
                          <span className="text-lg font-bold">#{order.order_no}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Address */}
                    {order.shop?.address && (
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm">{order.shop.address}</span>
                      </div>
                    )}
                    
                    {/* Date */}
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">{formatOrderDate(order.created_at)}</span>
                    </div>
                    
                    {/* ETA Display - Only after vendor accepts order */}
                    {order.status === 'accepted' && order.estimated_ready_time && order.payment_status === 'paid' && (() => {
                      const minutesLeft = Math.ceil((new Date(order.estimated_ready_time).getTime() - Date.now()) / 60000);
                      const isOverdue = minutesLeft <= 0;
                      return isOverdue ? (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-red-600 animate-pulse" />
                            <span className="text-sm font-medium text-red-700">
                              😅 Sorry for the wait! Almost ready...
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-amber-600" />
                            <span className="text-sm font-medium text-amber-800">
                              ⏱ Ready in {minutesLeft} min (approx)
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                    
                    {/* Items and Total */}
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-foreground mb-1">Items:</p>
                        <div className="space-y-0.5">
                          {order.shop_order_items?.map(item => (
                            <p key={item.id} className="text-sm text-muted-foreground">
                              {item.quantity}x {item.name}
                            </p>
                          ))}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-2xl md:text-3xl font-bold text-mcd-red">
                          ₹{Number(order.total).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Pickup Code Display - Only for paid orders */}
                    {order.payment_status === 'paid' && order.pickup_code && order.status !== 'completed' && order.status !== 'cancelled' && (
                      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-4">
                        <p className="text-xs text-muted-foreground text-center mb-1">Pickup Code</p>
                        <p className="text-3xl font-bold text-primary text-center tracking-widest">
                          {order.pickup_code}
                        </p>
                      </div>
                    )}

                    {/* QR Code Display */}
                    {order.status === 'cancelled' ? (
                      <div className="mt-4 pt-4 border-t border-mcd-border">
                        <div className="bg-destructive/10 rounded-xl p-4 text-center">
                          <p className="text-sm text-destructive font-medium">
                            This order was cancelled
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 pt-4 border-t border-mcd-border">
                        <QRCodeDisplay
                          qrToken={order.qr_token || null}
                          orderStatus={order.status}
                          paymentStatus={order.payment_status || 'pending'}
                          qrUsed={order.qr_used}
                          size={160}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Store}
                title="No shop orders found"
                description={
                  statusFilter !== 'all' || shopFilter !== 'all' || dateFilter
                    ? "Try adjusting your filters"
                    : "Your shop orders will appear here"
                }
                action={
                  (statusFilter !== 'all' || shopFilter !== 'all' || dateFilter) && (
                    <Button variant="outline" onClick={resetFilters} className="border-mcd-red text-mcd-red hover:bg-mcd-red hover:text-white">
                      Reset Filters
                    </Button>
                  )
                }
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
