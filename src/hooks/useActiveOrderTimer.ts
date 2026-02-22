import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ActiveOrder {
  orderId: string;
  canteenId: string;
  pickupCode: string;
  estimatedReadyTime: string | null; // Can be null until vendor accepts
}

const STORAGE_KEY = 'activeOrderTimer';

export function useActiveOrderTimer(canteenId?: string) {
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [estimatedReadyTime, setEstimatedReadyTime] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: ActiveOrder = JSON.parse(stored);
        // If canteenId is provided, only load if it matches
        // If no canteenId, load any active order
        if (!canteenId || parsed.canteenId === canteenId) {
          setActiveOrder(parsed);
          setEstimatedReadyTime(parsed.estimatedReadyTime);
        }
      } catch (e) {
        console.error('Error parsing stored order timer:', e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, [canteenId]);

  // Subscribe to order status changes
  useEffect(() => {
    if (!activeOrder?.orderId) return;

    // Initial fetch of order status and ETA
    const fetchOrderStatus = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('status, estimated_ready_time')
        .eq('id', activeOrder.orderId)
        .single();

      if (!error && data) {
        setOrderStatus(data.status);
        // Update ETA if vendor has accepted (ETA is now set)
        if (data.estimated_ready_time) {
          setEstimatedReadyTime(data.estimated_ready_time);
          // Update localStorage with the new ETA
          const updatedOrder = { ...activeOrder, estimatedReadyTime: data.estimated_ready_time };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrder));
        }
        // If order is already completed, rejected, or still pending (not accepted), handle accordingly
        if (data.status === 'completed' || data.status === 'rejected') {
          clearActiveOrder();
        }
      }
    };

    fetchOrderStatus();

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`order-timer-${activeOrder.orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${activeOrder.orderId}`,
        },
        (payload) => {
          const newStatus = payload.new?.status;
          const newEta = payload.new?.estimated_ready_time;
          
          setOrderStatus(newStatus);
          
          // When vendor accepts, ETA becomes available
          if (newEta && !estimatedReadyTime) {
            setEstimatedReadyTime(newEta);
            const updatedOrder = { ...activeOrder, estimatedReadyTime: newEta };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrder));
          }
          
          // Clear timer when order is completed or rejected
          if (newStatus === 'completed' || newStatus === 'rejected') {
            clearActiveOrder();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeOrder?.orderId, estimatedReadyTime]);

  const setActiveOrderData = useCallback((order: ActiveOrder) => {
    setActiveOrder(order);
    setOrderStatus('pending');
    setEstimatedReadyTime(order.estimatedReadyTime);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  }, []);

  const clearActiveOrder = useCallback(() => {
    setActiveOrder(null);
    setOrderStatus(null);
    setEstimatedReadyTime(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    activeOrder,
    orderStatus,
    estimatedReadyTime,
    isLoading,
    setActiveOrder: setActiveOrderData,
    clearActiveOrder,
    isCompleted: orderStatus === 'completed',
    isReady: orderStatus === 'ready',
    isAccepted: orderStatus === 'accepted',
    isPending: orderStatus === 'pending',
  };
}
