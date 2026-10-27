# La Cabane — site public (GitHub Pages)

Dépôt du site `https://lacabanestreamers.github.io/` : la **vitrine publique** (`/vitrine/`) et la **page staff** installable (racine, `noindex`).
Les données viennent du dépôt privé `cabane` : le robot écrit `vitrine/membres.json`, `vitrine/s/*`, `sitemap.xml`. Ne pas les modifier à la main.

Lire avant de modifier : `ARCHITECTURE.md`, `A_FAIRE.md`, `PIEGES.md`. Documents produit et techniques : `docs/` (PRD, TRD, APP_FLOW, DESIGN_BRIEF, BACKEND_SCHEMA, IMPLEMENTATION_PLAN).

## Tests
`npm test` (Node 20+, aucune dépendance) → `tests/vitrine.test.mjs`.
