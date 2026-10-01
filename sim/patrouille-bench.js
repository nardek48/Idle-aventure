"use strict";
/* sim/patrouille-bench.js — v3.334.0 (Évolutions, lot P-0) : le rendement des patrouilles,
   comparé à ce qu'un joueur actif gagne par jour. Lit les vraies données du jeu.

   MODÈLE D'UNE JOURNÉE ACTIVE (hypothèses, réglables) :
   - matériaux : le joueur passe --visites fois par jour et vide des réserves pleines
     (zones au plafond du monde, améliorées ; la production continue n'est pas atteinte) ;
   - or : la Taverne à son plafond de monde, tous les contrats livrés à chaque renouvellement
     (6 h). Ne compte ni l'Histoire, ni les combats : dénominateur prudent, le vrai ratio
     d'or est plus bas ;
   - patrouilles : --heures par jour et par compagnon (8 h la nuit + 4 h = 12), compagnons
     présents dans ce monde (Forêt : Wenna ; Désert : Wenna et Maddoc), anneau moyen,
     --ameliorations moyennes.
   CIBLE (conception P5) : ~15 % des matériaux, au plus 10 % de l'or.
   USAGE : node sim/patrouille-bench.js . [--visites 4] [--heures 12] [--ameliorations 2] */
var fs = require("fs"), path = require("path"), vm = require("vm");
var ROOT = process.argv[2];
function arg(name, def) { var i = process.argv.indexOf(name); return i > 0 ? Number(process.argv[i + 1]) : def; }
var VISITES = arg("--visites", 4), HEURES = arg("--heures", 12), UPG = arg("--ameliorations", 2);
var scripts = (function () { var html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8"), re = /<script src="([^"]+)"><\/script>/g, m, out = []; while ((m = re.exec(html)) !== null) out.push(m[1]); return out; })().filter(function (s) { return !/pwa\.js|boot\.js/.test(s); });

function el() {
  return { style: { setProperty: function(){}, removeProperty: function(){} }, classList: { add: function(){}, remove: function(){}, toggle: function(){}, contains: function(){ return false; } },
    innerHTML: "", textContent: "", scrollTop: 0, disabled: false, querySelector: function(){ return null; }, querySelectorAll: function(){ return []; },
    addEventListener: function(){}, setAttribute: function(){}, getAttribute: function(){ return null; }, appendChild: function(){}, remove: function(){}, hasChildNodes: function(){ return false; }, focus: function(){}, dataset: {}, offsetWidth: 0, parentNode: null };
}
var storage = {};
var sandbox = {
  console: console, Date: Date, Math: Math, JSON: JSON, Object: Object, Array: Array, Number: Number, String: String, Boolean: Boolean,
  setTimeout: function(){ return 0; }, clearTimeout: function(){}, setInterval: function(){ return 0; }, clearInterval: function(){},
  requestAnimationFrame: function(){}, performance: { now: function(){ return Date.now(); } },
  navigator: { serviceWorker: null, userAgent: "vm", vibrate: function(){} }, location: { href: "", search: "", hash: "", protocol: "https:" },
  localStorage: { getItem: function(k){ return storage.hasOwnProperty(k) ? storage[k] : null; }, setItem: function(k,v){ storage[k]=String(v); }, removeItem: function(k){ delete storage[k]; }, key: function(i){ return Object.keys(storage)[i] || null; }, get length(){ return Object.keys(storage).length; } },
  document: { getElementById: function(){ return el(); }, querySelector: function(){ return null; }, querySelectorAll: function(){ return []; }, createElement: function(){ return el(); }, addEventListener: function(){}, body: el(), documentElement: el(), hidden: false, activeElement: null },
  alert: function(){}, confirm: function(){ return true; }, atob: function(s){ return Buffer.from(s,"base64").toString("binary"); }, btoa: function(s){ return Buffer.from(s,"binary").toString("base64"); },
  structuredClone: function (v) { return JSON.parse(JSON.stringify(v)); }, TextEncoder: TextEncoder, TextDecoder: TextDecoder, URL: URL, Blob: function(){}
};
sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
scripts.forEach(function (s) {
  var code = fs.readFileSync(path.join(ROOT, s), "utf8");
  try { vm.runInContext(code, sandbox, { filename: s }); } catch (e) { console.error("LOAD FAIL", s, e.message); process.exit(1); }
});


var G = sandbox;
vm.runInContext("fullResetState(); game.playerName='Bench'; game.heroId='knight';", G);
var S = G.PRODUCTION_PLOTS_SHARED, CAPS = G.WORLD_CAPS, R = G.WAREHOUSE_RESOURCES;
function fmt(n) { return Math.round(n).toLocaleString("fr-FR"); }

/* Réserve pleine d'un bâtiment : n zones au niveau lvl (même formule que revente-bench). */
function reserve(n, lvl) {
  var cap = 0;
  for (var i = 0; i < n; i++) {
    var pr = S.profiles[S.profilePattern[i]];
    cap += Math.floor(pr.baseCapacity * Math.pow(pr.capacityGrowthPerLevel, lvl - 1));
  }
  return cap;
}

/* Or de la Taverne par jour, au plafond du monde, tout livré. */
function tavernGoldPerDay(level) {
  var TM = G.TavernManager, tier = TM.getTemplateTier(level), slots = TM.getSlotCount(level);
  var pool = G.TAVERN_CONTRACT_TEMPLATES.filter(function (t) { return t.tier <= tier && Number((R[t.resourceId] || {}).sellPrice || 0) > 0; });
  var avg = pool.reduce(function (s, t) { return s + TM.getRewardFor(t.resourceId, (t.min + t.max) / 2); }, 0) / pool.length;
  return avg * slots * (24 * 3600e3 / G.TAVERN_REFRESH_MS);
}

var WORLDS_BENCH = [
  { id: "forest", idx: 0, companions: 1 },
  { id: "desert", idx: 1, companions: 2 }
];

console.log("PATROUILLES — banc P-0 (données v" + G.GAME_VERSION + ")");
console.log("Hypothèses : " + VISITES + " visites/jour, " + HEURES + " h de patrouille par compagnon et par jour, " + UPG + " améliorations\n");

WORLDS_BENCH.forEach(function (w) {
  var cap = CAPS[w.idx], zones = cap.zoneRows * 3;
  var perRes = reserve(zones, cap.zoneLevel) * VISITES;
  var matDay = perRes * 6;
  var goldDay = tavernGoldPerDay(cap.village.tavern);

  var rate = G.PATROL_RATES[w.id];
  var rings = Object.keys(G.PATROL_RING_MULT).map(function (k) { return G.PATROL_RING_MULT[k]; });
  var ringAvg = rings.reduce(function (a, b) { return a + b; }, 0) / rings.length;
  var mult = ringAvg * (1 + G.PATROL_UPGRADE_BONUS * UPG);
  var pMat = rate.matPerHour * HEURES * mult * w.companions;
  var pGold = rate.goldPerHour * HEURES * (1 + G.PATROL_UPGRADE_BONUS * UPG) * w.companions;

  console.log(w.id.toUpperCase() + " (" + zones + " zones niv. " + cap.zoneLevel + ", Taverne " + cap.village.tavern + ", " + w.companions + " compagnon" + (w.companions > 1 ? "s" : "") + ")");
  console.log("   Joueur actif : " + fmt(matDay) + " matériaux/jour (" + fmt(perRes) + " par ressource) · " + fmt(goldDay) + " or/jour de Taverne");
  console.log("   Patrouilles  : " + fmt(pMat) + " matériaux/jour · " + fmt(pGold) + " or/jour");
  console.log("   Ratio        : matériaux " + (100 * pMat / matDay).toFixed(1) + " % (cible ~15 %) · or " + (100 * pGold / goldDay).toFixed(1) + " % (cible <= 10 %)");
  var one8 = rate.matPerHour * 8 * mult, g8 = rate.goldPerHour * 8 * (1 + G.PATROL_UPGRADE_BONUS * UPG);
  console.log("   Une patrouille de 8 h : ~" + fmt(one8) + " matériaux (" + fmt(one8 * G.PATROL_SPLIT.main) + " + " + fmt(one8 * G.PATROL_SPLIT.second) + ") et ~" + fmt(g8) + " or\n");
});
