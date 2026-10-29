# La Cabane (site public) — suivi
Mis à jour le 29/10/2026. Le suivi du robot et des données est dans `cabane/A_FAIRE.md` (dépôt privé).

## Fait
- 29/10 — CSP sur toutes les pages HTML : pages légales (GoatCounter seulement, bouton « Ne pas être compté » sorti dans `vitrine/gc-choix.js`), `404.html`, et fiches/événements/récaps écrits par le robot (gabarit dans `cabane`). Test « toute page HTML a une CSP ». Confidentialité : le relais ne transmet plus le jeton Twitch à Discord (demande signée). Fiches régénérées par le robot : le test « aucune adresse e-mail » passe, `todo` retiré. Sitemap : `lastmod` réel des fiches et de la vitrine (écrit par le robot). 26 tests verts.
- 28/10 — Page staff : pied de page avec les liens Mentions légales, Confidentialité et CGU de la vitrine (`css/cabane.css`, `?v=20261028`, cache `cabane-v16`). Vitrine : la vitrine n'a pas de menu d'ancres ; le seul groupe de liens de navigation (pied de page) est passé en `<nav aria-label="Sources et pages légales">` (script en ligne inchangé, empreinte CSP intacte). Documents `docs/` : PRD, TRD, APP_FLOW, DESIGN_BRIEF, BACKEND_SCHEMA, IMPLEMENTATION_PLAN.
- 27/10 — `ARCHITECTURE.md`, `PIEGES.md`, `README.md` et tests de non-régression (`npm test`, 23 tests dont 1 « à faire »).
- Voir l'historique git et `cabane/A_FAIRE.md` pour le reste (CSP, SEO des fiches, relais d'inscription, pages légales).

## À faire (dev)
- CSP de la vitrine posée le 27/10 (empreinte du script en ligne ; `style-src` garde `unsafe-inline` car les cartes posent des `style=` générés). À contrôler dans le navigateur : console sans erreur CSP (liste, live, Je participe, GoatCounter).
- Lot E fait le 27/10 : contrôle XSS des `innerHTML` (voir `ARCHITECTURE.md`), 7 interpolations de nombres/paliers issus des données maintenant passées par `esc()`, test de non-régression ajouté (25 tests).

## À faire (Olivier)
