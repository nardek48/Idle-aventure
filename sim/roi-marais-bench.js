"use strict";
/* sim/roi-marais-bench.js — v3.263.0 : « Prouver sa valeur » (forest_05, Roi des marais) depuis que
   l'arme +15 arrive à Premier sang. Retour Seb : trop facile. Compare les PV des ennemis ordinaires
   à ×0,4 (v3.246.0) et ×0,8 (doublés), le boss restant à ×0,4.
   Profils au moment de l'étape : arme +15, entraînement 1 ou 5 niveaux (Force/stat de classe + Endurance),
   2 potions mineures (celle du Colporteur + l'achat demandé). Politiques : « opti » (contre chaque
   télégraphe) et « tape » (ne contre jamais, le joueur qui découvre).
   USAGE : node sim/roi-marais-bench.js . [--runs N] */
var fs = require("fs"), path = require("path");
var src = fs.readFileSync(path.join(__dirname, "forecast-calibration-bench.js"), "utf8").replace(/\nmain\(\);\s*$/, "\n");
var ROOT = process.argv[2] || ".";
var RUNS = 150;
for (var ai = 3; ai < process.argv.length; ai++) if (process.argv[ai] === "--runs") RUNS = Number(process.argv[ai + 1]) || RUNS;
var mod = { exports: {} };
new Function("require", "process", "module", "__dirname", src + "\nmodule.exports = { g: g, run: run, seedRng: seedRng, playRound: playRound, setup: setup, CLASSES: CLASSES };")(
  require, { argv: [process.argv[0], "x", ROOT] }, mod, __dirname);
var B = mod.exports, g = B.g;

function tapeRound() {
  var maxHp = Number(g.game.heroMaxHp || 0);
  if (maxHp > 0 && (g.game.heroHp / maxHp) < 0.35 && g.CombatEngine.heroAction("potion", "potion_soin_mineur")) return true;
  var order = ["skill3", "skill2", "skill1", "basic"];
  for (var i = 0; i < order.length; i++) if (g.CombatEngine.heroAction(order[i])) return true;
  return false;
}

var q = g.ADVENTURE_QUESTS.aq_forest_expedition;
var REGLAGES = [
  { label: "×0,4 partout (avant)", mult: 0.4, boss: null },
  { label: "×0,8 ennemis, boss ×0,4", mult: 0.8, boss: 0.4 },
  { label: "×1,2 ennemis, boss ×0,4", mult: 1.2, boss: 0.4 },
  { label: "×1,6 ennemis, boss ×0,4", mult: 1.6, boss: 0.4 }
];
var PROFILS = [
  { label: "arme 15, entr. 1", weapon: 15, kit: false, train: 1, potions: 2 },
  { label: "arme 15, entr. 5", weapon: 15, kit: false, train: 5, potions: 2 }
];

function runOnce(c, p, policy) {
  B.setup(c.hero, c.id, p);
  g.AdventureQuestManager.ensureDefaults();
  g.AdventureQuestManager.start("aq_forest_expedition");
  if (!g.game.adventureQuestRun.active) return null;
  var guard = 1200, rounds = 0;
  while (g.game.adventureQuestRun.active && g.game.heroHp > 0 && guard-- > 0) {
    if (!(policy === "tape" ? tapeRound() : B.playRound())) break;
    rounds++;
  }
  var ok = !!(g.game.adventureQuestsCompleted || {}).aq_forest_expedition;
  return { ok: ok, rounds: rounds, hp: g.game.heroHp / g.game.heroMaxHp };
}

console.log("ROI DES MARAIS — run complet (9 ennemis + boss), " + RUNS + " runs par cellule\n");
REGLAGES.forEach(function (r) {
  q.enemyHpMult = r.mult; q.bossHpMult = r.boss;
  console.log(r.label);
  ["opti", "tape"].forEach(function (policy) {
    PROFILS.forEach(function (p) {
      var line = "  " + policy.padEnd(5) + p.label.padEnd(18);
      B.CLASSES.forEach(function (c) {
        var ok = 0, n = 0, rounds = 0, hp = 0;
        for (var i = 0; i < RUNS; i++) {
          B.seedRng(61000 + i);
          var res = runOnce(c, p, policy);
          if (!res) continue;
          n++; if (res.ok) { ok++; rounds += res.rounds; hp += res.hp; }
        }
        line += c.label.slice(0, 4) + " échec " + String(Math.round(100 * (1 - ok / n))).padStart(3) + " % · " + (ok ? Math.round(rounds / ok) : "—") + " r · PV " + (ok ? Math.round(100 * hp / ok) : "—") + " %   ";
      });
      console.log(line);
    });
  });
});
