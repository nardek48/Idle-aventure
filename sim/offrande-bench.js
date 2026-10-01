"use strict";
/* sim/offrande-bench.js — Offrande O-0 (conception v1.2) : combien d'objets, donc d'Aether,
   le jeu donne réellement par monde, et combien d'objets il faut par niveau de Mémoire.

   Lit les VRAIES données : LootSystem.rollDrop (rareté par monde), STORY_REWARDS (objets
   d'Histoire), ADVENTURE_QUESTS (un boss par aventure, 50 % de butin de base), ELITES,
   DUNGEONS (un objet de la rareté max du palier par run complet).
   Ce qu'il ne mesure PAS : le nombre d'activités par soirée (rythme de Seb, point ouvert).

   USAGE : node sim/offrande-bench.js . */
var fs = require("fs"), path = require("path");
var src = fs.readFileSync(path.join(__dirname, "forecast-calibration-bench.js"), "utf8").replace(/\nmain\(\);\s*$/, "\n");
var ROOT = process.argv[2] || ".";
var mod = { exports: {} };
new Function("require", "process", "module", "__dirname", src + "\nmodule.exports = { g: g, seedRng: seedRng, setup: setup, CLASSES: CLASSES };")(
  require, { argv: [process.argv[0], "x", ROOT] }, mod, __dirname);
var B = mod.exports, g = B.g;
B.setup(B.CLASSES[0].hero, B.CLASSES[0].id, { weapon: 30, kit: true, train: 40, potions: 0 });

/* Barème de la conception v1.1 §4 */
var BAREME = g.MEMORY_OFFERING_VALUES || { common: 1, green: 3, rare: 8, epic: 25, legendary: 80 }; // v3.322.0 : lu dans data/memory.js
var WORLDS = [{ idx: 0, id: "forest", nom: "Forêt" }, { idx: 1, id: "desert", nom: "Désert" }];
var BOSS_LOOT = 0.5; // lootChance de base sur un boss (combat-engine.js), sans affixe ni bestiaire

function aetherParTirage(idx) {
  g.WorldManager.worldIndex = idx;
  g.game.worldsEverReached = {}; for (var w = 0; w <= idx; w++) g.game.worldsEverReached[w] = true;
  B.seedRng(4242 + idx);
  var n = 20000, tot = 0, rar = {};
  for (var i = 0; i < n; i++) {
    var it = g.LootSystem.rollDrop();
    tot += BAREME[it.rarity] || 0; rar[it.rarity] = (rar[it.rarity] || 0) + 1;
  }
  Object.keys(rar).forEach(function (k) { rar[k] = Math.round(100 * rar[k] / n) + " %"; });
  return { moy: tot / n, rar: rar };
}

function objetsHistoire(worldId) {
  var R = g.STORY_REWARDS || {}, n = 0, a = 0;
  Object.keys(R).forEach(function (k) {
    if (k.indexOf(worldId + "_") !== 0) return;
    var r = R[k];
    if (r.equipmentItem) { n++; a += BAREME[r.equipmentItem.rarity || "common"]; }
    if (r.equipmentRarity && r.equipmentCount) { n += r.equipmentCount; a += r.equipmentCount * BAREME[r.equipmentRarity]; }
  });
  return { n: n, a: a };
}

function aventures(worldId) {
  var L = g.ADVENTURE_QUESTS || [];
  return (Array.isArray(L) ? L : Object.keys(L).map(function (k) { return L[k]; }))
    .filter(function (q) { return q && q.worldId === worldId; }).length;
}

function donjon(idx) {
  var d = (g.DUNGEONS || []).filter(function (x) { return x && (x.worldIndex === idx || x.tier === idx + 1 || x.id === idx + 1); })[0]
    || (g.DungeonManager && g.DungeonManager.getById ? g.DungeonManager.getById(idx + 1) : null);
  return d ? { nom: d.name, rar: d.maxRarity, a: BAREME[d.maxRarity] || 0 } : null;
}

console.log("=== Offrande O-0 : l'Aether que le jeu donne vraiment ===");
console.log("Barème : " + JSON.stringify(BAREME));
var res = {};
WORLDS.forEach(function (w) {
  var t = aetherParTirage(w.idx), h = objetsHistoire(w.id), nAv = aventures(w.id), d = donjon(w.idx);
  var avObj = nAv * BOSS_LOOT, avA = avObj * t.moy;
  res[w.id] = { tirage: t.moy, hist: h, nAv: nAv, avObj: avObj, avA: avA, donjon: d };
  console.log("\n--- " + w.nom + " ---");
  console.log("Tirage de butin : " + t.moy.toFixed(2) + " Aether en moyenne  " + JSON.stringify(t.rar));
  console.log("Objets d'Histoire : " + h.n + " objet(s), " + h.a + " Aether");
  console.log("Aventures : " + nAv + " (1 boss chacune, 50 %) => " + avObj.toFixed(1) + " objets, " + avA.toFixed(1) + " Aether par passage");
  if (d) console.log("Donjon " + d.nom + " : 1 objet " + d.rar + " par run complet => " + d.a + " Aether/run");
  console.log("UN PASSAGE du monde (Histoire + chaque aventure une fois, sans donjon) : "
    + (h.a + avA).toFixed(1) + " Aether, " + (h.n + avObj).toFixed(1) + " objets");
});

/* Coûts des niveaux de Mémoire : piste v1.1 (10 x N, N global) */
console.log("\n=== Piste v1.1 : niveau N coûte 10 x N Aether ===");
[1, 2, 3, 4, 5, 6, 7, 8].forEach(function (N) {
  var monde = N <= 4 ? "forest" : "desert", cout = 10 * N, r = res[monde];
  console.log("Niv. " + N + " (" + (N <= 4 ? "Forêt" : "Désert") + ") : " + cout + " Aether = "
    + Math.ceil(cout / r.tirage) + " objets tirés, soit ~" + Math.ceil(cout / r.tirage / BOSS_LOOT) + " boss d'aventure"
    + (r.donjon && r.donjon.a ? ", ou " + Math.ceil(cout / r.donjon.a) + " runs de donjon complets" : ""));
});

/* === Scénario « Souvenirs » : l'Aether vient aussi des grandes victoires ===
   Une étape d'Histoire 1, un boss d'aventure 2, une élite vaincue 3, un run de donjon complet 3.
   Coûts proposés : Forêt 5/8/11/14, Désert 20/25/30/35. */
var MS = g.MEMORY_SOUVENIRS || {};
var SOUV = { etape: MS.storyStep || 1, boss: MS.adventureBoss || 2, elite: MS.elite || 3, donjon: MS.dungeonClear || 3 };
var COUTS = g.MEMORY_LEVEL_COSTS || [5, 8, 11, 14, 20, 25, 30, 35];
var ELITES = { forest: 3, desert: 2 };   // araignée, ronce, arbre-mère / Serment, Dard (lus dans elites.js)
var ETAPES = { forest: 15, desert: 15 }; // actes I à III au Désert, l'acte IV viendra en plus
console.log("\n=== Scénario Souvenirs " + JSON.stringify(SOUV) + " ===");
function passage(w) {
  var r = res[w];
  return ETAPES[w] * SOUV.etape + r.nAv * SOUV.boss + ELITES[w] * SOUV.elite + r.hist.a + r.avA;
}
var fo = passage("forest"), de = passage("desert");
var dFo = SOUV.donjon + res.forest.donjon.a, dDe = SOUV.donjon + res.desert.donjon.a;
var dard = SOUV.elite; // v3.322.0 : victoire répétée sur la carte = Souvenir seul (Sève + Chitine, aucun objet)
console.log("Forêt, un passage sans donjon : " + fo.toFixed(0) + " Aether ; +" + dFo + " par run de donjon complet");
console.log("Désert, un passage sans répétition : " + de.toFixed(0) + " Aether ; +" + dDe + " par run de la Cité, +" + dard + " par Dard vaincu");
var cumFo = 0, cumDe = 0;
COUTS.forEach(function (c, i) {
  var N = i + 1;
  if (N <= 4) {
    cumFo += c;
    var runs = Math.max(0, Math.ceil((cumFo - fo) / dFo));
    console.log("Niv. " + N + " : " + c + " Aether (cumul Forêt " + cumFo + ")  -> "
      + (cumFo <= fo ? "atteint pendant le passage de la Forêt (" + Math.round(100 * cumFo / fo) + " % du passage)" : "passage + " + runs + " runs de donjon"));
  } else {
    cumDe += c;
    var rep = Math.max(0, cumDe - de);
    console.log("Niv. " + N + " : " + c + " Aether (cumul Désert " + cumDe + ")  -> "
      + (cumDe <= de ? "atteint pendant le passage du Désert" : "passage + ~" + Math.ceil(rep / ((dDe + dard) / 2)) + " victoires répétées (moyenne Cité/Dard)"));
  }
});

/* v3.322.0 : le niveau 8 selon l'activité répétée choisie */
var resteDe = Math.max(0, COUTS.slice(4).reduce(function (a, b) { return a + b; }, 0) - de);
console.log("Désert, reste après le passage : " + resteDe.toFixed(0) + " Aether = " + Math.ceil(resteDe / dDe) + " runs de la Cité seuls, ou "
  + Math.ceil(resteDe / dard) + " victoires sur le Dard seules");

/* === v3.323.0 : RÈGLE DE COÛT pour tous les mondes (décision Seb : simplifier) ===
   Somme des 4 niveaux d'un monde = 80 % d'un passage du monde + N répétitions de son activité
   répétable la plus rentable, répartie 18 / 23 / 27 / 32 %. Un seul chiffre à choisir par
   monde : N (0 en Forêt, 14 runs de la Cité au Désert). Pour un nouveau monde : déclarer ses
   étapes, aventures, élites et son donjon, ajouter une ligne ici, relancer le banc. */
var REGLE = { part: 0.8, repartition: [0.18, 0.23, 0.27, 0.32] };
var REPETITIONS = { forest: { n: 0, parRep: dFo }, desert: { n: 14, parRep: dDe } };
console.log("\n=== Règle de coût : 80 % du passage + N répétitions, réparti 18/23/27/32 % ===");
Object.keys(REPETITIONS).forEach(function (w) {
  var P = w === "forest" ? fo : de, R = REPETITIONS[w];
  var total = REGLE.part * P + R.n * R.parRep;
  var couts = REGLE.repartition.map(function (x) { return Math.max(1, Math.round(total * x)); });
  var actuels = w === "forest" ? COUTS.slice(0, 4) : COUTS.slice(4, 8);
  console.log((w === "forest" ? "Forêt " : "Désert") + " : passage " + P.toFixed(0) + ", N = " + R.n + " (" + R.parRep + " Aether chacune)"
    + " -> total " + total.toFixed(0) + " -> coûts " + couts.join(" / ") + "   (en jeu : " + actuels.join(" / ") + ")");
});
