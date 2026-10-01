"use strict";
/* sim/palier-desert-bench.js — v3.316.0 (W-4b) : combien coûte le palier de l'étape 13.

   Trois compteurs : 4 emplacements Inhabituels sur 7 dont l'arme, Forge 3, arme reforgée à 4.
   Le banc mesure ce qui est mesurable sans modèle d'économie :
     1. le nombre de TIRAGES DE BUTIN nécessaires pour tenir 4 emplacements Inhabituels dont
        l'arme, sur le vrai LootSystem.rollDrop() au Désert (emplacement et rareté tirés comme
        en jeu, on garde une pièce qui monte la rareté de son emplacement) ;
     2. le coût du niveau 3 de la Forge et des reforges de l'arme jusqu'à 4, lu sur les vrais
        barèmes (VillageBuildingManager.getNextCost, ForgeManager.getCost).

   Ce qu'il ne mesure PAS : le rythme auquel le joueur obtient ces tirages et cet or. La
   conversion en soirées dépend du nombre de runs par soirée, que Seb tranche.

   USAGE : node sim/palier-desert-bench.js . [--runs N] */
var fs = require("fs"), path = require("path");
var src = fs.readFileSync(path.join(__dirname, "forecast-calibration-bench.js"), "utf8").replace(/\nmain\(\);\s*$/, "\n");
var ROOT = process.argv[2] || ".";
var RUNS = 4000, SANS_ARME = false;
for (var ai = 3; ai < process.argv.length; ai++) {
  if (process.argv[ai] === "--runs") RUNS = Number(process.argv[ai + 1]) || RUNS;
  if (process.argv[ai] === "--sans-arme") SANS_ARME = true; // variante : 4 pièces, l'arme non exigée
}
var mod = { exports: {} };
new Function("require", "process", "module", "__dirname", src + "\nmodule.exports = { g: g, run: run, seedRng: seedRng, setup: setup, CLASSES: CLASSES };")(
  require, { argv: [process.argv[0], "x", ROOT] }, mod, __dirname);
var B = mod.exports, g = B.g;

B.setup(B.CLASSES[0].hero, B.CLASSES[0].id, { weapon: 30, kit: true, train: 40, potions: 0 });
g.WorldManager.worldIndex = 1;
g.game.worldsEverReached = { 0: true, 1: true };

var ORDRE = g.RARITY_ORDER;
var SLOTS = g.EQUIPMENT_SLOTS;
var CIBLE_PIECES = 4;

/* Un joueur qui s'équipe : il garde la pièce si elle monte la rareté de son emplacement. */
function tiragesPourPalier() {
  var porte = {}; // slot -> index de rareté
  var n = 0, garde = 4000;
  while (garde-- > 0) {
    n++;
    var it = g.LootSystem.rollDrop();
    if (it) {
      var r = ORDRE.indexOf(it.rarity);
      if (r > (porte[it.slot] === undefined ? -1 : porte[it.slot])) porte[it.slot] = r;
    }
    var vertes = 0, arme = false;
    SLOTS.forEach(function (s) {
      if ((porte[s] === undefined ? -1 : porte[s]) >= ORDRE.indexOf("green")) { vertes++; if (s === "weapon") arme = true; }
    });
    if (vertes >= CIBLE_PIECES && (arme || SANS_ARME)) return n;
  }
  return null;
}

var mesures = [];
for (var i = 0; i < RUNS; i++) {
  B.seedRng(90000 + i);
  var t = tiragesPourPalier();
  if (t) mesures.push(t);
}
mesures.sort(function (a, b) { return a - b; });
function centile(p) { return mesures[Math.min(mesures.length - 1, Math.floor(p * mesures.length))]; }

console.log("PALIER DE L'ÉTAPE 13 — 4 emplacements Inhabituels sur 7" + (SANS_ARME ? " (arme non exigée)" : ", dont l'arme") + "\n");
console.log("Tirages de butin nécessaires (Désert, LootSystem réel, " + mesures.length + " simulations) :");
console.log("  médiane " + centile(0.5) + "   ·   90e centile " + centile(0.9) + "   ·   pire cas " + mesures[mesures.length - 1]);
console.log("  (la boutique n'est pas comptée : elle raccourcit d'autant, bornée à 25 % de vitrine)\n");

/* ---------- Coût en or et en matériaux ---------- */
g.VillageBuildingManager.ensure();
g.game.village.buildings.forge = { level: 2 };
var cForge = g.VillageBuildingManager.getNextCost("forge");
console.log("Forge niveau 2 -> 3 : " + Object.keys(cForge).map(function (k) { return cForge[k] + " " + k; }).join(", "));

g.ForgeManager.ensure();
var totalOr = 0, totalAcier = 0, totalResine = 0;
for (var lvl = 0; lvl < 4; lvl++) {
  g.game.forge.levels.weapon = lvl;
  var c = g.ForgeManager.getCost("weapon");
  if (!c) continue;
  totalOr += Number(c.gold || 0); totalAcier += Number(c.acier || 0); totalResine += Number(c.resine_durcie || 0);
}
console.log("Arme reforgée de 0 à 4 : " + totalOr + " or, " + totalAcier + " acier"
  + (totalResine ? ", " + totalResine + " résine durcie" : ""));
console.log("");
