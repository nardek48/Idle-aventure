"use strict";
/* sim/premier-sang-bench.js — v3.260.0 : « Premier sang » (forest_02) selon l'arme tenue.
   Question de Seb : l'arme +15 passe en récompense de Premier sang, le premier combat se joue
   donc sans elle. Mesure, sur le vrai moteur : 5 victoires à la Lisière, PV pleins au départ,
   aucune potion (la première arrive au Colporteur), selon l'arme équipée (0, 1, 15).
   USAGE : node sim/premier-sang-bench.js . [--runs N] */
var fs = require("fs"), path = require("path"), vm = require("vm");
var src = fs.readFileSync(path.join(__dirname, "forecast-calibration-bench.js"), "utf8");
// Réutilise le bac à sable et la politique de round du banc de calibration, sans son main().
src = src.replace(/\nmain\(\);\s*$/, "\n");
var ROOT = process.argv[2] || ".";
var RUNS = 200;
for (var ai = 3; ai < process.argv.length; ai++) if (process.argv[ai] === "--runs") RUNS = Number(process.argv[ai + 1]) || RUNS;
var mod = { exports: {} };
new Function("require", "process", "module", "__dirname", src + "\nmodule.exports = { g: g, run: run, seedRng: seedRng, playRound: playRound, setup: setup, CLASSES: CLASSES };")(
  require, { argv: [process.argv[0], "x", ROOT] }, mod, __dirname);
var B = mod.exports, g = B.g;

var ARMES = [0, 1, 15];
function runPremierSang(c, arme) {
  B.setup(c.hero, c.id, { weapon: arme, kit: false, train: 0, potions: 0 });
  g.WorldManager.worldIndex = 0; g.WorldManager.adventureIndex = 0; g.WorldManager.enemyIndex = 0;
  g.CombatEngine.spawnEnemy();
  /* v3.293.0 : les kills se comptent sur game.totalKills. Suivre l'OBJET ennemi comptait aussi
     la mort du héros, qui régénère un ennemi en farm libre : réussite surestimée (86 % et non 99 %
     pour le Chevalier). Le farm libre n'existe plus ; voir sim/story-runs-bench.js. */
  var t0 = g.game.totalKills, kills = 0, rounds = 0, guard = 2000;
  while (kills < 5 && g.game.heroHp > 0 && guard-- > 0) {
    if (!B.playRound()) break;
    rounds++;
    kills = g.game.totalKills - t0;
  }
  return { ok: kills >= 5, kills: kills, rounds: rounds, hpLeft: g.game.heroHp / g.game.heroMaxHp };
}

console.log("PREMIER SANG — 5 victoires à la Lisière, sans potion, " + RUNS + " runs par cellule\n");
B.CLASSES.forEach(function (c) {
  ARMES.forEach(function (a) {
    var ok = 0, kills = 0, rounds = 0, hp = 0;
    for (var r = 0; r < RUNS; r++) {
      B.seedRng(52000 + r);
      var res = runPremierSang(c, a);
      if (res.ok) { ok++; rounds += res.rounds; hp += res.hpLeft; }
      kills += res.kills;
    }
    console.log("  " + c.label.padEnd(11) + ("arme " + a).padEnd(9)
      + " réussite " + String(Math.round(100 * ok / RUNS)).padStart(3) + " %"
      + "   kills moyens " + (kills / RUNS).toFixed(1)
      + "   rounds (réussis) " + (ok ? (rounds / ok).toFixed(0) : "—").padStart(3)
      + "   PV restants " + (ok ? Math.round(100 * hp / ok) + " %" : "—"));
  });
});
