# La Cabane — brief de design (identité réelle)

Relevé le 18/11/2026 dans `vitrine/app.css` (`:root`), `vitrine/pages.css`, `css/cabane.css` et `fonts.css` (remplace le relevé du 28/10, d'avant le passage à l'identité commune du 07/11). La Cabane sert de référence de qualité pour les autres projets d'Olivier ; c'est un **projet commun** : aucune mise en avant des projets personnels d'Olivier.

## 1. Ambiance
« Intensité calmée » : fond violet nuit très sombre, deux halos radiaux discrets (violet en haut à gauche, cyan en haut à droite), formes anguleuses, un seul élément lumineux par écran (ombre du titre `h1`). Ton chaleureux et communautaire (« entraide et motivation », « passe leur dire bonjour en live ! »), tutoiement, apostrophes typographiques (’), emojis dans les titres de section (🎬 📅 🎂 👋 🏠 🎉), revendiqués.

## 2. Couleurs
Mêmes jetons pour la vitrine (`vitrine/app.css`, `vitrine/pages.css`) et la page staff (`css/cabane.css`).

| Jeton | Valeur | Usage |
|---|---|---|
| `--bg` | `#120d24` | fond (`theme-color` `#100B24`) |
| `--panel` / `--panel2` | `#1c1640` / `#241c4e` | cartes, champs, avatars vides |
| `--line` | `#3b2f72` | bordures décoratives (cartes, séparateurs) |
| `--line-champ` | `#7a6bbd` | bordure des champs (recherche, menu des jeux) : 4,2:1 sur `--bg`, 3,8:1 sur `--panel` (WCAG 1.4.11) |
| `--text` | `#f0edfb` | texte |
| `--muted` | `#b0a5da` | texte secondaire |
| `--cyan` | `#3fe0da` | liens, focus, filtres actifs, jeux |
| `--pink` | `#a66bff` (violet, nom historique) | bouton principal, survol, onglet actif, anneau du profil |
| `--magenta` | `#ff5aa0` | dégradé des chiffres clés |
| `--ok` | `#53e39b` | succès |
| `--ko` | `#FF5C7A` | live (pastille pulsante, badge LIVE), erreurs |
| `--aff` (vitrine) | `#C9A7FF` | badge affilié ; partenaire en violet Twitch `#9146FF` |
| `--warn` / `--grey` (staff) | `#ffb24e` / `#8e85b4` | synchro en cours / inactif |

Chiffres clés en dégradé violet → cyan (texte découpé), filet dégradé violet → magenta → cyan au-dessus. `color-scheme: dark` partout : pas de thème clair.

## 3. Typographie
Polices auto-hébergées en WOFF2 (`fonts.css`, licence OFL) ; les anciens noms `Orbitron` et `Rajdhani` utilisés dans les feuilles de style sont des **alias** vers les nouvelles polices.
- **Saira Condensed** 500–800 (alias `Orbitron`) : titres (`h1` de l'accueil 40–76 px, `h1` des pages et du profil 26–40 px, 800), `h2` de section 20 px, chiffres clés, initiales des avatars.
- **IBM Plex Sans** 400–700 (alias `Rajdhani`) : texte courant 17 px (vitrine) / 16 px (staff).
- **IBM Plex Mono** 400–500 : menu (13 px, capitales espacées), libellés des chiffres clés (13 px, 12 px sous 600 px). Aucun texte sous 12 px.
- Repli : `"Segoe UI", system-ui, sans-serif`.

## 4. Formes et composants
- Rayons courts : 3–4 px (boutons, champs, filtres, badges, onglets), 5–6 px (cartes, profil, blocs des pages annexes). Chiffres clés à coins coupés (`clip-path`).
- Cartes : fond `--panel`, bordure `--line`, survol bordure violette et léger soulèvement ; carte en live bordée de rouge.
- Avatars ronds (70×70 de la CDN Twitch pour les petits, 150×150 pour le profil et les fiches), anneau cyan (nouveaux), violet (profil) ou rouge (live).
- Aperçus de live et vignettes de clips : vraies images `<img loading="lazy">` en 16/9 (`object-fit: cover`).
- Badges en capitales 12 px : AFFILIÉ, PARTENAIRE, STAFF, LIVE.
- Lien « Aller au contenu » en tête de chaque page, visible au premier Tab.
- Page staff : barre d'en-tête collante floutée, onglet actif violet, pastille de synchro verte / jaune / rouge.

## 5. Mise en page, mouvement et accessibilité
- Accueil : en-tête, puis **En live maintenant**, puis les chiffres clés (2 colonnes compactes sous 600 px), clips de la semaine (4 au plus sous 600 px), nouveaux, réussites.
- Profil (`?m=`) : l'en-tête de la page est masqué, le nom du streamer est le `h1` ; un seul `h1` par page et par écran du staff.
- Grilles `auto-fill` jusqu'à 250–320 px, une colonne sous 600 px ; aucun débordement à 320 px.
- Pulsation de la pastille live et mise en valeur de l'événement ciblé **seulement** si `prefers-reduced-motion` le permet. Contour de focus cyan 2 px.

## 6. Images
Icône 🛖 (favicon de la page staff), `icon-192/512.png` et icône masquable, aperçu de partage `vitrine/apercu.png` (1200×630). Pas de source vectorielle dans le dépôt : la référence du logo est l'icône PNG `icon-512.png` (déclinée en `icon-192.png` et `icon-maskable-512.png`).
