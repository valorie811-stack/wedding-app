"use client";

import { useEffect } from "react";

// Registers the service worker once on mount. No-ops where unsupported.
//
// Production only. In dev, Turbopack serves /_next/static/ chunks under stable
// filenames whose contents change on every edit, and sw.js treats that path as
// immutable (cache-first) — so an edit to globals.css keeps rendering the old
// CSS until the cache is cleared by hand. Unregister anything left behind by a
// previous dev session so nobody hits that.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .then(() => (window.caches ? caches.keys() : []))
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .catch(() => {});
      return;
    }

    const onLoad = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
  }, []);
  return null;
}
