# La Cabane (site public) — architecture

Site statique GitHub Pages, sans build. Deux parties dans le même dépôt :
la **vitrine publique** (indexée) et la **page staff** (installable, `noindex`, protégée par un jeton GitHub côté navigateur).
La description détaillée du robot, des données et de la sécurité est dans `cabane/ARCHITECTURE.md` (dépôt privé) : ici, seulement ce qui concerne ce dépôt.

## Modules
| Fichier | Rôle |
|---|---|
| `vitrine/index.html` | Vitrine : page autonome (HTML + CSS + JS en ligne) qui lit `vitrine/membres.json`. Aide d'affichage : `esc`, `okLogin`, `okImg`. |
| `vitrine/membres.json` | Membres, chiffres, agenda, relais d'inscription. **Écrit par le robot.** |
| `vitrine/s/<pseudo>.html` | Fiche membre indexable. **Écrite par le robot.** |
| `vitrine/e/*`, `vitrine/annee/*` | Pages de partage d'événement et récap annuel (robot, absentes tant qu'il n'y en a pas). |
| `vitrine/confidentialite.html`, `cgu.html`, `mentions-legales.html`, `pages.css` | Pages légales ; `pages.css` reprend le `:root` de la vitrine. |
| `index.html` + `css/cabane.css` | Page staff : coquille, ordre de chargement des 19 scripts (`?v=AAAAMMJJ`), pied de page `.pied` vers les pages légales de la vitrine. |
| `commun.js` | Calculs partagés avec le robot (dates de Paris, séries, stagnation, paliers, relevés). **Deux copies identiques** : ici et `cabane/robot/commun.js`. |
| `js/*.js` | Page staff, un fichier par écran ou fonction (liste dans `cabane/ARCHITECTURE.md`). |
| `sw.js` | Service worker de la page staff : réseau d'abord (4 s) puis cache `cabane-vN`. Ne met pas en cache la vitrine, ni les autres origines, ni les non-GET. |
| `manifest.webmanifest`, `icon-*.png`, `fonts/`, `fonts.css` | Application installable, polices hébergées (Orbitron, Rajdhani). |
| `404.html`, `robots.txt`, `sitemap.xml`, `google…html`, `lighthouserc.json` | Indexation, vérification Search Console, seuils Lighthouse (alertes seulement). |
| `tests/vitrine.test.mjs` | Tests de non-régression (`npm test`). |

## Règles qui tiennent l'ensemble
- Numéro de version `?v=` : identique dans `index.html` et dans `V` de `sw.js` ; `CACHE` (`cabane-vN`) à incrémenter à chaque livraison de la page staff.
- Tout `js/*.js` est à la fois chargé par `index.html` et listé dans `FICHIERS` de `sw.js`.
- CSP de la page staff en balise meta : le script en ligne du `<head>` est autorisé par son **empreinte sha256** ; modifier ce script impose de recalculer l'empreinte (le test l'indique).
- Contrôle XSS (27/10) : 24 usages d'`innerHTML` (page staff + vitrine) relus ; toute donnée venant des JSON, de Twitch, d'un fichier ouvert ou du localStorage passe par `esc()`, les URL par `safeUrl` / `okImg` / `okClip` (http(s) seulement), les attributs sont toujours entre guillemets. Le test « XSS » interdit `${x.bio}`, `${x.palier}`… bruts dans un gabarit.
- La vitrine n'a pas de CSP (elle est indexable, avec script en ligne et GoatCounter) : tout texte venant des données passe par `esc()`, les pseudos par `okLogin`, les images par `okImg`.
- `robots.txt` autorise tout : la page staff se protège par `noindex`, qui doit rester lisible par les moteurs.
- Aucun secret dans ce dépôt public : le webhook des inscriptions est derrière le relais Cloudflare (`inscriptions.relais`), jamais en clair.

## Tests (`npm test`)
`tests/vitrine.test.mjs` (node:test, sans dépendance) vérifie : `commun.js` (dates, heure d'été, séries, paliers, relevés) et sa copie dans le robot ;
cohérence `index.html` / `sw.js` (versions, fichiers) ; empreinte CSP du script en ligne ; manifest ; structure de `membres.json` ;
absence de webhook Discord en clair dans tout le dépôt ; garde-fous de la vitrine (`esc`, `rel=noopener`, indexable) ; fiches membres ; `sitemap.xml` et `robots.txt`.
