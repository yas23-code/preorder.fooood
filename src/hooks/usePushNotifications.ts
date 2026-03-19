import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export function usePushNotifications(userId: string | undefined) {
    const [permission, setPermission] = useState<NotificationPermission>(
        typeof Notification !== 'undefined' ? Notification.permission : 'default'
    );
    const [isSubscribing, setIsSubscribing] = useState(false);

    useEffect(() => {
        if (userId && permission === 'granted') {
            subscribeUserToPush();
        }
    }, [userId, permission]);

    const requestPermission = async () => {
        if (typeof Notification === 'undefined') return;

        const result = await Notification.requestPermission();
        setPermission(result);
        return result;
    };

    const subscribeUserToPush = async () => {
        if (!userId || typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

        try {
            setIsSubscribing(true);
            const registration = await navigator.serviceWorker.ready;

            // Check if already subscribed
            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
                });
                console.log('User is subscribed:', subscription);
            }

            // Send subscription to backend
            const { auth, p256dh } = subscription.toJSON() as { auth: string, p256dh: string };

            const { error } = await supabase
                .from('push_subscriptions')
                .upsert({
                    user_id: userId,
                    endpoint: subscription.endpoint,
                    auth: auth,
                    p256dh: p256dh,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (error) {
                console.error('Error saving push subscription:', error);
            }
        } catch (err) {
            console.error('Failed to subscribe the user: ', err);
        } finally {
            setIsSubscribing(false);
        }
    };

    return { permission, requestPermission, isSubscribing };
}

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
