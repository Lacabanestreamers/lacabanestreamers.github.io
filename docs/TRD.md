# La Cabane — TRD (exigences techniques)

Rédigé le 28/10/2026. Référence détaillée : `ARCHITECTURE.md` (ce dépôt) et `cabane/ARCHITECTURE.md` (dépôt privé).

## 1. Pile
| Partie | Technique |
|---|---|
| Page staff | HTML + CSS + 19 scripts classiques (`js/*.js`, sans framework, sans build), `commun.js` partagé avec le robot, service worker `sw.js`, `manifest.webmanifest` |
| Vitrine | Page autonome `vitrine/index.html` (HTML + CSS + JS en ligne) qui lit `vitrine/membres.json` ; pages légales + `pages.css` |
| Robot | Node 20+ sans dépendance (`robot/robot.mjs`, `commun.js`, `annee.mjs`), lancé par GitHub Actions (`robot.yml`) |
| Relais des inscriptions | Cloudflare Worker (`cabane/relais-inscriptions/worker.js`) |
| Polices | Orbitron et Rajdhani hébergées dans le site (`fonts/`, `fonts.css`), plus de Google Fonts |
| Tests | `npm test` = `node --test "tests/*.test.mjs"` (Node 20+, aucune dépendance) ; dépôt `cabane` : même commande |

## 2. Hébergement
- Site : GitHub Pages, organisation `Lacabanestreamers`, branche `main`, `https://lacabanestreamers.github.io/`.
- Données et robot : dépôt **privé** `cabane` (2 000 min d'Actions/mois gratuites, ≈ 720 consommées).
- Déclenchement horaire : cron GitHub + Raspberry Pi (minute 7, `~/cabane-robot.sh`), et réveil par la page après un enregistrement.
- Relais : `cabane-inscriptions.aulit.workers.dev` (offre gratuite Cloudflare).

## 3. Contraintes
- Pas de build : on modifie les fichiers servis tels quels.
- Version des fichiers de la page staff : `?v=AAAAMMJJ` identique dans `index.html` et `V` de `sw.js` ; `CACHE` (`cabane-vN`) incrémenté à chaque livraison.
- Tout `js/*.js` est chargé par `index.html` **et** listé dans `FICHIERS` de `sw.js`.
- `commun.js` en deux copies identiques (site et `cabane/robot/`).
- Fichiers écrits par le robot (`vitrine/membres.json`, `vitrine/s/*`, `vitrine/e/*`, `vitrine/annee/*`, `sitemap.xml`) : jamais modifiés à la main.
- `robot.mjs` toujours en fins de ligne LF ; empreintes sha256 du code du robot dans `robot.yml`.
- Fichier `google9ad7f8bd44912903.html` (Search Console) : ne jamais le supprimer.

## 4. Sécurité
- Dépôt public : **aucun secret**. Le webhook des inscriptions reste dans le secret `WEBHOOK_DISCORD` du Worker ; la vitrine ne connaît que l'adresse du relais (`inscriptions.relais`). Un test interdit tout `discord.com/api/webhooks/` en clair.
- Page staff : CSP en balise meta (script en ligne autorisé par son empreinte sha256), `noindex, nofollow`, masquée si affichée dans un cadre, `form-action 'none'`, export CSV sans formule.
- Vitrine : CSP avec empreinte du script en ligne, GoatCounter (`gc.zgo.at`, SRI) ; `connect-src` limité à decapi, Twitch, `*.workers.dev`, Discord, GoatCounter ; `style-src 'unsafe-inline'` (styles générés des cartes).
- XSS : toute donnée (JSON, Twitch, fichier ouvert, localStorage) passe par `esc()` ; URL par `safeUrl` / `okImg` / `okClip` (http(s) seulement) ; pseudos par `okLogin`. Test « XSS » dans `tests/vitrine.test.mjs`.
- Jetons du staff : un par personne, dans son navigateur, Contents en écriture sur `cabane` seulement, **jamais** la permission Workflows.
- Relais : `POST` depuis `https://lacabanestreamers.github.io` seulement, corps ≤ 1 Ko, jeton Twitch validé, une demande par compte et par minute ; le robot revérifie tout.

## 5. Accessibilité et performance
- `:focus-visible` visible, `prefers-reduced-motion` respecté, `aria-label` sur les sections et la navigation (pied de page de la vitrine en `<nav>` depuis le 28/10).
- Lighthouse automatique (`lighthouserc.json`, alertes seulement), `#main{min-height:100vh}` contre le CLS, avatars redimensionnés.

## 6. Données personnelles
Pas de cookie, pas d'iframe tierce sur la vitrine. Données Twitch publiques uniquement ; bios reprises telles quelles dans `membres.json`, e-mails retirés des fiches `vitrine/s/*`. Durées de conservation : `vitrine/confidentialite.html`.
