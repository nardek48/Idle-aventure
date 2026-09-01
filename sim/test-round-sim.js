"use strict";
/* sim/test-round-sim.js — invariants du simulateur pur (P1). node test-round-sim.js <racine projet> */
var fs = require("fs"), path = require("path"), vm = require("vm");
var Sim = require("../js/sim/combat-round-sim.js");
var ROOT = process.argv[2];
var sb = { window: {}, console: console }; sb.window = sb; vm.createContext(sb);
["js/data/enemies.js", "js/data/bosses.js", "js/data/heroes.js", "js/data/classes.js", "js/data/class-skills.js"].forEach(function (f) { vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sb, { filename: f }); });
var fails = 0; function ok(c, m) { console.log((c ? "  ✔ " : "  ✘ ") + m); if (!c) fails++; }
var H = sb.HEROES_DB, K = sb.CLASS_SKILLS, E = sb.ENEMY_DB, B = sb.BOSS_DB;
function hd(id, kit) { return { classId: kit, weaponType: H[id].weaponType, stats: H[id].stats, trained: {} }; }
function ed(id) { return { id: id, name: E[id].name, stats: E[id].stats, resists: E[id].resists, weak: E[id].weak }; }
var boss = { id: "slimeking", name: B.slimeking.name, stats: B.slimeking.stats, resists: B.slimeking.resists, weak: B.slimeking.weak };
var cfg = Sim.config({});
var pool = ["slime", "wolf", "goblin", "spider"].map(ed);

// stats dérivées = formules stats-system.js
var k = Sim.buildHero(hd("knight", "knight"), K.knight, cfg);
ok(k.maxHp === 391 && k.attack === 13 && Math.abs(k.critChance - 7.4) < 1e-9 && Math.abs(k.defense - 0.124) < 1e-9, "Chevalier : 391 PV, attaque 13, crit 7,4 %, déf 12,4 % (= stats-system.js)");
var w = Sim.buildEnemy(ed("wolf"), false, 1, cfg);
ok(w.maxHp === 96 && w.dmg === 14, "Loup : 96 PV, 14 dégâts (= ENEMY_PV_MULT 4 × 24, power 28 × 0,5)");
ok(w.resists.indexOf("sword") !== -1, "Loup résiste à l'épée (données réelles)");
// résist/faiblesse
var m = Sim.buildHero(hd("mage", "mage"), K.mage, cfg);
var slimeVsMage = Sim.duelBudget(hd("mage", "mage"), K.mage, ed("slime"), false, cfg, 1);
var slimeVsKnight = Sim.duelBudget(hd("knight", "knight"), K.knight, ed("slime"), false, cfg, 1);
ok(slimeVsMage.heroDmg < slimeVsKnight.heroDmg, "Slime résiste à la magie, faible à l'épée → mage frappe moins que chevalier");
// déterminisme
var a = Sim.simulateSortie(hd("ranger", "archer"), K.archer, pool, boss, cfg, { seed: 42 });
var b = Sim.simulateSortie(hd("ranger", "archer"), K.archer, pool, boss, cfg, { seed: 42 });
ok(JSON.stringify(a) === JSON.stringify(b), "graine identique → sortie identique");
var c = Sim.simulateSortie(hd("ranger", "archer"), K.archer, pool, boss, cfg, { seed: 43 });
ok(JSON.stringify(a) !== JSON.stringify(c), "graine différente → sortie différente");
// invariants
var log = Sim.simulateFight(Sim.buildHero(hd("mage", "mage"), K.mage, cfg), Sim.buildEnemy(boss, true, 1, cfg), cfg, { rng: Sim.makeRng(7) });
ok(log.rounds > 0 && log.heroDamage > 0 && log.enemyDamage > 0 && typeof log.won === "boolean", "combat : rounds/dégâts/issue renseignés");
var hero0 = Sim.buildHero(hd("knight", "knight"), K.knight, cfg); var en0 = Sim.buildEnemy(ed("slime"), false, 1, cfg);
Sim.simulateFight(hero0, en0, cfg, { rng: Sim.makeRng(1) });
ok(hero0.hp >= 0 && en0.hp >= 0 && (hero0.hp === 0 || en0.hp === 0), "fin de combat : l'un des deux est à 0, jamais négatif");
// potion : coûte le tour, soigne 35 %
var hp = Sim.buildHero(hd("knight", "knight"), K.knight, cfg); hp.hp = 100; var enP = Sim.buildEnemy(ed("slime"), false, 1, cfg);
var lg = { rounds: 0, decisions: 0, heroDamage: 0, enemyDamage: 0, bonusStrikes: 0, enemyBonusStrikes: 0 };
var mod = require("../js/sim/combat-round-sim.js"); // accès interne via policy : on rejoue une action potion
Sim.simulateFight(hp, enP, cfg, { rng: Sim.makeRng(1), policy: function (h) { return h.potions === 2 ? "potion" : "basic"; }, maxRounds: 1 });
ok(hp.potions === 1 && hp.hp >= 100 + Math.floor(391 * 0.35) - 30, "potion : -1 potion, +35 % PV (moins la riposte ennemie)");
// jauge de célérité : rôdeur (70) → frappe bonus dès la 2e action
var rg = Sim.buildHero(hd("ranger", "archer"), K.archer, cfg); var enR = Sim.buildEnemy(boss, true, 1, cfg);
var lr = Sim.simulateFight(rg, enR, cfg, { rng: Sim.makeRng(1), policy: function () { return "basic"; }, maxRounds: 3 });
ok(lr.bonusStrikes >= 1, "jauge de célérité : au moins 1 frappe bonus en 3 rounds pour le rôdeur (70)");
// cooldowns en rounds
ok(k.actions.skill1.cooldownRounds === 1 && k.actions.skill3.cooldownRounds === 4 && k.actions.defense.cooldownRounds === 3, "cooldowns ms→rounds : 1500→1, 8000→4, 7000→3");
console.log(fails ? fails + " ÉCHEC(S)" : "TOUT OK"); process.exit(fails ? 1 : 0);
