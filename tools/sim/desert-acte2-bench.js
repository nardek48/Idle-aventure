"use strict";
/* tools/sim/desert-acte2-bench.js — v3.311.0 : les deux runs de combat de l'acte II du Désert.
   Étape 8 « Remonter à trois » (aq_desert_gouffre) : 3 bêtes seules au Temple, à trois.
   Étape 10 « La nuée » (aq_desert_nuee) : 6 rencontres aux Dunes, nuées et paires.
   Joué sur le vrai moteur en mode Grimoire (le héros suit sa politique, les compagnons la leur),
   potions de soin mineures sous 35 % de PV. Maddoc dans chacune de ses deux voies.
   Réussite, rounds, PV à l'arrivée, potions bues.
   USAGE : node tools/sim/desert-acte2-bench.js . [--runs N] [--quest gouffre|nuee] [--hp X] */
var fs = require("fs"), path = require("path");
var src = fs.readFileSync(path.join(__dirname, "forecast-calibration-bench.js"), "utf8").replace(/\nmain\(\);\s*$/, "\n");
var ROOT = require("../chemins.js").jeu(process.argv[2]);
var RUNS = 150, QUEST = null, HP = null;
for (var ai = 3; ai < process.argv.length; ai++) {
  if (process.argv[ai] === "--runs") RUNS = Number(process.argv[ai + 1]) || RUNS;
  if (process.argv[ai] === "--quest") QUEST = process.argv[ai + 1];
  if (process.argv[ai] === "--hp") HP = Number(process.argv[ai + 1]); // essai d'encounterHpMult
}
var mod = { exports: {} };
new Function("require", "process", "module", "__dirname", src + "\nmodule.exports = { g: g, run: run, seedRng: seedRng, setup: setup, CLASSES: CLASSES };")(
  require, { argv: [process.argv[0], "x", ROOT] }, mod, __dirname);
var B = mod.exports, g = B.g;

// Profil de l'acte II : un cran au-dessus de l'étape 2 (arme 30 + vitrine, entraînement 40), 2 potions.
var PROFILS = [
  { label: "Maddoc, le tronc", weapon: 30, kit: true, train: 40, potions: 2, voie: "tronc" },
  { label: "Maddoc, l'affût", weapon: 30, kit: true, train: 40, potions: 2, voie: "affut" },
  { label: "l'affût, sans potion", weapon: 30, kit: true, train: 40, potions: 0, voie: "affut" }
];
var QUETES = [
  { id: "aq_desert_gouffre", key: "gouffre", label: "ÉTAPE 8 — Remonter à trois (3 bêtes seules, Temple)" },
  { id: "aq_desert_nuee", key: "nuee", label: "ÉTAPE 10 — La nuée (3 nuées, 2 paires, 1 ver, Dunes)" }
];

function autoRound() {
  var mx = g.game.heroMaxHp;
  if (mx > 0 && g.game.heroHp / mx < 0.35 && g.CombatEngine.heroAction("potion", "potion_soin_mineur", "auto")) return true;
  var d = g.ClassCombatManager.chooseRoundAction(true);
  if (d && d.slot && d.slot !== "basic" && g.CombatEngine.heroAction(d.slot, { matchedConditionId: d.matchedConditionId || null }, "auto")) return true;
  return g.CombatEngine.heroAction("basic", null, "auto");
}

function jouer(c, p, q) {
  B.setup(c.hero, c.id, p);
  g.WorldManager.worldIndex = 1; // compagnons à l'échelle du Désert
  B.run("game.unlockedTabs.grimoire = true; game.combatMode = 'grimoire'; CompanionManager.unlock('wenna'); CompanionManager.unlock('maddoc');");
  g.CompanionManager.state("maddoc").voie = p.voie;
  g.CompanionManager.healAll();
  g.AdventureQuestManager.ensureDefaults();
  g.game.adventureQuestsCompleted[q.id] = false;
  if (HP) g.ADVENTURE_QUESTS[q.id].encounterHpMult = HP;
  var pot0 = Number(g.game.healingPotionsOwned.potion_soin_mineur || 0);
  g.AdventureQuestManager.start(q.id);
  var rounds = 0, guard = 2000;
  while (g.game.adventureQuestRun.active && g.game.heroHp > 0 && guard-- > 0) {
    g.game.activeTab = "combat";
    if (!autoRound()) break;
    rounds++;
  }
  return { ok: !!g.game.adventureQuestsCompleted[q.id], rounds: rounds, hp: Math.max(0, g.game.heroHp) / g.game.heroMaxHp,
    pots: pot0 - Number(g.game.healingPotionsOwned.potion_soin_mineur || 0) };
}

QUETES.forEach(function (q) {
  if (QUEST && q.key !== QUEST) return;
  console.log(q.label + " — " + RUNS + " runs par cellule, PV ×" + (HP || g.ADVENTURE_QUESTS[q.id].encounterHpMult) + "\n");
  PROFILS.forEach(function (p) {
    console.log(" " + p.label);
    B.CLASSES.forEach(function (c) {
      var ok = 0, rounds = 0, hp = 0, pots = 0;
      for (var i = 0; i < RUNS; i++) { B.seedRng(81000 + i); var r = jouer(c, p, q); if (r.ok) { ok++; rounds += r.rounds; hp += r.hp; } pots += r.pots; }
      console.log("   " + c.label.padEnd(10) + " réussite " + String(Math.round(100 * ok / RUNS)).padStart(3) + " %   rounds " + (ok ? (rounds / ok).toFixed(0) : "—").padStart(3)
        + "   PV à l'arrivée " + (ok ? Math.round(100 * hp / ok) + " %" : "—").padStart(5) + "   potions bues " + (pots / RUNS).toFixed(1));
    });
  });
  console.log("");
});
