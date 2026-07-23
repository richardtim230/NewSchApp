
const CACHE_NAME = 'oau-community-hub-v3';
const OFFLINE_CACHE = 'oau-offline-reader-v1';

const urlsToCache = [
  '/tutor/splash.html',
  '/tutor/Oau.html',
  '/NextWeb/reader.html',
  '/NextWeb/passages.json',
  '/NextWeb/offline.html',
  '/manifest.json',
  '/',
  '/loader',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Lora:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://unpkg.com/@phosphor-icons/web',
  'https://cdn.tailwindcss.com'
];

const offlineCriticalResources = [
  '/NextWeb/reader.html',
  '/NextWeb/passages.json',
  '/NextWeb/offline.html',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(cache => {
        return cache.addAll(urlsToCache).catch(error => {
          console.log('Cache addAll error:', error);
        });
      }),
      caches.open(OFFLINE_CACHE).then(cache => {
        return cache.addAll(offlineCriticalResources).catch(error => {
          console.log('Offline cache error:', error);
        });
      })
    ])
  );

  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );

      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (!url.origin.includes(self.location.origin)) {
    return;
  }

  if (request.destination === 'document') {
    event.respondWith(handleDocumentRequest(request));
    return;
  }

  if (request.destination === 'empty' || request.method === 'GET') {
    event.respondWith(handleNetworkRequest(request));
    return;
  }

  event.respondWith(
    fetch(request).catch(error => {
      return caches.match(request);
    })
  );
});

async function handleDocumentRequest(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }

    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const offlineResponse = await caches.match(
      '/NextWeb/offline.html',
      { cacheName: OFFLINE_CACHE }
    );
    if (offlineResponse) {
      return offlineResponse;
    }

    const readerResponse = await caches.match(
      '/NextWeb/reader.html',
      { cacheName: OFFLINE_CACHE }
    );
    if (readerResponse) {
      return readerResponse;
    }

    return caches.match('/tutor/splash.html', { cacheName: CACHE_NAME });
  }
}

async function handleNetworkRequest(request) {
  const cacheKey = request.url;

  try {
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((resolve, reject) =>
        setTimeout(() => reject(new Error('Network timeout')), 5000)
      )
    ]);

    if (networkResponse && networkResponse.status === 200) {
      const cacheName = shouldCacheInOffline(request.url) ? OFFLINE_CACHE : CACHE_NAME;
      const cache = await caches.open(cacheName);
      cache.put(cacheKey, networkResponse.clone());
      return networkResponse;
    }

    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }

    const offlineResponse = await caches.match(cacheKey, {
      cacheName: OFFLINE_CACHE
    });
    if (offlineResponse) {
      return offlineResponse;
    }

    if (request.url.includes('.json')) {
      return new Response(JSON.stringify({ offline: true }), {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Resource unavailable offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

function shouldCacheInOffline(url) {
  const offlinePatterns = [
    'reader.html',
    'passages.json',
    'offline.html',
    'font-awesome',
    'tailwindcss',
    'fonts.googleapis.com'
  ];

  return offlinePatterns.some(pattern => url.includes(pattern));
}

self.addEventListener('push', event => {
  let data = {
    title: 'OAU Community Hub',
    body: 'You have a new notification.',
    icon: '/logo.png',
    badge: '/logo.png',
    url: '/tutor/Oau.html'
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (error) {
      console.log('Push data parse error:', error);
    }
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
      renotify: true,
      tag: 'oau-notification'
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
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

self.addEventListener('message', event => {
  if (!event.data) {
    return;
  }

  const { type } = event.data;

  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (type === 'CLEAR_CACHE') {
    caches.keys().then(cacheNames => {
      cacheNames.forEach(cacheName => caches.delete(cacheName));
    });
  }

  if (type === 'PRECACHE_OFFLINE') {
    precacheOfflineResources();
  }
});

async function precacheOfflineResources() {
  try {
    const cache = await caches.open(OFFLINE_CACHE);
    for (const url of offlineCriticalResources) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
        }
      } catch (error) {
        console.log('Precache failed:', url);
      }
    }
  } catch (error) {
    console.log('Precaching error:', error);
  }
}

self.addEventListener('sync', event => {
  if (event.tag === 'sync-offline-data') {
    event.waitUntil(syncOfflineData());
  }
});

async function syncOfflineData() {
  try {
    const response = await fetch('/NextWeb/passages.json');
    if (response.ok) {
      const cache = await caches.open(OFFLINE_CACHE);
      await cache.put('/NextWeb/passages.json', response);
    }
  } catch (error) {
    console.log('Sync error:', error);
  }
}
