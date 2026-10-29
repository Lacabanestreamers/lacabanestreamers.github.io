// Tests de non-régression du site La Cabane (page staff + vitrine) : npm test (node:test, aucune dépendance)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const lire = f => readFileSync(join(racine, f), "utf8");
const existe = f => existsSync(join(racine, f));
createRequire(import.meta.url)("../commun.js");   // hors navigateur, commun.js se pose sur globalThis.Commun
const Commun = globalThis.Commun;

/* ---------- commun.js (calculs partagés avec le robot) ---------- */
test("dates : plusJours / joursEntre, passage à l'heure d'été", () => {
  assert.equal(Commun.plusJours("2026-02-27", 2), "2026-03-01");
  assert.equal(Commun.plusJours("2024-02-28", 2), "2024-03-01");
  assert.equal(Commun.joursEntre("2026-10-20", "2026-10-27"), 7);
  assert.equal(Commun.joursEntre("2026-10-27", "2026-10-20"), -7);
  assert.equal(Commun.parisVersUtc("2026-07-01", "20:00").toISOString(), "2026-07-01T18:00:00.000Z");   // UTC+2
  assert.equal(Commun.parisVersUtc("2026-12-01", "20:00").toISOString(), "2026-12-01T19:00:00.000Z");   // UTC+1
});
test("séries : hebdo, 2 semaines, exclusions, fin, entrées invalides", () => {
  const hebdo = { id: "s", debut: "2026-10-05", rythme: "hebdo" };   // lundi
  assert.deepEqual(Commun.occurrencesSerie(hebdo, "2026-10-01", "2026-10-31"), ["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"]);
  assert.deepEqual(Commun.occurrencesSerie({ ...hebdo, rythme: "2sem" }, "2026-10-01", "2026-10-31"), ["2026-10-05", "2026-10-19"]);
  assert.deepEqual(Commun.occurrencesSerie({ ...hebdo, exclus: ["2026-10-12"], fin: "2026-10-19" }, "2026-10-01", "2026-10-31"), ["2026-10-05", "2026-10-19"]);
  assert.deepEqual(Commun.occurrencesSerie({ id: "s", debut: "pas une date", rythme: "hebdo" }, "2026-10-01", "2026-10-31"), []);
  assert.deepEqual(Commun.occurrencesSerie(null, "2026-10-01", "2026-10-31"), []);
});
test("séries mensuelles : le 31 retombe sur le dernier jour, 2e mardi du mois", () => {
  const m = Commun.occurrencesSerie({ id: "s", debut: "2026-01-31", rythme: "mois" }, "2026-01-01", "2026-04-30");
  assert.deepEqual(m, ["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  const pos = Commun.occurrencesSerie({ id: "s", debut: "2026-10-13", rythme: "moisPos" }, "2026-10-01", "2026-12-31");
  assert.deepEqual(pos, ["2026-10-13", "2026-11-10", "2026-12-08"]);
});
test("occurrence : identifiant stable, valeurs par défaut", () => {
  const o = Commun.occurrence({ id: "s1", titre: "T" }, "2026-10-05");
  assert.equal(o.id, "s1_2026-10-05");
  assert.equal(o.duree, 120);
  assert.equal(o.public, true);
  assert.deepEqual(o.participants, []);
});
test("propositions : date de statut, stagnation, paliers de follows", () => {
  assert.equal(Commun.dateStatut({ statutDepuis: "2026-10-01T10:00", dateProposition: "2026-09-01" }), "2026-10-01");
  assert.equal(Commun.dateStatut({}), null);
  assert.equal(Commun.joursDansStatut({ statutDepuis: "2026-10-01" }, "2026-10-15"), 14);
  assert.equal(Commun.joursDansStatut({}, "2026-10-15"), null);
  assert.equal(Commun.seuilStagnation({}), 14);
  assert.equal(Commun.seuilStagnation({ stagnationJours: 7 }), 7);
  assert.equal(Commun.niveauPalier(49), 0);
  assert.equal(Commun.niveauPalier(50), 50);
  assert.equal(Commun.niveauPalier(149), 100);
});
test("relevés de follows : fusion par date, plafond de 400, renommage, chemin, version", () => {
  const f = Commun.fusionnerReleves([{ date: "2026-10-02", n: 1 }, { date: "2026-10-01", n: 1 }], [{ date: "2026-10-02", n: 2 }]);
  assert.deepEqual(f.map(s => s.date + ":" + s.n), ["2026-10-01:1", "2026-10-02:2"]);
  let l = [];
  for (let i = 0; i < 405; i++) l = Commun.ajouterReleve(l, { date: Commun.plusJours("2025-01-01", i) });
  assert.equal(l.length, 400);
  assert.equal(l.at(-1).date, Commun.plusJours("2025-01-01", 404));
  const r = [{ date: "d", follows: { ancien: 5 } }];
  Commun.renommerReleves(r, "ancien", "nouveau");
  assert.deepEqual(r[0].follows, { nouveau: 5 });
  assert.equal(Commun.cheminReleves("cabane-data.json"), "cabane-releves.json");
  assert.equal(Commun.versionDe({}), 1);
  assert.equal(Commun.versionDe({ version: 2 }), 2);
});
test("commun.js : copie identique à celle du robot (dépôt privé cabane), si présent", t => {
  const autre = join(racine, "..", "cabane", "robot", "commun.js");
  if (!existsSync(autre)) return t.skip("dépôt cabane absent");
  assert.equal(readFileSync(autre, "utf8").replace(/\r\n/g, "\n"), lire("commun.js").replace(/\r\n/g, "\n"));
});

/* ---------- Page staff : chargement, cache hors ligne, CSP ---------- */
const index = lire("index.html");
const sw = lire("sw.js");
test("page staff : même numéro de version des fichiers dans index.html et sw.js", () => {
  const dansIndex = new Set([...index.matchAll(/\?v=(\d+)/g)].map(m => m[1]));
  assert.equal(dansIndex.size, 1, "plusieurs numéros ?v= dans index.html");
  assert.equal(sw.match(/const V = "\?v=(\d+)"/)[1], [...dansIndex][0]);
});
test("page staff : scripts et feuilles existent, tous les js/ sont chargés et mis en cache", () => {
  const liens = [...index.matchAll(/<(?:script src|link rel="(?:stylesheet|manifest)" href)="([^"?]+)/g)].map(m => m[1]);
  assert.ok(liens.length >= 21);
  for (const f of liens) assert.ok(existe(f), `fichier manquant : ${f}`);
  for (const f of readdirSync(join(racine, "js"))) {
    assert.ok(index.includes(`js/${f}?v=`), `js/${f} non chargé par index.html`);
    assert.ok(sw.includes(`"${f.replace(/\.js$/, "")}"`), `js/${f} absent du cache de sw.js`);
  }
});
test("service worker : fichiers préchargés présents, vitrine et autres sites hors cache", () => {
  for (const f of ["index.html", "manifest.webmanifest", "fonts.css", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "commun.js", "css/cabane.css"]) {
    assert.ok(existe(f), f);
    assert.ok(sw.includes(f.replace(/\.(css|js)$/, "")), `${f} absent de sw.js`);
  }
  assert.match(sw, /const CACHE = "cabane-v\d+"/);
  assert.match(sw, /includes\("\/vitrine\/"\)/);
  assert.match(sw, /url\.origin !== location\.origin/);
  assert.match(sw, /method !== "GET"/);
});
test("manifest : icônes présentes, démarrage relatif", () => {
  const m = JSON.parse(lire("manifest.webmanifest"));
  for (const i of m.icons) assert.ok(existe(i.src), i.src);
  assert.equal(m.start_url, "./");
  assert.equal(m.lang, "fr");
});
test("CSP de la page staff : empreinte du script en ligne à jour, pas d'unsafe-eval, noindex", () => {
  const csp = index.match(/Content-Security-Policy" content="([^"]+)"/)[1];
  // le navigateur normalise les fins de ligne avant l'empreinte (copie Windows en CRLF : même règle que la vitrine)
  const script = index.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/\r\n/g, "\n");
  const hash = createHash("sha256").update(script).digest("base64");
  assert.ok(csp.includes(`'sha256-${hash}'`), `l'empreinte du script en ligne a changé : 'sha256-${hash}'`);
  assert.doesNotMatch(csp, /unsafe-eval/);
  assert.match(csp, /script-src 'self' 'sha256-[^']+';/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /base-uri 'self'/);
  assert.match(index, /<meta name="robots" content="noindex, nofollow">/);
});

/* ---------- Vitrine publique ---------- */
const membres = JSON.parse(lire("vitrine/membres.json"));
test("membres.json : structure attendue, chiffres cohérents", () => {
  for (const k of ["active", "titre", "texte", "chiffres", "membres"]) assert.ok(k in membres, k);
  assert.ok(Array.isArray(membres.membres) && membres.membres.length > 0);
  assert.equal(membres.chiffres.membres, membres.membres.length);
  assert.match(membres.chiffres.periode.du, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(membres.chiffres.periode.du <= membres.chiffres.periode.au);
});
test("membres.json : pseudo Twitch valide, avatar sur le CDN Twitch, pas de doublon", () => {
  const vus = new Set();
  for (const m of membres.membres) {
    assert.match(m.login, /^[a-z0-9_]{1,25}$/i, m.login);
    assert.ok(!vus.has(m.login.toLowerCase()), "doublon " + m.login);
    vus.add(m.login.toLowerCase());
    if (m.avatar) assert.match(m.avatar, /^https:\/\/static-cdn\.jtvnw\.net\/[\w\-./%~]+$/, m.login);
  }
});
test("membres.json : lien Discord en invitation https, relais d'inscription sur workers.dev", () => {
  if (membres.lienDiscord) assert.match(membres.lienDiscord, /^https:\/\/(discord\.gg|discord\.com\/invite)\//);
  if (membres.inscriptions?.relais) assert.match(membres.inscriptions.relais, /^https:\/\/[\w.-]+\.workers\.dev\/?$/);
});
test("aucune adresse de webhook Discord complète dans le site publié (lot A)", () => {
  const re = /discord(?:app)?\.com\/api\/webhooks\/\d{6,}\/[\w-]{20,}/;
  const parcourir = d => readdirSync(join(racine, d), { withFileTypes: true }).flatMap(e => {
    const p = d ? d + "/" + e.name : e.name;
    if ([".git", "fonts", "node_modules"].includes(e.name)) return [];
    return e.isDirectory() ? parcourir(p) : /\.(html|js|mjs|json|css|xml|txt|webmanifest|md)$/.test(e.name) ? [p] : [];
  });
  const fichiers = parcourir("");
  assert.ok(fichiers.length > 50);
  for (const f of fichiers) assert.doesNotMatch(lire(f), re, "webhook en clair dans " + f);
});
test("vitrine/index.html : titre, description, canonical, indexable, protections d'affichage", () => {
  const v = lire("vitrine/index.html");
  assert.match(v, /<title>[^<]{10,}<\/title>/);
  assert.match(v, /<meta name="description" content="[^"]{50,}"/);
  assert.match(v, /<link rel="canonical" href="https:\/\/lacabanestreamers\.github\.io\/vitrine\/">/);
  assert.match(v, /const esc = v => String\(v \?\? ""\)\.replace\(\/\[&<>"'\]\/g/);
  assert.match(v, /const okLogin = /);
  assert.match(v, /const okImg = /);
  assert.doesNotMatch(v, /\beval\(|document\.write\(/);
  assert.doesNotMatch(v, /<meta name="robots" content="[^"]*noindex/, "la vitrine doit rester indexable");
});
test("CSP de la vitrine : empreinte du script en ligne à jour, pas d'unsafe-eval ni de script en ligne non couvert", () => {
  const v = lire("vitrine/index.html");
  const csp = v.match(/Content-Security-Policy" content="([^"]+)"/)[1];
  const scripts = [...v.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  assert.equal(scripts.length, 1);
  const lf = scripts[0].replace(/\r\n/g, "\n");   // le navigateur normalise les fins de ligne avant l'empreinte
  assert.ok(csp.includes(`'sha256-${createHash("sha256").update(lf).digest("base64")}'`), "l'empreinte du script de la vitrine a changé");
  assert.doesNotMatch(csp, /script-src[^;]*unsafe-/);
  assert.match(csp, /object-src 'none'/);
});
test("vitrine : les liens target=_blank portent rel=noopener", () => {
  for (const f of ["vitrine/index.html", "vitrine/cgu.html", "vitrine/confidentialite.html", "vitrine/mentions-legales.html"]) {
    for (const m of lire(f).matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) assert.match(m[0], /rel="[^"]*noopener/, `${f} : ${m[0].slice(0, 80)}`);
  }
});
test("pages annexes de la vitrine : en français, liées à pages.css", () => {
  for (const f of ["cgu", "confidentialite", "mentions-legales"]) {
    const h = lire(`vitrine/${f}.html`);
    assert.match(h, /<html lang="fr"/, f);
    assert.match(h, /pages\.css/, f);
  }
  assert.ok(existe("vitrine/apercu.png"));
});
test("fiches vitrine/s/* : une par membre, canonical présent, aucun script (ou seulement l'ancien renvoi vers la vitrine)", () => {
  const fiches = readdirSync(join(racine, "vitrine/s")).filter(f => f.endsWith(".html"));
  for (const m of membres.membres) assert.ok(fiches.includes(m.login + ".html"), "fiche manquante : " + m.login);
  for (const f of fiches) {
    const h = lire("vitrine/s/" + f);
    assert.match(h, /<link rel="canonical" href="https:\/\/lacabanestreamers\.github\.io\/vitrine\//, f);
    const scripts = [...h.matchAll(/<script(?![^>]*ld\+json)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
    const ancien = `location.replace("../?m=${f.replace(/\.html$/, "")}")`;   // fiches d'avant le 27/10, jusqu'au prochain passage du robot
    assert.ok(scripts.every(x => x === ancien), f);
  }
});
test("fiches vitrine/s/* : aucune adresse e-mail dans le texte public", () => {
  for (const f of readdirSync(join(racine, "vitrine/s"))) assert.doesNotMatch(lire("vitrine/s/" + f), /[\w.+-]+@[\w-]+\.[a-z]{2,}/i, f);
});

/* ---------- CSP ---------- */
test("toute page HTML a une CSP stricte ; chaque script en ligne est autorisé par son empreinte", () => {
  const pages = [];
  const parcourir = d => { for (const f of readdirSync(join(racine, d), { withFileTypes: true })) {
    const p = d ? `${d}/${f.name}` : f.name;
    if (f.isDirectory()) { if (!["node_modules", ".git", "tests", "docs"].includes(f.name)) parcourir(p); }
    else if (f.name.endsWith(".html") && !/^google[0-9a-f]+\.html$/.test(f.name)) pages.push(p);
  } };
  parcourir("");
  assert.ok(pages.length >= 8, pages.join(", "));
  for (const p of pages) {
    const h = lire(p);
    const csp = h.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/)?.[1];
    assert.ok(csp, `CSP absente : ${p}`);
    const script = csp.match(/script-src ([^;]+)/)?.[1] || "";
    assert.doesNotMatch(script, /unsafe-/, p);
    assert.match(csp, /object-src 'none'/, p);
    assert.match(csp, /base-uri 'self'/, p);
    assert.doesNotMatch(h, /\son[a-z]+="/i, `attribut on…= dans ${p}`);
    for (const [, corps] of h.matchAll(/<script(?![^>]*(?:ld\+json|\ssrc=))[^>]*>([\s\S]*?)<\/script>/gi)) {
      const empreinte = createHash("sha256").update(corps.replace(/\r\n/g, "\n")).digest("base64");
      assert.ok(script.includes(`'sha256-${empreinte}'`), `script en ligne non autorisé par la CSP dans ${p}`);
    }
  }
});

/* ---------- Référencement ---------- */
test("sitemap.xml : chaque adresse correspond à un fichier, sans la page staff (noindex)", () => {
  const urls = [...lire("sitemap.xml").matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  assert.ok(urls.length >= 4);
  for (const u of urls) {
    assert.match(u, /^https:\/\/lacabanestreamers\.github\.io\/vitrine\//);
    const chemin = decodeURIComponent(new URL(u).pathname.slice(1));
    assert.ok(existe(chemin.endsWith("/") ? chemin + "index.html" : chemin), "introuvable : " + u);
  }
});
test("robots.txt : tout autorisé (le noindex de la page staff doit rester lisible), sitemap annoncé", () => {
  const r = lire("robots.txt");
  assert.match(r, /^Allow: \/$/m);
  assert.doesNotMatch(r, /^Disallow: *\S/m);
  assert.match(r, /Sitemap: https:\/\/lacabanestreamers\.github\.io\/sitemap\.xml/);
});
test("XSS : champs libres jamais injectés bruts dans un gabarit HTML (esc obligatoire)", () => {
  const fichiers = [...readdirSync(join(racine, "js")).filter(f => f.endsWith(".js")).map(f => "js/" + f), "vitrine/index.html"];
  const brut = /\$\{\s*[\w.?\[\]]*\.(bio|avatar|titre|description|palier|follows|vignette|apercu|jeu|lien)\s*\}/;
  for (const f of fichiers) lire(f).split("\n").forEach((l, i) => l.includes("<") && assert.doesNotMatch(l, brut, `${f}:${i + 1} interpolation non échappée`));
});
