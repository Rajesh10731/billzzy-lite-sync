// public/push-sw.js
self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log("🚀 Forced SKIP_WAITING received! Force activating...");
    self.skipWaiting();
  }
});

self.addEventListener('push', function (event) {
  console.log('📡 Push received:', event);

  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (err) {
      console.warn('⚠️ Push data is not JSON, treating as text');
      data = { body: event.data.text() };
    }
  }

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
    // CRITICAL for "floating" (Heads-up) behavior:
    tag: 'billzzy-notification',
    renotify: true,
    requireInteraction: true, // Forces "floating" heads-up on many mobiles
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: 'View Update' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Billzzy Lite', options)
  );
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