import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ShopOrderBottomBar } from '@/components/shops/ShopOrderBottomBar';
import { 
  ArrowLeft, 
  Store, 
  Clock,
  CheckCircle,
  Package,
  XCircle,
  Navigation
} from 'lucide-react';
import { format } from 'date-fns';

interface ShopOrder {
  id: string;
  shop_id: string;
  total: number;
  status: string;
  payment_status: string;
  pickup_code: string;
  customer_name: string;
  customer_phone: string;
  notes: string | null;
  created_at: string;
  estimated_ready_time: string | null;
  order_no: number | null;
  shop: {
    shop_name: string;
    image_url: string | null;
    latitude: number;
    longitude: number;
  };
  items: {
    id: string;
    name: string;
    price: number;
    quantity: number;
  }[];
}

// Opens external map app with navigation to the shop location
function openExternalMap(latitude: number, longitude: number, shopName: string) {
  const encodedName = encodeURIComponent(shopName);
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&destination_place_id=${encodedName}`;
  window.open(mapsUrl, '_blank');
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-yellow-500', icon: <Clock className="w-4 h-4" /> },
  confirmed: { label: 'Confirmed', color: 'bg-blue-500', icon: <CheckCircle className="w-4 h-4" /> },
  preparing: { label: 'Preparing', color: 'bg-orange-500', icon: <Package className="w-4 h-4" /> },
  ready: { label: 'Ready', color: 'bg-green-500', icon: <CheckCircle className="w-4 h-4" /> },
  completed: { label: 'Completed', color: 'bg-gray-500', icon: <CheckCircle className="w-4 h-4" /> },
  cancelled: { label: 'Cancelled', color: 'bg-red-500', icon: <XCircle className="w-4 h-4" /> },
};

export default function ShopOrders() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('shop_orders')
          .select(`
            *,
            shop:shops(shop_name, image_url, latitude, longitude),
            items:shop_order_items(id, name, price, quantity)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setOrders(data || []);
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();

    // Subscribe to real-time updates for shop orders
    const channel = supabase
      .channel('shop-orders-customer')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shop_orders',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          setOrders(prev => prev.map(order => 
            order.id === payload.new.id 
              ? { ...order, ...payload.new }
              : order
          ));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Get active orders (not completed or cancelled)
  const activeOrders = orders.filter(
    order => !['completed', 'cancelled'].includes(order.status) && order.payment_status === 'paid'
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
          <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/shops')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-semibold text-lg">My Orders</h1>
          </div>
        </div>
        <div className="container max-w-4xl mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground mb-4">Please login to view your orders</p>
          <Button onClick={() => navigate('/auth')}>Login</Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/shops')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-lg">My Shop Orders</h1>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 py-6">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Store className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold">No Orders Yet</h2>
            <p className="text-muted-foreground text-center max-w-sm">
              You haven't placed any orders from nearby shops yet.
            </p>
            <Button onClick={() => navigate('/shops')}>
              Browse Shops
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active Order ETA Countdown */}
            {activeOrders.map((order) => (
              order.estimated_ready_time && (
                <ShopOrderBottomBar
                  key={`eta-${order.id}`}
                  shopName={order.shop?.shop_name || 'Shop'}
                  estimatedReadyTime={order.estimated_ready_time}
                  orderId={order.id}
                  orderStatus={order.status}
                  pickupCode={order.pickup_code}
                />
              )
            ))}
            {orders.map((order) => {
              const status = statusConfig[order.status] || statusConfig.pending;
              
              return (
                <Card key={order.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        {order.shop?.image_url ? (
                          <img
                            src={order.shop.image_url}
                            alt={order.shop.shop_name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                            <Store className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold">{order.shop?.shop_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(order.created_at), 'MMM d, yyyy • h:mm a')}
                          </p>
                        </div>
                      </div>
                      <Badge className={`${status.color} text-white`}>
                        {status.icon}
                        <span className="ml-1">{status.label}</span>
                      </Badge>
                    </div>

                    {/* Order Number Badge */}
                    {order.order_no && (
                      <div className="flex items-center gap-2 mb-3">
                        <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg">
                          <span className="text-xs font-medium">ORDER NO</span>
                          <span className="ml-2 text-lg font-bold">{order.order_no}</span>
                        </div>
                      </div>
                    )}

                    {/* Order Items */}
                    <div className="bg-muted/50 rounded-lg p-3 mb-3">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm py-1">
                          <span>{item.quantity}x {item.name}</span>
                          <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="border-t mt-2 pt-2 flex justify-between font-semibold">
                        <span>Total</span>
                        <span className="text-primary">₹{order.total}</span>
                      </div>
                    </div>

                    {/* Pickup Code - Only show for paid orders */}
                    {order.payment_status === 'paid' && order.status !== 'completed' && order.status !== 'cancelled' && (
                      <div className="bg-primary/10 rounded-lg p-3 text-center">
                        <p className="text-sm text-muted-foreground mb-1">Pickup Code</p>
                        <p className="text-2xl font-bold tracking-widest text-primary">
                          {order.pickup_code}
                        </p>
                      </div>
                    )}

                    {/* Pending Payment Notice */}
                    {order.payment_status === 'pending' && (
                      <div className="bg-amber-500/10 rounded-lg p-3 text-center">
                        <p className="text-sm text-amber-600 font-medium">Payment Pending</p>
                        <p className="text-xs text-muted-foreground">Complete payment to get your pickup code</p>
                      </div>
                    )}

                    {/* View on Map - Show when order is ready for pickup */}
                    {order.status === 'ready' && order.shop?.latitude && order.shop?.longitude && (
                      <Button
                        variant="outline"
                        className="w-full mt-3 gap-2"
                        onClick={() => openExternalMap(
                          order.shop.latitude,
                          order.shop.longitude,
                          order.shop.shop_name
                        )}
                      >
                        <Navigation className="w-4 h-4" />
                        View on Map
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}