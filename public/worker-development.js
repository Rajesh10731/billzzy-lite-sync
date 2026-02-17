/******/ (() => { // webpackBootstrap
/// <reference lib="webworker" />

self.addEventListener('push', event => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.title || 'New Notification';
    const message = data.body || 'You have a new update.';
    const icon = data.icon || '/assets/icon-192.png';
    const image = data.image || null;
    const url = data.url || '/dashboard';
    const options = {
      body: message,
      icon: icon,
      badge: '/assets/icon-192.png',
      image: image,
      data: {
        url
      },
      // Pass the URL to the click event
      vibrate: [100, 50, 100],
      actions: [{
        action: 'open',
        title: 'Open App'
      }]
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('Push notification data parse error:', err);
  }
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const urlToOpen = event.notification.data.url || '/';
  event.waitUntil(self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then(clientList => {
    // If a window is already open, focus it and navigate
    for (const client of clientList) {
      if (client.url.includes(self.location.origin) && 'focus' in client) {
        return client.focus().then(f => f.navigate(urlToOpen));
      }
    }
    // Otherwise, open a new window
    if (self.clients.openWindow) {
      return self.clients.openWindow(urlToOpen);
    }
  }));
});
/******/ })()
;