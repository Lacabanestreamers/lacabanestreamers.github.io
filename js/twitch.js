// La Cabane · page staff · Données Twitch en direct (live, follows), anniversaires, libellés des statuts.
// Scripts classiques chargés dans l'ordre par index.html : ils partagent les mêmes variables globales.
/* ============ Données Twitch en direct ============ */
// Deux sources : l'API Twitch (si un membre du staff a connecté son compte Twitch dans Réglages) ou decapi.me en secours.
// decapi renvoie une durée (« 2 hours, 5 minutes ») seulement si la chaîne est en live ; tout autre texte = hors ligne ou erreur
const LIVE_RE = /^\d+\s+(day|hour|minute|second)s?(\s*,\s*\d+\s+(day|hour|minute|second)s?)*$/i;
const TW_KEY = "cabane.twitch";
let tw = store.get(TW_KEY, null);                        // {token}
const twClientId = () => (S.data?.settings.twitchClientId || "").trim();
const twitchOn = () => !!(tw?.token && twClientId());
const redirectUri = () => location.origin + location.pathname.replace(/index\.html$/, "");
function catchTwitchRedirect(){
  let h = location.hash.slice(1); const qs = new URLSearchParams(location.search);
  if(!/access_token=|error=/.test(h) && qs.has("error")) h = location.search.slice(1);     // « Annuler » sur Twitch : l'erreur arrive dans « ?… »
  if(!/access_token=|error=/.test(h)) return;
  const q = new URLSearchParams(h); let st = null;
  try { st = sessionStorage.getItem("cabane.twstate"); sessionStorage.removeItem("cabane.twstate"); } catch {}
  history.replaceState(null, "", location.pathname + (qs.has("error") ? "" : location.search));
  if(q.get("error")){ setTimeout(() => toast("Connexion Twitch annulée ou refusée.", true), 300); return; }
  if(!st || q.get("state") !== st){ setTimeout(() => toast("Connexion Twitch refusée (vérification de sécurité).", true), 300); return; }
  tw = {token:q.get("access_token")}; store.set(TW_KEY, tw);
  setTimeout(() => toast("Compte Twitch connecté"), 300);
}
function twitchLogin(){
  const cid = twClientId(); if(!cid){ toast("Renseigne d'abord le Client ID Twitch.", true); return; }
  const st = Math.random().toString(36).slice(2) + Date.now().toString(36);
  try { sessionStorage.setItem("cabane.twstate", st); } catch {}
  location.href = `https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=${encodeURIComponent(cid)}&redirect_uri=${encodeURIComponent(redirectUri())}&scope=&state=${st}`;
}
function twitchLogout(){ tw = null; store.del(TW_KEY); S.twIds = {}; render(); }
async function helix(path){
  const r = await fetch(`https://api.twitch.tv/helix/${path}`, {headers:{Authorization:`Bearer ${tw.token}`, "Client-Id":twClientId()}, cache:"no-store"});
  if(r.status === 401){ tw = null; store.del(TW_KEY); const e = new Error("twitch-auth"); throw e; }
  if(!r.ok) throw new Error("twitch-" + r.status);
  return r.json();
}
const chunks = (arr, n) => { const out = []; for(let i=0;i<arr.length;i+=n) out.push(arr.slice(i,i+n)); return out; };
function durationMs(d){ const m = /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/.exec(d||""); return m ? ((+m[1]||0)*3600 + (+m[2]||0)*60 + (+m[3]||0))*1000 : 0; }
function sinceTxt(iso){ const min = Math.max(0, Math.round((Date.now() - new Date(iso))/60000)); return min < 60 ? `${min} min` : `${Math.floor(min/60)} h ${String(min%60).padStart(2,"0")}`; }
async function fetchText(url){ const r = await fetch(url, {cache:"no-store"}); if(!r.ok) throw 0; return (await r.text()).trim(); }
async function pool(items, n, fn){ let i = 0; await Promise.all(Array.from({length:n}, async () => { while(i < items.length){ const it = items[i++]; await fn(it); if(i % 10 === 0) render(); } })); }

async function loadHelix(logins, full){
  const ids = S.twIds || (S.twIds = {});
  for(const c of chunks(logins.filter(l => !ids[l]), 100)){
    const j = await helix("users?" + c.map(l => "login=" + encodeURIComponent(l)).join("&"));
    j.data.forEach(u => { ids[u.login] = u.id; if(u.profile_image_url) S.avatars[u.login] = u.profile_image_url; });
  }
  const live = {};
  for(const c of chunks(logins.map(l => ids[l]).filter(Boolean), 100)){
    const j = await helix("streams?first=100&" + c.map(id => "user_id=" + id).join("&"));
    j.data.forEach(st => live[st.user_login] = st);
  }
  logins.forEach(l => { const e = S.live[l] || (S.live[l] = {}); e.notFound = !ids[l]; e.live = !!live[l]; e.uptime = live[l] ? sinceTxt(live[l].started_at) : ""; });
  if(!full) return;
  await pool(logins.filter(l => ids[l]), 6, async l => {
    const e = S.live[l];
    try { e.follows = (await helix(`channels/followers?broadcaster_id=${ids[l]}&first=1`)).total ?? null; } catch(err){ if(err.message === "twitch-auth") throw err; }
    try { const v = (await helix(`videos?user_id=${ids[l]}&type=archive&first=1`)).data[0];
      e.lastVod = v ? new Date(v.created_at).getTime() + durationMs(v.duration) : null; } catch(err){ if(err.message === "twitch-auth") throw err; }
  });
  S.fullAt = Date.now();
}
async function loadDecapi(logins){
  await pool(logins, 3, async login => {
    const e = S.live[login] || (S.live[login] = {});
    if(!(login in S.avatars)){ try { const a = await fetchText(`https://decapi.me/twitch/avatar/${encodeURIComponent(login)}`); S.avatars[login] = /^https:\/\//.test(a) ? a : null; } catch { S.avatars[login] = null; } }
    try { const f = await fetchText(`https://decapi.me/twitch/followcount/${encodeURIComponent(login)}`); e.follows = /^\d[\d,\s]*$/.test(f) ? parseInt(f.replace(/[^\d]/g,""),10) : null; } catch { e.follows = null; }
    try { const u = await fetchText(`https://decapi.me/twitch/uptime/${encodeURIComponent(login)}`); e.live = LIVE_RE.test(u); e.uptime = e.live ? u : ""; } catch { e.live = false; }
  });
}
async function loadLive(force){
  if(!S.data || S.liveLoading) return;
  S.liveLoading = true; render();
  const logins = [...new Set([
    ...S.data.membres.filter(m => m.statut !== "Parti").map(m => m.login),
    ...S.data.propositions.filter(p => !["Refusé","Abandonnée","Accepté"].includes(p.statut)).map(p => p.login)
  ])];
  try {
    if(twitchOn()){
      const full = force || !S.fullAt || Date.now() - S.fullAt > 15*60000;
      try { await loadHelix(logins, full); }
      catch(e){
        toast(e.message === "twitch-auth" ? "Session Twitch expirée : reconnecte-toi dans Réglages." : "API Twitch indisponible, lecture via decapi.", true);
        await loadDecapi(logins);
      }
    } else await loadDecapi(logins);
  } finally { S.liveLoading = false; S.liveAt = Date.now(); }
  recordSeenLive(); render();
}
// Mémorise le jour où une chaîne de La Cabane a été vue en live (sert au « dernier stream » quand il n'y a pas de VOD)
function recordSeenLive(){
  if(S.mode === "none") return;
  const today = todayISO();
  const vus = S.data.membres.filter(m => liveOf(m.login).live && m.dernierLive !== today);
  if(!vus.length) return;
  S.lot = true; try { vus.forEach(m => dispatch({t:"patch", c:"membres", id:m.id, p:{dernierLive:today}, auto:true})); } finally { S.lot = false; }
  updateSync(); render();
}
function lastStream(m){
  const l = liveOf(m.login);
  if(l.live) return {live:true, days:0};
  const c = [];
  if(l.lastVod) c.push({t:l.lastVod, src:"dernière VOD"});
  if(m.derniereVod) c.push({t:new Date(m.derniereVod).getTime(), src:"dernière VOD (robot)"});
  if(m.dernierLive) c.push({t:new Date(m.dernierLive + "T12:00:00").getTime(), src:"vu en live sur La Cabane"});
  if(m.dernierStreamManuel) c.push({t:new Date(m.dernierStreamManuel + "T12:00:00").getTime(), src:"saisie manuelle"});
  if(!c.length) return null;
  const best = c.reduce((a,b) => b.t > a.t ? b : a);
  const d0 = new Date(); d0.setHours(0,0,0,0); const d1 = new Date(best.t); d1.setHours(0,0,0,0);
  return {days:Math.max(0, Math.round((d0 - d1)/864e5)), date:d1, src:best.src};
}
function lastStreamCell(m){
  const x = lastStream(m);
  if(!x) return `<span class="muted" title="${twitchOn() ? "Aucune VOD publique : saisis la date sur la fiche" : "Connecte Twitch dans Réglages pour lire la dernière VOD"}">–</span>`;
  if(x.live) return `<span class="up">en live</span>`;
  const cls = x.days >= 30 ? "down" : x.days >= 14 ? "warn" : "";
  return `<span class="${cls}" title="${x.date.toLocaleDateString("fr-FR")} · ${x.src}">${x.days === 0 ? "aujourd'hui" : x.days + " j"}</span>`;
}
const liveOf = login => S.live[login] || {};
function avatarHtml(login, big){
  const u = S.avatars[login], cls = "av" + (big ? " big" : "");
  if(!u) return `<span class="${cls}" aria-hidden="true">${esc((login || "?")[0])}</span>`;
  const src = u.replace(/\d+x\d+(\.\w+)$/, (big ? "150x150" : "70x70") + "$1");
  return `<img class="${cls}" src="${esc(src)}" data-repli="${esc(u)}" alt="" loading="lazy" referrerpolicy="no-referrer">`;
}
const liveStamp = () => S.liveAt ? ` · live vérifié à ${new Date(S.liveAt).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}` : "";
function currentFollows(m){ return m.followsMode === "manuel" ? (m.followsManuel ?? null) : (liveOf(m.login).follows ?? null); }
function refSnapshot(){
  const snaps = S.data.snapshots; if(!snaps.length) return null;
  if(S.f.ref) return snaps.find(s => s.date === S.f.ref) || null;
  const limit = new Date(Date.now() - 7*864e5).toISOString().slice(0,10);
  const older = snaps.filter(s => s.date <= limit);
  return older.length ? older[older.length-1] : snaps[0];
}

/* ============ Anniversaires ============ */
function annivInfo(iso){
  if(!iso) return null;
  const [y,m,d] = iso.split("-").map(Number);
  const t = new Date(); t.setHours(0,0,0,0);
  let next = new Date(t.getFullYear(), m-1, d);
  if(next < t) next = new Date(t.getFullYear()+1, m-1, d);
  const days = Math.round((next - t) / 864e5);
  return {days, years: next.getFullYear() - y, next};
}

/* ============ Libellés statuts ============ */
function statutClass(s){
  return ({"Accepté":"s-accepte","Refusé":"s-refuse","Abandonnée":"s-abandon","Attente staff":"s-attente","Proposition en cours":"s-encours","Proposition à faire":"s-afaire","Aucun contact":"s-aucun","Présent":"s-present","Parti":"s-parti"})[s] || "s-vide";
}
const pill = (s, empty="À trier") => `<span class="pill ${statutClass(s)}">${esc(s || empty)}</span>`;
function avisKind(v){ const t = String(v||"").toLowerCase(); if(!t) return ""; if(t.startsWith("pour")||t==="oui"||t==="👍") return "pour"; if(t.startsWith("contre")||t==="non"||t==="👎") return "contre"; if(t.startsWith("neutre")||t.startsWith("mitig")) return "neutre"; return "autre"; }
function contactHtml(c){
  if(!c) return "";
  if(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c)) return `<a href="mailto:${esc(c)}" onclick="event.stopPropagation()">${esc(c)}</a>`;
  const u = safeUrl(c); if(!u) return esc(c);
  let label = u; try { const h = new URL(u).hostname.replace(/^www\./,""); label = h.includes("discord") ? "Discord" : h.includes("instagram") ? "Instagram" : (h === "x.com" || h.includes("twitter")) ? "X" : h.includes("tiktok") ? "TikTok" : h; } catch {}
  return `<a href="${esc(u)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${esc(label)}</a>`;
}
function sortRows(rows, [key, dir], getters){
  const g = getters[key] || (r => r[key]);
  return rows.sort((a,b) => { const x = g(a), y = g(b);
    if(x == null || x === "") return 1; if(y == null || y === "") return -1;
    return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "fr", {numeric:true})) * dir; });
}
const th = (label, key, sort, cls="") => `<th data-sort="${key}" class="${cls}" aria-sort="${sort[0]===key ? (sort[1]>0?"ascending":"descending") : "none"}">${label}${sort[0]===key ? ` <span class="arrow">${sort[1]>0?"▲":"▼"}</span>` : ""}</th>`;
