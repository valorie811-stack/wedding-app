// Minimal service worker: network-only for page navigations (with an offline
// fallback), cache-first for immutable built assets only. Bump CACHE to invalidate.
// Bump on every change to unhashed public/ art: isStaticAsset() serves those
// cache-first, so returning users keep the old icons until the cache name
// changes. v3 was the matcha 囍; v4 swapped the whole set to the photo icons.
// v5 stops caching page navigations (see the fetch handler) — the bump is what
// evicts the private pages v4 already wrote on existing installs.
const CACHE = "tw-v5";
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

  // Full-page navigations: network only, with the offline page as the fallback.
  //
  // Deliberately NOT cached. Every page behind the PIN gate renders private
  // data — guest names, phone numbers, dietary needs, vendor contacts — and a
  // cached copy outlives the session that was allowed to see it: signing out
  // clears the cookie but not the Cache API, so the last-viewed guest list
  // stayed readable offline on a shared or lost device with no PIN at all.
  // Caching a page for offline reading and gating it behind a session are not
  // compatible, and the gate wins.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(
        async () =>
          (await caches.match(OFFLINE_URL)) ||
          new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } })
      )
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
