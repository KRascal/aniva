// ANIVA Service Worker v6 — self-destruct: clear all caches and unregister
// This ensures stale caches from previous versions are completely purged.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() => {
      // Unregister this service worker after clearing caches
      return self.registration.unregister();
    }).then(() => {
      // Force all clients to reload with no SW
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_UNREGISTERED' });
        });
      });
    })
  );
});

// Don't intercept any requests — let everything go to network
self.addEventListener('fetch', () => {
  // no-op: pass through to network
});
