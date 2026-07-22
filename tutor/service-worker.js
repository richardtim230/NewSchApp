const CACHE_NAME = 'oau-community-hub-v3';
const OFFLINE_CACHE = 'oau-offline-reader-v1';

const urlsToCache = [
  '/tutor/splash.html',
  '/tutor/Oau.html',
  '/NextWeb/reader.html',
  '/NextWeb/passages.json',
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
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      // Main cache
      caches.open(CACHE_NAME).then(cache => {
        console.log('Caching main resources');
        return cache.addAll(urlsToCache).catch(error => {
          console.log('Some resources failed to cache:', error);
        });
      }),
      // Offline cache for critical reader resources
      caches.open(OFFLINE_CACHE).then(cache => {
        console.log('Caching offline reader resources');
        return cache.addAll(offlineCriticalResources).catch(error => {
          console.log('Some offline resources failed to cache:', error);
        });
      })
    ])
  );

  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      console.log('Active caches:', cacheNames);

      await Promise.all(
        cacheNames.map(cacheName => {
          // Keep current caches, delete old versions
          if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );

      await self.clients.claim();
      console.log('Service Worker activated');
    })()
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (!url.origin.includes(self.location.origin)) {
    return;
  }

  // Handle document requests (pages)
  if (request.destination === 'document') {
    event.respondWith(handleDocumentRequest(request));
    return;
  }

  // Handle API and data requests
  if (request.destination === 'empty' || request.method === 'GET') {
    event.respondWith(handleNetworkRequest(request));
    return;
  }

  // Default behavior for other requests
  event.respondWith(
    fetch(request).catch(error => {
      console.log('Fetch failed for:', request.url, error);
      return caches.match(request);
    })
  );
});

/**
 * Handle document requests with intelligent routing
 */
async function handleDocumentRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.status === 200) {
      // Cache successful responses
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }

    return networkResponse;
  } catch (error) {
    console.log('Network request failed for document:', request.url);

    // Try to return cached version
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // If no cache, check offline cache
    const offlineResponse = await caches.match(
      '/NextWeb/reader.html',
      { cacheName: OFFLINE_CACHE }
    );
    if (offlineResponse) {
      console.log('Returning offline reader page');
      return offlineResponse;
    }

    // Last resort - try from main cache
    return caches.match('/tutor/splash.html', { cacheName: CACHE_NAME });
  }
}

/**
 * Handle network requests with stale-while-revalidate strategy
 */
async function handleNetworkRequest(request) {
  const cacheKey = request.url;

  try {
    // Try network first
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((resolve, reject) =>
        setTimeout(() => reject(new Error('Network timeout')), 5000)
      )
    ]);

    if (networkResponse && networkResponse.status === 200) {
      // Cache successful responses
      const cacheName = shouldCacheInOffline(request.url) ? OFFLINE_CACHE : CACHE_NAME;
      const cache = await caches.open(cacheName);
      cache.put(cacheKey, networkResponse.clone());
      return networkResponse;
    }

    return networkResponse;
  } catch (error) {
    console.log('Network fetch failed:', cacheKey);

    // Return cached version if available
    const cachedResponse = await caches.match(cacheKey);
    if (cachedResponse) {
      console.log('Returning cached response:', cacheKey);
      return cachedResponse;
    }

    // Try offline cache
    const offlineResponse = await caches.match(cacheKey, {
      cacheName: OFFLINE_CACHE
    });
    if (offlineResponse) {
      console.log('Returning offline cached response:', cacheKey);
      return offlineResponse;
    }

    // Return placeholder response for JSON files
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

/**
 * Determine if a resource should be cached in offline cache
 */
function shouldCacheInOffline(url) {
  const offlinePatterns = [
    'reader.html',
    'passages.json',
    'font-awesome',
    'tailwindcss',
    'fonts.googleapis.com'
  ];

  return offlinePatterns.some(pattern => url.includes(pattern));
}

/**
 * Handle push notifications
 */
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
      console.log('Error parsing push data:', error);
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

/**
 * Handle notification clicks
 */
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const url = event.notification.data?.url || '/tutor/Oau.html';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(windowClients => {
      // Check if app is already open
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }

      // If not open, open new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

/**
 * Handle messages from clients
 */
self.addEventListener('message', event => {
  if (!event.data) {
    return;
  }

  const { type } = event.data;

  if (type === 'SKIP_WAITING') {
    console.log('Skipping waiting period');
    self.skipWaiting();
  }

  if (type === 'CLEAR_CACHE') {
    console.log('Clearing caches');
    caches.keys().then(cacheNames => {
      cacheNames.forEach(cacheName => caches.delete(cacheName));
    });
  }

  if (type === 'PRECACHE_OFFLINE') {
    console.log('Precaching offline resources');
    precacheOfflineResources();
  }
});

/**
 * Manually precache offline resources
 */
async function precacheOfflineResources() {
  try {
    const cache = await caches.open(OFFLINE_CACHE);
    for (const url of offlineCriticalResources) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
          console.log('Precached:', url);
        }
      } catch (error) {
        console.log('Failed to precache:', url, error);
      }
    }
  } catch (error) {
    console.log('Precaching error:', error);
  }
}

/**
 * Handle background sync for when connection is restored
 */
self.addEventListener('sync', event => {
  if (event.tag === 'sync-offline-data') {
    event.waitUntil(syncOfflineData());
  }
});

async function syncOfflineData() {
  try {
    // Refresh reader passages when online
    const response = await fetch('/NextWeb/passages.json');
    if (response.ok) {
      const cache = await caches.open(OFFLINE_CACHE);
      await cache.put('/NextWeb/passages.json', response);
      console.log('Synced passages data');
    }
  } catch (error) {
    console.log('Sync error:', error);
  }
}
