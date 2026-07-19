const CACHE_NAME = 'oau-community-hub-v1';

const urlsToCache = [
  '/tutor/splash.html',
  '/tutor/Oau.html',
  '/manifest.json',
  '/',
  '/loader',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'https://unpkg.com/@phosphor-icons/web',
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(urlsToCache).catch(() => {})
    )
  );

  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );

      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', event => {
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        // Network first strategy
        const networkResponse = await fetch(event.request);

        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type !== 'error'
        ) {
          const responseToCache = networkResponse.clone();

          if (
            event.request.url.includes('.html') ||
            event.request.url.includes('.json') ||
            event.request.url.includes('.js') ||
            event.request.url.includes('.css') ||
            event.request.url.includes('.png') ||
            event.request.url.includes('.jpg') ||
            event.request.url.includes('.jpeg') ||
            event.request.url.includes('.svg') ||
            event.request.url.includes('.webp')
          ) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, responseToCache);
          }
        }

        return networkResponse;
      } catch (error) {
        // Fallback to cache if network fails
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        return caches.match('/tutor/splash.html');
      }
    })()
  );
});

self.addEventListener('push', event => {
  let data = {
    title: 'OAU Community Hub',
    body: 'You have a new notification.',
    icon: '/logo.png',
    badge: '/logo.png',
    url: '/tutor/Oau.html'
  };

  if (event.data) {
    data = { ...data, ...event.data.json() };
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      data: {
        url: data.url
      },
      vibrate: [200, 100, 200],
      requireInteraction: false,
      renotify: true
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const url = event.notification.data?.url || '/tutor/Oau.html';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(windowClients => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }

      return clients.openWindow(url);
    })
  );
});

self.addEventListener('message', event => {
  if (!event.data) {
    return;
  }

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
