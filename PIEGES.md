# La Cabane (site public) — pièges

- **Fichiers du robot** : `vitrine/membres.json`, `vitrine/s/*`, `sitemap.xml` sont réécrits à chaque passage. Une modification à la main est perdue (et peut déclencher un conflit).
- **`commun.js` en deux exemplaires** : modifier les deux (ici et `cabane/robot/commun.js`), sinon le robot signale la différence dans Réglages → Santé (le test le vérifie quand les deux dépôts sont côte à côte).
- **Empreinte CSP (page staff ET vitrine)** : changer une seule lettre du script en ligne de `index.html` bloque la page staff (« rien ne s'affiche ») tant que l'empreinte `sha256-…` de la balise meta n'est pas recalculée.
- **Cache hors ligne** : oublier d'incrémenter `CACHE` / `V` dans `sw.js` = les téléphones gardent l'ancienne page. Un nouveau fichier `js/` oublié dans `FICHIERS` n'est pas disponible hors connexion.
- **Webhook en clair** : ne jamais coller une adresse `discord.com/api/webhooks/…` dans ce dépôt public (déjà arrivé, voir A_FAIRE). Elle est publique pour toujours dans l'historique git.
- **E-mails dans les bios** : `membres.json` reprend les bios Twitch telles quelles (décision d'Olivier) ; seules les fiches `vitrine/s/*` doivent les retirer.
- **Données (`data/`)** : jamais touchées par l'agence.
