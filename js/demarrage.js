// La Cabane · page staff · Démarrage de la page (en dernier : tout le reste est déjà chargé).
// Scripts classiques chargés dans l'ordre par index.html : ils partagent les mêmes variables globales.
/* ============ Démarrage ============ */
// Application installable : le service worker ne sert que la page elle-même (réseau d'abord, cache si hors ligne)
if("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
(function init(){
  if(window.__versVitrine) return;          // connexion Twitch de la vitrine : la page part tout de suite vers /vitrine/
  catchTwitchRedirect();
  if(cfg.owner && cfg.repo && cfg.token){ connectGithub(); }
  else {
    const local = store.get(LOCAL_KEY, null);
    if(local && local.membres){ S.data = local; S.mode = "local"; ensureShape(); loadLive(); }
    render(); updateSync();
  }
})();
