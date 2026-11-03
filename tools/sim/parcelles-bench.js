"use strict";
/* tools/sim/parcelles-bench.js — chantier zones (idée de Seb, 01/11) : « 3 parcelles (rapide, moyenne, lente)
   qui montent de plus en plus, en mode automatique ».
   Compare, monde par monde, à partir de l'arrivée (zones au plafond du monde précédent) :
     ACT : aujourd'hui, 9 zones (rangées ouvertes par monde), niveaux 5/8/11/14/17 ;
     P3  : 3 parcelles seulement, niveaux 5/10/12/15/17 ; au-delà du niveau 5, débit calé sur les zones d'aujourd'hui à chaque plafond ;
           le coût de chaque niveau = part du coût réel des zones du même monde (même total), selon le gain de débit.
   Les deux en mode automatique : à chaque récolte, l'achat le moins cher (ouvrir, monter, améliorer) tant qu'il est payable.
   Production réelle (ProductionPlotsSystem), Entrepôt et Grand Ouvrage automatique réels ; ni Taverne ni caravane (borne haute).
   USAGE : node tools/sim/parcelles-bench.js . [--cadence=10|360]   (minutes entre deux récoltes, 16 h d'éveil par jour) */
var fs = require("fs"), path = require("path"), vm = require("vm");
var ROOT = require("../chemins.js").jeu(process.argv[2]);
var src = fs.readFileSync(path.join(__dirname, "debouches-bench.js"), "utf8"); src = src.slice(0, src.indexOf("var SCENARIOS"));
var lib = new Function("require", "ROOT", "path", "vm", src.replace(/^"use strict";/, "").replace(/var fs = [^\n]*\n/, "var fs = require('fs');\n").replace(/var ROOT = [^\n]*\n/, "")
  + "\nreturn { boot: boot, RAW: RAW, setNow: function (t) { NOW = t; }, getNow: function () { return NOW; } };")(function (m) { return require(m.indexOf("../") === 0 ? path.join(__dirname, m) : m); }, ROOT, path, vm);
var CAD = Number((process.argv.join(" ").match(/--cadence=(\d+)/) || [])[1] || 10);
var NOMS = ["Forêt", "Désert", "Ruines", "Crypte", "Montagne"], PREFIX = ["forest", "desert", "ruines", "crypte", "montagne"];
var P3CAP = [5, 10, 12, 15, 17], ACTCAP = [5, 8, 11, 14, 17], ACTROWS = [1, 2, 2, 3, 3];

/* Débit d'une parcelle par niveau : +70 % jusqu'au 5 (comme aujourd'hui), puis calé pour que les 3 parcelles
   égalent les zones d'aujourd'hui à chaque plafond (Désert 2 rangées niv. 8 = 3 × 11,8 ; Ruines 16 ; Crypte 30,3 ; Montagne 36,6). */
var P3ANCHOR = [[1, 1], [5, 3.8], [10, 11.8], [12, 16], [15, 30.3], [17, 36.6]];
function p3Mult(L) {
  for (var i = 1; i < P3ANCHOR.length; i++) { var a = P3ANCHOR[i - 1], b = P3ANCHOR[i]; if (L <= b[0]) return a[1] + (b[1] - a[1]) * (L - a[0]) / (b[0] - a[0]); }
  return P3ANCHOR[P3ANCHOR.length - 1][1];
}

function campaign(world, mode) {
  lib.setNow(Date.UTC(2026, 9, 26, 6, 0, 0));
  var g = lib.boot(), PPS = g.ProductionPlotsSystem, W = g.WarehouseManager, RAW = lib.RAW;
  vm.runInContext("fullResetState(); game.playerName='Banc'; game.heroId='knight';", g);
  ["renderPanel", "renderHud", "renderAll", "saveGame", "showToast", "addLog", "showHowToToast"].forEach(function (f) { g[f] = function () {}; });
  g.game.worldsEverReached = {}; for (var w = 0; w <= world; w++) g.game.worldsEverReached[w] = true;
  g.WorldManager.worldIndex = world;
  g.StoryQuestManager.isStepReached = function (id) { var i = PREFIX.findIndex(function (p) { return String(id).indexOf(p) === 0; }); return i >= 0 && i <= world; };
  g.VillageBuildingManager.ensure();
  Object.keys(g.VILLAGE_BUILDINGS).forEach(function (id) { g.game.village.buildings[id] = Object.assign(g.game.village.buildings[id] || {}, { level: Math.min(g.VILLAGE_BUILDINGS[id].maxLevel, g.WorldCaps.getVillageCap(id)) }); });
  var flags = g.PRODUCTION_UNLOCK_FLAGS; g.game.explorationProgression = g.game.explorationProgression || {};
  Object.keys(flags).forEach(function (id) { g.game.explorationProgression[flags[id]] = true; });
  var B = PPS.getManagedBuildingIds();

  // Coût réel des zones de ce monde (ACT), par bâtiment : sert d'enveloppe à P3
  var band = {};
  B.forEach(function (b) {
    var c = {}; function add(x) { Object.keys(x || {}).forEach(function (k) { c[k] = (c[k] || 0) + x[k]; }); }
    for (var i = 0; i < ACTROWS[world] * 3; i++) {
      var isNew = Math.floor(i / 3) >= (world ? ACTROWS[world - 1] : 0);
      if (isNew && i > 0) add(g.getProductionPlotUnlockCost(b, i));
      for (var l = isNew ? 1 : ACTCAP[world - 1]; l < ACTCAP[world]; l++) add(g.getProductionPlotUpgradeCost(b, l, i));
    }
    band[b] = c;
  });

  if (mode === "P3") {
    var lo = world ? P3CAP[world - 1] : 1, hi = P3CAP[world];
    g.WorldCaps.getZoneRows = function () { return 1; };
    g.WorldCaps.getZoneLevel = function () { return hi; };
    PPS.levelMult = function (L) { return p3Mult(Math.max(1, Number(L) || 1)); };
    var orig = g.getProductionPlotUpgradeCost, tot = 3 * (p3Mult(hi) - p3Mult(lo));
    g.getProductionPlotUpgradeCost = function (b, L, i) {
      if (L < lo || !world) return orig(b, L, i);
      var share = (p3Mult(L + 1) - p3Mult(L)) / tot, c = {};
      Object.keys(band[b]).forEach(function (k) { c[k] = Math.max(1, Math.round(band[b][k] * share)); });
      return c;
    };
  }
  // État d'arrivée : zones au plafond du monde précédent, améliorées
  B.forEach(function (b) {
    PPS.getPlots(b).forEach(function (p, i) {
      var open = mode === "P3" ? i < 3 : Math.floor(i / 3) < (world ? ACTROWS[world - 1] : 1);
      p.state = open ? "open" : "locked"; p.level = open ? (world ? (mode === "P3" ? P3CAP : ACTCAP)[world - 1] : 1) : 1;
      p.fertile = p.irrigated = open && world > 0; p.stock = 0; p.lastTick = lib.getNow();
    });
  });
  RAW.forEach(function (k) { g.game.resources[k] = Math.floor(W.getCap(k) / 2); });
  var rate0 = B.reduce(function (a, b) { return a + PPS.getTotalRatePerMin(b); }, 0);

  var buys = 0;
  function autoBuy() {
    for (var guard = 0; guard < 500; guard++) {
      var best = null;
      B.forEach(function (b) {
        var cfg = g.PRODUCTION_PLOTS_BUILDINGS[b], cap = PPS.getPlotLevelCap();
        PPS.getPlots(b).forEach(function (p, i) {
          if (!PPS.isPlotRowOpen(i)) return;
          var o = null;
          if (p.state === "locked") o = { c: g.getProductionPlotUnlockCost(b, i), go: function () { return PPS.unlockPlot(b, i); } };
          else if (p.level < cap) o = { c: g.getProductionPlotUpgradeCost(b, p.level, i), go: function () { return PPS.upgradePlot(b, i); } };
          else if (!p.fertile) o = { c: cfg.improvementCost.fertile.cost, go: function () { return PPS.toggleImprovement(b, i, "fertile"); } };
          else if (!p.irrigated) o = { c: cfg.improvementCost.irrigated.cost, go: function () { return PPS.toggleImprovement(b, i, "irrigated"); } };
          if (!o || !o.c) return;
          var sum = Object.keys(o.c).reduce(function (a, k) { return a + o.c[k]; }, 0);
          if (Object.keys(o.c).every(function (k) { return W.getAmount(k) >= o.c[k]; }) && (!best || sum < best.sum)) { o.sum = sum; best = o; }
        });
      });
      if (!best) return;
      var r = best.go(); if (!r || !r.ok) return; buys++;
    }
  }
  function done() { var cap = PPS.getPlotLevelCap(); return B.every(function (b) { return PPS.getPlots(b).every(function (p, i) { return !PPS.isPlotRowOpen(i) || (p.state === "open" && p.level >= cap && p.fertile && p.irrigated); }); }); }

  var t = 0, end = null;
  for (t = 0; t < 60 * 24 * 30; t += CAD) {
    lib.setNow(lib.getNow() + CAD * 60000);
    var h = Math.floor((t % 1440) / 60);
    if (h >= 16) continue; // 8 h de sommeil : les zones remplissent leur réserve
    B.forEach(function (b) { PPS.catchUpOffline(b); var k = g.PRODUCTION_BUILDINGS[b].resourceKey; W.addResource(k, PPS.harvestAll(b, W.getFreeSpace(k)), true); });
    autoBuy();
    if (done()) { end = t; break; }
  }
  var rate1 = B.reduce(function (a, b) { return a + PPS.getTotalRatePerMin(b); }, 0);
  return { end: end, buys: buys, rate0: rate0, rate1: rate1, go: g.GrandOuvrage.getTier() };
}
function hh(m) { return m == null ? "> 30 j" : m < 1440 ? (m / 60).toFixed(1) + " h" : (m / 1440).toFixed(1) + " j"; }
console.log("Récolte toutes les " + CAD + " min pendant 16 h par jour ; achats automatiques au plus économique.");
for (var world = 1; world < 5; world++) {
  var a = campaign(world, "ACT"), p = campaign(world, "P3");
  console.log("\n== " + NOMS[world]);
  console.log("   ACT (9 zones, niv. " + ACTCAP[world] + ") : zones finies en " + hh(a.end) + ", " + a.buys + " achats, débit " + Math.round(a.rate0) + " → " + Math.round(a.rate1) + " /min");
  console.log("   P3  (3 parcelles, niv. " + P3CAP[world] + ") : finies en " + hh(p.end) + ", " + p.buys + " achats, débit " + Math.round(p.rate0) + " → " + Math.round(p.rate1) + " /min");
}
