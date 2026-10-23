// La Cabane · page staff · GitHub : lecture / écriture des données et des relevés, enregistrement, conflits, synchro périodique, réveil du robot, copie hors connexion.
// Scripts classiques chargés dans l'ordre par index.html : ils partagent les mêmes variables globales.
"use strict";
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
