// La Cabane · page staff · Ajout d'une chaîne (proposition ou streamer) avec vérification immédiate sur Twitch.
// Scripts classiques chargés dans l'ordre par index.html : ils partagent les mêmes variables globales.

/* ============ Fenêtre d'ajout ============ */
// En tapant le pseudo, la page vérifie tout de suite sur Twitch que la chaîne existe (avatar, nom, statut, follows)
// et prévient si elle est déjà dans La Cabane ou déjà proposée.
const AJ = {c:null, login:"", infos:null, etat:"", t:null, n:0};
function ouvrirAjout(c){
  Object.assign(AJ, {c, login:"", infos:null, etat:""});
  $("#ajoutRoot").innerHTML = `<div class="ajout-ov" data-ajfermer>
    <div class="ajout" role="dialog" aria-modal="true" aria-labelledby="ajTitre">
      <h2 id="ajTitre">${c === "propositions" ? "Proposer une chaîne" : "Ajouter un streamer"}</h2>
      <label class="f">Pseudo Twitch ou lien de la chaîne<input id="ajLogin" autocomplete="off" spellcheck="false" placeholder="ex. aulit42369 ou https://twitch.tv/aulit42369"></label>
      <div id="ajApercu" class="aj-apercu" aria-live="polite"><p class="meta">L'aperçu de la chaîne apparaît ici.</p></div>
      <div class="tools" style="margin:14px 0 0;justify-content:flex-end"><button type="button" class="btn ghost" data-ajfermer>Annuler</button><button type="button" class="btn primary" id="ajOk" disabled>Ajouter</button></div>
    </div></div>`;
  setTimeout(() => $("#ajLogin")?.focus(), 0);
}
const fermerAjout = () => { clearTimeout(AJ.t); $("#ajoutRoot").innerHTML = ""; };
function majAjout(){
  const box = $("#ajApercu"), ok = $("#ajOk"); if(!box) return;
  const l = AJ.login, d = S.data, valide = /^[a-z0-9_]{2,25}$/.test(l);
  const dupP = d.propositions.find(p => p.login === l), dupM = d.membres.find(m => m.login === l);
  const dup = dupM ? `<p class="warn">⚠ Déjà dans Streamers (${esc(dupM.statut || "à renseigner")}).</p>` : dupP ? `<p class="warn">⚠ Déjà proposée (${esc(dupP.statut || "à trier")}${dupP.dateProposition ? ", le " + fmtDate(dupP.dateProposition) : ""}).</p>` : "";
  const i = AJ.infos;
  box.innerHTML = !l ? `<p class="meta">L'aperçu de la chaîne apparaît ici.</p>`
    : !valide ? `<p class="down">Ce n'est pas un pseudo Twitch valide (2 à 25 caractères : lettres, chiffres, _).</p>`
    : AJ.etat === "lecture" ? `<p class="meta">Vérification sur Twitch…</p>${dup}`
    : AJ.etat === "absent" ? `<p class="down">Aucune chaîne Twitch « ${esc(l)} » : vérifie l'orthographe.</p>${dup}`
    : i ? `<div class="aj-carte">${i.avatar ? `<img src="${esc(i.avatar)}" alt="" referrerpolicy="no-referrer">` : `<span class="av big" aria-hidden="true">${esc(l[0])}</span>`}
        <div><b>${esc(i.nom || l)}</b> ${i.type === "partner" ? `<span class="tag par">partenaire</span>` : i.type === "affiliate" ? `<span class="tag aff">affilié</span>` : ""}
        <span class="meta" style="display:block;margin:2px 0 0">${i.follows != null ? `${esc(i.follows)} follows` : "follows non lus"}${i.id ? " · chaîne vérifiée" : ""}</span>
        ${i.bio ? `<span class="bio">${esc(i.bio.slice(0, 160))}</span>` : ""}</div></div>${dup}`
    : `<p class="meta">Impossible de vérifier pour l'instant (Twitch ne répond pas) : tu peux l'ajouter quand même.</p>${dup}`;
  ok.disabled = !valide || AJ.etat === "lecture";
  const memeListe = AJ.c === "propositions" ? dupP : dupM;
  ok.textContent = memeListe ? "Ouvrir la fiche existante" : AJ.etat === "absent" ? "Ajouter quand même" : "Ajouter";
}
async function verifierChaine(l){
  const n = ++AJ.n; AJ.etat = "lecture"; AJ.infos = null; majAjout();
  let infos = null, absent = false;
  try {
    if(twitchOn()){
      const u = (await helix(`users?login=${encodeURIComponent(l)}`)).data[0];
      if(!u) absent = true;
      else { infos = {id:u.id, nom:u.display_name, avatar:u.profile_image_url, type:u.broadcaster_type || "", bio:u.description || "", follows:null};
        try { infos.follows = (await helix(`channels/followers?broadcaster_id=${u.id}&first=1`)).total ?? null; } catch {} }
    } else {
      const a = await fetchText(`https://decapi.me/twitch/avatar/${encodeURIComponent(l)}`);
      if(!/^https:\/\//.test(a)) absent = /not found|introuvable|does not exist/i.test(a);
      else { infos = {avatar:a, nom:l, follows:null};
        try { const f = await fetchText(`https://decapi.me/twitch/followcount/${encodeURIComponent(l)}`); if(/^\d[\d,\s]*$/.test(f)) infos.follows = parseInt(f.replace(/\D/g, ""), 10); } catch {} }
    }
  } catch {}
  if(n !== AJ.n) return;                                       // la saisie a changé entre-temps
  AJ.infos = infos; AJ.etat = absent ? "absent" : infos ? "ok" : "inconnu";
  if(infos?.avatar) S.avatars[l] = infos.avatar;
  majAjout();
}
document.addEventListener("input", e => { if(e.target.id !== "ajLogin") return;
  AJ.login = normLogin(e.target.value); clearTimeout(AJ.t); AJ.etat = ""; AJ.infos = null; majAjout();
  if(/^[a-z0-9_]{2,25}$/.test(AJ.login)) AJ.t = setTimeout(() => verifierChaine(AJ.login), 450); });
document.addEventListener("keydown", e => { if(!$("#ajoutRoot")?.firstChild) return;
  if(e.key === "Escape"){ e.preventDefault(); fermerAjout(); }
  if(e.key === "Enter" && e.target.id === "ajLogin" && !$("#ajOk").disabled){ e.preventDefault(); $("#ajOk").click(); } });
document.addEventListener("click", e => {
  if(e.target.closest("[data-ajfermer]") && (e.target.matches("[data-ajfermer]") || e.target.closest("button[data-ajfermer]"))){ fermerAjout(); return; }
  if(e.target.id === "ajOk"){ const c = AJ.c, raw = AJ.login, infos = AJ.infos; fermerAjout(); ajouterChaine(c, raw, infos); }
});

// Ajout effectif (mêmes contrôles qu'avant : doublons, chaîne déjà membre ou déjà proposée)
function ajouterChaine(c, raw, infos){
  const login = normLogin(raw); if(!/^[a-z0-9_]{2,25}$/.test(login)){ toast("Ce nom de chaîne n'est pas valide.", true); return false; }
  const dupP = S.data.propositions.find(p => p.login === login), dupM = S.data.membres.find(m => m.login === login);
  const dup = c === "propositions" ? dupP : dupM;
  if(dup && c === "propositions"){
    const av = Object.entries(dupP.avis || {}).map(([k,v]) => `${k} : ${v}`).join(", ");
    if(["Refusé","Abandonnée","Aucun contact"].includes(dupP.statut)){
      if(confirm(`${login} a déjà été proposée${dupP.dateProposition ? " le " + fmtDate(dupP.dateProposition) : ""}${dupP.proposePar ? " par " + dupP.proposePar : ""}.\nStatut : ${dupP.statut}${av ? "\nAvis : " + av : ""}${dupP.commentaire ? "\nCommentaire : " + dupP.commentaire : ""}\n\nOuvrir sa fiche pour la reproposer ?`)){ S.drawer = {c, id:dup.id}; renderDrawer(); }
      return false;
    }
    toast(`${login} est déjà en proposition (${dupP.statut || "à trier"}).`); S.drawer = {c, id:dup.id}; renderDrawer(); return false;
  }
  if(dup){ toast(`${login} est déjà dans la liste.`); S.drawer = {c, id:dup.id}; renderDrawer(); return false; }
  if(c === "propositions" && dupM && !confirm(dupM.statut === "Parti"
    ? `${login} a quitté La Cabane${dupM.depart ? " le " + fmtDate(dupM.depart) : ""}. L'ajouter quand même aux propositions ?`
    : `${login} fait déjà partie de La Cabane. L'ajouter quand même aux propositions ?`)) return false;
  const r = c === "propositions"
    ? {id:uid("p_"), login, contact:"", proposePar:cfg.me||"", dateProposition:todayISO(), dateRevue:null, dateInvitation:null, hype:"", followsRevue:null, viewersMoyens:null, statut:"Proposition à faire", avis:{}, commentaire:""}
    : {id:uid("m_"), login, discord:"", alerte:false, premierStream:null, annivConfirme:false, annivCommentaire:"", arrivee:todayISO(), depart:null, statut:"Présent", role:"Streamer", followsMode:"auto", followsManuel:null, notes:""};
  if(c === "membres") r.creePar = cfg.me || "";
  if(infos?.id) r.twitchId = infos.id;                         // chaîne vérifiée : le robot la suit par son identifiant dès le départ
  dispatch({t:"add", c, r, notify:true, txt:`Ajout de ${login} (${c === "propositions" ? "proposition" : "streamers"})`});
  S.drawer = {c, id:r.id}; renderDrawer(); return true;
}
