// ANIVA Service Worker v7 — Push通知 + キャッシュなし
// Push通知の受信・表示・タップ遷移をハンドル

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    // 古いキャッシュを全削除（キャッシュは使わない）
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Don't intercept any requests — let everything go to network
self.addEventListener('fetch', () => {
  // no-op: pass through to network
});

// Push通知受信
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'ANIVA', body: event.data.text() };
  }

  const title = data.title || 'ANIVA';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/icon-72x72.png',
    tag: data.tag || 'aniva-notification',
    data: {
      url: data.url || data.chatUrl || '/',
      chatUrl: data.chatUrl || null,
    },
    vibrate: [100, 50, 100],
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 通知タップ → 該当画面にフォーカス/遷移
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.chatUrl || event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 既存ウィンドウがあればフォーカスして遷移
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // 既存ウィンドウがなければ新規オープン
      return self.clients.openWindow(targetUrl);
    })
  );
});
