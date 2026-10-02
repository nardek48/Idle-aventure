"use strict";
/* sim/traversee-bench.js — v3.300.0 (W-2) : la nuée de la traversée (acte I, étape 1).
   Trois scarabées du Désert (groupHpMult 0,35), tels que le canevas traversee_desert les
   fait sortir, face à un héros qui vient de finir la Forêt, avec Wenna. Mesure sur le vrai
   moteur (bac à sable de forecast-calibration-bench.js) : taux de victoire, rounds, PV restants.
   Une rencontre, sans potion forcée (la politique de round boit sous 35 % de PV).
   USAGE : node sim/traversee-bench.js . [--runs N] */
var fs = require("fs"), path = require("path");
var src = fs.readFileSync(path.join(__dirname, "forecast-calibration-bench.js"), "utf8").replace(/\nmain\(\);\s*$/, "\n");
var ROOT = process.argv[2] || ".";
var RUNS = 300;
for (var ai = 3; ai < process.argv.length; ai++) if (process.argv[ai] === "--runs") RUNS = Number(process.argv[ai + 1]) || RUNS;
var mod = { exports: {} };
new Function("require", "process", "module", "__dirname", src + "\nmodule.exports = { g: g, run: run, seedRng: seedRng, playRound: playRound, setup: setup, CLASSES: CLASSES };")(
  require, { argv: [process.argv[0], "x", ROOT] }, mod, __dirname);
var B = mod.exports, g = B.g;

var PROFILS = [
  { label: "vitrine, entr. 20, 2 potions, Wenna", weapon: 25, kit: true, train: 20, potions: 2, wenna: true },
  { label: "vitrine, entr. 40, 2 potions, Wenna", weapon: 25, kit: true, train: 40, potions: 2, wenna: true },
  { label: "vitrine, entr. 20, 2 potions, seul", weapon: 25, kit: true, train: 20, potions: 2, wenna: false }
];

function nuee(c, p) {
  B.setup(c.hero, c.id, p);
  if (p.wenna) B.run("CompanionManager.unlock('wenna'); game.combatMode = 'grimoire'; game.unlockedTabs.grimoire = true;");
  // v3.422.0 : SCENE_NODES.combatGroups retiré, la nuée de scarabées est posée ici
  var grp = { enemyFilter: ["scarab"], group: ["scarab", "scarab", "scarab"], groupHpMult: 0.35, groupGoldMult: 0.35 };
  var spawned = g.QuestEnemyManager.spawnFor({ worldId: "desert", adventureIndex: 0, enemyFilter: grp.enemyFilter, group: grp.group, groupHpMult: grp.groupHpMult, groupGoldMult: grp.groupGoldMult }, false);
  g.CombatEngine.spawnGroup(spawned);
  g.game.activeTab = "combat";
  var t0 = g.game.totalKills, rounds = 0, guard = 600;
  while (g.game.totalKills - t0 < 3 && g.game.heroHp > 0 && guard-- > 0) {
    if (p.wenna) { g.CombatEngine.heroAction("basic", null, "auto"); } else if (!B.playRound()) break;
    rounds++;
  }
  return { ok: g.game.totalKills - t0 >= 3 && g.game.heroHp > 0, rounds: rounds, hp: g.game.heroHp / g.game.heroMaxHp };
}

console.log("TRAVERSÉE — nuée de 3 scarabées du Désert, " + RUNS + " rencontres par cellule\n");
PROFILS.forEach(function (p) {
  console.log(p.label);
  B.CLASSES.forEach(function (c) {
    var ok = 0, rounds = 0, hp = 0;
    for (var r = 0; r < RUNS; r++) { B.seedRng(71000 + r); var res = nuee(c, p); if (res.ok) { ok++; rounds += res.rounds; hp += res.hp; } }
    console.log("  " + c.label.padEnd(10) + " victoire " + String(Math.round(100 * ok / RUNS)).padStart(3) + " %   rounds " + (ok ? (rounds / ok).toFixed(0) : "—").padStart(3) + "   PV restants " + (ok ? Math.round(100 * hp / ok) + " %" : "—"));
  });
});
