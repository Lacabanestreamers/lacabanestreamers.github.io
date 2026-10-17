// La Cabane · page staff · Fusion de fiches en double (même chaîne en proposition et en streamer, ou deux fois dans la même liste).
// Scripts classiques chargés dans l'ordre par index.html : ils partagent les mêmes variables globales.

/* ============ Fusion ============ */
// La fiche « source » est fondue dans la fiche « cible », puis part à la corbeille (restaurable).
// Rien ne se perd : avis, historique, rappels, étiquettes, messages copiés, notes et commentaires sont réunis.
const unionPar = (a, b, cle) => [...new Map([...(a || []), ...(b || [])].map(x => [cle(x), x])).values()];
function fusionDe(src, cSrc, cible, cCible){
  const p = {};
  p.tags = [...new Set([...(cible.tags || []), ...(src.tags || [])])];
  p.rappels = unionPar(cible.rappels, src.rappels, x => x.id);
  p.messages = unionPar(cible.messages, src.messages, x => `${x.nom}|${x.le}|${x.par}`).sort((a, b) => a.le.localeCompare(b.le)).slice(-10);
  if(!cible.twitchId && src.twitchId) p.twitchId = src.twitchId;
  if(cCible === "membres"){
    for(const k of ["discord", "discordId", "referent", "premierStream", "role"]) if(!cible[k] && src[k]) p[k] = src[k];
    if(src.arrivee && (!cible.arrivee || src.arrivee < cible.arrivee)) p.arrivee = src.arrivee;
    const notes = [cible.notes, src.notes, cSrc === "propositions" ? src.commentaire : ""].filter(Boolean);
    if(notes.length) p.notes = [...new Set(notes)].join("\n\n");
    if(cSrc === "propositions"){
      // la proposition devient une candidature de la fiche streamer (comme un transfert)
      const cand = {proposePar:src.proposePar || "", contact:src.contact || "", dateProposition:src.dateProposition || null, dateRevue:src.dateRevue || null,
        dateInvitation:src.dateInvitation || null, avis:src.avis || {}, commentaire:src.commentaire || "", historique:src.historique || [], fusionneLe:todayISO(), fusionnePar:cfg.me || ""};
      p.candidature = cible.candidature ? {...cible.candidature, historique:[...(cible.candidature.historique || []), {le:todayISO(), statut:src.statut, ...cand}]} : cand;
    } else {
      p.integ = {...(src.integ || {}), ...(cible.integ || {})};
      if(src.candidature && !cible.candidature) p.candidature = src.candidature;
    }
  } else {
    p.avis = {...(src.avis || {}), ...(cible.avis || {})};
    const com = [cible.commentaire, src.commentaire].filter(Boolean); if(com.length) p.commentaire = [...new Set(com)].join("\n\n");
    p.historique = [...(cible.historique || []), ...(src.historique || []),
      {le:todayISO(), statut:src.statut, proposePar:src.proposePar, dateProposition:src.dateProposition, avis:src.avis || {}, commentaire:src.commentaire || "", fusion:true}];
    for(const k of ["contact", "responsable", "proposePar"]) if(!cible[k] && src[k]) p[k] = src[k];
  }
  return p;
}
function fusionner(cSrc, idSrc, cCible, idCible){
  const src = S.data[cSrc].find(x => x.id === idSrc), cible = S.data[cCible].find(x => x.id === idCible);
  if(!src || !cible || src === cible) return;
  const ou = cCible === "membres" ? "la fiche streamer" : "la proposition la plus ancienne";
  if(!confirm(`Fusionner les deux fiches de ${src.login} ?\n\nTout est réuni dans ${ou} (avis, historique, rappels, étiquettes, notes) ; l'autre fiche part à la corbeille (restaurable).`)) return;
  S.lot = true;
  try {
    dispatch({t:"patch", c:cCible, id:cible.id, p:fusionDe(src, cSrc, cible, cCible), txt:`${cible.login} · fusion avec ${cSrc === "membres" ? "une autre fiche streamer" : "une proposition en double"}`});
    dispatch({t:"del", c:cSrc, id:src.id, txt:`${src.login} · fiche fusionnée (corbeille)`});
  } finally { S.lot = false; }
  updateSync(); render(); toast(`Fiches de ${cible.login} fusionnées`);
}
// Streamers présents deux fois (même identifiant Twitch ou même pseudo)
function membresEnDouble(){
  const vus = new Map(), out = [];
  const cle = m => m.twitchId ? "id:" + m.twitchId : "l:" + m.login.toLowerCase();
  for(const m of [...S.data.membres].sort((a, b) => (a.arrivee || "9").localeCompare(b.arrivee || "9"))){
    const k = cle(m), k2 = "l:" + m.login.toLowerCase(), avant = vus.get(k) || vus.get(k2);
    if(avant) out.push({r:m, c:"membres", info:`même chaîne qu'une autre fiche streamer (arrivée ${avant.arrivee ? fmtDate(avant.arrivee) : "?"})`, fusion:{c:"membres", id:avant.id}});
    else { vus.set(k, m); vus.set(k2, m); }
  }
  return out;
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-fusion]"); if(!b) return;
  e.preventDefault(); const [cSrc, idSrc, cCible, idCible] = b.dataset.fusion.split(":"); fusionner(cSrc, idSrc, cCible, idCible);
});
