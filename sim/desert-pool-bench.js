"use strict";
/* sim/desert-pool-bench.js — v3.302.0 (D1) : le pool du Désert face au héros qui arrive.
   Conception Désert §1.1 : « le monde de l'usure » — ennemis résistants, peu de dégâts,
   combats longs, jamais de mort en deux rounds. Ce banc mesure, sur le vrai moteur, chaque
   rencontre du Désert (grammaire D2) et, en référence, le Cœur de la Forêt au même profil :
     victoire, rounds, PV perdus, pic (plus grosse perte en un round, en % des PV max).
   Politique de round : celle du Grimoire (ClassCombatManager.chooseRoundAction, comme
   tickRoundClock), Wenna en auto. Aucun repos, aucune potion forcée.
   USAGE : node sim/desert-pool-bench.js . [--runs N] [--patch '{"scarab":{"power":0.6,"endurance":1.5}}']
   --patch multiplie les stats de base (ENEMY_DB) avant la mesure, pour comparer des réglages. */
var fs = require("fs"), path = require("path");
var src = fs.readFileSync(path.join(__dirname, "forecast-calibration-bench.js"), "utf8").replace(/\nmain\(\);\s*$/, "\n");
var ROOT = process.argv[2] || ".";
var RUNS = 200, PATCH = null;
for (var ai = 3; ai < process.argv.length; ai++) {
  if (process.argv[ai] === "--runs") RUNS = Number(process.argv[ai + 1]) || RUNS;
  if (process.argv[ai] === "--patch") PATCH = JSON.parse(process.argv[ai + 1]);
}
var mod = { exports: {} };
new Function("require", "process", "module", "__dirname", src + "\nmodule.exports = { g: g, run: run, seedRng: seedRng, setup: setup, CLASSES: CLASSES };")(
  require, { argv: [process.argv[0], "x", ROOT] }, mod, __dirname);
var B = mod.exports, g = B.g;

if (PATCH) Object.keys(PATCH).forEach(function (id) {
  var st = g.ENEMY_DB[id] && g.ENEMY_DB[id].stats;
  if (!st) return;
  Object.keys(PATCH[id]).forEach(function (k) { if (k === "archetype") return; st[k] = Math.round(st[k] * PATCH[id][k]); });
  if (PATCH[id].archetype) g.FIXED_ENEMY_ARCHETYPES[id] = PATCH[id].archetype;
});

/* Profil « arrivée au Désert » : vitrine de la Forêt, entraînement 30, 2 potions, Wenna. */
var PROFIL = { weapon: 25, kit: true, train: 30, potions: 2 };

var RENCONTRES = [
  { label: "Cœur de la Forêt (réf.)", q: { worldId: "forest", adventureIndex: 1, enemyFilter: ["goblin", "spider", "foresttroll", "bramble"] } },
  { label: "Nuée de 3 scarabées", q: { worldId: "desert", adventureIndex: 0, enemyFilter: ["scarab"], group: ["scarab", "scarab", "scarab"], groupHpMult: 0.35, groupGoldMult: 0.35 } },
  { label: "Scorpion seul", q: { worldId: "desert", adventureIndex: 0, enemyFilter: ["scorpion"] } },
  { label: "Ver des sables seul", q: { worldId: "desert", adventureIndex: 0, enemyFilter: ["sandworm"] } },
  { label: "Guerrier des sables seul", q: { worldId: "desert", adventureIndex: 0, enemyFilter: ["sandwarrior"] } },
  { label: "Paire de guerriers", q: { worldId: "desert", adventureIndex: 0, enemyFilter: ["sandwarrior"], group: ["sandwarrior", "sandwarrior"], groupHpMult: 0.40, groupGoldMult: 0.40 } }
];

function autoRound() {
  var d = g.ClassCombatManager.chooseRoundAction(true);
  if (d && d.slot && d.slot !== "basic" && g.CombatEngine.heroAction(d.slot, { matchedConditionId: d.matchedConditionId || null }, "auto")) return true;
  return g.CombatEngine.heroAction("basic", null, "auto");
}

function rencontre(c, r) {
  B.setup(c.hero, c.id, PROFIL);
  B.run("CompanionManager.unlock('wenna'); game.unlockedTabs.grimoire = true; game.combatMode = 'grimoire';");
  var foes = g.QuestEnemyManager.spawnFor(r.q, false);
  g.CombatEngine.spawnGroup(foes);
  g.game.activeTab = "combat";
  var n = Array.isArray(foes) ? foes.length : 1;
  var t0 = g.game.totalKills, rounds = 0, guard = 400, pic = 0, maxHp = g.game.heroMaxHp;
  while (g.game.totalKills - t0 < n && g.game.heroHp > 0 && guard-- > 0) {
    var before = g.game.heroHp;
    if (!autoRound()) break;
    rounds++;
    pic = Math.max(pic, (before - Math.max(0, g.game.heroHp)) / maxHp);
  }
  return { ok: g.game.totalKills - t0 >= n && g.game.heroHp > 0, rounds: rounds, lost: 1 - Math.max(0, g.game.heroHp) / maxHp, pic: pic };
}

console.log("POOL DU DÉSERT — " + RUNS + " rencontres par cellule, profil « arrivée » (vitrine, entr. 30, Wenna)" + (PATCH ? "\nréglage : " + JSON.stringify(PATCH) : "") + "\n");
console.log("rencontre".padEnd(26) + B.CLASSES.map(function (c) { return c.label.padEnd(30); }).join(""));
RENCONTRES.forEach(function (r) {
  var line = r.label.padEnd(26);
  B.CLASSES.forEach(function (c) {
    var ok = 0, rounds = 0, lost = 0, pic = 0;
    for (var i = 0; i < RUNS; i++) { B.seedRng(88000 + i); var x = rencontre(c, r); if (x.ok) ok++; rounds += x.rounds; lost += x.lost; pic = Math.max(pic, x.pic); }
    line += (Math.round(100 * ok / RUNS) + "% " + (rounds / RUNS).toFixed(1) + "rd " + Math.round(100 * lost / RUNS) + "%pv pic" + Math.round(100 * pic) + "%").padEnd(30);
  });
  console.log(line);
});
