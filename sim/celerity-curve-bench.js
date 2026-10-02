"use strict";
/* sim/celerity-curve-bench.js — compare la formule de jauge LINÉAIRE (actuelle) aux
   rendements décroissants, monde par monde, sur le simulateur de rounds réel.
   Usage : node sim/celerity-curve-bench.js <racine> */
var fs = require("fs"), path = require("path"), vm = require("vm");
var ROOT = process.argv[2] || ".";
var Sim = require(path.join(ROOT, "js/sim/combat-round-sim.js"));

var sandbox = { window: {}, console: console, Math: Math, Object: Object, Array: Array, Number: Number, String: String };
sandbox.window = sandbox;
vm.createContext(sandbox);
["js/data/enemies.js", "js/data/bosses.js", "js/data/heroes.js", "js/data/classes.js", "js/data/class-skills.js"]
  .forEach(function (f) { vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sandbox, { filename: f }); });

var ENEMY_DB = sandbox.ENEMY_DB, BOSS_DB = sandbox.BOSS_DB, HEROES_DB = sandbox.HEROES_DB;

/* Célérité TOTALE mesurée par sim/celerity-bench.js (base Chevalier + bottes + affixes,
   rareté courante du monde). C'est l'entrée du modèle, pas une hypothèse libre. */
var WORLDS = [
  { name: "Forêt",    celerity: 40,  scale: 1.0, enemy: "slime" },
  { name: "Désert",   celerity: 49,  scale: 1.8, enemy: "wolf" },
  { name: "Ruines",   celerity: 59,  scale: 2.6, enemy: "goblin" },
  { name: "Crypte",   celerity: 113, scale: 3.8, enemy: "spider" },
  { name: "Montagne", celerity: 235, scale: 5.2, enemy: "spider" },
  { name: "Tour",     celerity: 470, scale: 7.0, enemy: "spider" }
];

var CURVES = [
  { label: "actuel (linéaire)", K: 0 },
  { label: "K=60", K: 60 },
  { label: "K=80", K: 80 },
  { label: "K=120", K: 120 },
  { label: "K=150", K: 150 },
  { label: "K=200", K: 200 }
];

function enemyDef(id) { var e = ENEMY_DB[id]; return { id: id, name: e.name, stats: e.stats, resists: e.resists, weak: e.weak }; }

function run(world, K, runs) {
  var cfg = Sim.config({ celeritySoftCapK: K });
  var h = HEROES_DB.knight;
  /* La célérité d'équipement passe par `trained` : buildHero fait stats + trained. */
  var heroDef = {
    classId: "knight", weaponType: h.weaponType, stats: h.stats,
    trained: { power: 8, endurance: 8, celerity: world.celerity - h.stats.celerity, precision: 8, will: 8 }
  };
  var tot = { rounds: 0, bonus: 0, actions: 0, won: 0 };
  for (var i = 0; i < runs; i++) {
    var hero = Sim.buildHero(heroDef, sandbox.CLASS_SKILLS[heroDef.classId], cfg);
    var enemy = Sim.buildEnemy(enemyDef(world.enemy), false, world.scale, cfg);
    var r = Sim.simulateFight(hero, enemy, cfg, { rng: Sim.makeRng(4000 + i) });
    tot.rounds += r.rounds; tot.bonus += r.bonusStrikes;
    tot.actions += r.decisions || r.rounds;
    if (enemy.hp <= 0) tot.won += 1;
  }
  return {
    rounds: tot.rounds / runs,
    bonusPerRound: tot.bonus / Math.max(1, tot.rounds),
    gain: Sim.gaugeGain(world.celerity, cfg)
  };
}

var RUNS = 300;
console.log("Frappes bonus par round et durée du combat — " + RUNS + " duels par cellule, Chevalier\n");

CURVES.forEach(function (c) {
  console.log("--- " + c.label);
  console.log("  monde      | célérité | gain/action | frappes bonus/round | rounds/duel");
  console.log("  -----------|----------|-------------|---------------------|------------");
  WORLDS.forEach(function (w) {
    var r = run(w, c.K, RUNS);
    console.log("  " + (w.name + "          ").slice(0, 10)
      + " | " + String(w.celerity).padStart(8)
      + " | " + r.gain.toFixed(1).padStart(11)
      + " | " + r.bonusPerRound.toFixed(2).padStart(19)
      + " | " + r.rounds.toFixed(1).padStart(11));
  });
  console.log("");
});
