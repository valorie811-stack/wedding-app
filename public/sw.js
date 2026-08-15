// Minimal service worker: network-first for page navigations (with an offline
// fallback), cache-first for immutable built assets only. Bump CACHE to invalidate.
// Bump on every change to unhashed public/ art: isStaticAsset() serves those
// cache-first, so returning users keep the old icons until the cache name
// changes. v3 was the matcha 囍; v4 swaps the whole set to the photo icons.
const CACHE = "tw-v4";
const OFFLINE_URL = "/offline";

// Only these are safe to serve cache-first: hashed build output and static images.
// Everything else (RSC data requests, API calls, dynamic pages) must hit the
// network, otherwise tabs show stale data after edits.
function isStaticAsset(url) {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/_next/static/")) return true;
  if (url.pathname.startsWith("/_next/image")) return true;
  return /\.(svg|png|jpg|jpeg|gif|webp|ico|woff2?)$/.test(url.pathname);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll([OFFLINE_URL])).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Full-page navigations: network-first with offline fallback.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // Cache-first strictly for immutable static assets. Do NOT intercept anything
  // else — in particular Next.js RSC payload fetches (client-side tab
  // navigations), which must always be fresh.
  const url = new URL(req.url);
  if (!isStaticAsset(url)) return;

  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached)
    )
  );
});
