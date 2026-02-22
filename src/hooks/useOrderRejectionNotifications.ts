import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RejectionNotification {
  id: string;
  order_id: string;
  canteen_name: string;
  rejection_reason: string | null;
  created_at: string;
}

export function useOrderRejectionNotifications(userId: string | undefined) {
  const [rejectionNotifications, setRejectionNotifications] = useState<RejectionNotification[]>([]);

  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('order_rejection_notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false });

      if (data) {
        setRejectionNotifications(data);
      }
    };

    fetchNotifications();

    // Subscribe to new rejection notifications
    const channel = supabase
      .channel(`rejection-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_rejection_notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as RejectionNotification;
          setRejectionNotifications(prev => [newNotification, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'order_rejection_notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as RejectionNotification & { is_dismissed: boolean };
          if (updated.is_dismissed) {
            setRejectionNotifications(prev => prev.filter(n => n.id !== updated.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const dismissNotification = async (notificationId: string) => {
    await supabase
      .from('order_rejection_notifications')
      .update({ is_dismissed: true })
      .eq('id', notificationId);

    setRejectionNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  return { rejectionNotifications, dismissNotification };
}
