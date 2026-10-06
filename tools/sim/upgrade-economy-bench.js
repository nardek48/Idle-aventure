"use strict";
/* tools/sim/upgrade-economy-bench.js — économie des AMÉLIORATIONS de caractéristiques
   (data/upgrades.js, achetées dans Héros → Stats), sur le vrai moteur.

   Question posée par Seb (15/09/2026) : aligner les prix des cinq améliorations,
   tenir compte du plafond porté par le Terrain d'entraînement, et baisser le coût
   d'achat. Ce banc mesure AVANT de proposer des chiffres.

   Ce qu'il calcule, sans rien modifier dans le jeu :
     1. le revenu réel (or par combat, par monde et par aventure) ;
     2. le coût cumulé de chaque amélioration, et ce que ça représente en combats ;
     3. le GAIN réel d'un point de caractéristique, par classe (les coefficients
        diffèrent : voir getClassMainStat + FORCE_UNIVERSAL_TAP_COEF) ;
     4. l'or par point de dégât / par PV — la vraie mesure d'équité entre classes ;
     5. le coût du Terrain d'entraînement, qui conditionne le plafond (10 niveaux
        par niveau de bâtiment) ;
     6. l'effet de plusieurs grilles de prix candidates sur le temps de jeu.

   USAGE : node tools/sim/upgrade-economy-bench.js . [--grid alignee|douce|actuelle] */

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var ROOT = require("../chemins.js").jeu(process.argv[2]);

function el() {
  return {
    style: { setProperty: function () {}, removeProperty: function () {} },
    classList: { add: function () {}, remove: function () {}, toggle: function () {}, contains: function () { return false; } },
    innerHTML: "", textContent: "", scrollTop: 0, disabled: false,
    querySelector: function () { return null; }, querySelectorAll: function () { return []; },
    addEventListener: function () {}, setAttribute: function () {}, getAttribute: function () { return null; },
    appendChild: function () {}, remove: function () {}, hasChildNodes: function () { return false; },
    focus: function () {}, dataset: {}, offsetWidth: 0, parentNode: null
  };
}
function buildSandbox() {
  var storage = {};
  var sandbox = {
    console: { log: function () {}, warn: function () {}, error: function () {} },
    Date: Date, Math: Math, JSON: JSON, Object: Object, Array: Array,
    Number: Number, String: String, Boolean: Boolean,
    setTimeout: function () { return 0; }, clearTimeout: function () {},
    setInterval: function () { return 0; }, clearInterval: function () {},
    requestAnimationFrame: function () {}, performance: { now: function () { return Date.now(); } },
    navigator: { serviceWorker: null, userAgent: "vm", vibrate: function () {} },
    location: { href: "", search: "", hash: "", protocol: "https:" },
    localStorage: {
      getItem: function (k) { return storage.hasOwnProperty(k) ? storage[k] : null; },
      setItem: function (k, v) { storage[k] = String(v); },
      removeItem: function (k) { delete storage[k]; },
      key: function (i) { return Object.keys(storage)[i] || null; },
      get length() { return Object.keys(storage).length; }
    },
    document: {
      getElementById: function () { return el(); }, querySelector: function () { return null; },
      querySelectorAll: function () { return []; }, createElement: function () { return el(); },
      addEventListener: function () {}, body: el(), documentElement: el(), hidden: false, activeElement: null
    },
    alert: function () {}, confirm: function () { return true; },
    atob: function (s) { return Buffer.from(s, "base64").toString("binary"); },
    btoa: function (s) { return Buffer.from(s, "binary").toString("base64"); },
    structuredClone: function (v) { return JSON.parse(JSON.stringify(v)); },
    TextEncoder: TextEncoder, TextDecoder: TextDecoder, URL: URL, Blob: function () {}
  };
  sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  var html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  var scripts = [], re = /<script src="([^"]+)"><\/script>/g, m;
  while ((m = re.exec(html)) !== null) if (!/pwa\.js|boot\.js/.test(m[1])) scripts.push(m[1]);
  scripts.forEach(function (s) {
    try { vm.runInContext(fs.readFileSync(path.join(ROOT, s), "utf8"), sandbox, { filename: s }); }
    catch (e) { console.error("ÉCHEC DE CHARGEMENT " + s + " : " + e.message); process.exit(1); }
  });
  return sandbox;
}

var g = buildSandbox();
function run(code) { return vm.runInContext(code, g); }
var STATS = ["power", "endurance", "celerity", "precision", "will"];
var CLASSES = [
  { id: "knight", hero: "knight", label: "Chevalier" },
  { id: "archer", hero: "ranger", label: "Rôdeur" },
  { id: "mage", hero: "mage", label: "Mage" }
];
function upg(stat) { return g.UPGRADES.find(function (u) { return u.id === "utrain_" + stat; }); }
/* Garde-fou : un gain nul donne un nombre de points infini (ex. Précision chez un
   Chevalier, qui n'ajoute aucun dégât direct) — on borne au plafond de l'amélioration. */
/* v3.248.0 : cumul linéaire si l'amélioration déclare costStep et qu'aucun multiplicateur
   n'est forcé — sinon la grille candidate passée en argument fait foi. */
function cumulReel(u, levels) {
  var n = Math.min(Number(levels) || 0, u.maxLevel || 150), t = 0;
  for (var i = 0; i < n; i++) {
    t += (typeof u.costStep === "number")
      ? Math.floor(u.baseCost * (1 + u.costStep * i))
      : Math.floor(u.baseCost * Math.pow(u.costMult, i));
  }
  return t;
}
function cumul(u, levels, base, mult) {
  if (base == null && mult == null) return cumulReel(u, levels);
  var n = Math.min(Number(levels) || 0, u.maxLevel || 150);
  if (!isFinite(n) || n <= 0) return 0;
  var b = (base == null) ? u.baseCost : base, m = (mult == null) ? u.costMult : mult, t = 0;
  for (var l = 0; l < n; l++) t += Math.floor(b * Math.pow(m, l));
  return t;
}
function pts10(gainDmg) {
  if (!(gainDmg > 0)) return null;
  return Math.ceil(10 / gainDmg);
}
function pad(s, n) { s = String(s); while (s.length < n) s += " "; return s; }
function lpad(s, n) { s = String(s); while (s.length < n) s = " " + s; return s; }

/* ---------- 1. Revenu réel ---------- */
function goldPerCycle(worldIdx, advIdx) {
  g.WorldManager.worldIndex = worldIdx; g.WorldManager.adventureIndex = advIdx;
  var tot = 0;
  for (var i = 0; i < 9; i++) { g.WorldManager.enemyIndex = i; tot += Number(g.WorldManager.generateEnemy().goldReward || 0); }
  g.WorldManager.enemyIndex = 9;
  tot += Number(g.WorldManager.generateEnemy().goldReward || 0);
  return tot;
}

console.log("BANC ÉCONOMIE DES AMÉLIORATIONS — base v" + g.GAME_VERSION + "\n");

run("fullResetState(); game.heroId='knight';");
console.log("=== 1. Revenu réel (or pour 10 combats : 9 ennemis + 1 boss) ===");
var revenus = {};
[[0, 0, "Forêt · Lisière"], [0, 1, "Forêt · Cœur"], [1, 0, "Désert · Dunes"], [1, 1, "Désert · Temple"]].forEach(function (z) {
  var or = goldPerCycle(z[0], z[1]);
  revenus[z[2]] = or;
  console.log("  " + pad(z[2], 20) + lpad(Math.round(or), 6) + " or / 10 combats   (" + (or / 10).toFixed(1) + " or par combat)");
});
var orLisiere = revenus["Forêt · Lisière"] / 10;
console.log("\n  Prix d'une pièce commune en échoppe : " + g.EQUIP_SHOP_PRICES.common + " or = "
  + Math.ceil(g.EQUIP_SHOP_PRICES.common / orLisiere) + " combats en Lisière. Sept emplacements : "
  + Math.ceil(g.EQUIP_SHOP_PRICES.common * 7 / orLisiere) + " combats.\n");

/* ---------- 2. Grille actuelle ---------- */
console.log("=== 2. Grille actuelle des cinq améliorations ===");
console.log("  " + pad("caractéristique", 16) + lpad("base", 6) + lpad("mult", 7) + lpad("max", 6)
  + lpad("niv 10", 9) + lpad("niv 20", 10) + lpad("niv 50", 12));
STATS.forEach(function (s) {
  var u = upg(s);
  console.log("  " + pad(s, 16) + lpad(u.baseCost, 6) + lpad(typeof u.costStep === "number" ? ("+" + Math.round(u.costStep * 100) + "%") : u.costMult, 7) + lpad(u.maxLevel, 6)
    + lpad(cumul(u, 10), 9) + lpad(cumul(u, 20), 10) + lpad(cumul(u, 50), 12));
});

/* ---------- 3. Gain réel d'un point (mesuré sur 100 niveaux, pour passer l'arrondi) ---------- */
console.log("\n=== 3. Ce qu'un point de caractéristique rapporte vraiment ===");
console.log("  tapDamage = Force totale × " + g.FORCE_UNIVERSAL_TAP_COEF + " + stat principale × coef de classe");
console.log("  (mesuré sur 100 niveaux puis ramené au point : à 10 niveaux, Math.floor mange les petits gains)\n");
var gains = {};
CLASSES.forEach(function (c) {
  var main = g.getClassMainStat(c.id);
  gains[c.id] = {};
  run("fullResetState(); game.playerName='X'; game.heroId='" + c.hero + "'; EquipmentManager.recalcStats();");
  var d0 = g.StatsSystem.effectiveTapDamage(), hp0 = g.game.heroMaxHp, cel0 = g.CombatEngine.getTotalCelerity();
  STATS.forEach(function (st) {
    run("fullResetState(); game.playerName='X'; game.heroId='" + c.hero + "'; game.upgrades['utrain_" + st + "'] = 100; EquipmentManager.recalcStats();");
    gains[c.id][st] = {
      dmg: (g.StatsSystem.effectiveTapDamage() - d0) / 100,
      hp: (g.game.heroMaxHp - hp0) / 100,
      cel: (g.CombatEngine.getTotalCelerity() - cel0) / 100,
      crit: (g.StatsSystem.effectiveCritChance() - 0) / 100
    };
  });
  console.log("  " + c.label + " (stat principale : " + main.stat + " × " + main.coef + ")");
  STATS.forEach(function (st) {
    var gg = gains[c.id][st];
    var bits = [];
    if (gg.dmg > 0.0001) bits.push("+" + gg.dmg.toFixed(3) + " dégât/point");
    if (gg.hp > 0.01) bits.push("+" + gg.hp.toFixed(2) + " PV/point");
    if (gg.cel > 0.0001) bits.push("+" + gg.cel.toFixed(3) + " célérité/point");
    console.log("    " + pad(st, 12) + (bits.length ? bits.join("  ") : "aucun effet direct sur dégâts/PV"));
  });
});

/* ---------- 4. Ce qu'un BUDGET achète, par classe ---------- */
/* Politique d'achat du joueur : stat principale d'abord, puis Endurance — la même
   que tools/sim/balance-bench.js. Le plafond du Terrain est respecté. */
function spend(budget, heroId, classId, grid, trainingLevel) {
  var main = g.getClassMainStat(classId);
  var order = [main.stat, "endurance"];
  if (order.indexOf("power") === -1) order.push("power"); // la Force sert à tous
  var cap = 10 * ((trainingLevel || 0) + 1);
  var levels = { power: 0, endurance: 0, celerity: 0, precision: 0, will: 0 };
  var left = budget, guard = 5000;
  while (guard-- > 0) {
    var bought = false;
    for (var i = 0; i < order.length; i++) {
      var st = order[i], u = upg(st);
      if (levels[st] >= Math.min(cap, u.maxLevel)) continue;
      var b = grid ? grid[st][0] : u.baseCost, m = grid ? grid[st][1] : u.costMult;
      var lineaire = grid ? !!grid.lineaire : (typeof u.costStep === "number");
      var cost = lineaire
        ? Math.floor(b * (1 + (grid ? m : u.costStep) * levels[st]))
        : Math.floor(b * Math.pow(m, levels[st]));
      var share = (i === 0) ? 0.6 : (i === 1 ? 0.3 : 0.1);
      if (cost <= left * share) { left -= cost; levels[st] += 1; bought = true; }
    }
    if (!bought) break;
  }
  run("fullResetState(); game.playerName='X'; game.heroId='" + heroId + "';");
  Object.keys(levels).forEach(function (st) { g.game.upgrades["utrain_" + st] = levels[st]; });
  run("EquipmentManager.recalcStats(); game.heroHp = game.heroMaxHp;");
  return { levels: levels, dmg: g.StatsSystem.effectiveTapDamage(), hp: g.game.heroMaxHp, left: Math.round(left) };
}

/* v3.248.0 : la grille LIVRÉE est linéaire (base, costStep) — les autres entrées restent des
   candidates historiques, en courbe exponentielle (base, multiplicateur), pour comparaison. */
var GRIDS = {
  livree: { power: [9, 0.055], celerity: [4, 0.055], precision: [7, 0.055], will: [5, 0.055], endurance: [7, 0.055], lineaire: true },
  ancienne: { power: [15, 1.15], celerity: [45, 1.18], precision: [50, 1.22], will: [60, 1.18], endurance: [60, 1.14] },
  /* A — alignement strict sur la Force actuelle (la moins chère). */
  alignee: { power: [15, 1.15], celerity: [15, 1.15], precision: [15, 1.15], will: [15, 1.15], endurance: [15, 1.15] },
  /* B — alignement + courbe adoucie. */
  douce: { power: [15, 1.12], celerity: [15, 1.12], precision: [15, 1.12], will: [15, 1.12], endurance: [15, 1.12] },
  /* C — alignement compensant le coef de classe : le point qui rapporte le moins coûte le moins,
     pour que 1 or achète le même gain quelle que soit la classe. Base Force 15 (coef 0,20 chez
     le Chevalier) → Volonté 15 × 0,11/0,20 ≈ 8, Célérité idem à sa valeur d'usage. */
  equite: { power: [15, 1.15], celerity: [10, 1.15], precision: [15, 1.15], will: [8, 1.15], endurance: [20, 1.14] }
};

console.log("\n=== 4. Ce qu'un budget achète, par classe et par grille ===");
console.log("  Politique : stat principale 60 %, Endurance 30 %, Force 10 %. Terrain niveau 0 (plafond 10).\n");
[500, 2000, 10000].forEach(function (budget) {
  console.log("  --- budget " + budget + " or (" + Math.ceil(budget / orLisiere) + " combats en Lisière, "
    + Math.ceil(budget / (revenus["Forêt · Cœur"] / 10)) + " au Cœur) ---");
  console.log("    " + pad("grille", 11) + CLASSES.map(function (c) { return pad(c.label, 22); }).join(""));
  Object.keys(GRIDS).forEach(function (name) {
    var cells = CLASSES.map(function (c) {
      var r = spend(budget, c.hero, c.id, GRIDS[name], 1);
      return pad(r.dmg + " dég / " + r.hp + " PV", 22);
    });
    console.log("    " + pad(name, 11) + cells.join(""));
  });
  console.log("");
});

/* ---------- 5. Le plafond du Terrain ---------- */
/* ---------- 5. Le plafond du Terrain ---------- */
console.log("\n=== 5. Plafond porté par le Terrain d'entraînement ===");
var tr = g.VILLAGE_BUILDINGS.training;
console.log("  " + tr.name + " : " + tr.maxLevel + " niveaux, " + tr.effectLabel(0) + " sans bâtiment.");
console.log("  Déblocage : " + tr.lockLabel + ".");
function buildingCost(def, level) {
  var tier = (def.costTiers || []).find(function (t) { return level >= t.minLevel && level <= t.maxLevel; });
  if (!tier) return null;
  var steps = level - tier.minLevel;
  var out = {};
  Object.keys(tier.baseCost).forEach(function (k) { out[k] = Math.floor(tier.baseCost[k] * Math.pow(tier.costMult, steps)); });
  return out;
}
var cumulOr = 0;
[0, 1, 2, 3, 4, 5, 9, 13].forEach(function (lvl) {
  var c = buildingCost(tr, lvl);
  if (!c) return;
  console.log("    niveau " + lpad(lvl + 1, 2) + " → plafond " + lpad(Math.min(150, 10 * (lvl + 2)), 3)
    + " · coût " + Object.keys(c).map(function (k) { return c[k] + " " + k; }).join(", "));
});
for (var l = 0; l < tr.maxLevel; l++) { var cc = buildingCost(tr, l); if (cc && cc.gold) cumulOr += cc.gold; }
console.log("  Or cumulé pour monter le Terrain au maximum : " + Math.round(cumulOr) + " or (hors matériaux).");

/* ---------- 6. Grilles candidates ---------- */
console.log("\n=== 6. Grilles candidates, coût cumulé ===");
Object.keys(GRIDS).forEach(function (name) {
  var grid = GRIDS[name];
  console.log("\n  --- grille « " + name + " » ---");
  console.log("    " + pad("stat", 12) + lpad("base", 6) + lpad("mult", 7) + lpad("niv 10", 9) + lpad("niv 20", 10) + lpad("niv 50", 12) + lpad("niv 10 en combats", 20));
  STATS.forEach(function (s) {
    var u = upg(s), b = grid[s][0], m = grid[s][1];
    console.log("    " + pad(s, 12) + lpad(b, 6) + lpad(m, 7)
      + lpad(cumul(u, 10, b, m), 9) + lpad(cumul(u, 20, b, m), 10) + lpad(cumul(u, 50, b, m), 12)
      + lpad(Math.ceil(cumul(u, 10, b, m) / orLisiere), 20));
  });

});

/* ---------- 7. Jalons de progression ---------- */
console.log("\n=== 7. Combien de combats pour les 10 premiers niveaux des 5 caractéristiques ===");
Object.keys(GRIDS).forEach(function (name) {
  var grid = GRIDS[name], total = 0;
  STATS.forEach(function (s) { total += cumul(upg(s), 10, grid[s][0], grid[s][1]); });
  console.log("  " + pad(name, 11) + lpad(Math.round(total), 7) + " or  = " + lpad(Math.ceil(total / orLisiere), 5)
    + " combats en Lisière (" + lpad(Math.ceil(total / (revenus["Forêt · Cœur"] / 10)), 4) + " au Cœur)");
});
console.log("\n  (Le plafond du Terrain sans bâtiment est de 10 : c'est exactement ce palier.)");

/* ---------- 8. Le plafond, et non le prix, est-il le vrai mur ? ---------- */
console.log("\n=== 8. Effet du plafond du Terrain (grille ACTUELLE, budget illimité) ===");
console.log("  " + pad("Terrain", 10) + pad("plafond", 9) + CLASSES.map(function (c) { return pad(c.label, 20); }).join(""));
[0, 1, 2, 4, 9, 13].forEach(function (lvl) {
  var cells = CLASSES.map(function (c) {
    var r = spend(9999999, c.hero, c.id, null, lvl);
    return pad(r.dmg + " dég / " + r.hp + " PV", 20);
  });
  console.log("  " + pad("niv " + lvl, 10) + pad(10 * (lvl + 1), 9) + cells.join(""));
});

/* ---------- 9. DPS effectif (la Célérité ne se voit pas dans « dégâts par coup ») ---------- */
console.log("\n=== 9. Rounds pour tuer un ennemi de Lisière (plafond 10, budget 2000) ===");
console.log("  La Célérité du Rôdeur remplit la jauge : son DPS réel dépasse ses dégâts par coup.\n");
function roundsToKill(heroId, classId, grid) {
  spend(2000, heroId, classId, grid, 0);
  g.game.unlockedTabs.combat = true; g.game.activeTab = "combat";
  g.ClassCombatManager.resetForNewHero(); g.CombatEngine.ensureState();
  g.WorldManager.worldIndex = 0; g.WorldManager.adventureIndex = 0; g.WorldManager.enemyIndex = 0;
  g.CombatEngine.spawnEnemy();
  var e = g.game.enemy, rounds = 0, guard = 400;
  while (g.game.enemy === e && e.hp > 0 && g.game.heroHp > 0 && guard-- > 0) {
    g.game.heroHp = g.game.heroMaxHp;
    e.chargeIn = 99; e.engageIn = 0;
    if (!g.CombatEngine.heroAction("basic")) break;
    rounds++;
  }
  return { rounds: rounds, hp: e.maxHp };
}
Object.keys(GRIDS).forEach(function (name) {
  var cells = CLASSES.map(function (c) {
    var r = roundsToKill(c.hero, c.id, GRIDS[name]);
    return pad(c.label + " " + r.rounds + " rd", 20);
  });
  console.log("  " + pad(name, 11) + cells.join(""));
});

/* ---------- 10. Améliorations CONTRE équipement, à or égal ----------
   Contrainte posée par Seb (15/09/2026) : « les compétences doivent être aussi
   intéressantes que l'équipement, un peu moins mais utiles ». On mesure donc le
   gain par or dépensé de chaque côté, sur le même héros et le même budget. */
console.log("\n=== 10. Améliorations contre équipement, à or égal ===");
var SLOTS_EQ = ["weapon", "armor", "helmet", "gloves", "boots", "ring", "amulet"];
function equipFor(budget, heroId) {
  run("fullResetState(); game.playerName='X'; game.heroId='" + heroId + "'; EquipmentManager.recalcStats(); game.heroHp = game.heroMaxHp;");
  var d0 = g.StatsSystem.effectiveTapDamage(), hp0 = g.game.heroMaxHp;
  var price = g.EQUIP_SHOP_PRICES.common * (g.EQUIP_SHOP_WORLD_PRICE_MULT[0] || 1);
  var n = Math.floor(budget / price);
  var bought = 0;
  for (var i = 0; i < SLOTS_EQ.length && bought < n; i++) {
    g.game.equipped[SLOTS_EQ[i]] = g.generateEquipmentItem(SLOTS_EQ[i], "common", 0);
    bought++;
  }
  run("EquipmentManager.recalcStats(); game.heroHp = game.heroMaxHp;");
  return { pieces: bought, dmg: g.StatsSystem.effectiveTapDamage() - d0, hp: g.game.heroMaxHp - hp0, spent: bought * price };
}
console.log("  Une pièce commune = " + (g.EQUIP_SHOP_PRICES.common) + " or. Améliorations : politique 60 % stat principale / 30 % Endurance / 10 % Force, plafond 10.\n");
[300, 900, 2100].forEach(function (budget) {
  console.log("  --- " + budget + " or (" + Math.ceil(budget / orLisiere) + " combats) ---");
  CLASSES.forEach(function (c) {
    run("fullResetState(); game.playerName='X'; game.heroId='" + c.hero + "'; EquipmentManager.recalcStats();");
    var base = { dmg: g.StatsSystem.effectiveTapDamage(), hp: g.game.heroMaxHp };
    var eq = equipFor(budget, c.hero);
    var lines = [];
    Object.keys(GRIDS).forEach(function (name) {
      var r = spend(budget, c.hero, c.id, GRIDS[name], 1);
      lines.push(pad(name, 10) + "+" + lpad((r.dmg - base.dmg), 3) + " dég  +" + lpad((r.hp - base.hp), 4) + " PV");
    });
    console.log("    " + pad(c.label, 10) + "équipement (" + eq.pieces + " pièces) +" + lpad(eq.dmg, 3) + " dég  +" + lpad(eq.hp, 4) + " PV");
    lines.forEach(function (l) { console.log("              " + l); });
  });
  console.log("");
});
