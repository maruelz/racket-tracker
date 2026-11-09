const CACHE_PREFIX = 'racket-tracker-shell-';
const CACHE_NAME = CACHE_PREFIX + 'v13';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Tolerant: one missing file must not abort the whole install (cache.addAll would).
    await Promise.all(SHELL.map(u => cache.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    // Network first, but fall back to the cached shell after 3s so a weak connection never hangs the app.
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const fallback = async () => (await cache.match(request)) || (await cache.match('./index.html')) || Response.error();
      try {
        const response = await Promise.race([
          fetch(request),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))
        ]);
        if (response && response.ok) cache.put(request, response.clone());
        return response;
      } catch { return fallback(); }
    })());
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    } catch { return Response.error(); }
  })());
});
