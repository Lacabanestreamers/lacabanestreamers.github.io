// La Cabane · page staff · Rendu des écrans : accueil, tableaux, vues enregistrées, tableau de bord, réglages.
// Scripts classiques chargés dans l'ordre par index.html : ils partagent les mêmes variables globales.
/* ============ Rendu ============ */
function render(){
  document.querySelectorAll("#nav button").forEach(b => b.setAttribute("aria-current", b.dataset.view === S.view ? "page" : "false"));
  const main = $("#main");
  if(!S.data && S.view === "aide"){ main.innerHTML = viewAide(); return; }
  if(!S.data && S.view !== "reglages"){ main.innerHTML = viewSetup(); renderDrawer(); return; }
  if(S.selView !== S.view){ S.sel.clear(); S.selView = S.view; }
  renderTicker();
  majLienBot();
  { const nb = document.getElementById("navNet"); if(nb){ try { const n = aNettoyer().slice(0, 4).reduce((a, [, l]) => a + l.length, 0); nb.textContent = n ? String(n) : ""; /* fiches incomplètes non comptées */ } catch { nb.textContent = ""; } } }
  const v = {accueil:viewAccueil, propositions:viewPropositions, membres:viewMembres, anniv:viewAnniv, stats:viewStats, agenda:viewAgenda, nettoyage:viewNettoyage, reglages:viewReglages, aide:viewAide}[S.view];
  const focus = document.activeElement && document.activeElement.id; const caret = document.activeElement && document.activeElement.selectionStart;
  // Les rafraîchissements automatiques (live, synchro) ne doivent pas effacer ce qu'on est en train de saisir
  const saisies = S.sansRestaurer ? [] : [...main.querySelectorAll("input[id], textarea[id], select[id]")].filter(el =>
    el.type === "checkbox" ? el.checked !== el.defaultChecked
    : el.tagName === "SELECT" ? [...el.options].some(o => o.selected !== o.defaultSelected)
    : el.value !== el.defaultValue).map(el => [el.id, el.type === "checkbox" ? el.checked : el.value]);
  S.sansRestaurer = false;
  main.innerHTML = tokenWarning() + v();
  for(const [id, val] of saisies){ const el = document.getElementById(id); if(!el) continue; if(el.type === "checkbox") el.checked = val; else el.value = val; }
  if(focus){ const el = document.getElementById(focus); if(el){ el.focus(); try { el.setSelectionRange(caret, caret); } catch {} } }
  if(!estAdmin()) main.querySelectorAll(ADMIN_SEL).forEach(el => { el.disabled = true; el.classList.add("adminonly"); el.title = "Réservé aux admins de la page (Réglages → Admins)"; });
  renderDrawer();
}

/* ----- Données mesurées par le robot ----- */
// viewers : échantillons horaires [["2026-09-25T20", 12], …] pris par le robot quand la chaîne est en live
function viewersStats(r, days = 30){
  const lim = new Date(Date.now() - days*864e5).toISOString().slice(0,10);
  const smp = (r.viewers || []).filter(x => x[0].slice(0,10) >= lim);
  if(!smp.length) return null;
  const sum = smp.reduce((a,x) => a + x[1], 0);
  return {avg:Math.round(sum / smp.length * 10) / 10, n:smp.length, days:new Set(smp.map(x => x[0].slice(0,10))).size, hours:smp.length};
}
const typeTag = r => r.introuvable ? `<span class="tag ko" title="Introuvable sur Twitch depuis le ${fmtDate(r.introuvable)}">introuvable</span>`
  : r.type === "partner" ? `<span class="tag par" title="Partenaire Twitch">partenaire</span>`
  : r.type === "affiliate" ? `<span class="tag aff" title="Affilié Twitch">affilié</span>` : "";
const viewersCell = r => { const v = viewersStats(r); return v ? `<span title="${v.n} mesures sur ${v.days} jours de live">${v.avg}</span>` : `<span class="muted" title="Pas encore de mesure : le robot en prend une par heure de live">–</span>`; };
function voteInfo(p){
  const staff = S.data.settings.staff;
  const kinds = staff.map(s => avisKind(p.avis?.[s]));
  const c = {pour:0, contre:0, neutre:0, autre:0}; kinds.forEach(k => k && c[k]++);
  const done = kinds.filter(Boolean).length, missing = staff.filter((s,i) => !kinds[i]);
  let suggestion = null;
  const tranche = c.pour + c.contre;
  if(done === staff.length && staff.length){
    suggestion = c.pour > c.contre ? "Accepté" : c.contre > c.pour ? "Refusé" : null;
  } else if(staff.length && c.pour > staff.length / 2) suggestion = "Accepté";
  else if(staff.length && c.contre > staff.length / 2) suggestion = "Refusé";
  return {c, done, total:staff.length, missing, suggestion, egalite: done === staff.length && tranche > 0 && c.pour === c.contre};
}
function evenementsRecents(days){
  const lim = new Date(Date.now() - days*864e5).toISOString().slice(0,10);
  const pal = (S.data?.paliers || []).filter(x => x.date >= lim).map(x => ({date:x.date, login:x.login, kind:"palier", palier:x.palier, masque:!!x.masque, txt:`${x.palier} follows`}));
  const ev = (S.data?.evenements || []).filter(x => x.date >= lim && (x.type === "affilie" || x.type === "partenaire"))
    .map(x => ({date:x.date, login:x.login, kind:x.type, type:x.type, masque:!!x.masque, txt:x.type === "affilie" ? "affilié Twitch" : "partenaire Twitch"}));
  return [...ev, ...pal].sort((a,b) => b.date.localeCompare(a.date));
}

/* ----- Outils communs aux tableaux ----- */
const CLOSED = ["Accepté","Refusé","Abandonnée"];
const cell = (label, html, cls="") => `<td data-l="${esc(label)}" class="${cls}${String(html).trim() === "" ? " e" : ""}">${html}</td>`;
function selHead(ids){
  S.visible = ids;
  const all = ids.length && ids.every(id => S.sel.has(id));
  return `<th class="sel"><input type="checkbox" data-selall aria-label="Tout sélectionner" ${all ? "checked" : ""}></th>`;
}
const selCell = id => `<td class="sel"><input type="checkbox" data-sel="${id}" aria-label="Sélectionner" ${S.sel.has(id) ? "checked" : ""}></td>`;
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
const followsCell = (f, manuel) => f != null ? f + (manuel ? ` <span class="muted" title="Saisie manuelle">✎</span>` : "") : `<span class="muted">${S.liveLoading ? "…" : "–"}</span>`;
function membreProg(m){ const ref = refSnapshot(), c = currentFollows(m), r = ref?.follows?.[m.login]; return c != null && r != null ? c - r : null; }
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
    {k:"follows", l:"Follows", s:"follows", n:1, td:m => followsCell(currentFollows(m), m.followsMode === "manuel"), x:m => currentFollows(m) ?? ""},
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
const VUE_CHAMPS = {propositions:["pq", "pst", "ptag", "psort"], membres:["mq", "mst", "mrole", "mtag", "msort", "ref"]};
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
      <tr data-open="${c}:${r.id}" class="${S.sel.has(r.id) ? "picked" : ""}">
        ${selCell(r.id)}
        ${cell("", `<span class="who">${avatarHtml(r.login)}<span class="login">${esc(r.login)}</span></span>${typeTag(r)}${aRappelEchu(r) ? `<span class="bell" title="Rappel à traiter">🔔</span>` : ""}${view === "propositions" && liveOf(r.login).live ? ` <span class="live">LIVE</span>` : ""}${view === "propositions" && STAG_STATUTS.includes(r.statut) && (depuisStatut(r) ?? 0) >= stagJours() ? `<span class="stag" title="Dans le statut « ${esc(r.statut)} » depuis ${depuisStatut(r)} jours">⏳ ${depuisStatut(r)} j</span>` : ""}`, "first")}
        ${cols.map(col => cell(col.l, col.td(r), col.n ? "num" : "")).join("")}
      </tr>`).join("") || `<tr><td colspan="${cols.length + 2}" class="empty">Aucune fiche ne correspond à ce filtre.</td></tr>`}</tbody>
  </table></div>`;
}
const tagFilter = (id, cur) => { const tags = allTags(); return tags.length ? `<select id="${id}" class="chip" aria-label="Étiquette"><option value="">Toutes les étiquettes</option>${tags.map(t => `<option ${cur === t ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>` : ""; };

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
    if(S.f.mtag && !hasTag(m, S.f.mtag)) return false;
    return !q || [m.login, m.discord, m.notes, m.referent, ...(m.tags || [])].some(x => String(x||"").toLowerCase().includes(q));
  });
  return sortRows(rows, S.f.msort, {follows:currentFollows, prog:membreProg, anniv:m => annivInfo(m.premierStream)?.days ?? null, live:m => liveOf(m.login).live ? 0 : 1, last:m => { const x = lastStream(m); return x ? (x.live ? -1 : x.days) : null; }, viewers:m => viewersStats(m)?.avg ?? null});
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
      <select id="refSel">${`<option value="">Auto (≥ 7 jours)</option>` + d.snapshots.slice().reverse().map(s => `<option value="${s.date}" ${S.f.ref===s.date?"selected":""}>${fmtDate(s.date)}</option>`).join("")}</select>
    </label>
    <span class="spacer"></span>
    <button class="btn ghost" data-colmenu="membres" aria-expanded="${S.colMenu === "membres"}">Colonnes ▾</button>
    <button class="btn ghost" data-export="membres" title="Fichier CSV qui s'ouvre dans Excel, avec les filtres actuels">Exporter (Excel)</button>
  </div>
  ${colMenu("membres")}
  <div class="tools chips">
    ${chip("__actifs","Sans les partis",all.length-nParti)}${chip("Présent","Présents",nPres)}${chip("","À renseigner",nVide)}${chip("Parti","Partis",nParti)}
    <select id="roleSel" class="chip" aria-label="Rôle"><option value="__all">Tous les rôles</option>${d.settings.roles.map(r => `<option ${S.f.mrole===r?"selected":""}>${esc(r)}</option>`).join("")}</select>
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
  const q = v => { const t = String(v ?? "").replace(/\r?\n/g, " "); return /[;"]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
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

/* ----- Accueil : ce qui attend le staff ----- */
function viewAccueil(){
  const d = S.data, me = cfg.me, LIM = 10;
  const actifs = d.membres.filter(m => m.statut !== "Parti");
  const card = (title, items, row, emptyTxt, more) => `<section class="card"><h2>${title}<span class="n ${items.length ? "" : "zero"}">${items.length}</span></h2>
    ${items.length ? `<ul class="todo">${items.slice(0, LIM).map(row).join("")}</ul>${items.length > LIM ? `<a href="#" class="more" ${more}>+ ${items.length - LIM} autres</a>` : ""}` : `<p class="none">${emptyTxt}</p>`}</section>`;
  const li = (c, r, right, wrap) => `<li data-open="${c}:${r.id}">${avatarHtml(r.login)}<span class="login">${esc(r.login)}</span><span class="r${wrap ? " w" : ""}">${right}</span></li>`;

  const avis = me ? d.propositions.filter(p => p.statut === "Attente staff" && !p.avis?.[me])
                      .sort((a,b) => String(a.dateProposition||"").localeCompare(String(b.dateProposition||""))) : [];
  const annivs = actifs.filter(m => m.premierStream).map(m => ({m, a:annivInfo(m.premierStream)})).filter(x => x.a.days <= 7).sort((x,y) => x.a.days - y.a.days);
  const inactifs = actifs.map(m => ({m, x:lastStream(m)})).filter(o => o.x && !o.x.live && o.x.days >= 30).sort((a,b) => b.x.days - a.x.days);
  const inconnus = actifs.filter(m => !lastStream(m)).length;
  const need = m => [!m.statut && "statut", !m.role && "rôle", !m.discord && "Discord", !m.premierStream && "1er stream"].filter(Boolean);
  const incomplets = actifs.filter(m => need(m).length).sort((a,b) => need(b).length - need(a).length);

  return `<h1>${me ? `Salut ${esc(me)} !` : "Accueil"}</h1>
  <p class="sub">Ce qui attend le staff aujourd'hui${d.robot?.lastDaily ? ` · dernier passage du robot le ${fmtDate(d.robot.lastDaily)}` : ""}</p>
  ${alerteRobot(d)}
  <div class="home">
    ${me ? card("Tes avis en attente", avis, p => li("propositions", p, `${pill(p.statut)}${p.proposePar ? " · " + esc(p.proposePar) : ""}`), "Aucune proposition « Attente staff » n'attend ton avis.", `data-goto="propositions" data-pst="Attente staff"`)
         : `<section class="card"><h2>Tes avis en attente</h2><p class="none">Choisis ton prénom dans <a href="#" data-goto="reglages">Réglages</a> pour voir les propositions qui attendent ton avis.</p></section>`}
    ${card("Anniversaires dans les 7 jours", annivs.map(x => x.m), m => { const a = annivInfo(m.premierStream); return li("membres", m, `${a.years} ${a.years>1?"ans":"an"} · <b class="${a.days===0?"up":""}">${a.days===0?"aujourd'hui":a.days===1?"demain":"dans "+a.days+" j"}</b>`); }, "Aucun anniversaire de stream cette semaine.", `data-goto="anniv"`)}
    ${card("Inactifs depuis 30 jours ou plus", inactifs.map(o => o.m), m => { const x = lastStream(m); return li("membres", m, `<span class="down">${x.days} j</span>`); }, "Tout le monde a streamé ce mois-ci." + (inconnus ? ` (${inconnus} chaîne${inconnus>1?"s":""} sans date connue)` : ""), `data-goto="membres"`)
       .replace("</section>", inconnus && inactifs.length ? `<p class="meta">${inconnus} chaîne${inconnus>1?"s":""} sans date de dernier stream connue.</p></section>` : "</section>")}
    ${(() => { const tous = rappelsEchus(), miens = tous.filter(x => x.rp.par === me), list = S.f.rpMiens && me ? miens : tous; const t = todayISO();
      return `<section class="card"><h2>Rappels du jour<span class="seg2" role="group" aria-label="Filtre">${me ? `<button data-rpf="0" aria-pressed="${!S.f.rpMiens}">Tous</button><button data-rpf="1" aria-pressed="${!!S.f.rpMiens}">Les miens (${miens.length})</button>` : ""}</span><span class="n ${list.length ? "" : "zero"}">${list.length}</span></h2>
        ${list.length ? `<ul class="todo">${list.slice(0, 12).map(({c, r, rp}) => { const j = joursAvant(rp.date);
          return `<li data-open="${c}:${r.id}">${avatarHtml(r.login)}<span style="min-width:0;flex:1"><span class="login">${esc(r.login)}</span><span class="muted" style="display:block;font-size:14px">${esc(rp.texte)}</span></span>
            <span class="r ${j < 0 ? "down" : "warn"}">${j < 0 ? `en retard de ${-j} j` : "aujourd'hui"}<br><span class="muted">${esc(rp.par || "?")}</span></span>
            <button type="button" class="btn ghost" data-rpdone="${rp.id}" data-rpc="${c}" data-rpid="${r.id}" style="padding:2px 10px">Fait</button></li>`; }).join("")}</ul>${list.length > 12 ? `<p class="meta">+ ${list.length - 12} autres</p>` : ""}`
          : `<p class="none">${S.f.rpMiens ? "Aucun de tes rappels n'est prévu aujourd'hui." : "Aucun rappel prévu aujourd'hui."}</p>`}</section>`; })()}
    ${(() => { const soon = jetonsSoon(d); return soon.length ? `<section class="card"><h2>Jetons à renouveler<span class="n">${soon.length}</span></h2><ul class="todo">${soon.map(x => `<li data-goto="reglages"><span class="login">${esc(x.nom)}</span><span class="r ${x.j <= 2 ? "down" : "warn"}">${x.j < 0 ? "expiré le " + fmtDate(x.expire) : x.j === 0 ? "expire aujourd'hui" : "dans " + x.j + " j · " + fmtDate(x.expire)}</span></li>`).join("")}</ul></section>` : ""; })()}
    ${card(`Propositions qui stagnent (${stagJours()} j et +)`, stagnantes().map(x => x.p), p => li("propositions", p, `${pill(p.statut)} · <b class="warn">${depuisStatut(p)} j</b>`), "Aucune proposition bloquée dans le même statut.", `data-goto="propositions"`)}
    ${(() => { const prox = agendaTri().avenir.filter(e => joursAvant(e.date) <= 7); return prox.length ? `<section class="card"><h2>Événements de la semaine<span class="n">${prox.length}</span></h2><ul class="todo">${prox.map(e => { const j = joursAvant(e.date);
      return `<li data-goto="agenda"><span class="login" style="flex:1">${esc(e.titre)}</span><span class="r"><b class="${j === 0 ? "up" : ""}">${j === 0 ? "aujourd'hui" : j === 1 ? "demain" : fmtDate(e.date)}</b>${e.heure ? " · " + esc(e.heure) : ""}</span></li>`; }).join("")}</ul></section>` : ""; })()}
    ${me ? (() => { const miens = d.propositions.filter(p => p.responsable === me && !CLOSED.includes(p.statut) && p.statut !== "Aucun contact").map(p => ({p, j:depuisStatut(p)})).sort((a, b) => (b.j ?? 0) - (a.j ?? 0));
      return card("Tes propositions en charge", miens.map(x => x.p), p => { const j = depuisStatut(p); return li("propositions", p, `${pill(p.statut)}${j != null ? ` · <b class="${j >= stagJours() ? "warn" : ""}">${j} j</b>` : ""}`); }, "Aucune proposition à ton nom (champ « Responsable » d'une proposition).", `data-goto="propositions"`); })() : ""}
    ${(() => { const etapes = etapesIntegration(), lim = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10);
      const enCours = etapes.length ? actifs.filter(m => m.arrivee && m.arrivee >= lim && !["Admin","Modo"].includes(m.role) && faitesIntegration(m) < etapes.length) : [];
      return card("Intégrations en cours", enCours, m => li("membres", m, `<b class="warn">${faitesIntegration(m)}/${etapes.length}</b>${m.referent ? " · " + esc(m.referent) : ` · <span class="down">sans référent</span>`}`), "Tous les nouveaux (60 derniers jours) sont intégrés.", `data-goto="membres"`); })()}
    ${suivisCard()}
    ${card("Réussites (14 jours)", evenementsRecents(14), x => { const m = S.data.membres.find(y => y.login === x.login) || {id:"", login:x.login};
        return `<li ${m.id ? `data-open="membres:${m.id}"` : ""}>${avatarHtml(x.login)}<span class="login">${esc(x.login)}</span><span class="r">${x.kind === "palier" ? "🚀" : "🎉"} <b class="up">${esc(x.txt)}</b> · ${fmtDate(x.date)}${x.masque ? ` · <span class="muted">masquée</span>` : ""}</span></li>`; },
      "Aucun palier ni affiliation ces 14 derniers jours.", `data-goto="membres"`)}
    ${(() => { const ko = [...d.membres.filter(m => m.statut !== "Parti"), ...d.propositions.filter(p => !CLOSED.includes(p.statut))].filter(r => r.introuvable);
      return ko.length ? card("Introuvables sur Twitch", ko, r => li(d.membres.includes(r) ? "membres" : "propositions", r, `${d.membres.includes(r) ? "" : "proposition · "}depuis le ${fmtDate(r.introuvable)}`), "", "") : ""; })()}
    ${card("Fiches à compléter", incomplets, m => li("membres", m, "manque : " + need(m).join(", "), true), "Toutes les fiches sont complètes.", `data-goto="membres" data-mst=""`)}
  </div>`;
}

// Charge des référents : nouveaux suivis (arrivés depuis 60 jours ou moins) et total des fiches suivies
function chargeReferents(){
  const d = S.data, now = Date.now();
  const actifs = d.membres.filter(m => m.statut !== "Parti" && !["Admin","Modo"].includes(m.role));
  return d.settings.staff.map(nom => {
    const siens = actifs.filter(m => m.referent === nom);
    const nouveaux = siens.filter(m => m.arrivee && (now - new Date(m.arrivee + "T12:00:00")) / 864e5 <= 60);
    return {nom, nouveaux:nouveaux.length, total:siens.length};
  }).sort((a, b) => a.nouveaux - b.nouveaux || a.total - b.total || a.nom.localeCompare(b.nom, "fr"));
}
function suggestionReferent(){ const c = chargeReferents(); return c.length ? c[0] : null; }
// Responsable d'une proposition (celui qui contacte le streamer) : répartition sur les propositions ouvertes
const ETAPES_DEFAUT = ["Ajouté au serveur Discord", "Rôle Discord donné", "Présenté dans le salon", "Règles et fonctionnement expliqués"];
const etapesIntegration = () => (S.data?.settings.integration ?? ETAPES_DEFAUT).map(x => String(x).replace(/\./g, "·")).filter(Boolean);
const faitesIntegration = m => etapesIntegration().filter(e => m.integ?.[e]).length;
function integrationBlock(m){
  const etapes = etapesIntegration(); if(!etapes.length || m.statut === "Parti") return "";
  const n = faitesIntegration(m);
  return `<fieldset class="integ"><legend>Intégration ${n}/${etapes.length}</legend>
    ${etapes.map(e => `<label><input type="checkbox" data-integ="${esc(e)}" ${m.integ?.[e] ? "checked" : ""}> ${esc(e)}${m.integ?.[e] ? ` <span class="muted">(${fmtDate(m.integ[e])})</span>` : ""}</label>`).join("")}
    <p class="meta" style="margin:6px 0 0">Étapes réglables dans Réglages → Listes.</p></fieldset>`;
}
function chargeResponsables(){
  const ouvertes = S.data.propositions.filter(p => !CLOSED.includes(p.statut) && !["Aucun contact"].includes(p.statut));
  return S.data.settings.staff.map(nom => ({nom, n:ouvertes.filter(p => p.responsable === nom).length})).sort((a, b) => a.n - b.n || a.nom.localeCompare(b.nom, "fr"));
}
function suivisCard(){
  const d = S.data, me = cfg.me, now = Date.now();
  const nouveaux = d.membres.filter(m => m.statut !== "Parti" && m.arrivee && !["Admin","Modo"].includes(m.role)).map(m => ({m, j:Math.floor((now - new Date(m.arrivee + "T12:00:00")) / 864e5)}));
  const aFaire = nouveaux.filter(({m, j}) => (!me || m.referent === me) && m.referent && ((j >= 7 && !m.suivi7) || (j >= 30 && !m.suivi30)))
    .map(({m, j}) => ({m, j, k:j >= 30 && !m.suivi30 ? 30 : 7}));
  const sansRef = nouveaux.filter(({m, j}) => j <= 30 && !m.referent);
  const items = [...aFaire.map(x => ({...x, t:"suivi"})), ...sansRef.map(x => ({...x, t:"ref"}))];
  const title = me ? "Tes suivis de nouveaux" : "Suivi des nouveaux";
  return `<section class="card"><h2>${title}<span class="n ${items.length ? "" : "zero"}">${items.length}</span></h2>${items.length
    ? `<ul class="todo">${items.slice(0, 10).map(x => `<li data-open="membres:${x.m.id}">${avatarHtml(x.m.login)}<span class="login">${esc(x.m.login)}</span><span class="r">${x.t === "suivi"
        ? `prendre des nouvelles <b class="warn">J+${x.k}</b>${me ? "" : " · " + esc(x.m.referent)}` : `<span class="warn">sans référent</span> · J+${x.j}`}</span></li>`).join("")}</ul>`
    : `<p class="none">${me ? "Aucune prise de nouvelles en attente pour toi." : "Rien en attente."}</p>`}</section>`;
}

/* ----- Tableau de bord ----- */
function lineChart(pts, opts = {}){
  if(pts.length < 2) return `<p class="none">Pas encore assez de données.</p>`;
  const W = 420, H = 170, L = 44, B = 22, T = 10, Rr = 10;
  const vs = pts.map(p => p.v), lo = opts.zero ? 0 : Math.min(...vs), hi = Math.max(...vs), span = hi - lo || 1;
  const X = i => L + i / (pts.length - 1) * (W - L - Rr), Y = v => T + (1 - (v - lo) / span) * (H - T - B);
  const line = pts.map((p,i) => `${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`).join(" ");
  const ticks = [lo, lo + span/2, hi].map(v => `<text x="${L-6}" y="${Y(v)+4}" text-anchor="end">${Math.round(v)}</text><line class="ax" x1="${L}" x2="${W-Rr}" y1="${Y(v)}" y2="${Y(v)}" stroke-dasharray="2 4"/>`).join("");
  const step = Math.max(1, Math.ceil(pts.length / 6));
  const labels = pts.map((p,i) => i % step === 0 || i === pts.length - 1 ? `<text x="${X(i)}" y="${H-5}" text-anchor="middle">${esc(p.l)}</text>` : "").join("");
  const resume = `${opts.label ? opts.label + " : " : ""}de ${Math.round(pts[0].v)} (${pts[0].l}) à ${Math.round(pts[pts.length - 1].v)} (${pts[pts.length - 1].l})`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(resume)}"><title>${esc(resume)}</title>${ticks}
    <polygon class="ar" points="${X(0)},${H-B} ${line} ${X(pts.length-1)},${H-B}"/><polyline class="ln" points="${line}"/>${labels}</svg>`;
}
function barChart(rows){
  if(!rows.length) return `<p class="none">Pas de données.</p>`;
  const W = 420, rowH = 26, H = rows.length * rowH + 6, L = 150, max = Math.max(...rows.map(r => r.v)) || 1;
  const resume = rows.map(r => `${r.l} : ${r.v}`).join(", ");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(resume)}"><title>${esc(resume)}</title>${rows.map((r,i) => { const w = (W - L - 40) * r.v / max;
    return `<text x="${L-8}" y="${i*rowH+18}" text-anchor="end">${esc(r.l)}</text><rect class="br" x="${L}" y="${i*rowH+6}" width="${Math.max(2,w).toFixed(1)}" height="16" rx="3" style="${r.c ? `fill:${r.c}` : ""}"/><text x="${L+w+6}" y="${i*rowH+18}">${r.v}</text>`; }).join("")}</svg>`;
}
/* ----- Carte récap du mois (image) ----- */
function recapMonths(){
  const out = [], now = new Date();
  for(let i = 0; i < 12; i++){ const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({k:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`, l:d.toLocaleDateString("fr-FR",{month:"long", year:"numeric"}) + (i === 0 ? " (en cours)" : "")}); }
  return out;
}
function recapStats(mk){
  const d = S.data, [y, mo] = mk.split("-").map(Number);
  const start = `${mk}-01`, end = jourLocal(new Date(y, mo, 0));
  const snaps = d.snapshots.filter(s => s.date <= end);
  const base = [...snaps].reverse().find(s => s.date < start) || snaps.find(s => s.date >= start);
  const last = [...snaps].reverse().find(s => s.date >= start);
  const gains = [];
  if(base && last && base !== last) for(const [l, v] of Object.entries(last.follows || {})) if(base.follows?.[l] != null) gains.push({login:l, g:v - base.follows[l], v});
  const actifs = new Set(d.membres.filter(m => m.statut !== "Parti").map(m => m.login));
  const g = gains.filter(x => actifs.has(x.login));
  return {
    label:new Date(y, mo-1, 1).toLocaleDateString("fr-FR", {month:"long", year:"numeric"}),
    nouveaux:d.membres.filter(m => (m.arrivee || "").startsWith(mk)).map(m => m.login),
    gagnes:g.reduce((a,x) => a + x.g, 0),
    top:g.filter(x => x.g > 0).sort((a,b) => b.g - a.g).slice(0, 5),
    paliers:(d.paliers || []).filter(x => x.date.startsWith(mk)),
    affi:(d.evenements || []).filter(x => x.date.startsWith(mk) && (x.type === "affilie" || x.type === "partenaire")),
    annivs:d.membres.filter(m => m.statut !== "Parti" && m.premierStream && m.premierStream.slice(5,7) === mk.slice(5,7) && m.premierStream.slice(0,4) < mk.slice(0,4))
      .map(m => ({login:m.login, ans:Number(mk.slice(0,4)) - Number(m.premierStream.slice(0,4))})),
    periode:base && last && base !== last ? `relevés du ${fmtDate(base.date)} au ${fmtDate(last.date)}` : "pas assez de relevés sur ce mois"
  };
}
async function drawRecap(mk){
  const st = recapStats(mk), W = 1080, H = 1350;
  try { await document.fonts.load("800 60px Orbitron"); await document.fonts.load("700 30px Rajdhani"); } catch {}
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d");
  const T = "Orbitron, sans-serif", B = "Rajdhani, 'Segoe UI', sans-serif";
  // fond
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, "#1A1142"); bg.addColorStop(1, "#0B0820"); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const glow = (x, y, r, c) => { const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, c); rg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = rg; g.fillRect(0, 0, W, H); };
  glow(120, 80, 520, "rgba(255,79,216,.28)"); glow(W - 80, H - 120, 600, "rgba(61,227,255,.20)");
  const clip = (t, n) => t.length > n ? t.slice(0, n - 1) + "…" : t;
  const text = (t, x, y, font, color, align = "left") => { g.font = font; g.fillStyle = color; g.textAlign = align; g.fillText(t, x, y); };
  const round = (x, y, w, h, r, fill, stroke) => { g.beginPath(); g.roundRect(x, y, w, h, r); if(fill){ g.fillStyle = fill; g.fill(); } if(stroke){ g.strokeStyle = stroke; g.lineWidth = 2; g.stroke(); } };
  // titre
  g.shadowColor = "rgba(255,79,216,.8)"; g.shadowBlur = 28; text("LA CABANE", 70, 150, `800 84px ${T}`, "#FFFFFF"); g.shadowBlur = 0;
  text(`Récap de ${st.label}`, 72, 210, `700 40px ${B}`, "#3DE3FF");
  // chiffres clés
  const kp = [["Nouveaux membres", st.nouveaux.length], ["Follows gagnés", (st.gagnes >= 0 ? "+" : "") + st.gagnes.toLocaleString("fr-FR")],
              ["Paliers de 50", st.paliers.length], ["Affiliations", st.affi.length]];
  kp.forEach(([l, v], i) => { const x = 70 + (i % 2) * 480, y = 260 + Math.floor(i / 2) * 170;
    round(x, y, 460, 150, 18, "rgba(32,25,81,.85)", "rgba(255,79,216,.45)");
    text(String(v), x + 30, y + 88, `800 58px ${T}`, "#FFFFFF"); text(l, x + 32, y + 128, `700 28px ${B}`, "#B7B0E6"); });
  // top progressions
  let y = 650;
  text("Meilleures progressions", 70, y, `800 34px ${T}`, "#FF4FD8"); y += 22;
  if(st.top.length){ const max = st.top[0].g;
    st.top.forEach((x, i) => { const yy = y + 20 + i * 62;
      text(`${i + 1}. ${clip(x.login, 22)}`, 70, yy + 34, `700 32px ${B}`, "#FFFFFF");
      round(520, yy + 12, 380 * x.g / max, 28, 8, i === 0 ? "#FF4FD8" : "#3DE3FF");
      text(`+${x.g}`, 1010, yy + 36, `700 30px ${B}`, "#5CF2A6", "right"); });
    y += 20 + st.top.length * 62 + 30;
  } else { text("Pas encore assez de relevés ce mois-ci.", 70, y + 50, `600 28px ${B}`, "#9C95CB"); y += 100; }
  // réussites
  const lignes = [];
  if(st.affi.length) lignes.push(["🎉 Affiliations", st.affi.map(x => x.login + (x.type === "partenaire" ? " (partenaire)" : "")).join(", ")]);
  if(st.paliers.length) lignes.push(["🚀 Paliers", st.paliers.map(x => `${x.login} ${x.palier}`).join(", ")]);
  if(st.nouveaux.length) lignes.push(["👋 Bienvenue", st.nouveaux.join(", ")]);
  if(st.annivs.length) lignes.push(["🎂 Anniversaires", st.annivs.map(x => `${x.login} (${x.ans} an${x.ans > 1 ? "s" : ""})`).join(", ")]);
  const wrap = (t, maxW, font) => { g.font = font; const words = t.split(" "); const out = []; let cur = "";
    for(const w of words){ const tst = cur ? cur + " " + w : w; if(g.measureText(tst).width > maxW && cur){ out.push(cur); cur = w; } else cur = tst; } if(cur) out.push(cur); return out; };
  for(const [titre, contenu] of lignes){
    if(y > H - 175) break;                                   // garder la place du pied de page
    text(titre, 70, y, `700 30px ${B}`, "#FFC857"); y += 38;
    const ls = wrap(contenu, 940, `600 27px ${B}`);
    const place = Math.max(1, Math.min(3, Math.floor((H - 105 - y) / 34)));
    const vis = ls.slice(0, place);
    if(ls.length > place) vis[vis.length - 1] = clip(vis[vis.length - 1], 60) + " …";
    for(const l of vis){ text(l, 70, y, `600 27px ${B}`, "#ECE9FF"); y += 34; }
    y += 14;
  }
  // pied
  text(st.periode, 70, H - 50, `600 22px ${B}`, "#7B769C");
  text(`généré le ${new Date().toLocaleDateString("fr-FR")}`, W - 70, H - 50, `600 22px ${B}`, "#7B769C", "right");
  return cv;
}
const lastSnapTotal = snaps => { const s = snaps[snaps.length-1]; return s ? Object.values(s.follows || {}).reduce((a,b) => a + (b||0), 0) : null; };
// Entonnoir des propositions, mois par mois (d'après la date de proposition)
function entonnoirCard(){
  const d = S.data, mois = [], now = new Date();
  for(let i = 5; i >= 0; i--){ const dt = new Date(now.getFullYear(), now.getMonth() - i, 1); mois.push({k:`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`, l:dt.toLocaleDateString("fr-FR", {month:"long"})}); }
  const lignes = [...d.propositions.map(p => ({m:(p.dateProposition || "").slice(0, 7), st:p.statut || "À trier", fin:["Accepté","Refusé","Abandonnée","Aucun contact"].includes(p.statut) ? (p.dateRevue || p.statutDepuis) : null, deb:p.dateProposition})),
    ...d.membres.filter(m => m.candidature?.dateProposition).map(m => ({m:m.candidature.dateProposition.slice(0, 7), st:"Accepté", fin:m.candidature.transfereLe, deb:m.candidature.dateProposition}))];
  const stat = k => { const l = lignes.filter(x => x.m === k), n = st => l.filter(x => st.includes(x.st)).length;
    const dl = l.filter(x => x.fin && x.deb).map(x => (new Date(x.fin) - new Date(x.deb)) / 864e5).filter(x => x >= 0);
    return {recues:l.length, acc:n(["Accepté"]), ref:n(["Refusé"]), aband:n(["Abandonnée","Aucun contact"]), cours:l.length - n(["Accepté","Refusé","Abandonnée","Aucun contact"]), delai:dl.length ? Math.round(dl.reduce((a, b) => a + b, 0) / dl.length) : null}; };
  const rows = mois.map(mo => ({...mo, ...stat(mo.k)})), tot = rows.reduce((a, r) => ({recues:a.recues + r.recues, acc:a.acc + r.acc, ref:a.ref + r.ref, aband:a.aband + r.aband, cours:a.cours + r.cours}), {recues:0, acc:0, ref:0, aband:0, cours:0});
  const max = Math.max(1, ...rows.map(r => r.recues));
  const barre = r => r.recues ? `<span style="display:flex;height:10px;border-radius:5px;overflow:hidden;width:${Math.round(r.recues / max * 100)}%;min-width:8px;background:var(--line)" aria-hidden="true">${[["acc","var(--ok)"],["ref","var(--ko)"],["aband","var(--grey)"],["cours","var(--cyan)"]].map(([k, c]) => r[k] ? `<span style="flex:${r[k]};background:${c}"></span>` : "").join("")}</span>` : "";
  const pct = (a, b) => b ? Math.round(a / b * 100) + " %" : "–";
  return `<section class="card" style="margin-bottom:14px"><h2>Entonnoir des propositions (6 mois)</h2>
    <p class="meta" style="margin-top:0">Sur ${tot.recues} proposition${tot.recues > 1 ? "s" : ""} : <b class="up">${tot.acc} acceptée${tot.acc > 1 ? "s" : ""}</b> (${pct(tot.acc, tot.recues)}), <b class="down">${tot.ref} refusée${tot.ref > 1 ? "s" : ""}</b>, ${tot.aband} abandonnée${tot.aband > 1 ? "s" : ""} ou sans contact, <b style="color:var(--cyan)">${tot.cours} en cours</b>. Taux d'acceptation des décisions : <b>${pct(tot.acc, tot.acc + tot.ref)}</b>.</p>
    <div style="overflow-x:auto" tabindex="0" role="region" aria-label="Tableau de l'entonnoir des propositions"><table class="tbl" style="width:100%;min-width:520px"><thead><tr><th scope="col">Mois</th><th scope="col">Reçues</th><th scope="col">Acceptées</th><th scope="col">Refusées</th><th scope="col">Abandon</th><th scope="col">En cours</th><th scope="col">Délai moyen</th><th scope="col" style="width:30%"><span class="sr">Répartition</span></th></tr></thead>
    <tbody>${rows.map(r => `<tr><td>${esc(r.l)}</td><td><b>${r.recues}</b></td><td class="up">${r.acc || ""}</td><td class="down">${r.ref || ""}</td><td>${r.aband || ""}</td><td>${r.cours || ""}</td><td>${r.delai != null ? r.delai + " j" : "–"}</td><td>${barre(r)}</td></tr>`).join("")}</tbody></table></div>
    <p class="meta">Chaque proposition compte dans le mois où elle a été proposée. Délai moyen : de la proposition à la décision (acceptée, refusée, abandonnée).</p>
  </section>`;
}
function viewStats(){
  const d = S.data, today = todayISO();
  const actifs = d.membres.filter(m => m.statut !== "Parti");
  // Membres présents à la fin de chaque mois (12 derniers mois), d'après arrivée / départ
  const months = []; const now = new Date();
  for(let i = 11; i >= 0; i--){ const dt = new Date(now.getFullYear(), now.getMonth() - i + 1, 0); months.push({end:jourLocal(dt), l:dt.toLocaleDateString("fr-FR",{month:"short"})}); }
  const presents = months.map(mo => ({l:mo.l, v:d.membres.filter(m => m.arrivee && m.arrivee <= mo.end && (!m.depart || m.depart > mo.end)).length}));
  // Follows cumulés (chaînes présentes dans chaque relevé)
  const snaps = d.snapshots.slice(-60);
  // Follows gagnés en cumul : somme des écarts entre deux relevés successifs, sur les chaînes présentes dans les deux
  let run = 0; const cumul = snaps.map((s, i) => { if(i){ const pv = snaps[i-1].follows || {}; for(const [l, v] of Object.entries(s.follows || {})) if(pv[l] != null && v != null) run += v - pv[l]; } return {l:fmtDate(s.date).slice(0,5), v:run}; });
  const totalNow = lastSnapTotal(snaps);
  const lastSnap = snaps[snaps.length-1], ref30 = d.snapshots.filter(s => s.date <= new Date(Date.now() - 30*864e5).toISOString().slice(0,10)).pop();
  let prog30 = null;
  if(lastSnap && ref30){ prog30 = 0; for(const [l, v] of Object.entries(lastSnap.follows||{})) if(ref30.follows?.[l] != null) prog30 += v - ref30.follows[l]; }
  // Propositions
  const byStatut = {}; d.propositions.forEach(p => byStatut[p.statut || "À trier"] = (byStatut[p.statut || "À trier"] || 0) + 1);
  const transferes = d.membres.filter(m => m.candidature);
  const acceptes = (byStatut["Accepté"] || 0) + transferes.length, refuses = (byStatut["Refusé"] || 0) + (byStatut["Abandonnée"] || 0);
  const taux = acceptes + refuses ? Math.round(acceptes / (acceptes + refuses) * 100) : null;
  const delais = [...transferes.map(m => [m.candidature.dateProposition, m.candidature.transfereLe]),
                  ...d.propositions.filter(p => ["Accepté","Refusé"].includes(p.statut)).map(p => [p.dateProposition, p.dateRevue])]
    .filter(([a,b]) => a && b).map(([a,b]) => (new Date(b) - new Date(a)) / 864e5).filter(x => x >= 0);
  const delai = delais.length ? Math.round(delais.reduce((a,b) => a+b, 0) / delais.length) : null;
  const colors = {"Accepté":"var(--ok)","Refusé":"var(--ko)","Abandonnée":"var(--grey)","Attente staff":"var(--warn)","Proposition en cours":"var(--cyan)","Proposition à faire":"#A99BFF","Aucun contact":"var(--grey)"};
  const vAll = actifs.map(m => viewersStats(m)?.avg).filter(v => v != null);
  const affi = actifs.filter(m => m.type === "affiliate").length, part = actifs.filter(m => m.type === "partner").length;
  const month = today.slice(0,7);
  const palMois = (d.paliers || []).filter(x => x.date.startsWith(month)).length;
  const arrivMois = d.membres.filter(m => (m.arrivee || "").startsWith(month)).length, departMois = d.membres.filter(m => (m.depart || "").startsWith(month)).length;
  const kpi = (label, val, sub) => `<div class="kpi"><span>${label}</span><b>${val}</b>${sub ? `<small>${sub}</small>` : ""}</div>`;
  return `<h1>Tableau de bord</h1><p class="sub">La Cabane dans son ensemble</p>
  <div class="kpis">
    ${kpi("Membres présents", actifs.filter(m => m.statut === "Présent").length, `${actifs.length} sans les partis · ${arrivMois} arrivé${arrivMois>1?"s":""}, ${departMois} départ${departMois>1?"s":""} ce mois`)}
    ${kpi("Follows cumulés", totalNow != null ? totalNow.toLocaleString("fr-FR") : "–", prog30 != null ? `<span class="${prog30>=0?"up":"down"}">${prog30>=0?"+":""}${prog30.toLocaleString("fr-FR")}</span> sur 30 jours` : "relevé du " + (lastSnap ? fmtDate(lastSnap.date) : "–"))}
    ${kpi("Affiliés / partenaires", `${affi} / ${part}`, `sur ${actifs.filter(m => m.type !== undefined).length} chaînes vérifiées`)}
    ${kpi("Viewers moyens", vAll.length ? (Math.round(vAll.reduce((a,b)=>a+b,0) / vAll.length * 10) / 10) : "–", vAll.length ? `moyenne de ${vAll.length} chaînes, 30 jours` : "mesures en cours")}
    ${kpi("Taux d'acceptation", taux != null ? taux + " %" : "–", `${acceptes} acceptées, ${refuses} refusées ou abandonnées`)}
    ${kpi("Délai de décision", delai != null ? delai + " j" : "–", delais.length ? `moyenne sur ${delais.length} décisions datées` : "pas encore de dates")}
    ${kpi("Paliers ce mois", palMois, "paliers de 50 follows franchis")}
  </div>
  ${entonnoirCard()}
  <section class="card" style="margin-bottom:14px"><h2>Carte récap du mois</h2>
    <div class="tools" style="margin:0 0 12px">
      <select id="recapMonth" aria-label="Mois">${recapMonths().map(m => `<option value="${m.k}" ${S.recapMonth === m.k ? "selected" : ""}>${esc(m.l)}</option>`).join("")}</select>
      <button class="btn primary" id="recapGo">Générer l'image</button>
      ${S.recapUrl ? `<a class="btn" href="${S.recapUrl}" download="la-cabane-recap-${esc(S.recapMonth)}.png">Télécharger</a><button class="btn" id="recapCopy">Copier (pour coller dans Discord)</button>` : ""}
    </div>
    ${S.recapUrl ? `<div class="recap"><img src="${S.recapUrl}" alt="Carte récap du mois" style="width:100%;border-radius:10px;border:1px solid var(--line)"><p class="meta">Format 1080 × 1350, lisible sur Discord et sur les réseaux. Les chiffres viennent des relevés du robot et des fiches.</p></div>` : `<p class="meta" style="margin:0">Choisis un mois puis génère l'image : nouveaux membres, follows gagnés, meilleures progressions, paliers, affiliations et anniversaires.</p>`}
  </section>
  <div class="charts">
    <section class="card"><h2>Membres présents (12 mois)</h2>${lineChart(presents, {zero:true, label:"Membres présents par mois"})}<p class="meta">D'après les dates d'arrivée et de départ renseignées.</p></section>
    <section class="card"><h2>Follows gagnés (cumul)</h2>${lineChart(cumul, {label:"Follows gagnés en cumul"})}<p class="meta">Cumul des follows gagnés par l'ensemble des chaînes depuis le premier relevé affiché (60 derniers).</p></section>
    <section class="card"><h2>Propositions par statut</h2>${barChart(Object.entries(byStatut).sort((a,b) => b[1]-a[1]).map(([l,v]) => ({l, v, c:colors[l]})))}${transferes.length ? `<p class="meta">+ ${transferes.length} transférée${transferes.length>1?"s":""} dans Streamers.</p>` : ""}</section>
    <section class="card"><h2>Raisons des départs</h2>${(() => { const partis = S.data.membres.filter(m => m.statut === "Parti");
      if(!partis.length) return `<p class="none">Aucun départ enregistré.</p>`;
      const cnt = {}; partis.forEach(m => { const k = m.raisonDepart || "Non précisée"; cnt[k] = (cnt[k] || 0) + 1; });
      const durees = partis.filter(m => m.arrivee && m.depart).map(m => (new Date(m.depart) - new Date(m.arrivee)) / 864e5).filter(x => x >= 0);
      const moy = durees.length ? Math.round(durees.reduce((a,b) => a+b, 0) / durees.length) : null;
      const annee = partis.filter(m => (m.depart || "") >= new Date(Date.now() - 365*864e5).toISOString().slice(0,10)).length;
      return barChart(Object.entries(cnt).sort((a,b) => b[1]-a[1]).map(([l,v]) => ({l, v, c:l === "Non précisée" ? "var(--grey)" : "var(--pink)"})))
        + `<p class="meta">${partis.length} départ${partis.length>1?"s":""} au total, dont ${annee} sur les 12 derniers mois${moy != null ? ` · durée moyenne passée dans La Cabane : ${moy >= 60 ? Math.round(moy/30) + " mois" : moy + " jours"}` : ""}.</p>`; })()}</section>
    <section class="card refs"><h2>Répartition des référents</h2>${(() => { const c = chargeReferents(), max = Math.max(1, ...c.map(x => x.nouveaux));
      const sans = S.data.membres.filter(m => m.statut !== "Parti" && !["Admin","Modo"].includes(m.role) && !m.referent && m.arrivee && (Date.now() - new Date(m.arrivee + "T12:00:00")) / 864e5 <= 60).length;
      return c.length ? c.map(x => `<div class="row"><span><b>${esc(x.nom)}</b></span><span class="bar" title="${x.nouveaux} nouveau(x) en suivi"><i style="width:${x.nouveaux / max * 100}%"></i></span><span class="muted">${x.nouveaux} nouveau${x.nouveaux > 1 ? "x" : ""} · ${x.total} au total</span></div>`).join("")
        + `<p class="meta">« Nouveaux » : arrivés depuis 60 jours ou moins (hors Admin et Modo).${sans ? ` <span class="warn">${sans} nouveau${sans > 1 ? "x" : ""} sans référent.</span>` : ""}</p>` : `<p class="none">Ajoute le staff dans Réglages.</p>`; })()}</section>
    <section class="card"><h2>Rôles</h2>${barChart(Object.entries(actifs.reduce((o,m) => (o[m.role || "Sans rôle"] = (o[m.role || "Sans rôle"]||0) + 1, o), {})).sort((a,b) => b[1]-a[1]).map(([l,v]) => ({l, v, c:"var(--cyan)"})))}</section>
  </div>`;
}

/* ----- Bandeau d'anniversaires ----- */
function recentPaliers(days){
  const lim = new Date(Date.now() - days*864e5).toISOString().slice(0,10);
  return (S.data?.paliers || []).filter(x => x.date >= lim).sort((a,b) => b.date.localeCompare(a.date) || b.palier - a.palier);
}
function renderTicker(){
  const el = $("#ticker"); if(!el) return;
  const list = (S.data?.membres || []).filter(m => m.statut !== "Parti" && m.premierStream)
    .map(m => ({m, a:annivInfo(m.premierStream)})).filter(x => x.a.days <= 7).sort((x,y) => x.a.days - y.a.days);
  const today = list.filter(x => x.a.days === 0);
  const shown = today.length ? today : list;
  const pal = recentPaliers(3);
  const aff = (S.data?.evenements || []).filter(x => (x.type === "affilie" || x.type === "partenaire") && x.date >= new Date(Date.now() - 3*864e5).toISOString().slice(0,10));
  const key = shown.map(x => x.m.id + x.a.days).join("|") + "#" + pal.map(x => x.login + x.palier).join("|") + "#" + aff.map(x => x.login + x.type).join("|");
  if(key === S.tickerKey) return; S.tickerKey = key;
  if(!shown.length && !pal.length && !aff.length){ el.classList.add("hidden"); el.innerHTML = ""; return; }
  const ans = n => `${n} ${n > 1 ? "ans" : "an"}`;
  let items = shown.map(({m,a}) => a.days === 0
    ? `<span class="it" data-open="membres:${m.id}">🎂 Joyeux anniversaire de stream à <b>${esc(m.login)}</b> : ${ans(a.years)} de live aujourd'hui !</span>`
    : `<span class="it" data-open="membres:${m.id}">🎂 <b>${esc(m.login)}</b> fêtera ses ${ans(a.years)} de stream ${a.days === 1 ? "demain" : `dans ${a.days} jours`} (${a.next.toLocaleDateString("fr-FR",{day:"numeric",month:"long"})})</span>`).join("");
  const palItems = pal.map(x => { const m = S.data.membres.find(y => y.login === x.login);
    return `<span class="it" ${m ? `data-open="membres:${m.id}"` : ""}>🚀 <b>${esc(x.login)}</b> a passé les ${x.palier} follows${x.date === todayISO() ? " aujourd'hui" : ""} !</span>`; }).join("");
  const affItems = aff.map(x => { const m = S.data.membres.find(y => y.login === x.login);
    return `<span class="it" ${m ? `data-open="membres:${m.id}"` : ""}>🎉 <b>${esc(x.login)}</b> est devenu ${x.type === "affilie" ? "affilié" : "partenaire"} Twitch !</span>`; }).join("");
  items = (today.length ? items + affItems + palItems : affItems + palItems + items);
  const len = items.replace(/<[^>]+>/g,"").length;
  el.innerHTML = `<div class="track" style="--dur:${Math.max(16, Math.round(len * 0.2))}s"><span>${items}</span><span class="dup" aria-hidden="true">${items}</span></div>`;
  el.classList.remove("hidden");
}

/* ----- Courbe des follows ----- */
function sparkline(m){
  const pts = S.data.snapshots.filter(s => s.follows?.[m.login] != null).map(s => ({d:s.date, v:s.follows[m.login]}));
  const cur = currentFollows(m), today = todayISO();
  if(cur != null && !pts.some(p => p.d === today)) pts.push({d:today, v:cur, now:true});
  if(pts.length < 2) return `<p class="meta">La courbe apparaîtra dès qu'il y aura deux relevés (le robot en fait matin, midi et soir).</p>`;
  const W = 320, H = 96, P = 8, B = 16;
  const t0 = new Date(pts[0].d).getTime(), t1 = new Date(pts[pts.length-1].d).getTime() || t0 + 1;
  const vs = pts.map(p => p.v), lo = Math.min(...vs), hi = Math.max(...vs), span = hi - lo || 1;
  const X = p => P + (t1 === t0 ? 0 : (new Date(p.d).getTime() - t0) / (t1 - t0)) * (W - 2*P);
  const Y = p => P + (1 - (p.v - lo) / span) * (H - P - B);
  const line = pts.map(p => `${X(p).toFixed(1)},${Y(p).toFixed(1)}`).join(" ");
  const diff = pts[pts.length-1].v - pts[0].v;
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="Évolution des follows : de ${pts[0].v} à ${pts[pts.length-1].v}"><title>Évolution des follows : de ${pts[0].v} à ${pts[pts.length-1].v}</title>
    <polygon class="area" points="${X(pts[0]).toFixed(1)},${H-B} ${line} ${X(pts[pts.length-1]).toFixed(1)},${H-B}"/>
    <polyline class="ln" points="${line}"/>
    ${pts.length <= 40 ? pts.map(p => `<circle class="${p.now ? "now" : ""}" cx="${X(p).toFixed(1)}" cy="${Y(p).toFixed(1)}" r="2.6"><title>${fmtDate(p.d)} : ${p.v}</title></circle>`).join("") : ""}
    <text x="${P}" y="${H-3}">${fmtDate(pts[0].d)}</text><text x="${W-P}" y="${H-3}" text-anchor="end">${fmtDate(pts[pts.length-1].d)}</text>
  </svg>
  <p class="meta" style="margin-top:4px">${pts[0].v} → <b>${pts[pts.length-1].v}</b> follows (<span class="${diff>0?"up":diff<0?"down":""}">${diff>0?"+":""}${diff}</span>) · min ${lo}, max ${hi} · ${pts.length} relevés</p>`;
}

/* ----- Historique d'une chaîne ----- */
function journalFor(login){
  const re = new RegExp(`(^|[^a-z0-9_])${login.replace(/[^a-z0-9_]/g,"")}([^a-z0-9_]|$)`, "i");
  return (S.data.journal || []).filter(j => re.test(j.txt)).slice(0, 12);
}
function historyBlock(r, c){
  const parts = [];
  if(c === "propositions"){
    (r.historique || []).slice().reverse().forEach(h => parts.push(`<li><span class="when">${fmtDate(h.le)}</span>candidature précédente : ${pill(h.statut)} ${h.proposePar ? "· proposée par " + esc(h.proposePar) : ""}${h.dateProposition ? " le " + fmtDate(h.dateProposition) : ""}${Object.keys(h.avis||{}).length ? "<br><span class='muted'>Avis : " + Object.entries(h.avis).map(([k,v]) => esc(k) + " " + esc(v)).join(", ") + "</span>" : ""}${h.motifRefus ? "<br><span class='muted'>Motif : " + esc(h.motifRefus) + "</span>" : ""}${h.commentaire ? "<br><span class='muted'>« " + esc(h.commentaire) + " »</span>" : ""}</li>`));
    const m = S.data.membres.find(x => x.login === r.login);
    if(m) parts.unshift(`<li><span class="when">La Cabane</span>${m.statut === "Parti" ? `a quitté La Cabane${m.depart ? " le " + fmtDate(m.depart) : ""}` : `membre${m.arrivee ? " depuis le " + fmtDate(m.arrivee) : ""}`} · <a href="#" data-open="membres:${m.id}">voir la fiche</a></li>`);
  } else {
    const cd = r.candidature;
    if(cd) parts.push(`<li><span class="when">${fmtDate(cd.transfereLe)}</span>transféré depuis les Propositions${cd.transferePar ? " par " + esc(cd.transferePar) : ""} · proposé${cd.proposePar ? " par " + esc(cd.proposePar) : ""}${cd.dateProposition ? " le " + fmtDate(cd.dateProposition) : ""}${Object.keys(cd.avis||{}).length ? "<br><span class='muted'>Avis : " + Object.entries(cd.avis).map(([k,v]) => esc(k) + " " + esc(v)).join(", ") + "</span>" : ""}${cd.commentaire ? "<br><span class='muted'>« " + esc(cd.commentaire) + " »</span>" : ""}${cd.contact ? "<br><span class='muted'>Contact : " + contactHtml(cd.contact) + "</span>" : ""}</li>`);
    const p = S.data.propositions.find(x => x.login === r.login);
    if(p) parts.push(`<li><span class="when">Proposition</span>${pill(p.statut)}${p.proposePar ? " · proposée par " + esc(p.proposePar) : ""}${p.dateProposition ? " le " + fmtDate(p.dateProposition) : ""} · <a href="#" data-open="propositions:${p.id}">voir</a></li>`);
  }
  journalFor(r.login).forEach(j => parts.push(`<li><span class="when">${fmtStamp(j.le)}</span><b>${esc(j.par)}</b> · ${esc(j.txt)}</li>`));
  return `<fieldset><legend>Historique</legend>${parts.length ? `<ul class="hist">${parts.join("")}</ul>` : `<p class="meta" style="margin-top:0">Aucun historique pour l'instant.</p>`}</fieldset>`;
}

/* ----- Anniversaires ----- */
function viewAnniv(){
  const list = S.data.membres.filter(m => m.statut !== "Parti" && m.premierStream).map(m => ({m, a:annivInfo(m.premierStream)})).sort((x,y) => x.a.days - y.a.days);
  const months = new Map();
  list.forEach(e => { const k = e.a.next.toLocaleDateString("fr-FR",{month:"long", year:"numeric"}); if(!months.has(k)) months.set(k, []); months.get(k).push(e); });
  const week = list.filter(e => e.a.days <= 7).length;
  const card = ({m,a}) => `
    <div class="ann ${a.days===0?"today":a.days<=7?"soon":""}" data-open="membres:${m.id}" tabindex="0" role="button">
      <div class="d"><b>${a.next.getDate()}</b><small>${a.next.toLocaleDateString("fr-FR",{month:"short"})}</small></div>
      <div><div class="login">${esc(m.login)}</div>
        <div class="muted">${a.years} ${a.years>1?"ans":"an"} de stream · ${a.days===0?"aujourd'hui !":a.days===1?"demain":"dans "+a.days+" jours"}</div>
        <div class="muted">${m.annivConfirme ? "✓ date confirmée" : "date à confirmer"}${m.annivCommentaire ? " · " + esc(m.annivCommentaire) : ""}</div></div>
    </div>`;
  return `<h1>Anniversaires de stream</h1>
    <p class="sub">${week ? `${week} anniversaire${week>1?"s":""} dans les 7 prochains jours` : "Aucun anniversaire dans les 7 prochains jours"} · ${list.length} dates connues</p>
    ${[...months].map(([k, es]) => `<h3 class="month">${esc(k)}</h3><div class="annivs">${es.map(card).join("")}</div>`).join("") || `<p class="empty">Ajoute une date de 1er stream sur une fiche pour la voir ici.</p>`}`;
}

/* ----- Réglages ----- */
function viewReglages(){
  const d = S.data;
  const conn = `
  <section class="panel" id="connexion">
    <h2>Connexion au fichier partagé</h2>
    <p>Les données vivent dans un dépôt GitHub privé. Chaque membre du staff saisit ici un jeton qui a accès à ce dépôt. Le jeton reste dans ce navigateur.</p>
    <div class="grid">
      <label class="f">Propriétaire du dépôt<input id="c_owner" value="${esc(cfg.owner)}" placeholder="Lacabanestreamers" autocomplete="off"></label>
      <label class="f">Dépôt privé<input id="c_repo" value="${esc(cfg.repo)}" placeholder="cabane" autocomplete="off"></label>
      <label class="f">Branche<input id="c_branch" value="${esc(cfg.branch)}"></label>
      <label class="f">Fichier<input id="c_path" value="${esc(cfg.path)}"></label>
      <label class="f full">Jeton GitHub<input id="c_token" type="password" value="${esc(cfg.token)}" placeholder="github_pat_…" autocomplete="off"></label>
      <label class="f">Je suis<select id="c_me"><option value="">— choisir —</option>${(d?.settings.staff || []).map(s => `<option ${cfg.me===s?"selected":""}>${esc(s)}</option>`).join("")}${cfg.me && d && !d.settings.staff.includes(cfg.me) ? `<option selected>${esc(cfg.me)}</option>` : ""}</select></label>
      <label class="check" style="align-self:end"><input type="checkbox" id="c_remember" ${cfg.remember?"checked":""}> Mémoriser le jeton sur cet appareil</label>
      <label class="f">Expiration du jeton (pour être prévenu)<input id="c_exp" type="date" value="${esc(cfg.tokenExpire || "")}"></label>
      <p class="meta" style="align-self:end;margin:0">GitHub ne donne pas cette date à la page : recopie celle affichée à la création du jeton.</p>
    </div>
    <div class="tools" style="margin:14px 0 0">
      <button class="btn primary" id="c_save">Se connecter</button>
      ${S.mode==="github" ? `<button class="btn ghost" id="c_pull">Recharger maintenant</button><button class="btn danger" id="c_logout">Se déconnecter</button>` : ""}
    </div>
    ${S.lastError ? `<p style="color:var(--ko);margin-top:10px">${esc(S.lastError)}</p>` : ""}
  </section>`;
  if(!d) return `<h1>Réglages</h1>${pli("connexion", conn, "", true)}${pli("fichier", localPanel())}`;
  const list = (id, label, arr, hint) => `<label class="f full">${label}<textarea id="${id}" rows="4">${esc(arr.join("\n"))}</textarea><span class="muted">${hint}</span></label>`;
  // résumé affiché à droite du titre quand le panneau est fermé
  const ko = santeKo(d), sv = d.robot?.derniereSauvegarde, adm = (d.settings.admins || []).length, nbJ = (d.settings.jetons || []).length, v = d.settings.vitrine || {};
  const pt = (cl, t) => `<span class="${cl}">●</span> ${t}`;
  const G = [
    ["compte", "👤", "Mon compte", "Propre à ce navigateur", [
      pli("connexion", conn, S.mode === "github" ? pt("up", S.horsLigne ? "hors ligne" : `connecté${cfg.me ? " · " + esc(cfg.me) : ""}`) : pt("down", "non connecté"), S.mode !== "github"),
      pli("twitch", `<section class="panel" id="twitch">
    <h2>Connexion Twitch</h2>
    <p>Donne le follow exact, le live en temps réel et la date de la dernière VOD, qui sert au nombre de jours depuis le dernier stream. Chaque membre du staff connecte son propre compte Twitch : aucune autorisation spéciale n'est demandée.</p>
    <div class="grid">
      <label class="f full">Client ID de l'application Twitch (partagé avec tout le staff)<input id="s_twcid" value="${esc(d.settings.twitchClientId || "")}" placeholder="ex. abcd1234efgh5678…" autocomplete="off"></label>
    </div>
    <p class="meta">URL de redirection à déclarer dans l'application Twitch : <b>${esc(redirectUri())}</b></p>
    <div class="tools" style="margin:14px 0 0">
      <button class="btn" id="s_twsave">Enregistrer le Client ID</button>
      ${tw?.token ? `<span class="up" style="align-self:center">● Twitch connecté</span><button class="btn danger" id="twOut">Déconnecter Twitch</button>`
                  : `<button class="btn primary" id="twIn" ${d.settings.twitchClientId ? "" : "disabled"}>Se connecter à Twitch</button>`}
    </div>
  </section>`, tw?.token ? pt("up", "connecté") : pt("muted", "non connecté")),
      pli("notifs", notifsPanel(), notifsOn() ? pt("up", "activées") : "désactivées"),
      pli("appli", appPanel(), estInstallee() ? pt("up", "installée") : S.copieLe ? "copie hors ligne à jour" : "")]],
    ["robot", "🤖", "Robot et santé", "Partagé par tout le staff", [
      pli("sante", santePanel(d), ko ? pt("down", `${ko} problème${ko > 1 ? "s" : ""}`) : pt("up", "tout va bien"), ko > 0),
      pli("robot", `<section class="panel" id="robot">
    <h2>Robot quotidien</h2>
    <p>Tourne toutes les heures sur GitHub : live, relevé des follows, dernière VOD et paliers matin (8 h), midi (12 h) et soir (19 h), annonces Discord.</p>
    ${(() => { const f = [...d.membres, ...d.propositions], vus = f.filter(r => r.type !== undefined);
      const aff = vus.filter(r => r.type === "affiliate").length, par = vus.filter(r => r.type === "partner").length, ids = f.filter(r => r.twitchId).length;
      return `<p class="meta" style="margin:0 0 6px">${vus.length ? `Statut Twitch connu pour ${vus.length} fiche${vus.length>1?"s":""} sur ${f.length} : <b>${aff}</b> affilié${aff>1?"s":""}, <b>${par}</b> partenaire${par>1?"s":""} · identifiant Twitch enregistré pour ${ids} fiche${ids>1?"s":""}.` : `<span class="warn">Le robot n'a encore enregistré aucun statut affilié / partenaire ni identifiant Twitch.</span> Vérifie que le dépôt cabane contient la dernière version de robot/robot.mjs et qu'un passage a eu lieu depuis (onglet Actions).`}</p>`; })()}
    <p class="meta" style="margin:0">${d.robot?.dernierReleve ? `Dernier relevé : ${fmtDate(d.robot.dernierReleve.slice(0,10))} (${esc(d.robot.dernierReleve.slice(11))})` : d.robot?.lastDaily ? `Dernier relevé : ${fmtDate(d.robot.lastDaily)}` : "Le robot n'a pas encore tourné."}${d.robot?.annivAnnonce ? ` · anniversaires vérifiés le ${fmtDate(d.robot.annivAnnonce)}` : ""}${(() => { const p = d.robot?.passage || d.robot?.derniereExecution; if(!p) return ""; const h = (Date.now() - new Date(p)) / 36e5;
      return ` · dernier passage ${fmtStamp(p)}${h > 2 ? ` <span class="warn">(en retard : la page le relance automatiquement)</span>` : ""}`; })()}</p>
  </section>`, (() => { const p = d.robot?.passage || d.robot?.derniereExecution; return p ? "passage " + fmtStamp(p) : ""; })()),
      pli("lienbot", botPanel(), /^https:/.test(lienBot() || "") ? "lien actif" : "aucun lien"),
      pli("jetons", jetonsPanel(d), nbJ ? `${nbJ} jeton${nbJ > 1 ? "s" : ""}${jetonsSoon(d).length ? ` · <span class="warn">${jetonsSoon(d).length} à renouveler</span>` : ""}` : "")]],
    ["equipe", "🧑‍🤝‍🧑", "Équipe", "Qui fait quoi", [
      pli("listes", `<section class="panel" id="listes">
    <h2>Listes</h2>
    <div class="grid">
      <label class="f full">Nom affiché<input id="s_nom" value="${esc(d.settings.nom||"")}"></label>
      ${list("s_staff","Staff qui donne son avis", d.settings.staff, "Un prénom par ligne. Chaque personne a sa case d'avis sur les propositions.")}
      ${list("s_statuts","Statuts de proposition", d.settings.statutsProposition, "Un statut par ligne.")}
      ${list("s_roles","Rôles", d.settings.roles, "Un rôle par ligne.")}
      ${list("s_liens","Sites de mesure d'audience", d.settings.liens, "Un lien par ligne.")}
      ${list("s_integ","Étapes d'intégration d'un nouveau membre", d.settings.integration ?? ETAPES_DEFAUT, "Une étape par ligne. Elles apparaissent en cases à cocher sur la fiche, et sur l'Accueil tant qu'un nouveau (60 derniers jours) n'a pas tout coché.")}
      <label class="f">Proposition « qui stagne » après (jours)<input id="s_stag" type="number" min="3" max="120" value="${stagJours()}"></label>
    </div>
    ${d.settings.liens.length ? `<p class="meta" style="margin:10px 0 4px">Sites de mesure d'audience :</p>` : ""}
    <div class="links">${d.settings.liens.map(u => safeUrl(u) ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\/(www\.)?/,"").replace(/\/$/,""))}</a>` : "").join("")}</div>
    <div class="tools" style="margin:14px 0 0"><button class="btn primary" id="s_save">Enregistrer les listes</button></div>
  </section>`, `${d.settings.staff.length} membre${d.settings.staff.length > 1 ? "s" : ""} du staff`),
      pli("admins", adminsPanel(d), adm ? `${adm} admin${adm > 1 ? "s" : ""}` : "tout le monde est admin"),
      pli("staffDiscord", staffDiscordPanel(d), ""),
      pli("modeles", modelesPanel(), `${modeles().length} modèle${modeles().length > 1 ? "s" : ""}`)]],
    ["vitrinegrp", "🌐", "Vitrine publique", "Ce que le public voit", [
      pli("vitrine", vitrinePanel(d), v.active ? pt("up", "publiée") : pt("muted", "désactivée")),
      pli("reussites", reussitesPanel(d), "")]],
    ["donnees", "🗄️", "Données", "Sauvegardes et historique", [
      pli("sauvegardes", sauvegardesPanel(d), sv ? "dernière : " + fmtDate(sv) : ""),
      pli("archives", archivePanel(d), ""),
      pli("corbeille", trashPanel(d), (d.corbeille || []).length ? `${d.corbeille.length} élément${d.corbeille.length > 1 ? "s" : ""}` : "vide"),
      pli("fichier", localPanel(), ""),
      pli("historique", `<section class="panel" id="historique">
    <h2>Historique des modifications</h2>
    <ul class="journal">${(d.journal||[]).slice(0,80).map(j => `<li><span class="muted">${fmtStamp(j.le)}</span><b>${esc(j.par)}</b><span>${esc(j.txt)}</span></li>`).join("")}</ul>
  </section>`, (d.journal || [])[0] ? "dernière : " + fmtStamp(d.journal[0].le) : "")]]
  ];
  return `<div class="regl-tete"><h1>Réglages</h1>
    <nav class="regl-nav" aria-label="Sections des réglages">${G.map(([k, ic, t]) => `<a href="#grp-${k}" data-reglgrp="${k}"><span aria-hidden="true">${ic}</span> ${t}</a>`).join("")}</nav>
    <div class="regl-tout"><button type="button" class="btn ghost" data-plitout="1">Tout ouvrir</button><button type="button" class="btn ghost" data-plitout="0">Tout fermer</button></div></div>
  <div class="regl-corps">${G.map(([k, ic, t, st, panneaux]) => `<section class="regl-grp" id="grp-${k}" aria-labelledby="grpt-${k}"><h2 class="grp-t" id="grpt-${k}"><span aria-hidden="true">${ic}</span> ${t}<small>${st}</small></h2>${panneaux.join("")}</section>`).join("")}</div>`;
}
// Panneaux repliables : l'état ouvert / fermé est retenu sur cet appareil
const PLI_KEY = "cabane.reglagesOuverts";
function pli(cle, html, resume = "", ouvertParDefaut = false){
  const m = /^\s*<section class="panel"([^>]*)>\s*<h2>([\s\S]*?)<\/h2>/.exec(html); if(!m) return html;
  const fin = html.lastIndexOf("</section>"), etat = store.get(PLI_KEY, {});
  const ouvert = cle in etat ? etat[cle] : ouvertParDefaut;
  const titre = m[2].replace(/\s*<span class="n"[^>]*>[\s\S]*?<\/span>/g, "").replace(/\s*\(\d+\)\s*$/, "");   // compteurs : déjà dans le résumé
  const attrs = m[1].includes("id=") ? m[1] : `${m[1]} id="${cle}"`;
  return `<details class="panel pli"${attrs} data-pli="${cle}" ${ouvert ? "open" : ""}><summary><h3 class="pli-t">${titre}</h3>${resume ? `<span class="pli-r">${resume}</span>` : ""}<span class="chev" aria-hidden="true"></span></summary>
    <div class="pli-c">${html.slice(m[0].length, fin)}</div></details>`;
}
function noterPli(cle, ouvert){ const e = store.get(PLI_KEY, {}); e[cle] = ouvert; store.set(PLI_KEY, e); }
// seul un clic de la personne est retenu (le navigateur signale aussi les panneaux ouverts à l'affichage)
document.addEventListener("click", e => { const sm = e.target.closest?.("details[data-pli] > summary"); if(sm) noterPli(sm.parentElement.dataset.pli, !sm.parentElement.open); });
// Ouvre un panneau des Réglages (depuis un autre écran) et y descend
function ouvrirReglage(id){
  if(S.view !== "reglages"){ S.view = "reglages"; S.drawer = null; render(); }
  const el = document.getElementById(id); if(!el) return;
  if(el.matches("details[data-pli]") && !el.open){ el.open = true; noterPli(el.dataset.pli, true); }
  el.scrollIntoView({block:"start"});
}
const santeKo = d => { const p = d.robot?.passage || d.robot?.derniereExecution, h = p ? (Date.now() - new Date(p)) / 36e5 : null;
  return (d.robot?.sante?.checks || []).filter(c => c.ok === false).length + (p && h <= 2 ? 0 : 1); };
function localPanel(){
  return `<section class="panel">
    <h2>Fichier JSON</h2>
    <p>Pour tester sans GitHub, ou pour garder une copie de sauvegarde. En mode fichier local, les modifications ne sont partagées avec personne tant que tu n'exportes pas.</p>
    <div class="tools" style="margin:0">
      <label class="btn">Ouvrir un fichier JSON<input type="file" id="fileIn" accept=".json,application/json" hidden></label>
      ${S.data ? `<button class="btn" id="exportBtn">Exporter une copie</button>` : ""}
    </div>
  </section>`;
}
function viewSetup(){
  return `<h1>Bienvenue</h1><p class="sub">Connecte-toi au fichier partagé du staff pour commencer. Première fois ici ? <a href="#" data-goto="aide">Lis l'aide</a> : tout y est expliqué pas à pas.</p>${viewReglages()}`;
}
