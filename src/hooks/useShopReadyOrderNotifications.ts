import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotificationSound } from '@/hooks/useNotificationSound';

export interface ReadyShopOrder {
  id: string;
  pickup_code: string;
  shop_name: string;
}

export const useShopReadyOrderNotifications = (userId: string | undefined) => {
  const [readyShopOrders, setReadyShopOrders] = useState<ReadyShopOrder[]>([]);
  const [dismissedOrders, setDismissedOrders] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('dismissedShopOrderNotifications');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const { playNotificationSound } = useNotificationSound();

  // Fetch existing ready shop orders on mount
  useEffect(() => {
    if (!userId) return;

    const fetchReadyShopOrders = async () => {
      const { data, error } = await supabase
        .from('shop_orders')
        .select(`
          id,
          pickup_code,
          shop_id,
          shops (shop_name)
        `)
        .eq('user_id', userId)
        .eq('status', 'ready');

      if (error) {
        console.error('Error fetching ready shop orders:', error);
      } else if (data) {
        const orders: ReadyShopOrder[] = data.map((order: any) => ({
          id: order.id,
          pickup_code: order.pickup_code,
          shop_name: order.shops?.shop_name || 'Unknown Shop',
        }));
        setReadyShopOrders(orders);
      }
    };

    fetchReadyShopOrders();
  }, [userId]);

  // Cache shop names to avoid fetching on every notification
  const [shopNameCache, setShopNameCache] = useState<Record<string, string>>({});

  // Pre-fetch shop names for user's recent orders
  useEffect(() => {
    if (!userId) return;

    const prefetchShopNames = async () => {
      const { data } = await supabase
        .from('shop_orders')
        .select('shop_id, shops (shop_name)')
        .eq('user_id', userId)
        .in('status', ['pending', 'confirmed', 'preparing', 'ready'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) {
        const cache: Record<string, string> = {};
        data.forEach((order: any) => {
          if (order.shop_id && order.shops?.shop_name) {
            cache[order.shop_id] = order.shops.shop_name;
          }
        });
        setShopNameCache(prev => ({ ...prev, ...cache }));
      }
    };

    prefetchShopNames();
  }, [userId]);

  // Real-time subscription for shop order status changes
  useEffect(() => {
    if (!userId || !notificationsEnabled) return;

    const channel = supabase
      .channel('shop-order-ready-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shop_orders',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newOrder = payload.new as { id: string; status: string; pickup_code: string; shop_id: string };
          const oldOrder = payload.old as { status: string };
          
          // Check if status changed to 'ready'
          if (oldOrder.status !== 'ready' && newOrder.status === 'ready') {
            // Use cached shop name or fetch if not available
            const cachedName = shopNameCache[newOrder.shop_id];
            
            if (cachedName) {
              // Immediate notification with cached name
              const newReadyOrder: ReadyShopOrder = {
                id: newOrder.id,
                pickup_code: newOrder.pickup_code,
                shop_name: cachedName,
              };

              setReadyShopOrders(prev => {
                if (prev.some(o => o.id === newReadyOrder.id)) return prev;
                return [...prev, newReadyOrder];
              });
              
              playNotificationSound();
              
              setDismissedOrders(prev => {
                const newSet = new Set(prev);
                newSet.delete(newOrder.id);
                return newSet;
              });
            } else {
              // Fallback: fetch shop name (shouldn't happen often)
              supabase
                .from('shops')
                .select('shop_name')
                .eq('id', newOrder.shop_id)
                .single()
                .then(({ data: shopData }) => {
                  const shopName = shopData?.shop_name || 'Shop';
                  
                  // Cache for future use
                  setShopNameCache(prev => ({ ...prev, [newOrder.shop_id]: shopName }));
                  
                  const newReadyOrder: ReadyShopOrder = {
                    id: newOrder.id,
                    pickup_code: newOrder.pickup_code,
                    shop_name: shopName,
                  };

                  setReadyShopOrders(prev => {
                    if (prev.some(o => o.id === newReadyOrder.id)) return prev;
                    return [...prev, newReadyOrder];
                  });
                  
                  playNotificationSound();
                  
                  setDismissedOrders(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(newOrder.id);
                    return newSet;
                  });
                });
            }
          }
          
          // If order is completed or cancelled, remove from ready orders and dismissed orders
          if (newOrder.status === 'completed' || newOrder.status === 'cancelled') {
            setReadyShopOrders(prev => prev.filter(o => o.id !== newOrder.id));
            setDismissedOrders(prev => {
              const newSet = new Set(prev);
              newSet.delete(newOrder.id);
              localStorage.setItem('dismissedShopOrderNotifications', JSON.stringify([...newSet]));
              return newSet;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, notificationsEnabled, playNotificationSound, shopNameCache]);

  const dismissNotification = useCallback((orderId: string) => {
    setDismissedOrders(prev => {
      const newSet = new Set(prev).add(orderId);
      localStorage.setItem('dismissedShopOrderNotifications', JSON.stringify([...newSet]));
      return newSet;
    });
  }, []);

  const restoreNotification = useCallback((orderId: string) => {
    setDismissedOrders(prev => {
      const newSet = new Set(prev);
      newSet.delete(orderId);
      localStorage.setItem('dismissedShopOrderNotifications', JSON.stringify([...newSet]));
      return newSet;
    });
  }, []);

  const visibleReadyShopOrders = readyShopOrders.filter(order => !dismissedOrders.has(order.id));
  const dismissedReadyShopOrders = readyShopOrders.filter(order => dismissedOrders.has(order.id));

  return {
    readyShopOrders,
    visibleReadyShopOrders,
    dismissedReadyShopOrders,
    notificationsEnabled,
    setNotificationsEnabled,
    dismissNotification,
    restoreNotification,
  };
};
