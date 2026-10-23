// La Cabane · page staff · Utilitaires, état de la page, opérations sur les données, annulation, notifications, application installable, stagnation, rappels, indicateur de synchro.
// Scripts classiques chargés dans l'ordre par index.html : ils partagent les mêmes variables globales.
"use strict";
/* ============ Utilitaires ============ */
const $ = s => document.querySelector(s);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid = p => p + Math.random().toString(16).slice(2, 10);
const jourLocal = iso => { const d = iso ? new Date(iso) : new Date(); return isNaN(d) ? String(iso || "").slice(0, 10) : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const todayISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,10); };
// échappé : la date vient des données (fichier ouvert, archive), jamais sûre pour innerHTML
const fmtDate = iso => { if(!iso) return ""; const [y,m,d] = String(iso).split("-"); return esc(`${d}/${m}/${y}`); };
const fmtStamp = iso => { if(!iso) return ""; const d = new Date(iso); return d.toLocaleDateString("fr-FR") + " " + d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}); };
const normLogin = v => String(v||"").trim().replace(/^@/,"").replace(/^https?:\/\/(www\.)?twitch\.tv\//i,"").replace(/[/?#].*$/,"").toLowerCase();
const safeUrl = u => /^https?:\/\//i.test(u) ? u : null;
// Site de gestion du bot Discord : adresse modifiable dans Réglages (elle change à chaque redémarrage du tunnel)
const LIEN_BOT_DEFAUT = "https://growth-compile-planes-velocity.trycloudflare.com/";
const lienBot = () => { const u = S.data?.settings?.lienBot; return u === undefined || u === null ? (S.data ? LIEN_BOT_DEFAUT : "") : u; };
function majLienBot(){ const a = document.getElementById("navBot"); if(!a) return; const u = lienBot(), ok = /^https:\/\/[^\s"'<>]+$/.test(u || "");
  a.classList.toggle("hidden", !ok); if(ok) a.href = u; else a.removeAttribute("href"); }
const store = {
  get(k, d){ try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k){ try { localStorage.removeItem(k); } catch {} }
};
function toast(msg, err, action){
  const el = document.createElement("div"); el.className = "toast" + (err ? " err" : ""); el.textContent = msg;
  if(action){ const b = document.createElement("button"); b.textContent = action.label; b.onclick = () => { el.remove(); action.fn(); }; el.appendChild(b); }
  $("#toastRoot").replaceChildren(el); setTimeout(() => el.remove(), action ? 9000 : err ? 6000 : 2600);
}
function b64decodeUtf8(b64){ const bin = atob(b64.replace(/\s/g,"")); return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))); }
function b64encodeUtf8(str){ const bytes = new TextEncoder().encode(str); let bin = ""; for(let i=0;i<bytes.length;i+=0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i,i+0x8000)); return btoa(bin); }

/* ============ État ============ */
const CFG_KEY = "cabane.cfg", LOCAL_KEY = "cabane.localdata";
let cfg = store.get(CFG_KEY, {owner:"Lacabanestreamers", repo:"cabane", branch:"main", path:"cabane-data.json", token:"", me:"", remember:true});
if(!cfg.token){ try { cfg.token = sessionStorage.getItem("cabane.token") || ""; } catch {} }
const S = {
  data:null, sha:null, mode:"none",          // none | github | local
  pending:[], saving:false, dirtyLocal:false,
  live:{}, liveLoading:false, avatars:{},
  view:"accueil", drawer:null, sel:new Set(), selView:"", visible:[], tickerKey:"",
  f:{ ptag:"", mtag:"", pq:"", pst:"__all", msort:["login",1], psort:["login",1], mq:"", mst:"__actifs", mrole:"__all", mref:"__all", ref:"" }
};

/* ============ Modèle : opérations ============ */
function setPath(obj, path, val){
  const ks = path.split("."); let o = obj;
  for(let i=0;i<ks.length-1;i++){ if(typeof o[ks[i]] !== "object" || o[ks[i]] === null) o[ks[i]] = {}; o = o[ks[i]]; }
  const last = ks[ks.length-1];
  if(val === undefined || val === "") { if(ks.length > 1) delete o[last]; else o[last] = val === undefined ? null : ""; }
  else o[last] = val;
}
function getPath(obj, path){ let o = obj; for(const k of path.split(".")){ if(o == null) return undefined; o = o[k]; } return o; }
const memeValeur = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
function applyOp(d, op){
  d.journal = d.journal || []; d.snapshots = d.snapshots || [];
  switch(op.t){
    case "patch": { const r = (d[op.c]||[]).find(x => x.id === op.id); if(!r) return;
      let p = op.p;
      // À l'enregistrement : si quelqu'un d'autre a changé ce champ entre-temps, on ne l'écrase pas sans demander
      if(op.verif && op.base){ p = {};
        for(const [k, v] of Object.entries(op.p)){ const cur = getPath(r, k);
          if(k in op.base && !memeValeur(cur, op.base[k]) && !memeValeur(cur, v)){ (S.conflits = S.conflits || []).push({c:op.c, id:op.id, k, mien:v, sien:cur ?? null, par:r.maj?.par || "quelqu'un", login:r.login, notify:op.notify}); }
          else p[k] = v; }
        if(!Object.keys(p).length) return; }
      if("statut" in p && (p.statut || "") !== (r.statut || "")) r.statutDepuis = jourLocal(op.le);
      for(const [k,v] of Object.entries(p)) setPath(r, k, v); if(!op.auto) r.maj = {par:op.par, le:op.le}; break; }
    case "add": if(!d[op.c].some(x => x.id === op.r.id)){ const r = JSON.parse(JSON.stringify(op.r)); if(!r.statutDepuis) r.statutDepuis = jourLocal(op.le); d[op.c].push(r); } break;
    case "del": { const i = d[op.c].findIndex(x => x.id === op.id); if(i < 0) break;
      const [r] = d[op.c].splice(i, 1);
      if(!op.noTrash){ d.corbeille = d.corbeille || []; d.corbeille.push({c:op.c, r, le:op.le, par:op.par}); }
      break; }
    case "restore": { d.corbeille = d.corbeille || []; const i = d.corbeille.findIndex(x => x.r.id === op.id); if(i < 0) break;
      const [e] = d.corbeille.splice(i, 1); if(!d[e.c].some(x => x.id === e.r.id)) d[e.c].push(e.r); break; }
    case "purge": d.corbeille = (d.corbeille || []).filter(x => x.r.id !== op.id); break;
    case "rappelAdd": { const r = (d[op.c]||[]).find(x => x.id === op.id); if(!r) break; r.rappels = r.rappels || [];
      if(!r.rappels.some(x => x.id === op.rp.id)) r.rappels.push({...op.rp, par:op.par, cree:op.le}); break; }
    case "agendaSet": { d.agenda = d.agenda || []; const i = d.agenda.findIndex(x => x.id === op.ev.id);
      if(op.rinclure && op.ev.serie){ const se = (d.series || []).find(x => x.id === op.ev.serie); if(se?.exclus) se.exclus = se.exclus.filter(x => x !== op.ev.date); }
      if(op.remplace){ if(i < 0) d.agenda.push(JSON.parse(JSON.stringify(op.ev))); else d.agenda[i] = JSON.parse(JSON.stringify(op.ev)); break; }
      if(i < 0){ if(op.edition) break; d.agenda.push(op.ev); break; }          // modifié ici mais supprimé entre-temps par quelqu'un d'autre : on ne le recrée pas
      const cur = d.agenda[i], ev = {...op.ev};
      // participants : on n'applique que ce que la personne a changé dans le formulaire,
      // pour ne pas effacer les inscriptions arrivées (Discord, vitrine) pendant qu'elle le remplissait
      if(op.pplAvant){ const av = op.pplAvant, nv = ev.participants || [];
        ev.participants = [...(cur.participants || []).filter(l => !(av.includes(l) && !nv.includes(l))), ...nv.filter(l => !av.includes(l) && !(cur.participants || []).includes(l))]; }
      d.agenda[i] = {...cur, ...ev}; break; }
    case "agendaPpl": { const e = (d.agenda || []).find(x => x.id === op.id); if(!e) break; e.participants = e.participants || [];
      if(op.add && !e.participants.includes(op.add)) e.participants.push(op.add);
      if(op.inconnu && e.discordInconnus) e.discordInconnus = e.discordInconnus.filter(x => x.id !== op.inconnu); break; }
    case "reussiteMasque": { const l = op.kind === "palier" ? (d.paliers || []).filter(x => x.login === op.login && x.palier === op.palier) : (d.evenements || []).filter(x => x.login === op.login && x.type === op.type && x.date === op.date);
      for(const x of l){ if(op.masque) x.masque = true; else delete x.masque; } break; }
    case "agendaDel": { const e = (d.agenda || []).find(x => x.id === op.id);
      // une occurrence de série supprimée est écartée : le robot ne la recréera pas
      if(e?.serie && !op.sansExclure){ const se = (d.series || []).find(x => x.id === e.serie); if(se && !(se.exclus || []).includes(e.date)) se.exclus = [...(se.exclus || []), e.date]; }
      d.agenda = (d.agenda || []).filter(x => x.id !== op.id); break; }
    case "serieSet": { d.series = d.series || []; const i = d.series.findIndex(x => x.id === op.serie.id);
      if(i < 0 && !op.serie.debut) break;           // pause / reprise d'une série supprimée entre-temps
      const se = i < 0 ? op.serie : {...d.series[i], ...op.serie}; if(i < 0) d.series.push(se); else d.series[i] = se;
      synchroSerie(d, se, todayISO()); break; }
    case "serieDel": { const t = todayISO();
      d.series = (d.series || []).filter(x => x.id !== op.id);
      d.agenda = (d.agenda || []).filter(e => !(e.serie === op.id && e.date >= t)); break; }
    case "rappelDel": { const r = (d[op.c]||[]).find(x => x.id === op.id); if(r?.rappels) r.rappels = r.rappels.filter(x => x.id !== op.rid); break; }
    case "snapshot": d.snapshots = Commun.ajouterReleve(d.snapshots || [], op.s); break;   // même plafond que le robot (400)
    case "vues": d.settings.vues = d.settings.vues || {}; if(op.liste.length) d.settings.vues[op.qui] = op.liste; else delete d.settings.vues[op.qui]; break;
    case "vuesCommunes": d.settings.vuesCommunes = op.liste; break;
    case "settings": for(const [k, v] of Object.entries(op.p)){ const ks = k.split("."); let o = d.settings;
        for(const x of ks.slice(0, -1)){ if(typeof o[x] !== "object" || o[x] === null) o[x] = {}; o = o[x]; } o[ks[ks.length - 1]] = v; } break;   // « vitrine.titre » : seul ce champ change (pas d'écrasement des réglages voisins)
    case "note": break;
  }
  if(d.corbeille?.length){ const lim = new Date(Date.now() - 30*864e5).toISOString(); d.corbeille = d.corbeille.filter(x => (x.le || "") >= lim); }
  if(op.txt){ d.journal.unshift({le:op.le, par:op.par, txt:op.txt}); if(d.journal.length > 400) d.journal.length = 400; }
}
function dispatch(op){
  if(!S.data) return;
  op.le = new Date().toISOString(); op.par = cfg.me || "?";
  // valeurs avant modification : servent à détecter une modification simultanée et à « Annuler »
  if(op.t === "patch" && !op.auto && !op.force){ const r = (S.data[op.c] || []).find(x => x.id === op.id); if(r) op.base = Object.fromEntries(Object.keys(op.p).map(k => [k, getPath(r, k) ?? null])); }
  if(!op.auto && !op.noUndo) noterAnnulation(op);
  applyOp(S.data, op);
  if(S.mode === "github"){ S.pending.push(op); scheduleSave(); }
  else { S.dirtyLocal = true; store.set(LOCAL_KEY, S.data); }
  if(S.lot) return;                       // plusieurs opérations d'un coup : un seul affichage à la fin
  updateSync(); render();
}
const patch = (c, id, p, txt) => dispatch({t:"patch", c, id, p, txt});

// Chaque champ d'une fiche retient la fiche sur laquelle on a commencé à le modifier
document.addEventListener("focusin", e => { const t = e.target; if(t.dataset?.k && t.closest?.("#drawerRoot") && S.drawer) t.dataset.fiche = S.drawer.c + S.drawer.id; });
// Avatar introuvable en petite taille : on retente l'image d'origine (une seule fois)
document.addEventListener("error", e => { const im = e.target; if(im?.tagName === "IMG" && im.dataset.repli && /^https:\/\//.test(im.dataset.repli)){ const u = im.dataset.repli; delete im.dataset.repli; im.src = u; } }, true);

/* ============ Annuler (15 s après chaque action) ============ */
const clone = x => x === undefined ? undefined : JSON.parse(JSON.stringify(x));
function inverseDe(op){
  const d = S.data;
  switch(op.t){
    case "patch": { const r = (d[op.c] || []).find(x => x.id === op.id); if(!r) return null;
      const p = Object.fromEntries(Object.keys(op.p).map(k => [k, clone(getPath(r, k)) ?? null])); if("statut" in op.p) p.statutDepuis = r.statutDepuis ?? null;
      return [{t:"patch", c:op.c, id:op.id, p}]; }
    case "add": return [{t:"del", c:op.c, id:op.r.id, noTrash:true}];
    case "del": { const r = (d[op.c] || []).find(x => x.id === op.id); if(!r) return null; return [op.noTrash ? {t:"add", c:op.c, r:clone(r)} : {t:"restore", id:op.id}]; }
    case "restore": { const e = (d.corbeille || []).find(x => x.r.id === op.id); return e ? [{t:"del", c:e.c, id:op.id}] : null; }
    case "agendaSet": { const prev = (d.agenda || []).find(x => x.id === op.ev.id); return [prev ? {t:"agendaSet", ev:clone(prev), remplace:true} : {t:"agendaDel", id:op.ev.id, sansExclure:true}]; }
    case "agendaDel": { const prev = (d.agenda || []).find(x => x.id === op.id); return prev ? [{t:"agendaSet", ev:clone(prev), remplace:true, rinclure:true}] : null; }
    case "agendaPpl": { const prev = (d.agenda || []).find(x => x.id === op.id); return prev ? [{t:"agendaSet", ev:clone(prev), remplace:true}] : null; }
    case "settings": return [{t:"settings", p:Object.fromEntries(Object.keys(op.p).map(k => [k, clone(getPath(d.settings, k)) ?? null]))}];
    case "rappelAdd": return [{t:"rappelDel", c:op.c, id:op.id, rid:op.rp.id}];
    case "rappelDel": { const r = (d[op.c] || []).find(x => x.id === op.id), rp = r?.rappels?.find(x => x.id === op.rid); return rp ? [{t:"rappelAdd", c:op.c, id:op.id, rp:clone(rp)}] : null; }
    case "note": return [];
    case "reussiteMasque": return [{...op, masque:!op.masque, txt:undefined}];
    default: return null;          // séries, sauvegardes… : pas d'annulation rapide (historique et corbeille restent là)
  }
}
const UNDO = {groupe:null, timer:null};
function noterAnnulation(op){
  if(!UNDO.groupe){ UNDO.groupe = {ops:[], ok:true, txt:""}; setTimeout(fermerAnnulation, 0); }
  const inv = inverseDe(op);
  if(!inv) UNDO.groupe.ok = false; else UNDO.groupe.ops.unshift(...inv.map(x => ({...x, notify:op.notify})));
  if(op.txt && !UNDO.groupe.txt) UNDO.groupe.txt = op.txt;
}
function fermerAnnulation(){
  const g = UNDO.groupe; UNDO.groupe = null; if(!g || !g.ok || !g.ops.length) return;
  const root = $("#undoRoot"); clearTimeout(UNDO.timer);
  root.innerHTML = `<div class="undo" role="status"><span>${esc(g.txt || "Modification enregistrée")}</span><button class="btn" type="button" id="undoBtn">↶ Annuler</button></div>`;
  $("#undoBtn").onclick = () => { root.innerHTML = ""; clearTimeout(UNDO.timer);
    g.ops.forEach((o, i) => dispatch({...o, noUndo:true, ...(i === 0 ? {txt:`Annulé : ${g.txt || "dernière action"}`} : {})}));
    renderDrawer(); toast("Action annulée"); };
  UNDO.timer = setTimeout(() => { root.innerHTML = ""; }, 15000);
}

/* ============ Notifications du navigateur (page ouverte, même en arrière-plan) ============ */
const NOTIF_KEY = "cabane.notifs", NOTIF_VU = "cabane.notifsVues";
const notifsOn = () => store.get(NOTIF_KEY, false) && "Notification" in window && Notification.permission === "granted";
function notifier(titre, corps, tag, ouvrir){
  if(!notifsOn()) return;
  try { const n = new Notification(titre, {body:corps, tag, icon:"icon-192.png"}); n.onclick = () => { window.focus(); ouvrir?.(); n.close(); }; } catch {}
}
// Compare les données avant / après une synchro : nouvelles propositions, et rappels du jour (une fois chacun)
function verifierNotifs(avant, apres){
  if(!notifsOn() || !apres) return;
  if(avant){ const ids = new Set(avant.propositions.map(p => p.id));
    for(const p of apres.propositions) if(!ids.has(p.id)) notifier(`📝 Nouvelle proposition : ${p.login}`, p.proposePar ? `Proposée par ${p.proposePar}` : "À trier", "prop-" + p.id, () => { S.drawer = {c:"propositions", id:p.id}; renderDrawer(); }); }
  const vus = new Set(store.get(NOTIF_VU, [])), t = todayISO(), me = cfg.me;
  for(const c of ["membres", "propositions"]) for(const r of apres[c]) for(const rp of r.rappels || []){
    const k = `${rp.id}|${t}`; if(rp.date > t || vus.has(k) || (me && rp.par && rp.par !== me)) continue;
    vus.add(k); notifier(`🔔 Rappel : ${r.login}`, rp.texte, "rp-" + rp.id, () => { S.drawer = {c, id:r.id}; renderDrawer(); }); }
  store.set(NOTIF_VU, [...vus].filter(k => k.endsWith("|" + t)));
}
async function activerNotifs(on){
  if(!on){ store.set(NOTIF_KEY, false); render(); toast("Notifications désactivées sur cet appareil"); return; }
  if(!("Notification" in window)){ toast("Ce navigateur ne gère pas les notifications.", true); return; }
  const p = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if(p !== "granted"){ toast("Notifications refusées par le navigateur (réglages du site pour les autoriser).", true); return; }
  store.set(NOTIF_KEY, true); render(); notifier("La Cabane", "Les notifications sont activées sur cet appareil.", "test"); verifierNotifs(null, S.data);
}
/* ----- Application installable ----- */
let installEvt = null;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; if(S.view === "reglages") render(); });
window.addEventListener("appinstalled", () => { installEvt = null; toast("La Cabane est installée sur cet appareil"); if(S.view === "reglages") render(); });
const estInstallee = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
function appPanel(){
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return `<section class="panel" id="appli"><h2>Application sur cet appareil</h2>
    <p>La page s'installe comme une appli : icône sur l'écran d'accueil, ouverture en plein écran. Sans réseau, elle s'ouvre sur la dernière copie des données reçue ; ce que tu modifies part dès que le réseau revient (garde la page ouverte jusque-là).</p>
    ${estInstallee() ? `<p class="up" style="margin:0">● Ouverte comme application.</p>`
      : installEvt ? `<div class="tools" style="margin:0"><button class="btn primary" id="installApp">Installer La Cabane</button></div>`
      : ios ? `<p style="margin:0">Sur iPhone ou iPad : dans <b>Safari</b>, bouton Partager puis « Sur l'écran d'accueil ».</p>`
      : `<p style="margin:0">Menu du navigateur → « Installer l'application » (ou « Ajouter à l'écran d'accueil »).</p>`}
    <p class="meta" style="margin:10px 0 0">${!cfg.remember ? "Copie hors connexion désactivée : coche « Mémoriser le jeton sur cet appareil » pour l'activer."
      : S.copieLe ? `Copie hors connexion à jour (${fmtStamp(S.copieLe)}).` : S.copieTrop ? "Copie hors connexion : trop de données pour ce navigateur, pas de copie." : "Copie hors connexion : faite au prochain chargement des données."}</p>
  </section>`;
}
function notifsPanel(){
  const dispo = "Notification" in window, refus = dispo && Notification.permission === "denied";
  return `<section class="panel" id="notifs"><h2>Notifications sur cet appareil</h2>
    <p>Quand la page est ouverte (même dans un onglet en arrière-plan), une notification apparaît pour chaque <b>nouvelle proposition</b> et pour <b>tes rappels du jour</b>. Rien n'arrive si la page est fermée : il n'y a pas de serveur pour les envoyer. Réglage propre à ce navigateur.</p>
    ${!dispo ? `<p class="none">Ce navigateur ne gère pas les notifications.</p>` : refus ? `<p class="down">Le navigateur bloque les notifications pour ce site : autorise-les dans les réglages du site (cadenas à gauche de l'adresse).</p>`
      : `<div class="tools" style="margin:10px 0 0">${notifsOn() ? `<span class="up" style="align-self:center">● Activées</span><button class="btn ghost" id="notifOff">Désactiver</button>` : `<button class="btn primary" id="notifOn">Activer les notifications</button>`}</div>`}
  </section>`;
}

// Stagnation des propositions : même calcul que le robot (commun.js)
const STAG_STATUTS = Commun.STAG_STATUTS;
const stagJours = () => Commun.seuilStagnation(S.data?.settings);
const depuisStatut = p => Commun.joursDansStatut(p, todayISO());
function stagnantes(){
  return S.data.propositions.filter(p => STAG_STATUTS.includes(p.statut)).map(p => ({p, j:depuisStatut(p)}))
    .filter(x => x.j != null && x.j >= stagJours()).sort((a,b) => b.j - a.j);
}
// Rappels : échus (date du jour ou passée) sur toutes les fiches (sauf corbeille)
function rappelsEchus(){
  const t = todayISO(), out = [];
  for(const c of ["membres", "propositions"]) for(const r of S.data[c]) for(const rp of r.rappels || []) if(rp.date <= t) out.push({c, r, rp});
  return out.sort((a, b) => a.rp.date.localeCompare(b.rp.date));
}
const aRappelEchu = r => (r.rappels || []).some(x => x.date <= todayISO());
const RAISONS_DEPART = ["Inactif / ne streame plus","A arrêté Twitch","Pause / manque de temps","A rejoint une autre communauté","Désaccord / conflit","Exclu par le staff","Autre"];
function ensureShape(){
  const d = S.data; d.settings = d.settings || {}; d.propositions = d.propositions || []; d.membres = d.membres || [];
  d.snapshots = d.snapshots || []; d.journal = d.journal || [];
  d.settings.staff = d.settings.staff || []; d.settings.statutsProposition = d.settings.statutsProposition || [];
  d.settings.roles = d.settings.roles || ["Admin","Modo","Streamer"]; d.settings.liens = d.settings.liens || [];
  if(d.settings.nom) $("#brand").textContent = d.settings.nom;
}
function updateSync(txt, cls){
  const dot = $("#syncDot"), t = $("#syncTxt");
  if(txt){ dot.className = "dot " + (cls||""); t.textContent = txt; return; }
  if(S.mode === "github"){
    if(S.horsLigne || (S.lastError && !navigator.onLine)){ dot.className = "dot busy"; t.textContent = `Hors ligne${S.horsLigne ? " · copie du " + fmtStamp(S.horsLigne) : ""}${S.pending.length ? ` · ${S.pending.length} modif. en attente` : ""}`; }
    else if(S.lastError){ dot.className = "dot err"; t.textContent = "Erreur de synchro"; }
    else if(S.saving || S.pending.length){ dot.className = "dot busy"; t.textContent = "Enregistrement…"; }
    else { dot.className = "dot ok"; t.textContent = `Synchronisé${cfg.me ? " · " + cfg.me : ""}`; }
  } else if(S.mode === "local"){ dot.className = "dot busy"; t.textContent = S.dirtyLocal ? "Mode fichier local · non exporté" : "Mode fichier local"; }
  else { dot.className = "dot"; t.textContent = "Non connecté"; }
}
