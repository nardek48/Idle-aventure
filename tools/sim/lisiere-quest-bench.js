"use strict";
/* tools/sim/lisiere-quest-bench.js — diagnostic de « Prouver sa valeur » (aq_forest_expedition),
   l'étape forest_05 « Le Roi des marais ». Retour Seb 15/09/2026 : boss infranchissable.

   Ce qu'on mesure, sur le VRAI moteur (bac à sable de forest-bench.js) : le RUN COMPLET,
   9 kills puis le Roi Slime, sans repos entre les combats (c'est une sortie) et avec le
   cap de 2 potions par sortie. C'est la différence avec balance-bench.js, qui mesure un
   duel de boss à PV pleins et ne voit donc pas le coût d'usure des 9 combats.

   Profil dérivé de l'économie réelle, comme balance-bench.js, à plusieurs volumes de kills
   (le joueur arrive à forest_05 vers 30-60 ennemis vaincus selon son rythme).

   USAGE : node tools/sim/lisiere-quest-bench.js . [--runs N] [--kills 30,45,60,90] */

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var ROOT = require("../chemins.js").jeu(process.argv[2]);
var RUNS = 200;
var KILL_STAGES = [30, 45, 60, 90];
for (var ai = 3; ai < process.argv.length; ai++) {
  if (process.argv[ai] === "--runs") RUNS = Number(process.argv[ai + 1]) || RUNS;
  if (process.argv[ai] === "--kills") KILL_STAGES = process.argv[ai + 1].split(",").map(Number);
}

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
var rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function nextRandom() {
  rngState = (rngState + 0x6D2B79F5) >>> 0;
  var t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function buildSandbox() {
  var storage = {};
  var fakeMath = Object.create(Math);
  fakeMath.random = nextRandom;
  var sandbox = {
    console: { log: function () {}, warn: function () {}, error: function () {} },
    Date: Date, Math: fakeMath, JSON: JSON, Object: Object, Array: Array,
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

/* ---------- Politique de round (identique aux autres bancs) ---------- */
function pendingConditionOf(e) {
  if (!e) return null;
  if (e.healTelegraphed) return "healIncoming";
  if (e.shieldTelegraphed) return "shieldIncoming";
  if (e.surgeTelegraphed) return "eliteSurgeIncoming";
  if (e.chargeTelegraphed) return "chargeIncoming";
  if (e.silenceTelegraphed) return "enemySilenceIncoming";
  return null;
}
/* POLITIQUES DE JEU — le joueur réel n'est pas le simulateur optimal.
   "opti"   : contre chaque télégraphe avec le bon slot, potion sous 35 % (politique des autres bancs)
   "tape"   : ne contre jamais, tape la plus grosse compétence disponible, potion sous 35 %
   "defense": répond à tout télégraphe par Défense (le réflexe naturel — inutile contre bouclier et soin)
   "grimoire": mode automatique du jeu, règles par défaut */
var POLICY = "opti";
function playRound(g) {
  if (POLICY === "grimoire") {
    /* Mode automatique réel du jeu : ClassCombatManager.chooseRoundAction(true), la décision
       que prend CombatEngine.tickRoundClock quand game.combatMode === "grimoire". */
    var d = (g.ClassCombatManager && typeof g.ClassCombatManager.chooseRoundAction === "function") ? g.ClassCombatManager.chooseRoundAction(true) : null;
    if (d && d.slot && d.slot !== "basic" && g.CombatEngine.heroAction(d.slot, { matchedConditionId: d.matchedConditionId || null }, "auto")) return true;
    return g.CombatEngine.heroAction("basic", null, "auto");
  }
  var pending = pendingConditionOf(g.game.enemy);
  var maxHp = Number(g.game.heroMaxHp || 0);
  if (maxHp > 0 && (g.game.heroHp / maxHp) < 0.35) {
    if (g.CombatEngine.heroAction("potion", "potion_soin_mineur")) return true;
  }
  if (pending && POLICY === "defense") {
    if (g.CombatEngine.heroAction("defense")) return true;
  }
  if (pending && POLICY === "opti") {
    var cls = g.getClassByHeroId(g.game.heroId);
    var kit = cls ? g.getClassSkills(cls.id) : null;
    var order = ["defense", "skill1", "skill2", "skill3"];
    for (var i = 0; i < order.length; i++) {
      var a = kit && kit.actions[order[i]];
      if (!a || !a.counters || a.counters.indexOf(pending) === -1) continue;
      if (g.CombatEngine.heroAction(order[i])) return true;
    }
  }
  var fallback = ["skill3", "skill2", "skill1", "basic"];
  for (var j = 0; j < fallback.length; j++) if (g.CombatEngine.heroAction(fallback[j])) return true;
  return false;
}

/* ---------- Profil économique (copie de balance-bench.js, potions corrigées) ---------- */
var SLOTS = ["weapon", "armor", "helmet", "gloves", "boots", "ring", "amulet"];
var HEROES = [{ id: "knight", label: "Chevalier" }, { id: "ranger", label: "Rôdeur" }, { id: "mage", label: "Mage" }];
var MAIN_STAT = { knight: "power", ranger: "celerity", mage: "will" };
var RARITY_ORDER = ["common", "green", "rare", "epic", "legendary"];

function goldEarned(g, kills) {
  var total = 0;
  g.WorldManager.worldIndex = 0; g.WorldManager.adventureIndex = 0;
  for (var i = 0; i < kills; i++) {
    g.WorldManager.enemyIndex = ((i % 10) === 9) ? 9 : (i % 9);
    total += Number(g.WorldManager.generateEnemy().goldReward || 0);
  }
  return total;
}
function buyUpgrades(g, heroId, budget) {
  var order = [MAIN_STAT[heroId], "endurance", "precision"];
  var levels = { power: 0, endurance: 0, celerity: 0, precision: 0, will: 0 };
  var byId = {}; g.UPGRADES.forEach(function (u) { byId[u.id] = u; });
  var guard = 4000;
  while (guard-- > 0) {
    var bought = false;
    for (var i = 0; i < order.length; i++) {
      var st = order[i], up = byId["utrain_" + st];
      if (!up || levels[st] >= up.maxLevel) continue;
      /* v3.248.0 : les cinq entraînements sont passés en courbe LINÉAIRE (costStep) ;
         les autres améliorations gardent costMult. Même règle que getUpgradeCost. */
      var cost = (typeof up.costStep === "number")
        ? Math.floor(up.baseCost * (1 + up.costStep * levels[st]))
        : Math.floor(up.baseCost * Math.pow(up.costMult, levels[st]));
      var share = (i === 0) ? 0.6 : (i === 1 ? 0.3 : 0.1);
      if (cost <= budget * share) { budget -= cost; levels[st] += 1; bought = true; }
    }
    if (!bought) break;
  }
  return levels;
}
function allowedAt(g, world, rarity) {
  var unlocks = g.WORLD_RARITY_UNLOCKS;
  for (var w = 0; w <= world; w++) if ((unlocks[w] || []).indexOf(rarity) !== -1) return true;
  return false;
}
function pickRarity(g, world) {
  var allowed = RARITY_ORDER.filter(function (r) { return allowedAt(g, world, r); });
  var total = 0; allowed.forEach(function (r) { total += g.RARITY_DROP_RATES[r]; });
  var x = nextRandom() * total, acc = 0;
  for (var i = 0; i < allowed.length; i++) { acc += g.RARITY_DROP_RATES[allowed[i]]; if (x < acc) return allowed[i]; }
  return allowed[allowed.length - 1];
}
function randIntLocal(a, b) { return a + Math.floor(nextRandom() * (b - a + 1)); }
function buildKit(g, kills, shopBudget) {
  var kit = {};
  var drops = Math.floor(kills / 10 * 0.5);
  for (var d = 0; d < drops; d++) {
    var slot = SLOTS[randIntLocal(0, 6)];
    var it = g.generateEquipmentItem(slot, pickRarity(g, 0), 0);
    if (!kit[slot] || RARITY_ORDER.indexOf(it.rarity) > RARITY_ORDER.indexOf(kit[slot].rarity)) kit[slot] = it;
  }
  var prices = g.EQUIP_SHOP_PRICES, worldMult = g.EQUIP_SHOP_WORLD_PRICE_MULT[0] || 1;
  SLOTS.forEach(function (slot) {
    for (var r = RARITY_ORDER.length - 1; r >= 0; r--) {
      var rar = RARITY_ORDER[r];
      if (!allowedAt(g, 0, rar)) continue;
      var price = (prices[rar] || 0) * worldMult, have = kit[slot];
      if (have && RARITY_ORDER.indexOf(have.rarity) >= r) break;
      if (price <= shopBudget) { shopBudget -= price; kit[slot] = g.generateEquipmentItem(slot, rar, 0); break; }
    }
  });
  SLOTS.forEach(function (slot) { if (!kit[slot]) kit[slot] = g.generateEquipmentItem(slot, "common", 0); });
  return kit;
}
function heroLevelFor(kills) {
  var xp = Math.floor(kills / 10) * 10, level = 1, need = 20;
  while (xp >= need && level < 60) { xp -= need; level += 1; need = Math.floor(20 * Math.pow(1.35, level - 1) + (level - 1) * 10); }
  return level;
}
var TALENT_ORDER = ["t_sharpened_blades", "t_regenerate", "t_sharpened_blades", "t_regenerate", "t_sharpened_blades", "t_regenerate", "t_war_instinct", "t_second_wind"];
function spendTalents(points) {
  var out = {};
  for (var i = 0; i < points && i < TALENT_ORDER.length; i++) out[TALENT_ORDER[i]] = (out[TALENT_ORDER[i]] || 0) + 1;
  return out;
}
/* share : part de l'or réellement dépensée pour le combat (1 = le banc d'origine, 0,3 = un joueur
   qui met l'essentiel dans le village, les potions et la construction). */
/* Profil « sortie de tutoriel » : rien d'acheté, rien d'amélioré — l'état réel du joueur à forest_05. */
function starterProfile() {
  return { levels: { power: 0, endurance: 0, celerity: 0, precision: 0, will: 0 }, kit: null, level: 3, gold: 0, starter: true };
}
function profileFor(g, run, heroId, kills, share) {
  run("fullResetState(); game.heroId='knight';");
  var gold = goldEarned(g, kills) * (share == null ? 1 : share);
  seedRng(500 + kills);
  return { levels: buyUpgrades(g, heroId, gold * 0.6), kit: buildKit(g, kills, gold * 0.4), level: heroLevelFor(kills), gold: gold };
}
function setup(g, run, heroId, profile, potions) {
  run("fullResetState(); game.playerName='Bench'; game.heroId='" + heroId + "';");
  Object.keys(profile.levels).forEach(function (st) { g.game.upgrades["utrain_" + st] = profile.levels[st]; });
  g.game.heroLevel = profile.level;
  g.game.talents = spendTalents(Math.max(0, profile.level - 1));
  /* Potions de SOIN : game.healingPotionsOwned (et non game.inventory — voir note de dungeon-bench). */
  g.PotionManager.ensureHealing();
  g.game.healingPotionsOwned = { potion_soin_mineur: (potions == null ? 3 : potions) };
  g.game.worldsEverReached = { 0: true };
  g.WorldManager.worldIndex = 0;
  if (profile.kit) SLOTS.forEach(function (s) { g.game.equipped[s] = profile.kit[s]; }); // starter : équipement de départ tel quel
  run("EquipmentManager.recalcStats(); game.heroHp = game.heroMaxHp;");
  g.game.unlockedTabs.combat = true; g.game.activeTab = "combat";
  g.ClassCombatManager.resetForNewHero(); g.CombatEngine.ensureState();
}

/* ---------- Le run de quête complet ---------- */
function runQuest(g, run, heroId, profile, potions, startHpPct) {
  setup(g, run, heroId, profile, potions);
  /* La quête d'aventure NE remet PAS les PV à plein au lancement (contrairement au donjon,
     DungeonManager.start l. ~230) : le joueur part avec ce qu'il lui reste. */
  if (startHpPct != null) g.game.heroHp = Math.max(1, Math.floor(g.game.heroMaxHp * startHpPct));
  g.AdventureQuestManager.ensureDefaults();
  g.AdventureQuestManager.start("aq_forest_expedition");
  if (!g.game.adventureQuestRun.active) return null;

  var guard = 800, kills = 0, bossReached = false, hpAtBoss = null, bossRounds = 0, rounds = 0;
  while (g.game.adventureQuestRun.active && g.game.heroHp > 0 && guard-- > 0) {
    var e = g.game.enemy;
    if (e && e.isBoss && !bossReached) { bossReached = true; hpAtBoss = g.game.heroHp / g.game.heroMaxHp; }
    if (!playRound(g)) break;
    rounds += 1;
    if (bossReached) bossRounds += 1;
    if (g.game.enemy !== e) kills += 1;
  }
  var done = !!(g.game.adventureQuestsCompleted || {}).aq_forest_expedition;
  var diedBeforeBoss = !done && !bossReached;
  return {
    success: done, bossReached: bossReached, diedBeforeBoss: diedBeforeBoss,
    hpAtBoss: hpAtBoss, bossRounds: bossRounds, rounds: rounds,
    potionsLeft: Number((g.game.healingPotionsOwned || {}).potion_soin_mineur || 0)
  };
}

function measure(g, run, heroId, profile, potions, startHpPct) {
  var n = 0, ok = 0, reached = 0, hp = 0, hpN = 0, brd = 0, dieBefore = 0;
  for (var r = 0; r < RUNS; r++) {
    seedRng(21000 + r);
    var res = runQuest(g, run, heroId, profile, potions, startHpPct);
    if (!res) continue;
    n++;
    if (res.success) ok++;
    if (res.bossReached) { reached++; brd += res.bossRounds; if (res.hpAtBoss != null) { hp += res.hpAtBoss; hpN++; } }
    if (res.diedBeforeBoss) dieBefore++;
  }
  if (!n) return null;
  return { fail: 1 - ok / n, reached: reached / n, dieBefore: dieBefore / n, hpAtBoss: hpN ? hp / hpN : 0, bossRounds: reached ? brd / reached : 0 };
}
function fmt(m) {
  if (!m) return "—";
  return ("†" + Math.round(m.fail * 100) + "%").padStart(5)
    + "  arrive au boss " + String(Math.round(m.reached * 100)).padStart(3) + "%"
    + "  PV \u00e0 l'entr\u00e9e du boss " + String(Math.round(m.hpAtBoss * 100)).padStart(3) + "%"
    + "  boss " + m.bossRounds.toFixed(1) + "rd"
    + "  mort avant boss " + String(Math.round(m.dieBefore * 100)).padStart(3) + "%";
}

function main() {
  var g = buildSandbox();
  function run(code) { return vm.runInContext(code, g); }
  console.log("Calibrage de « Prouver sa valeur » — " + RUNS + " runs par cellule. Soin du boss CONSERV\u00c9.");
  console.log("Le diviseur s'applique \u00e0 TOUS les ennemis de la qu\u00eate (normaux + boss), comme le fera enemyHpMult.\n");

  var DIVISORS = [1, 2, 2.5, 3];
  var POLICIES = [{ id: "opti", label: "contres" }, { id: "grimoire", label: "Grimoire" }, { id: "tape", label: "sans contrer" }];
  var PROFILES = [
    { id: "starter", label: "sortie de tutoriel (rien achet\u00e9)" },
    { id: "kills40", label: "40 ennemis vaincus, or d\u00e9pens\u00e9 au combat" }
  ];

  var originalSpawnFor = g.QuestEnemyManager.spawnFor;
  var DIV = 1;
  g.QuestEnemyManager.spawnFor = function (quest, forceBoss) {
    var e = originalSpawnFor.call(g.QuestEnemyManager, quest, forceBoss);
    if (e && DIV > 1) { e.hp = Math.max(1, Math.floor(e.maxHp / DIV)); e.maxHp = e.hp; }
    return e;
  };

  PROFILES.forEach(function (pf) {
    console.log("=== " + pf.label + " ===");
    HEROES.forEach(function (h) {
      var profile = (pf.id === "starter") ? starterProfile() : profileFor(g, run, h.id, 40, 1);
      setup(g, run, h.id, profile, 3);
      var heroHp = g.game.heroMaxHp, dmg = g.StatsSystem.effectiveTapDamage();
      var rar = profile.kit ? SLOTS.map(function (s) { return (profile.kit[s].rarity || "?").charAt(0).toUpperCase(); }).join("") : "d\u00e9part";
      console.log("  " + h.label + " \u00b7 " + heroHp + " PV, " + dmg + " d\u00e9g/coup \u00b7 kit " + rar);
      DIVISORS.forEach(function (d) {
        DIV = d;
        var cells = POLICIES.map(function (pol) {
          POLICY = pol.id;
          var m = measure(g, run, h.id, profile, 3, 1.0);
          return pol.label + " \u2020" + String(Math.round(m.fail * 100)).padStart(3) + "% (mort avant boss " + String(Math.round(m.dieBefore * 100)).padStart(3) + "%)";
        });
        POLICY = "opti";
        console.log("    \u00f7" + String(d).padEnd(4) + "  " + cells.join("  "));
      });
      console.log("");
    });
  });
}
main();
