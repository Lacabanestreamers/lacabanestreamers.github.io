# La Cabane — PRD (besoin produit)

Rédigé le 28/10/2026 à partir du code et des docs du dépôt (`README.md`, `ARCHITECTURE.md`) et du dépôt privé `cabane`.

## 1. Besoin
La Cabane est une communauté d'entraide et de motivation entre streamers francophones sur Twitch.
Il lui faut :
- un **outil de suivi pour le staff** : qui est membre, quelles chaînes sont proposées, leur progression (follows, lives, paliers), les événements, les anniversaires ;
- une **vitrine publique** qui présente les membres, qui est en live et les prochains événements, pour donner envie de les suivre et de rejoindre la communauté.

## 2. Utilisateurs
| Qui | Accès | Ce qu'il fait |
|---|---|---|
| Staff (admins, modos, référents) | Page staff `https://lacabanestreamers.github.io/` + jeton GitHub personnel | Gère fiches, propositions, événements, réglages de la vitrine |
| Admins de la page | Idem, listés dans Réglages | En plus : restaurer, supprimer définitivement, importer, modifier les Réglages (garde-fou, pas une vraie sécurité) |
| Membres (streamers) | Vitrine, connexion Twitch seulement pour « Je participe » | Se voient sur la vitrine, s'inscrivent aux événements |
| Visiteurs | Vitrine publique, sans compte | Découvrent les membres, les lives, les clips, les événements |

## 3. Fonctions
**Page staff** (écrans du menu) : Accueil (à faire, nouveaux, propositions en charge), Propositions, Streamers, Anniversaires, Tableau de bord (graphiques, entonnoir), Événements (et séries), Nettoyage, Réglages (vitrine, sauvegardes, corbeille, santé du robot, jetons), Aide. Recherche globale (Ctrl+K), annulation 15 s, gestion des conflits d'édition, copie hors connexion, installable sur téléphone, notifications du navigateur.

**Vitrine** (`/vitrine/`) : La Cabane en chiffres, En live maintenant, Clips de la semaine, Prochains événements (Je participe, ajout à l'agenda, partage), Anniversaires, Nouveaux, Nos réussites, Nos streamers (recherche, filtres Tous / En live / Affiliés / Staff / jeu), section « Rejoindre », page par membre (`?m=`), « Découvrir un streamer » au hasard. Fiches indexables `vitrine/s/<pseudo>.html`, pages de partage `vitrine/e/<id>`, récap annuel `vitrine/annee/AAAA.html`. Pages légales : mentions légales, confidentialité, CGU.

**Robot** (dépôt privé `cabane`, toutes les heures) : relevés Twitch, annonces Discord, inscriptions, sauvegardes, publication de la vitrine. Détail dans `docs/BACKEND_SCHEMA.md`.

## 4. Hors périmètre (décisions prises, voir `cabane/A_FAIRE.md`)
Refusés : widget OBS, grille, planning, jeu, formulaire, bilan après événement, récap hebdo admin, streamer à la une, rôles Discord automatiques, « Qui raider ? », créneaux de raid train, activité du staff, historique par fiche.
Pas de serveur à soi (seulement GitHub Pages, GitHub Actions et un petit relais Cloudflare gratuit). Pas de cookie ni d'iframe tierce sur la vitrine.

## 5. Indicateurs
À confirmer par Olivier. Disponibles aujourd'hui : statistiques GoatCounter (sans cookie) de la vitrine, scores Lighthouse (workflow `lighthouse.yml`), chiffres « 30 jours » publiés par le robot.
