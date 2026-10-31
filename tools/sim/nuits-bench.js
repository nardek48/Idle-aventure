"use strict";
/* tools/sim/nuits-bench.js — v3.602.0 (jours du monde, J2 + nuit vivante) : ce que les nuits reprennent, sur le vrai moteur.
   Carte entièrement libérée, Palissade à plusieurs niveaux ; le joueur reprend chaque secteur perdu (une sortie chacun).
   Mesure : secteurs repris par nuit, part des sorties passées à reprendre. Usage : node tools/sim/nuits-bench.js . [nuits=3000] */
var fs = require("fs"), path = require("path");
var ROOT = require("../chemins.js").jeu(process.argv[2]);
var NIGHTS = Number(process.argv[3] || 3000);
var src = fs.readFileSync(path.join(__dirname, "forecast-calibration-bench.js"), "utf8").replace(/\nmain\(\);\s*$/, "\n");
var mod = { exports: {} };
new Function("require", "process", "module", "__dirname", src + "\nmodule.exports = { g: g, run: run };")(require, { argv: [process.argv[0], "x", ROOT] }, mod, __dirname);
var g = mod.exports.g, run = mod.exports.run;
run("fullResetState(); game.playerName='Banc'; game.heroId='knight'; EquipmentManager.recalcStats(); game.unlockedTabs.village = true;");
g.saveGame = function () {}; g.addLog = function () {}; g.LivingMapManager.isMapOpen = function () { return true; }; // toutes les cartes ouvertes
[["forest", 0], ["desert", 1]].forEach(function (wd) {
  var LM = g.LivingMapManager;
  run("WorldManager.worldIndex = " + wd[1] + ";");
  var map = g.LIVING_MAPS[Object.keys(g.LIVING_MAPS).filter(function (k) { return g.LIVING_MAPS[k].worldId === wd[0]; })[0]];
  console.log("\n" + wd[0] + " (" + map.sectors.length + " secteurs, anneaux 2-3 : " + map.sectors.filter(function (d) { return d.ring >= 2; }).length + ")");
  console.log("Palissade | repris / nuit | sorties à reprendre (sur 3 par nuit)");
  [0, 3, 5, 7, 10].forEach(function (pal) {
    g.VillageBuildingManager.getLevel = function (id) { return id === "palisade" ? pal : 0; };
    LM.ensureDefaults();
    map.sectors.forEach(function (d) { var s = LM.getState(map.id, d.id); s.state = "libere"; s.liberatedCount = 1; s.firstRewardClaimed = true; });
    var lost = 0;
    for (var n = 0; n < NIGHTS; n++) {
      var night = g.WorldDays.nightfall();
      if (night.kind === "reprise") { lost++; LM.getState(map.id, night.sectorId).state = "libere"; } // le joueur le reprend
    }
    console.log("    " + String(pal).padStart(2) + "    |     " + (lost / NIGHTS).toFixed(2) + "      |   " + Math.round(100 * lost / NIGHTS / 3) + " %");
  });
});
