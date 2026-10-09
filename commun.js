// La Cabane : calculs communs à la page staff et au robot.
// Ce fichier existe en DEUX exemplaires identiques : à la racine du site (lacabanestreamers.github.io/commun.js)
// et dans le dépôt privé (cabane/robot/commun.js). Si tu le modifies, recopie-le aux deux endroits :
// le robot compare les deux à chaque passage et signale une différence dans Réglages → Santé.
// Script classique (pas de module) : chargé par <script src> dans la page, et par `import "./commun.js"` dans le robot.
// @ts-check
(function(global){
  "use strict";
  const TZ = "Europe/Paris";
  // Version du format des données (cabane-data.json). 2 = relevés de follows dans un fichier à part.
  const VERSION = 2;
  const PALIER = 50;
  const STAG_STATUTS = ["Proposition à faire", "Proposition en cours", "Attente staff"];
  const FERMES = ["Refusé", "Abandonnée", "Aucun contact"];

  /* ---------- Dates (AAAA-MM-JJ, heure de Paris) ---------- */
  /** @param {Date} [d] */
  const parisDate = (d = new Date()) => new Intl.DateTimeFormat("en-CA", {timeZone:TZ, year:"numeric", month:"2-digit", day:"2-digit"}).format(d);
  /** @param {Date} [d] */
  const parisHeure = (d = new Date()) => Number(new Intl.DateTimeFormat("en-GB", {timeZone:TZ, hour:"2-digit", hourCycle:"h23"}).format(d));
  /** @param {string} iso */
  const utc = iso => { const [y, m, d] = iso.slice(0, 10).split("-").map(Number); return Date.UTC(y, m - 1, d); };
  /** Date AAAA-MM-JJ décalée de n jours. @param {string} iso @param {number} n */
  const plusJours = (iso, n) => new Date(utc(iso) + n * 864e5).toISOString().slice(0, 10);
  /** Nombre de jours de a à b (positif si b est après a). @param {string} a @param {string} b */
  const joursEntre = (a, b) => Math.round((utc(b) - utc(a)) / 864e5);
  /** Date + heure de Paris → instant UTC (gère l'heure d'été). @param {string} date @param {string} [heure] */
  function parisVersUtc(date, heure = "00:00"){
    const [y, m, d] = date.split("-").map(Number), [h, mi] = (heure || "00:00").split(":").map(Number);
    let t = Date.UTC(y, m - 1, d, h, mi);
    for(let i = 0; i < 2; i++){
      const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {timeZone:TZ, year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", hourCycle:"h23"}).formatToParts(new Date(t)).map(x => [x.type, x.value]));
      t += Date.UTC(y, m - 1, d, h, mi) - Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
    }
    return new Date(t);
  }

  /* ---------- Séries d'événements ---------- */
  /** Occurrences d'une série entre deux dates incluses. @param {any} s @param {string} du @param {string} au @returns {string[]} */
  function occurrencesSerie(s, du, au){
    if(!s?.debut || !/^\d{4}-\d{2}-\d{2}$/.test(s.debut)) return [];
    const iso = (/** @type {number} */ t) => new Date(t).toISOString().slice(0, 10), fin = s.fin || "9999-12-31", out = /** @type {string[]} */ ([]);
    const [y, m, d] = s.debut.split("-").map(Number), t0 = Date.UTC(y, m - 1, d);
    const garder = (/** @type {string} */ x) => { if(x >= du && x >= s.debut && !(s.exclus || []).includes(x)) out.push(x); };
    if(s.rythme === "hebdo" || s.rythme === "2sem"){
      const pas = (s.rythme === "hebdo" ? 7 : 14) * 864e5;
      let t = t0; if(iso(t) < du){ const n = Math.floor((utc(du) - t0) / pas); if(n > 0) t += n * pas; }
      for(; iso(t) <= au && iso(t) <= fin; t += pas) garder(iso(t));
    } else if(s.rythme === "mois" || s.rythme === "moisPos"){
      const jourSem = new Date(t0).getUTCDay(), pos = Math.ceil(d / 7);
      for(let k = 0; k < 600; k++){
        const an = y + Math.floor((m - 1 + k) / 12), mo = (m - 1 + k) % 12, dernier = new Date(Date.UTC(an, mo + 1, 0)).getUTCDate();
        let j;
        if(s.rythme === "mois") j = Math.min(d, dernier);
        else { const premier = new Date(Date.UTC(an, mo, 1)).getUTCDay(); j = 1 + ((jourSem - premier + 7) % 7) + (pos - 1) * 7; if(pos >= 5 || j > dernier){ j = 1 + ((jourSem - premier + 7) % 7); while(j + 7 <= dernier) j += 7; } }
        const x = iso(Date.UTC(an, mo, j)); if(x > au || x > fin) break; garder(x);
      }
    }
    return out;
  }
  /** Événement créé pour une occurrence de série. @param {any} s @param {string} date */
  const occurrence = (s, date) => ({id:`${s.id}_${date}`, serie:s.id, titre:s.titre, date, heure:s.heure || "", duree:s.duree || 120, type:s.type || "",
    description:s.description || "", lien:s.lien || "", public:s.public !== false, discord:s.discord !== false, publierDiscord:!!s.publierDiscord,
    participants:[], par:s.par || "Série"});

  /* ---------- Propositions ---------- */
  /** Date depuis laquelle la proposition est dans son statut actuel (AAAA-MM-JJ) ou null. @param {any} p */
  const dateStatut = p => { const d = p.statutDepuis || p.dateRevue || p.dateProposition || p.maj?.le; return d ? String(d).slice(0, 10) : null; };
  /** Seuil « qui stagne » (jours). @param {any} settings */
  const seuilStagnation = settings => Number(settings?.stagnationJours) || 14;
  /** Jours passés dans le statut actuel (au jour donné), null si inconnu. @param {any} p @param {string} jour */
  const joursDansStatut = (p, jour) => { const d = dateStatut(p); return d ? joursEntre(d, jour) : null; };

  /* ---------- Paliers de follows ---------- */
  /** @param {number} follows */
  const niveauPalier = follows => Math.floor(follows / PALIER) * PALIER;

  /* ---------- Relevés de follows (fichier à part depuis la version 2) ---------- */
  /** Chemin du fichier des relevés à partir de celui des données. @param {string} chemin */
  const cheminReleves = chemin => chemin.replace(/(-data)?\.json$/i, "-releves.json");
  /** Union de listes de relevés par date (la dernière liste l'emporte), triée. @param {...any[]} listes */
  function fusionnerReleves(...listes){
    const parDate = new Map();
    for(const l of listes) for(const s of l || []) if(s?.date) parDate.set(s.date, s);
    return [...parDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }
  /** Ajoute (ou remplace) le relevé d'un jour ; plafond de 400 relevés. @param {any[]} liste @param {any} s */
  function ajouterReleve(liste, s){ const l = fusionnerReleves(liste, [s]); return l.length > 400 ? l.slice(-400) : l; }
  /** Changement de pseudo dans tous les relevés. @param {any[]} liste @param {string} ancien @param {string} nouveau */
  function renommerReleves(liste, ancien, nouveau){
    for(const sn of liste || []) if(sn.follows && ancien in sn.follows){ sn.follows[nouveau] = sn.follows[ancien]; delete sn.follows[ancien]; }
  }

  /* ---------- Format des données ---------- */
  /** Version du fichier de données (1 si absente). @param {any} d */
  const versionDe = d => Number(d?.version) || 1;

  global.Commun = {TZ, VERSION, PALIER, STAG_STATUTS, FERMES, parisDate, parisHeure, plusJours, joursEntre, parisVersUtc,
    occurrencesSerie, occurrence, dateStatut, seuilStagnation, joursDansStatut, niveauPalier,
    cheminReleves, fusionnerReleves, ajouterReleve, renommerReleves, versionDe};
})(typeof window !== "undefined" ? window : globalThis);
