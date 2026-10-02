"use strict";
/* sim/revente-bench.js — v3.329.0 (plan C, partie 2) : LE ROBINET DE LA REVENTE, chiffré.
   Production horaire du village aux plafonds de chaque monde, valeur de revente, et dépenses
   d or jusqu à la fin du Désert. Lit les vraies données et fonctions de coût du jeu.
   USAGE : node sim/revente-bench.js . */
var fs = require("fs"), path = require("path"), vm = require("vm");
var ROOT = process.argv[2];
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
function run(c) { return vm.runInContext(c, G); }
function fmt(n) { return Math.round(n).toLocaleString("fr-FR"); }
run("fullResetState(); game.playerName='Bench'; game.heroId='knight';");

var S = G.PRODUCTION_PLOTS_SHARED, B = G.PRODUCTION_PLOTS_BUILDINGS, R = G.WAREHOUSE_RESOURCES;
var PROD = (G.PRODUCTION_BUILDINGS_DB || null);
var IDS = ["sawmill", "quarry", "mine", "well", "farm", "hunt"];
var KEY = { sawmill: "bois", quarry: "pierre", mine: "fer", well: "eau", farm: "ble", hunt: "viande" };

/* Production continue (plafond haut) d'un bâtiment : n zones au niveau lvl, améliorées ou non. */
function prodPerHour(n, lvl, improved) {
  var tot = 0, cap = 0;
  for (var i = 0; i < n; i++) {
    var pr = S.profiles[S.profilePattern[i]];
    var bonus = 1 + (improved ? S.bonusPerImprovement.fertile + S.bonusPerImprovement.irrigated : 0);
    tot += pr.baseRatePerMin * Math.pow(pr.rateGrowthPerLevel, lvl - 1) * bonus * 60;
    cap += Math.floor(pr.baseCapacity * Math.pow(pr.capacityGrowthPerLevel, lvl - 1));
  }
  return { perHour: tot, cap: cap };
}

var sellMult = function (lvl) { return G.VILLAGE_BUILDINGS.workshop.sellBonusAtLevel(lvl); };
console.log("REVENTE — plan C, partie 2 (données v" + G.GAME_VERSION + ")\n");
[["Forêt (3 zones niv. 3, améliorées)", 3, 3, 4], ["Désert (6 zones niv. 5, améliorées)", 6, 5, 7]].forEach(function (w) {
  var or = 0, orCap = 0;
  console.log(w[0] + " — bonus de revente de l'Atelier niv. " + w[3] + " : ×" + sellMult(w[3]).toFixed(2));
  IDS.forEach(function (id) {
    var p = prodPerHour(w[1], w[2], true), price = Number(R[KEY[id]].sellPrice || 0) * sellMult(w[3]);
    or += p.perHour * price; orCap += p.cap * price;
    console.log("   " + id.padEnd(8) + fmt(p.perHour).padStart(7) + " " + KEY[id] + "/h · réserve " + fmt(p.cap).padStart(5) + " · " + fmt(p.perHour * price).padStart(6) + " or/h");
  });
  console.log("   TOTAL : " + fmt(or) + " or par heure de production continue ; réserves pleines = " + fmt(orCap) + " or\n");
});

/* Dépenses d'or jusqu'à la fin du Désert. */
var sinks = {};
// Entraînement 0 -> 110 sur les cinq stats
var train = 0;
(G.UPGRADES || G.SHOP_UPGRADES || []).forEach(function (u) {
  if (!/^utrain_/.test(u.id)) return;
  for (var l = 0; l < 110; l++) train += G.getUpgradeCost(u, l);
});
sinks["Entraînement 0 → 110 (5 stats)"] = train;
// Bâtiments du village jusqu'au plafond du Désert (part d'or seulement)
G.VillageBuildingManager.ensure();
// v3.329.1 : le Désert doit être « atteint », sinon getNextCost s'arrête au plafond de la Forêt
G.game.worldsEverReached = { 0: true, 1: true }; G.WorldManager.worldIndex = 1;
var caps = G.WORLD_CAPS[1].village, VB = G.VILLAGE_BUILDINGS, village = 0;
Object.keys(caps).forEach(function (id) {
  if (!VB[id]) return;
  for (var l = 0; l < caps[id]; l++) {
    G.game.village.buildings[id] = { level: l };
    var c = G.VillageBuildingManager.getNextCost(id) || {};
    village += Number(c.gold || 0);
  }
});
sinks["Village au plafond du Désert (or)"] = village;
// Zones : ouvertures et niveaux (part d'or)
var zones = 0;
IDS.forEach(function (id) {
  for (var i = 0; i < 6; i++) {
    var u = G.getProductionPlotUnlockCost(id, i); if (u) zones += Number(u.gold || 0);
    for (var l = 1; l < 5; l++) { var c = G.getProductionPlotUpgradeCost(id, l, i); if (c) zones += Number(c.gold || 0); }
  }
});
sinks["Zones de production (or)"] = zones;
var total = 0;
console.log("DÉPENSES D'OR jusqu'à la fin du Désert (hors échoppe, potions, reforges) :");
Object.keys(sinks).forEach(function (k) { total += sinks[k]; console.log("   " + k.padEnd(38) + fmt(sinks[k]).padStart(9)); });
console.log("   " + "TOTAL".padEnd(38) + fmt(total).padStart(9));

// Or de l'Histoire
var story = 0;
Object.keys(G.STORY_REWARDS || {}).forEach(function (k) { story += Number((G.STORY_REWARDS[k] || {}).gold || 0); });
console.log("\nOr de l'Histoire (étapes) : " + fmt(story));
