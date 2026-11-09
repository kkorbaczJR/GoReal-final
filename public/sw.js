/* GoReal service worker. It only shows notifications and handles taps on them. No caching. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

const ROUTES = { home: "/home", shop: "/shop", streak: "/home" };
/** The site can live under a sub-address (GitHub Pages), so build paths from where this worker was registered. */
const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, "");

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
