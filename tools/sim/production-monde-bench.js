"use strict";
/* tools/sim/production-monde-bench.js — v3.608 (chantier surproduction, demande de Seb 01/11) :
   par monde, ce que coûte le village de ce monde (bâtiments, zones, ateliers) face à ce que produisent ses zones.
   Coûts lus dans le vrai code (getLevelCost, getProductionPlot*Cost, getWorkshopUpgradeCost) ; matériaux fabriqués
   ramenés au brut (planche = 5 bois, lingot = 5 fer). Production : débit des zones au plafond (getTotalRatePerMin).
   USAGE : node tools/sim/production-monde-bench.js . */
var fs = require("fs"), path = require("path"), vm = require("vm");
var ROOT = require("../chemins.js").jeu(process.argv[2]);
var src = fs.readFileSync(path.join(__dirname, "debouches-bench.js"), "utf8");
src = src.slice(0, src.indexOf("var SCENARIOS")); // on garde boot(), RAW, RECIPE
var lib = new Function("require", "ROOT", "path", "vm", src.replace(/^"use strict";/, "").replace(/var fs = [^\n]*\n/, "var fs = require('fs');\n").replace(/var ROOT = [^\n]*\n/, "") + "\nreturn { boot: boot, RAW: RAW };")(require, ROOT, path, vm);
var boot = lib.boot, RAW = lib.RAW;
var NOMS = ["Forêt", "Désert", "Ruines", "Crypte", "Montagne"], PREFIX = ["forest", "desert", "ruines", "crypte", "montagne"];
var TO_RAW = { planche: { bois: 5 }, lingot: { fer: 5 }, bloc: { pierre: 6, fer: 2 }, acier: { lingot: 3, bois: 6 },
  cire_consacree: { cire_sepulcre: 3, lingot: 2 }, obsidienne_taillee: { cendre_vive: 3, acier: 1 }, resine_durcie: { seve_aeswyn: 2, planche: 3 } }; // recettes de data/workshops.js

function setWorld(g, world) {
  g.game.worldsEverReached = {}; for (var w = 0; w <= world; w++) g.game.worldsEverReached[w] = true;
  g.WorldManager.worldIndex = world;
  g.StoryQuestManager.isStepReached = function (id) { var i = PREFIX.findIndex(function (p) { return String(id).indexOf(p) === 0; }); return i >= 0 && i <= world; };
}
function add(acc, cost, n) { Object.keys(cost || {}).forEach(function (k) { var c = cost[k] * (n || 1); if (TO_RAW[k]) add(acc, TO_RAW[k], c); else acc[k] = (acc[k] || 0) + c; }); }

var g = boot();
vm.runInContext("fullResetState(); game.playerName='Banc'; game.heroId='knight';", g);
["renderPanel", "renderHud", "renderAll", "saveGame", "showToast", "addLog"].forEach(function (f) { g[f] = function () {}; });
var LIN = (process.argv.join(" ").match(/--lin=([\d.]+)/) || [])[1]; if (LIN) g.PRODUCTION_PLOTS_SHARED.linearPerLevel = Number(LIN); // débit des zones par niveau
var VB = g.VillageBuildingManager, PPS = g.ProductionPlotsSystem; VB.ensure();
var prevVillage = {}, prevRows = 0, prevZL = 1, prevWL = 1, out = [];
for (var world = 0; world < 5; world++) {
  setWorld(g, world);
  var cap = g.WORLD_CAPS[world], parts = { batiments: {}, zones: {}, ateliers: {} };
  Object.keys(g.VILLAGE_BUILDINGS).forEach(function (id) {
    var to = Math.min(g.VILLAGE_BUILDINGS[id].maxLevel, g.WorldCaps.getVillageCap(id)), from = prevVillage[id] || 0;
    for (var l = from; l < to; l++) add(parts.batiments, VB.getLevelCost(id, l));
    prevVillage[id] = Math.max(from, to);
  });
  var zl = g.WorldCaps.getZoneLevel(), rows = g.WorldCaps.getZoneRows();
  PPS.getManagedBuildingIds().forEach(function (b) {
    var imp = g.PRODUCTION_PLOTS_BUILDINGS[b].improvementCost;
    for (var i = 0; i < rows * 3; i++) {
      var isNew = Math.floor(i / 3) >= prevRows;
      if (isNew && i > 0) add(parts.zones, g.getProductionPlotUnlockCost(b, i));
      for (var l = isNew ? 1 : prevZL; l < zl; l++) add(parts.zones, g.getProductionPlotUpgradeCost(b, l, i));
      if (isNew) { add(parts.zones, imp.fertile.cost); add(parts.zones, imp.irrigated.cost); }
    }
  });
  var wl = cap.workshopLevel || 1;
  Object.keys(g.WORKSHOPS_CONFIG).forEach(function (wid) { for (var l = prevWL; l < wl; l++) { var c = g.getWorkshopUpgradeCost(wid, l); if (c) add(parts.ateliers, c); } });
  prevRows = rows; prevZL = zl; prevWL = wl;
  // Production des zones au plafond du monde
  PPS.getManagedBuildingIds().forEach(function (b) { PPS.getPlots(b).forEach(function (p, i) { var open = Math.floor(i / 3) < rows; p.state = open ? "open" : "locked"; p.level = open ? zl : 1; p.fertile = p.irrigated = open; }); });
  var prod = {}; PPS.getManagedBuildingIds().forEach(function (b) { prod[g.PRODUCTION_BUILDINGS[b].resourceKey] = PPS.getTotalRatePerMin(b) * 60; });
  out.push({ world: world, parts: parts, prod: prod, cap: g.WarehouseManager.getCap("bois") });
}
out.forEach(function (o) {
  var tot = {}; ["batiments", "zones", "ateliers"].forEach(function (k) { add(tot, o.parts[k]); });
  console.log("\n== " + NOMS[o.world] + " (Entrepôt " + o.cap + ")");
  console.log("   ressource   bâtiments    zones  ateliers     TOTAL   prod/h zones   heures de prod.");
  RAW.forEach(function (r) {
    var f = function (x) { return String(Math.round(x || 0)).padStart(9); };
    console.log("   " + r.padEnd(9) + f(o.parts.batiments[r]) + f(o.parts.zones[r]) + f(o.parts.ateliers[r]) + f(tot[r]) + f(o.prod[r]).padStart(14) + String(o.prod[r] ? (tot[r] / o.prod[r]).toFixed(1) : "-").padStart(16));
  });
  var other = Object.keys(tot).filter(function (k) { return RAW.indexOf(k) < 0; });
  console.log("   autres : " + other.map(function (k) { return k + " " + Math.round(tot[k]); }).join(" · "));
});
