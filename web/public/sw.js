// Self-destruct: unregister and clear all caches
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', async (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
    .then(() => self.clients.matchAll())
    .then(clients => clients.forEach(c => c.navigate(c.url)))
    .then(() => self.registration.unregister())
  );
});
// Do NOT intercept any fetches
