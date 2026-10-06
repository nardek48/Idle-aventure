"use strict";
/* tools/sim/desert-pa-combat-bench.js — v3.304.0 : les combats de la Petite Aventure du Désert.
   Pire cas Bourrin : 2 nœuds combat par run (maxSlotsPerRun), chacun une vague de N rencontres
   tirées dans le pool du canevas (nuée de 3, paire de guerriers, ver seul), sans boss, sans
   repos entre les rencontres ni entre les deux vagues, 2 potions de soin mineures (la
   politique du Grimoire boit sous 35 % de PV). Héros à l'arrivée au Désert (étape 2 faite).
   Mesure : réussite des deux vagues, PV à la sortie, potions bues. Et la paire seule, pour
   caler son facteur de PV (groupHpMult) face à un guerrier isolé.
   USAGE : node tools/sim/desert-pa-combat-bench.js . [--runs N] [--paire 0.55] */
var fs = require("fs"), path = require("path");
var src = fs.readFileSync(path.join(__dirname, "forecast-calibration-bench.js"), "utf8").replace(/\nmain\(\);\s*$/, "\n");
var ROOT = require("../chemins.js").jeu(process.argv[2]);
var RUNS = 200, PAIRE = null;
for (var ai = 3; ai < process.argv.length; ai++) {
  if (process.argv[ai] === "--runs") RUNS = Number(process.argv[ai + 1]) || RUNS;
  if (process.argv[ai] === "--paire") PAIRE = Number(process.argv[ai + 1]);
}
var mod = { exports: {} };
new Function("require", "process", "module", "__dirname", src + "\nmodule.exports = { g: g, run: run, seedRng: seedRng, setup: setup, CLASSES: CLASSES };")(
  require, { argv: [process.argv[0], "x", ROOT] }, mod, __dirname);
var B = mod.exports, g = B.g;
var TPL = g.SCENE_TEMPLATES.petite_aventure_desert, GROUPS = g.SCENE_NODES.combatGroups;
if (PAIRE != null) GROUPS.guerriers_desert.groupHpMult = GROUPS.guerriers_desert.groupGoldMult = PAIRE;

function autoRound() {
  var mx = g.game.heroMaxHp;
  if (mx > 0 && g.game.heroHp / mx < 0.35 && g.CombatEngine.heroAction("potion", "potion_soin_mineur", "auto")) return true;
  var d = g.ClassCombatManager.chooseRoundAction(true);
  if (d && d.slot && d.slot !== "basic" && g.CombatEngine.heroAction(d.slot, { matchedConditionId: d.matchedConditionId || null }, "auto")) return true;
  return g.CombatEngine.heroAction("basic", null, "auto");
}

// Une rencontre : le groupe entier doit tomber. Renvoie le nombre de rounds, -1 si le héros tombe.
function rencontre(groupId) {
  var grp = GROUPS[groupId];
  var spawned = g.QuestEnemyManager.spawnFor({ worldId: "desert", adventureIndex: 0, enemyFilter: grp.enemyFilter, group: grp.group, groupHpMult: grp.groupHpMult, groupGoldMult: grp.groupGoldMult }, false);
  var n = Array.isArray(spawned) ? spawned.length : 1;
  g.CombatEngine.spawnGroup(spawned);
  g.game.activeTab = "combat";
  var t0 = g.game.totalKills, rounds = 0, guard = 400;
  while (g.game.totalKills - t0 < n && g.game.heroHp > 0 && guard-- > 0) { if (!autoRound()) break; rounds++; }
  return g.game.heroHp > 0 && g.game.totalKills - t0 >= n ? rounds : -1;
}

function pickGroup(r) { var p = TPL.pools.combat; return p[Math.floor(r * p.length) % p.length]; }

function sortie(c, wenna, vagues, taille) {
  B.setup(c.hero, c.id, { weapon: 25, kit: true, train: 30, potions: 2 });
  B.run("game.unlockedTabs.grimoire = true; game.combatMode = 'grimoire';");
  if (wenna) B.run("CompanionManager.unlock('wenna');");
  var pot0 = Number(g.game.healingPotionsOwned.potion_soin_mineur || 0), rounds = 0;
  for (var v = 0; v < vagues; v++) {
    var n = taille[0] + Math.floor(g.Math.random() * (taille[1] - taille[0] + 1));
    for (var k = 0; k < n; k++) {
      var r = rencontre(pickGroup(g.Math.random()));
      if (r < 0) return { ok: false, rounds: rounds, hp: 0, pots: pot0 - Number(g.game.healingPotionsOwned.potion_soin_mineur || 0) };
      rounds += r;
    }
  }
  return { ok: true, rounds: rounds, hp: g.game.heroHp / g.game.heroMaxHp, pots: pot0 - Number(g.game.healingPotionsOwned.potion_soin_mineur || 0) };
}

function ligne(label, fn) {
  var ok = 0, rounds = 0, hp = 0, pots = 0;
  for (var i = 0; i < RUNS; i++) { B.seedRng(52000 + i); var r = fn(); if (r.ok) { ok++; rounds += r.rounds; hp += r.hp; } pots += r.pots; }
  console.log("  " + label + " réussite " + String(Math.round(100 * ok / RUNS)).padStart(3) + " %   rounds " + (ok ? (rounds / ok).toFixed(0) : "—").padStart(3)
    + "   PV à la sortie " + (ok ? Math.round(100 * hp / ok) + " %" : "—").padStart(5) + "   potions " + (pots / RUNS).toFixed(1));
}

console.log("PA DU DÉSERT — combats, " + RUNS + " sorties par cellule (paire ×" + GROUPS.guerriers_desert.groupHpMult + ")\n");
[[1, 2], [2, 3], [3, 4]].forEach(function (taille) {
  [true, false].forEach(function (wenna) {
    console.log("2 vagues de " + taille[0] + "-" + taille[1] + " rencontres, " + (wenna ? "avec" : "sans") + " Wenna");
    B.CLASSES.forEach(function (c) { ligne(c.label.padEnd(10), function () { return sortie(c, wenna, 2, taille); }); });
  });
});
console.log("\nUne rencontre seule, sans Wenna (repères)");
["scarabees_desert", "guerriers_desert", "ver_desert"].forEach(function (gid) {
  B.CLASSES.forEach(function (c) {
    ligne((gid + " " + c.label).padEnd(28), function () {
      B.setup(c.hero, c.id, { weapon: 25, kit: true, train: 30, potions: 2 });
      B.run("game.unlockedTabs.grimoire = true; game.combatMode = 'grimoire';");
      var r = rencontre(gid);
      return { ok: r >= 0, rounds: Math.max(0, r), hp: g.game.heroHp / g.game.heroMaxHp, pots: 0 };
    });
  });
});
