import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CanteenOrderStatus {
  canAcceptOrders: boolean;
  activeOrderCount: number;
  orderLimit: number | null;
  orderLimitEnabled: boolean;
  isAtLimit: boolean;
  isLoading: boolean;
}

const ACTIVE_STATUSES = ['pending', 'accepted', 'confirmed', 'preparing', 'in_progress'];

export function useCanteenOrderStatus(canteenId: string | undefined): CanteenOrderStatus {
  const [canAcceptOrders, setCanAcceptOrders] = useState(true);
  const [activeOrderCount, setActiveOrderCount] = useState(0);
  const [orderLimit, setOrderLimit] = useState<number | null>(null);
  const [orderLimitEnabled, setOrderLimitEnabled] = useState(true);
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
        .select('order_limit, order_limit_enabled, auto_paused_by_limit, is_open')
        .eq('id', canteenId)
        .single();

      const limit = canteen?.order_limit ?? null;
      const enabled = canteen?.order_limit_enabled !== false;
      const isOpen = canteen?.is_open !== false;
      const autoPaused = canteen?.auto_paused_by_limit === true;

      setOrderLimit(limit);
      setOrderLimitEnabled(enabled);

      // Fetch active order count
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('canteen_id', canteenId)
        .in('status', ACTIVE_STATUSES)
        .eq('payment_status', 'paid');

      const activeCount = count || 0;
      setActiveOrderCount(activeCount);

      const atLimit = enabled && limit !== null && activeCount >= limit;
      setIsAtLimit(atLimit);
      setCanAcceptOrders(isOpen && !atLimit && !autoPaused);
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
          const { count } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('canteen_id', canteenId)
            .in('status', ACTIVE_STATUSES)
            .eq('payment_status', 'paid');

          const activeCount = count || 0;
          setActiveOrderCount(activeCount);

          const { data: canteen } = await supabase
            .from('canteens')
            .select('order_limit, order_limit_enabled, auto_paused_by_limit, is_open')
            .eq('id', canteenId)
            .single();

          if (canteen) {
            const limit = canteen.order_limit ?? null;
            const enabled = canteen.order_limit_enabled !== false;
            const isOpen = canteen.is_open !== false;
            const autoPaused = canteen.auto_paused_by_limit === true;

            setOrderLimit(limit);
            setOrderLimitEnabled(enabled);
            const atLimit = enabled && limit !== null && activeCount >= limit;
            setIsAtLimit(atLimit);
            setCanAcceptOrders(isOpen && !atLimit && !autoPaused);
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
          const newData = payload.new as {
            order_limit?: number | null;
            order_limit_enabled?: boolean;
            auto_paused_by_limit?: boolean;
            is_open?: boolean;
          };

          const limit = newData.order_limit ?? null;
          const enabled = newData.order_limit_enabled !== false;
          const isOpen = newData.is_open !== false;
          const autoPaused = newData.auto_paused_by_limit === true;

          setOrderLimit(limit);
          setOrderLimitEnabled(enabled);

          const { count } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('canteen_id', canteenId)
            .in('status', ACTIVE_STATUSES)
            .eq('payment_status', 'paid');

          const currentActiveCount = count || 0;
          setActiveOrderCount(currentActiveCount);

          const atLimit = enabled && limit !== null && currentActiveCount >= limit;
          setIsAtLimit(atLimit);
          setCanAcceptOrders(isOpen && !atLimit && !autoPaused);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(canteenChannel);
    };
  }, [canteenId]);

  return { canAcceptOrders, activeOrderCount, orderLimit, orderLimitEnabled, isAtLimit, isLoading };
}

