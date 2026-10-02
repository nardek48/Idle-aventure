"use strict";
/* sim/run-round-sim.js — P1 : charge les VRAIES données du projet (enemies, bosses, heroes, classes, class-skills)
   dans un contexte VM et produit les tableaux de budgets (RPT/RPM, sorties) + calibration des coefficients.
   Usage : node run-round-sim.js <racine projet> [--md fichier.md] */
var fs = require("fs"), path = require("path"), vm = require("vm");
var Sim = require("../js/sim/combat-round-sim.js");
var ROOT = process.argv[2];
var mdOut = process.argv.indexOf("--md") !== -1 ? process.argv[process.argv.indexOf("--md") + 1] : null;

var sandbox = { window: {}, console: console, Math: Math, Object: Object, Array: Array, Number: Number, String: String };
sandbox.window = sandbox;
vm.createContext(sandbox);
["js/data/enemies.js", "js/data/bosses.js", "js/data/heroes.js", "js/data/classes.js", "js/data/class-skills.js"].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sandbox, { filename: f });
});
var ENEMY_DB = sandbox.ENEMY_DB, BOSS_DB = sandbox.BOSS_DB, HEROES_DB = sandbox.HEROES_DB, CLASS_SKILLS = sandbox.CLASS_SKILLS;

function enemyDef(id) { var e = ENEMY_DB[id]; return { id: id, name: e.name, stats: e.stats, resists: e.resists, weak: e.weak }; }
var POOL = ["slime", "wolf", "goblin", "spider"].map(enemyDef);
var BOSS = (function () { var b = BOSS_DB.slimeking; return { id: "slimeking", name: b.name, stats: b.stats, resists: b.resists, weak: b.weak }; })();

/* Profils de héros : niveau 1 nu, et « Acte III » (entraînement + un peu de défense d'équipement). */
var HERO_KITS = { knight: "knight", ranger: "archer", mage: "mage" };
function heroDef(heroId, trained, extra) {
  var h = HEROES_DB[heroId];
  return Object.assign({ classId: HERO_KITS[heroId], weaponType: h.weaponType, stats: h.stats, trained: trained || {} }, extra || {});
}
var PROFILES = {
  "Niveau 1 nu": { trained: {}, extra: {} },
  "Acte III (+8 entraînement, +5 % déf. équip.)": { trained: { power: 8, endurance: 8, celerity: 8, precision: 8, will: 8 }, extra: { equipDefensePct: 0.05 } }
};

var out = [];
function line(s) { out.push(s); console.log(s); }
function f1(x) { return (Math.round(x * 10) / 10).toFixed(1); }
function pct(x) { return Math.round(x * 100) + " %"; }

/* ---------- 1. Budgets duel (déterministes, Attaque seule = borne basse) ---------- */
function budgetTable(cfg, profileName, scale, title) {
  line("\n### " + title);
  line("| Classe | PV | Dég./round | " + POOL.map(function (e) { return e.name + " RPT / RPM"; }).join(" | ") + " | Roi Slime RPT / RPM |");
  line("|---|---|---|" + POOL.map(function () { return "---"; }).join("|") + "|---|");
  Object.keys(HERO_KITS).forEach(function (heroId) {
    var p = PROFILES[profileName];
    var hd = heroDef(heroId, p.trained, p.extra);
    var kit = CLASS_SKILLS[HERO_KITS[heroId]];
    var cells = POOL.map(function (e) { var b = Sim.duelBudget(hd, kit, e, false, cfg, scale); return f1(b.rpt) + " / " + f1(b.rpm); });
    var bb = Sim.duelBudget(hd, kit, BOSS, true, cfg, scale);
    var first = Sim.duelBudget(hd, kit, POOL[0], false, cfg, scale);
    line("| " + HEROES_DB[heroId].name + " | " + first.heroHp + " | " + f1(first.heroDmg) + " | " + cells.join(" | ") + " | " + f1(bb.rpt) + " / " + f1(bb.rpm) + " |");
  });
}

/* ---------- 2. Sorties Monte-Carlo ---------- */
function sortieTable(cfg, profileName, fights, scale, title, runs) {
  line("\n### " + title + " (" + fights + " combats + boss, " + runs + " runs, 2 potions à 35 %)");
  line("| Classe | Réussite | Boss atteint | PV à l'arrivée au boss | Morts au boss | Rounds moy. | Décisions moy. | Potions moy. |");
  line("|---|---|---|---|---|---|---|---|");
  var summary = {};
  Object.keys(HERO_KITS).forEach(function (heroId) {
    var p = PROFILES[profileName];
    var a = Sim.aggregateSorties(heroDef(heroId, p.trained, p.extra), CLASS_SKILLS[HERO_KITS[heroId]], POOL, BOSS, cfg, { runs: runs, fights: fights, scale: scale });
    summary[heroId] = a;
    line("| " + HEROES_DB[heroId].name + " | " + pct(a.winRate) + " | " + pct(a.bossReached / a.runs) + " | " + pct(a.avgHpAtBoss) + " | " + pct(a.deathsAtBoss / a.runs) + " | " + f1(a.avgRounds) + " | " + f1(a.avgDecisions) + " | " + f1(a.avgPotions) + " |");
  });
  return summary;
}

/* ---------- 3. Calibration ---------- */
/* Étape 1 (analytique) : PV normaux pour RPT moyen = 3,5, PV boss pour RPT = 10 (moyenne des 3 classes, Attaque seule).
   Étape 2 (grille) : dégâts normaux × multiplicateur boss pour arriver au boss à ~50 % PV et réussir ~75 % des sorties. */
var TARGET = { rptNormal: 3.5, rptBoss: 10, hpAtBoss: 0.50, winRate: 0.75 };
function avgOverClasses(fn) { var s = 0; Object.keys(HERO_KITS).forEach(function (h) { s += fn(heroDef(h), CLASS_SKILLS[HERO_KITS[h]]); }); return s / 3; }

function solveHpCoefs() {
  var unit = Sim.config({ enemyHpCoef: 1, bossHpCoef: 1 });
  var rptPerUnit = avgOverClasses(function (hd, kit) { var s = 0; POOL.forEach(function (e) { s += Sim.duelBudget(hd, kit, e, false, unit, 1).rpt; }); return s / POOL.length; });
  var bossPerUnit = avgOverClasses(function (hd, kit) { return Sim.duelBudget(hd, kit, BOSS, true, unit, 1).rpt; });
  return { enemyHpCoef: Math.round(TARGET.rptNormal / rptPerUnit * 100) / 100, bossHpCoef: Math.round(TARGET.rptBoss / bossPerUnit * 100) / 100 };
}

function calibrate() {
  var hp = solveHpCoefs();
  var best = null;
  for (var dm = 0.2; dm <= 2.01; dm += 0.1) {
    for (var bm = 1; bm <= 8.01; bm += 0.5) {
      var cfg = Sim.config({ enemyHpCoef: hp.enemyHpCoef, bossHpCoef: hp.bossHpCoef, enemyDmgCoef: dm, bossDmgMult: bm });
      var hpAtBoss = 0, win = 0;
      Object.keys(HERO_KITS).forEach(function (h) {
        var a = Sim.aggregateSorties(heroDef(h), CLASS_SKILLS[HERO_KITS[h]], POOL, BOSS, cfg, { runs: 60, fights: 8, scale: 1 });
        hpAtBoss += a.avgHpAtBoss / 3; win += a.winRate / 3;
      });
      var sc = Math.pow((hpAtBoss - TARGET.hpAtBoss) / 0.10, 2) + Math.pow((win - TARGET.winRate) / 0.10, 2);
      if (!best || sc < best.score) best = { score: sc, enemyHpCoef: hp.enemyHpCoef, bossHpCoef: hp.bossHpCoef, enemyDmgCoef: Math.round(dm * 100) / 100, bossDmgMult: bm, hpAtBoss: hpAtBoss, winRate: win };
    }
  }
  return best;
}

/* ---------- Exécution ---------- */
line("# P1 — Budgets de combat par rounds, Forêt (données réelles v3.100.4)");
line("\nModèle : héros puis ennemi ; jauge de célérité (+célérité par action offensive, frappe bonus à 100) des deux côtés ; cooldowns ms→rounds (÷2 500, arrondi sup.) ; boss soigne 15 % tous les 5 rounds ; potion 35 % PV consomme le tour, 2 par sortie ; politique « joueur raisonnable » (skill3 dès 50 de ressource, skill2 sur boss, skill1 sinon, Défense sous 40 % PV face à une menace, potion sous 30 %). Ennemis de Lisière : slime, loup, gobelin, araignée (pool réel), boss Roi Slime. Cœur : mêmes ennemis, échelle ×1,30 (adventureIndex 1 = +0,30 dans les formules actuelles).");

var base = Sim.config({});
line("\n## A. Coefficients ACTUELS transposés tels quels (ENEMY_PV_MULT 4.0, ENEMY_POWER_DMG_COEF 0.5, FORCE_TAP_COEF 0.2)");
budgetTable(base, "Niveau 1 nu", 1, "Duel, niveau 1 nu, Lisière — RPT (rounds pour tuer) / RPM (rounds pour mourir)");
sortieTable(base, "Niveau 1 nu", 8, 1, "Sortie Lisière, niveau 1 nu", 300);

line("\n## B. Calibration");
var best = calibrate();
line("\nCibles (moyenne des 3 classes, niveau 1 nu, Lisière 8 + boss) : RPT normal 3,5 · RPT boss 10 · PV à l'arrivée au boss 50 % · réussite 75 %.");
line("PV : résolus analytiquement. Dégâts : grille enemyDmgCoef ∈ [0,2 ; 2,0] × bossDmgMult ∈ [1 ; 8].");
line("\n**Résultat : enemyHpCoef = " + best.enemyHpCoef + " (actuel 4,0), bossHpCoef = " + best.bossHpCoef + " (actuel 6,7), enemyDmgCoef = " + best.enemyDmgCoef + " (actuel 0,5), bossDmgMult = " + best.bossDmgMult + " (actuel 1) → PV au boss " + pct(best.hpAtBoss) + ", réussite " + pct(best.winRate) + "**");
var reco = Sim.config({
  enemyHpCoef: best.enemyHpCoef,
  bossHpCoef: best.bossHpCoef,
  enemyDmgCoef: best.enemyDmgCoef,
  bossDmgMult: best.bossDmgMult,

  resistMult: 0.85,
  weakMult: 1.15,
  bossNeutral: true,

  potionHealPct: 0.35,
  potionsPerSortie: 2
});

line("\n## C. Coefficients RECOMMANDÉS");
budgetTable(reco, "Niveau 1 nu", 1, "Duel, niveau 1 nu, Lisière");
sortieTable(reco, "Niveau 1 nu", 8, 1, "Sortie Lisière, niveau 1 nu", 400);
sortieTable(reco, "Niveau 1 nu", 5, 1, "Sortie courte Lisière (missions d'Acte I), niveau 1 nu", 400);
budgetTable(reco, "Acte III (+8 entraînement, +5 % déf. équip.)", 1.30, "Duel, profil Acte III, Cœur (×1,30)");
sortieTable(reco, "Acte III (+8 entraînement, +5 % déf. équip.)", 10, 1.30, "Sortie Cœur, profil Acte III", 400);
sortieTable(reco, "Niveau 1 nu", 10, 1.30, "Sortie Cœur, niveau 1 nu (contrôle : doit être dure)", 400);

line("\n## D. Sensibilité (recommandé ±)");
[
  ["Ennemis +25 % PV", {
    enemyHpCoef: reco.enemyHpCoef * 1.25,
    bossHpCoef: reco.bossHpCoef * 1.25
  }],

  ["Ennemis +25 % dégâts", {
    enemyDmgCoef: reco.enemyDmgCoef * 1.25
  }],

  ["Boss +25 % dégâts", {
    bossDmgMult: reco.bossDmgMult * 1.25
  }],

  ["Sans jauge de célérité (héros et ennemis)", {
    celerityGaugePerAction: 0,
    enemyCelerityGaugeCoef: 0
  }],

  ["Résistances/faiblesses adoucies : 0,85 / 1,15 (au lieu de 0,7 / 1,3)", {
    resistMult: 0.85,
    weakMult: 1.15
  }],

  ["Boss neutre (ni résistance ni faiblesse), ennemis inchangés", {
    bossNeutral: true
  }],

  ["Boss neutre + PV des 3 classes égalisés à 340", {
    bossNeutral: true,
    flatHeroHp: 340
  }],

  ["Potion 25 % au lieu de 35 %", {
    potionHealPct: 0.25
  }],

  ["1 potion par sortie", {
    potionsPerSortie: 1
  }],
  ["V1 candidat + boss 15 % PV", {
  resistMult: 0.85,
  weakMult: 1.15,
  bossNeutral: true,
  bossHpCoef: reco.bossHpCoef * 1.15
}],

["V1 candidat + boss 10 % dégâts", {
  resistMult: 0.85,
  weakMult: 1.15,
  bossNeutral: true,
  bossDmgMult: reco.bossDmgMult * 1.10
}],

  ["V1 candidat — résistances douces + Roi Slime neutre", {
    resistMult: 0.85,
    weakMult: 1.15,
    bossNeutral: true
  }]
].forEach(function (pair) {
  var c = Sim.config(Object.assign({ enemyHpCoef: reco.enemyHpCoef, bossHpCoef: reco.bossHpCoef, enemyDmgCoef: reco.enemyDmgCoef, bossDmgMult: reco.bossDmgMult }, pair[1]));
  sortieTable(c, "Niveau 1 nu", 8, 1, "Lisière — " + pair[0], 300);
});

if (mdOut) fs.writeFileSync(mdOut, out.join("\n") + "\n", "utf8");
