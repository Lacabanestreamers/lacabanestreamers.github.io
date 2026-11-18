// Logique de vitrine/app.js exécutée dans un bac à sable (node:vm) avec un faux navigateur minimal : aucun réseau.
// Couvre l'audit du 18/11 : cache partagé de la vérification des lives (decapi), lien de retour du profil, h1 du profil.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "vitrine", "app.js"), "utf8");

/** Faux navigateur : `reponse(url)` décide de chaque appel à fetch ; `stockage` = sessionStorage partagé entre « pages ». */
function page({ page = "streamers", chemin = "/vitrine/streamers.html", recherche = "", stockage = new Map(), reponse = () => new Promise(() => {}) } = {}){
  const el = () => ({ innerHTML: "", textContent: "", hidden: false, classList: { toggle(){}, add(){}, remove(){} }, setAttribute(){}, focus(){}, scrollIntoView(){} });
  const elements = { "#main": el(), "#maj": el(), "#toast": el() };
  const appels = [];
  const store = m => ({ getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) });
  const ctx = {
    console, URLSearchParams, Intl, Date, Math, JSON, Promise, Map, Set, Number, String, Object, Array, encodeURIComponent, CSS: { escape: s => s },
    location: { pathname: chemin, search: recherche, hash: "", origin: "https://lacabanestreamers.github.io", replace(){} },
    document: { body: { dataset: { page }, classList: { toggle(){} } }, title: "", visibilityState: "visible", activeElement: null,
      querySelector: s => elements[s] || null, querySelectorAll: () => [], getElementById: id => elements["#" + id] || null, addEventListener(){} },
    history: { state: null, pushState(){}, replaceState(){}, back(){} },
    sessionStorage: store(stockage), localStorage: store(new Map()),
    addEventListener(){}, setInterval(){}, setTimeout(){}, clearTimeout(){}, requestAnimationFrame(){}, scrollTo(){}, matchMedia: () => ({ matches: false }),
    fetch: (url) => { appels.push(String(url)); return String(url).startsWith("membres.json") ? new Promise(() => {}) : reponse(String(url)); },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return { ctx, elements, appels, run: code => vm.runInContext(code, ctx) };
}
const texte = t => Promise.resolve({ ok: true, status: 200, text: async () => t });
const membres = n => Array.from({ length: n }, (_, i) => ({ login: "m" + i, nom: "M" + i }));
const ilYaUneHeure = new Date(Date.now() - 36e5).toISOString();   // données du robot plus anciennes que la vérification en direct
const attendre = () => new Promise(r => setTimeout(r, 20));

test("lives : une vague, 4 requêtes à la fois au plus, résultat partagé avec la page suivante (sessionStorage)", async () => {
  const stockage = new Map();
  let enCours = 0, max = 0;
  const p1 = page({ stockage, reponse: async url => { enCours++; max = Math.max(max, enCours); await attendre(); enCours--;
    return texte(url.includes("uptime/m1") ? "1 hour, 5 minutes" : url.includes("uptime/") ? "m is offline" : url.includes("viewercount") ? "12" : "Un jeu"); } });
  p1.run(`DATA = ${JSON.stringify({ active: true, maj: ilYaUneHeure, membres: membres(10) })};`);
  await p1.run("verifierLives()");
  assert.ok(max <= 4, `au plus 4 requêtes en parallèle (vu ${max})`);
  assert.equal(p1.appels.filter(u => u.includes("/uptime/")).length, 10);
  assert.equal(p1.run("DATA.membres[1].live.viewers"), 12);
  // page suivante du même onglet, moins de 2 min après : aucune requête, l'état vu en direct est repris
  const p2 = page({ stockage, page: "accueil", chemin: "/vitrine/" });
  p2.run(`DATA = ${JSON.stringify({ active: true, maj: ilYaUneHeure, membres: membres(10) })};`);
  p2.run("appliquerLives(DATA, lireLives())");
  await p2.run("verifierLives()");
  assert.equal(p2.appels.filter(u => u.includes("decapi")).length, 0, "aucune requête decapi");
  assert.equal(p2.run("DATA.membres[1].live?.viewers"), 12, "live repris du cache");
});

test("lives : arrêt propre au premier refus de decapi (429 sans CORS), dernier état gardé, pause partagée", async () => {
  const stockage = new Map();
  let n = 0;
  const p1 = page({ stockage, reponse: async () => { n++; if(n >= 3) throw new TypeError("Failed to fetch"); await attendre(); return texte("m is offline"); } });
  const m = membres(30); m[5].live = { viewers: 3, titre: "live du robot" };
  p1.run(`DATA = ${JSON.stringify({ active: true, maj: ilYaUneHeure, membres: m })};`);
  await p1.run("verifierLives()");
  assert.ok(n <= 6, `la vague s'arrête au premier refus (${n} requêtes)`);
  assert.equal(p1.run("DATA.membres[5].live?.titre"), "live du robot", "état connu gardé");
  const c = JSON.parse(stockage.get("cabane.vitrine.lives"));
  assert.ok(c.pause > Date.now() + 5 * 60e3, "pause notée");
  // même onglet, 3 min plus tard (cache périmé) : la pause empêche toute nouvelle requête
  stockage.set("cabane.vitrine.lives", JSON.stringify({ ...c, t: Date.now() - 3 * 60e3 }));
  const p2 = page({ stockage, reponse: () => { throw new Error("ne doit pas être appelé"); } });
  p2.run(`DATA = ${JSON.stringify({ active: true, maj: ilYaUneHeure, membres: m })};`);
  await p2.run("verifierLives()");
  assert.equal(p2.appels.filter(u => u.includes("decapi")).length, 0);
  // decapi refuse dès le départ : une seule requête (donc une seule erreur en console), pas quatre
  const p3 = page({ reponse: () => Promise.reject(new TypeError("Failed to fetch")) });
  p3.run(`DATA = ${JSON.stringify({ active: true, maj: ilYaUneHeure, membres: m })};`);
  await p3.run("verifierLives()");
  assert.equal(p3.appels.filter(u => u.includes("decapi")).length, 1);
});

test("lives : les données du robot plus récentes que le cache priment", () => {
  const p = page();
  const d = { maj: "2026-11-18T10:00:00Z", membres: [{ login: "a", live: { viewers: 1 } }] };
  assert.equal(p.ctx.appliquerLives(d, { etats: { a: { t: Date.parse("2026-11-18T09:00:00Z"), live: null } } }), false);
  assert.equal(d.membres[0].live.viewers, 1);
  assert.equal(p.ctx.appliquerLives(d, { etats: { a: { t: Date.parse("2026-11-18T11:00:00Z"), live: null } } }), true);
  assert.equal(d.membres[0].live, null);
});

test("profil : nom du streamer en h1, retour vers la page courante sans ?m", () => {
  const p = page({ recherche: "?m=alice" });
  p.ctx.renderProfil({ login: "alice", nom: "Alice", avatar: "https://static-cdn.jtvnw.net/x-300x300.png" }, { titre: "La Cabane" });
  const h = p.elements["#main"].innerHTML;
  assert.match(h, /<h1>Alice<\/h1>/);
  assert.doesNotMatch(h, /<h2>Alice<\/h2>/);
  assert.match(h, /<a class="back" href="\/vitrine\/streamers\.html" data-nav data-retour>← Tous les streamers<\/a>/);
  assert.match(h, /x-150x150\.png/, "avatar du profil en 150x150");
  assert.doesNotMatch(h, /300x300/);
  // depuis l'accueil (/vitrine/?m=…) : retour vers l'accueil, libellé neutre
  const a = page({ page: "accueil", chemin: "/vitrine/", recherche: "?m=alice" });
  a.ctx.renderProfil(undefined, { titre: "La Cabane" });
  assert.match(a.elements["#main"].innerHTML, /href="\/vitrine\/" data-nav data-retour>← Retour<\/a><h1/);
});

test("app.css : en-tête masqué sur un profil, un seul h1 ; aperçus en <img> (plus de background-image)", () => {
  const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "vitrine", "app.css"), "utf8");
  assert.match(css, /body\.profil header\{display:none\}/);
  assert.doesNotMatch(src, /background-image:url/);
  assert.doesNotMatch(src, /<h2 id="h-membres">/, "« Nos streamers » est déjà le h1 de la page");
});

test("Rejoindre : bouton Discord présent seulement quand le staff a rempli le lien", () => {
  for(const [lien, attendu] of [["https://discord.gg/abc", true], ["", false]]){
    const p = page({ page: "rejoindre", chemin: "/vitrine/rejoindre.html" });
    p.run(`DATA = ${JSON.stringify({ active: true, maj: ilYaUneHeure, lienDiscord: lien, rejoindre: { titre: "Rejoindre", texte: "Viens" }, membres: membres(2) })}; render();`);
    assert.equal(/<a class="btn" href="https:\/\/discord\.gg\/abc"/.test(p.elements["#main"].innerHTML), attendu, lien || "vide");
  }
});
