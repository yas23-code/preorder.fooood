import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay } from 'date-fns';
import { ArrowLeft, Store, MapPin, Clock, ShoppingBag, Ban, CheckCircle, IndianRupee, AlertTriangle, CalendarIcon } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { BanModal } from './BanModal';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface CanteenDetailViewProps {
  canteenId: string;
  onBack: () => void;
}

interface Canteen {
  id: string;
  name: string;
  location: string;
  vendor_email?: string;
  is_open: boolean;
  created_at: string;
}

interface Order {
  id: string;
  total: number;
  status: string;
  payment_status: string;
  created_at: string;
  customer_name?: string;
  estimated_ready_time?: string;
}

interface BanInfo {
  id: string;
  reason: string;
  ban_type: string;
  expires_at: string | null;
  created_at: string;
  is_active: boolean;
}

export function CanteenDetailView({ canteenId, onBack }: CanteenDetailViewProps) {
  const [canteen, setCanteen] = useState<Canteen | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [banInfo, setBanInfo] = useState<BanInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBanModal, setShowBanModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch canteen data
      const { data: canteenData, error: canteenError } = await supabase
        .from('canteens')
        .select('*')
        .eq('id', canteenId)
        .single();

      if (canteenError) throw canteenError;
      setCanteen(canteenData);

      // Fetch orders with customer info for selected date
      const dayStart = startOfDay(selectedDate).toISOString();
      const dayEnd = endOfDay(selectedDate).toISOString();

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id, total, status, payment_status, created_at, user_id, estimated_ready_time,
          profiles (name)
        `)
        .eq('canteen_id', canteenId)
        .eq('payment_status', 'paid')
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData?.map(o => ({
        ...o,
        customer_name: (o.profiles as any)?.name
      })) || []);

      // Fetch active ban
      const { data: banData } = await supabase
        .from('bans')
        .select('*')
        .eq('target_id', canteenId)
        .eq('target_type', 'canteen')
        .eq('is_active', true)
        .maybeSingle();

      setBanInfo(banData);
    } catch (error) {
      console.error('Error fetching canteen data:', error);
      toast.error('Failed to load canteen data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [canteenId, selectedDate]);

  // Realtime subscription for orders
  useEffect(() => {
    const channel = supabase
      .channel(`admin-canteen-orders-${canteenId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `canteen_id=eq.${canteenId}`
        },
        async (payload) => {
          const dayStart = startOfDay(selectedDate).toISOString();
          const dayEnd = endOfDay(selectedDate).toISOString();

          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as any;
            // Only add if it's within the selected date and paid
            if (newOrder.payment_status === 'paid' && 
                newOrder.created_at >= dayStart && 
                newOrder.created_at <= dayEnd) {
              // Fetch customer name
              const { data: profile } = await supabase
                .from('profiles')
                .select('name')
                .eq('id', newOrder.user_id)
                .single();
              
              setOrders(prev => [{
                ...newOrder,
                customer_name: profile?.name
              }, ...prev]);
              toast.success('New order received!');
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new as any;
            setOrders(prev => prev.map(o => 
              o.id === updatedOrder.id 
                ? { ...o, ...updatedOrder }
                : o
            ));
          } else if (payload.eventType === 'DELETE') {
            const deletedOrder = payload.old as any;
            setOrders(prev => prev.filter(o => o.id !== deletedOrder.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [canteenId, selectedDate]);

  const handleUnban = async () => {
    if (!banInfo) return;

    try {
      const { error } = await supabase
        .from('bans')
        .update({ is_active: false })
        .eq('id', banInfo.id);

      if (error) throw error;

      toast.success('Canteen has been unbanned');
      setBanInfo(null);
    } catch (error) {
      console.error('Error unbanning:', error);
      toast.error('Failed to unban canteen');
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading canteen data..." />;
  }

  if (!canteen) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Canteen not found</p>
        <Button onClick={onBack} variant="outline" className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Search
        </Button>
      </div>
    );
  }

  const totalEarnings = orders.reduce((sum, o) => sum + Number(o.total), 0);
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const readyOrders = orders.filter(o => o.status === 'ready');
  
  // Calculate delayed ready orders (ready but past estimated time)
  const now = new Date();
  const delayedReadyOrders = readyOrders.filter(o => {
    if (!o.estimated_ready_time) return false;
    return new Date(o.estimated_ready_time) < now;
  });

  return (
    <div className="space-y-6">
      <Button onClick={onBack} variant="ghost" className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Search
      </Button>

      {/* Canteen Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              Canteen Profile
            </div>
            <div className="flex gap-2">
              {banInfo ? (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <Ban className="h-3 w-3" />
                  Banned
                </Badge>
              ) : (
                <Badge variant="default" className="flex items-center gap-1 bg-green-500">
                  <CheckCircle className="h-3 w-3" />
                  Active
                </Badge>
              )}
              <Badge variant={canteen.is_open ? 'default' : 'secondary'}>
                {canteen.is_open ? 'Open' : 'Closed'}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Name:</span>
              <span>{canteen.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Location:</span>
              <span>{canteen.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Registered:</span>
              <span>{format(new Date(canteen.created_at), 'PPP')}</span>
            </div>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Total Orders:</span>
              <span>{orders.length}</span>
            </div>
          </div>

          {/* Order Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="bg-primary/10 rounded-lg p-4">
              <div className="flex items-center gap-2 text-primary mb-1">
                <IndianRupee className="h-5 w-5" />
                <span className="text-sm font-medium">Earnings</span>
              </div>
              <p className="text-2xl font-bold">₹{totalEarnings.toFixed(0)}</p>
            </div>
            <div className="bg-yellow-500/10 rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-600 mb-1">
                <Clock className="h-5 w-5" />
                <span className="text-sm font-medium">Pending</span>
              </div>
              <p className="text-2xl font-bold">{pendingOrders.length}</p>
            </div>
            <div className="bg-blue-500/10 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <ShoppingBag className="h-5 w-5" />
                <span className="text-sm font-medium">Ready</span>
              </div>
              <p className="text-2xl font-bold">{readyOrders.length}</p>
            </div>
            <div className="bg-green-500/10 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Completed</span>
              </div>
              <p className="text-2xl font-bold">{completedOrders}</p>
            </div>
          </div>

          {/* Delayed Orders Warning */}
          {delayedReadyOrders.length > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-orange-600 mb-2">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-semibold">Delayed Ready Orders ({delayedReadyOrders.length})</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                These orders are marked as ready but have exceeded their estimated pickup time.
              </p>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {delayedReadyOrders.map(order => (
                  <div key={order.id} className="flex justify-between items-center bg-background/50 rounded p-2 text-sm">
                    <span>{order.customer_name || 'Unknown'}</span>
                    <div className="text-right">
                      <span className="text-muted-foreground">Ready since: </span>
                      <span className="font-medium">
                        {order.estimated_ready_time 
                          ? format(new Date(order.estimated_ready_time), 'p')
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ban Info */}
          {banInfo && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mt-4">
              <h4 className="font-semibold text-destructive mb-2">Ban Details</h4>
              <p><span className="font-medium">Reason:</span> {banInfo.reason}</p>
              <p><span className="font-medium">Type:</span> {banInfo.ban_type}</p>
              {banInfo.expires_at && (
                <p><span className="font-medium">Expires:</span> {format(new Date(banInfo.expires_at), 'PPP')}</p>
              )}
              <p><span className="font-medium">Banned on:</span> {format(new Date(banInfo.created_at), 'PPP')}</p>
            </div>
          )}

          {/* Ban/Unban Actions */}
          <div className="flex gap-2 pt-4">
            {banInfo ? (
              <Button variant="outline" onClick={handleUnban}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Unban Canteen
              </Button>
            ) : (
              <Button variant="destructive" onClick={() => setShowBanModal(true)}>
                <Ban className="h-4 w-4 mr-2" />
                Ban Canteen
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Order History Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Orders for {format(selectedDate, 'PPP')}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No orders found for this date</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {orders.map(order => (
                <div key={order.id} className={cn(
                  "border rounded-lg p-3",
                  order.status === 'ready' && order.estimated_ready_time && new Date(order.estimated_ready_time) < now
                    ? "bg-orange-50 border-orange-200"
                    : "bg-muted/30"
                )}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{order.customer_name || 'Unknown Customer'}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(order.created_at), 'PPp')}
                      </p>
                      {order.estimated_ready_time && (
                        <p className="text-xs text-muted-foreground">
                          ETA: {format(new Date(order.estimated_ready_time), 'p')}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">₹{Number(order.total).toFixed(0)}</p>
                      <Badge 
                        variant={
                          order.status === 'completed' ? 'default' : 
                          order.status === 'ready' ? 'secondary' : 
                          'outline'
                        }
                        className={cn(
                          order.status === 'pending' && "bg-yellow-100 text-yellow-800 border-yellow-300",
                          order.status === 'ready' && "bg-blue-100 text-blue-800 border-blue-300"
                        )}
                      >
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <BanModal
        isOpen={showBanModal}
        onClose={() => setShowBanModal(false)}
        targetId={canteenId}
        targetType="canteen"
        targetName={canteen.name}
        onBanComplete={fetchData}
      />
    </div>
  );
}
