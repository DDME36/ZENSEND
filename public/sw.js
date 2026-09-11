const CACHE_NAME = 'zensend-z-horse-v9';
const BASE_PATH = self.registration.scope ? new URL(self.registration.scope).pathname.replace(/\/$/, '') : '';
const STATIC_ASSETS = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/manifest.json`,
  `${BASE_PATH}/icon.svg`,
  `${BASE_PATH}/favicon.ico`,
  `${BASE_PATH}/favicon-32.png?v=z-riders-1`,
  `${BASE_PATH}/icon-192.png?v=z-horse-1`,
  `${BASE_PATH}/icon-512.png?v=z-horse-1`,
];

// Install - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch - Stale-while-revalidate for static, Network-first for navigation
self.addEventListener('fetch', (event) => {
  // Handle POST requests for Share Target
  const requestPath = new URL(event.request.url).pathname;
  if (event.request.method === 'POST' && (requestPath === '/' || requestPath === `${BASE_PATH}/` || requestPath === BASE_PATH)) {
    event.respondWith(
      (async () => {
        try {
          return Response.redirect(`${BASE_PATH}/?shared=true`, 303);
        } catch {
          return Response.redirect(`${BASE_PATH}/`, 303);
        }
      })()
    );
    return;
  }

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);

  // Skip non-http(s) requests (chrome-extension, blob:, data:, etc.)
  if (!url.protocol.startsWith('http')) return;

  // Skip service worker caching completely on localhost / 127.0.0.1 during development
  // to avoid stale chunks, hydration mismatches, and HMR interference
  const isLocalhost = Boolean(
    url.hostname === 'localhost' ||
    url.hostname === '[::1]' ||
    url.hostname === '127.0.0.1' ||
    url.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
  );
  if (isLocalhost) return;

  // Skip HMR, Turbopack, and Next.js dev bundles
  if (url.pathname.includes('/_next/webpack-hmr') || url.pathname.includes('/__nextjs')) return;

  // Skip socket.io and API requests (always network)
  if (url.pathname.includes('/socket.io/') || url.pathname.includes('/api/')) return;

  // Skip StreamSaver service worker and download URLs
  if (url.hostname.includes('jimmywarting.github.io')) return;
  if (url.pathname.includes('streamsaver')) return;

  // Is it a navigation request? (e.g., HTML page)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the latest version
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // Offline fallback
          return caches.match(`${BASE_PATH}/`) || caches.match('/') || caches.match(`${BASE_PATH}/offline.html`);
        })
    );
    return;
  }

  // For static assets (images, CSS, JS) - Stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        const contentType = networkResponse.headers.get('content-type') || '';
        const contentLength = parseInt(networkResponse.headers.get('content-length') || '0', 10);
        
        // Don't cache responses > 5MB or video/audio content
        const shouldCache = networkResponse.status === 200 
          && contentLength < 5 * 1024 * 1024
          && !contentType.includes('video')
          && !contentType.includes('audio')
          && !contentType.includes('octet-stream');

        if (shouldCache) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      }).catch(() => {
        // Ignore fetch errors for static assets if we have cache
      });

      return cachedResponse || fetchPromise;
    })
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      // Open new window if no existing window
      if (clients.openWindow) {
        return clients.openWindow(`${BASE_PATH}/`);
      }
    })
  );
});
