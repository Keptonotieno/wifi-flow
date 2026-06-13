const CACHE_NAME = 'wififlow-mesh-v1';
const PRE_CACHE_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg'
];

// 1. Installation: Prefetch critical shell files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[WifiFlow ServiceWorker] Pre-caching static app shell resources');
      return cache.addAll(PRE_CACHE_RESOURCES);
    }).then(() => {
      // Force the waiting service worker to become active immediately
      return self.skipWaiting();
    })
  );
});

// 2. Activation: Clean up any outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[WifiFlow ServiceWorker] Purging legacy cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      // Take control of all open pages immediately
      return self.clients.claim();
    })
  );
});

// 3. Intercept fetch requests: Optimize offline functionality for field technicians
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and browser extensions / internal page requests
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) {
    return;
  }

  // Determine the response strategy depending on the resource type
  const isNavigation = request.mode === 'navigate';
  const isStaticAsset = 
    url.pathname.includes('/assets/') || 
    url.pathname.endsWith('.js') || 
    url.pathname.endsWith('.css') || 
    url.pathname.endsWith('.png') || 
    url.pathname.endsWith('.jpg') || 
    url.pathname.endsWith('.svg') || 
    url.pathname.endsWith('.json');

  if (isNavigation) {
    // Strategy: Network-First with Cache Fallback for navigation requests (HTML/App Shell).
    // Technicians should always view the freshest data if connected, but fallback automatically when offline.
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Keep cache up-to-date with standard responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          console.warn('[WifiFlow ServiceWorker] Spotty network detected. Loading app shell from cache.');
          return caches.match('/') || caches.match('/index.html');
        })
    );
  } else if (isStaticAsset) {
    // Strategy: Cache-First with Network Fallback & Dynamic cache updates.
    // Static items (like hashes, icons, and fonts) rarely change and should be served directly from storage.
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((response) => {
          // If valid response, save of duplicate to cache
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        }).catch((err) => {
          console.error('[WifiFlow ServiceWorker] Fetch error for static resource:', err);
          return null;
        });
      })
    );
  } else {
    // Default Strategy: Cache with Network Fallback
    event.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      }).catch(() => fetch(request))
    );
  }
});
