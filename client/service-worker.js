// A versão antiga do jogo instalava um cache offline. Este arquivo apaga esse cache,
// remove o service worker e recarrega as abas abertas na versão nova.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) await caches.delete(key);
    await self.registration.unregister();
    const windows = await self.clients.matchAll({ type: "window" });
    for (const client of windows) client.navigate(client.url);
  })());
});
