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
  const promo = data.kind === 'promo'; // a customer promo / reminder (not a new-order alert)
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        body: data.body || '',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: data.tag || 'dino',
        renotify: true,
        requireInteraction: !!data.sticky,
        vibrate: [200, 100, 200],
        data: { url: data.url || (promo ? '/' : '/admin'), kind: data.kind || 'order' },
      }),
      // Tell any open admin tab to refresh its list and play the chime (new orders only).
      promo
        ? Promise.resolve()
        : self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
            list.forEach((c) => c.postMessage({ type: 'dino-order' }));
          }),
    ])
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const d = event.notification.data || {};
  const promo = d.kind === 'promo';
  const url = d.url || (promo ? '/' : '/admin');
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (promo) {
          // customers: bring the app/site forward (not the kitchen page)
          if (!c.url.includes('/admin') && 'focus' in c) return c.focus();
        } else if (c.url.includes('/admin') && 'focus' in c) return c.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
