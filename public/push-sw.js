// public/push-sw.js
self.addEventListener('push', function (event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body || 'New message from Billzzy',
        icon: data.icon || '/assets/icon-192.png',
        badge: '/assets/icon-192.png',
        vibrate: [100, 50, 100],
        data: {
          url: data.url || '/dashboard'
        }
      };

      event.waitUntil(
        self.registration.showNotification(data.title || 'Billzzy Lite', options)
      );
    } catch (err) {
      console.error('Push handling error:', err);
    }
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});