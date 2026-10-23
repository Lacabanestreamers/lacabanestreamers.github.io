// La Cabane · page staff · Accueil : ce qui attend le staff, charge des référents et des responsables, intégration, suivi des nouveaux.
// Scripts classiques chargés dans l'ordre par index.html : ils partagent les mêmes variables globales.
/* ----- Accueil : ce qui attend le staff ----- */
function viewAccueil(){
  const d = S.data, me = cfg.me, LIM = 10;
  const actifs = d.membres.filter(m => m.statut !== "Parti");
  const card = (title, items, row, emptyTxt, more) => `<section class="card"><h2>${title}<span class="n ${items.length ? "" : "zero"}">${items.length}</span></h2>
    ${items.length ? `<ul class="todo">${items.slice(0, LIM).map(row).join("")}</ul>${items.length > LIM ? `<a href="#" class="more" ${more}>+ ${items.length - LIM} autres</a>` : ""}` : `<p class="none">${emptyTxt}</p>`}</section>`;
  const li = (c, r, right, wrap) => `<li data-open="${c}:${r.id}">${avatarHtml(r.login)}<span class="login">${esc(r.login)}</span><span class="r${wrap ? " w" : ""}">${right}</span></li>`;

  const avis = me ? d.propositions.filter(p => p.statut === "Attente staff" && !p.avis?.[me])
                      .sort((a,b) => String(a.dateProposition||"").localeCompare(String(b.dateProposition||""))) : [];
  const annivs = actifs.filter(m => m.premierStream).map(m => ({m, a:annivInfo(m.premierStream)})).filter(x => x.a.days <= 7).sort((x,y) => x.a.days - y.a.days);
  const inactifs = actifs.filter(m => !enPause(m)).map(m => ({m, x:lastStream(m)})).filter(o => o.x && !o.x.live && o.x.days >= 30).sort((a,b) => b.x.days - a.x.days);
  const retours = retoursDePause();
  const inconnus = actifs.filter(m => !lastStream(m)).length;
  const need = m => [!m.statut && "statut", !m.role && "rôle", !m.discord && "Discord", !m.premierStream && "1er stream"].filter(Boolean);
  const incomplets = actifs.filter(m => need(m).length).sort((a,b) => need(b).length - need(a).length);

  return `<h1>${me ? `Salut ${esc(me)} !` : "Accueil"}</h1>
  <p class="sub">Ce qui attend le staff aujourd'hui${d.robot?.lastDaily ? ` · dernier passage du robot le ${fmtDate(d.robot.lastDaily)}` : ""}</p>
  ${alerteRobot(d)}
  <div class="home">
    ${me ? card("Tes avis en attente", avis, p => li("propositions", p, `${pill(p.statut)}${p.proposePar ? " · " + esc(p.proposePar) : ""}`), "Aucune proposition « Attente staff » n'attend ton avis.", `data-goto="propositions" data-pst="Attente staff"`)
         : `<section class="card"><h2>Tes avis en attente</h2><p class="none">Choisis ton prénom dans <a href="#" data-goto="reglages">Réglages</a> pour voir les propositions qui attendent ton avis.</p></section>`}
    ${mesStreamersCard()}
    ${acceptesCard()}
    ${retours.length ? card("De retour de pause", retours, m => li("membres", m, `depuis le ${fmtDate(m.pauseJusqua)}${m.referent ? " · " + esc(m.referent) : ""}`), "", "") : ""}
    ${card("Anniversaires dans les 7 jours", annivs.map(x => x.m), m => { const a = annivInfo(m.premierStream); return li("membres", m, `${a.years} ${a.years>1?"ans":"an"} · <b class="${a.days===0?"up":""}">${a.days===0?"aujourd'hui":a.days===1?"demain":"dans "+a.days+" j"}</b>`); }, "Aucun anniversaire de stream cette semaine.", `data-goto="anniv"`)}
    ${card("Inactifs depuis 30 jours ou plus", inactifs.map(o => o.m), m => { const x = lastStream(m); return li("membres", m, `<span class="down">${x.days} j</span>`); }, "Tout le monde a streamé ce mois-ci." + (inconnus ? ` (${inconnus} chaîne${inconnus>1?"s":""} sans date connue)` : ""), `data-goto="membres"`)
       .replace("</section>", inconnus && inactifs.length ? `<p class="meta">${inconnus} chaîne${inconnus>1?"s":""} sans date de dernier stream connue.</p></section>` : "</section>")}
    ${(() => { const tous = rappelsEchus(), miens = tous.filter(x => x.rp.par === me), list = S.f.rpMiens && me ? miens : tous; const t = todayISO();
      return `<section class="card"><h2>Rappels du jour<span class="seg2" role="group" aria-label="Filtre">${me ? `<button data-rpf="0" aria-pressed="${!S.f.rpMiens}">Tous</button><button data-rpf="1" aria-pressed="${!!S.f.rpMiens}">Les miens (${miens.length})</button>` : ""}</span><span class="n ${list.length ? "" : "zero"}">${list.length}</span></h2>
        ${list.length ? `<ul class="todo">${list.slice(0, 12).map(({c, r, rp}) => { const j = joursAvant(rp.date);
          return `<li data-open="${c}:${r.id}">${avatarHtml(r.login)}<span style="min-width:0;flex:1"><span class="login">${esc(r.login)}</span><span class="muted" style="display:block;font-size:14px">${esc(rp.texte)}</span></span>
            <span class="r ${j < 0 ? "down" : "warn"}">${j < 0 ? `en retard de ${-j} j` : "aujourd'hui"}<br><span class="muted">${esc(rp.par || "?")}</span></span>
            <button type="button" class="btn ghost" data-rpdone="${rp.id}" data-rpc="${c}" data-rpid="${r.id}" style="padding:2px 10px">Fait</button></li>`; }).join("")}</ul>${list.length > 12 ? `<p class="meta">+ ${list.length - 12} autres</p>` : ""}`
          : `<p class="none">${S.f.rpMiens ? "Aucun de tes rappels n'est prévu aujourd'hui." : "Aucun rappel prévu aujourd'hui."}</p>`}</section>`; })()}
    ${(() => { const soon = jetonsSoon(d); return soon.length ? `<section class="card"><h2>Jetons à renouveler<span class="n">${soon.length}</span></h2><ul class="todo">${soon.map(x => `<li data-goto="reglages"><span class="login">${esc(x.nom)}</span><span class="r ${x.j <= 2 ? "down" : "warn"}">${x.j < 0 ? "expiré le " + fmtDate(x.expire) : x.j === 0 ? "expire aujourd'hui" : "dans " + x.j + " j · " + fmtDate(x.expire)}</span></li>`).join("")}</ul></section>` : ""; })()}
    ${card(`Propositions qui stagnent (${stagJours()} j et +)`, stagnantes().map(x => x.p), p => li("propositions", p, `${pill(p.statut)} · <b class="warn">${depuisStatut(p)} j</b>`), "Aucune proposition bloquée dans le même statut.", `data-goto="propositions"`)}
    ${(() => { const prox = agendaTri().avenir.filter(e => joursAvant(e.date) <= 7); return prox.length ? `<section class="card"><h2>Événements de la semaine<span class="n">${prox.length}</span></h2><ul class="todo">${prox.map(e => { const j = joursAvant(e.date);
      return `<li data-goto="agenda"><span class="login" style="flex:1">${esc(e.titre)}</span><span class="r"><b class="${j === 0 ? "up" : ""}">${j === 0 ? "aujourd'hui" : j === 1 ? "demain" : fmtDate(e.date)}</b>${e.heure ? " · " + esc(e.heure) : ""}</span></li>`; }).join("")}</ul></section>` : ""; })()}
    ${me ? (() => { const miens = d.propositions.filter(p => p.responsable === me && !CLOSED.includes(p.statut) && p.statut !== "Aucun contact").map(p => ({p, j:depuisStatut(p)})).sort((a, b) => (b.j ?? 0) - (a.j ?? 0));
      return card("Tes propositions en charge", miens.map(x => x.p), p => { const j = depuisStatut(p); return li("propositions", p, `${pill(p.statut)}${j != null ? ` · <b class="${j >= stagJours() ? "warn" : ""}">${j} j</b>` : ""}`); }, "Aucune proposition à ton nom (champ « Responsable » d'une proposition).", `data-goto="propositions"`); })() : ""}
    ${(() => { const etapes = etapesIntegration(), lim = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10);
      const enCours = etapes.length ? actifs.filter(m => m.arrivee && m.arrivee >= lim && !["Admin","Modo"].includes(m.role) && faitesIntegration(m) < etapes.length) : [];
      return card("Intégrations en cours", enCours, m => li("membres", m, `<b class="warn">${faitesIntegration(m)}/${etapes.length}</b>${m.referent ? " · " + esc(m.referent) : ` · <span class="down">sans référent</span>`}`), "Tous les nouveaux (60 derniers jours) sont intégrés.", `data-goto="membres"`); })()}
    ${suivisCard()}
    ${card("Réussites (14 jours)", evenementsRecents(14), x => { const m = S.data.membres.find(y => y.login === x.login) || {id:"", login:x.login};
        return `<li ${m.id ? `data-open="membres:${m.id}"` : ""}>${avatarHtml(x.login)}<span class="login">${esc(x.login)}</span><span class="r">${x.kind === "palier" ? "🚀" : "🎉"} <b class="up">${esc(x.txt)}</b> · ${fmtDate(x.date)}${x.masque ? ` · <span class="muted">masquée</span>` : ""}</span></li>`; },
      "Aucun palier ni affiliation ces 14 derniers jours.", `data-goto="membres"`)}
    ${(() => { const ko = [...d.membres.filter(m => m.statut !== "Parti"), ...d.propositions.filter(p => !CLOSED.includes(p.statut))].filter(r => r.introuvable);
      return ko.length ? card("Introuvables sur Twitch", ko, r => li(d.membres.includes(r) ? "membres" : "propositions", r, `${d.membres.includes(r) ? "" : "proposition · "}depuis le ${fmtDate(r.introuvable)}`), "", "") : ""; })()}
    ${card("Fiches à compléter", incomplets, m => li("membres", m, "manque : " + need(m).join(", "), true), "Toutes les fiches sont complètes.", `data-goto="membres" data-mst=""`)}
  </div>`;
}

// Charge des référents : nouveaux suivis (arrivés depuis 60 jours ou moins) et total des fiches suivies
function chargeReferents(){
  const d = S.data, now = Date.now();
  const actifs = d.membres.filter(m => m.statut !== "Parti" && !["Admin","Modo"].includes(m.role));
  return d.settings.staff.map(nom => {
    const siens = actifs.filter(m => m.referent === nom);
    const nouveaux = siens.filter(m => m.arrivee && (now - new Date(m.arrivee + "T12:00:00")) / 864e5 <= 60);
    return {nom, nouveaux:nouveaux.length, total:siens.length};
  }).sort((a, b) => a.nouveaux - b.nouveaux || a.total - b.total || a.nom.localeCompare(b.nom, "fr"));
}
function suggestionReferent(){ const c = chargeReferents(); return c.length ? c[0] : null; }
// Responsable d'une proposition (celui qui contacte le streamer) : répartition sur les propositions ouvertes
const ETAPES_DEFAUT = ["Ajouté au serveur Discord", "Rôle Discord donné", "Présenté dans le salon", "Règles et fonctionnement expliqués"];
const etapesIntegration = () => (S.data?.settings.integration ?? ETAPES_DEFAUT).map(x => String(x).replace(/\./g, "·")).filter(Boolean);
const faitesIntegration = m => etapesIntegration().filter(e => m.integ?.[e]).length;
function integrationBlock(m){
  const etapes = etapesIntegration(); if(!etapes.length || m.statut === "Parti") return "";
  const n = faitesIntegration(m);
  return `<fieldset class="integ"><legend>Intégration ${n}/${etapes.length}</legend>
    ${etapes.map(e => `<label><input type="checkbox" data-integ="${esc(e)}" ${m.integ?.[e] ? "checked" : ""}> ${esc(e)}${m.integ?.[e] ? ` <span class="muted">(${fmtDate(m.integ[e])})</span>` : ""}</label>`).join("")}
    <p class="meta" style="margin:6px 0 0">Étapes réglables dans Réglages → Listes.</p></fieldset>`;
}
function chargeResponsables(){
  const ouvertes = S.data.propositions.filter(p => !CLOSED.includes(p.statut) && !["Aucun contact"].includes(p.statut));
  return S.data.settings.staff.map(nom => ({nom, n:ouvertes.filter(p => p.responsable === nom).length})).sort((a, b) => a.n - b.n || a.nom.localeCompare(b.nom, "fr"));
}
function suivisCard(){
  const d = S.data, me = cfg.me, now = Date.now();
  const nouveaux = d.membres.filter(m => m.statut !== "Parti" && m.arrivee && !["Admin","Modo"].includes(m.role)).map(m => ({m, j:Math.floor((now - new Date(m.arrivee + "T12:00:00")) / 864e5)}));
  const aFaire = nouveaux.filter(({m, j}) => (!me || m.referent === me) && m.referent && ((j >= 7 && !m.suivi7) || (j >= 30 && !m.suivi30)))
    .map(({m, j}) => ({m, j, k:j >= 30 && !m.suivi30 ? 30 : 7}));
  const sansRef = nouveaux.filter(({m, j}) => j <= 30 && !m.referent);
  const items = [...aFaire.map(x => ({...x, t:"suivi"})), ...sansRef.map(x => ({...x, t:"ref"}))];
  const title = me ? "Tes suivis de nouveaux" : "Suivi des nouveaux";
  return `<section class="card"><h2>${title}<span class="n ${items.length ? "" : "zero"}">${items.length}</span></h2>${items.length
    ? `<ul class="todo">${items.slice(0, 10).map(x => `<li data-open="membres:${x.m.id}">${avatarHtml(x.m.login)}<span class="login">${esc(x.m.login)}</span><span class="r">${x.t === "suivi"
        ? `prendre des nouvelles <b class="warn">J+${x.k}</b>${me ? "" : " · " + esc(x.m.referent)}` : `<span class="warn">sans référent</span> · J+${x.j}`}</span></li>`).join("")}</ul>`
    : `<p class="none">${me ? "Aucune prise de nouvelles en attente pour toi." : "Rien en attente."}</p>`}</section>`;
}

