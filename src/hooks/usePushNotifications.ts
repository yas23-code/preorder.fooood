import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export function usePushNotifications(userId: string | undefined) {
    const [permission, setPermission] = useState<NotificationPermission>(
        typeof Notification !== 'undefined' ? Notification.permission : 'default'
    );
    const [isSubscribing, setIsSubscribing] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);

    useEffect(() => {
        checkCurrentSubscription();
    }, [userId]);

    const checkCurrentSubscription = async () => {
        if (!userId || !('serviceWorker' in navigator)) return;

        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            setIsSubscribed(!!subscription);

            if (subscription && permission === 'granted') {
                // Sync with backend if needed
                await syncSubscriptionWithBackend(subscription);
            }
        } catch (err) {
            console.error('Error checking subscription:', err);
        }
    };

    const requestPermission = async () => {
        if (typeof Notification === 'undefined') return;

        try {
            const result = await Notification.requestPermission();
            setPermission(result);
            if (result === 'granted') {
                await subscribeUserToPush();
            }
            return result;
        } catch (err) {
            console.error('Error requesting notification permission:', err);
            return 'denied';
        }
    };

    const syncSubscriptionWithBackend = async (subscription: PushSubscription) => {
        if (!userId) return;
        const subscriptionJSON = subscription.toJSON();
        const auth = subscriptionJSON.keys?.auth;
        const p256dh = subscriptionJSON.keys?.p256dh;

        if (!auth || !p256dh) {
            console.error('Subscription keys are missing');
            return;
        }

        await supabase
            .from('push_subscriptions')
            .upsert({
                user_id: userId,
                endpoint: subscription.endpoint,
                auth: auth,
                p256dh: p256dh,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
    };

    const subscribeUserToPush = async () => {
        if (!userId || !('serviceWorker' in navigator)) return;

        try {
            setIsSubscribing(true);
            const registration = await navigator.serviceWorker.ready;
            // ALWAYS unsubscribe first to ensure we use the newest VAPID key
            const existingSubscription = await registration.pushManager.getSubscription();
            if (existingSubscription) {
                await existingSubscription.unsubscribe();
            }

            if (!VAPID_PUBLIC_KEY) {
                console.error('VAPID public key is missing in environment variables');
                return;
            }

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY.trim())
            });

            await syncSubscriptionWithBackend(subscription);
            setIsSubscribed(true);
            toast.success("Notifications enabled!");
        } catch (err) {
            console.error('Failed to subscribe the user: ', err);
            toast.error("Failed to enable notifications. Please check site settings.");
        } finally {
            setIsSubscribing(false);
        }
    };

    const sendTestNotification = async () => {
        if (!userId) return;

        try {
            const { data, error } = await supabase.functions.invoke('send-web-push', {
                body: {
                    user_id: userId,
                    title: 'preorder.food',
                    body: 'This is a test notification! 🚀',
                    url: '/student/orders'
                }
            });

            if (error) throw error;
            toast.success("Test notification sent!");
        } catch (err) {
            console.error('Error sending test notification:', err);
            toast.error("Failed to send test push. Ensure notifications are enabled.");
        }
    };

    return { permission, requestPermission, isSubscribed, isSubscribing, sendTestNotification, subscribeUserToPush };
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
