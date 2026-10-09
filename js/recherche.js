// La Cabane · page staff · Recherche globale (Ctrl+K).
// Scripts classiques chargés dans l'ordre par index.html : ils partagent les mêmes variables globales.
/* ============ Recherche globale (Ctrl+K) ============ */
const sansAccents = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const RECH = {q:"", sel:0, res:[]};
function resultatsRecherche(q){
  const d = S.data, n = sansAccents(q.trim()); if(!d || n.length < 2) return [];
  const ok = (...champs) => champs.some(c => sansAccents(c).includes(n));
  const out = [];
  for(const m of d.membres) if(ok(m.login, m.discord, m.notes, (m.tags || []).join(" "))) out.push({k:"Streamer", t:m.login, m:[m.statut, m.role].filter(Boolean).join(" · "), go:() => { S.drawer = {c:"membres", id:m.id}; renderDrawer(); }, score:sansAccents(m.login).startsWith(n) ? 0 : 1});
  for(const p of d.propositions) if(ok(p.login, p.proposePar, p.commentaire, p.notes, p.responsable)) out.push({k:"Proposition", t:p.login, m:[p.statut || "À trier", p.proposePar && "par " + p.proposePar].filter(Boolean).join(" · "), go:() => { S.drawer = {c:"propositions", id:p.id}; renderDrawer(); }, score:sansAccents(p.login).startsWith(n) ? 0 : 1});
  for(const x of d.corbeille || []) if(ok(x.r.login)) out.push({k:"Corbeille", t:x.r.login, m:`supprimé le ${fmtDate((x.le || "").slice(0, 10))}${x.par ? " par " + x.par : ""}`, go:() => { ouvrirReglage("corbeille"); }, score:2});
  for(const e of d.agenda || []) if(ok(e.titre, e.description, e.type)) out.push({k:"Événement", t:e.titre, m:fmtDate(e.date) + (e.heure ? " · " + e.heure : ""), go:() => { S.view = "agenda"; S.sansRestaurer = true; S.evEdit = clone(e); S.evEdit._pplAvant = [...(e.participants || [])]; render(); window.scrollTo(0, 0); }, score:1});
  for(const se of d.series || []) if(ok(se.titre)) out.push({k:"Série", t:se.titre, m:rythmeTxt(se), go:() => { S.view = "agenda"; S.sansRestaurer = true; S.serieEdit = clone(se); render(); }, score:1});
  for(const j of (d.journal || []).slice(0, 400)) if(ok(j.txt)) { const fiche = [...d.membres.map(r => ["membres", r]), ...d.propositions.map(r => ["propositions", r])].find(([, r]) => j.txt.startsWith(r.login + " ·"));
    out.push({k:"Historique", t:j.txt, m:`${fmtStamp(j.le)} · ${j.par}`, go:fiche ? () => { S.drawer = {c:fiche[0], id:fiche[1].id}; renderDrawer(); } : () => { S.view = "reglages"; render(); }, score:3}); }
  return out.sort((a, b) => a.score - b.score).slice(0, 40);
}
function ouvrirRecherche(){
  if(!S.data){ toast("Connecte-toi d'abord au fichier partagé.", true); return; }
  RECH.q = ""; RECH.sel = 0; RECH.res = [];
  $("#rechRoot").innerHTML = `<div class="rech" id="rechOv" role="dialog" aria-modal="true" aria-label="Recherche"><div class="box"><input id="rechQ" type="search" placeholder="Streamer, proposition, événement, historique…" autocomplete="off" aria-label="Rechercher"><ul id="rechL" role="listbox"></ul></div></div>`;
  majRecherche(); setTimeout(() => $("#rechQ")?.focus(), 0);
}
function fermerRecherche(){ $("#rechRoot").innerHTML = ""; }
function majRecherche(){
  const ul = $("#rechL"); if(!ul) return;
  RECH.res = resultatsRecherche(RECH.q); RECH.sel = Math.min(RECH.sel, Math.max(0, RECH.res.length - 1));
  ul.innerHTML = RECH.q.trim().length < 2 ? `<li class="vide" style="cursor:default">Tape au moins 2 lettres. Échap pour fermer.</li>`
    : RECH.res.length ? RECH.res.map((r, i) => `<li role="option" data-ri="${i}" aria-selected="${i === RECH.sel}"><span class="k">${esc(r.k)}</span><span class="t">${esc(r.t)}</span><span class="m">${esc(r.m || "")}</span></li>`).join("")
    : `<li class="vide" style="cursor:default">Rien trouvé.</li>`;
  ul.querySelector('[aria-selected="true"]')?.scrollIntoView({block:"nearest"});
}
function allerResultat(i){ const r = RECH.res[i]; if(!r) return; fermerRecherche(); r.go(); }
document.addEventListener("input", e => { if(e.target.id === "rechQ"){ RECH.q = e.target.value; RECH.sel = 0; majRecherche(); } });
document.addEventListener("click", e => { const li = e.target.closest?.("#rechL [data-ri]"); if(li){ allerResultat(Number(li.dataset.ri)); return; } if(e.target.id === "rechOv") fermerRecherche(); });
document.addEventListener("keydown", e => {
  if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k"){ e.preventDefault(); $("#rechOv") ? fermerRecherche() : ouvrirRecherche(); return; }
  if(!$("#rechOv")) return;
  if(e.key === "Escape"){ e.preventDefault(); e.stopImmediatePropagation(); fermerRecherche(); return; }
  if(e.key === "ArrowDown" || e.key === "ArrowUp"){ e.preventDefault(); RECH.sel = Math.max(0, Math.min(RECH.res.length - 1, RECH.sel + (e.key === "ArrowDown" ? 1 : -1))); majRecherche(); }
  if(e.key === "Enter"){ e.preventDefault(); allerResultat(RECH.sel); }
}, true);
document.addEventListener("keydown", e => {
  if(e.key === "Escape" && S.drawer){ S.drawer = null; renderDrawer(); }
  if(e.key === "Enter" && e.target.matches(".ann")){ e.target.click(); }
  if(e.key === "Enter" && e.target.id === "vueNom"){ e.preventDefault(); document.querySelector("[data-vuesave]")?.click(); }
  if(e.key === "Enter" && e.target.id === "ev_ppl"){ e.preventDefault(); e.target.dispatchEvent(new Event("change", {bubbles:true})); }
  if(e.key === "Enter" && e.target.id === "rpTexte"){ e.preventDefault(); $("#rpAdd")?.click(); }
  if(e.key === "Enter" && e.target.id === "tagAdd"){ e.preventDefault(); e.target.dispatchEvent(new Event("change", {bubbles:true})); }
});
document.addEventListener("input", e => {
  const t = e.target;
  if(t.id === "msgText" && S.msgSel) S.msgSel.texte = t.value;
  if(t.id === "pq"){ S.f.pq = t.value; render(); }
  if(t.id === "mq"){ S.f.mq = t.value; render(); }
});
document.addEventListener("change", e => {
  const t = e.target;
  if(t.dataset.integ && S.drawer){ const m = S.data.membres.find(x => x.id === S.drawer.id); if(!m) return;
    patch("membres", m.id, {[`integ.${t.dataset.integ}`]: t.checked ? todayISO() : undefined}, `${m.login} · Intégration : ${t.dataset.integ} ${t.checked ? "fait" : "décoché"}`); renderDrawer(); return; }
  if(t.id === "fileIn" && S.data && !estAdmin()){ t.value = ""; toast("Réservé aux admins de la page (Réglages → Admins).", true); return; }
  if(["sr_rythme", "sr_debut", "sr_heure"].includes(t.id) && S.serieEdit){ S.serieEdit = lireSerieForm(); render(); return; }
  if(t.dataset.evlier && t.value){ const m = S.data.membres.find(x => x.id === t.value), ev = (S.data.agenda || []).find(x => x.id === t.dataset.evlier); if(!m || !ev) return;
    // le compte Discord est mémorisé sur la fiche : ses prochaines réactions seront reconnues toutes seules
    dispatch({t:"patch", c:"membres", id:m.id, p:{discordId:t.dataset.did, discord:t.dataset.dnom}, auto:true});
    dispatch({t:"agendaPpl", id:ev.id, add:m.login, inconnu:t.dataset.did, txt:`${m.login} inscrit à « ${ev.titre} » (✅ Discord de ${t.dataset.dnom})`});
    toast(`${t.dataset.dnom} = ${m.login} : inscrit, et reconnu automatiquement la prochaine fois`); return; }
  if(t.id === "refSel"){ S.f.ref = t.value; render(); return; }
  if(t.id === "roleSel"){ S.f.mrole = t.value; render(); return; }
  if(t.id === "ev_ppl" && S.evEdit){ const l = normLogin(t.value); if(!l) return;
    if(!S.data.membres.some(m => m.login === l)){ toast(`${l} n'est pas dans Streamers.`, true); return; }
    const e = lireEvForm(); if(!(e.participants || []).includes(l)) e.participants = [...(e.participants || []), l];
    S.evEdit = e; t.value = ""; S.sansRestaurer = true; render(); setTimeout(() => $("#ev_ppl")?.focus(), 0); return; }
  if(t.id === "msgPick" && S.drawer){ S.msgSel = t.value === "" ? null : {id:S.drawer.id, i:Number(t.value)}; renderDrawer(); return; }
  if(t.id === "ptagSel"){ S.f.ptag = t.value; render(); return; }
  if(t.id === "mtagSel"){ S.f.mtag = t.value; render(); return; }
  if(t.id === "tagAdd" && S.drawer){ const tag = normTag(t.value); if(!tag) return; t.blur(); const r = S.data[S.drawer.c].find(x => x.id === S.drawer.id); if(!r || hasTag(r, tag)){ t.value = ""; return; }
    patch(S.drawer.c, r.id, {tags:[...(r.tags || []), tag]}, `${r.login} · Étiquette ajoutée : ${tag}`); t.value = ""; renderDrawer(); setTimeout(() => $("#tagAdd")?.focus(), 0); return; }
  if(t.id === "fileIn"){ const f = t.files[0]; if(f) openLocalFile(f); return; }
  if(t.dataset.k && S.drawer){
    if(!t.isConnected || !t.closest("#drawerRoot")) return;          // champ d'une fiche déjà refermée : ne pas l'appliquer à une autre
    if(t.dataset.fiche && t.dataset.fiche !== S.drawer.c + S.drawer.id) return;   // saisie commencée sur une autre fiche
    const {c, id} = S.drawer; const r = S.data[c].find(x => x.id === id); if(!r) return;
    let v = t.type === "checkbox" ? (t.dataset.date ? (t.checked ? todayISO() : null) : t.checked) : t.value.trim();
    if(t.type === "number") v = v === "" ? null : Number(v);
    if(t.type === "date"){ v = v || null;
      // En tapant l'année chiffre par chiffre, le navigateur envoie « 0002 », « 0020 », « 0202 »… : on attend une année plausible
      if(v && (Number(v.slice(0,4)) < 1990 || Number(v.slice(0,4)) > new Date().getFullYear() + 5)) return; }
    const k = t.dataset.k;
    const extra = {};
    if(k === "statut" && v === "Parti" && !r.depart) extra.depart = todayISO();
    if(k === "discord" && (v || "") !== (r.discord || "")) extra.discordId = null;     // nouveau pseudo : le robot relie le bon compte
    if(k === "statut" && v === "Parti" && c === "membres" && !r.raisonDepart) setTimeout(() => { toast("Indique la raison du départ juste en dessous"); $('.drawer select[data-k="raisonDepart"]')?.focus(); }, 50);
    if(k === "statut" && v === "Présent" && !r.arrivee) extra.arrivee = todayISO();
    if(k === "statut" && c === "propositions" && v && !r.dateRevue && ["Accepté","Refusé"].includes(v)) extra.dateRevue = todayISO();
    const label = t.closest("label")?.firstChild?.textContent?.trim() || k.replace("avis.","Avis de ");
    const lib = t.dataset.date ? `Prise de nouvelles J+${k === "suivi7" ? 7 : 30}` : k.startsWith("avis.") ? "Avis de " + k.slice(5) : label;
    if(k === "masquerVitrine"){ dispatch({t:"patch", c, id, p:{[k]: v, ...extra}, notify:true, txt:`${r.login} · ${v ? "masqué de" : "affiché sur"} la vitrine`}); renderDrawer(); return; }
    patch(c, id, {[k]: v, ...extra}, `${r.login} · ${lib} : ${typeof v === "boolean" ? (v?"oui":"non") : t.dataset.date ? (v ? "faite" : "annulée") : (v ?? "vidé")}`);
    renderDrawer();
  }
});
function saveCfg(){
  const c = {...cfg};
  try { if(!cfg.remember){ sessionStorage.setItem("cabane.token", cfg.token); c.token = ""; store.del(HL_KEY); S.copieSha = null; } else sessionStorage.removeItem("cabane.token"); } catch {}
  store.set(CFG_KEY, c);
}
function exportJson(){
  const blob = new Blob([JSON.stringify(S.data, null, 1)], {type:"application/json"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `cabane-data-${todayISO()}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000); S.dirtyLocal = false; updateSync();
}
function openLocalFile(f){
  const rd = new FileReader();
  rd.onload = () => { try {
      const d = JSON.parse(rd.result); if(!d.membres || !d.propositions) throw 0;
      if(S.mode === "github"){
        if(!confirm("Tu es connecté au fichier partagé. Remplacer TOUTES les données partagées par ce fichier ?")) return;
        d.journal = d.journal || [];
        d.journal.unshift({le:new Date().toISOString(), par:cfg.me||"?", txt:`Données remplacées par le fichier ${f.name}`});
        forceReplace(d); return;
      }
      S.data = d; S.mode = "local"; S.dirtyLocal = false; ensureShape(); store.set(LOCAL_KEY, d);
      S.view = "accueil"; render(); updateSync(); loadLive(); toast(`Fichier ${f.name} ouvert en mode local`);
    } catch { toast("Ce fichier n'est pas un export de La Cabane.", true); } };
  rd.readAsText(f);
}
async function forceReplace(d){
  if(S.pending.length){ toast("Enregistrement en cours, réessaie dans quelques secondes.", true); return; }
  S.saving = true; updateSync();
  try { const fresh = await ghGet();
    // données au nouveau format (fichier des relevés) : les relevés du fichier importé y sont ajoutés, sans rien perdre
    if(v2(fresh.data) || v2(d)){ if((d.snapshots || []).length) await ajouterReleves(d.snapshots, `${cfg.me || "staff"} : relevés d'une restauration`); d.version = Math.max(Commun.VERSION, Commun.versionDe(d)); }
    const sha = await ghPut(d, fresh.sha, `${cfg.me||"staff"} : remplacement complet des données`); if(!sha) throw new Error("Conflit, réessaie.");
    S.sha = sha; S.data = attacherReleves(d); ensureShape(); toast("Données remplacées"); }
  catch(e){ toast(e.message, true); }
  S.saving = false; updateSync(); render();
}
