// La Cabane · page staff · Vitrine, sauvegardes, corbeille, nettoyage, modification groupée, santé.
// Scripts classiques chargés dans l'ordre par index.html : ils partagent les mêmes variables globales.
/* ============ Vitrine publique ============ */
const VITRINE_URL = () => `https://${(cfg.owner || "lacabanestreamers").toLowerCase()}.github.io/vitrine/`;
function vitrinePanel(d){
  const v = d.settings.vitrine || {}, st = d.robot?.vitrine;
  const nb = d.membres.filter(m => m.statut !== "Parti" && !m.masquerVitrine && !m.introuvable).length;
  return `<section class="panel" id="vitrine">
    <h2>Vitrine publique</h2>
    <p>Une page ouverte à tous qui présente les membres de La Cabane : avatar, badge affilié ou partenaire, bio Twitch et qui est en live. Aucune donnée interne n'y figure (ni notes, ni avis, ni Discord, ni follows). Le robot la met à jour toutes les heures.</p>
    <div class="grid">
      <label class="check full"><input type="checkbox" id="v_active" ${v.active ? "checked" : ""}> Publier la vitrine (${nb} membre${nb > 1 ? "s" : ""} affiché${nb > 1 ? "s" : ""} ; « Masquer de la vitrine publique » sur une fiche pour retirer quelqu'un)</label>
      <label class="f full">Titre<input id="v_titre" value="${esc(v.titre || "La Cabane")}"></label>
      <label class="f full">Texte de présentation<textarea id="v_texte" rows="3">${esc(v.texte ?? "Une communauté d'entraide et de motivation entre streamers. Viens découvrir nos membres et passe leur dire bonjour en live !")}</textarea></label>
      <label class="f full">Lien d'invitation Discord (bouton « Rejoindre », facultatif)<input id="v_discord" value="${esc(v.lienDiscord || "")}" placeholder="https://discord.gg/…"></label>
      <label class="check full"><input type="checkbox" id="v_rej" ${v.rejoindre?.actif ? "checked" : ""}> Afficher la section « Rejoindre » en bas de la vitrine</label>
      <label class="f full">Titre de la section<input id="v_rejtitre" value="${esc(v.rejoindre?.titre || "Rejoindre La Cabane")}" maxlength="80"></label>
      <label class="f full">Texte de la section (critères, état d'esprit, comment nous rejoindre)<textarea id="v_rejtexte" rows="5" placeholder="Tu streames régulièrement et tu cherches une communauté bienveillante ?&#10;Nos critères : …&#10;Pour nous rejoindre : passe sur le Discord et présente-toi.">${esc(v.rejoindre?.texte || "")}</textarea></label>
    </div>
    <p class="meta">${st ? (st.ok ? `<span class="up">Publiée</span> : le robot la tient à jour à chaque passage (depuis le ${fmtStamp(st.le)}).` : `<span class="down">Publication en échec depuis le ${fmtStamp(st.le)} : ${esc(st.erreur || "erreur inconnue")}</span>`) : v.active ? "En attente du prochain passage du robot (secret VITRINE_TOKEN nécessaire, voir le README)." : "Pas encore publiée."} Adresse : <a href="${VITRINE_URL()}" target="_blank" rel="noopener">${VITRINE_URL()}</a></p>
    <div class="tools" style="margin:10px 0 0"><button class="btn primary" id="v_save">Enregistrer</button></div>
  </section>`;
}

/* ============ Sauvegardes ============ */
const dirUrl = dir => `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${dir}`;
async function listerSauvegardes(){
  S.backups = {loading:true}; render();
  try {
    const r = await fetch(`${dirUrl("sauvegardes")}?ref=${encodeURIComponent(cfg.branch)}&_=${Date.now()}`, {headers:ghHeaders(), cache:"no-store"});
    if(r.status === 404){ S.backups = {list:[]}; }
    else if(!r.ok) throw new Error(`GitHub a répondu ${r.status}`);
    else S.backups = {list:(await r.json()).filter(f => f.type === "file" && f.name.endsWith(".json")).sort((a,b) => b.name.localeCompare(a.name))};
  } catch(e){ S.backups = {erreur:e.message}; }
  render();
}
function nomSauvegarde(n){
  const m = /cabane-data-(\d{4}-\d{2}-\d{2})(?:-(\d{2})(\d{2}))?(?:-(\w+))?\.json/.exec(n);
  if(!m) return esc(n);
  return `${fmtDate(m[1])}${m[2] ? ` à ${m[2]}h${m[3]}` : ""} · ${m[4] === "manuel" ? "manuelle" : m[4] === "avantrestauration" ? "avant restauration" : "automatique (dimanche)"}`;
}
async function sauvegarder(suffixe){
  const n = new Date(), p2 = x => String(x).padStart(2, "0");
  const nom = `cabane-data-${todayISO()}-${p2(n.getHours())}${p2(n.getMinutes())}-${suffixe}.json`;
  const r = await fetch(`${dirUrl("sauvegardes")}/${nom}`, {method:"PUT", headers:{...ghHeaders(), "Content-Type":"application/json"},
    body:JSON.stringify({message:`${cfg.me || "staff"} : sauvegarde ${suffixe === "manuel" ? "manuelle" : "avant restauration"}`, content:b64encodeUtf8(JSON.stringify(S.data, null, 1)), branch:cfg.branch})});
  if(r.status === 401 || r.status === 403) throw new Error("Le jeton n'a pas le droit d'écrire la sauvegarde.");
  if(!r.ok) throw new Error(`Sauvegarde refusée (${r.status}).`);
  return nom;
}
async function lireSauvegarde(f){
  const r = await fetch(`${dirUrl("sauvegardes")}/${encodeURIComponent(f)}?ref=${encodeURIComponent(cfg.branch)}`, {headers:{...ghHeaders(), Accept:"application/vnd.github.raw+json"}, cache:"no-store"});
  if(!r.ok) throw new Error(`Lecture impossible (${r.status}).`);
  const d = JSON.parse(await r.text()); if(!d.membres || !d.propositions) throw new Error("Ce fichier n'est pas une sauvegarde de La Cabane.");
  return d;
}
// Admins de la page : protège les actions lourdes contre les fausses manipulations (pas une vraie sécurité :
// chaque jeton GitHub garde tous les droits sur le fichier).
const estAdmin = () => { const a = S.data?.settings.admins || []; return !a.length || a.includes(cfg.me); };
const ADMIN_SEL = '[data-bk="restore"], [data-trash="purge"], #s_save, #v_save, #s_twsave, #s_staffdcSave, #s_jetsave, #s_adminsSave, #fileIn, #importGo, #v_reusave, #s_botSave';
function botPanel(){
  const u = lienBot();
  return `<section class="panel" id="lienbot">
    <h2>Site de gestion du bot</h2>
    <p>Adresse du panneau d'administration du bot Discord, ouverte par le lien <b>Bot ↗</b> du menu. Elle n'est visible que du staff (jamais sur la vitrine). Quand le tunnel du bot redémarre, son adresse change : colle la nouvelle ici. Champ vide = lien masqué.</p>
    <div class="grid"><label class="f full">Adresse (https://…)<input id="s_bot" type="url" inputmode="url" value="${esc(u)}" placeholder="https://….trycloudflare.com/" autocomplete="off" spellcheck="false"></label></div>
    <div class="tools" style="margin:10px 0 0"><button class="btn primary" id="s_botSave">Enregistrer</button>${/^https:\/\//.test(u) ? `<a class="btn ghost" href="${esc(u)}" target="_blank" rel="noopener">Ouvrir le site du bot ↗</a>` : ""}</div>
  </section>`;
}
function adminsPanel(d){
  const a = d.settings.admins || [];
  return `<section class="panel" id="admins">
    <h2>Admins de la page</h2>
    <p>Seuls les admins cochés peuvent restaurer une sauvegarde, supprimer définitivement depuis la corbeille, importer ou remplacer des données, et modifier les Réglages. Les autres voient ces boutons grisés. Personne de coché = tout le monde est admin. C'est une protection contre les fausses manipulations, pas une sécurité : un jeton GitHub garde tous les droits.</p>
    <div class="grid">${d.settings.staff.map(n => `<label class="check"><input type="checkbox" class="admChk" value="${esc(n)}" ${a.includes(n) ? "checked" : ""}> ${esc(n)}</label>`).join("")}</div>
    ${a.length && !a.includes(cfg.me) ? `<p class="meta">Tu n'es pas admin de la page${cfg.me ? "" : " (choisis ton prénom dans « Je suis »)"}.</p>` : ""}
    <div class="tools" style="margin:10px 0 0"><button class="btn primary" id="s_adminsSave">Enregistrer</button></div>
  </section>`;
}
// Réussites (paliers, affiliations) : le staff peut en masquer une sur la vitrine (réversible)
const attrReussite = x => `data-reu="${x.kind === "palier" ? "palier" : "evt"}" data-rlogin="${esc(x.login)}" data-rpal="${x.palier ?? ""}" data-rtype="${esc(x.type || "")}" data-rdate="${esc(x.date)}" data-rmasque="${x.masque ? "1" : ""}"`;
const btnReussite = x => `<button type="button" class="btn ghost" ${attrReussite(x)} style="padding:2px 10px" title="${x.masque ? "Réafficher sur la vitrine" : "Ne plus afficher sur la vitrine (réversible)"}">${x.masque ? "Réafficher" : "Masquer"}</button>`;
function reussitesPanel(d){
  const v = d.settings.vitrine || {}, jours = v.reussitesJours != null && Number.isFinite(Number(v.reussitesJours)) ? Number(v.reussitesJours) : 30;
  const liste = evenementsRecents(Math.max(jours, 60));
  return `<section class="panel" id="reussites">
    <h2>« Nos réussites » sur la vitrine</h2>
    <p>La section affiche les paliers de follows et les affiliations / partenariats des <b>${jours} derniers jours</b> (12 au plus, les plus récents d'abord). Sur la page de chaque streamer, toutes ses réussites restent visibles : une réussite masquée ici disparaît des deux. Rien n'est supprimé, tu peux la réafficher.</p>
    <div class="grid"><label class="f">Durée d'affichage sur l'accueil de la vitrine (jours, 0 = section cachée)<input id="v_reujours" type="number" min="0" max="365" value="${jours}"></label></div>
    <div class="tools" style="margin:8px 0 12px"><button class="btn" id="v_reusave">Enregistrer la durée</button></div>
    ${liste.length ? `<ul class="todo" style="list-style:none;padding:0;margin:0">${liste.map(x => `<li style="display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;padding:5px 0;border-top:1px solid var(--line)">${avatarHtml(x.login)}<span class="login" style="min-width:min(140px,40%)">${esc(x.login)}</span>
      <span style="flex:1 1 180px;min-width:0">${x.kind === "palier" ? "🚀" : "🎉"} ${esc(x.txt)} · <span class="muted">${fmtDate(x.date)}</span>${x.masque ? ` · <b class="warn">masquée</b>` : x.date < new Date(Date.now() - jours * 864e5).toISOString().slice(0, 10) ? ` · <span class="muted">plus sur l'accueil</span>` : ""}</span>${btnReussite(x)}</li>`).join("")}</ul>`
      : `<p class="none">Aucune réussite ces ${Math.max(jours, 60)} derniers jours.</p>`}
  </section>`;
}
function staffDiscordPanel(d){
  const liste = d.settings.staffDiscord || [], res = d.robot?.staffDiscord || {};
  const lignes = liste.map(x => `${x.nom} ; ${x.discord}`).join("\n");
  return `<section class="panel" id="staffDiscord">
    <h2>Comptes Discord du staff</h2>
    <p>Chaque nouvelle proposition arrive dans le salon admin avec 👍 🤔 👎 : la réaction d'un membre du staff devient son avis <b>Pour</b>, <b>Neutre</b> ou <b>Contre</b> sur la fiche. Une réaction retirée retire l'avis. Si l'avis est ensuite modifié sur le site, c'est celui du site qui compte. Une ligne par personne : <b>Prénom ; nom d'utilisateur Discord</b> (le prénom tel qu'il est dans la liste du staff).</p>
    <label class="f full"><textarea id="s_staffdc" rows="4" placeholder="Aly ; aly_discord&#10;Galy ; galy">${esc(lignes)}</textarea></label>
    ${liste.length ? `<ul class="todo" style="list-style:none;padding:0;margin:8px 0 0">${liste.map(x => `<li style="display:block;padding:4px 0">${res[x.nom]?.id ? `<span class="up">●</span> <b>${esc(x.nom)}</b> relié à ${esc(x.discord)}` : `<span class="muted">○</span> <b>${esc(x.nom)}</b> : ${esc(x.discord)} pas encore trouvé sur le serveur (vérifie le nom d'utilisateur, le robot réessaie à chaque passage)`}${d.settings.staff.includes(x.nom) ? "" : ` <span class="warn">(« ${esc(x.nom)} » n'est pas dans la liste du staff)</span>`}</li>`).join("")}</ul>` : ""}
    <div class="tools" style="margin:10px 0 0"><button class="btn primary" id="s_staffdcSave">Enregistrer</button></div>
  </section>`;
}
function archivePanel(d){
  const a = d.robot?.archive;
  return `<section class="panel" id="archives">
    <h2>Archives</h2>
    <p>Pour garder le fichier partagé léger, le robot déplace chaque nuit vers <b>archives/cabane-archive.json</b> : les relevés de follows de plus de 90 jours (le premier de chaque mois reste, pour les courbes longues), les événements passés depuis plus de 90 jours et le journal au-delà des 250 dernières lignes. Rien n'est supprimé.</p>
    <p class="meta">${a ? `Dernier archivage : ${fmtDate(a.le)} · l'archive contient ${a["relevés"] ?? 0} relevés, ${a.evenements ?? 0} événements, ${a.journal ?? 0} lignes de journal.` : "Rien d'archivé pour l'instant (il faut des données de plus de 90 jours)."}</p>
    ${S.mode === "github" && a ? `<div class="tools" style="margin:10px 0 0"><button class="btn" id="arcDl">Télécharger l'archive</button></div>` : ""}
  </section>`;
}
function sauvegardesPanel(d){
  const b = S.backups;
  if(S.mode === "github" && !b) setTimeout(listerSauvegardes, 0);
  const list = b?.list || [];
  return `<section class="panel" id="sauvegardes">
    <h2>Sauvegardes</h2>
    <p>Le robot sauvegarde toutes les données chaque dimanche et garde les 8 dernières, plus les 5 dernières sauvegardes manuelles. Restaurer remplace toutes les données partagées (une sauvegarde de l'état actuel est faite juste avant).</p>
    ${S.mode !== "github" ? `<p class="none">Disponible une fois connecté au fichier partagé.</p>` : b?.loading ? `<p class="none">Lecture…</p>` : b?.erreur ? `<p class="down">${esc(b.erreur)}</p>`
      : list.length ? `<ul class="trash">${list.map(f => `<li><span>${nomSauvegarde(f.name)}</span><span class="muted">${Math.round(f.size / 1024)} Ko</span>
          <span class="r"><button class="btn" data-bk="dl" data-f="${esc(f.name)}">Télécharger</button><button class="btn danger" data-bk="restore" data-f="${esc(f.name)}">Restaurer</button></span></li>`).join("")}</ul>`
      : `<p class="none">Aucune sauvegarde pour l'instant.${d.robot?.derniereSauvegarde ? "" : " La première sera faite dimanche par le robot."}</p>`}
    ${d.robot?.derniereSauvegarde ? `<p class="meta">Dernière sauvegarde automatique : ${fmtDate(d.robot.derniereSauvegarde)}.</p>` : ""}
    ${S.mode === "github" ? `<div class="tools" style="margin:10px 0 0"><button class="btn primary" id="bkNow">Sauvegarder maintenant</button><button class="btn ghost" id="bkRefresh">Actualiser la liste</button></div>` : ""}
  </section>`;
}

/* ============ Corbeille ============ */
function restoreFiches(ids){
  const items = ids.map(id => (S.data.corbeille || []).find(x => x.r.id === id)).filter(Boolean);
  items.forEach(x => dispatch({t:"restore", id:x.r.id}));
  if(items.length) dispatch({t:"note", txt:`Restauration depuis la corbeille : ${items.map(x => x.r.login).join(", ")}`});
  toast(`${items.length} fiche${items.length > 1 ? "s" : ""} restaurée${items.length > 1 ? "s" : ""}`);
}
// Jours entre aujourd'hui et une date AAAA-MM-JJ, en jours calendaires (0 = aujourd'hui, -1 = hier)
function joursAvant(iso){ const t = new Date(); t.setHours(0,0,0,0); const [y,m,d] = iso.split("-").map(Number); return Math.round((new Date(y, m-1, d) - t) / 864e5); }
function tokenWarning(){
  if(!cfg.tokenExpire || S.mode !== "github") return "";
  const j = joursAvant(cfg.tokenExpire);
  if(j > 10) return "";
  return `<div class="warnbar ${j <= 2 ? "ko" : ""}">⚠ ${j < 0 ? "Ton jeton GitHub a expiré" : j === 0 ? "Ton jeton GitHub expire aujourd'hui" : `Ton jeton GitHub expire dans ${j} jour${j>1?"s":""}`} (${fmtDate(cfg.tokenExpire)}).
    <a href="https://github.com/settings/personal-access-tokens" target="_blank" rel="noopener">Le régénérer</a> ou en demander un nouveau à l'admin, puis le coller dans <a href="#" data-goto="reglages">Réglages</a>.</div>`;
}
function santePanel(d){
  const sa = d.robot?.sante, p = d.robot?.passage || d.robot?.derniereExecution, h = p ? (Date.now() - new Date(p)) / 36e5 : null;
  const lignes = [{ok:p ? h <= 2 : false, txt:p ? `Robot : dernier passage ${fmtStamp(p)}` : "Robot : jamais passé", conseil:"Onglet Actions du dépôt cabane : regarde le dernier passage en erreur. La page le relance d'elle-même toutes les heures."}, ...(sa?.checks || [])];
  const ko = lignes.filter(x => x.ok === false).length;
  const pt = x => x.ok === false ? `<span class="down">●</span>` : x.ok ? `<span class="up">●</span>` : `<span class="muted">○</span>`;
  return `<section class="panel" id="sante">
    <h2>Santé${ko ? ` <span class="n" style="background:var(--ko)">${ko}</span>` : ""}</h2>
    <p>Le robot vérifie chaque branchement à chaque passage. Un problème qui apparaît, ou qui se règle, est signalé dans le salon Discord <b>Commandes</b>${sa ? ` · dernière vérification ${fmtStamp(sa.le)}` : " (pas encore de vérification : il faut la dernière version du robot)"}.</p>
    <ul class="todo" style="list-style:none;padding:0;margin:0">${lignes.map(x => `<li style="display:block;padding:6px 0">${pt(x)} ${esc(x.txt)}${x.ok === false && x.conseil ? `<br><span class="meta" style="margin-left:18px">↳ ${esc(x.conseil)}</span>` : ""}</li>`).join("")}</ul>
  </section>`;
}
// Bandeau en haut de l'accueil : robot qui ne passe plus (plus de 3 h) ou problème signalé par la santé
function alerteRobot(d){
  if(S.mode !== "github" || S.horsLigne) return "";
  const p = d.robot?.passage || d.robot?.derniereExecution, h = p ? Math.floor((Date.now() - new Date(p)) / 36e5) : null;
  const ko = (d.robot?.sante?.checks || []).filter(c => c.ok === false);
  const arrete = p ? h >= 3 : true;
  if(!arrete && !ko.length) return "";
  return `<section class="alerte-robot ${arrete ? "" : "warn"}" role="status"><span class="tx">
    ${arrete ? `<b>⚠ Le robot ne passe plus${p ? ` depuis ${h} h` : ""}</b>
      <span class="meta">Dernier passage : ${p ? fmtStamp(p) : "jamais"}. Pas d'annonces Discord, de relevés ni de vitrine à jour tant qu'il ne repasse pas.${d.robot?.pi ? " Le Raspberry Pi est peut-être éteint ou débranché." : ""}</span>`
      : `<b>🩺 ${ko.length} problème${ko.length > 1 ? "s" : ""} signalé${ko.length > 1 ? "s" : ""} par le robot</b>`}
    ${ko.length ? `<ul>${ko.slice(0, 4).map(c => `<li>${esc(c.txt)}</li>`).join("")}${ko.length > 4 ? `<li>…</li>` : ""}</ul>` : ""}</span>
    ${arrete ? `<button class="btn primary" id="relancerRobot">Relancer le robot</button>` : ""}<button class="btn ghost" data-goto="reglages" data-ancre="sante">Voir la santé</button></section>`;
}
/* ============ Nettoyage ============ */
const INACTIF_JOURS = 90;
function aNettoyer(){
  const d = S.data, presents = d.membres.filter(m => m.statut !== "Parti"), ouvertes = d.propositions.filter(p => !["Refusé","Abandonnée","Aucun contact","Accepté"].includes(p.statut));
  const cle = r => r.twitchId ? "id:" + r.twitchId : "l:" + r.login.toLowerCase();
  const membreDe = new Map(d.membres.map(m => [cle(m), m])), membreLogin = new Map(d.membres.map(m => [m.login.toLowerCase(), m]));
  const vusProp = new Map();
  const dupProps = [], dejaMembres = [];
  for(const p of ouvertes){
    const m = membreDe.get(cle(p)) || membreLogin.get(p.login.toLowerCase());
    if(m) dejaMembres.push({r:p, c:"propositions", info:`déjà dans Streamers (${m.statut === "Parti" ? "parti" : "présent"})`});
    const k = cle(p); if(vusProp.has(k)) dupProps.push({r:p, c:"propositions", info:`même chaîne que la proposition du ${fmtDate(vusProp.get(k).dateProposition || "") || "?"}`}); else vusProp.set(k, p);
  }
  const introuvables = [...presents.map(r => ({r, c:"membres"})), ...ouvertes.map(r => ({r, c:"propositions"}))].filter(x => x.r.introuvable)
    .map(x => ({...x, info:`chaîne Twitch introuvable depuis le ${fmtDate(x.r.introuvable)} (supprimée, bannie ou renommée sans suivi)`}));
  const inactifs = presents.filter(m => !["Admin","Modo"].includes(m.role)).map(m => ({m, x:lastStream(m)})).filter(({x}) => x && !x.live && x.days >= INACTIF_JOURS)
    .sort((a, b) => b.x.days - a.x.days).map(({m, x}) => ({r:m, c:"membres", info:`pas de live depuis ${x.days} jours (${x.src})`, inactif:true}));
  const incompletes = presents.filter(m => !["Admin","Modo"].includes(m.role)).map(m => ({r:m, c:"membres", manque:[!m.referent && "référent", !m.premierStream && "date du 1er stream", !m.arrivee && "date d'arrivée"].filter(Boolean)}))
    .filter(x => x.manque.length).map(x => ({...x, info:`manque : ${x.manque.join(", ")}`}));
  return [["Chaînes introuvables", introuvables, "Le robot ne trouve plus ces chaînes sur Twitch."],
    ["Propositions déjà dans Streamers", dejaMembres, "La proposition est restée ouverte alors que la chaîne est déjà membre."],
    ["Propositions en double", dupProps, "La même chaîne a été proposée plusieurs fois."],
    [`Sans live depuis plus de ${INACTIF_JOURS} jours`, inactifs, "Membres présents (hors Admin et Modo) qui ne streament plus."],
    ["Fiches incomplètes", incompletes, "Membres présents (hors Admin et Modo) à qui il manque des informations."]];
}
function viewNettoyage(){
  const groupes = aNettoyer(), total = groupes.reduce((a, [, l]) => a + l.length, 0);
  const ligne = x => `<li class="netl">
    <a href="#" data-open="${x.c}:${x.r.id}" class="login">${avatarHtml(x.r.login)} ${esc(x.r.login)}</a>
    <span class="meta">${esc(x.info)}</span>
    <span class="netb">${x.c === "membres" && x.inactif ? `<button class="btn ghost" data-netparti="${x.r.id}" >Marquer « Parti »</button>` : ""}${x.c === "propositions" ? `<button class="btn ghost" data-netclore="${x.r.id}">Clore (Abandonnée)</button><button class="btn danger" data-netdel="${x.r.id}">Supprimer</button>` : ""}<button class="btn" data-open="${x.c}:${x.r.id}">Ouvrir</button></span></li>`;
  return `<h1>Nettoyage</h1>
  <p class="sub">${total ? `${total} point${total > 1 ? "s" : ""} à vérifier (la pastille du menu ne compte pas les fiches incomplètes).` : "Rien à nettoyer : tout est en ordre. 👌"} Rien n'est modifié tout seul : chaque action se fait ici, à la main, et reste visible dans l'historique.</p>
  ${groupes.map(([titre, l, aide]) => `<section class="panel netp"><h2>${esc(titre)}${l.length ? ` <span class="navn">${l.length}</span>` : ""}</h2><p class="meta" style="margin-top:0">${esc(aide)}</p>
    ${l.length ? `<ul style="list-style:none;padding:0;margin:0">${l.slice(0, 100).map(ligne).join("")}</ul>${l.length > 100 ? `<p class="meta">… et ${l.length - 100} autres.</p>` : ""}` : `<p class="none">Rien.</p>`}</section>`).join("")}`;
}
function jetonsSoon(d, days = 14){
  const now = Date.now();
  return (d.settings.jetons || []).map(x => ({...x, j:joursAvant(x.expire)})).filter(x => x.j <= days).sort((a,b) => a.j - b.j);
}
function jetonsPanel(d){
  const lines = (d.settings.jetons || []).map(x => `${x.nom} ; ${x.expire}`).join("\n");
  const soon = jetonsSoon(d), now = Date.now();
  const lu = (d.settings.jetons || []).map(x => { const j = joursAvant(x.expire);
    return `<li><b>${esc(x.nom)}</b> · expire le ${fmtDate(x.expire)} · <span class="${j <= 2 ? "down" : j <= 14 ? "warn" : "up"}">${j < 0 ? "expiré" : j === 0 ? "aujourd'hui" : "dans " + j + " jour" + (j > 1 ? "s" : "")}</span></li>`; }).join("");
  return `<section class="panel">
    <h2>Jetons distribués</h2>
    <p>Si tu crées toi-même les jetons du staff, note ici à qui tu les as donnés et leur date d'expiration. Tout le staff voit une alerte sur l'Accueil 14 jours avant. Une ligne par jeton : <b>Nom ; JJ/MM/AAAA</b> (ou AAAA-MM-JJ).</p>
    <label class="f full"><textarea id="s_jetons" rows="4" placeholder="Kiali ; 15/01/2027&#10;Jeton commun ; 2027-03-01">${esc(lines)}</textarea></label>
    ${lu ? `<p class="meta" style="margin:8px 0 2px">Dates comprises par la page :</p><ul class="hist">${lu}</ul>` : ""}
    ${soon.length ? `<p class="meta" style="color:var(--warn)">À renouveler bientôt : ${soon.map(x => `${esc(x.nom)} (${x.j < 0 ? "expiré" : "dans " + x.j + " j"})`).join(", ")}</p>` : ""}
    <div class="tools" style="margin:10px 0 0"><button class="btn" id="s_jetsave">Enregistrer</button></div>
  </section>`;
}
function trashPanel(d){
  const t = (d.corbeille || []).slice().sort((a,b) => (b.le||"").localeCompare(a.le||""));
  return `<section class="panel" id="corbeille">
    <h2>Corbeille (${t.length})</h2>
    <p>Les fiches supprimées restent ici 30 jours, puis disparaissent. La restauration remet la fiche telle qu'elle était, avec son historique.</p>
    ${t.length ? `<ul class="trash">${t.map(x => { const j = Math.max(0, 30 - Math.floor((Date.now() - new Date(x.le)) / 864e5));
      return `<li>${avatarHtml(x.r.login)}<span class="login">${esc(x.r.login)}</span><span class="muted">${x.c === "membres" ? "Streamers" : "Propositions"} · supprimée le ${fmtStamp(x.le)} par ${esc(x.par || "?")} · encore ${j} j</span>
        <span class="r"><button class="btn" data-trash="restore" data-id="${x.r.id}">Restaurer</button><button class="btn danger" data-trash="purge" data-id="${x.r.id}">Supprimer définitivement</button></span></li>`; }).join("")}</ul>` : `<p class="none">La corbeille est vide.</p>`}
  </section>`;
}

/* ============ Modification groupée ============ */
function bulkApply(what){
  if(what === "clear"){ S.sel.clear(); render(); return; }
  const c = S.view === "membres" ? "membres" : "propositions";
  if(what === "delete"){
    const recs = [...S.sel].map(id => S.data[c].find(x => x.id === id)).filter(Boolean);
    if(!recs.length) return;
    const noms = recs.map(r => r.login);
    const liste = noms.length > 15 ? noms.slice(0, 15).join(", ") + ` … et ${noms.length - 15} autres` : noms.join(", ");
    if(!confirm(`Supprimer ${recs.length} fiche${recs.length > 1 ? "s" : ""} (${c === "membres" ? "Streamers" : "Propositions"}) ?\n\n${liste}\n\nElles restent 30 jours dans la corbeille (Réglages) et peuvent être restaurées.`)) return;
    recs.forEach(r => dispatch({t:"del", c, id:r.id}));
    dispatch({t:"note", txt:`Suppression groupée de ${recs.length} fiche${recs.length > 1 ? "s" : ""} (${c === "membres" ? "streamers" : "propositions"}) : ${noms.join(", ")}`});
    S.sel.clear(); S.drawer = null; render();
    toast(`${recs.length} fiche${recs.length > 1 ? "s" : ""} mise${recs.length > 1 ? "s" : ""} à la corbeille`, false, {label:"Annuler", fn:() => restoreFiches(recs.map(r => r.id))});
    return;
  }
  const val = id => { const v = $("#" + id)?.value; return v === undefined || v === "__keep" ? undefined : v; };
  const st = val("bk_statut"), role = c === "membres" ? val("bk_role") : undefined, al = c === "membres" ? val("bk_alerte") : undefined, ref = c === "membres" ? val("bk_ref") : undefined;
  const tag = normTag($("#bk_tag")?.value), tagMode = $("#bk_tagmode")?.value || "add";
  if(st === undefined && role === undefined && al === undefined && ref === undefined && !tag && (c !== "membres" || val("bk_raison") === undefined)){ toast("Choisis au moins une modification.", true); return; }
  const ids = [...S.sel].filter(id => S.data[c].some(x => x.id === id)); const today = todayISO();
  ids.forEach(id => {
    const r = S.data[c].find(x => x.id === id), p = {};
    if(st !== undefined){ p.statut = st;
      if(c === "membres" && st === "Parti" && !r.depart) p.depart = today;
      if(c === "membres" && st === "Présent" && !r.arrivee) p.arrivee = today;
      if(c === "propositions" && ["Accepté","Refusé"].includes(st) && !r.dateRevue) p.dateRevue = today; }
    if(role !== undefined) p.role = role;
    if(al !== undefined) p.alerte = al === "1";
    const rs = c === "membres" ? val("bk_raison") : undefined;
    if(rs !== undefined && (st === "Parti" || (st === undefined && r.statut === "Parti"))) p.raisonDepart = rs;
    if(ref !== undefined) p.referent = ref;
    if(tag){ const cur = r.tags || [];
      if(tagMode === "add" && !hasTag(r, tag)) p.tags = [...cur, tag];
      if(tagMode === "del" && hasTag(r, tag)) p.tags = cur.filter(x => x.toLowerCase() !== tag.toLowerCase()); }
    if(!Object.keys(p).length) return;
    dispatch({t:"patch", c, id, p});
  });
  const desc = [st !== undefined && `statut « ${st || (c === "membres" ? "À renseigner" : "À trier")} »`, role !== undefined && `rôle « ${role || "aucun"} »`, ref !== undefined && `référent « ${ref || "aucun"} »`, tag && `étiquette « ${tag} » ${tagMode === "add" ? "ajoutée" : "retirée"}`, al !== undefined && (al === "1" ? "alerte configurée" : "sans alerte")].filter(Boolean).join(", ");
  dispatch({t:"note", txt:`Modification groupée de ${ids.length} fiche${ids.length>1?"s":""} (${desc}) : ${ids.map(id => S.data[c].find(x => x.id === id)?.login).join(", ")}`});
  S.sel.clear(); render(); toast(`${ids.length} fiche${ids.length>1?"s":""} modifiée${ids.length>1?"s":""}`);
}
