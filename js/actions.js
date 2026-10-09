// La Cabane · page staff · Réactions aux clics et à la saisie (délégation d'événements sur toute la page).
// Scripts classiques chargés dans l'ordre par index.html : ils partagent les mêmes variables globales.
/* ============ Événements ============ */
document.addEventListener("click", e => {
  const t = e.target;
  if(t.closest?.(ADMIN_SEL) && S.data && !estAdmin()){ e.preventDefault(); e.stopPropagation(); toast("Réservé aux admins de la page (Réglages → Admins).", true); return; }
  if(t.closest?.("#rechBtn")){ ouvrirRecherche(); return; }
  // Cases à cocher (sélection groupée) : ne pas ouvrir la fiche
  const sc = t.closest("td.sel, th.sel");
  if(sc){ const cb = sc.querySelector("input"); if(t !== cb) cb.checked = !cb.checked;
    if(cb.dataset.selall !== undefined){ S.visible.forEach(id => cb.checked ? S.sel.add(id) : S.sel.delete(id)); }
    else { cb.checked ? S.sel.add(cb.dataset.sel) : S.sel.delete(cb.dataset.sel); }
    render(); return; }
  const bk = t.closest("[data-bulk]"); if(bk){ bulkApply(bk.dataset.bulk); return; }
  const dl = t.closest("[data-delier]"); if(dl){ const m = S.data.membres.find(x => x.id === dl.dataset.delier); if(!m) return;
    dispatch({t:"patch", c:"membres", id:m.id, p:{discordId:null, discord:null}, txt:`${m.login} · Compte Discord délié`}); renderDrawer(); toast("Compte Discord délié"); return; }
  const npa = t.closest("[data-netparti]"); if(npa){ const m = S.data.membres.find(x => x.id === npa.dataset.netparti); if(!m) return;
    if(confirm(`Passer ${m.login} en « Parti » (raison : inactif) ?`)){ dispatch({t:"patch", c:"membres", id:m.id, p:{statut:"Parti", depart:todayISO(), raisonDepart:"Inactif / ne streame plus"}, notify:true, txt:`${m.login} · Statut : Parti (inactif, depuis Nettoyage)`}); toast(`${m.login} est passé en « Parti »`); } return; }
  const ncl = t.closest("[data-netclore]"); if(ncl){ const p = S.data.propositions.find(x => x.id === ncl.dataset.netclore); if(!p) return;
    dispatch({t:"patch", c:"propositions", id:p.id, p:{statut:"Abandonnée"}, txt:`${p.login} · Statut : Abandonnée (depuis Nettoyage)`}); toast(`Proposition ${p.login} close`); return; }
  const ndl = t.closest("[data-netdel]"); if(ndl){ const p = S.data.propositions.find(x => x.id === ndl.dataset.netdel); if(!p) return;
    if(confirm(`Supprimer la proposition ${p.login} ? Elle part dans la corbeille (30 jours).`)){ dispatch({t:"del", c:"propositions", id:p.id, txt:`Suppression de ${p.login} (proposition, depuis Nettoyage)`}); toast("Proposition supprimée"); } return; }
  if(t.id === "s_staffdcSave"){ const out = [], bad = [];
    $("#s_staffdc").value.split("\n").map(l => l.trim()).filter(Boolean).forEach(l => { const m = /^(.+?)\s*[;:,]\s*@?(\S.*)$/.exec(l); if(m) out.push({nom:m[1].trim(), discord:m[2].trim()}); else bad.push(l); });
    if(bad.length){ toast(`Ligne non comprise : ${bad[0]} (format : Prénom ; pseudo)`, true); return; }
    dispatch({t:"settings", p:{staffDiscord:out}, notify:true, txt:"Comptes Discord du staff modifiés"}); toast("Enregistré : le robot relie les comptes au prochain passage"); return; }
  if(t.id === "arcDl"){ (async () => { try {
      const r = await fetch(`${dirUrl("archives")}/cabane-archive.json?ref=${encodeURIComponent(cfg.branch)}`, {headers:{...ghHeaders(), Accept:"application/vnd.github.raw+json"}, cache:"no-store"});
      if(!r.ok) throw new Error(`Lecture impossible (${r.status}).`);
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([await r.text()], {type:"application/json"})); a.download = "cabane-archive.json"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch(e){ toast(e.message, true); } })(); return; }
  const reu = t.closest("[data-reu]"); if(reu){ e.stopPropagation(); const masque = !reu.dataset.rmasque, kind = reu.dataset.reu;
    dispatch({t:"reussiteMasque", kind, login:reu.dataset.rlogin, palier:kind === "palier" ? Number(reu.dataset.rpal) : undefined, type:reu.dataset.rtype || undefined, date:reu.dataset.rdate, masque, notify:true,
      txt:`${reu.dataset.rlogin} · Réussite ${masque ? "masquée sur" : "réaffichée sur"} la vitrine`});
    renderDrawer(); toast(masque ? "Réussite masquée : elle disparaît de la vitrine au prochain passage du robot" : "Réussite réaffichée"); return; }
  if(t.id === "v_reusave"){ if($("#v_reujours").value.trim() === ""){ toast("Indique un nombre de jours (0 pour cacher la section).", true); return; }
    const n = Math.max(0, Math.min(365, Math.round(Number($("#v_reujours").value)))); if(!Number.isFinite(n)){ toast("Nombre de jours invalide", true); return; }
    dispatch({t:"settings", notify:true, p:{"vitrine.reussitesJours":n}, txt:`Vitrine : réussites affichées ${n ? n + " jours" : "désactivées"}`}); toast(n ? `Réussites des ${n} derniers jours sur la vitrine` : "Section « Nos réussites » cachée sur la vitrine"); return; }
  if(t.id === "s_botSave"){ const u = $("#s_bot").value.trim();
    if(u && !/^https:\/\/[^\s"'<>]+$/.test(u)){ toast("L'adresse doit commencer par https:// et ne pas contenir d'espace.", true); return; }
    dispatch({t:"settings", p:{lienBot:u}, txt:u ? `Lien du site du bot : ${u}` : "Lien du site du bot retiré"}); toast(u ? "Lien du bot enregistré : il est à jour pour tout le staff" : "Lien du bot masqué"); return; }
  if(t.id === "notifOn"){ activerNotifs(true); return; }
  if(t.id === "notifOff"){ activerNotifs(false); return; }
  if(t.id === "s_adminsSave"){ const a = [...document.querySelectorAll(".admChk:checked")].map(x => x.value);
    if(a.length && !a.includes(cfg.me) && !confirm("Tu ne t'es pas coché toi-même : tu ne pourras plus modifier les Réglages ensuite. Continuer ?")) return;
    dispatch({t:"settings", p:{admins:a}, txt:a.length ? `Admins de la page : ${a.join(", ")}` : "Admins de la page : tout le staff"}); toast("Admins enregistrés"); return; }
  const rsp = t.closest("[data-resppick]"); if(rsp && S.drawer){ const p = S.data.propositions.find(x => x.id === S.drawer.id); if(!p) return;
    patch("propositions", p.id, {responsable:rsp.dataset.resppick}, `${p.login} · Responsable : ${rsp.dataset.resppick}`); renderDrawer(); return; }
  if(t.id === "srNew"){ S.sansRestaurer = true; S.serieEdit = {rythme:"hebdo", type:"Raid train", public:true, discord:true, publierDiscord:true, avance:7, duree:120}; render(); setTimeout(() => $("#sr_titre")?.focus(), 0); return; }
  if(t.id === "srCancel"){ S.serieEdit = null; render(); return; }
  const sre = t.closest("[data-sredit]"); if(sre){ S.sansRestaurer = true; S.serieEdit = JSON.parse(JSON.stringify((S.data.series || []).find(x => x.id === sre.dataset.sredit) || null)); render(); $("#sr_titre")?.scrollIntoView({block:"center"}); return; }
  const srp = t.closest("[data-srpause]"); if(srp){ const se = (S.data.series || []).find(x => x.id === srp.dataset.srpause); if(!se) return; const actif = se.actif === false;
    dispatch({t:"serieSet", serie:{id:se.id, actif}, notify:true, txt:`Série « ${se.titre} » ${actif ? "reprise" : "mise en pause"}`}); toast(actif ? "Série reprise" : "Série en pause : plus aucune nouvelle date (celles déjà créées restent)"); return; }
  const srd = t.closest("[data-srdel]"); if(srd){ const se = (S.data.series || []).find(x => x.id === srd.dataset.srdel);
    if(se && confirm(`Supprimer la série « ${se.titre} » ?\nSes dates à venir déjà créées sont supprimées aussi (les événements passés restent).`)){ dispatch({t:"serieDel", id:se.id, notify:true, txt:`Série supprimée : ${se.titre}`}); toast("Série supprimée"); } return; }
  if(t.id === "srSave"){ const se = lireSerieForm();
    if(!se.titre || !se.debut){ toast("Il faut au moins un titre et une première date.", true); return; }
    if(se.lien && !safeUrl(se.lien)){ toast("Le lien doit commencer par https://", true); return; }
    if(se.fin && se.fin < se.debut){ toast("La date de fin est avant la première date.", true); return; }
    const neuf = !se.id; if(neuf){ se.id = uid("sr"); se.par = cfg.me || ""; se.actif = true; se.exclus = []; }
    dispatch({t:"serieSet", serie:se, notify:true, txt:`Série ${neuf ? "créée" : "modifiée"} : ${se.titre} (${rythmeTxt(se)})`});
    S.serieEdit = null; render(); toast(`${neuf ? "Série créée" : "Série enregistrée"} : les dates des ${se.avance} prochains jours sont déjà dans la liste`); return; }
  if(t.id === "evNew"){ S.sansRestaurer = true; S.evEdit = {participants:[], type:"Raid train", public:true, discord:true}; render(); setTimeout(() => $("#ev_titre")?.focus(), 0); return; }
  if(t.id === "evRelever"){ if(S.mode !== "github"){ toast("Il faut être connecté à GitHub.", true); return; } notifyRobot(); toast("Robot lancé : les nouvelles inscriptions arrivent d'ici une à deux minutes."); return; }
  if(t.id === "evCancel"){ S.evEdit = null; render(); return; }
  const cop = t.closest("[data-copier]");
  if(cop){ e.preventDefault(); const u = cop.dataset.copier; (navigator.clipboard?.writeText(u) || Promise.reject()).then(() => toast("Lien copié : collé dans Discord, il affiche l'avatar et la bio"), () => prompt("Copie ce lien :", u)); return; }
  const evl = t.closest("[data-evlien]");
  if(evl){ const e = (S.data.agenda || []).find(x => x.id === evl.dataset.evlien); if(!e) return;
    // page de partage générée par le robot (aperçu avec le titre et la date dans Discord), qui renvoie vers la vitrine
    const url = /^[A-Za-z0-9_-]{1,80}$/.test(e.id) ? `${VITRINE_URL()}e/${e.id}` : `${VITRINE_URL()}?ev=${encodeURIComponent(e.id)}`;
    const ok = () => toast(joursAvant(e.date) > 60 ? "Lien copié. L'événement apparaîtra dans la liste de la vitrine 60 jours avant sa date." : "Lien copié : colle-le où tu veux (Discord, réseaux…). Un événement tout juste créé a son aperçu après le prochain passage du robot.");
    (navigator.clipboard?.writeText(url) || Promise.reject()).then(ok, () => prompt("Copie ce lien :", url)); return; }
  const eed = t.closest("[data-evedit]"); if(eed){ S.sansRestaurer = true; S.evEdit = JSON.parse(JSON.stringify((S.data.agenda || []).find(x => x.id === eed.dataset.evedit) || null)); if(S.evEdit) S.evEdit._pplAvant = [...(S.evEdit.participants || [])]; render(); window.scrollTo(0, 0); return; }
  const edl = t.closest("[data-evdel]"); if(edl){ const e = (S.data.agenda || []).find(x => x.id === edl.dataset.evdel); if(e && confirm(`Supprimer l'événement « ${e.titre} » ?`)){ dispatch({t:"agendaDel", id:e.id, notify:true, txt:`Événement supprimé : ${e.titre}`}); toast("Événement supprimé"); } return; }
  const epl = t.closest("[data-evppl]"); if(epl && S.evEdit){ S.evEdit = {...lireEvForm(), participants:(S.evEdit.participants || []).filter(l => l !== epl.dataset.evppl)}; render(); return; }
  if(t.id === "evSave"){ const e = lireEvForm();
    if(!e.titre || !e.date){ toast("Il faut au moins un titre et une date.", true); return; }
    if(e.lien && !safeUrl(e.lien)){ toast("Le lien doit commencer par https://", true); return; }
    const neuf = !e.id; if(neuf){ e.id = uid("ev_"); e.par = cfg.me || ""; }
    // si la date ou l'heure change, les annonces Discord repartent
    const ancien = (S.data.agenda || []).find(x => x.id === e.id);
    const pplAvant = e._pplAvant; delete e._pplAvant;
    delete e.annonceVeille; delete e.annonceJour; delete e.publieDiscord; delete e.viaDiscord; delete e.discordInconnus;   // ces drapeaux appartiennent au robot : on ne les renvoie pas (valeurs peut-être périmées)
    if(ancien && (ancien.date !== e.date || ancien.heure !== e.heure)){ e.annonceVeille = false; e.annonceJour = false; }
    dispatch({t:"agendaSet", ev:e, ...(pplAvant ? {pplAvant} : {}), ...(neuf ? {} : {edition:true}), notify:true, txt:`Événement ${neuf ? "créé" : "modifié"} : ${e.titre} (${fmtDate(e.date)}${e.heure ? " " + e.heure : ""})`});
    S.evEdit = null; render(); const aPartager = e.publierDiscord && (!ancien?.publieDiscord || ancien.publieDiscord.date !== e.date || (ancien.publieDiscord.heure || "") !== (e.heure || ""));
    toast(`${neuf ? "Événement créé" : "Événement enregistré"}${aPartager ? " · publication Discord d'ici 2 minutes" : ""}${e.public !== false ? " · sur la vitrine d'ici 2 à 3 minutes" : ""}`); return; }
  const rpf = t.closest("[data-rpf]"); if(rpf){ S.f.rpMiens = rpf.dataset.rpf === "1"; render(); return; }
  const rpd = t.closest("[data-rpdone]");
  if(rpd){ e.stopPropagation(); const c = rpd.dataset.rpc || S.drawer?.c, id = rpd.dataset.rpid || S.drawer?.id; const r = S.data[c]?.find(x => x.id === id); if(!r) return;
    const rp = (r.rappels || []).find(x => x.id === rpd.dataset.rpdone); if(!rp) return;
    dispatch({t:"rappelDel", c, id, rid:rp.id, txt:`${r.login} · Rappel fait : ${rp.texte}`}); renderDrawer(); toast("Rappel marqué comme fait"); return; }
  const rvo = t.closest("[data-revoir]");
  if(rvo && S.drawer?.c === "propositions"){ const r = S.data.propositions.find(x => x.id === S.drawer.id); if(!r) return;
    const n = Number(rvo.dataset.revoir), dt = new Date(); dt.setDate(1); dt.setMonth(dt.getMonth() + n);
    dt.setDate(Math.min(new Date().getDate(), new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate()));   // 31 août + 6 mois = 28 février
    const date = jourLocal(dt), texte = `Revoir ce refus${r.motifRefus ? ` (motif : ${r.motifRefus})` : ""} : où en est la chaîne ? Reproposer si ça vaut le coup.`.slice(0, 200);
    S.lot = true;
    try { for(const x of (r.rappels || []).filter(x => x.revoir)) dispatch({t:"rappelDel", c:"propositions", id:r.id, rid:x.id});
      dispatch({t:"rappelAdd", c:"propositions", id:r.id, rp:{id:uid("rp_"), date, texte, revoir:true}, txt:`${r.login} · à revoir le ${fmtDate(date)}`}); }
    finally { S.lot = false; }
    updateSync(); render(); renderDrawer(); toast(`${r.login} : à revoir le ${fmtDate(date)}`); return; }
  if(t.id === "rpAdd" && S.drawer){ const {c, id} = S.drawer; const r = S.data[c].find(x => x.id === id); if(!r) return;
    const date = $("#rpDate").value, texte = $("#rpTexte").value.trim();
    if(!date || !texte){ toast("Indique une date et ce qu'il faudra faire.", true); return; }
    dispatch({t:"rappelAdd", c, id, rp:{id:uid("rp_"), date, texte}, txt:`${r.login} · Rappel ajouté pour le ${fmtDate(date)} : ${texte}`});
    $("#rpTexte").value = ""; document.activeElement?.blur(); renderDrawer(); setTimeout(() => $("#rpTexte")?.focus(), 0); toast(`Rappel ajouté pour le ${fmtDate(date)}`); return; }
  const rp = t.closest("[data-refpick]");
  if(rp && S.drawer){ const r = S.data.membres.find(x => x.id === S.drawer.id); if(r){ patch("membres", r.id, {referent:rp.dataset.refpick}, `${r.login} · Référent staff : ${rp.dataset.refpick}`); renderDrawer(); } return; }
  const vb = t.closest("[data-vue]");
  if(vb){ const v = vuesDe(vb.dataset.vview).find(x => x.id === vb.dataset.vue); if(v){ for(const k of VUE_CHAMPS[vb.dataset.vview]) if(k in (v.f || {})) S.f[k] = JSON.parse(JSON.stringify(v.f[k])); S.sel.clear(); render(); } return; }
  const vm = t.closest("[data-vuemenu]"); if(vm){ S.vueMenu = S.vueMenu === vm.dataset.vuemenu ? null : vm.dataset.vuemenu; render(); if(S.vueMenu) $("#vueNom")?.focus(); return; }
  const vs = t.closest("[data-vuesave]");
  if(vs){ const view = vs.dataset.vuesave, nom = $("#vueNom").value.trim().slice(0, 40), commune = $("#vueCommune").checked;
    if(!nom){ toast("Donne un nom à la vue.", true); $("#vueNom").focus(); return; }
    const v = {id:uid("v_"), nom, view, f:JSON.parse(JSON.stringify(etatVue(view)))};
    if(commune) dispatch({t:"vuesCommunes", liste:[...(S.data.settings.vuesCommunes || []).filter(x => !(x.view === view && x.nom === nom)), v], noUndo:true, txt:`Vue commune « ${nom} » enregistrée`});
    else enregistrerVuesPerso([...vuesPerso().filter(x => !(x.view === view && x.nom === nom)), v], `Vue « ${nom} » enregistrée`);
    S.vueMenu = null; render(); toast(`Vue « ${nom} » enregistrée`); return; }
  const vd = t.closest("[data-vuedel]");
  if(vd){ const id = vd.dataset.vuedel, v = vuesDe(vd.dataset.vview).find(x => x.id === id); if(!v || !confirm(`Supprimer la vue « ${v.nom} »${v.commune ? " pour tout le staff" : ""} ?`)) return;
    if(v.commune) dispatch({t:"vuesCommunes", liste:(S.data.settings.vuesCommunes || []).filter(x => x.id !== id), noUndo:true, txt:`Vue commune « ${v.nom} » supprimée`});
    else enregistrerVuesPerso(vuesPerso().filter(x => x.id !== id), `Vue « ${v.nom} » supprimée`);
    render(); return; }
  const cm = t.closest("[data-colmenu]"); if(cm){ S.colMenu = S.colMenu === cm.dataset.colmenu ? null : cm.dataset.colmenu; render(); return; }
  if(t.matches("[data-col]")){ const v = S.view; colPrefs[v] = {...(colPrefs[v] || {}), [t.dataset.col]: t.checked}; store.set(COLS_KEY, colPrefs); render(); return; }
  const cr = t.closest("[data-colreset]"); if(cr){ delete colPrefs[cr.dataset.colreset]; store.set(COLS_KEY, colPrefs); render(); return; }
  const ex = t.closest("[data-export]"); if(ex){ exportCsv(ex.dataset.export); return; }
  const td = t.closest("[data-tagdel]");
  if(td && S.drawer){ const r = S.data[S.drawer.c].find(x => x.id === S.drawer.id); if(!r) return;
    patch(S.drawer.c, r.id, {tags:(r.tags || []).filter(x => x !== td.dataset.tagdel)}, `${r.login} · Étiquette retirée : ${td.dataset.tagdel}`); renderDrawer(); return; }
  if(t.id === "importOpen"){ S.importOpen = !S.importOpen; render(); return; }
  if(t.id === "importClose"){ S.importOpen = false; S.importRes = null; render(); return; }
  if(t.id === "importAnalyse"){ S.importText = $("#importText").value; S.importPar = $("#importPar").value; S.importSt = $("#importSt").value; S.importRes = parseImport(S.importText); render(); return; }
  if(t.id === "importGo"){
    const r = parseImport($("#importText").value); const par = $("#importPar").value.trim(), st = $("#importSt").value;
    if(!r.nouveaux.length) return;
    if(!confirm(`Créer ${r.nouveaux.length} proposition${r.nouveaux.length > 1 ? "s" : ""} ?\n${r.nouveaux.join(", ")}`)) return;
    r.nouveaux.forEach(l => dispatch({t:"add", c:"propositions", notify:true, r:{id:uid("p_"), login:l, contact:"", proposePar:par, dateProposition:todayISO(), dateRevue:null, dateInvitation:null, hype:"", followsRevue:null, viewersMoyens:null, statut:st, avis:{}, commentaire:""}}));
    dispatch({t:"note", txt:`Import de ${r.nouveaux.length} proposition${r.nouveaux.length > 1 ? "s" : ""} : ${r.nouveaux.join(", ")}`});
    S.importOpen = false; S.importRes = null; S.importText = ""; render(); toast(`${r.nouveaux.length} proposition${r.nouveaux.length > 1 ? "s" : ""} créée${r.nouveaux.length > 1 ? "s" : ""}`); return;
  }
  const tr = t.closest("[data-trash]");
  if(tr){ const x = (S.data.corbeille || []).find(y => y.r.id === tr.dataset.id); if(!x) return;
    if(tr.dataset.trash === "restore") restoreFiches([x.r.id]);
    else if(confirm(`Supprimer définitivement ${x.r.login} ? Impossible à annuler depuis la page.`)){ dispatch({t:"purge", id:x.r.id, txt:`Suppression définitive de ${x.r.login} (corbeille)`}); toast(`${x.r.login} supprimé définitivement`); }
    return; }
  const nav = t.closest("#nav button"); if(nav){ S.view = nav.dataset.view; S.drawer = null; render(); window.scrollTo(0,0); return; }
  if(t.closest("[data-close]")){ S.drawer = null; renderDrawer(); return; }
  const sortTh = t.closest("th[data-sort]");
  if(sortTh){ const k = S.view === "propositions" ? "psort" : "msort"; const key = sortTh.dataset.sort;
    S.f[k] = [key, S.f[k][0] === key ? -S.f[k][1] : 1]; render(); return; }
  const open = t.closest("[data-open]"); if(open && (!t.closest("a") || t.closest("a").matches("[data-open]"))){ e.preventDefault(); S.msgSel = null; const [c,id] = open.dataset.open.split(":"); S.drawer = {c,id}; renderDrawer(); setTimeout(() => $(".drawer .btn[data-close]")?.focus(), 0); return; }
  const pst = t.closest("[data-pst]"); if(pst && !pst.matches("[data-goto]")){ S.f.pst = pst.dataset.pst; render(); return; }
  const mst = t.closest("[data-mst]"); if(mst && !mst.matches("[data-goto]")){ S.f.mst = mst.dataset.mst; render(); return; }
  if(t.closest('[data-act="live"]')){ loadLive(true); return; }
  const av = t.closest("[data-avis]");
  if(av && S.drawer){ const cur = S.data.propositions.find(x => x.id === S.drawer.id)?.avis?.[av.dataset.avis];
    const v = cur === av.dataset.v ? "" : av.dataset.v;
    patch("propositions", S.drawer.id, {["avis."+av.dataset.avis]: v}, `Avis de ${av.dataset.avis} sur ${S.data.propositions.find(x=>x.id===S.drawer.id).login} : ${v || "retiré"}`); return; }
  const act = t.closest("[data-act]");
  if(act && S.drawer){
    const {c, id} = S.drawer; const r = S.data[c].find(x => x.id === id);
    if(act.dataset.act === "delete"){ if(confirm(`Supprimer ${r.login} ? La fiche part dans la corbeille (30 jours, dans Réglages).`)){ dispatch({t:"del", c, id, txt:`Suppression de ${r.login} (${c === "propositions" ? "proposition" : "streamers"})`}); S.drawer = null; renderDrawer();
      toast(`${r.login} mis à la corbeille`, false, {label:"Annuler", fn:() => restoreFiches([id])}); } }
    if(act.dataset.act === "suggest"){
      const v = act.dataset.v; const extra = {};
      if(!r.dateRevue) extra.dateRevue = todayISO();
      patch("propositions", id, {statut:v, ...extra}, `${r.login} · Statut : ${v} (suggestion des avis)`);
      if(v === "Accepté") toast(`${r.login} accepté : tu peux maintenant le transférer dans Streamers`);
      return;
    }
    if(act.dataset.act === "repropose"){
      if(!confirm(`Reproposer ${r.login} ? La candidature actuelle (statut, avis, commentaire) sera archivée dans l'historique.`)) return;
      const arch = {le:todayISO(), statut:r.statut, proposePar:r.proposePar, dateProposition:r.dateProposition, avis:r.avis || {}, commentaire:r.commentaire || "", ...(r.motifRefus ? {motifRefus:r.motifRefus} : {})};
      patch("propositions", id, {historique:[...(r.historique || []), arch], statut:"Proposition à faire", proposePar:cfg.me || "", dateProposition:todayISO(), dateRevue:null, dateInvitation:null, avis:{}, commentaire:"", motifRefus:""}, `${r.login} reproposé (ancienne candidature : ${r.statut})`);
      for(const x of (r.rappels || []).filter(x => x.revoir)) dispatch({t:"rappelDel", c:"propositions", id, rid:x.id, txt:`${r.login} · rappel « à revoir » retiré (reproposé)`});
      toast(`${r.login} est de nouveau en proposition`); return;
    }
    if(act.dataset.act === "transfer"){
      if(!confirm(`Transférer ${r.login} dans Streamers ?\nLa fiche quitte les Propositions ; sa candidature (parrain, avis, commentaire) est conservée dans l'historique de sa fiche streamer.`)) return;
      const today = todayISO();
      const candidature = {proposePar:r.proposePar||"", contact:r.contact||"", dateProposition:r.dateProposition||null, dateRevue:r.dateRevue||today,
        dateInvitation:r.dateInvitation||today, avis:r.avis||{}, commentaire:r.commentaire||"", historique:r.historique||[], transfereLe:today, transferePar:cfg.me||""};
      const nm = {id:uid("m_"), login:r.login, discord:"", alerte:false, premierStream:null, annivConfirme:false, annivCommentaire:"", arrivee:today, depart:null,
        statut:"Présent", role:"Streamer", followsMode:"auto", followsManuel:null, notes:"", candidature};
      dispatch({t:"add", c:"membres", r:nm, notify:true, txt:`${r.login} accepté et transféré dans Streamers${r.proposePar ? " (proposé par " + r.proposePar + ")" : ""}`});
      dispatch({t:"del", c:"propositions", id, noTrash:true});
      S.drawer = {c:"membres", id:nm.id}; renderDrawer();
      toast(`${r.login} est maintenant dans Streamers`);
    }
    return;
  }
  if(t.id === "addProp" || t.id === "addMember"){
    const c = t.id === "addProp" ? "propositions" : "membres";
    const raw = prompt("Nom de la chaîne Twitch ou lien de la chaîne :"); if(!raw) return;
    const login = normLogin(raw); if(!/^[a-z0-9_]{2,25}$/.test(login)){ toast("Ce nom de chaîne n'est pas valide.", true); return; }
    const dupP = S.data.propositions.find(p => p.login === login), dupM = S.data.membres.find(m => m.login === login);
    const dup = c === "propositions" ? dupP : dupM;
    if(dup && c === "propositions"){
      const av = Object.entries(dupP.avis || {}).map(([k,v]) => `${k} : ${v}`).join(", ");
      if(["Refusé","Abandonnée","Aucun contact"].includes(dupP.statut)){
        if(confirm(`${login} a déjà été proposée${dupP.dateProposition ? " le " + fmtDate(dupP.dateProposition) : ""}${dupP.proposePar ? " par " + dupP.proposePar : ""}.\nStatut : ${dupP.statut}${av ? "\nAvis : " + av : ""}${dupP.commentaire ? "\nCommentaire : " + dupP.commentaire : ""}\n\nOuvrir sa fiche pour la reproposer ?`)){ S.drawer = {c, id:dup.id}; renderDrawer(); }
        return;
      }
      toast(`${login} est déjà en proposition (${dupP.statut || "à trier"}).`); S.drawer = {c, id:dup.id}; renderDrawer(); return;
    }
    if(dup){ toast(`${login} est déjà dans la liste.`); S.drawer = {c, id:dup.id}; renderDrawer(); return; }
    if(c === "propositions" && dupM && !confirm(dupM.statut === "Parti"
      ? `${login} a quitté La Cabane${dupM.depart ? " le " + fmtDate(dupM.depart) : ""}. L'ajouter quand même aux propositions ?`
      : `${login} fait déjà partie de La Cabane. L'ajouter quand même aux propositions ?`)) return;
    const r = c === "propositions"
      ? {id:uid("p_"), login, contact:"", proposePar:cfg.me||"", dateProposition:todayISO(), dateRevue:null, dateInvitation:null, hype:"", followsRevue:null, viewersMoyens:null, statut:"Proposition à faire", avis:{}, commentaire:""}
      : {id:uid("m_"), login, discord:"", alerte:false, premierStream:null, annivConfirme:false, annivCommentaire:"", arrivee:todayISO(), depart:null, statut:"Présent", role:"Streamer", followsMode:"auto", followsManuel:null, notes:""};
    if(c === "membres") r.creePar = cfg.me || "";
    dispatch({t:"add", c, r, notify:true, txt:`Ajout de ${login} (${c === "propositions" ? "proposition" : "streamers"})`});
    S.drawer = {c, id:r.id}; renderDrawer(); return;
  }
  if(t.id === "snapBtn"){
    const follows = {}; let n = 0;
    S.data.membres.filter(m => m.statut !== "Parti").forEach(m => { const f = currentFollows(m); if(f != null){ follows[m.login] = f; n++; } });
    if(!n){ toast("Aucun follow lu : clique d'abord sur « Actualiser Twitch ».", true); return; }
    dispatch({t:"snapshot", s:{date:todayISO(), source:cfg.me||"", follows}, txt:`Relevé des follows du ${fmtDate(todayISO())} (${n} chaînes)`});
    toast(`Relevé enregistré pour ${n} chaînes`); return;
  }
  if(t.id === "c_save"){
    Object.assign(cfg, {owner:$("#c_owner").value.trim(), repo:$("#c_repo").value.trim(), branch:$("#c_branch").value.trim()||"main",
      path:$("#c_path").value.trim()||"cabane-data.json", token:$("#c_token").value.trim(), me:$("#c_me").value, remember:$("#c_remember").checked, tokenExpire:$("#c_exp").value || ""});
    saveCfg(); connectGithub().then(() => { if(S.mode === "github"){ toast("Connecté"); S.view = cfg.me ? "accueil" : "reglages"; render(); if(!cfg.me) toast("Choisis ton prénom dans « Je suis » puis reconnecte-toi.", true); } }); return;
  }
  if(t.id === "twIn"){ twitchLogin(); return; }
  if(t.id === "twOut"){ twitchLogout(); return; }
  if(t.id === "s_twsave"){ dispatch({t:"settings", p:{twitchClientId:$("#s_twcid").value.trim()}, txt:"Client ID Twitch modifié"}); S.twIds = {}; toast("Client ID enregistré"); return; }
  const ancre = t.closest('.aide nav.som a'); if(ancre){ e.preventDefault(); document.querySelector(ancre.getAttribute("href"))?.scrollIntoView({behavior:"smooth"}); return; }
  const go = t.closest("[data-goto]"); if(go){ e.preventDefault(); S.view = go.dataset.goto; S.drawer = null;
    if(go.dataset.mst !== undefined) S.f.mst = go.dataset.mst; if(go.dataset.pst !== undefined) S.f.pst = go.dataset.pst;
    render(); if(go.dataset.ancre && document.getElementById(go.dataset.ancre)) ouvrirReglage(go.dataset.ancre); else window.scrollTo(0,0); return; }
  const pt = t.closest("[data-plitout]");
  if(pt){ const o = pt.dataset.plitout === "1"; document.querySelectorAll("details[data-pli]").forEach(x => { x.open = o; noterPli(x.dataset.pli, o); }); return; }
  const rg = t.closest("[data-reglgrp]");
  if(rg){ e.preventDefault(); document.getElementById("grp-" + rg.dataset.reglgrp)?.scrollIntoView({block:"start", behavior:matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"}); return; }
  if(t.id === "installApp" && installEvt){ const ev = installEvt; installEvt = null; ev.prompt(); ev.userChoice?.finally(() => render()); return; }
  if(t.id === "relancerRobot"){ t.disabled = true; notifyRobot().then(ok => { t.disabled = false;
      toast(ok ? "Robot relancé : il passe d'ici 1 à 2 minutes, la page se mettra à jour toute seule." : "Relance refusée par GitHub : vérifie ton jeton (Réglages) ou relance depuis l'onglet Actions du dépôt cabane.", !ok); }); return; }
  if(t.id === "c_pull"){ if(S.pending.length){ toast("Envoi des modifications en attente…"); save(); } else pull(false); return; }
  if(t.id === "c_logout"){ if(S.saving){ toast("Enregistrement en cours : réessaie dans un instant.", true); return; }
    if(S.pending.length && !confirm("Des modifications ne sont pas encore enregistrées : elles seront perdues. Se déconnecter quand même ?")) return;
    clearTimeout(saveTimer); clearTimeout(reveilT); reveilT = null; S.pending = []; S.backups = null; S.conflits = []; store.del(HL_KEY); S.horsLigne = null; S.copieSha = null; S.rel = null;
    cfg.token = ""; saveCfg(); S.mode = "none"; S.data = null; S.sha = null; render(); updateSync(); return; }
  if(t.id === "exportBtn"){ exportJson(); return; }
  if(t.id === "recapGo"){
    S.recapMonth = $("#recapMonth").value;
    drawRecap(S.recapMonth).then(cv => { if(S.recapUrl) URL.revokeObjectURL(S.recapUrl);
      cv.toBlob(b => { S.recapBlob = b; S.recapUrl = URL.createObjectURL(b); render(); }, "image/png"); });
    return;
  }
  if(t.id === "recapCopy"){
    try { navigator.clipboard.write([new ClipboardItem({"image/png": S.recapBlob})]).then(() => toast("Image copiée : colle-la dans Discord (Ctrl+V)"), () => toast("Copie refusée par le navigateur : utilise Télécharger.", true)); }
    catch { toast("Copie impossible sur ce navigateur : utilise Télécharger.", true); }
    return;
  }
  if(t.id === "v_save"){
    const lien = $("#v_discord").value.trim();
    if(lien && !/^https:\/\/(discord\.gg|discord\.com\/invite)\//i.test(lien)){ toast("Le lien Discord doit commencer par https://discord.gg/ ou https://discord.com/invite/", true); return; }
    dispatch({t:"settings", notify:true, p:{"vitrine.active":$("#v_active").checked, "vitrine.titre":$("#v_titre").value.trim() || "La Cabane", "vitrine.texte":$("#v_texte").value.trim(), "vitrine.lienDiscord":lien,
      "vitrine.rejoindre":{actif:$("#v_rej").checked, titre:$("#v_rejtitre").value.trim() || "Rejoindre La Cabane", texte:$("#v_rejtexte").value.trim()}}, txt:`Vitrine publique ${$("#v_active").checked ? "activée / modifiée" : "désactivée"}`});
    toast($("#v_active").checked ? "Vitrine enregistrée : le robot la publiera à son prochain passage" : "Vitrine désactivée : le robot la retirera à son prochain passage"); return;
  }
  if(t.id === "bkRefresh"){ listerSauvegardes(); return; }
  if(t.id === "bkNow"){ t.disabled = true; sauvegarder("manuel").then(n => { toast("Sauvegarde faite"); listerSauvegardes(); }, e => { toast(e.message, true); t.disabled = false; }); return; }
  const bkb = t.closest("[data-bk]");
  if(bkb){ const f = bkb.dataset.f;
    if(bkb.dataset.bk === "dl"){ lireSauvegarde(f).then(d => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 1)], {type:"application/json"})); a.download = f; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }, e => toast(e.message, true)); return; }
    if(!confirm(`Restaurer la sauvegarde du ${nomSauvegarde(f).replace(/<[^>]+>/g,"")} ?\n\nToutes les modifications faites depuis seront remplacées, pour tout le staff. L'état actuel est sauvegardé juste avant.`)) return;
    (async () => { try {
      await sauvegarder("avantrestauration");
      const d = await lireSauvegarde(f);
      d.journal = d.journal || []; d.journal.unshift({le:new Date().toISOString(), par:cfg.me || "?", txt:`Restauration de la sauvegarde ${f}`});
      await forceReplace(d); listerSauvegardes();
    } catch(e){ toast(e.message, true); } })();
    return; }
  if(t.id === "tplAdd"){ S.sansRestaurer = true; S.tplEdit = [...lireModeles(), {nom:"Nouveau modèle", pour:"tous", texte:"Coucou {pseudo} !\n"}]; render(); return; }
  const tdl = t.closest("[data-tpldel]"); if(tdl){ const m = lireModeles(); m.splice(Number(tdl.dataset.tpldel), 1); S.sansRestaurer = true; S.tplEdit = m; render(); return; }
  if(t.id === "tplReset"){ S.sansRestaurer = true; S.tplEdit = JSON.parse(JSON.stringify(MODELES_DEFAUT)); render(); toast("Modèles d'origine remis : clique sur Enregistrer pour les garder"); return; }
  if(t.id === "tplSave"){ const m = lireModeles(); dispatch({t:"settings", p:{modeles:m}, txt:`Modèles de messages modifiés (${m.length})`}); S.tplEdit = null; toast("Modèles enregistrés"); return; }
  if(t.id === "msgClose"){ S.msgSel = null; renderDrawer(); return; }
  const msu = t.closest("[data-msgsugg]"); if(msu && S.drawer){ S.msgSel = {id:S.drawer.id, i:Number(msu.dataset.msgsugg)}; renderDrawer(); return; }
  if(t.id === "msgCopy"){ const txt = $("#msgText").value;
    const ok = () => { toast("Message copié : colle-le dans Discord (Ctrl+V)");
      // trace sur la fiche : évite que deux membres du staff envoient le même message
      const dr = S.drawer, r = dr && S.data[dr.c]?.find(x => x.id === dr.id), nom = modeles()[S.msgSel?.i]?.nom;
      if(r && nom){ const der = (r.messages || []).at(-1);
        if(!(der && der.nom === nom && der.par === (cfg.me || "?") && Date.now() - new Date(der.le) < 30 * 60e3))
          dispatch({t:"patch", c:dr.c, id:r.id, p:{messages:[...(r.messages || []).slice(-9), {nom, le:new Date().toISOString(), par:cfg.me || "?"}]}, noUndo:true, txt:`${r.login} · message « ${nom} » copié`}); } };
    (navigator.clipboard?.writeText(txt) || Promise.reject()).then(ok, () => { const ta = $("#msgText"); ta.focus(); ta.select(); try { document.execCommand("copy") ? ok() : toast("Copie refusée : sélectionne le texte et copie-le à la main.", true); } catch { toast("Copie refusée : sélectionne le texte et copie-le à la main.", true); } });
    return; }
  if(t.id === "s_jetsave"){
    const jetons = [], bad = [];
    $("#s_jetons").value.split("\n").map(l => l.trim()).filter(Boolean).forEach(l => {
      const m = /^(.+?)\s*[;,]\s*(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})$/.exec(l);
      if(!m){ bad.push(l); return; }
      let dt = m[2]; if(dt.includes("/")){ const [jj, mm, aa] = dt.split("/"); dt = `${aa}-${mm.padStart(2,"0")}-${jj.padStart(2,"0")}`; }
      if(isNaN(new Date(dt + "T12:00:00"))){ bad.push(l); return; }
      jetons.push({nom:m[1].trim(), expire:dt}); });
    if(bad.length){ toast(`Ligne illisible : « ${bad[0]} » (format : Nom ; JJ/MM/AAAA ou AAAA-MM-JJ)`, true); return; }
    dispatch({t:"settings", p:{jetons}, txt:"Liste des jetons distribués modifiée"}); toast("Liste des jetons enregistrée"); return;
  }
  if(t.id === "s_save"){
    const lines = id => $("#"+id).value.split("\n").map(s => s.trim()).filter(Boolean);
    dispatch({t:"settings", p:{nom:$("#s_nom").value.trim(), staff:lines("s_staff"), statutsProposition:lines("s_statuts"), roles:lines("s_roles"), liens:lines("s_liens"), integration:lines("s_integ").map(x => x.replace(/\./g, "·")), stagnationJours:Math.max(3, Number($("#s_stag").value) || 14)}, txt:"Listes modifiées"});
    ensureShape(); toast("Listes enregistrées"); return;
  }
});
