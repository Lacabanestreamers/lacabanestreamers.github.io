// La Cabane · page staff · Écran Réglages, panneaux repliables, santé du robot, mode fichier local, écran de bienvenue.
// Scripts classiques chargés dans l'ordre par index.html : ils partagent les mêmes variables globales.
/* ----- Réglages ----- */
function viewReglages(){
  const d = S.data;
  const conn = `
  <section class="panel" id="connexion">
    <h2>Connexion au fichier partagé</h2>
    <p>Les données vivent dans un dépôt GitHub privé. Chaque membre du staff saisit ici un jeton qui a accès à ce dépôt. Le jeton reste dans ce navigateur.</p>
    <div class="grid">
      <label class="f">Propriétaire du dépôt<input id="c_owner" value="${esc(cfg.owner)}" placeholder="Lacabanestreamers" autocomplete="off"></label>
      <label class="f">Dépôt privé<input id="c_repo" value="${esc(cfg.repo)}" placeholder="cabane" autocomplete="off"></label>
      <label class="f">Branche<input id="c_branch" value="${esc(cfg.branch)}"></label>
      <label class="f">Fichier<input id="c_path" value="${esc(cfg.path)}"></label>
      <label class="f full">Jeton GitHub<input id="c_token" type="password" value="${esc(cfg.token)}" placeholder="github_pat_…" autocomplete="off"></label>
      <label class="f">Je suis<select id="c_me"><option value="">— choisir —</option>${(d?.settings.staff || []).map(s => `<option ${cfg.me===s?"selected":""}>${esc(s)}</option>`).join("")}${cfg.me && d && !d.settings.staff.includes(cfg.me) ? `<option selected>${esc(cfg.me)}</option>` : ""}</select></label>
      <label class="check" style="align-self:end"><input type="checkbox" id="c_remember" ${cfg.remember?"checked":""}> Mémoriser le jeton sur cet appareil</label>
      <label class="f">Expiration du jeton (pour être prévenu)<input id="c_exp" type="date" value="${esc(cfg.tokenExpire || "")}"></label>
      <p class="meta" style="align-self:end;margin:0">GitHub ne donne pas cette date à la page : recopie celle affichée à la création du jeton.</p>
    </div>
    <div class="tools" style="margin:14px 0 0">
      <button class="btn primary" id="c_save">Se connecter</button>
      ${S.mode==="github" ? `<button class="btn ghost" id="c_pull">Recharger maintenant</button><button class="btn danger" id="c_logout">Se déconnecter</button>` : ""}
    </div>
    ${S.lastError ? `<p style="color:var(--ko);margin-top:10px">${esc(S.lastError)}</p>` : ""}
  </section>`;
  if(!d) return `<h1>Réglages</h1>${pli("connexion", conn, "", true)}${pli("fichier", localPanel())}`;
  const list = (id, label, arr, hint) => `<label class="f full">${label}<textarea id="${esc(id)}" rows="4">${esc(arr.join("\n"))}</textarea><span class="muted">${hint}</span></label>`;
  // résumé affiché à droite du titre quand le panneau est fermé
  const ko = santeKo(d), sv = d.robot?.derniereSauvegarde, adm = (d.settings.admins || []).length, nbJ = (d.settings.jetons || []).length, v = d.settings.vitrine || {};
  const pt = (cl, t) => `<span class="${cl}">●</span> ${t}`;
  const G = [
    ["compte", "👤", "Mon compte", "Propre à ce navigateur", [
      pli("connexion", conn, S.mode === "github" ? pt("up", S.horsLigne ? "hors ligne" : `connecté${cfg.me ? " · " + esc(cfg.me) : ""}`) : pt("down", "non connecté"), S.mode !== "github"),
      pli("twitch", `<section class="panel" id="twitch">
    <h2>Connexion Twitch</h2>
    <p>Donne le follow exact, le live en temps réel et la date de la dernière VOD, qui sert au nombre de jours depuis le dernier stream. Chaque membre du staff connecte son propre compte Twitch : aucune autorisation spéciale n'est demandée.</p>
    <div class="grid">
      <label class="f full">Client ID de l'application Twitch (partagé avec tout le staff)<input id="s_twcid" value="${esc(d.settings.twitchClientId || "")}" placeholder="ex. abcd1234efgh5678…" autocomplete="off"></label>
    </div>
    <p class="meta">URL de redirection à déclarer dans l'application Twitch : <b>${esc(redirectUri())}</b></p>
    <div class="tools" style="margin:14px 0 0">
      <button class="btn" id="s_twsave">Enregistrer le Client ID</button>
      ${tw?.token ? `<span class="up" style="align-self:center">● Twitch connecté</span><button class="btn danger" id="twOut">Déconnecter Twitch</button>`
                  : `<button class="btn primary" id="twIn" ${d.settings.twitchClientId ? "" : "disabled"}>Se connecter à Twitch</button>`}
    </div>
  </section>`, tw?.token ? pt("up", "connecté") : pt("muted", "non connecté")),
      pli("notifs", notifsPanel(), notifsOn() ? pt("up", "activées") : "désactivées"),
      pli("appli", appPanel(), estInstallee() ? pt("up", "installée") : S.copieLe ? "copie hors ligne à jour" : "")]],
    ["robot", "🤖", "Robot et santé", "Partagé par tout le staff", [
      pli("sante", santePanel(d), ko ? pt("down", `${ko} problème${ko > 1 ? "s" : ""}`) : pt("up", "tout va bien"), ko > 0),
      pli("robot", `<section class="panel" id="robot">
    <h2>Robot quotidien</h2>
    <p>Tourne toutes les heures sur GitHub : live, relevé des follows, dernière VOD et paliers matin (8 h), midi (12 h) et soir (19 h), annonces Discord.</p>
    ${(() => { const f = [...d.membres, ...d.propositions], vus = f.filter(r => r.type !== undefined);
      const aff = vus.filter(r => r.type === "affiliate").length, par = vus.filter(r => r.type === "partner").length, ids = f.filter(r => r.twitchId).length;
      return `<p class="meta" style="margin:0 0 6px">${vus.length ? `Statut Twitch connu pour ${vus.length} fiche${vus.length>1?"s":""} sur ${f.length} : <b>${aff}</b> affilié${aff>1?"s":""}, <b>${par}</b> partenaire${par>1?"s":""} · identifiant Twitch enregistré pour ${ids} fiche${ids>1?"s":""}.` : `<span class="warn">Le robot n'a encore enregistré aucun statut affilié / partenaire ni identifiant Twitch.</span> Vérifie que le dépôt cabane contient la dernière version de robot/robot.mjs et qu'un passage a eu lieu depuis (onglet Actions).`}</p>`; })()}
    <p class="meta" style="margin:0">${d.robot?.dernierReleve ? `Dernier relevé : ${fmtDate(d.robot.dernierReleve.slice(0,10))} (${esc(d.robot.dernierReleve.slice(11))})` : d.robot?.lastDaily ? `Dernier relevé : ${fmtDate(d.robot.lastDaily)}` : "Le robot n'a pas encore tourné."}${d.robot?.annivAnnonce ? ` · anniversaires vérifiés le ${fmtDate(d.robot.annivAnnonce)}` : ""}${(() => { const p = d.robot?.passage || d.robot?.derniereExecution; if(!p) return ""; const h = (Date.now() - new Date(p)) / 36e5;
      return ` · dernier passage ${fmtStamp(p)}${h > 2 ? ` <span class="warn">(en retard : la page le relance automatiquement)</span>` : ""}`; })()}</p>
  </section>`, (() => { const p = d.robot?.passage || d.robot?.derniereExecution; return p ? "passage " + fmtStamp(p) : ""; })()),
      pli("lienbot", botPanel(), /^https:/.test(lienBot() || "") ? "lien actif" : "aucun lien"),
      pli("jetons", jetonsPanel(d), nbJ ? `${nbJ} jeton${nbJ > 1 ? "s" : ""}${jetonsSoon(d).length ? ` · <span class="warn">${jetonsSoon(d).length} à renouveler</span>` : ""}` : "")]],
    ["equipe", "🧑‍🤝‍🧑", "Équipe", "Qui fait quoi", [
      pli("listes", `<section class="panel" id="listes">
    <h2>Listes</h2>
    <div class="grid">
      <label class="f full">Nom affiché<input id="s_nom" value="${esc(d.settings.nom||"")}"></label>
      ${list("s_staff","Staff qui donne son avis", d.settings.staff, "Un prénom par ligne. Chaque personne a sa case d'avis sur les propositions.")}
      ${list("s_statuts","Statuts de proposition", d.settings.statutsProposition, "Un statut par ligne.")}
      ${list("s_roles","Rôles", d.settings.roles, "Un rôle par ligne.")}
      ${list("s_liens","Sites de mesure d'audience", d.settings.liens, "Un lien par ligne.")}
      ${list("s_integ","Étapes d'intégration d'un nouveau membre", d.settings.integration ?? ETAPES_DEFAUT, "Une étape par ligne. Elles apparaissent en cases à cocher sur la fiche, et sur l'Accueil tant qu'un nouveau (60 derniers jours) n'a pas tout coché.")}
      <label class="f">Proposition « qui stagne » après (jours)<input id="s_stag" type="number" min="3" max="120" value="${stagJours()}"></label>
    </div>
    ${d.settings.liens.length ? `<p class="meta" style="margin:10px 0 4px">Sites de mesure d'audience :</p>` : ""}
    <div class="links">${d.settings.liens.map(u => safeUrl(u) ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\/(www\.)?/,"").replace(/\/$/,""))}</a>` : "").join("")}</div>
    <div class="tools" style="margin:14px 0 0"><button class="btn primary" id="s_save">Enregistrer les listes</button></div>
  </section>`, `${d.settings.staff.length} membre${d.settings.staff.length > 1 ? "s" : ""} du staff`),
      pli("admins", adminsPanel(d), adm ? `${adm} admin${adm > 1 ? "s" : ""}` : "tout le monde est admin"),
      pli("staffDiscord", staffDiscordPanel(d), ""),
      pli("modeles", modelesPanel(), `${modeles().length} modèle${modeles().length > 1 ? "s" : ""}`)]],
    ["vitrinegrp", "🌐", "Vitrine publique", "Ce que le public voit", [
      pli("vitrine", vitrinePanel(d), v.active ? pt("up", "publiée") : pt("muted", "désactivée")),
      pli("reussites", reussitesPanel(d), "")]],
    ["donnees", "🗄️", "Données", "Sauvegardes et historique", [
      pli("sauvegardes", sauvegardesPanel(d), sv ? "dernière : " + fmtDate(sv) : ""),
      pli("archives", archivePanel(d), ""),
      pli("corbeille", trashPanel(d), (d.corbeille || []).length ? `${d.corbeille.length} élément${d.corbeille.length > 1 ? "s" : ""}` : "vide"),
      pli("fichier", localPanel(), ""),
      pli("historique", `<section class="panel" id="historique">
    <h2>Historique des modifications</h2>
    <ul class="journal">${(d.journal||[]).slice(0,80).map(j => `<li><span class="muted">${fmtStamp(j.le)}</span><b>${esc(j.par)}</b><span>${esc(j.txt)}</span></li>`).join("")}</ul>
  </section>`, (d.journal || [])[0] ? "dernière : " + fmtStamp(d.journal[0].le) : "")]]
  ];
  return `<div class="regl-tete"><h1>Réglages</h1>
    <nav class="regl-nav" aria-label="Sections des réglages">${G.map(([k, ic, t]) => `<a href="#grp-${k}" data-reglgrp="${k}"><span aria-hidden="true">${ic}</span> ${t}</a>`).join("")}</nav>
    <div class="regl-tout"><button type="button" class="btn ghost" data-plitout="1">Tout ouvrir</button><button type="button" class="btn ghost" data-plitout="0">Tout fermer</button></div></div>
  <div class="regl-corps">${G.map(([k, ic, t, st, panneaux]) => `<section class="regl-grp" id="grp-${k}" aria-labelledby="grpt-${k}"><h2 class="grp-t" id="grpt-${k}"><span aria-hidden="true">${ic}</span> ${t}<small>${st}</small></h2>${panneaux.join("")}</section>`).join("")}</div>`;
}
// Panneaux repliables : l'état ouvert / fermé est retenu sur cet appareil
const PLI_KEY = "cabane.reglagesOuverts";
function pli(cle, html, resume = "", ouvertParDefaut = false){
  const m = /^\s*<section class="panel"([^>]*)>\s*<h2>([\s\S]*?)<\/h2>/.exec(html); if(!m) return html;
  const fin = html.lastIndexOf("</section>"), etat = store.get(PLI_KEY, {});
  const ouvert = cle in etat ? etat[cle] : ouvertParDefaut;
  const titre = m[2].replace(/\s*<span class="n"[^>]*>[\s\S]*?<\/span>/g, "").replace(/\s*\(\d+\)\s*$/, "");   // compteurs : déjà dans le résumé
  const attrs = m[1].includes("id=") ? m[1] : `${m[1]} id="${cle}"`;
  return `<details class="panel pli"${attrs} data-pli="${cle}" ${ouvert ? "open" : ""}><summary><h3 class="pli-t">${titre}</h3>${resume ? `<span class="pli-r">${resume}</span>` : ""}<span class="chev" aria-hidden="true"></span></summary>
    <div class="pli-c">${html.slice(m[0].length, fin)}</div></details>`;
}
function noterPli(cle, ouvert){ const e = store.get(PLI_KEY, {}); e[cle] = ouvert; store.set(PLI_KEY, e); }
// seul un clic de la personne est retenu (le navigateur signale aussi les panneaux ouverts à l'affichage)
document.addEventListener("click", e => { const sm = e.target.closest?.("details[data-pli] > summary"); if(sm) noterPli(sm.parentElement.dataset.pli, !sm.parentElement.open); });
// Ouvre un panneau des Réglages (depuis un autre écran) et y descend
function ouvrirReglage(id){
  if(S.view !== "reglages"){ S.view = "reglages"; S.drawer = null; render(); }
  const el = document.getElementById(id); if(!el) return;
  if(el.matches("details[data-pli]") && !el.open){ el.open = true; noterPli(el.dataset.pli, true); }
  el.scrollIntoView({block:"start"});
}
const santeKo = d => { const p = d.robot?.passage || d.robot?.derniereExecution, h = p ? (Date.now() - new Date(p)) / 36e5 : null;
  return (d.robot?.sante?.checks || []).filter(c => c.ok === false).length + (p && h <= 2 ? 0 : 1); };
function localPanel(){
  return `<section class="panel">
    <h2>Fichier JSON</h2>
    <p>Pour tester sans GitHub, ou pour garder une copie de sauvegarde. En mode fichier local, les modifications ne sont partagées avec personne tant que tu n'exportes pas.</p>
    <div class="tools" style="margin:0">
      <label class="btn">Ouvrir un fichier JSON<input type="file" id="fileIn" accept=".json,application/json" hidden></label>
      ${S.data ? `<button class="btn" id="exportBtn">Exporter une copie</button>` : ""}
    </div>
  </section>`;
}
function viewSetup(){
  return `<h1>Bienvenue</h1><p class="sub">Connecte-toi au fichier partagé du staff pour commencer. Première fois ici ? <a href="#" data-goto="aide">Lis l'aide</a> : tout y est expliqué pas à pas.</p>${viewReglages()}`;
}
