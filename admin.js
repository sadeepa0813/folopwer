// service-worker.js - Push notifications සඳහා
self.addEventListener('push', function(event) {
    if (!event.data) return;
    
    const data = event.data.json();
    
    const options = {
        body: data.body || 'New order received!',
        icon: data.icon || '/icon-192x192.png',
        badge: data.badge || '/badge-72x72.png',
        tag: data.tag || 'new-order',
        data: data.data || {},
        actions: data.actions || [
            {
                action: 'view',
                title: 'View Order'
            },
            {
                action: 'confirm',
                title: 'Confirm Order'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'New Order 🛒', options)
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    if (event.action === 'view') {
        clients.openWindow('/admin.html');
    } else if (event.action === 'confirm') {
        // Handle order confirmation
        clients.openWindow('/admin.html#orders');
    } else {
        clients.openWindow('/admin.html');
    }
});
