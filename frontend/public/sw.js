/* Thera Care — minimal PWA service worker (FR-13). Bump STATIC_CACHE when this file changes. */
const STATIC_CACHE = "thera-pwa-shell-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      const urls = ["/offline", "/icons/icon-192.png", "/icons/icon-512.png"];
      await Promise.all(
        urls.map(async (u) => {
          try {
            await cache.add(u);
          } catch (e) {
            console.warn("[sw] precache skip", u, e);
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE) return caches.delete(key);
        }),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api")) {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(
            JSON.stringify({
              statusCode: 503,
              message: "Network unavailable",
            }),
            {
              status: 503,
              headers: { "Content-Type": "application/json" },
            },
          ),
      ),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches
          .match("/offline")
          .then((c) => c ?? new Response("Offline", { status: 503 })),
      ),
    );
    return;
  }
});
