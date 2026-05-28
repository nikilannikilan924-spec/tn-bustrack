const CACHE = 'tn-bustrack-v1';
const PRECACHE = ['/', '/manifest.json', '/icon.svg', '/offline'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline').then((r) => r || caches.match('/')))
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchAndCache = fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        });
        return cached || fetchAndCache;
      })
    );
    return;
  }

  if (url.hostname === 'tile.openstreetmap.org' || url.hostname === 'unpkg.com' || url.hostname === 'cdnjs.cloudflare.com') {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchAndCache = fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE + '-tiles').then((cache) => cache.put(request, clone));
          }
          return response;
        });
        return cached || fetchAndCache;
      })
    );
    return;
  }

  event.respondWith(fetch(request));
});
