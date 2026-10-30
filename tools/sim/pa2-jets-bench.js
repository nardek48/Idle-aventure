"use strict";
/* tools/sim/pa2-jets-bench.js — v3.577.0 (Petites Aventures, lot 2) : étalonnage du jet au d20.
   Pour chaque classe et chaque monde, un héros de référence (entraînement attendu au milieu du monde,
   stat principale et Endurance entraînées comme au banc de calibrage) : chance de réussite par voie,
   au début, au milieu et à la fin d'une Petite Aventure (Sentier, obstacle de base 5).
   Repères visés (validés le 30/10) : voie forte ~75 %, voie moyenne ~60 %, voie faible ~45 %.
   Usage : node tools/sim/pa2-jets-bench.js [.] [--ovr={"ddBase":9,...}] */

var fs = require("fs"), path = require("path");
var ROOT = require("../chemins.js").jeu(process.argv[2] && process.argv[2][0] !== "-" ? process.argv[2] : undefined);
var OVR = (process.argv.filter(function (a) { return a.indexOf("--ovr=") === 0; })[0] || "").slice(6);

var src = fs.readFileSync(path.join(__dirname, "forecast-calibration-bench.js"), "utf8").replace(/\nmain\(\);\s*$/, "\n");
var mod = { exports: {} };
new Function("require", "process", "module", "__dirname", src + "\nmodule.exports = { g: g, run: run, setup: setup, CLASSES: CLASSES };")(
  require, { argv: [process.argv[0], "x", ROOT] }, mod, __dirname);
var B = mod.exports, g = B.g;
if (OVR) Object.assign(g.PA2_D20, JSON.parse(OVR));

// Entraînement attendu au milieu de chaque monde (plafonds du Terrain par acte, data/world-caps.js)
var WORLDS = [
  { id: "forest", label: "Forêt", train: 30 }, { id: "desert", label: "Désert", train: 90 },
  { id: "ruins", label: "Ruines", train: 120 }, { id: "crypt", label: "Crypte", train: 140 },
  { id: "mountain", label: "Montagne", train: 170 }
];
var VOIES = ["power", "precision", "endurance"], NOM = { power: "Force", precision: "Précision", endurance: "Endurance" };
var P = g.Pa2Run;

function pct(x) { return String(Math.round(x * 100)).padStart(3) + " %"; }

var bilan = { strong: [], neutral: [], weak: [] };
console.log("Jet au d20 : chance de réussite (début / milieu / fin de l'aventure, Sentier, obstacle de base 5)\n");
B.CLASSES.forEach(function (c) {
  console.log("== " + c.label);
  WORLDS.forEach(function (w) {
    B.setup(c.hero, c.id, { weapon: 0, kit: false, train: w.train, potions: 0 });
    var snap = g.SceneRunManager.buildHeroSnapshot();
    var run = { worldId: w.id, ring: "sentier", parcours: true, heroSnapshot: snap, wounds: 0, flags: {} };
    var line = "  " + w.label.padEnd(9);
    VOIES.forEach(function (v) {
      var ch = [0, 4, 8].map(function (row) {
        var ck = P._check(run, v, { node: { row: row }, base: 5, voie: v, bonus: 0 });
        return ck.chance / 100;
      });
      var m = P.masteryOf(v), kind = m > 0 ? "strong" : (m < 0 ? "weak" : "neutral");
      bilan[kind].push(ch[1]);
      var sv = P.checkStat(run, v, v); line += " | " + (NOM[v] + (m > 0 ? "+" : (m < 0 ? "−" : " "))).padEnd(11) + "mod " + P.statMod(sv) + " (" + Math.round(sv) + ") " + ch.map(pct).join(" ");
    });
    console.log(line);
  });
});
function moy(a) { return a.reduce(function (s, x) { return s + x; }, 0) / Math.max(1, a.length); }
console.log("\nMoyennes au milieu de l'aventure : voie forte " + pct(moy(bilan.strong)) + " · moyenne " + pct(moy(bilan.neutral)) + " · faible " + pct(moy(bilan.weak)));
console.log("Repères visés : forte ~75 %, moyenne ~60 %, faible ~45 %.");
