// La Cabane · page staff · Utilitaires, état de la page, opérations sur les données, annulation, notifications, GitHub (lecture / écriture, relevés), copie hors connexion.
// Scripts classiques chargés dans l'ordre par index.html : ils partagent les mêmes variables globales.
"use strict";
/* ============ Utilitaires ============ */
const $ = s => document.querySelector(s);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid = p => p + Math.random().toString(16).slice(2, 10);
const jourLocal = iso => { const d = iso ? new Date(iso) : new Date(); return isNaN(d) ? String(iso || "").slice(0, 10) : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const todayISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,10); };
const fmtDate = iso => { if(!iso) return ""; const [y,m,d] = iso.split("-"); return `${d}/${m}/${y}`; };
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
  f:{ ptag:"", mtag:"", pq:"", pst:"__all", msort:["login",1], psort:["login",1], mq:"", mst:"__actifs", mrole:"__all", ref:"" }
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

/* ============ Réveil du robot groupé ============ */
// Plusieurs enregistrements à la suite = un seul passage du robot (chaque passage coûte au moins 1 minute de quota GitHub)
let reveilT = null;
function planifierReveil(){ if(reveilT) return; reveilT = setTimeout(() => { reveilT = null; notifyRobot(); }, 60000); }
window.addEventListener("pagehide", () => { if(reveilT){ clearTimeout(reveilT); reveilT = null; notifyRobot(true); } });

/* ============ GitHub ============ */
const ghUrl = () => `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${cfg.path.split("/").map(encodeURIComponent).join("/")}`;
const ghHeaders = () => ({Authorization:`Bearer ${cfg.token}`, Accept:"application/vnd.github+json", "X-GitHub-Api-Version":"2022-11-28"});
// siChange : synchro périodique légère. GitHub répond 304 (sans rien renvoyer) si le fichier n'a pas bougé,
// ce qui évite de retélécharger tout le fichier toutes les 90 s quand La Cabane grandit.
async function ghGet(siChange){
  const h = ghHeaders(); if(siChange && S.etag) h["If-None-Match"] = S.etag;
  const r = await fetch(`${ghUrl()}?ref=${encodeURIComponent(cfg.branch)}`, {headers:h, cache:"no-store"});
  if(siChange && r.status === 304) return null;
  if(r.status === 401) throw new Error("Jeton refusé par GitHub : il a expiré ou a été révoqué. Colle un nouveau jeton dans Réglages.");
  if(r.status === 404) throw new Error("Fichier introuvable : vérifie le dépôt, la branche, le chemin et que le jeton a accès à ce dépôt.");
  if(!r.ok) throw new Error(`GitHub a répondu ${r.status}.`);
  const j = await r.json();
  const etag = r.headers.get("ETag") || null;
  let text;
  if(j.content) text = b64decodeUtf8(j.content);
  else { // fichier > 1 Mo
    const raw = await fetch(`${ghUrl()}?ref=${encodeURIComponent(cfg.branch)}`, {headers:{...ghHeaders(), Accept:"application/vnd.github.raw+json"}, cache:"no-store"});
    text = await raw.text();
  }
  return {sha:j.sha, data:JSON.parse(text), etag};
}
async function ghPut(data, sha, message){
  const corps = v2(data) ? {...data, snapshots:undefined} : data;      // version 2 : les relevés vivent dans leur propre fichier
  const r = await fetch(ghUrl(), {method:"PUT", headers:{...ghHeaders(), "Content-Type":"application/json"},
    body:JSON.stringify({message, content:b64encodeUtf8(JSON.stringify(corps, null, 1)), sha, branch:cfg.branch})});
  if(r.status === 409 || r.status === 422) return null; // conflit : quelqu'un a enregistré entre-temps
  if(r.status === 401 || r.status === 403) throw new Error("Le jeton n'a pas le droit d'écrire (permission Contents : Read and write).");
  if(!r.ok) throw new Error(`Enregistrement refusé (${r.status}).`);
  return (await r.json()).content.sha;
}
/* ----- Relevés de follows : fichier à part (cabane-releves.json) depuis la version 2 des données ----- */
// En mémoire, ils restent rangés dans S.data.snapshots (tableaux, courbes) ; ils ne sont jamais renvoyés avec les données.
const v2 = d => Commun.versionDe(d) >= 2;
const relUrl = () => `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${Commun.cheminReleves(cfg.path).split("/").map(encodeURIComponent).join("/")}`;
async function relGet(siChange){
  const h = ghHeaders(); if(siChange && S.rel?.etag) h["If-None-Match"] = S.rel.etag;
  const r = await fetch(`${relUrl()}?ref=${encodeURIComponent(cfg.branch)}`, {headers:h, cache:"no-store"});
  if(siChange && r.status === 304) return null;
  if(r.status === 404) return {sha:null, liste:[], etag:null};
  if(!r.ok) throw new Error(`Relevés de follows illisibles (${r.status}).`);
  const j = await r.json();
  const text = j.content ? b64decodeUtf8(j.content) : await (await fetch(`${relUrl()}?ref=${encodeURIComponent(cfg.branch)}`, {headers:{...ghHeaders(), Accept:"application/vnd.github.raw+json"}, cache:"no-store"})).text();
  return {sha:j.sha, liste:JSON.parse(text).snapshots || [], etag:r.headers.get("ETag") || null};
}
async function relPut(liste, sha, message){
  const r = await fetch(relUrl(), {method:"PUT", headers:{...ghHeaders(), "Content-Type":"application/json"},
    body:JSON.stringify({message, content:b64encodeUtf8(JSON.stringify({version:1, snapshots:liste}, null, 1)), ...(sha ? {sha} : {}), branch:cfg.branch})});
  if(r.status === 409 || r.status === 422) return null;
  if(r.status === 401 || r.status === 403) throw new Error("Le jeton n'a pas le droit d'écrire (permission Contents : Read and write).");
  if(!r.ok) throw new Error(`Enregistrement des relevés refusé (${r.status}).`);
  return (await r.json()).content.sha;
}
// Range les relevés chargés dans les données affichées (sans fichier chargé, on garde ce qui y est déjà : copie hors ligne, fichier local)
function attacherReleves(d){ if(d && v2(d)) d.snapshots = S.rel ? S.rel.liste : (d.snapshots || []); return d; }
async function chargerReleves(siChange){
  if(!v2(S.data)){ S.rel = null; return; }
  const r = await relGet(siChange); if(!r) return;
  S.rel = r; attacherReleves(S.data);
}
// Ajoute / remplace des relevés dans le fichier (relevé manuel, restauration) ; union par date : un relevé ne se perd jamais
async function ajouterReleves(nouveaux, message){
  for(let essai = 0; essai < 4; essai++){
    const r = await relGet(false);
    let liste = r.liste; for(const s of nouveaux) liste = Commun.ajouterReleve(liste, s);
    const sha = await relPut(liste, r.sha, message.slice(0, 200));
    if(sha){ S.rel = {sha, liste, etag:null}; return; }
  }
  throw new Error("Trop de conflits en enregistrant les relevés, réessaie dans un instant.");
}
// Réveille le robot (GitHub Actions) pour qu'il poste tout de suite sur Discord. En cas d'échec, son passage horaire rattrape.
async function notifyRobot(garder){
  try {
    const r = await fetch(`https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/dispatches`,
      {method:"POST", headers:{...ghHeaders(), "Content-Type":"application/json"}, body:JSON.stringify({event_type:"cabane-notif"}), keepalive:!!garder});
    if(!r.ok) console.warn("Robot non déclenché (" + r.status + "), il passera à l'heure suivante.");
    return r.ok;
  } catch(e){ console.warn("Robot non déclenché", e); return false; }
}
let saveTimer = null;
function scheduleSave(){ clearTimeout(saveTimer); saveTimer = setTimeout(save, 1200); }
async function save(){
  if(S.saving || !S.pending.length) return;
  S.saving = true; updateSync();
  const ops = S.pending.splice(0);
  try {
    let done = false, relevesFaits = false;
    const relOps = ops.filter(o => o.t === "snapshot");
    for(let attempt=0; attempt<4 && !done; attempt++){
      const fresh = await ghGet();
      if(relOps.length && v2(fresh.data) && !relevesFaits){        // relevé manuel : dans le fichier des relevés
        await ajouterReleves(relOps.map(o => o.s), `${cfg.me || "staff"} : relevé manuel des follows`); relevesFaits = true; }
      S.conflits = [];
      for(const op of ops) applyOp(fresh.data, {...JSON.parse(JSON.stringify(op)), verif:true});
      const who = cfg.me || "staff";
      const msg = ops.length === 1 && ops[0].txt ? `${who} : ${ops[0].txt}` : `${who} : ${ops.length} modifications`;
      const sha = await ghPut(fresh.data, fresh.sha, msg.slice(0,200));
      if(sha && ops.some(o => o.notify)) planifierReveil();
      if(sha){
        const avantNotif = S.data; S.sha = sha; S.etag = null; S.data = attacherReleves(fresh.data); S.horsLigne = null; ensureShape(); verifierNotifs(avantNotif, S.data); garderCopie();
        for(const op of S.pending) applyOp(S.data, JSON.parse(JSON.stringify(op))); // modifs faites pendant l'envoi
        done = true;
      }
    }
    if(!done) throw new Error("Trop de conflits d'enregistrement, réessaie dans un instant.");
    S.lastError = null;
  } catch(e){
    S.conflits = [];            // l'enregistrement a échoué : les opérations repartiront, les conflits seront recalculés
    S.pending.unshift(...ops); S.lastError = e.message;
    if(!(e instanceof TypeError && (S.horsLigne || !navigator.onLine))) toast(e.message, true);   // hors ligne : pas de message toutes les 45 s
  } finally {
    S.saving = false; updateSync(); render();
    if(S.pending.length && !S.lastError) scheduleSave();
    else if(S.pending.length && S.mode === "github"){ clearTimeout(saveTimer); saveTimer = setTimeout(save, 45000); }   // échec (réseau…) : nouvel essai dans 45 s
    const cf = S.conflits || []; S.conflits = [];
    if(cf.length) setTimeout(() => resoudreConflits(cf), 50);
  }
}
// Modification simultanée : on montre les deux versions, la personne choisit
function resoudreConflits(liste){
  const court = v => v == null || v === "" ? "(vide)" : typeof v === "object" ? JSON.stringify(v).slice(0, 80) : String(v).slice(0, 120);
  for(const x of liste){
    const champ = x.k.startsWith("avis.") ? `avis de ${x.k.slice(5)}` : x.k;
    if(confirm(`⚠ ${x.par} a modifié « ${champ} » de ${x.login} pendant que tu l'éditais.

Sa version : ${court(x.sien)}
Ta version : ${court(x.mien)}

OK = garder TA version · Annuler = garder la sienne`))
      dispatch({t:"patch", c:x.c, id:x.id, p:{[x.k]:x.mien}, force:true, notify:x.notify, txt:`${x.login} · ${champ} : ${court(x.mien)} (gardé malgré la modification de ${x.par})`});
  }
  renderDrawer();
}
let pullN = 0;
async function pull(silent){
  if(S.mode !== "github" || S.saving || S.pending.length) return;
  const n = ++pullN, shaAvant = S.sha;
  try {
    const fresh = await ghGet(true);
    if(S.horsLigne){ S.horsLigne = null; toast("Réseau retrouvé : données à jour"); }
    // réponse arrivée trop tard (une modification ou un enregistrement a eu lieu entre-temps) : on l'ignore
    if(n !== pullN || S.saving || S.pending.length || S.sha !== shaAvant){ updateSync(); return; }
    if(fresh) S.etag = fresh.etag;          // l'empreinte n'est retenue que pour des données réellement utilisées
    if(fresh && fresh.sha !== S.sha){ const avant = S.data; S.data = attacherReleves(fresh.data); S.sha = fresh.sha;
      try { await chargerReleves(true); } catch(e){ console.warn(e); }          // le robot écrit ses relevés juste avant les données
      ensureShape(); render(); verifierNotifs(avant, S.data); garderCopie(); if(!silent) toast("Données mises à jour"); }
    else if(!silent) toast("Déjà à jour");
    relancerRobotSiBesoin();
    S.lastError = null;
  } catch(e){ S.lastError = e.message; if(!silent) toast(e.message, true); }
  updateSync();
}
setInterval(() => { if(document.visibilityState === "visible" || notifsOn()) pull(true); }, 90000);   // en arrière-plan seulement si les notifications sont activées
setInterval(() => { if(S.data) verifierNotifs(null, S.data); }, 10 * 60000);                             // rappels qui tombent dans la journée
// Statut live relu toutes les 3 min (et au retour sur l'onglet)
const liveStale = () => S.data && !S.liveLoading && (!S.liveAt || Date.now() - S.liveAt > 180000);
setInterval(() => { if(document.visibilityState === "visible" && liveStale()) loadLive(); }, 30000);
document.addEventListener("visibilitychange", () => { if(document.visibilityState === "visible" && liveStale()) loadLive(); });
window.addEventListener("beforeunload", e => { if(S.pending.length || S.saving){ e.preventDefault(); e.returnValue = ""; } });

// Filet de sécurité : GitHub saute parfois des passages programmés du robot.
// Si le robot n'est pas passé depuis plus de 2 h, la page le relance (au plus une fois par heure et par navigateur).
function relancerRobotSiBesoin(){
  if(S.mode !== "github" || !S.data) return;
  const dernier = S.data.robot?.passage || S.data.robot?.derniereExecution;
  if(dernier && Date.now() - new Date(dernier) < 2 * 3600e3) return;
  const k = "cabane.relanceRobot", avant = Number(store.get(k, 0));
  if(Date.now() - avant < 3600e3) return;
  store.set(k, Date.now());
  notifyRobot();
  console.info("Robot relancé : dernier passage", dernier || "inconnu");
}
// Copie hors connexion : la dernière version reçue de GitHub reste sur l'appareil (seulement si « se souvenir de moi » est coché).
// Sans réseau, la page s'ouvre sur cette copie ; les modifications attendent le retour du réseau pour partir.
const HL_KEY = "cabane.horsLigne";
function garderCopie(){
  if(!cfg.remember || !S.data || !S.sha || S.copieSha === S.sha || S.horsLigne) return;
  try { localStorage.setItem(HL_KEY, JSON.stringify({owner:cfg.owner, repo:cfg.repo, path:cfg.path, sha:S.sha, le:new Date().toISOString(), data:S.data})); S.copieSha = S.sha; S.copieLe = new Date().toISOString(); S.copieTrop = false; }
  catch { store.del(HL_KEY); S.copieTrop = true; }          // trop gros pour le navigateur : pas de copie plutôt qu'une copie périmée
}
function ouvrirCopie(){
  const c = store.get(HL_KEY, null);
  if(!c?.data || c.owner !== cfg.owner || c.repo !== cfg.repo || c.path !== cfg.path) return false;
  S.data = c.data; S.sha = c.sha; S.etag = null; S.horsLigne = c.le; S.lastError = null; ensureShape(); render(); updateSync();
  toast(`Pas de réseau : copie du ${fmtStamp(c.le)} affichée. Tes modifications partiront au retour du réseau.`);
  return true;
}
window.addEventListener("online", () => { if(S.mode === "github" && S.horsLigne){ if(S.pending.length) save(); else pull(true); } });
async function connectGithub(){
  if(!cfg.owner || !cfg.repo || !cfg.token){ S.mode = "none"; render(); return; }
  S.mode = "github"; updateSync("Connexion…", "busy");
  try { const r = await ghGet(); S.rel = null; S.data = r.data; S.sha = r.sha; S.etag = r.etag; S.lastError = null; S.horsLigne = null;
    try { await chargerReleves(false); } catch(e){ toast(`${e.message} Les courbes et écarts de follows seront vides.`, true); }
    ensureShape(); render(); loadLive(); relancerRobotSiBesoin(); garderCopie(); }
  catch(e){
    if(e instanceof TypeError && ouvrirCopie()) return;     // réseau absent (pas une erreur de jeton) : copie locale
    S.mode = "none"; S.lastError = e.message; toast(e.message, true); render(); }
  updateSync();
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
