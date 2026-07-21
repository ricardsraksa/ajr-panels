/* AJR CRM service worker — makes the morning's first load feel like the tenth.
 *
 * Strategy, deliberately boring:
 *  - Versioned/static assets (.js/.mjs with ?v=, fonts): cache-first. Their
 *    URL changes when their content does, so a cached copy is never wrong.
 *  - HTML: network-first, cache fallback. Deploys land on the next click when
 *    online; offline still opens the last-seen page.
 *  - Everything else (Supabase API, anything cross-origin): untouched — data
 *    freshness is the app's job, not this file's.
 */
const CACHE = 'ajr-static-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);

  const isFont = u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com';
  // only scripts that carry a version token — an unversioned file (parser.js)
  // served cache-first would be pinned to its first-seen copy forever
  const isStatic = u.origin === self.location.origin && /\.(mjs|js)$/.test(u.pathname) && u.searchParams.has('v');
  const isHtml = u.origin === self.location.origin && u.pathname.endsWith('.html');

  if (isStatic || isFont) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const hit = await c.match(e.request);
      if (hit) return hit;
      const r = await fetch(e.request);
      if (r.ok) c.put(e.request, r.clone());
      return r;
    })());
  } else if (isHtml) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      try {
        const r = await fetch(e.request);
        if (r.ok) c.put(e.request, r.clone());
        return r;
      } catch (err) {
        const hit = await c.match(e.request);
        if (hit) return hit;
        throw err;
      }
    })());
  }
});
