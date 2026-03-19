// Service worker to handle push notifications
self.addEventListener('push', function (event) {
    if (event.data) {
        try {
            const data = event.data.json();
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
        } catch (e) {
            console.error('Error parsing push data:', e);
            // Fallback notification
            event.waitUntil(
                self.registration.showNotification('preorder.food', {
                    body: event.data.text() || 'Your food is ready!',
                    icon: '/preorder_logo.jpg'
                })
            );
        }
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    if (event.action === 'view-order') {
        event.waitUntil(
            clients.openWindow(event.notification.data.url)
        );
    } else {
        event.waitUntil(
            clients.matchAll({ type: 'window' }).then(function (clientList) {
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];
                    if (client.url === event.notification.data.url && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(event.notification.data.url);
                }
            })
        );
    }
});
