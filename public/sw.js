self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data?.json() || {};
  } catch {
    data = { body: event.data?.text() };
  }
  const safePath =
    typeof data.url === "string" && /^\/t\/[0-9a-f-]{36}$/i.test(data.url)
      ? data.url
      : "/";
  event.waitUntil(
    self.registration.showNotification(data.title || "Counter Pager", {
      body: data.body || "Your order has an update",
      tag: data.tag || "order-update",
      renotify: true,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: safePath },
      requireInteraction: data.status === "ready",
      vibrate: [300, 150, 300],
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(
    event.notification.data?.url || "/",
    self.location.origin,
  );
  if (url.origin !== self.location.origin) return;
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (clients) => {
        const exact = clients.find((c) => c.url === url.href);
        if (exact) return exact.focus();
        return self.clients.openWindow(url.href);
      }),
  );
});
