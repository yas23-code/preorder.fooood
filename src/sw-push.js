/* eslint-disable no-restricted-globals */
import { precacheAndRoute } from 'workbox-precaching';

// This is required for VitePWA injectManifest
precacheAndRoute(self.__WB_MANIFEST || []);

self.addEventListener('install', () => {
    console.log('[Service Worker] Push SW installed');
    self.skipWaiting();
});

self.addEventListener('activate', () => {
    console.log('[Service Worker] Push SW activated');
});

self.addEventListener('push', function (event) {
    console.log('[Service Worker] Push Received.');
    console.log(`[Service Worker] Push had this data: "${event.data ? event.data.text() : 'no data'}"`);

    let data = {};
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = { title: 'preorder.food', body: event.data.text() };
        }
    }

    const options = {
        body: data.body || 'Your food is ready!',
        icon: '/preorder_logo.jpg',
        badge: '/favicon.ico',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/student/orders',
            orderId: data.orderId
        },
        actions: [
            {
                action: 'view-order',
                title: 'View Order'
            }
        ],
        tag: data.tag || 'order-ready',
        renotify: true
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'preorder.food', options)
    );
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    const url = event.notification.data?.url || '/student/orders';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url.includes(url) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});
