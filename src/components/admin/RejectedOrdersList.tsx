import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, RefreshCw, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface RejectedOrder {
  id: string;
  total: number;
  pickup_code: string;
  created_at: string;
  payment_id: string | null;
  customer_phone: string | null;
  student: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  canteen: {
    name: string;
  };
  rejection_reason: string | null;
}

export function RejectedOrdersList() {
  const [orders, setOrders] = useState<RejectedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchRejectedOrders = async () => {
    setIsLoading(true);
    try {
      // Fetch rejected orders with student and canteen info
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          total,
          pickup_code,
          created_at,
          payment_id,
          customer_phone,
          user_id,
          canteen_id
        `)
        .eq('status', 'rejected')
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        setIsLoading(false);
        return;
      }

      // Get unique user IDs and canteen IDs
      const userIds = [...new Set(ordersData.map(o => o.user_id))];
      const canteenIds = [...new Set(ordersData.map(o => o.canteen_id))];

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email, phone')
        .in('id', userIds);

      // Fetch canteens
      const { data: canteens } = await supabase
        .from('canteens')
        .select('id, name')
        .in('id', canteenIds);

      // Fetch rejection notifications for reasons
      const { data: notifications } = await supabase
        .from('order_rejection_notifications')
        .select('order_id, rejection_reason')
        .in('order_id', ordersData.map(o => o.id));

      // Map data together
      const enrichedOrders: RejectedOrder[] = ordersData.map(order => {
        const student = profiles?.find(p => p.id === order.user_id);
        const canteen = canteens?.find(c => c.id === order.canteen_id);
        const notification = notifications?.find(n => n.order_id === order.id);

        return {
          id: order.id,
          total: order.total,
          pickup_code: order.pickup_code,
          created_at: order.created_at,
          payment_id: order.payment_id,
          customer_phone: order.customer_phone,
          student: {
            id: order.user_id,
            name: student?.name || 'Unknown',
            email: student?.email || 'Unknown',
            phone: student?.phone || null,
          },
          canteen: {
            name: canteen?.name || 'Unknown',
          },
          rejection_reason: notification?.rejection_reason || null,
        };
      });

      setOrders(enrichedOrders);
    } catch (error) {
      console.error('Error fetching rejected orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch rejected orders',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRejectedOrders();
  }, []);

  const copyToClipboard = (text: string, orderId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(orderId);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: 'Copied!',
      description: 'Payment ID copied to clipboard',
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Rejected Orders - Pending Refunds
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Rejected Orders - Pending Refunds
          {orders.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {orders.length}
            </Badge>
          )}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={fetchRejectedOrders}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No rejected orders pending refunds</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="border rounded-lg p-4 bg-destructive/5 border-destructive/20"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {order.student.name}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        #{order.pickup_code}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        <span className="font-medium">Email:</span> {order.student.email}
                      </p>
                      <p>
                        <span className="font-medium">Payment Phone:</span>{' '}
                        {order.customer_phone || <span className="text-muted-foreground italic">Not available</span>}
                      </p>
                      <p>
                        <span className="font-medium">Canteen:</span> {order.canteen.name}
                      </p>
                      <p>
                        <span className="font-medium">Date:</span>{' '}
                        {format(new Date(order.created_at), 'dd MMM yyyy, hh:mm a')}
                      </p>
                      {order.rejection_reason && (
                        <p>
                          <span className="font-medium">Reason:</span>{' '}
                          <span className="text-destructive">{order.rejection_reason}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-xl font-bold text-destructive">
                      ₹{order.total.toFixed(2)}
                    </div>
                    {order.payment_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => copyToClipboard(order.payment_id!, order.id)}
                      >
                        {copiedId === order.id ? (
                          <>
                            <Check className="h-3 w-3 mr-1" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 mr-1" />
                            Copy Payment ID
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            <div className="mt-4 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
              <p className="font-medium mb-1">💡 Refund Instructions:</p>
              <p>Use the Payment ID to process refunds through the Cashfree dashboard. Contact students via email or phone to confirm refund completion.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
