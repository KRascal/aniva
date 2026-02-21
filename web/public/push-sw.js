// ANIVA Push Notification Service Worker
// Handles incoming push notifications and notification click events

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = JSON.parse(event.data.text());
  } catch {
    data = { title: 'ANIVA', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'ANIVA', {
      body: data.body || 'ルフィからメッセージが届きました',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'aniva-message',
      requireInteraction: false,
      data: { url: data.url || '/chat' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/chat')
  );
});
