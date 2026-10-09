// La Cabane · page staff · Page Aide.
// Scripts classiques chargés dans l'ordre par index.html : ils partagent les mêmes variables globales.
/* ============ Aide ============ */
function viewAide(){
  const owner = cfg.owner || "Lacabanestreamers", repo = cfg.repo || "cabane";
  const sec = (id, titre, html) => `<section id="aide-${id}"><h2>${titre}</h2>${html}</section>`;
  const som = [["connexion","Se connecter"],["onglets","Les onglets"],["quotidien","Au quotidien"],["evenements","Événements"],["discord","Discord"],["robot","Le robot"],["vitrine","La vitrine"],["admin","Réglages et sécurité"],["telephone","Sur téléphone"],["probleme","En cas de problème"]];
  return `<div class="aide"><h1>Aide</h1><p class="sub">Tout ce qu'il faut savoir pour utiliser La Cabane côté staff.</p>
  <nav class="som" aria-label="Sommaire">${som.map(([id, l]) => `<a href="#aide-${id}">${l}</a>`).join("")}</nav>
  ${sec("connexion", "Se connecter", `
    <p>Les données sont dans un dépôt GitHub privé. Pour y accéder, il te faut un <b>jeton</b> (une sorte de mot de passe) :</p>
    <ul><li><b>Soit Olivier te le donne</b> : tu n'as rien à créer.</li>
      <li><b>Soit tu le crées toi-même</b> avec ton compte GitHub (après avoir accepté l'invitation de l'organisation ${esc(owner)}) :
        <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">créer un jeton</a>, puis Resource owner <code>${esc(owner)}</code>, Only select repositories <code>${esc(repo)}</code>, Permissions <code>Contents : Read and write</code>.</li></ul>
    <ol><li>Ouvre <a href="#" data-goto="reglages">Réglages</a>. Le propriétaire (<code>${esc(owner)}</code>), le dépôt (<code>${esc(repo)}</code>), la branche et le fichier sont déjà remplis.</li>
      <li>Colle le jeton, puis indique sa <b>date d'expiration</b> : la page te préviendra avant qu'il expire.</li>
      <li>Clique sur <b>Se connecter</b>, choisis ton prénom dans « Je suis », puis clique à nouveau sur <b>Se connecter</b>.</li></ol>
    <p class="astuce">Le jeton reste dans ton navigateur. Sur un autre appareil (téléphone, autre PC), il faut refaire cette étape une fois.</p>
    <h3>Connexion Twitch (facultatif mais conseillé)</h3>
    <p>Dans Réglages → Connexion Twitch, clique sur <b>Se connecter à Twitch</b> avec n'importe quel compte. Tu obtiens le live en temps réel, les follows exacts et la date du dernier stream.</p>`)}
  ${sec("onglets", "Les onglets", `
    <ul><li><b>Accueil</b> : ce qui t'attend (tes avis à donner, tes propositions en charge, rappels du jour, anniversaires, inactifs, propositions qui stagnent, intégrations et suivis de nouveaux, événements de la semaine, réussites, fiches à compléter).</li>
      <li><b>Propositions</b> : les chaînes proposées, leur statut, leur responsable et les avis du staff.</li>
      <li><b>Streamers</b> : les membres de La Cabane, leurs follows, leur dernier stream, leurs jeux et leur progression.</li>
      <li><b>Anniversaires</b> : les anniversaires de stream, mois par mois.</li>
      <li><b>Tableau de bord</b> : les chiffres de la communauté, l'<b>entonnoir des propositions</b> (reçues, acceptées, refusées, délai de décision, mois par mois), la répartition des référents et la carte récap du mois (image à poster).</li>
      <li><b>Événements</b> : raids, soirées, séries récurrentes et inscriptions.</li>
      <li><b>Nettoyage</b> : chaînes introuvables, propositions en double ou déjà membres, membres inactifs depuis 90 jours, fiches incomplètes. La pastille compte ce qui demande une action.</li>
      <li><b>Réglages</b> : rangés en cinq groupes (Mon compte, Robot et santé, Équipe, Vitrine publique, Données). Chaque panneau se déplie avec sa flèche ; fermé, il affiche son état en un coup d'œil (connecté, 1 problème, dernière sauvegarde…). Ce que tu ouvres reste ouvert sur cet appareil ; « Tout ouvrir » / « Tout fermer » en haut.</li>
      <li><b>Vitrine ↗</b> ouvre la page publique. <b>Bot ↗</b> ouvre le site de gestion du bot Discord (adresse à mettre à jour dans Réglages → Site de gestion du bot quand elle change). <b>🔍</b> (ou <b>Ctrl+K</b>) cherche partout.</li></ul>`)}
  ${sec("quotidien", "Au quotidien", `
    <h3>Donner son avis sur une proposition</h3>
    <p>Ouvre la fiche, puis clique sur <b>Pour</b>, <b>Contre</b> ou <b>Neutre</b> sur ta ligne, ou écris un avis libre. Tu peux aussi réagir sous le message de la proposition dans le salon staff de Discord : 👍 Pour, 🤔 Neutre, 👎 Contre (ton compte Discord doit être noté dans Réglages → Comptes Discord du staff). L'avis arrive sur la fiche dans l'heure, marqué « (Discord) ». Quand une majorité se dégage, la fiche propose d'appliquer le statut correspondant.</p>
    <h3>Prendre une proposition en charge</h3>
    <p>Sur la fiche, choisis le <b>Responsable</b> : celui qui contacte le streamer (la page suggère le moins chargé). Tes propositions apparaissent sur l'Accueil, et chaque matin à 9 h le robot te mentionne dans le salon staff si l'une d'elles stagne ou si un de tes rappels tombe.</p>
    <h3>Accepter une chaîne</h3>
    <p>Sur la fiche de la proposition, clique sur <b>Accepter et transférer dans Streamers</b>. La fiche passe dans Streamers et garde tout son historique (parrain, avis). Pense à lui choisir un <b>référent</b>.</p>
    <h3>Intégrer et suivre un nouveau</h3>
    <p>Sur la fiche d'un nouveau membre, coche les étapes d'<b>intégration</b> au fur et à mesure (ajouté au Discord, rôle donné…, liste réglable dans Réglages → Listes). Tant qu'elles ne sont pas toutes cochées (60 premiers jours), il apparaît sur l'Accueil. Le référent est aussi rappelé de prendre des nouvelles à J+7 et à J+30.</p>
    <h3>Contacter un streamer</h3>
    <p>Dans une fiche, choisis un modèle dans « Préparer un message… » (invitation, refus, bienvenue…), retouche le texte si besoin, puis clique sur <b>Copier</b> et colle le message dans Discord. Sous la liste, « Pour ce statut » propose le modèle qui colle à la fiche (refus pour une proposition refusée, demande d'infos pour une proposition à trier…). Chaque copie est notée sur la fiche (« Déjà copiés ») pour éviter que deux personnes envoient le même message. Pour un refus, remplis le champ <b>Motif du refus</b> : il est repris dans le message.</p>
    <h3>Revoir un refus plus tard</h3>
    <p>Sur une proposition refusée ou abandonnée, la section <b>Revoir plus tard</b> programme un rappel dans 3, 6 ou 12 mois. Le jour venu, elle apparaît dans tes rappels du jour et dans le message Discord de 9 h ; si la chaîne a progressé, clique sur <b>Reproposer</b> (le rappel est retiré tout seul).</p>
    <h3>Ne rien oublier : les rappels</h3>
    <p>Dans une fiche, section <b>Rappels</b> : choisis une date et écris quoi faire (« recontacter après ses vacances »). Le jour venu, le rappel apparaît sur l'Accueil (« Rappels du jour », filtre « Les miens »), une 🔔 s'affiche dans les tableaux, et le robot te mentionne à 9 h. Clique sur <b>Fait</b> une fois traité.</p>
    <h3>Modifier plusieurs fiches</h3>
    <p>Coche les fiches dans un tableau : une barre apparaît en bas pour changer d'un coup le statut, le rôle, le référent ou une étiquette.</p>
    <h3>Annuler, corbeille, modification simultanée</h3>
    <p>Après chaque action, un bouton <b>↶ Annuler</b> reste 15 secondes en bas à gauche. Une fiche supprimée reste 30 jours dans <b>Réglages → Corbeille</b>. Si quelqu'un a modifié le même champ pendant que tu l'éditais, la page te montre les deux versions et te laisse choisir laquelle garder.</p>
    <h3>Vues enregistrées</h3>
    <p>Dans Propositions et Streamers, règle tes filtres et ton tri (par ex. statut « Attente staff », tri par dernier stream), puis <b>★ Vues → Enregistrer cette vue</b>. Elle apparaît en bouton au-dessus du tableau : un clic remet tout en place. Tes vues sont rangées sous ton prénom (« Je suis ») et te suivent sur tous tes appareils ; coche « Pour tout le staff » pour qu'une vue soit visible par tout le monde.</p>
    <h3>Chercher</h3>
    <p><b>Ctrl+K</b> (ou 🔍 au bout du menu) : streamers, propositions (même closes), corbeille, événements, séries et historique. Flèches puis Entrée pour ouvrir.</p>
    <h3>Notifications</h3>
    <p>Réglages → <b>Notifications sur cet appareil</b> : une notification du navigateur pour chaque nouvelle proposition et pour tes rappels du jour, tant que la page est ouverte (même en arrière-plan). À activer sur chaque appareil.</p>
    <p class="astuce">Tout s'enregistre automatiquement pour tout le staff. Le point en haut à droite passe au vert (« Synchronisé ») quand c'est fait.</p>`)}
  ${sec("evenements", "Événements", `
    <h3>Créer un événement</h3>
    <p>Onglet <b>Événements</b> → <b>Créer un événement</b> : titre, date, heure, durée, type, lien, description et participants. Coché « vitrine », il apparaît sur la page publique (avec « Ajouter à mon agenda »). Le bouton <b>🔗 Lien</b> de sa carte copie son lien direct sur la vitrine : la page s'ouvre sur l'événement, bouton d'inscription compris. Ce lien est aussi celui du titre du message Discord (sauf si l'événement a son propre lien).</p>
    <h3>Le partager sur Discord</h3>
    <p>Coche <b>Partager sur Discord</b> : le robot le publie dans le salon événements une à deux minutes après l'enregistrement. Si la date ou l'heure change, un message de mise à jour part, et le message d'origine est tenu à jour (participants, description). S'il a une heure, il est aussi créé dans l'onglet <b>Événements du serveur Discord</b> ; le supprimer ici le supprime là-bas. Avec <b>Rappels</b> coché, le robot le rappelle la veille à 18 h et le jour même à 9 h, en <b>mentionnant les inscrits</b> dont le compte Discord est relié.</p>
    <h3>Inscriptions</h3>
    <p>Réservées aux streamers de La Cabane, de trois façons : réaction ✅ sous le message Discord, « Intéressé » sur l'événement du serveur Discord, ou bouton <b>Je participe</b> sur la vitrine (connexion Twitch). Le robot les ajoute à chaque passage ; le bouton <b>Relever les inscriptions maintenant</b> le lance tout de suite. Retirer sa réaction désinscrit. Si un compte Discord n'est pas reconnu, la carte de l'événement te demande à quel streamer il correspond : c'est retenu pour la suite. Un participant que tu retires à la main n'est pas réajouté tant qu'il ne remet pas sa réaction.</p>
    <h3>Séries récurrentes</h3>
    <p>Un raid chaque samedi, une soirée le 1er vendredi du mois… <b>Nouvelle série</b> : rythme, première date, heure, et combien de jours avant chaque date est créée. Chaque date se gère ensuite comme un événement normal. Supprimer une seule date la saute ; modifier la série met à jour les dates à venir ; <b>Pause</b> arrête d'en créer ; supprimer la série supprime ses dates à venir.</p>`)}
  ${sec("discord", "Discord", `
    <ul><li><b>Salon staff</b> : nouvelles propositions (avec 👍 🤔 👎 pour donner son avis), arrivées dans Streamers, changements de pseudo, « À faire aujourd'hui » à 9 h.</li>
      <li><b>Salon célébration</b> : anniversaires de stream, anniversaires d'arrivée dans La Cabane, paliers de follows, affiliations et partenariats.</li>
      <li><b>Salon événements</b> : publications, mises à jour et rappels d'événements.</li>
      <li><b>Salon Commandes</b> : alertes de santé (un problème qui apparaît ou se règle) et, chaque mois, une copie complète des données en pièce jointe. À garder privé.</li>
      <li><b>Salon des inscriptions</b> (privé, seulement pour le bot) : la vitrine y dépose les demandes d'inscription, que le robot vérifie puis efface.</li></ul>
    <p><b>Comptes Discord</b> : celui d'un membre se relie tout seul (ou via le champ « Pseudo Discord » de sa fiche, avec un bouton Délier) ; ceux du staff se notent dans Réglages → Comptes Discord du staff.</p>`)}
  ${sec("robot", "Le robot", `
    <p>Un robot tourne toutes les heures sur GitHub, même quand personne n'a la page ouverte. La page le réveille aussi une minute après une modification qui doit partir sur Discord.</p>
    <ul><li><b>À chaque passage</b> : qui est en live (viewers et jeu joué), changements de pseudo, affiliations, inscriptions aux événements, publication de la vitrine, vérification de santé.</li>
      <li><b>Matin, midi et soir</b> : relevé des follows et paliers de 50 follows.</li>
      <li><b>Chaque jour</b> : anniversaires (9 h), « À faire aujourd'hui » (9 h), clips de la semaine, minutes GitHub consommées, archivage des vieilles données (relevés et événements de plus de 90 jours, journal au-delà de 250 lignes, rien n'est supprimé).</li>
      <li><b>Chaque dimanche</b> : sauvegarde complète. <b>Chaque mois</b> : copie des données dans le salon Commandes.</li>
      <li><b>Garde-fou</b> : s'il allait enregistrer des données incohérentes (fiches disparues), il n'écrit rien et prévient dans Commandes.</li></ul>`)}
  ${sec("vitrine", "La vitrine publique", `
    <p>La page <a href="${VITRINE_URL()}" target="_blank" rel="noopener">${VITRINE_URL()}</a> présente les membres à tout le monde : avatar, bio Twitch, badges, jeux, lives en cours, clips de la semaine, prochains événements (avec inscription et ajout à l'agenda), anniversaires et réussites. Aucune donnée interne n'y apparaît.</p>
    <ul><li>Chaque membre a sa propre page à partager (dans ses panneaux Twitch, par exemple) : <code>${VITRINE_URL()}s/pseudo</code>. Collé dans Discord, ce lien affiche son avatar et sa bio (bouton « copier le lien de partage » sur sa fiche). Même chose pour chaque événement : <code>${VITRINE_URL()}e/…</code> (bouton 🔗 Lien). Le robot crée ces pages à chaque passage.</li>
      <li>Pour retirer quelqu'un : coche « Masquer de la vitrine publique » sur sa fiche.</li>
      <li>Pour retirer une réussite (palier, affiliation) : <b>Masquer</b> dans Réglages → « Nos réussites » ou sur la fiche du membre. La durée d'affichage sur l'accueil se règle au même endroit (30 jours par défaut).</li>
      <li>Section <b>Rejoindre</b> (critères, état d'esprit) : à activer et écrire dans Réglages → Vitrine publique.</li>
      <li>Les changements apparaissent au passage suivant du robot.</li></ul>`)}
  ${sec("admin", "Réglages et sécurité", `
    <ul><li><b>Santé</b> : un voyant par branchement (robot, Raspberry Pi, webhooks, bot Discord, inscriptions, vitrine, jetons, sauvegardes, minutes GitHub, données). En rouge, la ligne dit quoi faire. Un problème s'affiche aussi en haut de l'<b>Accueil</b>.</li>
      <li><b>Raspberry Pi</b> : il lance le robot toutes les heures. S'il se tait plus de 3 h, ou si son jeton GitHub expire dans moins de 7 jours, Santé passe au rouge et Commandes est prévenu.</li>
      <li><b>Admins de la page</b> : seuls eux peuvent restaurer une sauvegarde, supprimer définitivement, importer des données et modifier les Réglages. Personne de coché = tout le monde est admin.</li>
      <li><b>Sauvegardes</b> : chaque dimanche (8 gardées) et à la demande ; <b>Restaurer</b> remplace toutes les données (l'état actuel est sauvegardé juste avant).</li>
      <li><b>Archives</b> : les vieilles données déplacées par le robot, téléchargeables.</li>
      <li><b>Relevés de follows</b> : rangés dans leur propre fichier (<code>cabane-releves.json</code>) pour que chaque modification reste légère. Les sauvegardes, la copie mensuelle et « Exporter une copie » contiennent tout, relevés compris ; une restauration les remet en place.</li>
      <li><b>Robot en étapes</b> : si une partie plante (Twitch ou Discord en panne), le reste tourne quand même et Santé affiche « étape interrompue ». Rien n'est marqué comme fait tant que ce n'est pas fait : ça repart au passage suivant.</li>
      <li><b>Minutes GitHub</b> : le dépôt privé a droit à 2000 minutes de robot par mois ; Santé affiche la consommation et prévient avant la limite.</li></ul>`)}
  ${sec("telephone", "Sur téléphone", `
    <p>La page s'installe comme une application :</p>
    <ul><li><b>Android (Chrome)</b> : menu ⋮ → <b>Installer l'application</b>.</li>
      <li><b>iPhone (Safari)</b> : bouton Partager → <b>Sur l'écran d'accueil</b>.</li></ul>
    <p>Le bouton <b>Installer La Cabane</b> apparaît aussi dans Réglages → Application quand le navigateur le permet. Une fois installée, la page s'ouvre même sans réseau, sur la dernière copie des données (il faut avoir coché « Mémoriser le jeton »). Ce que tu modifies hors ligne part au retour du réseau : garde la page ouverte jusque-là.</p>
    <p>Les tableaux s'affichent en cartes sur petit écran. La recherche 🔍 est au bout du menu (fais-le défiler).</p>`)}
  ${sec("probleme", "En cas de problème", `
    <ul><li><b>« Jeton refusé »</b> : ton jeton a expiré ou a été supprimé. Demande-en un nouveau à Olivier (ou régénère le tien), puis colle-le dans Réglages.</li>
      <li><b>« Erreur de synchro »</b> : vérifie ta connexion internet, puis clique sur <b>Recharger maintenant</b> dans Réglages. Tes modifications restent en attente et repartent toutes seules.</li>
      <li><b>La page ne montre pas la dernière version</b> : fais <b>Ctrl+F5</b> (ou ferme et rouvre l'application sur téléphone).</li>
      <li><b>Un chiffre semble faux</b> : les follows et le live viennent de Twitch. Clique sur <b>Actualiser Twitch</b> ; les relevés du robot se font trois fois par jour.</li>
      <li><b>« Le robot ne passe plus »</b> en haut de l'Accueil : clique sur <b>Relancer le robot</b>. Si ça revient, vérifie que le Raspberry Pi est allumé et connecté.</li>
      <li><b>Un voyant rouge dans Santé</b> ou une alerte dans Commandes : suis le conseil affiché ; sinon regarde l'onglet <b>Actions</b> du dépôt ${esc(repo)} sur GitHub.</li>
      <li><b>Une inscription ou une publication Discord n'arrive pas</b> : clique sur <b>Relever les inscriptions maintenant</b> (Événements) et attends deux minutes.</li>
      <li><b>Un bouton est grisé</b> : il est réservé aux admins de la page (Réglages → Admins).</li></ul>
    <p>Pour le reste, demande à Olivier sur Discord.</p>`)}
  </div>`;
}
