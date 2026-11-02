// Offline cache for the laboratory: app shell, models, images, Draco decoder, Basis (KTX2) transcoder and the MediaPipe files.
const CACHE = 'artifactlab-v4';
const CORE = ['./', './index.html', './manifest.webmanifest', './models/great-wheel.glb', './models/spinning-jenny-16.glb', './images/great-wheel.webp', './images/spinning-jenny-16.webp',
  './models/kazakh-yurt-17-18-typological.glb', './images/yurt-parts/yurt-full.webp', './images/yurt-parts/yurt-frame.webp'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const p = new URL(req.url).pathname;
  // the 3D-printer ZIPs are always taken from the server (they are rebuilt and must never be stale)
  if (p.includes('/downloads/')) return;
  // models and their previews change when they are rebuilt: network first, the cache only when offline
  if (p.endsWith('.glb') || p.includes('/images/')) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req)),
    );
    return;
  }
  // network first for navigation, cache first for static assets
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
