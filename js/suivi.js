// La Cabane · page staff · Suivi des streamers : pause, « mes streamers » (référent), acceptés en attente,
// repères chiffrés d'une proposition, courbe longue (archive), rappels qui se répètent.
// Scripts classiques chargés dans l'ordre par index.html : ils partagent les mêmes variables globales.

/* ============ Pause ============ */
// Un streamer « en pause » (vacances, examens, santé…) ne compte pas comme inactif jusqu'à la date prévue.
const enPause = m => !!m.pauseJusqua && m.pauseJusqua >= todayISO();
const pauseBadge = m => enPause(m) ? `<span class="tag pause" title="En pause jusqu'au ${fmtDate(m.pauseJusqua)}${m.pauseMotif ? " · " + esc(m.pauseMotif) : ""}">en pause</span>` : "";
// Revenus de pause depuis 7 jours ou moins (à saluer, à relancer)
function retoursDePause(){
  const t = todayISO(), lim = Commun.plusJours(t, -7);
  return S.data.membres.filter(m => m.statut !== "Parti" && m.pauseJusqua && m.pauseJusqua < t && m.pauseJusqua >= lim)
    .sort((a, b) => b.pauseJusqua.localeCompare(a.pauseJusqua));
}
function pauseBlock(m){
  if(m.statut === "Parti") return "";
  const p = enPause(m), fini = m.pauseJusqua && !p;
  return `<fieldset class="pausef"><legend>Pause</legend>
    <p class="meta" style="margin-top:0">${p ? `<b class="warn">En pause jusqu'au ${fmtDate(m.pauseJusqua)}</b> : pas compté comme inactif (Accueil, Nettoyage) d'ici là.`
      : fini ? `Revenu de pause le ${fmtDate(m.pauseJusqua)}.` : "Vacances, examens, santé… Un streamer en pause ne compte pas comme inactif jusqu'à la date indiquée."}</p>
    <div class="grid">${fld("En pause jusqu'au","pauseJusqua",m.pauseJusqua,"date")}${fld("Motif (facultatif)","pauseMotif",m.pauseMotif)}</div>
    ${m.pauseJusqua ? `<button type="button" class="btn ghost" data-finpause="${m.id}" style="margin-top:8px">${p ? "Terminer la pause maintenant" : "Effacer la pause"}</button>` : ""}
  </fieldset>`;
}

/* ============ Mes streamers (référent) ============ */
// Ce qui mérite l'attention du référent pour un streamer donné (le plus important d'abord)
function signauxSuivi(m){
  const out = [], x = lastStream(m), etapes = etapesIntegration(), n = faitesIntegration(m), t = todayISO();
  if(enPause(m)) out.push({p:5, h:`en pause jusqu'au ${fmtDate(m.pauseJusqua)}`, cls:"muted"});      // affiché en premier, mais pas une alerte
  else if(x && !x.live && x.days >= 14) out.push({p:3, h:`pas de live depuis ${x.days} j`, cls:x.days >= 30 ? "down" : "warn"});
  if(x?.live) out.push({p:0, h:"en live", cls:"up"});
  if(m.arrivee && etapes.length && n < etapes.length && Commun.joursEntre(m.arrivee, t) <= 60) out.push({p:2, h:`intégration ${n}/${etapes.length}`, cls:"warn"});
  const j = m.arrivee ? Commun.joursEntre(m.arrivee, t) : null;
  if(j != null && ((j >= 7 && !m.suivi7) || (j >= 30 && !m.suivi30)) && j <= 60) out.push({p:2, h:`nouvelles J+${j >= 30 && !m.suivi30 ? 30 : 7}`, cls:"warn"});
  if(aRappelEchu(m)) out.push({p:2, h:"🔔 rappel", cls:"warn"});
  const pr = membreProg(m); if(pr) out.push({p:0, h:`${pr > 0 ? "+" : ""}${pr} follows`, cls:pr > 0 ? "up" : "down"});
  return out.sort((a, b) => b.p - a.p);
}
const aSurveiller = x => x.s.some(y => y.p >= 2 && y.p < 5);
const suivisDe = nom => S.data.membres.filter(m => m.statut !== "Parti" && m.referent === nom)
  .map(m => ({m, s:signauxSuivi(m)})).sort((a, b) => (b.s[0]?.p ?? 0) - (a.s[0]?.p ?? 0) || a.m.login.localeCompare(b.m.login));
function mesStreamersCard(){
  const me = cfg.me; if(!me) return "";
  const l = suivisDe(me), alertes = l.filter(aSurveiller).length;
  return `<section class="card mesref"><h2>Tes streamers (référent)<span class="n ${alertes ? "" : "zero"}" title="${alertes} à surveiller">${l.length}</span></h2>
    ${l.length ? `<ul class="todo">${l.slice(0, 12).map(({m, s}) => `<li data-open="membres:${m.id}">${avatarHtml(m.login)}<span class="login">${esc(m.login)}</span>
      <span class="r w">${s.length ? s.slice(0, 2).map(x => `<span class="${x.cls}">${esc(x.h)}</span>`).join(" · ") : `<span class="muted">tout va bien</span>`}</span></li>`).join("")}</ul>
      ${l.length > 12 ? `<a href="#" class="more" data-goto="membres" data-mref="${esc(me)}">Voir les ${l.length}</a>` : `<a href="#" class="more" data-goto="membres" data-mref="${esc(me)}">Voir dans Streamers</a>`}`
      : `<p class="none">Tu n'es le référent de personne pour l'instant (champ « Référent staff » sur la fiche d'un streamer).</p>`}</section>`;
}
// Tableau de bord : les suivis de chaque membre du staff, dépliables
function suivisParStaffCard(){
  const staff = S.data.settings.staff; if(!staff.length) return "";
  const sans = S.data.membres.filter(m => m.statut !== "Parti" && !m.referent && !["Admin","Modo"].includes(m.role));
  return `<section class="card refstaff"><h2>Suivis par référent</h2>
    ${staff.map(nom => { const l = suivisDe(nom), a = l.filter(aSurveiller).length;
      return `<details ${nom === cfg.me ? "open" : ""}><summary><b>${esc(nom)}</b><span class="muted">${l.length} streamer${l.length > 1 ? "s" : ""}</span>${a ? `<span class="warn">${a} à surveiller</span>` : ""}</summary>
        ${l.length ? `<ul class="todo">${l.map(({m, s}) => `<li data-open="membres:${m.id}">${avatarHtml(m.login)}<span class="login">${esc(m.login)}</span><span class="r w">${s.slice(0, 2).map(x => `<span class="${x.cls}">${esc(x.h)}</span>`).join(" · ") || `<span class="muted">tout va bien</span>`}</span></li>`).join("")}</ul>` : `<p class="none">Personne.</p>`}</details>`; }).join("")}
    ${sans.length ? `<p class="meta"><span class="warn">${sans.length} streamer${sans.length > 1 ? "s" : ""} sans référent</span> (hors Admin et Modo) : <a href="#" data-goto="membres" data-mref="">les voir</a>.</p>` : ""}</section>`;
}

/* ============ Acceptés pas encore arrivés ============ */
function acceptesEnAttente(){
  const dansLaCabane = new Set(S.data.membres.map(m => m.login.toLowerCase()));
  return S.data.propositions.filter(p => p.statut === "Accepté" && !dansLaCabane.has(p.login.toLowerCase()))
    .map(p => { const d = p.dateInvitation || p.dateRevue || p.statutDepuis || p.dateProposition; return {p, j:d ? Commun.joursEntre(d.slice(0, 10), todayISO()) : null}; })
    .sort((a, b) => (b.j ?? 0) - (a.j ?? 0));
}
function acceptesCard(){
  const l = acceptesEnAttente(); if(!l.length) return "";
  return `<section class="card"><h2>Acceptés, pas encore arrivés<span class="n">${l.length}</span></h2><ul class="todo">${l.slice(0, 10).map(({p, j}) =>
    `<li data-open="propositions:${p.id}">${avatarHtml(p.login)}<span class="login">${esc(p.login)}</span><span class="r">${p.dateInvitation ? `invité le ${fmtDate(p.dateInvitation)}` : `<span class="warn">pas encore invité</span>`}${j != null ? ` · <b class="${j >= 14 ? "down" : j >= 7 ? "warn" : ""}">${j} j</b>` : ""}${p.responsable ? ` · ${esc(p.responsable)}` : ""}</span></li>`).join("")}</ul>
    <p class="meta">Ouvre la fiche puis « Transférer dans Streamers » quand la personne a rejoint le serveur.</p></section>`;
}

/* ============ Repères chiffrés d'une proposition ============ */
// Mesures du robot sur 30 jours : jours et heures de live, viewers moyens, follows gagnés (relevés « props »)
function reperesProp(p){
  const v = viewersStats(p), t = todayISO(), lim = Commun.plusJours(t, -30);
  const rel = (S.data.snapshots || []).filter(s => s.props?.[p.login] != null || s.follows?.[p.login] != null).map(s => ({d:s.date, v:s.props?.[p.login] ?? s.follows[p.login]}));
  const debut = rel.find(x => x.d >= lim) || null, fin = rel.at(-1) || null, actuel = liveOf(p.login).follows ?? fin?.v ?? null;
  const gain = debut && actuel != null && (fin?.d !== debut.d || liveOf(p.login).follows != null) ? actuel - debut.v : null;
  const x = lastStream(p);
  const cases = [
    ["Jours de live", v ? `${v.days}` : "0", "sur 30 jours (mesuré par le robot, une fois par heure)"],
    ["Heures de live", v ? `≈ ${v.hours}` : "0", "sur 30 jours"],
    ["Viewers moyens", v ? `${v.avg}` : "–", "pendant ses lives"],
    ["Follows", actuel != null ? `${actuel}` : "–", gain != null ? `${gain >= 0 ? "+" : ""}${gain} depuis le ${fmtDate(debut.d)}` : "évolution dès 2 relevés"],
    ["Dernier stream", x ? (x.live ? "en live" : x.days === 0 ? "aujourd'hui" : `il y a ${x.days} j`) : "–", x && !x.live ? x.src : ""]
  ];
  return `<fieldset class="reperes"><legend>Repères (30 jours)</legend><div class="rep-grid">${cases.map(([l, val, s]) => `<div><span class="l">${l}</span><b>${esc(val)}</b><span class="s">${esc(s)}</span></div>`).join("")}</div>
    <p class="meta" style="margin:6px 0 0">Des chiffres pour éclairer l'avis du staff, pas une note : une petite chaîne régulière vaut souvent mieux qu'une grosse chaîne absente.</p></fieldset>`;
}

/* ============ Courbe longue (archive) ============ */
// L'archive garde le premier relevé de chaque mois : assez pour la courbe depuis l'arrivée
async function chargerArchiveReleves(){
  if(S.archiveReleves || S.mode !== "github") return;
  S.archiveReleves = "chargement"; renderDrawer();
  try {
    const r = await fetch(`${dirUrl("archives")}/cabane-archive.json?ref=${encodeURIComponent(cfg.branch)}`, {headers:{...ghHeaders(), Accept:"application/vnd.github.raw+json"}, cache:"no-store"});
    S.archiveReleves = r.status === 404 ? [] : r.ok ? ((await r.json()).snapshots || []) : null;
    if(!r.ok && r.status !== 404) toast(`Archive illisible (${r.status}).`, true);
  } catch { S.archiveReleves = null; toast("Archive illisible (réseau).", true); }
  renderDrawer();
}
const relevesCourbe = () => S.courbeLongue && Array.isArray(S.archiveReleves) ? Commun.fusionnerReleves(S.archiveReleves, S.data.snapshots || []) : (S.data.snapshots || []);
function courbeBascule(){
  if(S.mode !== "github") return "";
  return `<div class="courbe-tg" role="group" aria-label="Période de la courbe"><button type="button" class="chip" data-courbe="0" aria-pressed="${!S.courbeLongue}">Relevés récents</button><button type="button" class="chip" data-courbe="1" aria-pressed="${!!S.courbeLongue}">Depuis le début${S.archiveReleves === "chargement" ? " …" : ""}</button></div>`;
}

/* ============ Rappels qui se répètent ============ */
const REPETITIONS = {"":"Une fois", "7j":"Chaque semaine", "1m":"Chaque mois", "3m":"Tous les 3 mois"};
// Prochaine date d'un rappel répété (toujours dans le futur)
function prochaineDate(date, rep){
  const t = todayISO(); let d = date;
  const plus = x => { if(rep === "7j") return Commun.plusJours(x, 7);
    const [y, m, j] = x.split("-").map(Number), k = rep === "3m" ? 3 : 1, dt = new Date(Date.UTC(y, m - 1 + k, 1)), dernier = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
    dt.setUTCDate(Math.min(j, dernier)); return dt.toISOString().slice(0, 10); };
  do d = plus(d); while(d <= t);
  return d;
}
