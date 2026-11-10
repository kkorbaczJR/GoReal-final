/*
 * GoReal service worker. Two jobs:
 * 1. Offline: the published site keeps a copy of every one of its files, so GoReal opens and works without
 *    internet. `scripts/pwa/precache.mjs` fills in VERSION and FILES when the site is built. Here (development)
 *    the list is empty, so nothing is kept and every request goes to the network as usual.
 * 2. Notifications: shows them and handles taps on them.
 *
 * A new version downloads in the background and waits. The app shows "New version ready", and tapping
 * Refresh tells this worker to take over (see components/PwaHost.tsx). The very first install takes over
 * right away, because there is nothing older to clash with.
 */

const VERSION = "dev";
const FILES = /* precache */ [];

const CACHE = `goreal-${VERSION}`;
const OFFLINE = FILES.length > 0;
const SCOPE = self.registration.scope;
/** The site can live under a sub-address (GitHub Pages), so build paths from where this worker was registered. */
const BASE = new URL(SCOPE).pathname.replace(/\/$/, "");

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const older = (await caches.keys()).some((k) => k.startsWith("goreal-") && k !== CACHE);
      if (OFFLINE) {
        const cache = await caches.open(CACHE);
        await cache.addAll(FILES.map((f) => new Request(new URL(f, SCOPE), { cache: "reload" })));
      }
      if (!older) await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("goreal-") && k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "goreal:update") self.skipWaiting();
  if (event.data && event.data.type === "goreal:version" && event.ports[0]) event.ports[0].postMessage(VERSION);
});

/** "/home" and "/home/" are the same page; the copy is kept under the address with the slash. */
function pageAddress(url) {
  const last = url.pathname.split("/").pop();
  const path = last && !last.includes(".") ? `${url.pathname}/` : url.pathname;
  return new URL(path, url.origin).href;
}

async function fromCopy(request) {
  const url = new URL(request.url);
  const key = request.mode === "navigate" ? pageAddress(url) : url.href;
  const hit = await caches.match(key, { cacheName: CACHE, ignoreSearch: true });
  if (hit) return hit;
  try {
    return await fetch(request);
  } catch (error) {
    if (request.mode !== "navigate") throw error;
    // Offline on a page we have no copy of: open the start page, which sends you to Today.
    const start = await caches.match(SCOPE, { cacheName: CACHE });
    if (start) return start;
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  if (!OFFLINE || event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(`${BASE}/`)) return;
  event.respondWith(fromCopy(event.request));
});

/* ---------- notifications ---------- */

const ROUTES = { home: "/home", shop: "/shop", streak: "/home" };

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const action = (event.notification.data && event.notification.data.action) || "home";
  const path = ROUTES[action] || "/home";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows[0];
      if (open) {
        open.postMessage({ type: "goreal:notification-click", action });
        return open.focus();
      }
      return self.clients.openWindow(BASE + path);
    }),
  );
});
