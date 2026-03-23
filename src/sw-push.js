/* eslint-disable no-restricted-globals */
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

// Claim clients immediately
self.skipWaiting();
clientsClaim();

// Clean up outdated caches from previous versions
cleanupOutdatedCaches();

// This is required for VitePWA injectManifest
precacheAndRoute(self.__WB_MANIFEST || []);

self.addEventListener('install', () => {
    console.log('[Service Worker] Push SW installed');
});

self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Push SW activated');
    // Clean up old caches
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((cacheName) => {
                        // Delete old caches that are not the current precache
                        return !cacheName.includes('workbox-precache');
                    })
                    .map((cacheName) => caches.delete(cacheName))
            );
        })
    );
});

// Fetch handler for offline support
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip chrome-extension and other non-http requests
    if (!event.request.url.startsWith('http')) return;

    // For navigation requests (HTML pages), use network-first strategy
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Cache the latest version
                    const responseClone = response.clone();
                    caches.open('pages-cache').then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    // Fallback to cache if offline
                    return caches.match(event.request).then((cachedResponse) => {
                        return cachedResponse || caches.match('/index.html');
                    });
                })
        );
        return;
    }

    // For API requests (supabase), use network-first
    if (event.request.url.includes('supabase.co')) {
        event.respondWith(
            fetch(event.request).catch(() => {
                return caches.match(event.request);
            })
        );
        return;
    }

    // For static assets (images, fonts, css, js), use cache-first
    if (
        event.request.destination === 'image' ||
        event.request.destination === 'font' ||
        event.request.destination === 'style' ||
        event.request.destination === 'script'
    ) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request).then((response) => {
                    const responseClone = response.clone();
                    caches.open('static-assets-cache').then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                });
            })
        );
        return;
    }
});

// Push notification handler
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
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
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
