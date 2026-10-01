/*
 * The service worker that receives push messages.
 *
 * Deliberately plain JavaScript in public/ rather than part of the bundle: a
 * service worker has to be served from the root to control the whole site, and
 * it runs when no page is open, so it cannot depend on anything the app loads.
 *
 * It does two things and nothing else -- show what arrived, and put the person
 * where the notification points.
 */

self.addEventListener("install", () => {
  // Take over straight away rather than waiting for every tab to close.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // A malformed message still deserves to say something rather than nothing.
    payload = { title: "Rachels Closet", body: "You have a new message." };
  }

  const title = payload.title || "Rachels Closet";

  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      // PNG, not the SVG: Android will not reliably render an SVG in a
      // notification, and a notification with no icon is easy to ignore.
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      // Alerts about the same thing replace each other rather than stacking up.
      // This matters more here than on most sites: a nine-step garment would
      // otherwise leave nine separate notices on a lock screen.
      tag: payload.type || "rachelscloset",
      renotify: true,
      // A phone that buzzes is the whole point -- a silent notice is no better
      // than walking to the shop to find out.
      vibrate: [80, 40, 80],
      data: { url: payload.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus a tab that is already open rather than opening a second one.
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus();
          // Tell the app where to go; it navigates without a full reload.
          client.postMessage({ type: "notification-click", url: target });
          return undefined;
        }
      }

      return self.clients.openWindow(target);
    }),
  );
});
