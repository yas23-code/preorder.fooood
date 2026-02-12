import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CanteenOrderStatus {
  canAcceptOrders: boolean;
  activeOrderCount: number;
  orderLimit: number | null;
  isAtLimit: boolean;
  isLoading: boolean;
}

export function useCanteenOrderStatus(canteenId: string | undefined): CanteenOrderStatus {
  const [canAcceptOrders, setCanAcceptOrders] = useState(true);
  const [activeOrderCount, setActiveOrderCount] = useState(0);
  const [orderLimit, setOrderLimit] = useState<number | null>(null);
  const [isAtLimit, setIsAtLimit] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!canteenId) {
      setIsLoading(false);
      return;
    }

    const fetchStatus = async () => {
      // Fetch canteen settings
      const { data: canteen } = await supabase
        .from('canteens')
        .select('order_limit')
        .eq('id', canteenId)
        .single();

      if (canteen) {
        setOrderLimit(canteen.order_limit);
      }

      // Fetch active order count (only in-progress/accepted orders count against limit)
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('canteen_id', canteenId)
        .eq('status', 'accepted')
        .eq('payment_status', 'paid');

      const activeCount = count || 0;
      setActiveOrderCount(activeCount);

      // Determine if at limit - order limit works automatically
      const atLimit = canteen?.order_limit !== null && activeCount >= canteen.order_limit;
      setIsAtLimit(atLimit);
      
      // Can accept orders only if not at limit
      setCanAcceptOrders(!atLimit);
      setIsLoading(false);
    };

    fetchStatus();

    // Subscribe to real-time updates for orders
    const ordersChannel = supabase
      .channel(`canteen-orders-${canteenId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `canteen_id=eq.${canteenId}`,
        },
        async () => {
          // Refetch active count on any order change (only in-progress/accepted orders count)
          const { count } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('canteen_id', canteenId)
            .eq('status', 'accepted')
            .eq('payment_status', 'paid');

          const activeCount = count || 0;
          setActiveOrderCount(activeCount);

          // Refetch canteen settings to check limit
          const { data: canteen } = await supabase
            .from('canteens')
            .select('order_limit')
            .eq('id', canteenId)
            .single();

          if (canteen) {
            setOrderLimit(canteen.order_limit);
            const atLimit = canteen.order_limit !== null && activeCount >= canteen.order_limit;
            setIsAtLimit(atLimit);
            setCanAcceptOrders(!atLimit);
          }
        }
      )
      .subscribe();

    // Subscribe to canteen settings changes
    const canteenChannel = supabase
      .channel(`canteen-settings-${canteenId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'canteens',
          filter: `id=eq.${canteenId}`,
        },
        async (payload) => {
          const newData = payload.new as { order_limit: number | null };
          setOrderLimit(newData.order_limit);

          // Refetch active count to get current value (in-progress/accepted orders)
          const { count } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('canteen_id', canteenId)
            .eq('status', 'accepted')
            .eq('payment_status', 'paid');

          const currentActiveCount = count || 0;
          setActiveOrderCount(currentActiveCount);

          // Recalculate if at limit with fresh data
          const atLimit = newData.order_limit !== null && currentActiveCount >= newData.order_limit;
          setIsAtLimit(atLimit);
          setCanAcceptOrders(!atLimit);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(canteenChannel);
    };
  }, [canteenId]);

  return { canAcceptOrders, activeOrderCount, orderLimit, isAtLimit, isLoading };
}
