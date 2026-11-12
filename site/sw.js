// idid.care website: show a gentle offline page instead of the browser's error when the connection drops.
// The version placeholder below is replaced at build time with a hash of site.css + site.js, so each deploy gets fresh assets.
const CACHE = 'idid-site-__V__';
const CORE = ['/', '/learn', '/privacy', '/assets/site.css?v=__V__', '/assets/site.js?v=__V__', '/assets/logo.svg', '/errors/offline.html'];
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE))); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    // Network first; fall back to a cached copy of the page, then to the offline page.
    e.respondWith(fetch(req).then((r) => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then((x) => x.put(req, c)); } return r; })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('/errors/offline.html'))));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
