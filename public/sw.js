// Service worker minimal : juste ce qu'il faut pour que le site soit
// installable comme une app (critère requis par Chrome/Android). Pas de
// cache agressif volontairement, pour toujours servir la dernière version
// des données personnelles.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
