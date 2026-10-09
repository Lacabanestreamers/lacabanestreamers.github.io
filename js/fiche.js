// La Cabane · page staff · Tiroir d'édition d'une fiche (streamer ou proposition), modèles de messages.
// Scripts classiques chargés dans l'ordre par index.html : ils partagent les mêmes variables globales.
/* ============ Tiroir d'édition ============ */
function renderDrawer(){
  const root = $("#drawerRoot");
  if(!S.drawer || !S.data){ root.innerHTML = ""; return; }
  const {c, id} = S.drawer; const r = S.data[c].find(x => x.id === id);
  if(!r){ S.drawer = null; root.innerHTML = ""; return; }
  // Ne pas écraser un champ en cours de saisie
  if(root.contains(document.activeElement) && root.dataset.key === c+id && document.activeElement.matches("input:not([type=checkbox]),textarea")) return;
  root.dataset.key = c+id;
  const scroll = root.querySelector(".body")?.scrollTop || 0;
  root.innerHTML = `<div class="scrim" data-close></div>
    <aside class="drawer" role="dialog" aria-modal="true" aria-label="${esc(r.login)}">
      <div class="head">${avatarHtml(r.login, true)}<h2><a class="chanlink" href="https://www.twitch.tv/${encodeURIComponent(r.login)}" target="_blank" rel="noopener" title="Ouvrir la chaîne Twitch">${esc(r.login)} <span aria-hidden="true">↗</span></a></h2>${liveOf(r.login).live ? `<span class="live">LIVE</span>` : ""}<button class="btn ghost" data-close aria-label="Fermer">✕</button></div>
      <div class="body">${c === "propositions" ? drawerProp(r) : drawerMembre(r)}</div>
      <div class="foot">${c === "propositions" ? footProp(r) : footMembre(r)}</div>
    </aside>`;
  root.querySelector(".body").scrollTop = scroll;
}
const fld = (label, key, val, type="text", extra="") => `<label class="f ${extra}">${label}<input data-k="${key}" type="${type}" value="${esc(val ?? "")}"></label>`;
function selF(label, key, val, opts, emptyLabel){
  return `<label class="f">${label}<select data-k="${key}"><option value="">${esc(emptyLabel)}</option>${opts.map(o => `<option ${o===val?"selected":""}>${esc(o)}</option>`).join("")}${val && !opts.includes(val) ? `<option selected>${esc(val)}</option>` : ""}</select></label>`;
}
/* ----- Modèles de messages ----- */
const MODELES_DEFAUT = [
  {nom:"Invitation", pour:"propositions", texte:"Coucou {pseudo} ! 👋\nOn fait partie du staff de La Cabane, un serveur Discord d'entraide et de motivation entre streamers.\n{parrain} nous a parlé de ta chaîne ({lien}).\nOn serait vraiment contents de t'accueillir parmi nous ! Ça te tente ?\n{lien_discord}\n{moi}, pour le staff de La Cabane"},
  {nom:"Refus (poli)", pour:"propositions", texte:"Coucou {pseudo} !\nMerci pour ton intérêt pour La Cabane. Après discussion, le staff a décidé de ne pas donner suite pour le moment.\nPour être transparents avec toi : {motif}\nCe n'est pas un jugement sur ta chaîne : n'hésite pas à revenir vers nous plus tard !\nBon stream à toi 💜\n{moi}, pour le staff de La Cabane"},
  {nom:"Demande d'infos", pour:"propositions", texte:"Coucou {pseudo} ! 👋\nOn fait partie du staff de La Cabane, un serveur Discord d'entraide entre streamers.\n{parrain} nous a parlé de ta chaîne ({lien}) et on aimerait mieux te connaître avant d'en discuter entre nous :\n• tes jours et horaires de stream habituels ?\n• ce que tu cherches dans une communauté de streamers ?\nMerci d'avance !\n{moi}, pour le staff de La Cabane"},
  {nom:"Bienvenue", pour:"membres", texte:"Bienvenue dans La Cabane, {pseudo} ! 🎉\nTon référent dans le staff, c'est {referent} : n'hésite pas à lui écrire pour toute question.\nPense à te présenter et à partager tes horaires de stream, la communauté viendra te voir !\n{moi}, pour le staff de La Cabane"},
  {nom:"Prise de nouvelles", pour:"membres", texte:"Coucou {pseudo} ! 😊\nÇa fait quelques jours que tu as rejoint La Cabane : comment ça se passe pour toi ?\nSi tu as besoin d'un coup de main (technique, motivation, idées), on est là.\n{moi}"}
];
const modeles = () => S.data.settings.modeles || MODELES_DEFAUT;
function remplirModele(texte, r, c){
  const cand = r.candidature || {};
  const vars = {pseudo:r.login, lien:`https://twitch.tv/${r.login}`, moi:cfg.me || "", parrain:c === "propositions" ? (r.proposePar || "") : (cand.proposePar || ""),
    referent:r.referent || "", lien_discord:S.data.settings.vitrine?.lienDiscord || "", motif:r.motifRefus || "", responsable:r.responsable || ""};
  // une ligne dont une variable est vide est retirée (ex. pas de parrain connu)
  return texte.split("\n").filter(l => !/\{(\w+)\}/.test(l) || [...l.matchAll(/\{(\w+)\}/g)].every(m => !(m[1] in vars) || vars[m[1]]))
    .map(l => l.replace(/\{(\w+)\}/g, (m, k) => k in vars ? vars[k] : m)).join("\n").trim();
}
function msgBox(r, c){
  const list = modeles().map((m, i) => ({...m, i})).filter(m => m.pour === "tous" || m.pour === c);
  if(!list.length) return "";
  const sel = S.msgSel && S.msgSel.id === r.id ? S.msgSel : null;
  const texte = sel ? (sel.texte ?? remplirModele(modeles()[sel.i]?.texte || "", r, c)) : "";
  const sugg = !sel ? modeleSuggere(r, c, list) : null;
  const hist = (r.messages || []).slice(-3).reverse();
  return `<div class="msgbox"><div class="row"><select id="msgPick" aria-label="Modèle de message"><option value="">Préparer un message…</option>${list.map(m => `<option value="${m.i}" ${sel && sel.i === m.i ? "selected" : ""}>${esc(m.nom)}</option>`).join("")}</select>
    ${sel ? `<button class="btn primary" id="msgCopy">Copier</button><button class="btn ghost" id="msgClose">Fermer</button>` : ""}</div>
    ${sugg ? `<p class="msgsugg">Pour ce statut : <button type="button" class="btn ghost" data-msgsugg="${sugg.i}">${esc(sugg.nom)}</button></p>` : ""}
    ${sel ? `<textarea id="msgText" aria-label="Message à copier">${esc(texte)}</textarea><p class="meta" style="margin:4px 0 0">Tu peux retoucher le texte avant de le copier. Les modèles se modifient dans Réglages.</p>` : ""}
    ${hist.length ? `<p class="msghist">Déjà copiés : ${hist.map(x => `<b>${esc(x.nom)}</b> par ${esc(x.par || "?")} le ${fmtDate(x.le.slice(0, 10))}`).join(" · ")}</p>` : ""}</div>`;
}
// Modèle adapté à la situation de la fiche (repéré par son nom : « refus », « invitation », « infos », « bienvenue »)
function modeleSuggere(r, c, list){
  const cherche = re => list.find(m => re.test(m.nom.normalize("NFD").replace(/[\u0300-\u036f]/g, "")));
  if(c === "propositions"){
    if(["Refusé","Abandonnée"].includes(r.statut)) return cherche(/refus/i);
    if(["Accepté","Proposition à faire","Proposition en cours"].includes(r.statut)) return cherche(/invit/i);
    if(!r.statut || ["À trier","Attente staff"].includes(r.statut)) return cherche(/info/i);
    return null;
  }
  if(r.statut === "Parti" || !r.arrivee) return null;
  const j = Math.floor((Date.now() - new Date(r.arrivee + "T12:00:00")) / 864e5);
  return j <= 3 ? cherche(/bienvenue/i) : (j >= 7 && !r.suivi7) || (j >= 30 && !r.suivi30) ? cherche(/nouvelles/i) : null;
}
function modelesPanel(){
  const m = S.tplEdit || modeles();
  return `<section class="panel" id="modeles">
    <h2>Modèles de messages</h2>
    <p>Proposés dans chaque fiche (« Préparer un message »). Variables : <b>{pseudo}</b>, <b>{lien}</b> (chaîne Twitch), <b>{moi}</b>, <b>{parrain}</b>, <b>{referent}</b>, <b>{lien_discord}</b> (celui de la vitrine), <b>{responsable}</b>, <b>{motif}</b> (motif du refus noté sur la proposition). Une ligne dont une variable est vide disparaît du message.</p>
    ${m.map((t, i) => `<div class="tpl"><div class="row"><input id="tpl_nom_${i}" value="${esc(t.nom)}" placeholder="Nom du modèle" aria-label="Nom du modèle">
      <select id="tpl_pour_${i}" aria-label="Fiches concernées">${[["propositions","Propositions"],["membres","Streamers"],["tous","Les deux"]].map(([v,l]) => `<option value="${v}" ${t.pour === v ? "selected" : ""}>${l}</option>`).join("")}</select>
      <button class="btn danger" data-tpldel="${i}">Retirer</button></div>
      <textarea id="tpl_txt_${i}" aria-label="Texte du modèle">${esc(t.texte)}</textarea></div>`).join("")}
    <div class="tools" style="margin:6px 0 0"><button class="btn" id="tplAdd">Ajouter un modèle</button><button class="btn primary" id="tplSave">Enregistrer les modèles</button>
      <button class="btn ghost" id="tplReset">Remettre les modèles d'origine</button></div>
  </section>`;
}
function lireModeles(){
  const out = []; let i = 0;
  while($(`#tpl_nom_${i}`)){ out.push({nom:$(`#tpl_nom_${i}`).value.trim() || `Modèle ${i+1}`, pour:$(`#tpl_pour_${i}`).value, texte:$(`#tpl_txt_${i}`).value}); i++; }
  return out;
}

function linksFor(login){
  return `<div class="links">
    <a href="https://www.twitch.tv/${encodeURIComponent(login)}" target="_blank" rel="noopener">Twitch</a>
    <a href="https://sullygnome.com/channel/${encodeURIComponent(login)}" target="_blank" rel="noopener">SullyGnome</a>
    <a href="https://twitchtracker.com/${encodeURIComponent(login)}" target="_blank" rel="noopener">TwitchTracker</a>
    ${liveOf(login).follows != null ? `<span class="muted">${liveOf(login).follows} follows</span>` : ""}
  </div>`;
}
function drawerProp(p){
  const st = S.data.settings;

  const avisRow = name => { const v = p.avis?.[name] || "", k = avisKind(v);
    const preset = ["Pour","Contre","Neutre"];
    return `<div class="avisrow ${cfg.me===name?"me":""}"><span>${esc(name)}${v && p.avisDiscord?.[name] === v ? ` <span class="muted" title="Avis donné par réaction sur Discord">(Discord)</span>` : ""}</span><div class="seg">
      ${preset.map(o => `<button type="button" class="${o.toLowerCase()}" data-avis="${esc(name)}" data-v="${o}" aria-pressed="${v===o}">${o}</button>`).join("")}
      <input data-k="avis.${esc(name)}" value="${esc(preset.includes(v) ? "" : v)}" placeholder="${preset.includes(v) ? esc(v) + " (ou précise…)" : "Avis libre"}" aria-label="Avis de ${esc(name)}">
    </div></div>`; };
  const ls = lastStream(p);
  return `${linksFor(p.login)}
  <p class="meta" style="margin:0 0 10px">📺 Dernier stream : ${!ls ? "inconnu (le robot le relève 3 fois par jour)" : ls.live ? `<b class="up">en live maintenant</b>` : `<b class="${ls.days > 30 ? "down" : ls.days > 14 ? "warn" : ""}">${ls.date.toLocaleDateString("fr-FR")}</b> (${ls.days === 0 ? "aujourd'hui" : "il y a " + ls.days + " j"}) · ${esc(ls.src)}`}</p>
  ${msgBox(p, "propositions")}
  <div class="grid">
    ${selF("Statut","statut",p.statut,st.statutsProposition,"À trier")}
    ${fld("Proposée par","proposePar",p.proposePar)}
    ${["Refusé","Abandonnée"].includes(p.statut) || p.motifRefus ? fld("Motif du refus","motifRefus",p.motifRefus,"text","full") : ""}
    ${(() => { const ch = chargeResponsables(), sg = ch[0], n = Object.fromEntries(ch.map(x => [x.nom, x.n]));
      return `<label class="f">Responsable (contacte le streamer)<select data-k="responsable"><option value="">— personne —</option>${st.staff.map(o => `<option value="${esc(o)}" ${o === p.responsable ? "selected" : ""}>${esc(o)} (${n[o] ?? 0} en cours)</option>`).join("")}${p.responsable && !st.staff.includes(p.responsable) ? `<option selected>${esc(p.responsable)}</option>` : ""}</select>
        ${!p.responsable && sg && !CLOSED.includes(p.statut) ? `<span class="meta" style="margin:4px 0 0">Suggestion : <b>${esc(sg.nom)}</b> (${sg.n} en cours) <button type="button" class="btn ghost" data-resppick="${esc(sg.nom)}" style="padding:2px 10px">Choisir</button></span>` : ""}</label>`; })()}
    ${fld("Contact (lien ou e-mail)","contact",p.contact,"text","full")}
    ${fld("Date de proposition","dateProposition",p.dateProposition,"date")}
    ${fld("Date de revue","dateRevue",p.dateRevue,"date")}
    ${fld("Date d'invitation","dateInvitation",p.dateInvitation,"date")}
    ${fld("Hype","hype",p.hype)}
    ${fld("Follows à la revue","followsRevue",p.followsRevue,"number")}
    ${fld("Viewers moyens (saisie)","viewersMoyens",p.viewersMoyens,"number")}
    <label class="f">Viewers moyens mesurés (30 j)<input disabled value="${(() => { const v = viewersStats(p); return v ? `${v.avg} (${v.n} mesures, ${v.days} j de live)` : "pas encore mesuré"; })()}"></label>
  </div>
  <fieldset><legend>Avis du staff</legend>${voteSummary(p)}${st.staff.map(avisRow).join("") || `<p class="muted">Ajoute les membres du staff dans Réglages.</p>`}</fieldset>
  ${revoirBlock(p)}
  ${rappelsBlock(p, "propositions")}
  ${tagEditor(p)}
  <label class="f" style="margin-top:14px">Commentaires de revue<textarea data-k="commentaire">${esc(p.commentaire)}</textarea></label>
  ${historyBlock(p, "propositions")}
  ${p.maj ? `<p class="meta">Dernière modification par ${esc(p.maj.par)} le ${fmtStamp(p.maj.le)}</p>` : ""}`;
}
// Proposition refusée ou abandonnée : rappel « à revoir » dans 3, 6 ou 12 mois (accueil + message Discord de 9 h)
const FERMEES_REVOIR = ["Refusé","Abandonnée","Aucun contact"];
function revoirBlock(p){
  if(!FERMEES_REVOIR.includes(p.statut)) return "";
  const prevu = (p.rappels || []).find(x => x.revoir);
  return `<fieldset><legend>Revoir plus tard</legend>
    <p class="meta" style="margin-top:0">${prevu ? `À revoir le <b>${fmtDate(prevu.date)}</b>${prevu.par ? ` par ${esc(prevu.par)}` : ""} : ce jour-là, la fiche apparaît dans les rappels de l'accueil et dans le message Discord de 9 h.`
      : "Une chaîne qui ne convient pas aujourd'hui peut avoir changé dans quelques mois. Programme un rappel pour la regarder de nouveau :"}</p>
    <div class="revoir">${[3, 6, 12].map(n => `<button type="button" class="btn ${prevu ? "ghost" : ""}" data-revoir="${n}">${prevu ? "Déplacer à" : "Dans"} ${n} mois</button>`).join("")}</div></fieldset>`;
}
function tagEditor(r){
  return `<label class="f" style="margin-top:14px">Étiquettes
    <span class="tagedit">${(r.tags || []).map(t => `<span class="tg">${esc(t)}<button type="button" data-tagdel="${esc(t)}" aria-label="Retirer ${esc(t)}">×</button></span>`).join("")}
    <input id="tagAdd" list="tagList" placeholder="Ajouter une étiquette puis Entrée…" autocomplete="off"></span></label>${tagList()}`;
}
function rappelsBlock(r, c){
  const t = todayISO(), list = (r.rappels || []).slice().sort((a, b) => a.date.localeCompare(b.date));
  const d7 = new Date(Date.now() + 7*864e5), def = new Date(d7.getTime() - d7.getTimezoneOffset()*60000).toISOString().slice(0,10);
  return `<fieldset><legend>Rappels</legend>
    ${list.length ? `<ul class="rappels">${list.map(x => { const j = joursAvant(x.date);
      return `<li><span class="dt ${j < 0 ? "down" : j === 0 ? "warn" : ""}">${fmtDate(x.date)}</span><span class="tx">${esc(x.texte)}</span><span class="par">${esc(x.par || "?")}${j < 0 ? ` · en retard de ${-j} j` : j === 0 ? " · aujourd'hui" : ` · dans ${j} j`}</span>
        <button type="button" class="btn ghost" data-rpdone="${x.id}" style="padding:2px 10px">Fait</button></li>`; }).join("")}</ul>` : `<p class="meta" style="margin-top:0">Aucun rappel. Ex. : « recontacter après ses vacances ».</p>`}
    <div class="rpadd"><input type="date" id="rpDate" value="${def}" aria-label="Date du rappel"><input type="text" id="rpTexte" placeholder="Quoi faire ce jour-là ?" maxlength="200" aria-label="Texte du rappel">
      <button type="button" class="btn" id="rpAdd">Ajouter le rappel</button></div>
  </fieldset>`;
}
function voteSummary(p){
  const v = voteInfo(p); if(!v.total) return "";
  const w = k => v.total ? (v.c[k] / v.total * 100).toFixed(1) : 0;
  const parts = [v.c.pour && `${v.c.pour} pour`, v.c.contre && `${v.c.contre} contre`, v.c.neutre && `${v.c.neutre} neutre${v.c.neutre>1?"s":""}`, v.c.autre && `${v.c.autre} autre${v.c.autre>1?"s":""}`].filter(Boolean).join(", ");
  const sugg = v.suggestion && v.suggestion !== p.statut && !["Accepté","Refusé","Abandonnée"].includes(p.statut)
    ? `<div class="suggest">Suggestion d'après les avis : ${pill(v.suggestion)} <button class="btn ${v.suggestion === "Accepté" ? "primary" : ""}" data-act="suggest" data-v="${v.suggestion}">Appliquer</button></div>`
    : v.egalite ? `<div class="suggest">Égalité parfaite : à trancher en discussion.</div>` : "";
  return `<div class="votes"><b>${v.done} avis sur ${v.total}</b><span class="muted">${parts || "aucun avis"}</span>
    <span class="vbar" aria-hidden="true"><i class="pour" style="width:${w("pour")}%"></i><i class="neutre" style="width:${w("neutre")}%"></i><i class="autre" style="width:${w("autre")}%"></i><i class="contre" style="width:${w("contre")}%"></i></span></div>
    ${v.missing.length && v.done ? `<p class="meta" style="margin:-4px 0 10px">En attente : ${v.missing.map(esc).join(", ")}</p>` : ""}${sugg}`;
}
function footProp(p){
  const inCabane = S.data.membres.some(m => m.login === p.login);
  const closed = ["Refusé","Abandonnée","Aucun contact"].includes(p.statut);
  const move = inCabane ? `<span class="muted" style="align-self:center">Déjà dans Streamers</span>`
    : closed ? "" : `<button class="btn primary" data-act="transfer">${p.statut === "Accepté" ? "Transférer dans Streamers" : "Accepter et transférer dans Streamers"}</button>`;
  return `${closed ? `<button class="btn" data-act="repropose">Reproposer</button>` : ""}${move}
    <button class="btn danger" data-act="delete" style="margin-left:auto">Supprimer</button>`;
}
function drawerMembre(m){
  const st = S.data.settings, a = annivInfo(m.premierStream);
  return `${linksFor(m.login)}${msgBox(m, "membres")}
  <div class="grid">
    ${fld("Pseudo Discord","discord",m.discord)}
    <p class="meta full" style="margin:-4px 0 0">${m.discordId ? `✓ Compte Discord relié${m.discord ? ` (<b>${esc(m.discord)}</b>)` : ""} : ses ✅ et « Intéressé » comptent comme inscriptions, et il est mentionné dans les rappels. <button type="button" class="btn ghost" data-delier="${m.id}" style="padding:2px 10px">Délier</button>`
      : m.discord ? `Pas encore relié : le robot cherchera « ${esc(m.discord)} » sur le serveur au prochain passage (nom d'utilisateur Discord, pas le pseudo affiché si possible).`
      : `Aucun compte Discord relié. Il se relie tout seul si son nom Discord ressemble à son pseudo Twitch, sinon note son nom d'utilisateur Discord ici.`}</p>
    ${selF("Rôle","role",m.role,st.roles,"—")}
    ${selF("Statut","statut",m.statut,["Présent","Parti"],"À renseigner")}
    ${(() => { const ch = Object.fromEntries(chargeReferents().map(x => [x.nom, x])), sg = suggestionReferent();
      return `<label class="f">Référent staff<select data-k="referent"><option value="">— aucun —</option>${st.staff.map(o => `<option value="${esc(o)}" ${o === m.referent ? "selected" : ""}>${esc(o)} (${ch[o]?.nouveaux ?? 0} nouveau${(ch[o]?.nouveaux ?? 0) > 1 ? "x" : ""})</option>`).join("")}${m.referent && !st.staff.includes(m.referent) ? `<option selected>${esc(m.referent)}</option>` : ""}</select>
        ${!m.referent && sg && !["Admin","Modo"].includes(m.role) ? `<span class="meta" style="margin:4px 0 0">Suggestion : <b>${esc(sg.nom)}</b> (le moins chargé : ${sg.nouveaux} nouveau${sg.nouveaux > 1 ? "x" : ""} en suivi) <button type="button" class="btn ghost" data-refpick="${esc(sg.nom)}" style="padding:2px 10px">Choisir</button></span>` : ""}</label>`; })()}
    ${fld("Arrivée","arrivee",m.arrivee,"date")}
    ${m.statut === "Parti" ? fld("Départ","depart",m.depart,"date") : ""}
    ${m.statut === "Parti" ? `${selF("Raison du départ","raisonDepart",m.raisonDepart,RAISONS_DEPART,"— à préciser —")}${fld("Précision (facultatif)","raisonDetail",m.raisonDetail,"text","full")}` : ""}
    <label class="check" style="align-self:end"><input type="checkbox" data-k="alerte" ${m.alerte?"checked":""}> Alerte stream configurée</label>
    <label class="check full"><input type="checkbox" data-k="masquerVitrine" ${m.masquerVitrine?"checked":""}> Masquer de la vitrine publique${S.data.settings.vitrine?.active && !m.masquerVitrine ? ` · <a href="${VITRINE_URL()}?m=${encodeURIComponent(m.login)}" target="_blank" rel="noopener">sa page publique</a> · <button type="button" class="btn ghost" data-copier="${VITRINE_URL()}s/${esc(m.login)}" style="padding:1px 8px" title="Lien avec aperçu (avatar, bio) quand on le colle dans Discord">copier le lien de partage</button>` : ""}</label>
  </div>
  <fieldset><legend>Follows</legend>
    <div class="grid">
      <label class="f">Mise à jour<select data-k="followsMode"><option value="auto" ${m.followsMode!=="manuel"?"selected":""}>Auto (Twitch)</option><option value="manuel" ${m.followsMode==="manuel"?"selected":""}>Manuelle</option></select></label>
      ${m.followsMode === "manuel" ? fld("Follows (saisie)","followsManuel",m.followsManuel,"number") : `<label class="f">Follows actuels<input disabled value="${esc(liveOf(m.login).follows ?? "non lu")}"></label>`}
    </div>
    ${sparkline(m)}
    ${(() => { const pl = (S.data.paliers || []).filter(x => x.login === m.login).slice(-5).reverse(); return pl.length ? `<p class="meta" style="margin-top:2px">Paliers : ${pl.map(x => `<b>${x.palier}</b> le ${fmtDate(x.date)}`).join(" · ")}</p>` : ""; })()}
  </fieldset>
  ${suiviBlock(m)}
  ${integrationBlock(m)}
  ${(() => { const l = evenementsRecents(3650).filter(x => x.login === m.login); return l.length ? `<fieldset><legend>Réussites (vitrine)</legend><ul style="list-style:none;padding:0;margin:0">${l.map(x => `<li style="display:flex;flex-wrap:wrap;gap:6px 8px;align-items:center;padding:3px 0"><span style="flex:1 1 160px;min-width:0">${x.kind === "palier" ? "🚀" : "🎉"} ${esc(x.txt)} · <span class="muted">${fmtDate(x.date)}</span>${x.masque ? ` · <b class="warn">masquée</b>` : ""}</span>${btnReussite(x)}</li>`).join("")}</ul></fieldset>` : ""; })()}
  ${affiliationBlock(m)}
  <fieldset><legend>Activité</legend>
    ${(() => { const n = {}; for(const [, j] of m.jeuxLog || []) n[j] = (n[j] || 0) + 1; const t = Object.entries(n).sort((a, b) => b[1] - a[1]).slice(0, 5);
      return t.length ? `<p class="meta" style="margin-top:0">🎮 Joue surtout à (30 jours) : ${t.map(([j, h]) => `<b>${esc(j)}</b> ${h} h`).join(" · ")}</p>` : ""; })()}
    ${m.clip?.url && safeUrl(m.clip.url) ? `<p class="meta" style="margin-top:0">🎬 Clip de la semaine : <a href="${esc(m.clip.url)}" target="_blank" rel="noopener">${esc(m.clip.titre || "clip")}</a> (${Number(m.clip.vues) || 0} vues)</p>` : ""}
    ${(() => { const x = lastStream(m); return `<p class="meta" style="margin-top:0">Dernier stream : ${!x ? "inconnu" : x.live ? "en live maintenant" : `${x.date.toLocaleDateString("fr-FR")} (${x.days === 0 ? "aujourd'hui" : "il y a " + x.days + " j"}) · ${x.src}`}</p>`; })()}
    <div class="grid">${fld("Dernier stream (saisie manuelle)","dernierStreamManuel",m.dernierStreamManuel,"date")}</div>
  </fieldset>
  <fieldset><legend>Anniversaire de stream</legend>
    <div class="grid">
      ${fld("Date du 1er stream","premierStream",m.premierStream,"date")}
      <label class="check" style="align-self:end"><input type="checkbox" data-k="annivConfirme" ${m.annivConfirme?"checked":""}> Date confirmée</label>
      ${fld("Commentaire","annivCommentaire",m.annivCommentaire,"text","full")}
    </div>
    ${a ? `<p class="meta">${a.years} ${a.years>1?"ans":"an"} le ${a.next.toLocaleDateString("fr-FR")} · ${a.days===0?"aujourd'hui":"dans "+a.days+" jours"}</p>` : ""}
  </fieldset>
  ${rappelsBlock(m, "membres")}
  ${tagEditor(m)}
  <label class="f" style="margin-top:14px">Notes<textarea data-k="notes">${esc(m.notes)}</textarea></label>
  ${historyBlock(m, "membres")}
  ${m.maj ? `<p class="meta">Dernière modification par ${esc(m.maj.par)} le ${fmtStamp(m.maj.le)}</p>` : ""}`;
}
function suiviBlock(m){
  if(!m.arrivee || m.statut === "Parti" || ["Admin","Modo"].includes(m.role)) return "";
  const since = Math.floor((Date.now() - new Date(m.arrivee + "T12:00:00")) / 864e5);
  if(since > 60 && m.suivi7 && m.suivi30) return "";
  const row = (k, j) => `<label class="check"><input type="checkbox" data-k="${k}" data-date="1" ${m[k] ? "checked" : ""}> Prise de nouvelles à J+${j}${m[k] ? ` <span class="muted">(faite le ${fmtDate(m[k])})</span>` : since >= j ? ` <span class="warn">à faire</span>` : ` <span class="muted">(dans ${j - since} j)</span>`}</label>`;
  return `<fieldset><legend>Suivi du nouvel arrivant</legend>
    <p class="meta" style="margin-top:0">Arrivé il y a ${since} jour${since>1?"s":""}${m.referent ? ` · référent : <b>${esc(m.referent)}</b>` : ` · <span class="warn">pas de référent</span>`}</p>
    ${row("suivi7", 7)}${row("suivi30", 30)}</fieldset>`;
}
function affiliationBlock(m){
  if(m.type === undefined) return "";
  if(m.type === "partner" || m.type === "affiliate") return `<fieldset><legend>Twitch</legend><p class="meta" style="margin:0">${typeTag(m)} ${m.type === "partner" ? "Partenaire" : "Affilié"} Twitch${m.twitchId ? ` · ID ${esc(m.twitchId)}` : ""}</p></fieldset>`;
  const v = viewersStats(m), f = currentFollows(m);
  const crit = [
    ["Followers", f, 50, f == null ? "?" : f],
    ["Jours de stream", v?.days ?? 0, 7, `${v?.days ?? 0} / 7`],
    ["Minutes de stream", (v?.hours ?? 0) * 60, 500, `≈ ${(v?.hours ?? 0) * 60} / 500`],
    ["Viewers moyens", v?.avg ?? 0, 3, `${v?.avg ?? 0} / 3`]
  ];
  const ok = crit.filter(c => (c[1] ?? 0) >= c[2]).length;
  return `<fieldset><legend>Vers l'affiliation (${ok}/4)</legend>
    <div class="gauge">${crit.map(([l, val, obj, txt]) => { const pct = Math.min(100, Math.round((val ?? 0) / obj * 100));
      return `<span>${l}</span><span class="gbar"><i class="${pct >= 100 ? "ok" : ""}" style="width:${pct}%"></i></span><span class="v ${pct >= 100 ? "up" : ""}">${txt}</span>`; }).join("")}</div>
    <p class="meta">Estimation sur 30 jours à partir des mesures horaires du robot : les minutes sont arrondies à l'heure de live observée.</p></fieldset>`;
}
function footMembre(m){ return `<button class="btn danger" data-act="delete" style="margin-left:auto">Supprimer la fiche</button>`; }
