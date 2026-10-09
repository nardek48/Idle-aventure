"use strict";
/* tools/sim/labyrinthe-bench.js — v3.434.0 (Ruines, RU12) : le Labyrinthe aux leviers.
   Livraison 1 : pertes de PV estimées des trois combats (garde, Contremaître, Gardien) aux profils
   des Ruines, héros seul (règle des Petites Aventures). Le robot explorateur viendra en livraison 2.
   USAGE : node tools/sim/labyrinthe-bench.js . [--profil palier|rare] */
var fs = require("fs"), path = require("path");
var base = fs.readFileSync(path.join(__dirname, "plafond-bench.js"), "utf8");
base = base.slice(0, base.indexOf('console.log("COMBATS DE L\'HISTOIRE'));
var ARGV = process.argv.slice(3);
function arg(k) { return ARGV.indexOf(k) >= 0 ? ARGV[ARGV.indexOf(k) + 1] : null; }
var PROFIL_ARG = arg("--profil");

var extra = function () {
  PROFILS.palier = { label: "Palier de l'acte II", train: 120, gear: "palier", points: 12, wenna: 5, maddoc: 4 };
  PROFILS.rare = { label: "Palier Rare (acte III)", train: 130, gear: "rare", points: 13, wenna: 5, maddoc: 5 };
  var _equipFor = equipFor;
  equipFor = function (p) {
    if (p.gear !== "palier" && p.gear !== "rare") return _equipFor(p);
    _equipFor({ gear: "cite" });
    var it = g.EliteManager.buildUniqueLoot("arme_fleuve");
    if (it) g.game.equipped.weapon = it;
    var E = g.game.equipped, order = g.RARITY_ORDER;
    g.EQUIPMENT_SLOTS.forEach(function (slot) {
      if (E[slot] && order.indexOf(E[slot].rarity) >= order.indexOf("green")) return;
      var n = g.generateEquipmentItem(slot, "green", 2); if (n) E[slot] = n;
    });
    g.game.forge = { levels: { weapon: 4, armor: 4, helmet: 3, gloves: 3, boots: 3, ring: 2, amulet: 2 } };
    if (p.gear === "rare") {
      ["armor", "helmet", "boots"].forEach(function (slot) { var n = g.generateEquipmentItem(slot, "rare", 2); if (n) E[slot] = n; });
      g.game.forge.levels.weapon = 7;
    }
  };
  var L = g.LabyrinthRun, C = g.LABYRINTH_CONFIG;
  var profils = PROFIL_ARG ? [PROFIL_ARG] : ["palier", "rare"];
  console.log("LABYRINTHE AUX LEVIERS — PV perdus estimés (% des PV max, héros seul, comme les Petites Aventures)");
  profils.forEach(function (pid) {
    console.log(PROFILS[pid].label);
    B.CLASSES.forEach(function (c) {
      B.seedRng(91000);
      prepare(c, PROFILS[pid], 2, true, true);
      g.game.heroHp = g.game.heroMaxHp;
      g.game.sceneRun = { lab: true, status: "lab-map", worldId: "ruins", floor: 1, heroScale: null };
      var run = g.game.sceneRun, out = [];
      [1, 3, 5].forEach(function (f) {
        run.floor = f;
        var gd = C.guardFoes.map(function (id) { run.guardFoe = id; var e = L.estimate("guard"); return e.unwinnable ? "∞" : Math.round(100 * e.hpLoss / g.game.heroMaxHp); });
        out.push("ét." + f + " garde " + gd.join("/") + " %");
      });
      var ef = L.estimate("foe"), eb = L.estimate("boss");
      out.push("Contremaître " + (ef.unwinnable ? "∞" : Math.round(100 * ef.hpLoss / g.game.heroMaxHp)) + " %");
      out.push("Gardien " + (eb.unwinnable ? "∞" : Math.round(100 * eb.hpLoss / g.game.heroMaxHp)) + " %");
      console.log("   " + c.label.padEnd(10) + " PV " + g.game.heroMaxHp + " · " + out.join(" · "));
      g.game.sceneRun = null;
    });
  });
};
eval(base + "\n(" + extra.toString() + ")();");
