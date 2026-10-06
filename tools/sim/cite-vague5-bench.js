"use strict";
/* tools/sim/cite-vague5-bench.js — v3.315.0 (W-4a2) : l'objectif de l'étape 12, « passer la vague 5
   de la Cité engloutie ». Mesure ce que le joueur qui sort de l'acte II obtient réellement :
   part des runs qui atteignent la vague 6, vague moyenne atteinte, rounds, potions.

   Le donjon du Désert n'a jamais été calibré (difficultyMult 2,5, pool posé en v3.315.0) :
   ce banc ne juge que l'objectif de l'étape, pas le run complet — le boss et l'équilibrage
   d'ensemble sont le lot W-4d.

   USAGE : node tools/sim/cite-vague5-bench.js . [--runs N] */
var fs = require("fs"), path = require("path");
var src = fs.readFileSync(path.join(__dirname, "forecast-calibration-bench.js"), "utf8").replace(/\nmain\(\);\s*$/, "\n");
var ROOT = require("../chemins.js").jeu(process.argv[2]);
var RUNS = 60, PROFIL_ID = "acte2", DIFF = null, BOSS = null;
for (var ai = 3; ai < process.argv.length; ai++) {
  if (process.argv[ai] === "--runs") RUNS = Number(process.argv[ai + 1]) || RUNS;
  if (process.argv[ai] === "--profil") PROFIL_ID = process.argv[ai + 1] || PROFIL_ID; // acte2 | palier
  if (process.argv[ai] === "--diff") DIFF = Number(process.argv[ai + 1]); // essai de difficultyMult
  if (process.argv[ai] === "--boss") { var b = String(process.argv[ai + 1]).split(","); BOSS = { power: Number(b[0]), endurance: Number(b[1]) }; }
}
var mod = { exports: {} };
new Function("require", "process", "module", "__dirname", src + "\nmodule.exports = { g: g, run: run, seedRng: seedRng, setup: setup, CLASSES: CLASSES };")(
  require, { argv: [process.argv[0], "x", ROOT] }, mod, __dirname);
var B = mod.exports, g = B.g;

var PROFILS = {
  acte2: { label: "fin d'acte II (arme 30 + vitrine, entr. 40)", weapon: 30, kit: true, train: 40, potions: 2, voie: "tronc" },
  palier: { label: "après le palier de l'étape 13 (arme 45 + vitrine, entr. 70)", weapon: 45, kit: true, train: 70, potions: 2, voie: "tronc" },
  /* Inutile de faire varier les potions : SORTIE_POTION_CAP en autorise deux par sortie,
     quelle que soit la réserve. Vérifié au banc (6 en poche donnent le même résultat). */
};
var PROFIL = PROFILS[PROFIL_ID] || PROFILS.acte2;

var MEMOIRE = [];
process.argv.forEach(function (a) { if (a.indexOf("--memoire=") === 0) MEMOIRE = a.slice(10).split(",").filter(Boolean); });

function autoRound() {
  var mx = g.game.heroMaxHp;
  if (mx > 0 && g.game.heroHp / mx < 0.35 && g.CombatEngine.heroAction("potion", "potion_soin_mineur", "auto")) return true;
  var d = g.ClassCombatManager.chooseRoundAction(true);
  if (d && d.slot && d.slot !== "basic" && g.CombatEngine.heroAction(d.slot, { matchedConditionId: d.matchedConditionId || null }, "auto")) return true;
  return g.CombatEngine.heroAction("basic", null, "auto");
}

function unRun(c) {
  B.setup(c.hero, c.id, PROFIL);
  g.WorldManager.worldIndex = 1;
  B.run("game.unlockedTabs.grimoire = true; game.unlockedTabs.dungeon = true; game.combatMode = 'grimoire'; CompanionManager.unlock('wenna'); CompanionManager.unlock('maddoc');");
  g.CompanionManager.state("maddoc").voie = PROFIL.voie;
  g.CompanionManager.healAll();
  g.game.worldsEverReached = { 0: true, 1: true };
  /* v3.322.0 : --memoire=id1,id2 joue avec ces choix de Mémoire pris (Fiole de réserve,
     Fidélités...) — le cas le plus favorable au joueur, que le calibrage doit tenir. */
  if (MEMOIRE.length) {
    g.game.totalAetherEarned = 9999; g.game.memory = null; g.MemoryManager.ensure();
    MEMOIRE.forEach(function (id) {
      var def = g.MEMORY_LEVELS.filter(function (l) { return l.options.some(function (o) { return o.id === id; }); })[0];
      if (def) g.game.memory.choices[def.level] = id;
    });
    // Un joueur qui prend la Fiole de réserve emporte de quoi s'en servir : 3 potions
    if (MEMOIRE.indexOf("fiole_reserve") !== -1) {
      g.game.healingPotionsOwned.potion_soin_mineur = Math.max(3, Number(g.game.healingPotionsOwned.potion_soin_mineur || 0));
    }
  }
  g.game.dungeonTierCleared = { 1: true };
  g.DungeonManager.ensure();
  g.game.dungeonRunsUsed = {}; // le banc ne mesure pas le quota de sorties (v3.358.0)
  var pot0 = Number(g.game.healingPotionsOwned.potion_soin_mineur || 0);
  var boss0 = Number(g.game.dungeonBossClears || 0);
  // Verrou d'Histoire levé le temps de la mesure : le banc joue le donjon, pas l'étape.
  var d2 = g.DUNGEONS.filter(function (d) { return d.id === 2; })[0], garde = d2.requiresStoryStep;
  d2.requiresStoryStep = null;
  if (DIFF) d2.difficultyMult = DIFF;
  if (BOSS) { d2.boss.statMult.power = BOSS.power; d2.boss.statMult.endurance = BOSS.endurance; }
  g.DungeonManager.start(2, []);
  d2.requiresStoryStep = garde;
  if (!g.game.dungeonRun.active) return null;
  var rounds = 0, guard = 3000, maxWave = 1;
  while (g.game.dungeonRun.active && g.game.heroHp > 0 && guard-- > 0) {
    maxWave = Math.max(maxWave, g.game.dungeonRun.wave || 1);
    g.game.activeTab = "combat";
    if (!autoRound()) break;
    rounds++;
  }
  return {
    boss: Number(g.game.dungeonBossClears || 0) > boss0,
    vague5: maxWave > 5,
    cleared: Math.max(0, maxWave - 1),
    rounds: rounds,
    pots: pot0 - Number(g.game.healingPotionsOwned.potion_soin_mineur || 0)
  };
}

console.log("CITÉ ENGLOUTIE — vague 5 (étape 12) et sphinx (étape 15)"
  + (DIFF ? " · difficultyMult d'essai " + DIFF : ""));
console.log("Profil : " + PROFIL.label + " · Wenna et Maddoc · " + RUNS + " runs par classe, sans Marque"
  + (MEMOIRE.length ? " · Mémoire : " + MEMOIRE.join(", ") : "") + "\n");
B.CLASSES.forEach(function (c) {
  var n = 0, ok5 = 0, cl = 0, rd = 0, po = 0, bo = 0;
  for (var i = 0; i < RUNS; i++) {
    B.seedRng(87000 + i);
    var r = unRun(c);
    if (!r) continue;
    n++; if (r.vague5) ok5++; if (r.boss) bo++; cl += r.cleared; rd += r.rounds; po += r.pots;
  }
  if (!n) { console.log(" " + c.label.padEnd(10) + " — run indisponible"); return; }
  console.log(" " + c.label.padEnd(10)
    + " vague 5 passée " + String(Math.round(100 * ok5 / n)).padStart(3) + " %"
    + "   vagues tenues " + (cl / n).toFixed(1).padStart(4)
    + "   rounds " + String(Math.round(rd / n)).padStart(3)
    + "   sphinx vaincu " + String(Math.round(100 * bo / n)).padStart(3) + " %"
    + "   potions " + (po / n).toFixed(1));
});
console.log("");
