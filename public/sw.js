// Minimal MEHFIL service worker: cache-first for static GET, network-first for APIs/pages.
const CACHE = "mehfil-v3";
const CORE = ["/", "/login", "/signup", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  // @ts-expect-error - ServiceWorkerGlobalScope event typing is unavailable in plain JS
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  // @ts-expect-error - ServiceWorkerGlobalScope event typing is unavailable in plain JS
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Never cache APIs or admin mutations.
  if (url.pathname.startsWith("/api/")) return;
  // @ts-expect-error - ServiceWorkerGlobalScope event typing is unavailable in plain JS
  event.respondWith(
    caches.match(req).then((hit) => {
      const go = fetch(req)
        .then((res) => {
          if (res.ok && url.origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || go;
    })
  );
});
