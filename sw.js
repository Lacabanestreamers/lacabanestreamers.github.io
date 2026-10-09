// Service worker de La Cabane : rend la page installable et l'ouvre même hors connexion.
// Stratégie « réseau d'abord » : chaque mise à jour de index.html est prise dès qu'il y a du réseau.
// Réseau trop lent (plus de 4 s) : la version en cache s'affiche tout de suite, la nouvelle est rangée pour la fois suivante.
// Les données (GitHub, Twitch, decapi) ne passent jamais par ce cache.
const CACHE = "cabane-v5";
// la page est découpée en plusieurs fichiers : tous mis en cache à l'installation (même numéro de version que dans index.html)
const V = "?v=20261009";
const FICHIERS = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "commun.js" + V, "css/cabane.css" + V,
  ...["donnees", "twitch", "vues", "fiche", "aide", "agenda", "reglages", "actions", "recherche", "demarrage"].map(n => `js/${n}.js${V}`)];
const DELAI = 4000;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if(e.request.method !== "GET" || url.origin !== location.origin) return;   // API et autres sites : pas touchés
  if(url.pathname.includes("/vitrine/")) return;                              // la vitrine publique n'est pas mise en cache
  const reseau = fetch(e.request).then(r => {
    if(r.ok){ const copie = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copie)); }
    return r;
  });
  const cache = () => caches.match(e.request, {ignoreSearch:true}).then(r => r || caches.match("index.html"));
  e.waitUntil(reseau.catch(() => {}));                                        // la mise en cache se termine même si le cache a répondu avant
  e.respondWith(new Promise(ok => {
    let fini = false;
    const t = setTimeout(() => cache().then(r => { if(r && !fini){ fini = true; ok(r); } }), DELAI);
    reseau.then(r => { clearTimeout(t); if(!fini){ fini = true; ok(r); } })
      .catch(() => { clearTimeout(t); cache().then(r => { if(!fini){ fini = true; ok(r || Response.error()); } }); });
  }));
});
