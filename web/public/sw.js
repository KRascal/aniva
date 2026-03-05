/**
 * ANIVA Service Worker
 * プッシュ通知受信 + キャッシュ戦略
 */

const CACHE_NAME = 'aniva-v2';
const STATIC_ASSETS = ['/explore', '/offline.html'];

// ─── インストール ────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(STATIC_ASSETS).catch(() => {})
    )
  );
});

// ─── アクティベート ─────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── プッシュ通知受信 ────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'ANIVA', body: event.data.text(), icon: '/icons/icon-192x192.png' };
  }

  const {
    title = 'ANIVA',
    body = '',
    icon = '/icons/icon-192x192.png',
    badge = '/icons/icon-192x192.png',
    url = '/chat',
    characterSlug,
    tag,
    image,
  } = data;

  const notifTag = tag || `aniva-${characterSlug || 'general'}-${Date.now()}`;

  const options = {
    body,
    icon,
    badge,
    tag: notifTag,
    renotify: true,
    requireInteraction: false,
    silent: false,
    vibrate: [100, 50, 100],
    data: { url, characterSlug },
    ...(image ? { image } : {}),
    actions: [
      { action: 'open', title: '返信する 💬' },
      { action: 'dismiss', title: '後で' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ─── 通知クリック ────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { action } = event;
  const { url } = event.notification.data || {};
  const targetUrl = action === 'dismiss' ? '/' : (url || '/chat');

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // 既に開いているタブがあればフォーカス
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // なければ新しいタブを開く
      return self.clients.openWindow(targetUrl);
    })
  );
});

// ─── フェッチキャッシュ（静的アセット） ──────────────────────
self.addEventListener('fetch', (event) => {
  // APIリクエストはキャッシュしない
  if (event.request.url.includes('/api/')) return;
  // POST等もスキップ
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
