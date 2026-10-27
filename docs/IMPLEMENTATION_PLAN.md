# La Cabane — état et prochaines étapes

Mis à jour le 28/10/2026 à partir de `A_FAIRE.md` (ce dépôt) et `cabane/A_FAIRE.md`.

## 1. État actuel (en production)
- Page staff complète (9 écrans, recherche, hors connexion, installable), découpée en 19 fichiers `js/`.
- Robot horaire en étapes isolées, relevés séparés (données version 2), sauvegardes, archives, santé, garde-fous, empreinte vérifiée.
- Vitrine publique : sections, page par membre, fiches indexables, pages de partage, récap annuel, inscriptions par relais Cloudflare.
- Conformité : pages légales, polices hébergées, CSP sur la page staff et la vitrine, contrôle XSS (27/10), Search Console, Lighthouse automatique.
- 28/10 : pied de page de la page staff avec les liens légaux ; pied de page de la vitrine en `<nav>` ; six documents `docs/`.
- Tests : `npm test` (25 tests, dont 1 « à faire »).

## 2. Prochaines étapes (développement)
1. Fiche `vitrine/s/detectiverenard.html` : affiche encore un e-mail. Attendre le prochain passage du robot ; si l'e-mail reste, corriger le filtre dans `cabane/robot/robot.mjs` (puis empreinte dans `robot.yml`). Retirer ensuite le `todo` du test.
2. Contrôler dans le navigateur la CSP de la vitrine : console sans erreur (liste, live, Je participe, GoatCounter).
3. `sitemap.xml` : une fois les fiches membres ajoutées par le robot, étendre le test à ces lignes.
4. Si `vitrine/index.html` grossit encore (≈ 680 lignes), la découper comme la page staff (CSS et JS à part, empreinte CSP à revoir).
5. Recréer, si besoin, les outils de test hors dépôt (simulateur du robot, Playwright, axe-core) décrits dans `cabane/ARCHITECTURE.md` §7.

## 3. Actions d'Olivier
- Tester « Je participe » sur la vitrine avec le nouveau webhook.
- Supprimer les branches et étiquettes du dépôt `cabane` autres que `main`.
- Vérifier qu'aucun jeton du staff n'a la permission Workflows, et qui est admin du dépôt `cabane`.
- Relire `vitrine/confidentialite.html` et remplir le lien Discord de la vitrine (Réglages → Vitrine publique).
- Choix : pouvoir republier un récap annuel ancien pour en retirer un membre ?
- Fin 2027 : premier tri manuel des fiches fermées depuis 12 mois.

## 4. Règles de livraison
Tests verts (`npm test`) → incrémenter `?v=` et `CACHE` si la page staff change → recalculer l'empreinte CSP si un script en ligne change → commit + `git pull --rebase` + `git push` → vérifier en ligne.
