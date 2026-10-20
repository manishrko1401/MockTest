// Mock Test Hub Windows app: keeps the offline-test pages and the code they need on this PC.
// Online everything comes from the network (and the copy is refreshed); offline the stored
// copy is used. Only page code, the /offline pages and MathJax are stored — never test data
// (downloaded tests are kept encrypted by the app itself) and never API responses.
const CACHE = 'mth-offline-v1';
const CDN_HOSTS = ['cdn.jsdelivr.net'];

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

async function precache(urls) {
  const cache = await caches.open(CACHE);
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok && res.type !== 'opaque') continue;
      await cache.put(url, res.clone());
      if (!url.startsWith('/offline')) continue;
      // Store every script / stylesheet the page loads
      const html = await res.text();
      const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s\\)]+/g) || [])];
      await Promise.all(assets.map(async (a) => {
        try { const r = await fetch(a); if (r.ok) await cache.put(a, r); } catch { /* skip */ }
      }));
    } catch { /* offline right now */ }
  }
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'precache' && Array.isArray(event.data.urls)) {
    event.waitUntil(precache(event.data.urls));
  }
});

async function networkFirst(request, cacheKey, ignoreSearch) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(request);
    if (res.ok || res.type === 'opaque') cache.put(cacheKey || request, res.clone()).catch(() => {});
    return res;
  } catch (err) {
    const hit = await cache.match(cacheKey || request, { ignoreSearch: !!(cacheKey || ignoreSearch) });
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/_next/static/') || url.pathname === '/mathjax-config.js') {
      // Build files are named by content hash, so a ?v= cache-buster never changes the file
      event.respondWith(networkFirst(req, undefined, true));
    } else if (req.mode === 'navigate' && (url.pathname === '/offline' || url.pathname.startsWith('/offline/'))) {
      // Offline pages: one stored copy per page, whatever the ?id=
      event.respondWith(networkFirst(req, url.pathname));
    }
  } else if (CDN_HOSTS.includes(url.hostname) && url.pathname.includes('/mathjax')) {
    event.respondWith(networkFirst(req));
  }
});
