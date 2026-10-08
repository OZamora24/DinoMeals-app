// DinoMeals service worker - ONLY handles push notifications.
// There is deliberately no fetch handler, so it never caches or intercepts
// pages (no stale-bundle problems).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'DinoMeals', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'DinoMeals';
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        body: data.body || '',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: data.tag || 'dino',
        renotify: true,
        data: { url: data.url || '/admin' },
      }),
      // Tell any open admin tab to refresh its list and play the chime.
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
        list.forEach((c) => c.postMessage({ type: 'dino-order' }));
      }),
    ])
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/admin';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes('/admin') && 'focus' in c) return c.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
