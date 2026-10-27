# La Cabane — brief de design (identité réelle)

Relevé le 28/10/2026 dans `vitrine/index.html` (`:root`), `css/cabane.css` et `fonts.css`. La Cabane sert de référence de qualité pour les autres projets d'Olivier.

## 1. Ambiance
Néon nocturne : fond violet nuit très sombre, halos rose et cyan en dégradés radiaux, titres lumineux. Ton chaleureux et communautaire (« entraide et motivation », « passe leur dire bonjour en live ! »), tutoiement, emojis dans les titres de section (🎬 📅 🎂 👋 🏠 🎉).

## 2. Couleurs
| Jeton | Valeur | Usage |
|---|---|---|
| `--bg` | `#100B24` | fond (aussi `theme-color`) |
| `--panel` / `--panel2` | `#18123A` / `#201951` | cartes, champs, avatars vides |
| `--line` | `#2E2663` | bordures |
| `--text` | `#ECE9FF` | texte |
| `--muted` | `#A59FD3` (vitrine) / `#9C95CB` (staff) | texte secondaire |
| `--cyan` | `#3DE3FF` | liens, focus, filtres actifs, jeux |
| `--pink` | `#FF4FD8` | bouton principal, survol, staff, halo du titre |
| `--ok` | `#5CF2A6` | succès |
| `--ko` | `#FF5C7A` | live (pastille pulsante, badge LIVE), erreurs |
| `--aff` | `#C9A7FF` | badge affilié ; partenaire en violet Twitch `#9146FF` |
| `--warn` / `--grey` (staff) | `#FFC857` / `#8E89B4` | synchro en cours / inactif |

Chiffres clés en dégradé rose → cyan (texte découpé). `color-scheme: dark` partout : pas de thème clair.

## 3. Typographie
- **Orbitron** (variable, hébergée) : titres (`h1` 40–76 px, 800, ombre néon rose), `h2` de section, chiffres, initiales des avatars.
- **Rajdhani** 500/600/700 (hébergée) : texte courant 17 px (vitrine) / 16 px (staff), sous-titre en capitales espacées cyan.
- Repli : `"Segoe UI", system-ui, sans-serif`.

## 4. Formes et composants
- Rayons : 10 px (boutons, champs), 12–14 px (cartes), 16–18 px (bloc Rejoindre, profil), pastilles `999px` (filtres, jeux).
- Cartes : fond `--panel`, bordure `--line`, survol bordure rose et léger soulèvement ; carte en live bordée de rouge.
- Avatars ronds, anneau cyan (nouveaux), rose (profil) ou rouge (live).
- Badges en capitales 12 px : AFFILIÉ, PARTENAIRE, STAFF, LIVE.
- Page staff : barre d'en-tête collante floutée, onglet actif souligné de rose, pastille de synchro verte / jaune / rouge.

## 5. Mouvement et accessibilité
Pulsation de la pastille live et mise en valeur de l'événement ciblé **seulement** si `prefers-reduced-motion` le permet. Contour de focus cyan 2 px. Mise en page en grilles `auto-fill` jusqu'à 250–320 px, une colonne sous 600 px.

## 6. Images
Icône 🛖 (favicon de la page staff), `icon-192/512.png` et icône masquable, aperçu de partage `vitrine/apercu.png` (1200×630). Fichier source du logo : à confirmer par Olivier.
