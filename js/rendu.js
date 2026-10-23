// La Cabane · page staff · Rendu commun : aiguillage des écrans (render), mesures du robot, bandeau d'anniversaires, courbe des follows, historique d'une chaîne.
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
  { const nb = document.getElementById("navNet"); if(nb){ try { const n = aNettoyer().slice(0, 5).reduce((a, [, l]) => a + l.length, 0); nb.textContent = n ? String(n) : ""; /* fiches incomplètes non comptées */ } catch { nb.textContent = ""; } } }
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
  const pts = relevesCourbe().filter(s => s.follows?.[m.login] != null).map(s => ({d:s.date, v:s.follows[m.login]}));
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

