import { useState, useEffect, useRef, useCallback } from 'react';
import { useNotificationSound } from './useNotificationSound';

const OVERDUE_NOTIFICATION_KEY = 'shopOrderOverdueNotified';

interface UseShopOrderOverdueNotificationProps {
  orderId?: string;
  estimatedReadyTime?: string | null;
  orderStatus?: string | null;
}

export function useShopOrderOverdueNotification({
  orderId,
  estimatedReadyTime,
  orderStatus,
}: UseShopOrderOverdueNotificationProps) {
  const [isOverdue, setIsOverdue] = useState(false);
  const { playOverdueSound } = useNotificationSound();
  const hasNotifiedRef = useRef(false);

  // Check if we already notified for this order
  const hasNotifiedForOrder = useCallback((id?: string) => {
    if (!id) return false;
    const stored = localStorage.getItem(OVERDUE_NOTIFICATION_KEY);
    return stored === id;
  }, []);

  // Mark as notified
  const markAsNotified = useCallback((id?: string) => {
    if (id) {
      localStorage.setItem(OVERDUE_NOTIFICATION_KEY, id);
      hasNotifiedRef.current = true;
    }
  }, []);

  // Clear notification flag when order completes
  const clearNotificationFlag = useCallback(() => {
    localStorage.removeItem(OVERDUE_NOTIFICATION_KEY);
    hasNotifiedRef.current = false;
  }, []);

  useEffect(() => {
    // Only track overdue for pending/preparing orders that have an ETA
    if (!orderId || !estimatedReadyTime || orderStatus === 'ready' || orderStatus === 'completed') {
      setIsOverdue(false);
      return;
    }

    // Check if already notified for this order
    if (hasNotifiedForOrder(orderId)) {
      hasNotifiedRef.current = true;
    }

    const checkOverdue = () => {
      const targetTime = new Date(estimatedReadyTime).getTime();
      const now = Date.now();
      const isNowOverdue = now > targetTime;

      setIsOverdue(isNowOverdue);

      // Play sound only once when becoming overdue
      if (isNowOverdue && !hasNotifiedRef.current && !hasNotifiedForOrder(orderId)) {
        console.log('Shop order overdue - playing sound notification');
        playOverdueSound();
        markAsNotified(orderId);
      }
    };

    checkOverdue();
    const interval = setInterval(checkOverdue, 1000);

    return () => clearInterval(interval);
  }, [orderId, estimatedReadyTime, orderStatus, playOverdueSound, hasNotifiedForOrder, markAsNotified]);

  // Clear flag when order is completed or ready
  useEffect(() => {
    if (orderStatus === 'completed' || orderStatus === 'ready') {
      clearNotificationFlag();
    }
  }, [orderStatus, clearNotificationFlag]);

  return { isOverdue };
}
