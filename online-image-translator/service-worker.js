// Service Worker — Cache ModelScope model files
// ModelScope returns 302 redirects to CDN URLs, bypassing browser HTTP cache.
// This SW intercepts fetch requests, follows the redirect, and caches the final
// response keyed by the original ModelScope URL.
//
// On first visit, models are fetched from the network and cached.
// On subsequent visits, cached models are served instantly (no network request).

const CACHE_VERSION = 'v1';
const MODEL_CACHE = 'modelscope-models-' + CACHE_VERSION;

// Domains whose responses should be cached
const CACHE_HOSTNAMES = [
  'www.modelscope.cn',
  'modelscope.cn'
];

function shouldCache(url) {
  const hostname = url.hostname;
  return CACHE_HOSTNAMES.some(function (h) {
    return hostname === h || hostname.endsWith('.' + h);
  });
}

// Immediately take control when activated
self.addEventListener('install', function (event) {
  console.log('[SW] Installed — model cache enabled');
  self.skipWaiting();
});

// Clean up old cache versions on activation
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) {
            return key.startsWith('modelscope-models-') && key !== MODEL_CACHE;
          })
          .map(function (key) {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          })
      );
    })
  );
  self.clients.claim();
});

// Intercept and cache model file requests
self.addEventListener('fetch', function (event) {
  var url;
  try {
    url = new URL(event.request.url);
  } catch (e) {
    return; // invalid URL, don't intercept
  }

  if (!shouldCache(url)) return;
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.open(MODEL_CACHE).then(function (cache) {
      return cache.match(event.request).then(function (cachedResponse) {
        if (cachedResponse) {
          console.log('[SW] Cache hit:', url.pathname);
          return cachedResponse;
        }

        console.log('[SW] Fetching + caching:', url.href);
        return fetch(event.request)
          .then(function (networkResponse) {
            // Cache successful responses (200-299).
            // Note: we check response.ok (not status < 400) so redirects
            // themselves are not cached — only the final 200 response.
            if (networkResponse.ok) {
              console.log('[SW] Cached:', url.pathname);
              cache.put(event.request, networkResponse.clone());
            } else {
              console.warn(
                '[SW] Not cached (status ' + networkResponse.status + '):',
                url.pathname
              );
            }
            return networkResponse;
          })
          .catch(function (err) {
            console.error('[SW] Network error:', url.href, err.message);
            throw err;
          });
      });
    })
  );
});
