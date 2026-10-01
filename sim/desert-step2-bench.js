"use strict";
/* sim/desert-step2-bench.js — v3.302.0 : l'étape 2 du Désert d'un bout à l'autre.
   Le run « Ce qui tourne autour du camp » (aq_desert_dunes) : six bêtes solitaires des Dunes,
   sans repos, potions de soin mineures selon le profil (la politique du Grimoire en boit sous
   35 % de PV). C'est le vrai test du « monde de l'usure » : une rencontre seule ne dit rien.
   Réussite, rounds, PV à l'arrivée, potions bues.
   USAGE : node sim/desert-step2-bench.js . [--runs N] */
var fs = require("fs"), path = require("path");
var src = fs.readFileSync(path.join(__dirname, "forecast-calibration-bench.js"), "utf8").replace(/\nmain\(\);\s*$/, "\n");
var ROOT = process.argv[2] || ".";
var RUNS = 200;
for (var ai = 3; ai < process.argv.length; ai++) if (process.argv[ai] === "--runs") RUNS = Number(process.argv[ai + 1]) || RUNS;
var mod = { exports: {} };
new Function("require", "process", "module", "__dirname", src + "\nmodule.exports = { g: g, run: run, seedRng: seedRng, setup: setup, CLASSES: CLASSES };")(
  require, { argv: [process.argv[0], "x", ROOT] }, mod, __dirname);
var B = mod.exports, g = B.g;

var PROFILS = [
  { label: "arrivée : vitrine, entr. 30, 2 potions, Wenna", weapon: 25, kit: true, train: 30, potions: 2, wenna: true },
  { label: "arrivée sans potion, Wenna", weapon: 25, kit: true, train: 30, potions: 0, wenna: true },
  { label: "arrivée, 2 potions, sans Wenna", weapon: 25, kit: true, train: 30, potions: 2, wenna: false }
];

function autoRound() {
  var mx = g.game.heroMaxHp;
  if (mx > 0 && g.game.heroHp / mx < 0.35 && g.CombatEngine.heroAction("potion", "potion_soin_mineur", "auto")) return true;
  var d = g.ClassCombatManager.chooseRoundAction(true);
  if (d && d.slot && d.slot !== "basic" && g.CombatEngine.heroAction(d.slot, { matchedConditionId: d.matchedConditionId || null }, "auto")) return true;
  return g.CombatEngine.heroAction("basic", null, "auto");
}

function etape2(c, p) {
  B.setup(c.hero, c.id, p);
  B.run("game.unlockedTabs.grimoire = true; game.combatMode = 'grimoire';");
  if (p.wenna) B.run("CompanionManager.unlock('wenna');");
  g.AdventureQuestManager.ensureDefaults();
  g.game.adventureQuestsCompleted.aq_desert_dunes = false;
  var pot0 = Number(g.game.healingPotionsOwned.potion_soin_mineur || 0);
  g.AdventureQuestManager.start("aq_desert_dunes");
  var rounds = 0, guard = 1500;
  while (g.game.adventureQuestRun.active && g.game.heroHp > 0 && guard-- > 0) {
    g.game.activeTab = "combat";
    if (!autoRound()) break;
    rounds++;
  }
  return { ok: !!g.game.adventureQuestsCompleted.aq_desert_dunes, rounds: rounds, hp: Math.max(0, g.game.heroHp) / g.game.heroMaxHp,
    pots: pot0 - Number(g.game.healingPotionsOwned.potion_soin_mineur || 0) };
}

console.log("ÉTAPE 2 DU DÉSERT — 6 bêtes des Dunes d'une traite, " + RUNS + " runs par cellule\n");
PROFILS.forEach(function (p) {
  console.log(p.label);
  B.CLASSES.forEach(function (c) {
    var ok = 0, rounds = 0, hp = 0, pots = 0;
    for (var i = 0; i < RUNS; i++) { B.seedRng(64000 + i); var r = etape2(c, p); if (r.ok) { ok++; rounds += r.rounds; hp += r.hp; } pots += r.pots; }
    console.log("  " + c.label.padEnd(10) + " réussite " + String(Math.round(100 * ok / RUNS)).padStart(3) + " %   rounds " + (ok ? (rounds / ok).toFixed(0) : "—").padStart(3)
      + "   PV à l'arrivée " + (ok ? Math.round(100 * hp / ok) + " %" : "—").padStart(5) + "   potions bues " + (pots / RUNS).toFixed(1));
  });
});
