# La Cabane — données, robot et services

Rédigé le 28/10/2026 à partir de `cabane/robot/robot.mjs` (types JSDoc), `cabane/README.md`, `cabane/ARCHITECTURE.md` et `cabane/relais-inscriptions/worker.js`. Les fichiers de données eux-mêmes n'ont pas été ouverts : seuls les champs décrits dans le code sont listés.

## 1. Vue d'ensemble
```
Page staff (navigateur, jeton GitHub) ──lit/écrit──> dépôt privé cabane : cabane-data.json, cabane-releves.json
          │ réveil (workflow_dispatch)                       ▲
          ▼                                                   │ lit/écrit
GitHub Actions robot.yml (cron + Raspberry Pi + page) ── robot/robot.mjs ── Twitch Helix, Discord (webhooks + bot)
          │ VITRINE_TOKEN (Contents)
          ▼
dépôt public lacabanestreamers.github.io : vitrine/membres.json, vitrine/s|e|annee/*, sitemap.xml
          ▲
Vitrine ──POST {ev, action, jeton}──> relais Cloudflare ──webhook──> salon Discord privé ──relu par le robot
```

## 2. Dépôt privé `cabane`
### `cabane-data.json` (`"version": 2`) — type `Donnees`
| Champ | Contenu |
|---|---|
| `membres[]`, `propositions[]` | Fiches (type `Fiche`, ci-dessous) |
| `agenda[]` | Événements (type `Evenement`) |
| `series[]` | Séries récurrentes d'événements |
| `paliers[]`, `evenements[]` | Paliers de follows franchis, affiliations / partenariats (`masque` pour ne pas les publier) |
| `journal[]` | `{le, par, txt}` : historique (250 dernières lignes, le reste archivé) |
| `corbeille[]` | Fiches supprimées |
| `settings` | Réglages : `vitrine` (`active`, `titre`, `texte`, `lienDiscord`, `rejoindre{actif,titre,texte}`, `reussitesJours`, `recapDemande`), `twitchClientId`, `modeles`, admins, listes… |
| `robot` | État du robot (dont `recaps`) |

**Fiche** : `id`, `login`, `twitchId`, `type`, `statut` (ex. « Parti »), `role` (« Admin », « Modo »…), `introuvable`, `followsMode`, `followsManuel`, `palierMax`, `premierStream`, `arrivee`, `discord`, `discordId`, `masquerVitrine`, `viewers[[date, n]]`, `jeuxLog[[date, jeu]]`, `dernierLive`, `derniereVod`, `clip`, `candidature`, `creePar`, `rappels[{id, date, texte, par}]` + champs libres du staff (avis, notes, contacts).

**Evenement** : `id`, `titre`, `date` (AAAA-MM-JJ), `heure`, `duree` (min, 120 par défaut), `type`, `description`, `lien`, `public`, `discord`, `publierDiscord`, `publieDiscord` (message publié), `participants[]` (logins), `viaDiscord[]`, `discordInconnus[{id, nom}]`, `annonceJour`, `annonceVeille`, `serie`.

### Autres fichiers
| Fichier | Contenu |
|---|---|
| `cabane-releves.json` | Relevés `{date, source, follows:{login: n}, props}` (matin, midi, soir ; un gardé par jour) |
| `archives/cabane-archive.json` | `{snapshots, agenda, journal, maj}` : relevés > 90 jours (1 par mois gardé dans le principal), événements passés > 90 jours, vieux journal |
| `sauvegardes/cabane-data-AAAA-MM-JJ.json` | 8 automatiques (dimanche) + 5 manuelles |
| `robot-etat.json` | Mode silence (écriture refusée) |

## 3. Robot (`robot/robot.mjs`, workflow `robot.yml`)
- Déclenchement : cron `7 * * * *`, Raspberry Pi (minute 7), réveil par la page. Entrées manuelles : forcer le relevé, faire une sauvegarde, `pi` (expiration du jeton du Pi). `timeout-minutes: 10`, seulement sur `main`, empreinte sha256 de `robot.mjs`, `commun.js`, `annee.mjs` vérifiée avant lancement.
- Étapes isolées : lives et viewers, suivi des pseudos (par `twitchId`), affilié/partenaire, relevés de follows (8 h, 12 h, 19 h) et paliers de 50, anniversaires (9 h), annonces admin, événements Discord (publication, rappels veille 18 h / jour 9 h, événements natifs), inscriptions (✅ et relais), avis du staff 👍 🤔 👎, sauvegarde du dimanche, archivage nocturne, copie mensuelle dans Commandes, vitrine et pages de partage, récap annuel (décembre → 7 janvier, ou à la demande), santé.
- Garde-fous : n'écrit rien si des fiches disparaissent ; alerte si −20 % ; mode silence ; jamais de fiche retirée.
- Secrets GitHub : `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `DISCORD_WEBHOOK_ADMIN` / `_CELEBRATION` / `_EVENEMENTS` / `_COMMANDES` / `_INSCRIPTIONS` (+ ancien `_URL`), `DISCORD_BOT_TOKEN`, `VITRINE_TOKEN`. Variable : `RELAIS_INSCRIPTIONS_URL`.

## 4. Dépôt public (ce dépôt), écrit par le robot
### `vitrine/membres.json`
| Champ | Contenu |
|---|---|
| `active` | `false` = vitrine coupée (rien d'autre) |
| `titre`, `texte`, `lienDiscord` | Textes des Réglages ; lien seulement `discord.gg` / `discord.com/invite` |
| `maj` | Date du passage |
| `chiffres` | `membres`, `affilies`, `nouveaux30`, `heuresLive30`, `followsGagnes30`, `periode{du, au}` |
| `agenda[]` | Événements publics des 60 prochains jours : `id`, `titre`, `date`, `heure`, `type`, `description` (≤ 600), `lien` (https), `duree`, `discord` (lien du message), `participants[{login, nom, avatar}]` |
| `membres[]` | Membres visibles (ni partis, ni masqués, ni introuvables) : `login`, `nom`, `avatar`, `bio` (≤ 300), `type` (`affiliate`/`partner`/vide), `staff`, `depuis`, `live` (ou `null`), `premierStream`, `succes[{type, date, palier}]`, `jeux`, `clip` |
| `reussitesJours` | Fenêtre du mur « Nos réussites » (0–365, 30 par défaut) |
| `rejoindre` | `{titre, texte}` ou `null` |
| `inscriptions` | `{relais, clientId}` ou `null` (bouton « Je participe » masqué) |

### Pages générées
`vitrine/s/<pseudo>.html` (fiche indexable, sans e-mail), `vitrine/e/<id>` (partage d'événement), `vitrine/annee/AAAA.html` (récap annuel), lignes de `sitemap.xml`.

## 5. Relais Cloudflare (`cabane/relais-inscriptions/worker.js`)
Entrée : `POST {ev, action: "in"|"out", jeton}` depuis l'origine du site. Vérifie le jeton (`id.twitch.tv/oauth2/validate`, `CLIENT_ID_TWITCH`), limite une demande par compte et par minute, puis poste `{cabane:"inscription", ev, action, jeton}` dans le salon privé (secret `WEBHOOK_DISCORD`). Le robot relit, revérifie et efface.

## 6. Navigateur (page staff)
`localStorage` : jeton GitHub, prénom, colonnes, vues sans prénom, panneaux ouverts, copie hors connexion. Vitrine : `sessionStorage` `cabane.vitrine.oauth` (état de la connexion Twitch).
