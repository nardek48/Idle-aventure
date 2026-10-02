"use strict";
/* sim/story-runs-bench.js — v3.293.0 : plus de farm libre (règle Seb 18/09/2026).
   Trois étapes d'Histoire de la Forêt se jouaient sur l'onglet Combat sans quête. Elles
   deviennent des runs définis (data/adventure-quests.js). Ce banc compare, sur le vrai
   moteur et avec les mêmes graines :
     - ANCIEN : la suite d'ennemis du farm libre, rejouée à l'identique (enemyIndex 0, 1, 2…,
       boss au 10e, comme WorldManager.advance le faisait) ;
     - NOUVEAU : le run défini, lancé par AdventureQuestManager.start.
   Une mort = échec, dans les deux cas (en farm libre elle renvoyait au début de l'aventure).
   Réutilise le bac à sable et la politique de round de sim/forecast-calibration-bench.js.
   USAGE : node sim/story-runs-bench.js . [--runs N] */
var fs = require("fs"), path = require("path");
var src = fs.readFileSync(path.join(__dirname, "forecast-calibration-bench.js"), "utf8");
src = src.replace(/\nmain\(\);\s*$/, "\n");
var ROOT = process.argv[2] || ".";
var RUNS = 300;
for (var ai = 3; ai < process.argv.length; ai++) if (process.argv[ai] === "--runs") RUNS = Number(process.argv[ai + 1]) || RUNS;
var mod = { exports: {} };
new Function("require", "process", "module", "__dirname", src + "\nmodule.exports = { g: g, run: run, seedRng: seedRng, playRound: playRound, setup: setup, CLASSES: CLASSES };")(
  require, { argv: [process.argv[0], "x", ROOT] }, mod, __dirname);
var B = mod.exports, g = B.g;

/* Étapes mesurées : composition de l'ancien farm et run qui le remplace. */
var ETAPES = [
  { id: "premier", label: "Premier sang (forest_02)", adv: 0, count: 5, quest: "aq_story_premier_sang",
    profils: [{ label: "à mains nues, 0 potion", weapon: 0, kit: false, train: 0, potions: 0 }] },
  { id: "lisiere", label: "Franchir la Lisière (forest_crossing)", adv: 0, count: 10, quest: "aq_story_lisiere",
    profils: [{ label: "arme +15, entr. 5, 2 potions", weapon: 15, kit: false, train: 5, potions: 2 },
              { label: "vitrine, entr. 10, 2 potions", weapon: 25, kit: true, train: 10, potions: 2 }] },
  { id: "coeur", label: "Le grimoire du veilleur (forest_12)", adv: 1, count: 10, quest: "aq_story_coeur",
    profils: [{ label: "vitrine, entr. 10, 2 potions", weapon: 25, kit: true, train: 10, potions: 2 },
              { label: "vitrine, entr. 20, 2 potions", weapon: 25, kit: true, train: 20, potions: 2 }] }
];

/* Le Cœur en Acte III : Troll et Ronce dans le pool, comme pendant forest_12. */
function poolActe3() {
  var coeur = g.WORLDS[0].adventures[1];
  coeur.enemyPool = g.STORY_COEUR_ACT3_POOL.slice();
}

function ancien(e) {
  poolActe3();
  g.WorldManager.worldIndex = 0; g.WorldManager.adventureIndex = e.adv; g.WorldManager.enemyIndex = 0;
  g.CombatEngine.spawnEnemy();
  /* Les kills se comptent sur game.totalKills, PAS sur un changement d'objet ennemi : en farm
     libre, la mort du héros régénère aussi un ennemi, et l'ancien banc (premier-sang-bench.js)
     la comptait donc comme une victoire. Biais relevé en v3.293.0. */
  var t0 = g.game.totalKills, kills = 0, rounds = 0, guard = 3000, boss = false;
  while (kills < e.count && g.game.heroHp > 0 && guard-- > 0) {
    if (g.game.enemy && g.game.enemy.isBoss) boss = true;
    if (!B.playRound()) break;
    rounds++;
    var k = g.game.totalKills - t0;
    if (k > kills && g.game.heroHp > 0) {
      kills = k;
      // suite exacte du farm libre : index suivant, boss au dernier cran
      g.WorldManager.enemyIndex = kills; g.CombatEngine.spawnEnemy();
    }
  }
  return { ok: kills >= e.count, rounds: rounds, hp: g.game.heroHp / g.game.heroMaxHp, boss: boss };
}

function nouveau(e) {
  poolActe3();
  g.AdventureQuestManager.ensureDefaults();
  g.game.adventureQuestsCompleted[e.quest] = false;
  g.AdventureQuestManager.start(e.quest);
  if (!g.game.adventureQuestRun.active) return { ok: false, rounds: 0, hp: 0, boss: false };
  var rounds = 0, guard = 3000, boss = false;
  while (g.game.adventureQuestRun.active && g.game.heroHp > 0 && guard-- > 0) {
    if (g.game.enemy && g.game.enemy.isBoss) boss = true;
    g.game.activeTab = "combat";
    if (!B.playRound()) break;
    rounds++;
  }
  return { ok: !!g.game.adventureQuestsCompleted[e.quest], rounds: rounds, hp: g.game.heroHp / g.game.heroMaxHp, boss: boss };
}

function cellule(e, c, p, fn) {
  var ok = 0, rounds = 0, hp = 0;
  for (var r = 0; r < RUNS; r++) {
    B.seedRng(93000 + r);
    B.setup(c.hero, c.id, p);
    var res = fn(e);
    if (res.ok) { ok++; rounds += res.rounds; hp += res.hp; }
  }
  return "réussite " + String(Math.round(100 * ok / RUNS)).padStart(3) + " %  rounds "
    + (ok ? (rounds / ok).toFixed(0) : "—").padStart(3) + "  PV fin " + (ok ? Math.round(100 * hp / ok) + " %" : "—").padStart(4);
}

console.log("RUNS D'HISTOIRE — ancien farm libre contre run défini, " + RUNS + " runs par cellule\n");
ETAPES.forEach(function (e) {
  console.log(e.label);
  e.profils.forEach(function (p) {
    console.log("  " + p.label);
    B.CLASSES.forEach(function (c) {
      console.log("    " + c.label.padEnd(10) + " ancien  " + cellule(e, c, p, ancien) + "   |   nouveau  " + cellule(e, c, p, nouveau));
    });
  });
  console.log("");
});
