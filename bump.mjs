// bump.mjs — met à jour d'un coup la version de cache de La Cabane.
// Unifie tous les ?v=NNN (page staff + vitrine) sur un seul numéro frais,
// aligne sw.js (const V) et incrémente le compteur de cache (const CACHE = "cabane-vN").
// Sans ça : on bump à la main dans une vingtaine d'endroits et on en oublie un → l'invariant du test casse.
// Usage : node bump.mjs            (version = date du jour AAAAMMJJHH)
//         node bump.mjs 2026110809 (version imposée)
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const racine = dirname(fileURLToPath(import.meta.url));
const d = new Date();
const p = n => String(n).padStart(2, "0");
const version = process.argv[2] || `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}`;
if (!/^\d{10}$/.test(version)) { console.error("Version invalide (attendu AAAAMMJJHH) :", version); process.exit(1); }

// 1) tous les ?v=NNN des pages HTML → même version (CRLF préservés : on ne touche qu'aux chiffres)
const htmls = [];
const scan = dir => { for (const e of readdirSync(join(racine, dir), { withFileTypes: true })) {
  const rel = dir ? `${dir}/${e.name}` : e.name;
  if (e.isDirectory()) { if (![".git", "node_modules", "tests", "fonts", "docs"].includes(e.name)) scan(rel); }
  else if (e.name.endsWith(".html")) htmls.push(rel);
} };
scan("");
let touches = 0;
for (const f of htmls) {
  const avant = readFileSync(join(racine, f), "utf8");
  const apres = avant.replace(/\?v=\d+/g, `?v=${version}`);
  if (apres !== avant) { writeFileSync(join(racine, f), apres); touches++; }
}

// 2) sw.js : const V aligné sur la même version, compteur de cache +1
const swChemin = join(racine, "sw.js");
let sw = readFileSync(swChemin, "utf8");
sw = sw.replace(/const V = "\?v=\d+"/, `const V = "?v=${version}"`);
sw = sw.replace(/const CACHE = "cabane-v(\d+)"/, (_, n) => `const CACHE = "cabane-v${Number(n) + 1}"`);
writeFileSync(swChemin, sw);

// auto-contrôle : l'invariant vérifié par tests/vitrine.test.mjs doit tenir
const idx = readFileSync(join(racine, "index.html"), "utf8");
const nums = new Set([...idx.matchAll(/\?v=(\d+)/g)].map(m => m[1]));
if (nums.size !== 1 || [...nums][0] !== version || !sw.includes(`const V = "?v=${version}"`)) {
  console.error("Auto-contrôle échoué : les versions ne sont pas alignées."); process.exit(1);
}
console.log(`Version ?v=${version} posée dans ${touches} page(s) HTML + sw.js ; cache = ${sw.match(/cabane-v\d+/)[0]}.`);
console.log("Vérifie : npm test, puis git add/commit/push.");
