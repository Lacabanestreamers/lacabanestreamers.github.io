// La Cabane · page staff · Tableaux : outils communs, étiquettes, colonnes, vues enregistrées, Propositions, Streamers, export CSV, import en lot, Anniversaires.
// Scripts classiques chargés dans l'ordre par index.html : ils partagent les mêmes variables globales.
/* ----- Outils communs aux tableaux ----- */
const CLOSED = ["Accepté","Refusé","Abandonnée"];
const cell = (label, html, cls="") => `<td data-l="${esc(label)}" class="${cls}${String(html).trim() === "" ? " e" : ""}">${html}</td>`;
function selHead(ids){
  S.visible = ids;
  const all = ids.length && ids.every(id => S.sel.has(id));
  return `<th class="sel"><input type="checkbox" data-selall aria-label="Tout sélectionner" ${all ? "checked" : ""}></th>`;
}
const selCell = id => `<td class="sel"><input type="checkbox" data-sel="${esc(id)}" aria-label="Sélectionner" ${S.sel.has(id) ? "checked" : ""}></td>`;
function bulkBar(kind){
  if(!S.sel.size) return "";
  const opt = (arr, empty) => `<option value="__keep">${empty}</option>` + arr.map(([v,l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join("");
  const fields = kind === "membres"
    ? `<select id="bk_statut" aria-label="Statut">${opt([["Présent","Présent"],["Parti","Parti"],["","À renseigner"]], "Statut : inchangé")}</select>
       <select id="bk_role" aria-label="Rôle">${opt([...S.data.settings.roles.map(r => [r,r]), ["","Aucun rôle"]], "Rôle : inchangé")}</select>
       <select id="bk_ref" aria-label="Référent">${opt([...S.data.settings.staff.map(x => [x,x]), ["","Aucun référent"]], "Référent : inchangé")}</select>
       <input id="bk_tag" list="tagList" placeholder="Étiquette…" aria-label="Étiquette"><select id="bk_tagmode" aria-label="Ajouter ou retirer"><option value="add">l'ajouter</option><option value="del">la retirer</option></select>
       <select id="bk_raison" aria-label="Raison du départ (si Parti)">${opt(RAISONS_DEPART.map(x => [x,x]), "Raison (si Parti)")}</select>
       <select id="bk_alerte" aria-label="Alerte">${opt([["1","Alerte configurée"],["0","Pas d'alerte"]], "Alerte : inchangée")}</select>`
    : `<select id="bk_statut" aria-label="Statut">${opt([...S.data.settings.statutsProposition.map(x => [x,x]), ["","À trier"]], "Statut : inchangé")}</select>
       <input id="bk_tag" list="tagList" placeholder="Étiquette…" aria-label="Étiquette"><select id="bk_tagmode" aria-label="Ajouter ou retirer"><option value="add">l'ajouter</option><option value="del">la retirer</option></select>`;
  return `<div class="bulkbar" role="region" aria-label="Modification groupée"><span><b>${S.sel.size}</b> sélectionnée${S.sel.size > 1 ? "s" : ""}</span>${fields}
    <button class="btn primary" data-bulk="apply">Appliquer</button><button class="btn ghost" data-bulk="clear">Désélectionner</button>
    ${tagList()}<button class="btn danger bulkdel" data-bulk="delete">Supprimer ${S.sel.size > 1 ? "les " + S.sel.size + " fiches" : "la fiche"}</button></div>`;
}

/* ----- Étiquettes ----- */
const normTag = t => String(t || "").replace(/\s+/g, " ").trim().slice(0, 30);
function allTags(){
  const set = new Map();
  for(const r of [...S.data.membres, ...S.data.propositions]) for(const t of r.tags || []) set.set(t.toLowerCase(), t);
  return [...set.values()].sort((a,b) => a.localeCompare(b, "fr"));
}
const tagsHtml = r => (r.tags || []).map(t => `<span class="tg">${esc(t)}</span>`).join("");
const tagList = () => `<datalist id="tagList">${allTags().map(t => `<option value="${esc(t)}">`).join("")}</datalist>`;
const hasTag = (r, t) => (r.tags || []).some(x => x.toLowerCase() === t.toLowerCase());

/* ----- Colonnes (choix mémorisé sur l'appareil) ----- */
const COLS_KEY = "cabane.cols";
let colPrefs = store.get(COLS_KEY, {});
const staffAvis = p => { const staff = S.data.settings.staff, v = voteInfo(p);
  return `<span class="avis" title="${esc(staff.map(s => `${s} : ${p.avis?.[s] || "—"}`).join("\n"))}">${staff.map(s => `<i class="${avisKind(p.avis?.[s])}"></i>`).join("")}</span><span class="avcount">${v.done}/${staff.length}</span>${v.suggestion && v.suggestion !== p.statut ? ` <span title="Suggestion d'après les avis : ${v.suggestion}">${v.suggestion === "Accepté" ? "👍" : "👎"}</span>` : ""}`; };
const followsCell = (f, manuel) => f != null ? esc(f) + (manuel ? ` <span class="muted" title="Saisie manuelle">✎</span>` : "") : `<span class="muted">${S.liveLoading ? "…" : "–"}</span>`;
function membreProg(m){ const ref = refSnapshot(), c = followsVus(m)?.v, r = ref?.follows?.[m.login]; return c != null && r != null ? c - r : null; }
// Follows d'un streamer : en direct, sinon dernier relevé du robot (en gris, avec sa date au survol)
function followsMembreCell(m){
  const f = followsVus(m);
  if(!f) return followsCell(null);
  if(f.direct) return followsCell(f.v, m.followsMode === "manuel");
  return `<span class="muted" title="Relevé du robot du ${fmtDate(f.date)}${S.liveLoading ? " · lecture Twitch en cours" : " · lecture Twitch en direct indisponible"}">${esc(f.v)}</span>`;
}
const COLS = {
  propositions:[
    {k:"statut", l:"Statut", s:"statut", td:p => pill(p.statut), x:p => p.statut || "À trier"},
    {k:"proposePar", l:"Proposée par", s:"proposePar", td:p => esc(p.proposePar), x:p => p.proposePar},
    {k:"contact", l:"Contact", td:p => contactHtml(p.contact), x:p => p.contact},
    {k:"follows", l:"Follows", s:"follows", n:1, td:p => followsCell(liveOf(p.login).follows), x:p => liveOf(p.login).follows ?? ""},
    {k:"viewers", l:"Viewers moy.", s:"viewers", n:1, td:viewersCell, x:p => viewersStats(p)?.avg ?? ""},
    {k:"last", l:"Dernier stream", s:"last", n:1, td:lastStreamCell, x:p => { const z = lastStream(p); return z ? (z.live ? "en live" : z.days + " j") : ""; }},
    {k:"votes", l:"Avis staff", s:"votes", td:staffAvis, x:p => `${voteInfo(p).done}/${S.data.settings.staff.length}`},
    {k:"date", l:"Proposée le", s:"date", td:p => fmtDate(p.dateProposition), x:p => p.dateProposition || ""},
    {k:"tags", l:"Étiquettes", off:1, td:tagsHtml, x:p => (p.tags || []).join(", ")}
  ],
  membres:[
    {k:"live", l:"Live", s:"live", td:m => { const l = liveOf(m.login); return l.live ? `<span class="live" title="${esc(l.uptime)}">LIVE</span>` : ""; }, x:m => liveOf(m.login).live ? "oui" : ""},
    {k:"discord", l:"Discord", s:"discord", td:m => esc(m.discord), x:m => m.discord},
    {k:"role", l:"Rôle", s:"role", td:m => esc(m.role), x:m => m.role},
    {k:"statut", l:"Statut", s:"statut", td:m => pill(m.statut, "À renseigner"), x:m => m.statut || "À renseigner"},
    {k:"referent", l:"Référent", s:"referent", off:1, td:m => esc(m.referent), x:m => m.referent},
    {k:"arrivee", l:"Arrivée", s:"arrivee", td:m => fmtDate(m.arrivee), x:m => m.arrivee || ""},
    {k:"last", l:"Dernier stream", s:"last", n:1, td:lastStreamCell, x:m => { const z = lastStream(m); return z ? (z.live ? "en live" : z.days + " j") : ""; }},
    {k:"follows", l:"Follows", s:"follows", n:1, td:followsMembreCell, x:m => followsVus(m)?.v ?? ""},
    {k:"viewers", l:"Viewers moy.", s:"viewers", n:1, td:viewersCell, x:m => viewersStats(m)?.avg ?? ""},
    {k:"prog", l:"Progression", s:"prog", n:1, td:m => { const p = membreProg(m); return p == null ? "" : `<span class="${p>0?"up":p<0?"down":""}">${p>0?"+":""}${p}</span>`; }, x:m => membreProg(m) ?? ""},
    {k:"anniv", l:"Anniv dans", s:"anniv", n:1, td:m => { const a = annivInfo(m.premierStream); return a ? (a.days === 0 ? "🎂 aujourd'hui" : a.days + " j") : ""; }, x:m => annivInfo(m.premierStream)?.days ?? ""},
    {k:"alerte", l:"Alerte", td:m => m.alerte ? "✓" : "", x:m => m.alerte ? "oui" : ""},
    {k:"tags", l:"Étiquettes", off:1, td:tagsHtml, x:m => (m.tags || []).join(", ")}
  ]
};
const colOn = (view, c) => (colPrefs[view] || {})[c.k] ?? !c.off;
const visibleCols = view => COLS[view].filter(c => colOn(view, c));
/* ----- Vues enregistrées : filtres + tri d'un tableau, retrouvés en un clic ----- */
// Personnelles (rangées sous le prénom choisi dans « Je suis », visibles sur tous tes appareils) ou communes à tout le staff
const VUE_CHAMPS = {propositions:["pq", "pst", "ptag", "psort"], membres:["mq", "mst", "mrole", "mref", "mtag", "msort", "ref"]};
const VUES_LOCAL = "cabane.vues";
const etatVue = view => Object.fromEntries(VUE_CHAMPS[view].map(k => [k, S.f[k]]));
const vuesPerso = () => cfg.me ? (S.data.settings.vues?.[cfg.me] || []) : store.get(VUES_LOCAL, []);
const vuesDe = view => [...(S.data.settings.vuesCommunes || []).map(v => ({...v, commune:true})), ...vuesPerso()].filter(v => v.view === view);
const vueActive = (view, v) => JSON.stringify(etatVue(view)) === JSON.stringify(Object.fromEntries(VUE_CHAMPS[view].map(k => [k, v.f?.[k] ?? S.f[k]])));
function enregistrerVuesPerso(liste, txt){
  if(cfg.me) dispatch({t:"vues", qui:cfg.me, liste, noUndo:true, txt});
  else { store.set(VUES_LOCAL, liste); render(); }
}
function vuesBar(view){
  const l = vuesDe(view);
  return `<div class="vues" role="group" aria-label="Vues enregistrées"><span class="lbl" aria-hidden="true">★ Vues</span>
    ${l.map(v => `<button type="button" class="vue" data-vue="${esc(v.id)}" data-vview="${view}" aria-pressed="${vueActive(view, v)}" title="${v.commune ? "Vue commune à tout le staff" : "Ta vue"}">${esc(v.nom)}${v.commune ? `<span class="cm">staff</span>` : ""}</button>`).join("")}
    <button type="button" class="btn ghost" data-vuemenu="${view}" aria-expanded="${S.vueMenu === view}" style="padding:3px 10px">${l.length ? "Gérer ▾" : "Enregistrer cette vue ▾"}</button></div>
    ${S.vueMenu === view ? `<div class="vuemenu">
      <div class="row"><input type="text" id="vueNom" maxlength="40" placeholder="Nom, ex. « Mes propositions en attente »" aria-label="Nom de la vue">
        <label class="check"><input type="checkbox" id="vueCommune"> Pour tout le staff</label>
        <button type="button" class="btn primary" data-vuesave="${view}">Enregistrer la vue actuelle</button></div>
      <p class="meta" style="margin:0">Retient la recherche, le filtre de statut${view === "membres" ? ", le rôle, la comparaison" : ""}, l'étiquette et le tri en cours.${cfg.me ? "" : " Choisis ton prénom dans Réglages (« Je suis ») pour retrouver tes vues sur tous tes appareils."}</p>
      ${l.length ? `<ul>${l.map(v => `<li><span class="n">${esc(v.nom)}${v.commune ? ` <span class="muted">· commune</span>` : ""}</span><button type="button" class="btn danger" data-vuedel="${esc(v.id)}" data-vview="${view}" style="padding:2px 10px" aria-label="Supprimer la vue ${esc(v.nom)}">Supprimer</button></li>`).join("")}</ul>` : ""}
    </div>` : ""}`;
}
function colMenu(view){
  if(S.colMenu !== view) return "";
  return `<div class="colmenu" role="group" aria-label="Colonnes affichées">${COLS[view].map(c => `<label class="check"><input type="checkbox" data-col="${c.k}" ${colOn(view, c) ? "checked" : ""}> ${esc(c.l)}</label>`).join("")}
    <button class="btn ghost" data-colreset="${view}">Par défaut</button></div>`;
}
function tableHtml(view, rows, sort){
  const cols = visibleCols(view), c = view === "propositions" ? "propositions" : "membres";
  return `<div class="tablewrap"><table>
    <thead><tr>${selHead(rows.map(r => r.id))}${th("Chaîne","login",sort)}${cols.map(col => col.s ? th(col.l, col.s, sort, col.n ? "num" : "") : `<th>${esc(col.l)}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(r => `
      <tr data-open="${c}:${esc(r.id)}" class="${S.sel.has(r.id) ? "picked" : ""}">
        ${selCell(r.id)}
        ${cell("", `<span class="who">${avatarHtml(r.login)}<span class="login">${esc(r.login)}</span></span>${typeTag(r)}${c === "membres" ? pauseBadge(r) : ""}${aRappelEchu(r) ? `<span class="bell" title="Rappel à traiter">🔔</span>` : ""}${view === "propositions" && liveOf(r.login).live ? ` <span class="live">LIVE</span>` : ""}${view === "propositions" && STAG_STATUTS.includes(r.statut) && (depuisStatut(r) ?? 0) >= stagJours() ? `<span class="stag" title="Dans le statut « ${esc(r.statut)} » depuis ${depuisStatut(r)} jours">⏳ ${depuisStatut(r)} j</span>` : ""}`, "first")}
        ${cols.map(col => cell(col.l, col.td(r), col.n ? "num" : "")).join("")}
      </tr>`).join("") || `<tr><td colspan="${cols.length + 2}" class="empty">Aucune fiche ne correspond à ce filtre.</td></tr>`}</tbody>
  </table></div>`;
}
const tagFilter = (id, cur) => { const tags = allTags(); return tags.length ? `<select id="${esc(id)}" class="chip" aria-label="Étiquette"><option value="">Toutes les étiquettes</option>${tags.map(t => `<option ${cur === t ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>` : ""; };

/* ----- Propositions ----- */
function propRows(){
  const q = S.f.pq.trim().toLowerCase();
  let rows = S.data.propositions.filter(p => (S.f.pst === "__all" || (p.statut||"") === S.f.pst) && (!S.f.ptag || hasTag(p, S.f.ptag)) &&
    (!q || [p.login, p.proposePar, p.contact, p.commentaire, ...(p.tags || [])].some(x => String(x||"").toLowerCase().includes(q))));
  return sortRows(rows, S.f.psort, {last:p => { const x = lastStream(p); return x ? (x.live ? -1 : x.days) : null; }, statut:p => p.statut||"", date:p => p.dateProposition, follows:p => liveOf(p.login).follows ?? null, viewers:p => viewersStats(p)?.avg ?? null, votes:p => voteInfo(p).done});
}
function viewPropositions(){
  const d = S.data, all = d.propositions;
  const counts = {}; all.forEach(p => counts[p.statut || ""] = (counts[p.statut || ""]||0) + 1);
  const rows = propRows();
  const chip = (val, label, n) => `<button class="chip" data-pst="${esc(val)}" aria-pressed="${S.f.pst===val}">${esc(label)} <b>${n}</b></button>`;
  return `
  <h1>Propositions</h1>
  <p class="sub">${all.length} chaînes proposées · ${counts["Accepté"]||0} acceptées · ${(counts["Refusé"]||0)+(counts["Abandonnée"]||0)} refusées ou abandonnées${liveStamp()}</p>
  <div class="tools">
    <input class="search" id="pq" type="search" placeholder="Chercher une chaîne, un parrain, une étiquette…" value="${esc(S.f.pq)}" aria-label="Recherche">
    <button class="btn primary" id="addProp">Ajouter une proposition</button>
    <button class="btn" id="importOpen">Importer une liste</button>
    <button class="btn ghost" data-act="live" ${S.liveLoading?"disabled":""}>${S.liveLoading ? "Lecture Twitch…" : "Actualiser Twitch"}</button>
    <span class="spacer"></span>
    <button class="btn ghost" data-colmenu="propositions" aria-expanded="${S.colMenu === "propositions"}">Colonnes ▾</button>
    <button class="btn ghost" data-export="propositions" title="Fichier CSV qui s'ouvre dans Excel, avec les filtres actuels">Exporter (Excel)</button>
  </div>
  ${colMenu("propositions")}${importPanel()}
  <div class="tools chips">
    ${chip("__all","Toutes",all.length)}
    ${chip("","À trier",counts[""]||0)}
    ${d.settings.statutsProposition.map(s => chip(s, s, counts[s]||0)).join("")}
    ${tagFilter("ptagSel", S.f.ptag)}
  </div>
  ${vuesBar("propositions")}
  ${tableHtml("propositions", rows, S.f.psort)}${bulkBar("propositions")}`;
}

/* ----- Streamers de La Cabane ----- */
function membreRows(){
  const q = S.f.mq.trim().toLowerCase();
  let rows = S.data.membres.filter(m => {
    if(S.f.mst === "__actifs" && m.statut === "Parti") return false;
    if(S.f.mst === "Présent" && m.statut !== "Présent") return false;
    if(S.f.mst === "" && m.statut) return false;
    if(S.f.mst === "Parti" && m.statut !== "Parti") return false;
    if(S.f.mrole !== "__all" && (m.role||"") !== S.f.mrole) return false;
    if(S.f.mref && S.f.mref !== "__all" && (S.f.mref === "__sans" ? !!m.referent : m.referent !== S.f.mref)) return false;
    if(S.f.mtag && !hasTag(m, S.f.mtag)) return false;
    return !q || [m.login, m.discord, m.notes, m.referent, ...(m.tags || [])].some(x => String(x||"").toLowerCase().includes(q));
  });
  return sortRows(rows, S.f.msort, {follows:m => followsVus(m)?.v ?? null, prog:membreProg, anniv:m => annivInfo(m.premierStream)?.days ?? null, live:m => liveOf(m.login).live ? 0 : 1, last:m => { const x = lastStream(m); return x ? (x.live ? -1 : x.days) : null; }, viewers:m => viewersStats(m)?.avg ?? null});
}
function viewMembres(){
  const d = S.data, all = d.membres, ref = refSnapshot();
  const nPres = all.filter(m => m.statut === "Présent").length, nVide = all.filter(m => !m.statut).length, nParti = all.filter(m => m.statut === "Parti").length;
  const rows = membreRows();
  const chip = (val, label, n) => `<button class="chip" data-mst="${esc(val)}" aria-pressed="${S.f.mst===val}">${esc(label)} <b>${n}</b></button>`;
  const liveCount = all.filter(m => m.statut !== "Parti" && liveOf(m.login).live).length;
  return `
  <h1>Streamers de La Cabane</h1>
  <p class="sub">${nPres} présents confirmés · ${liveCount} en live maintenant${ref ? ` · progression comparée au relevé du ${fmtDate(ref.date)}` : ""}${liveStamp()}</p>
  <div class="tools">
    <input class="search" id="mq" type="search" placeholder="Chercher une chaîne, un pseudo Discord, une étiquette…" value="${esc(S.f.mq)}" aria-label="Recherche">
    <button class="btn primary" id="addMember">Ajouter une chaîne</button>
    <button class="btn ghost" data-act="live" ${S.liveLoading?"disabled":""}>${S.liveLoading ? "Lecture Twitch…" : "Actualiser Twitch"}</button>
    <button class="btn ghost" id="snapBtn" ${S.liveLoading?"disabled":""} title="Le robot fait un relevé matin, midi et soir ; ce bouton en force un maintenant">Relevé maintenant</button>
    <label class="f" style="flex-direction:row;align-items:center;gap:8px">Comparer à
      <select id="refSel">${`<option value="">Auto (≥ 7 jours)</option>` + d.snapshots.slice().reverse().map(s => `<option value="${esc(s.date)}" ${S.f.ref===s.date?"selected":""}>${fmtDate(s.date)}</option>`).join("")}</select>
    </label>
    <span class="spacer"></span>
    <button class="btn ghost" data-colmenu="membres" aria-expanded="${S.colMenu === "membres"}">Colonnes ▾</button>
    <button class="btn ghost" data-export="membres" title="Fichier CSV qui s'ouvre dans Excel, avec les filtres actuels">Exporter (Excel)</button>
  </div>
  ${colMenu("membres")}
  <div class="tools chips">
    ${chip("__actifs","Sans les partis",all.length-nParti)}${chip("Présent","Présents",nPres)}${chip("","À renseigner",nVide)}${chip("Parti","Partis",nParti)}
    <select id="roleSel" class="chip" aria-label="Rôle"><option value="__all">Tous les rôles</option>${d.settings.roles.map(r => `<option ${S.f.mrole===r?"selected":""}>${esc(r)}</option>`).join("")}</select>
    <select id="refFiltre" class="chip" aria-label="Référent"><option value="__all">Tous les référents</option><option value="__sans" ${S.f.mref==="__sans"?"selected":""}>Sans référent</option>${d.settings.staff.map(r => `<option value="${esc(r)}" ${S.f.mref===r?"selected":""}>${r === cfg.me ? "Mes streamers" : "Suivis par " + esc(r)}</option>`).join("")}</select>
    ${tagFilter("mtagSel", S.f.mtag)}
  </div>
  ${vuesBar("membres")}
  ${tableHtml("membres", rows, S.f.msort)}${bulkBar("membres")}`;
}

/* ----- Export CSV (s'ouvre dans Excel) ----- */
function exportCsv(view){
  const rows = view === "membres" ? membreRows() : propRows();
  const extra = view === "membres"
    ? [["Pseudo Discord", m => m.discord], ["Référent", m => m.referent], ["Départ", m => m.depart || ""], ["1er stream", m => m.premierStream || ""], ["Twitch", m => m.type === "partner" ? "partenaire" : m.type === "affiliate" ? "affilié" : ""], ["Notes", m => m.notes]]
    : [["Contact", p => p.contact], ["Date de revue", p => p.dateRevue || ""], ["Date d'invitation", p => p.dateInvitation || ""], ...S.data.settings.staff.map(s => [`Avis ${s}`, p => p.avis?.[s] || ""]), ["Commentaire", p => p.commentaire]];
  const cols = [["Chaîne", r => r.login], ["Lien", r => `https://twitch.tv/${r.login}`], ...COLS[view].map(c => [c.l, c.x]), ...extra]
    .filter((c, i, arr) => arr.findIndex(z => z[0] === c[0]) === i);
  // une cellule qui commence par = + - @ serait lue comme une formule par Excel (nom Discord piégé) : apostrophe devant, sauf un simple nombre
  const q = v => { let t = String(v ?? "").replace(/\r?\n/g, " "); if(/^[=+\-@\t\r]/.test(t) && !/^[+-]?\d+([.,]\d+)?$/.test(t)) t = "'" + t; return /[;"]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  const csv = "\ufeff" + [cols.map(c => q(c[0])).join(";"), ...rows.map(r => cols.map(c => q(c[1](r))).join(";"))].join("\r\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8"}));
  a.download = `la-cabane-${view === "membres" ? "streamers" : "propositions"}-${todayISO()}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast(`${rows.length} ligne${rows.length > 1 ? "s" : ""} exportée${rows.length > 1 ? "s" : ""}`);
}

/* ----- Import de propositions en lot ----- */
function parseImport(text){
  const d = S.data, seen = new Set(), res = {nouveaux:[], props:[], membres:[], corbeille:[], doublons:[], ignores:[]};
  for(const raw of text.split(/\r?\n/)){
    const line = raw.trim(); if(!line) continue;
    const found = [...line.matchAll(/twitch\.tv\/([A-Za-z0-9_]{2,25})/gi)].map(m => m[1].toLowerCase());
    let cands = found;
    if(!cands.length) cands = line.split(/[,;\t]+/).map(x => x.trim().replace(/^@/, "").toLowerCase()).filter(Boolean);
    const ok = cands.filter(x => /^[a-z0-9_]{2,25}$/.test(x));
    if(!ok.length){ res.ignores.push(line); continue; }
    if(!found.length && ok.length !== cands.length){ res.ignores.push(line); continue; }   // ligne de texte libre : on ne devine pas
    for(const l of ok){
      if(seen.has(l)){ res.doublons.push(l); continue; } seen.add(l);
      const p = d.propositions.find(x => x.login === l), m = d.membres.find(x => x.login === l), t = (d.corbeille || []).find(x => x.r.login === l);
      if(p) res.props.push({l, info:p.statut || "À trier"}); else if(m) res.membres.push({l, info:m.statut || "À renseigner"});
      else if(t) res.corbeille.push({l, info:"dans la corbeille"}); else res.nouveaux.push(l);
    }
  }
  return res;
}
function importPanel(){
  if(!S.importOpen) return "";
  const r = S.importRes;
  const list = (title, arr, fmt) => arr.length ? `<p class="meta" style="margin:6px 0 0"><b>${title} (${arr.length}) :</b> ${arr.map(fmt).join(", ")}</p>` : "";
  return `<section class="card" style="margin-bottom:14px"><h2>Importer une liste de propositions</h2>
    <p class="meta" style="margin-top:0">Une chaîne par ligne (pseudo, @pseudo ou lien twitch.tv), ou plusieurs séparées par des virgules. Les lignes de texte libre sont ignorées.</p>
    <label class="f full"><textarea id="importText" rows="6" placeholder="https://twitch.tv/exemple&#10;@autre_chaine&#10;troisieme, quatrieme">${esc(S.importText || "")}</textarea></label>
    <div class="grid" style="margin-top:10px">
      <label class="f">Proposées par<input id="importPar" value="${esc(S.importPar ?? cfg.me ?? "")}"></label>
      <label class="f">Statut de départ<select id="importSt">${["", ...S.data.settings.statutsProposition].map(x => `<option value="${esc(x)}" ${(S.importSt ?? "Proposition à faire") === x ? "selected" : ""}>${esc(x || "À trier")}</option>`).join("")}</select></label>
    </div>
    <div class="tools" style="margin:12px 0 0"><button class="btn" id="importAnalyse">Analyser</button>
      ${r && r.nouveaux.length ? `<button class="btn primary" id="importGo">Créer ${r.nouveaux.length} proposition${r.nouveaux.length > 1 ? "s" : ""}</button>` : ""}
      <button class="btn ghost" id="importClose">Fermer</button></div>
    ${r ? `${list("À créer", r.nouveaux, esc)}${list("Déjà en proposition", r.props, x => `${esc(x.l)} (${esc(x.info)})`)}${list("Déjà dans Streamers", r.membres, x => `${esc(x.l)} (${esc(x.info)})`)}${list("Dans la corbeille (à restaurer plutôt)", r.corbeille, x => esc(x.l))}${list("En double dans la liste", r.doublons, esc)}${list("Lignes ignorées", r.ignores, x => `« ${esc(x.slice(0,40))} »`)}${!r.nouveaux.length ? `<p class="meta">Rien de nouveau à créer.</p>` : ""}` : ""}
  </section>`;
}

/* ----- Anniversaires ----- */
function viewAnniv(){
  const list = S.data.membres.filter(m => m.statut !== "Parti" && m.premierStream).map(m => ({m, a:annivInfo(m.premierStream)})).sort((x,y) => x.a.days - y.a.days);
  const months = new Map();
  list.forEach(e => { const k = e.a.next.toLocaleDateString("fr-FR",{month:"long", year:"numeric"}); if(!months.has(k)) months.set(k, []); months.get(k).push(e); });
  const week = list.filter(e => e.a.days <= 7).length;
  const card = ({m,a}) => `
    <div class="ann ${a.days===0?"today":a.days<=7?"soon":""}" data-open="membres:${esc(m.id)}" tabindex="0" role="button">
      <div class="d"><b>${a.next.getDate()}</b><small>${a.next.toLocaleDateString("fr-FR",{month:"short"})}</small></div>
      <div><div class="login">${esc(m.login)}</div>
        <div class="muted">${a.years} ${a.years>1?"ans":"an"} de stream · ${a.days===0?"aujourd'hui !":a.days===1?"demain":"dans "+a.days+" jours"}</div>
        <div class="muted">${m.annivConfirme ? "✓ date confirmée" : "date à confirmer"}${m.annivCommentaire ? " · " + esc(m.annivCommentaire) : ""}</div></div>
    </div>`;
  return `<h1>Anniversaires de stream</h1>
    <p class="sub">${week ? `${week} anniversaire${week>1?"s":""} dans les 7 prochains jours` : "Aucun anniversaire dans les 7 prochains jours"} · ${list.length} dates connues</p>
    ${[...months].map(([k, es]) => `<h3 class="month">${esc(k)}</h3><div class="annivs">${es.map(card).join("")}</div>`).join("") || `<p class="empty">Ajoute une date de 1er stream sur une fiche pour la voir ici.</p>`}`;
}

