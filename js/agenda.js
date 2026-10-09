// La Cabane · page staff · Événements communautaires et séries récurrentes.
// Scripts classiques chargés dans l'ordre par index.html : ils partagent les mêmes variables globales.
/* ============ Événements communautaires ============ */
/* ============ Séries récurrentes ============ */
// Même calcul que le robot (robot/robot.mjs) : les deux créent les mêmes occurrences, avec le même identifiant.
// Séries : calculs communs avec le robot (commun.js)
const occurrencesSerie = Commun.occurrencesSerie, occDe = Commun.occurrence, plusJours = Commun.plusJours;
// Après modification d'une série : les occurrences à venir reprennent ses réglages, celles qui ne tombent plus
// sur le rythme (et sans inscrit) disparaissent, et celles de la fenêtre « X jours avant » sont créées.
function synchroSerie(d, se, t){
  d.agenda = d.agenda || [];
  const au = plusJours(t, Math.min(60, Math.max(0, Number(se.avance ?? 7)))), dates = se.actif === false ? null : occurrencesSerie(se, t, au);
  const champs = ["titre", "heure", "duree", "type", "description", "lien"];
  d.agenda = d.agenda.filter(e => !(e.serie === se.id && e.date >= t && dates && !dates.includes(e.date) && !(e.participants || []).length && e.date <= au));
  for(const e of d.agenda) if(e.serie === se.id && e.date >= t){ for(const k of champs) e[k] = se[k] ?? (k === "duree" ? 120 : ""); e.public = se.public !== false; e.discord = se.discord !== false; e.publierDiscord = !!se.publierDiscord; }
  for(const x of dates || []) if(!d.agenda.some(e => e.id === `${se.id}_${x}`)) d.agenda.push(occDe(se, x));
}
const RYTHMES = {hebdo:"Chaque semaine", "2sem":"Toutes les 2 semaines", mois:"Chaque mois, même date", moisPos:"Chaque mois, même jour de la semaine"};
function rythmeTxt(se){
  if(!se.debut) return RYTHMES[se.rythme] || "";
  const [y, m, d] = se.debut.split("-").map(Number), dt = new Date(y, m - 1, d), jour = dt.toLocaleDateString("fr-FR", {weekday:"long"});
  const h = se.heure ? ` à ${se.heure.replace(":", "h")}` : "";
  if(se.rythme === "hebdo") return `Chaque ${jour}${h}`;
  if(se.rythme === "2sem") return `Un ${jour} sur deux${h}`;
  if(se.rythme === "mois") return `Le ${d === 1 ? "1er" : d} de chaque mois${h}`;
  const pos = Math.ceil(d / 7); return `Le ${pos >= 5 ? "dernier" : ["1er", "2e", "3e", "4e"][pos - 1]} ${jour} du mois${h}`;
}
function serieForm(){
  const se = S.serieEdit; if(!se) return "";
  const t = todayISO(), proch = occurrencesSerie({...se, exclus:[]}, t, plusJours(t, 120)).slice(0, 4);
  return `<section class="evform" aria-label="${se.id ? "Modifier la série" : "Nouvelle série"}"><h2 style="margin:0 0 10px;font:700 17px Orbitron,sans-serif">${se.id ? "Modifier la série" : "Nouvelle série récurrente"}</h2>
    <div class="grid">
      <label class="f full">Titre<input id="sr_titre" value="${esc(se.titre || "")}" placeholder="Ex. Raid train du samedi" maxlength="80"></label>
      <label class="f">Rythme<select id="sr_rythme">${Object.entries(RYTHMES).map(([k, l]) => `<option value="${k}" ${k === (se.rythme || "hebdo") ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      <label class="f">Première date<input id="sr_debut" type="date" value="${esc(se.debut || "")}"></label>
      <label class="f">Heure<input id="sr_heure" type="time" value="${esc(se.heure || "")}"></label>
      <label class="f">Durée<select id="sr_duree">${DUREES.map(([v, l]) => `<option value="${v}" ${v === Number(se.duree || 120) ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      <label class="f">Type<select id="sr_type">${TYPES_EVT.map(x => `<option ${x === (se.type || "Raid train") ? "selected" : ""}>${x}</option>`).join("")}</select></label>
      <label class="f">Créer chaque occurrence (jours avant)<input id="sr_avance" type="number" min="1" max="60" value="${esc(se.avance ?? 7)}"></label>
      <label class="f">Jusqu'au (facultatif)<input id="sr_fin" type="date" value="${esc(se.fin || "")}"></label>
      <label class="f">Lien (facultatif)<input id="sr_lien" value="${esc(se.lien || "")}" placeholder="https://…"></label>
      <label class="f full">Description<textarea id="sr_desc" rows="3">${esc(se.description || "")}</textarea></label>
      <label class="check"><input type="checkbox" id="sr_public" ${se.public !== false ? "checked" : ""}> Afficher sur la vitrine publique</label>
      <label class="check"><input type="checkbox" id="sr_publier" ${se.publierDiscord ? "checked" : ""}> 📣 Partager chaque occurrence sur Discord</label>
      <label class="check"><input type="checkbox" id="sr_discord" ${se.discord !== false ? "checked" : ""}> Rappels Discord la veille et le jour même</label>
    </div>
    <p class="meta" style="margin:10px 0 0">${se.debut ? `${esc(rythmeTxt(se))} · prochaines dates : ${proch.length ? proch.map(x => fmtDate(x)).join(", ") : "aucune"}` : "Choisis la première date pour voir les suivantes."}</p>
    <div class="tools" style="margin:14px 0 0"><button class="btn primary" id="srSave">Enregistrer la série</button><button class="btn ghost" id="srCancel">Annuler</button></div>
  </section>`;
}
function lireSerieForm(){
  const se = S.serieEdit || {};
  return {...se, titre:$("#sr_titre").value.trim(), rythme:$("#sr_rythme").value, debut:$("#sr_debut").value, heure:$("#sr_heure").value, duree:Number($("#sr_duree").value) || 120,
    type:$("#sr_type").value, avance:Math.min(60, Math.max(1, Number($("#sr_avance").value) || 7)), fin:$("#sr_fin").value || "", lien:$("#sr_lien").value.trim(),
    description:$("#sr_desc").value.trim(), public:$("#sr_public").checked, publierDiscord:$("#sr_publier").checked, discord:$("#sr_discord").checked};
}
function seriesBloc(){
  const series = S.data.series || [], t = todayISO();
  return `<h2 style="font:700 17px Orbitron,sans-serif;margin:18px 0 10px">🔁 Séries récurrentes (${series.length}) <button class="btn ghost" id="srNew" style="margin-left:8px;padding:4px 12px;font-size:14px">Nouvelle série</button></h2>
  ${serieForm()}
  ${series.length ? `<div class="evs">${series.map(se => { const p = occurrencesSerie(se, t, plusJours(t, 400))[0];
    return `<article class="ev" style="grid-template-columns:1fr auto"><div style="min-width:0"><h3 style="margin:0">${esc(se.titre)}</h3>
      <span class="tg">${esc(se.type || "Autre")}</span>${se.actif === false ? ` <span class="tg" style="color:var(--warn);border-color:var(--warn)">en pause</span>` : ""}${se.publierDiscord ? ` <span class="tg" style="color:var(--pink);border-color:rgba(255,79,216,.4)">Discord</span>` : ""}
      <p class="meta" style="margin:6px 0 0">${esc(rythmeTxt(se))} · créée ${se.avance ?? 7} j avant${se.fin ? ` · jusqu'au ${fmtDate(se.fin)}` : ""}${p && se.actif !== false ? ` · prochaine : <b>${fmtDate(p)}</b>` : ""}${(se.exclus || []).filter(x => x >= t).length ? ` · ${(se.exclus || []).filter(x => x >= t).length} date(s) sautée(s)` : ""}</p></div>
      <div class="acts" style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn ghost" data-sredit="${se.id}">Modifier</button><button class="btn ghost" data-srpause="${se.id}">${se.actif === false ? "Reprendre" : "Pause"}</button><button class="btn danger" data-srdel="${se.id}">Supprimer</button></div>
    </article>`; }).join("")}</div>` : `<p class="meta">Un raid chaque samedi, une soirée le 1er vendredi du mois… Crée la série une fois : chaque occurrence apparaît toute seule dans la liste ci-dessous, quelques jours avant, puis se gère comme un événement normal (inscriptions, modification, suppression d'une seule date).</p>`}`;
}
const DUREES = [[30, "30 min"], [60, "1 h"], [90, "1 h 30"], [120, "2 h"], [180, "3 h"], [240, "4 h"], [360, "6 h"], [720, "12 h"]];
const TYPES_EVT = ["Raid train","Soirée jeux","Stream caritatif","Collab","Soirée Discord","Autre"];
function agendaTri(){
  const t = todayISO(), a = (S.data.agenda || []).slice();
  return {avenir:a.filter(e => e.date >= t).sort((x, y) => (x.date + (x.heure || "")).localeCompare(y.date + (y.heure || ""))),
          passes:a.filter(e => e.date < t).sort((x, y) => y.date.localeCompare(x.date))};
}
function evCarte(e, passe){
  const [y, m, d] = e.date.split("-").map(Number), dt = new Date(y, m - 1, d);
  const ppl = (e.participants || []).map(l => S.data.membres.find(x => x.login === l)).filter(Boolean);
  const j = joursAvant(e.date);
  return `<article class="ev ${passe ? "passe" : ""}">
    <div class="quand"><b>${d}</b><small>${dt.toLocaleDateString("fr-FR", {month:"short"})}</small><small>${esc(e.heure || "")}</small></div>
    <div style="min-width:0"><h3>${esc(e.titre)}</h3>
      <span class="tg">${esc(e.type || "Autre")}</span>${e.public ? ` <span class="tg" style="color:var(--ok);border-color:rgba(92,242,166,.4)">vitrine</span>` : ` <span class="tg" style="color:var(--muted);border-color:var(--line)">staff seulement</span>`}${e.publierDiscord ? ` <span class="tg" style="color:var(--pink);border-color:rgba(255,79,216,.4)">${e.publieDiscord ? "partagé sur Discord" : "partage Discord en cours…"}</span>` : ""}${e.discord ? ` <span class="tg" style="color:var(--pink);border-color:rgba(255,79,216,.4)">rappels Discord</span>` : ""}
      ${e.serie ? ` <span class="tg" title="${esc(rythmeTxt((S.data.series || []).find(x => x.id === e.serie) || {}))}">🔁 série</span>` : ""}${S.data.robot?.evtNatifs?.[e.id]?.id ? ` <span class="tg" style="color:var(--pink);border-color:rgba(255,79,216,.4)" title="Visible dans l'onglet Événements du serveur Discord ; « Intéressé » = inscrit">événement Discord</span>` : ""}
      ${!passe ? `<span class="meta" style="margin-left:6px">${j === 0 ? "aujourd'hui" : j === 1 ? "demain" : `dans ${j} jours`}</span>` : ""}
      ${e.description ? `<p class="desc">${esc(e.description)}</p>` : ""}
      ${safeUrl(e.lien || "") ? `<p style="margin:4px 0"><a href="${esc(e.lien)}" target="_blank" rel="noopener">${esc(e.lien.replace(/^https?:\/\/(www\.)?/, "").slice(0, 50))}</a></p>` : ""}
      ${ppl.length ? `<div class="ppl">${ppl.map(m => `<span class="who" title="${esc(m.login)}${(e.viaDiscord || []).includes(m.login) ? " · inscrit via Discord" : ""}">${avatarHtml(m.login)}<span class="muted" style="font-size:14px">${esc(m.login)}${(e.viaDiscord || []).includes(m.login) ? " ✅" : ""}</span></span>`).join("")}</div>` : `<p class="meta" style="margin:4px 0 0">Pas encore de participant.${!passe && e.publieDiscord?.msg ? " Les inscriptions se font par ✅ sous le message Discord ou sur la vitrine." : ""}</p>`}
      ${!passe && (e.discordInconnus || []).length ? `<div class="inconnus"><p class="meta" style="margin:6px 0 2px">✅ ou « Intéressé » sur Discord, compte non reconnu : à qui est-il ?</p>${e.discordInconnus.map(x => `<label class="meta" style="display:flex;gap:6px;align-items:center;margin:2px 0"><b style="color:var(--text)">${esc(x.nom)}</b><select data-evlier="${e.id}" data-did="${esc(x.id)}" data-dnom="${esc(x.nom)}"><option value="">Choisir le streamer…</option>${S.data.membres.filter(m => m.statut !== "Parti").sort((a, b) => a.login.localeCompare(b.login)).map(m => `<option value="${m.id}">${esc(m.login)}</option>`).join("")}</select></label>`).join("")}</div>` : ""}
      ${e.par ? `<p class="meta" style="margin:6px 0 0">Créé par ${esc(e.par)}</p>` : ""}</div>
    <div class="acts" style="display:flex;gap:6px;flex-wrap:wrap">${!passe && e.public !== false && S.data.settings.vitrine?.active ? `<button class="btn ghost" data-evlien="${e.id}" title="Lien direct vers cet événement sur la vitrine (inscription comprise)">🔗 Lien</button>` : ""}<button class="btn ghost" data-evedit="${e.id}">Modifier</button><button class="btn danger" data-evdel="${e.id}">Supprimer</button></div>
  </article>`;
}
function evForm(){
  const e = S.evEdit; if(!e) return "";
  return `<section class="evform" aria-label="${e.id ? "Modifier l'événement" : "Nouvel événement"}"><h2 style="margin:0 0 10px;font:700 17px Orbitron,sans-serif">${e.id ? "Modifier l'événement" : "Nouvel événement"}</h2>
    <div class="grid">
      <label class="f full">Titre<input id="ev_titre" value="${esc(e.titre || "")}" placeholder="Ex. Raid train du samedi soir" maxlength="80"></label>
      <label class="f">Date<input id="ev_date" type="date" value="${esc(e.date || "")}"></label>
      <label class="f">Heure<input id="ev_heure" type="time" value="${esc(e.heure || "")}"></label>
      <label class="f">Durée<select id="ev_duree">${DUREES.map(([v, l]) => `<option value="${v}" ${v === Number(e.duree || 120) ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      <label class="f">Type<select id="ev_type">${TYPES_EVT.map(t => `<option ${t === (e.type || "Raid train") ? "selected" : ""}>${t}</option>`).join("")}</select></label>
      <label class="f">Lien (événement Discord, page…, facultatif)<input id="ev_lien" value="${esc(e.lien || "")}" placeholder="https://…"></label>
      <label class="f full">Description<textarea id="ev_desc" rows="3" placeholder="Déroulé, règles, comment participer…">${esc(e.description || "")}</textarea></label>
      <label class="f full">Participants
        <span class="tagedit">${(e.participants || []).map(l => `<span class="tg">${esc(l)}<button type="button" data-evppl="${esc(l)}" aria-label="Retirer ${esc(l)}">×</button></span>`).join("")}
        <input id="ev_ppl" list="evPplList" placeholder="Pseudo d'un streamer puis Entrée…" autocomplete="off"></span></label>
      <datalist id="evPplList">${S.data.membres.filter(m => m.statut !== "Parti").map(m => `<option value="${esc(m.login)}">`).join("")}</datalist>
      <label class="check"><input type="checkbox" id="ev_public" ${e.public !== false ? "checked" : ""}> Afficher sur la vitrine publique</label>
      <label class="check" style="grid-column:1/-1"><input type="checkbox" id="ev_publier" ${e.publierDiscord ? "checked" : ""}> 📣 Partager sur Discord dès l'enregistrement (salon événements)${e.publieDiscord ? ` <span class="meta">· déjà publié le ${esc(new Date(e.publieDiscord.le).toLocaleString("fr-FR", {day:"numeric", month:"short", hour:"2-digit", minute:"2-digit"}))} ; si tu changes la date ou l'heure, un message de mise à jour partira</span>` : ""}</label>
      <label class="check"><input type="checkbox" id="ev_discord" ${e.discord !== false ? "checked" : ""}> Rappels Discord la veille à 18 h et le jour même à 9 h</label>
    </div>
    <div class="tools" style="margin:14px 0 0"><button class="btn primary" id="evSave">Enregistrer</button><button class="btn ghost" id="evCancel">Annuler</button></div>
  </section>`;
}
function viewAgenda(){
  const {avenir, passes} = agendaTri();
  return `<h1>Événements</h1>
  <p class="sub">Raids, soirées jeux, streams caritatifs… Les événements publics apparaissent sur la vitrine. Coche « Partager sur Discord » pour que le robot les publie tout de suite dans le salon événements (puis rappels la veille et le jour même). Les streamers s'inscrivent en réagissant ✅ sous ce message ou avec le bouton « Je participe » de la vitrine : le robot les ajoute à chaque passage (toutes les heures).</p>
  <div class="tools"><button class="btn primary" id="evNew">Créer un événement</button><button class="btn ghost" id="evRelever" title="Le robot relit les réactions Discord et les demandes de la vitrine (sinon il le fait toutes les heures)">Relever les inscriptions maintenant</button></div>
  ${S.data.robot?.inscriptions && !S.data.robot.inscriptions.ok ? `<p class="warnbox" role="alert" style="border:1px solid var(--warn,#ffb020);border-radius:10px;padding:10px 14px;margin:10px 0">⚠ Inscriptions : ${esc(S.data.robot.inscriptions.erreur || "problème inconnu")}</p>` : ""}
  ${evForm()}
  ${seriesBloc()}
  <h2 style="font:700 17px Orbitron,sans-serif;margin:18px 0 10px">À venir (${avenir.length})</h2>
  ${avenir.length ? `<div class="evs">${avenir.map(e => evCarte(e, false)).join("")}</div>` : `<p class="none">Aucun événement prévu.</p>`}
  ${passes.length ? `<h2 style="font:700 17px Orbitron,sans-serif;margin:24px 0 10px">Passés</h2><div class="evs">${passes.slice(0, 10).map(e => evCarte(e, true)).join("")}</div>` : ""}`;
}
function lireEvForm(){
  const e = S.evEdit || {};
  return {...e, titre:$("#ev_titre").value.trim(), date:$("#ev_date").value, heure:$("#ev_heure").value, type:$("#ev_type").value, lien:$("#ev_lien").value.trim(),
    description:$("#ev_desc").value.trim(), public:$("#ev_public").checked, discord:$("#ev_discord").checked, publierDiscord:$("#ev_publier").checked, duree:Number($("#ev_duree").value) || 120};
}
