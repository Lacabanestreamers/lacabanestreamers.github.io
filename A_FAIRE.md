# La Cabane (site public) — suivi
Mis à jour le 27/10/2026. Le suivi du robot et des données est dans `cabane/A_FAIRE.md` (dépôt privé).

## Fait
- 27/10 — `ARCHITECTURE.md`, `PIEGES.md`, `README.md` et tests de non-régression (`npm test`, 23 tests dont 1 « à faire »).
- Voir l'historique git et `cabane/A_FAIRE.md` pour le reste (CSP, SEO des fiches, relais d'inscription, pages légales).

## À faire (dev)
- Les fiches `vitrine/s/*` encore en ligne datent d'avant le 27/10 (redirection, e-mail visible chez `detectiverenard`) : attendre le prochain passage du robot, puis le test « aucune adresse e-mail » (marqué `todo`) doit passer ; retirer alors le `todo`.
- La vitrine n'a pas de CSP (script en ligne + GoatCounter) : étudier une CSP avec empreintes, comme la page staff.
- `sitemap.xml` ne contient pas encore les fiches membres (le robot les ajoutera) : étendre le test à ces lignes une fois publiées.
- Lot E (contrôle XSS des `innerHTML`) : confié séparément, à rejouer avec `npm test` après.

## À faire (Olivier)
- Changer le webhook « Relais vitrine » publié par erreur (voir `cabane/A_FAIRE.md`) : le test empêche une nouvelle fuite, pas l'ancienne.
