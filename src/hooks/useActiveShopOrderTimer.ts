import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ActiveShopOrder {
  orderId: string;
  shopId: string;
  shopName: string;
  pickupCode: string;
  estimatedReadyTime: string;
}

const STORAGE_KEY = 'activeShopOrderTimer';

export function useActiveShopOrderTimer(shopId?: string) {
  const [activeShopOrder, setActiveShopOrder] = useState<ActiveShopOrder | null>(null);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Clear active shop order
  const clearActiveShopOrder = useCallback(() => {
    console.log('Clearing active shop order');
    setActiveShopOrder(null);
    setOrderStatus(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Set active shop order data
  const setActiveShopOrderData = useCallback((order: ActiveShopOrder) => {
    console.log('Setting active shop order:', order);
    setActiveShopOrder(order);
    setOrderStatus('pending');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: ActiveShopOrder = JSON.parse(stored);
        // If shopId is provided, only load if it matches
        // If no shopId, load any active order
        if (!shopId || parsed.shopId === shopId) {
          console.log('Loaded shop order from storage:', parsed);
          setActiveShopOrder(parsed);
        }
      } catch (e) {
        console.error('Error parsing stored shop order timer:', e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, [shopId]);

  // Subscribe to order status changes
  useEffect(() => {
    const orderId = activeShopOrder?.orderId;
    if (!orderId) {
      console.log('No active shop order ID, skipping subscription');
      return;
    }

    console.log('Setting up realtime subscription for shop order:', orderId);

    // Initial fetch of order status
    const fetchOrderStatus = async () => {
      const { data, error } = await supabase
        .from('shop_orders')
        .select('status, estimated_ready_time')
        .eq('id', orderId)
        .single();

      if (!error && data) {
        console.log('Initial shop order status fetch:', data.status);
        setOrderStatus(data.status);
        // If order is already completed, clear the timer
        if (data.status === 'completed') {
          clearActiveShopOrder();
        }
      } else if (error) {
        console.error('Error fetching shop order status:', error);
      }
    };

    fetchOrderStatus();

    // Clean up existing subscription before creating new one
    if (subscriptionRef.current) {
      console.log('Removing existing shop order subscription');
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    // Subscribe to real-time changes
    const channelName = `shop-order-timer-${orderId}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shop_orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          console.log('Shop order real-time update received:', payload);
          const newRecord = payload.new as { status?: string; id?: string };
          const newStatus = newRecord?.status;
          
          if (newStatus) {
            console.log('Updating shop order status to:', newStatus);
            setOrderStatus(newStatus);
            
            // Clear timer when order is completed
            if (newStatus === 'completed') {
              clearActiveShopOrder();
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Shop order timer subscription status:', status);
      });

    subscriptionRef.current = channel;

    return () => {
      console.log('Cleaning up shop order subscription for:', orderId);
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [activeShopOrder?.orderId, clearActiveShopOrder]);

  return {
    activeShopOrder,
    orderStatus,
    isLoading,
    setActiveShopOrder: setActiveShopOrderData,
    clearActiveShopOrder,
    isCompleted: orderStatus === 'completed',
    isReady: orderStatus === 'ready',
  };
}
