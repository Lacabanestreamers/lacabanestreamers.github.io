# La Cabane — parcours page par page

Rédigé le 28/10/2026 à partir de `index.html`, `js/*.js`, `vitrine/index.html`.

## A. Page staff (`/`, privée, `noindex`)

1. **Ouverture** : le service worker sert la page (réseau d'abord, copie en cache au-delà de 4 s). Première visite : écran de bienvenue → saisie du jeton GitHub et du prénom (gardés dans le `localStorage`).
2. **Chargement** : lecture de `cabane-data.json` et `cabane-releves.json` (API GitHub), puis Twitch en direct (Helix, decapi en secours). Indicateur de synchro en haut à droite.
3. **Menu** (barre du haut) :
   - **Accueil** : alertes (robot qui ne passe plus, mauvais fichier lu), propositions en charge, « Tes streamers », nouveaux à intégrer, rappels.
   - **Propositions** / **Streamers** : tableaux (colonnes, étiquettes, vues enregistrées, export CSV, import en lot) → clic sur une ligne = **tiroir de fiche** (avis, notes, rappels, modèles de messages, intégration, repères chiffrés, courbe).
   - **Anniversaires** : anniversaires de stream et d'arrivée.
   - **Tableau de bord** : graphiques, carte du mois, entonnoir des propositions.
   - **Événements** : événements et séries, partage Discord, relevé des inscriptions, lien de partage.
   - **Nettoyage** : fiches à trier (compteur dans le menu).
   - **Réglages** : vitrine publique (texte, lien Discord, Rejoindre, récap annuel), sauvegardes, corbeille, archives, santé du robot, jetons distribués, comptes Discord du staff, notifications.
   - **Aide**. Liens **Vitrine ↗** et **Bot ↗** (nouvel onglet). **🔍** ou Ctrl+K : recherche globale.
4. **Enregistrement** : chaque action → écriture dans `cabane-data.json` (annulable 15 s), conflit → choix entre les deux versions, puis réveil du robot une minute après.
5. **Pied de page** (28/10) : liens vers Mentions légales, Confidentialité, Conditions d'utilisation de la vitrine.
6. **Retour de connexion Twitch** : si l'adresse contient un jeton Twitch lancé depuis la vitrine, le script en ligne renvoie aussitôt vers la vitrine.

## B. Vitrine (`/vitrine/`, publique, indexée)

1. **Accueil** : en-tête (titre, sous-titre, texte, boutons « Rejoindre le Discord » et « 🎲 Découvrir un streamer », chiffres) → lecture de `membres.json` (rafraîchie toutes les 2 à 5 min, live vérifié toutes les 2 min).
2. **Sections** (affichées seulement si elles ont du contenu) : En chiffres → En live maintenant → Clips de la semaine → Prochains événements → Anniversaires → Bienvenue aux nouveaux → Nos réussites → Nos streamers (recherche + filtres) → Rejoindre.
3. **Page d'un membre** (`?m=<pseudo>`) : avatar, tags, bio, date d'arrivée, bouton Twitch, live en cours, clip, réussites. « ← Tous les streamers » ramène à la liste (navigation sans rechargement, `data-nav`).
4. **Événement** (`?ev=<id>` ou `vitrine/e/<id>`) : la page défile jusqu'à l'événement et le met en valeur ; « Cet événement est terminé » s'il n'existe plus.
5. **Je participe** : connexion Twitch (retour par la page staff, renvoyé ici) → envoi `{ev, action, jeton}` au relais Cloudflare → message « demande envoyée » ; le robot l'applique au passage suivant.
6. **Ajouter à mon agenda** (Google Agenda ou fichier .ics) et **Partager** (partage natif sur mobile, sinon copie du lien).
7. **Pied de page** (`<nav>` « Sources et pages légales ») : date de mise à jour, Twitch, Mentions légales, Confidentialité, CGU.

## C. Pages annexes
- `vitrine/s/<pseudo>.html` : fiche indexable (nom, image, bio, lien Twitch) → lien vers la page du membre sur la vitrine.
- `vitrine/e/<id>` : aperçu Discord de l'événement → ouvre la vitrine dessus.
- `vitrine/annee/AAAA.html` : récap « La Cabane, ton année ».
- `vitrine/mentions-legales.html`, `confidentialite.html`, `cgu.html` : pied de page commun (Vitrine, Mentions légales, Confidentialité, CGU).
- `404.html` : page introuvable.
