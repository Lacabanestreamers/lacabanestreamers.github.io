// Service worker de La Cabane : rend la page installable et l'ouvre même hors connexion.
// Stratégie « réseau d'abord » : chaque mise à jour de index.html est prise dès qu'il y a du réseau.
// Les données (GitHub, Twitch, decapi) ne passent jamais par ce cache.
const CACHE = "cabane-v1";
const FICHIERS = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if(e.request.method !== "GET" || url.origin !== location.origin) return;   // API et autres sites : pas touchés
  e.respondWith(
    fetch(e.request).then(r => {
      if(r.ok){ const copie = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copie)); }
      return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match("index.html")))
  );
});
