import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotificationSound } from '@/hooks/useNotificationSound';

export interface ReadyOrder {
  id: string;
  pickup_code: string;
  canteen_name: string;
}

export const useReadyOrderNotifications = (userId: string | undefined) => {
  const [readyOrders, setReadyOrders] = useState<ReadyOrder[]>([]);
  const [dismissedOrders, setDismissedOrders] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('dismissedOrderNotifications');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const { playNotificationSound } = useNotificationSound();

  // Fetch existing ready orders on mount
  useEffect(() => {
    if (!userId) return;

    const fetchReadyOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          pickup_code,
          canteen_id,
          canteens (name)
        `)
        .eq('user_id', userId)
        .eq('status', 'ready');

      if (error) {
        console.error('Error fetching ready orders:', error);
      } else if (data) {
        const orders: ReadyOrder[] = data.map((order: any) => ({
          id: order.id,
          pickup_code: order.pickup_code,
          canteen_name: order.canteens?.name || 'Unknown Canteen',
        }));
        setReadyOrders(orders);
      }
    };

    fetchReadyOrders();
  }, [userId]);

  // Real-time subscription for order status changes
  useEffect(() => {
    if (!userId || !notificationsEnabled) return;

    const channel = supabase
      .channel('order-ready-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const newOrder = payload.new as { id: string; status: string; pickup_code: string; canteen_id: string };
          const oldOrder = payload.old as { status: string };
          
          // Check if status changed to 'ready'
          if (oldOrder.status !== 'ready' && newOrder.status === 'ready') {
            // Fetch canteen name
            const { data: canteenData } = await supabase
              .from('canteens')
              .select('name')
              .eq('id', newOrder.canteen_id)
              .single();

            const newReadyOrder: ReadyOrder = {
              id: newOrder.id,
              pickup_code: newOrder.pickup_code,
              canteen_name: canteenData?.name || 'Unknown Canteen',
            };

            setReadyOrders(prev => {
              // Avoid duplicates
              if (prev.some(o => o.id === newReadyOrder.id)) return prev;
              return [...prev, newReadyOrder];
            });
            
            // Play notification sound
            playNotificationSound();
            
            // Remove from dismissed if it was there
            setDismissedOrders(prev => {
              const newSet = new Set(prev);
              newSet.delete(newOrder.id);
              return newSet;
            });
          }
          
          // If order is picked up (completed), remove from ready orders and dismissed orders
          if (newOrder.status === 'completed' || newOrder.status === 'cancelled') {
            setReadyOrders(prev => prev.filter(o => o.id !== newOrder.id));
            setDismissedOrders(prev => {
              const newSet = new Set(prev);
              newSet.delete(newOrder.id);
              localStorage.setItem('dismissedOrderNotifications', JSON.stringify([...newSet]));
              return newSet;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, notificationsEnabled, playNotificationSound]);

  const dismissNotification = useCallback((orderId: string) => {
    setDismissedOrders(prev => {
      const newSet = new Set(prev).add(orderId);
      localStorage.setItem('dismissedOrderNotifications', JSON.stringify([...newSet]));
      return newSet;
    });
  }, []);

  const restoreNotification = useCallback((orderId: string) => {
    setDismissedOrders(prev => {
      const newSet = new Set(prev);
      newSet.delete(orderId);
      localStorage.setItem('dismissedOrderNotifications', JSON.stringify([...newSet]));
      return newSet;
    });
  }, []);

  const visibleReadyOrders = readyOrders.filter(order => !dismissedOrders.has(order.id));
  const dismissedReadyOrders = readyOrders.filter(order => dismissedOrders.has(order.id));

  return {
    readyOrders,
    visibleReadyOrders,
    dismissedReadyOrders,
    notificationsEnabled,
    setNotificationsEnabled,
    dismissNotification,
    restoreNotification,
  };
};
