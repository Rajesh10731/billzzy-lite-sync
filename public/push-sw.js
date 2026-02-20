// public/push-sw.js
self.addEventListener('push', function (event) {
  console.log('📡 Push received:', event);
  if (event.data) {
    try {
      const data = event.data.json();
      console.log('📦 Push data payload:', data);

      const options = {
        body: data.body || 'New message from Billzzy',
        icon: data.icon || '/assets/icon-192.png',
        badge: '/assets/icon-192.png',
        vibrate: [100, 50, 100],
        timestamp: Date.now(),
        data: {
          url: data.url || '/dashboard'
        },
        actions: [
          { action: 'open', title: 'View Update' }
        ]
      };

      event.waitUntil(
        self.registration.showNotification(data.title || 'Billzzy Lite', options)
      );
    } catch (err) {
      console.error('❌ Push data parsing error:', err);
    }
  } else {
    console.warn('⚠️ Push received with no data payload.');
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const urlToOpen = event.notification.data.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (windowClients) {
        // If a window is already open, focus it
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise, open a new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});