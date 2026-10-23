// La Cabane · page staff · Tableau de bord : graphiques, carte récap du mois, entonnoir des propositions.
// Scripts classiques chargés dans l'ordre par index.html : ils partagent les mêmes variables globales.
/* ----- Tableau de bord ----- */
function lineChart(pts, opts = {}){
  if(pts.length < 2) return `<p class="none">Pas encore assez de données.</p>`;
  const W = 420, H = 170, L = 44, B = 22, T = 10, Rr = 10;
  const vs = pts.map(p => p.v), lo = opts.zero ? 0 : Math.min(...vs), hi = Math.max(...vs), span = hi - lo || 1;
  const X = i => L + i / (pts.length - 1) * (W - L - Rr), Y = v => T + (1 - (v - lo) / span) * (H - T - B);
  const line = pts.map((p,i) => `${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`).join(" ");
  const ticks = [lo, lo + span/2, hi].map(v => `<text x="${L-6}" y="${Y(v)+4}" text-anchor="end">${Math.round(v)}</text><line class="ax" x1="${L}" x2="${W-Rr}" y1="${Y(v)}" y2="${Y(v)}" stroke-dasharray="2 4"/>`).join("");
  const step = Math.max(1, Math.ceil(pts.length / 6));
  const labels = pts.map((p,i) => i % step === 0 || i === pts.length - 1 ? `<text x="${X(i)}" y="${H-5}" text-anchor="middle">${esc(p.l)}</text>` : "").join("");
  const resume = `${opts.label ? opts.label + " : " : ""}de ${Math.round(pts[0].v)} (${pts[0].l}) à ${Math.round(pts[pts.length - 1].v)} (${pts[pts.length - 1].l})`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(resume)}"><title>${esc(resume)}</title>${ticks}
    <polygon class="ar" points="${X(0)},${H-B} ${line} ${X(pts.length-1)},${H-B}"/><polyline class="ln" points="${line}"/>${labels}</svg>`;
}
function barChart(rows){
  if(!rows.length) return `<p class="none">Pas de données.</p>`;
  const W = 420, rowH = 26, H = rows.length * rowH + 6, L = 150, max = Math.max(...rows.map(r => r.v)) || 1;
  const resume = rows.map(r => `${r.l} : ${r.v}`).join(", ");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(resume)}"><title>${esc(resume)}</title>${rows.map((r,i) => { const w = (W - L - 40) * r.v / max;
    return `<text x="${L-8}" y="${i*rowH+18}" text-anchor="end">${esc(r.l)}</text><rect class="br" x="${L}" y="${i*rowH+6}" width="${Math.max(2,w).toFixed(1)}" height="16" rx="3" style="${r.c ? `fill:${r.c}` : ""}"/><text x="${L+w+6}" y="${i*rowH+18}">${r.v}</text>`; }).join("")}</svg>`;
}
/* ----- Carte récap du mois (image) ----- */
function recapMonths(){
  const out = [], now = new Date();
  for(let i = 0; i < 12; i++){ const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({k:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`, l:d.toLocaleDateString("fr-FR",{month:"long", year:"numeric"}) + (i === 0 ? " (en cours)" : "")}); }
  return out;
}
function recapStats(mk){
  const d = S.data, [y, mo] = mk.split("-").map(Number);
  const start = `${mk}-01`, end = jourLocal(new Date(y, mo, 0));
  const snaps = d.snapshots.filter(s => s.date <= end);
  const base = [...snaps].reverse().find(s => s.date < start) || snaps.find(s => s.date >= start);
  const last = [...snaps].reverse().find(s => s.date >= start);
  const gains = [];
  if(base && last && base !== last) for(const [l, v] of Object.entries(last.follows || {})) if(base.follows?.[l] != null) gains.push({login:l, g:v - base.follows[l], v});
  const actifs = new Set(d.membres.filter(m => m.statut !== "Parti").map(m => m.login));
  const g = gains.filter(x => actifs.has(x.login));
  return {
    label:new Date(y, mo-1, 1).toLocaleDateString("fr-FR", {month:"long", year:"numeric"}),
    nouveaux:d.membres.filter(m => (m.arrivee || "").startsWith(mk)).map(m => m.login),
    gagnes:g.reduce((a,x) => a + x.g, 0),
    top:g.filter(x => x.g > 0).sort((a,b) => b.g - a.g).slice(0, 5),
    paliers:(d.paliers || []).filter(x => x.date.startsWith(mk)),
    affi:(d.evenements || []).filter(x => x.date.startsWith(mk) && (x.type === "affilie" || x.type === "partenaire")),
    annivs:d.membres.filter(m => m.statut !== "Parti" && m.premierStream && m.premierStream.slice(5,7) === mk.slice(5,7) && m.premierStream.slice(0,4) < mk.slice(0,4))
      .map(m => ({login:m.login, ans:Number(mk.slice(0,4)) - Number(m.premierStream.slice(0,4))})),
    periode:base && last && base !== last ? `relevés du ${fmtDate(base.date)} au ${fmtDate(last.date)}` : "pas assez de relevés sur ce mois"
  };
}
async function drawRecap(mk){
  const st = recapStats(mk), W = 1080, H = 1350;
  try { await document.fonts.load("800 60px Orbitron"); await document.fonts.load("700 30px Rajdhani"); } catch {}
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d");
  const T = "Orbitron, sans-serif", B = "Rajdhani, 'Segoe UI', sans-serif";
  // fond
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, "#1A1142"); bg.addColorStop(1, "#0B0820"); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const glow = (x, y, r, c) => { const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, c); rg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = rg; g.fillRect(0, 0, W, H); };
  glow(120, 80, 520, "rgba(255,79,216,.28)"); glow(W - 80, H - 120, 600, "rgba(61,227,255,.20)");
  const clip = (t, n) => t.length > n ? t.slice(0, n - 1) + "…" : t;
  const text = (t, x, y, font, color, align = "left") => { g.font = font; g.fillStyle = color; g.textAlign = align; g.fillText(t, x, y); };
  const round = (x, y, w, h, r, fill, stroke) => { g.beginPath(); g.roundRect(x, y, w, h, r); if(fill){ g.fillStyle = fill; g.fill(); } if(stroke){ g.strokeStyle = stroke; g.lineWidth = 2; g.stroke(); } };
  // titre
  g.shadowColor = "rgba(255,79,216,.8)"; g.shadowBlur = 28; text("LA CABANE", 70, 150, `800 84px ${T}`, "#FFFFFF"); g.shadowBlur = 0;
  text(`Récap de ${st.label}`, 72, 210, `700 40px ${B}`, "#3DE3FF");
  // chiffres clés
  const kp = [["Nouveaux membres", st.nouveaux.length], ["Follows gagnés", (st.gagnes >= 0 ? "+" : "") + st.gagnes.toLocaleString("fr-FR")],
              ["Paliers de 50", st.paliers.length], ["Affiliations", st.affi.length]];
  kp.forEach(([l, v], i) => { const x = 70 + (i % 2) * 480, y = 260 + Math.floor(i / 2) * 170;
    round(x, y, 460, 150, 18, "rgba(32,25,81,.85)", "rgba(255,79,216,.45)");
    text(String(v), x + 30, y + 88, `800 58px ${T}`, "#FFFFFF"); text(l, x + 32, y + 128, `700 28px ${B}`, "#B7B0E6"); });
  // top progressions
  let y = 650;
  text("Meilleures progressions", 70, y, `800 34px ${T}`, "#FF4FD8"); y += 22;
  if(st.top.length){ const max = st.top[0].g;
    st.top.forEach((x, i) => { const yy = y + 20 + i * 62;
      text(`${i + 1}. ${clip(x.login, 22)}`, 70, yy + 34, `700 32px ${B}`, "#FFFFFF");
      round(520, yy + 12, 380 * x.g / max, 28, 8, i === 0 ? "#FF4FD8" : "#3DE3FF");
      text(`+${x.g}`, 1010, yy + 36, `700 30px ${B}`, "#5CF2A6", "right"); });
    y += 20 + st.top.length * 62 + 30;
  } else { text("Pas encore assez de relevés ce mois-ci.", 70, y + 50, `600 28px ${B}`, "#9C95CB"); y += 100; }
  // réussites
  const lignes = [];
  if(st.affi.length) lignes.push(["🎉 Affiliations", st.affi.map(x => x.login + (x.type === "partenaire" ? " (partenaire)" : "")).join(", ")]);
  if(st.paliers.length) lignes.push(["🚀 Paliers", st.paliers.map(x => `${x.login} ${x.palier}`).join(", ")]);
  if(st.nouveaux.length) lignes.push(["👋 Bienvenue", st.nouveaux.join(", ")]);
  if(st.annivs.length) lignes.push(["🎂 Anniversaires", st.annivs.map(x => `${x.login} (${x.ans} an${x.ans > 1 ? "s" : ""})`).join(", ")]);
  const wrap = (t, maxW, font) => { g.font = font; const words = t.split(" "); const out = []; let cur = "";
    for(const w of words){ const tst = cur ? cur + " " + w : w; if(g.measureText(tst).width > maxW && cur){ out.push(cur); cur = w; } else cur = tst; } if(cur) out.push(cur); return out; };
  for(const [titre, contenu] of lignes){
    if(y > H - 175) break;                                   // garder la place du pied de page
    text(titre, 70, y, `700 30px ${B}`, "#FFC857"); y += 38;
    const ls = wrap(contenu, 940, `600 27px ${B}`);
    const place = Math.max(1, Math.min(3, Math.floor((H - 105 - y) / 34)));
    const vis = ls.slice(0, place);
    if(ls.length > place) vis[vis.length - 1] = clip(vis[vis.length - 1], 60) + " …";
    for(const l of vis){ text(l, 70, y, `600 27px ${B}`, "#ECE9FF"); y += 34; }
    y += 14;
  }
  // pied
  text(st.periode, 70, H - 50, `600 22px ${B}`, "#7B769C");
  text(`généré le ${new Date().toLocaleDateString("fr-FR")}`, W - 70, H - 50, `600 22px ${B}`, "#7B769C", "right");
  return cv;
}
const lastSnapTotal = snaps => { const s = snaps[snaps.length-1]; return s ? Object.values(s.follows || {}).reduce((a,b) => a + (b||0), 0) : null; };
// Entonnoir des propositions, mois par mois (d'après la date de proposition)
function entonnoirCard(){
  const d = S.data, mois = [], now = new Date();
  for(let i = 5; i >= 0; i--){ const dt = new Date(now.getFullYear(), now.getMonth() - i, 1); mois.push({k:`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`, l:dt.toLocaleDateString("fr-FR", {month:"long"})}); }
  const lignes = [...d.propositions.map(p => ({m:(p.dateProposition || "").slice(0, 7), st:p.statut || "À trier", fin:["Accepté","Refusé","Abandonnée","Aucun contact"].includes(p.statut) ? (p.dateRevue || p.statutDepuis) : null, deb:p.dateProposition})),
    ...d.membres.filter(m => m.candidature?.dateProposition).map(m => ({m:m.candidature.dateProposition.slice(0, 7), st:"Accepté", fin:m.candidature.transfereLe, deb:m.candidature.dateProposition}))];
  const stat = k => { const l = lignes.filter(x => x.m === k), n = st => l.filter(x => st.includes(x.st)).length;
    const dl = l.filter(x => x.fin && x.deb).map(x => (new Date(x.fin) - new Date(x.deb)) / 864e5).filter(x => x >= 0);
    return {recues:l.length, acc:n(["Accepté"]), ref:n(["Refusé"]), aband:n(["Abandonnée","Aucun contact"]), cours:l.length - n(["Accepté","Refusé","Abandonnée","Aucun contact"]), delai:dl.length ? Math.round(dl.reduce((a, b) => a + b, 0) / dl.length) : null}; };
  const rows = mois.map(mo => ({...mo, ...stat(mo.k)})), tot = rows.reduce((a, r) => ({recues:a.recues + r.recues, acc:a.acc + r.acc, ref:a.ref + r.ref, aband:a.aband + r.aband, cours:a.cours + r.cours}), {recues:0, acc:0, ref:0, aband:0, cours:0});
  const max = Math.max(1, ...rows.map(r => r.recues));
  const barre = r => r.recues ? `<span style="display:flex;height:10px;border-radius:5px;overflow:hidden;width:${Math.round(r.recues / max * 100)}%;min-width:8px;background:var(--line)" aria-hidden="true">${[["acc","var(--ok)"],["ref","var(--ko)"],["aband","var(--grey)"],["cours","var(--cyan)"]].map(([k, c]) => r[k] ? `<span style="flex:${r[k]};background:${c}"></span>` : "").join("")}</span>` : "";
  const pct = (a, b) => b ? Math.round(a / b * 100) + " %" : "–";
  return `<section class="card" style="margin-bottom:14px"><h2>Entonnoir des propositions (6 mois)</h2>
    <p class="meta" style="margin-top:0">Sur ${tot.recues} proposition${tot.recues > 1 ? "s" : ""} : <b class="up">${tot.acc} acceptée${tot.acc > 1 ? "s" : ""}</b> (${pct(tot.acc, tot.recues)}), <b class="down">${tot.ref} refusée${tot.ref > 1 ? "s" : ""}</b>, ${tot.aband} abandonnée${tot.aband > 1 ? "s" : ""} ou sans contact, <b style="color:var(--cyan)">${tot.cours} en cours</b>. Taux d'acceptation des décisions : <b>${pct(tot.acc, tot.acc + tot.ref)}</b>.</p>
    <div style="overflow-x:auto" tabindex="0" role="region" aria-label="Tableau de l'entonnoir des propositions"><table class="tbl" style="width:100%;min-width:520px"><thead><tr><th scope="col">Mois</th><th scope="col">Reçues</th><th scope="col">Acceptées</th><th scope="col">Refusées</th><th scope="col">Abandon</th><th scope="col">En cours</th><th scope="col">Délai moyen</th><th scope="col" style="width:30%"><span class="sr">Répartition</span></th></tr></thead>
    <tbody>${rows.map(r => `<tr><td>${esc(r.l)}</td><td><b>${r.recues}</b></td><td class="up">${r.acc || ""}</td><td class="down">${r.ref || ""}</td><td>${r.aband || ""}</td><td>${r.cours || ""}</td><td>${r.delai != null ? r.delai + " j" : "–"}</td><td>${barre(r)}</td></tr>`).join("")}</tbody></table></div>
    <p class="meta">Chaque proposition compte dans le mois où elle a été proposée. Délai moyen : de la proposition à la décision (acceptée, refusée, abandonnée).</p>
  </section>`;
}
function viewStats(){
  const d = S.data, today = todayISO();
  const actifs = d.membres.filter(m => m.statut !== "Parti");
  // Membres présents à la fin de chaque mois (12 derniers mois), d'après arrivée / départ
  const months = []; const now = new Date();
  for(let i = 11; i >= 0; i--){ const dt = new Date(now.getFullYear(), now.getMonth() - i + 1, 0); months.push({end:jourLocal(dt), l:dt.toLocaleDateString("fr-FR",{month:"short"})}); }
  const presents = months.map(mo => ({l:mo.l, v:d.membres.filter(m => m.arrivee && m.arrivee <= mo.end && (!m.depart || m.depart > mo.end)).length}));
  // Follows cumulés (chaînes présentes dans chaque relevé)
  const snaps = d.snapshots.slice(-60);
  // Follows gagnés en cumul : somme des écarts entre deux relevés successifs, sur les chaînes présentes dans les deux
  let run = 0; const cumul = snaps.map((s, i) => { if(i){ const pv = snaps[i-1].follows || {}; for(const [l, v] of Object.entries(s.follows || {})) if(pv[l] != null && v != null) run += v - pv[l]; } return {l:fmtDate(s.date).slice(0,5), v:run}; });
  const totalNow = lastSnapTotal(snaps);
  const lastSnap = snaps[snaps.length-1], ref30 = d.snapshots.filter(s => s.date <= new Date(Date.now() - 30*864e5).toISOString().slice(0,10)).pop();
  let prog30 = null;
  if(lastSnap && ref30){ prog30 = 0; for(const [l, v] of Object.entries(lastSnap.follows||{})) if(ref30.follows?.[l] != null) prog30 += v - ref30.follows[l]; }
  // Propositions
  const byStatut = {}; d.propositions.forEach(p => byStatut[p.statut || "À trier"] = (byStatut[p.statut || "À trier"] || 0) + 1);
  const transferes = d.membres.filter(m => m.candidature);
  const acceptes = (byStatut["Accepté"] || 0) + transferes.length, refuses = (byStatut["Refusé"] || 0) + (byStatut["Abandonnée"] || 0);
  const taux = acceptes + refuses ? Math.round(acceptes / (acceptes + refuses) * 100) : null;
  const delais = [...transferes.map(m => [m.candidature.dateProposition, m.candidature.transfereLe]),
                  ...d.propositions.filter(p => ["Accepté","Refusé"].includes(p.statut)).map(p => [p.dateProposition, p.dateRevue])]
    .filter(([a,b]) => a && b).map(([a,b]) => (new Date(b) - new Date(a)) / 864e5).filter(x => x >= 0);
  const delai = delais.length ? Math.round(delais.reduce((a,b) => a+b, 0) / delais.length) : null;
  const colors = {"Accepté":"var(--ok)","Refusé":"var(--ko)","Abandonnée":"var(--grey)","Attente staff":"var(--warn)","Proposition en cours":"var(--cyan)","Proposition à faire":"#A99BFF","Aucun contact":"var(--grey)"};
  const vAll = actifs.map(m => viewersStats(m)?.avg).filter(v => v != null);
  const affi = actifs.filter(m => m.type === "affiliate").length, part = actifs.filter(m => m.type === "partner").length;
  const month = today.slice(0,7);
  const palMois = (d.paliers || []).filter(x => x.date.startsWith(month)).length;
  const arrivMois = d.membres.filter(m => (m.arrivee || "").startsWith(month)).length, departMois = d.membres.filter(m => (m.depart || "").startsWith(month)).length;
  const kpi = (label, val, sub) => `<div class="kpi"><span>${label}</span><b>${val}</b>${sub ? `<small>${sub}</small>` : ""}</div>`;
  return `<h1>Tableau de bord</h1><p class="sub">La Cabane dans son ensemble</p>
  <div class="kpis">
    ${kpi("Membres présents", actifs.filter(m => m.statut === "Présent").length, `${actifs.length} sans les partis · ${arrivMois} arrivé${arrivMois>1?"s":""}, ${departMois} départ${departMois>1?"s":""} ce mois`)}
    ${kpi("Follows cumulés", totalNow != null ? totalNow.toLocaleString("fr-FR") : "–", prog30 != null ? `<span class="${prog30>=0?"up":"down"}">${prog30>=0?"+":""}${prog30.toLocaleString("fr-FR")}</span> sur 30 jours` : "relevé du " + (lastSnap ? fmtDate(lastSnap.date) : "–"))}
    ${kpi("Affiliés / partenaires", `${affi} / ${part}`, `sur ${actifs.filter(m => m.type !== undefined).length} chaînes vérifiées`)}
    ${kpi("Viewers moyens", vAll.length ? (Math.round(vAll.reduce((a,b)=>a+b,0) / vAll.length * 10) / 10) : "–", vAll.length ? `moyenne de ${vAll.length} chaînes, 30 jours` : "mesures en cours")}
    ${kpi("Taux d'acceptation", taux != null ? taux + " %" : "–", `${acceptes} acceptées, ${refuses} refusées ou abandonnées`)}
    ${kpi("Délai de décision", delai != null ? delai + " j" : "–", delais.length ? `moyenne sur ${delais.length} décisions datées` : "pas encore de dates")}
    ${kpi("Paliers ce mois", palMois, "paliers de 50 follows franchis")}
  </div>
  ${entonnoirCard()}
  <section class="card" style="margin-bottom:14px"><h2>Carte récap du mois</h2>
    <div class="tools" style="margin:0 0 12px">
      <select id="recapMonth" aria-label="Mois">${recapMonths().map(m => `<option value="${m.k}" ${S.recapMonth === m.k ? "selected" : ""}>${esc(m.l)}</option>`).join("")}</select>
      <button class="btn primary" id="recapGo">Générer l'image</button>
      ${S.recapUrl ? `<a class="btn" href="${S.recapUrl}" download="la-cabane-recap-${esc(S.recapMonth)}.png">Télécharger</a><button class="btn" id="recapCopy">Copier (pour coller dans Discord)</button>` : ""}
    </div>
    ${S.recapUrl ? `<div class="recap"><img src="${S.recapUrl}" alt="Carte récap du mois" style="width:100%;border-radius:10px;border:1px solid var(--line)"><p class="meta">Format 1080 × 1350, lisible sur Discord et sur les réseaux. Les chiffres viennent des relevés du robot et des fiches.</p></div>` : `<p class="meta" style="margin:0">Choisis un mois puis génère l'image : nouveaux membres, follows gagnés, meilleures progressions, paliers, affiliations et anniversaires.</p>`}
  </section>
  <div class="charts">
    <section class="card"><h2>Membres présents (12 mois)</h2>${lineChart(presents, {zero:true, label:"Membres présents par mois"})}<p class="meta">D'après les dates d'arrivée et de départ renseignées.</p></section>
    <section class="card"><h2>Follows gagnés (cumul)</h2>${lineChart(cumul, {label:"Follows gagnés en cumul"})}<p class="meta">Cumul des follows gagnés par l'ensemble des chaînes depuis le premier relevé affiché (60 derniers).</p></section>
    <section class="card"><h2>Propositions par statut</h2>${barChart(Object.entries(byStatut).sort((a,b) => b[1]-a[1]).map(([l,v]) => ({l, v, c:colors[l]})))}${transferes.length ? `<p class="meta">+ ${transferes.length} transférée${transferes.length>1?"s":""} dans Streamers.</p>` : ""}</section>
    <section class="card"><h2>Raisons des départs</h2>${(() => { const partis = S.data.membres.filter(m => m.statut === "Parti");
      if(!partis.length) return `<p class="none">Aucun départ enregistré.</p>`;
      const cnt = {}; partis.forEach(m => { const k = m.raisonDepart || "Non précisée"; cnt[k] = (cnt[k] || 0) + 1; });
      const durees = partis.filter(m => m.arrivee && m.depart).map(m => (new Date(m.depart) - new Date(m.arrivee)) / 864e5).filter(x => x >= 0);
      const moy = durees.length ? Math.round(durees.reduce((a,b) => a+b, 0) / durees.length) : null;
      const annee = partis.filter(m => (m.depart || "") >= new Date(Date.now() - 365*864e5).toISOString().slice(0,10)).length;
      return barChart(Object.entries(cnt).sort((a,b) => b[1]-a[1]).map(([l,v]) => ({l, v, c:l === "Non précisée" ? "var(--grey)" : "var(--pink)"})))
        + `<p class="meta">${partis.length} départ${partis.length>1?"s":""} au total, dont ${annee} sur les 12 derniers mois${moy != null ? ` · durée moyenne passée dans La Cabane : ${moy >= 60 ? Math.round(moy/30) + " mois" : moy + " jours"}` : ""}.</p>`; })()}</section>
    <section class="card refs"><h2>Répartition des référents</h2>${(() => { const c = chargeReferents(), max = Math.max(1, ...c.map(x => x.nouveaux));
      const sans = S.data.membres.filter(m => m.statut !== "Parti" && !["Admin","Modo"].includes(m.role) && !m.referent && m.arrivee && (Date.now() - new Date(m.arrivee + "T12:00:00")) / 864e5 <= 60).length;
      return c.length ? c.map(x => `<div class="row"><span><b>${esc(x.nom)}</b></span><span class="bar" title="${x.nouveaux} nouveau(x) en suivi"><i style="width:${x.nouveaux / max * 100}%"></i></span><span class="muted">${x.nouveaux} nouveau${x.nouveaux > 1 ? "x" : ""} · ${x.total} au total</span></div>`).join("")
        + `<p class="meta">« Nouveaux » : arrivés depuis 60 jours ou moins (hors Admin et Modo).${sans ? ` <span class="warn">${sans} nouveau${sans > 1 ? "x" : ""} sans référent.</span>` : ""}</p>` : `<p class="none">Ajoute le staff dans Réglages.</p>`; })()}</section>
    ${suivisParStaffCard()}
    <section class="card"><h2>Rôles</h2>${barChart(Object.entries(actifs.reduce((o,m) => (o[m.role || "Sans rôle"] = (o[m.role || "Sans rôle"]||0) + 1, o), {})).sort((a,b) => b[1]-a[1]).map(([l,v]) => ({l, v, c:"var(--cyan)"})))}</section>
  </div>`;
}

