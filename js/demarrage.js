// La Cabane · page staff · Démarrage de la page (en dernier : tout le reste est déjà chargé).
// Scripts classiques chargés dans l'ordre par index.html : ils partagent les mêmes variables globales.
/* ============ Démarrage ============ */
// Application installable : le service worker ne sert que la page elle-même (réseau d'abord, cache si hors ligne)
// updateViaCache:"none" → le navigateur ne met jamais sw.js en cache HTTP : une nouvelle version est prise au prochain chargement.
// On force aussi un contrôle de mise à jour à chaque ouverture et au retour sur l'onglet, pour ne jamais rester bloqué sur l'ancienne version.
if("serviceWorker" in navigator && location.protocol === "https:"){
  navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(reg => {
    reg.update();
    document.addEventListener("visibilitychange", () => { if(document.visibilityState === "visible") reg.update(); });
    // Nouveau service worker actif (après skipWaiting) : on recharge une seule fois pour afficher la version à jour.
    let recharge = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => { if(recharge) return; recharge = true; location.reload(); });
  }).catch(() => {});
}
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
