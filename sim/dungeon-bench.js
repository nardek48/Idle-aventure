"use strict";
/* sim/dungeon-bench.js — banc de la REFONTE DES DONJONS (lot D-0), sur le VRAI moteur.

   Ce que le banc mesure (doc de conception Donjons v1.1, §9) :
     1. l'état ACTUEL de la Tanière (Donjon I, 15 vagues + boss) : taux d'échec,
        vague moyenne atteinte, rounds — c'est la référence que la refonte ne
        doit pas déplacer de plus de 5 points ;
     2. l'échelle proposée pour les ÉLITES en donjon (§4.5) : PV d'une élite de
        vague 5/10 contre PV d'une vague normale de même rang et contre le boss ;
     3. les MARQUES, seules et en combinaisons à 3 (§4.2 / §9) ;
     4. la SÈVE gagnée par run sous Marques (+2 par Marque, §12.2).

   v3.245.0 : les Marques et les élites sont dans le jeu (dungeon-system.js) — le banc
   mesure le CODE RÉEL via DungeonManager.start(id, marks). Les patchs du lot D-0
   (applyMarks / patchWaves) sont conservés sous --legacy pour rejouer la mesure d'avant.

   Profil de joueur : DÉRIVÉ DE L'ÉCONOMIE RÉELLE comme sim/balance-bench.js
   (or gagné → améliorations + kit d'échoppe + drops, talents par niveau),
   à deux stades : « Forêt · fin » (le joueur qui découvre la Tanière) et
   « Désert · fin » (le joueur qui redescend chercher de la Sève).

   USAGE :
     node sim/dungeon-bench.js .                    tableau complet (~2-4 min)
     node sim/dungeon-bench.js . --runs 60          plus rapide
     node sim/dungeon-bench.js . --elite 2.4,1.1    statMult de l'élite GÉNÉRIQUE (Traque)
     node sim/dungeon-bench.js . --stages f3        un seul stade
     node sim/dungeon-bench.js . --quick            état actuel + élites seulement */

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var ROOT = process.argv[2] || ".";
var RUNS = 120;
var ELITE_GENERIC = { endurance: 2.4, power: 1.1 };
var STAGES_ARG = null, QUICK = false, LEGACY = false;
for (var ai = 3; ai < process.argv.length; ai++) {
  if (process.argv[ai] === "--runs") RUNS = Number(process.argv[ai + 1]) || RUNS;
  if (process.argv[ai] === "--elite") { var p = process.argv[ai + 1].split(","); ELITE_GENERIC = { endurance: Number(p[0]) || 2.4, power: Number(p[1]) || 1.1 }; }
  if (process.argv[ai] === "--stages") STAGES_ARG = process.argv[ai + 1];
  if (process.argv[ai] === "--quick") QUICK = true;
  if (process.argv[ai] === "--legacy") LEGACY = true;
}

/* Valeurs du document v1.1 (§3.1 / §3.3), à confirmer par ce banc. */
var CONFIG = { maxMarks: 3, markStackBonus: 0.15, specialPerMark: 2, eliteShardsBonus: 3 };
var ELITE_WAVES = { 5: "araignee_marquee", 10: "ronce_ardente" };

/* ---------- Bac à sable (copie de forest-bench.js) ---------- */
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

/* ---------- Pilotage d'un round (copie de balance-bench.js) ---------- */
function pendingConditionOf(e) {
  if (!e) return null;
  if (e.healTelegraphed) return "healIncoming";
  if (e.shieldTelegraphed) return "shieldIncoming";
  if (e.surgeTelegraphed) return "eliteSurgeIncoming";
  if (e.chargeTelegraphed) return "chargeIncoming";
  if (e.silenceTelegraphed) return "enemySilenceIncoming";
  return null;
}
function playRound(g) {
  var pending = pendingConditionOf(g.game.enemy);
  var maxHp = Number(g.game.heroMaxHp || 0);
  if (maxHp > 0 && (g.game.heroHp / maxHp) < 0.30) {
    if (g.CombatEngine.heroAction("potion", "potion_soin_mineur")) return true;
  }
  if (pending) {
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

/* ---------- Profil économique (copie de balance-bench.js) ---------- */
var SLOTS = ["weapon", "armor", "helmet", "gloves", "boots", "ring", "amulet"];
var HEROES = [{ id: "knight", label: "Chevalier" }, { id: "ranger", label: "Rôdeur" }, { id: "mage", label: "Mage" }];
var MAIN_STAT = { knight: "power", ranger: "celerity", mage: "will" };
var RARITY_ORDER = ["common", "green", "rare", "epic", "legendary"];
var ALL_STAGES = [
  { id: "f3", label: "Forêt · fin", world: 0, adv: 1, kills: 140 },
  { id: "d3", label: "Désert · fin", world: 1, adv: 1, kills: 550 }
];
var STAGES = STAGES_ARG ? ALL_STAGES.filter(function (s) { return STAGES_ARG.split(",").indexOf(s.id) !== -1; }) : ALL_STAGES;

function goldEarned(g, stage) {
  var total = 0;
  var perWorld = Math.max(1, Math.floor(stage.kills / (stage.world + 1)));
  for (var w = 0; w <= stage.world; w++) {
    g.WorldManager.worldIndex = w; g.WorldManager.adventureIndex = 0;
    var n = (w === stage.world) ? (stage.kills - perWorld * w) : perWorld;
    for (var i = 0; i < n; i++) {
      g.WorldManager.enemyIndex = ((i % 10) === 9) ? 9 : (i % 9);
      total += Number(g.WorldManager.generateEnemy().goldReward || 0);
    }
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
function buildKit(g, stage, shopBudget) {
  var kit = {};
  var drops = Math.floor(stage.kills / 10 * 0.5);
  for (var d = 0; d < drops; d++) {
    var slot = SLOTS[randIntLocal(0, 6)];
    var it = g.generateEquipmentItem(slot, pickRarity(g, stage.world), stage.world);
    if (!kit[slot] || RARITY_ORDER.indexOf(it.rarity) > RARITY_ORDER.indexOf(kit[slot].rarity)) kit[slot] = it;
  }
  var prices = g.EQUIP_SHOP_PRICES, worldMult = g.EQUIP_SHOP_WORLD_PRICE_MULT[stage.world] || 1;
  SLOTS.forEach(function (slot) {
    for (var r = RARITY_ORDER.length - 1; r >= 0; r--) {
      var rar = RARITY_ORDER[r];
      if (!allowedAt(g, stage.world, rar)) continue;
      var price = (prices[rar] || 0) * worldMult, have = kit[slot];
      if (have && RARITY_ORDER.indexOf(have.rarity) >= r) break;
      if (price <= shopBudget) { shopBudget -= price; kit[slot] = g.generateEquipmentItem(slot, rar, stage.world); break; }
    }
  });
  SLOTS.forEach(function (slot) { if (!kit[slot]) kit[slot] = g.generateEquipmentItem(slot, "common", stage.world); });
  return kit;
}
function heroLevelFor(kills) {
  var xp = Math.floor(kills / 10) * 10, level = 1, need = 20;
  while (xp >= need && level < 60) { xp -= need; level += 1; need = Math.floor(20 * Math.pow(1.35, level - 1) + (level - 1) * 10); }
  return level;
}
var TALENT_ORDER = [
  "t_sharpened_blades", "t_regenerate", "t_sharpened_blades", "t_regenerate",
  "t_sharpened_blades", "t_regenerate", "t_war_instinct", "t_second_wind",
  "t_war_instinct", "t_second_wind", "t_war_instinct", "t_second_wind",
  "t_precise_strike", "t_tenacious_will", "t_precise_strike", "t_tenacious_will",
  "t_precise_strike", "t_tenacious_will", "t_boss_slayer", "t_calm_breath",
  "t_boss_slayer", "t_calm_breath", "t_boss_slayer", "t_calm_breath"
];
function spendTalents(points) {
  var out = {};
  for (var i = 0; i < points && i < TALENT_ORDER.length; i++) out[TALENT_ORDER[i]] = (out[TALENT_ORDER[i]] || 0) + 1;
  return out;
}
function profileFor(g, run, heroId, stage) {
  run("fullResetState(); game.heroId='knight';");
  var gold = goldEarned(g, stage);
  seedRng(300 + stage.kills);
  return {
    levels: buyUpgrades(g, heroId, gold * 0.6), kit: buildKit(g, stage, gold * 0.4),
    level: heroLevelFor(stage.kills), forgeLevel: stage.world >= 1 ? 1 : 0, gold: gold
  };
}
function setup(g, run, heroId, stage, profile) {
  run("fullResetState(); game.playerName='Bench'; game.heroId='" + heroId + "';");
  Object.keys(profile.levels).forEach(function (st) { g.game.upgrades["utrain_" + st] = profile.levels[st]; });
  g.game.heroLevel = profile.level;
  g.game.talents = spendTalents(Math.max(0, profile.level - 1));
  g.VillageBuildingManager.ensure();
  g.game.village.buildings.forge = { level: profile.forgeLevel };
  if (profile.forgeLevel > 0 && g.ForgeManager) { g.ForgeManager.ensure(); SLOTS.forEach(function (sl) { g.game.forge.levels[sl] = profile.forgeLevel; }); }
  /* Potions de SOIN : stock dans game.healingPotionsOwned (PotionManager.useHealingPotion),
     pas dans l'inventaire — balance-bench.js les posait dans game.inventory, où le
     moteur ne les lit pas : ses mesures étaient de fait SANS potion (à signaler). */
  g.PotionManager.ensureHealing();
  g.game.healingPotionsOwned = { potion_soin_mineur: 3 };
  g.game.worldsEverReached = {}; for (var w = 0; w <= stage.world; w++) g.game.worldsEverReached[w] = true;
  g.WorldManager.worldIndex = stage.world;
  SLOTS.forEach(function (s) { g.game.equipped[s] = profile.kit[s]; });
  run("EquipmentManager.recalcStats(); game.heroHp = game.heroMaxHp;");
  g.game.unlockedTabs.combat = true; g.game.unlockedTabs.dungeon = true; g.game.activeTab = "combat";
  g.ClassCombatManager.resetForNewHero(); g.CombatEngine.ensureState();
  g.DungeonManager.ensure();
  g.game.dungeonRunsUsed = {}; // v3.358.0 : sorties du jour remises à zéro
  g.game.dungeonTierCleared = {};
}
/* Le donjon N exige le donjon N-1 terminé (getTierLockReason) : on le pose. */
function unlockTier(g, tierId) {
  for (var t = 1; t < tierId; t++) g.game.dungeonTierCleared[t] = true;
}

/* ---------- PATCHS : ce que la refonte ajoutera, posé ici sans toucher au jeu ----------
   MARQUES — les crochets du moteur lisent AfflictionManager.getCombinedModifiers(),
   gardé par isContextActive() (faux en donjon aujourd'hui). On force la garde à
   « vrai » et on active les entrées d'AFFLICTIONS voulues : Fragilité, Ascétisme,
   Fléau et le bonus de cumul s'appliquent alors exactement comme en production
   après le lot D-1 (doc §6.1). Colosses et Traque sont hors de ce chemin (ils
   agissent dans buildWaveEnemy) : voir patchWaves. */
var ORIGINAL = {};
function applyMarks(g, run, marks) {
  if (!ORIGINAL.isContextActive) ORIGINAL.isContextActive = g.AfflictionManager.isContextActive;
  g.AfflictionManager.isContextActive = function () { return marks.length > 0 && !!(g.game.dungeonRun && g.game.dungeonRun.active); };
  g.game.activeAfflictions = {};
  marks.forEach(function (id) { g.game.activeAfflictions[id] = true; });
  /* Le bonus de cumul de production sera markStackBonus (0,15) et non 0,10. */
  g.AFFLICTION_STACK_REWARD_BONUS = CONFIG.markStackBonus;
}

/* VAGUES — buildWaveEnemy est enveloppé pour :
     - poser les ÉLITES de données aux vagues 5 et 10 (EliteManager.build à l'échelle
       du donjon, §4.5 : s = scale × hpCoefNormal / BOSS_PV_MULT, milestone neutre) ;
     - sous Traque, rendre chaque vague normale élite (rotation des élites de
       données, ou élite GÉNÉRIQUE isBoss + statMult si le donjon n'en a pas) ;
     - sous Colosses, doubler les PV du boss.
   L'échelle « scale » n'est pas exposée par buildWaveEnemy : on la recalcule
   avec la même formule (dungeon-system.js l. 131-138). */
function dungeonScale(g, wave) {
  var tier = g.DungeonManager.getTierById(g.game.dungeonRun.tierId);
  var isBossWave = wave > g.DUNGEON_CONFIG.waveCount;
  var worldScale = 1 + Math.max(0, tier.worldPower || 0) * 0.6;
  var waveProgress = Math.min(1, wave / g.DUNGEON_CONFIG.waveCount);
  var premium = isBossWave ? g.DUNGEON_CONFIG.bossPremiumMult : g.DUNGEON_CONFIG.basePremiumMult;
  return worldScale * (1 + waveProgress * g.DUNGEON_CONFIG.waveRampMult) * premium * Math.max(1, tier.difficultyMult || 1);
}
function eliteScaleFor(g, wave) {
  var pvMult = (typeof g.BOSS_PV_MULT === "number") ? g.BOSS_PV_MULT : 3.1;
  return dungeonScale(g, wave) * 1.5 / pvMult;
}
function buildDungeonElite(g, eliteId, wave) {
  var saved = g.WorldManager.getCycleMilestoneMult;
  g.WorldManager.getCycleMilestoneMult = function () { return 1; }; // milestone neutre en donjon
  var e = g.EliteManager.build(eliteId, eliteScaleFor(g, wave));
  g.WorldManager.getCycleMilestoneMult = saved;
  if (e) e.name = e.name + " (élite)";
  return e;
}
function patchWaves(g, opts) {
  if (!ORIGINAL.buildWaveEnemy) ORIGINAL.buildWaveEnemy = g.DungeonManager.buildWaveEnemy;
  var base = ORIGINAL.buildWaveEnemy;
  g.DungeonManager.buildWaveEnemy = function (wave) {
    var isBossWave = wave > g.DUNGEON_CONFIG.waveCount;
    if (!isBossWave && opts.elites && ELITE_WAVES[wave]) {
      var el = buildDungeonElite(g, ELITE_WAVES[wave], wave);
      if (el) return el;
    }
    var e = base.call(g.DungeonManager, wave);
    if (isBossWave) {
      if (opts.colossus) { e.hp = Math.floor(e.hp * 2); e.maxHp = e.hp; }
      return e;
    }
    if (opts.traque) {
      /* Élite GÉNÉRIQUE sur toutes les vagues normales : l'ennemi de la vague passe
         boss, statMult relatif, sans archétype. (Première version du banc : rotation
         des élites de données à chaque vague — 15 Fileuses à ×3,8, 98 % d'échec
         Chevalier. Traque doit rester une pression, pas un mur ; les élites de
         données gardent leurs vagues fixes 5 et 10.) */
      e.isBoss = true;
      e.name = e.name + " (élite)";
      e.hp = Math.max(1, Math.floor(e.hp * ELITE_GENERIC.endurance)); e.maxHp = e.hp;
      e.stats.power = Math.max(1, Math.floor(e.stats.power * ELITE_GENERIC.power));
    }
    return e;
  };
}
function unpatch(g) {
  if (ORIGINAL.buildWaveEnemy) g.DungeonManager.buildWaveEnemy = ORIGINAL.buildWaveEnemy;
  if (ORIGINAL.isContextActive) g.AfflictionManager.isContextActive = ORIGINAL.isContextActive;
  g.game.activeAfflictions = {};
}

/* ---------- Un run complet de donjon ---------- */
function runDungeon(g, run, heroId, stage, profile, tierId, marks, opts) {
  setup(g, run, heroId, stage, profile);
  if (LEGACY) { applyMarks(g, run, marks); patchWaves(g, opts); }
  unlockTier(g, tierId);
  // v3.245.0 : Traque et Fléau exigent le donjon terminé une fois — le banc mesure le joueur qui y a droit
  g.game.dungeonTierCleared[tierId] = true;
  var clearsBefore = Number(g.game.dungeonBossClears || 0);
  g.DungeonManager.start(tierId, LEGACY ? [] : marks);
  if (!g.game.dungeonRun.active) { unpatch(g); return null; }
  var rounds = 0, guard = 3000, maxWave = 1, potions = 0;
  while (g.game.dungeonRun.active && g.game.heroHp > 0 && guard-- > 0) {
    maxWave = Math.max(maxWave, g.game.dungeonRun.wave || 1);
    var pBefore = Number((g.game.sortie && g.game.sortie.potionsUsed) || 0);
    if (!playRound(g)) break;
    potions = Math.max(potions, Number((g.game.sortie && g.game.sortie.potionsUsed) || pBefore));
    rounds += 1;
  }
  var success = Number(g.game.dungeonBossClears || 0) > clearsBefore;
  var cleared = success ? 16 : Math.max(0, maxWave - 1);
  if (LEGACY) unpatch(g);
  return { success: success, cleared: cleared, rounds: rounds, potions: potions };
}
function measure(g, run, heroId, stage, profile, tierId, marks, opts) {
  var n = 0, ok = 0, cl = 0, rd = 0, po = 0;
  for (var r = 0; r < RUNS; r++) {
    seedRng(11000 + r);
    var res = runDungeon(g, run, heroId, stage, profile, tierId, marks, opts);
    if (!res) continue;
    n++; if (res.success) ok++; cl += res.cleared; rd += res.rounds; po += res.potions;
  }
  return n ? { fail: 1 - ok / n, cleared: cl / n, rounds: rd / n, potions: po / n, n: n } : null;
}
function fmt(m) {
  if (!m) return "   —          ";
  return ("†" + Math.round(m.fail * 100) + "%").padStart(5) + " " + ("v" + m.cleared.toFixed(1)).padStart(5) + " " + String(Math.round(m.rounds)).padStart(2) + "rd " + m.potions.toFixed(1) + "po";
}

/* ---------- Diagnostic d'échelle : PV par vague ---------- */
function hpTable(g, run, heroId, stage, profile, tierId) {
  setup(g, run, heroId, stage, profile);
  unlockTier(g, tierId);
  g.DungeonManager.start(tierId);
  var out = {};
  [1, 7, 12, 15, 16].forEach(function (w) {
    var e = ORIGINAL.buildWaveEnemy ? ORIGINAL.buildWaveEnemy.call(g.DungeonManager, w) : g.DungeonManager.buildWaveEnemy(w);
    out["n" + w] = { hp: e.maxHp, power: e.stats.power, name: e.name };
  });
  out.n5 = out.n7; out.n10 = out.n12; // rangs voisins des vagues élites (5 et 10 sont élites dans le jeu)
  out.e5 = LEGACY ? buildDungeonElite(g, "araignee_marquee", 5) : g.DungeonManager.buildWaveEnemy(5);
  out.e10 = LEGACY ? buildDungeonElite(g, "ronce_ardente", 10) : g.DungeonManager.buildWaveEnemy(10);
  out.hero = { hp: g.game.heroMaxHp, dmg: g.StatsSystem.effectiveTapDamage() };
  g.DungeonManager.forfeit();
  /* Référence MONDE au même stade : ennemi de farm et boss d'aventure du monde du joueur
     (WorldManager.generateEnemy, chaîne WORLD_MULT_BY_WORLD v3.232.0). C'est l'échelle
     que le joueur affronte tous les jours — le donjon doit s'y rapporter. */
  g.WorldManager.worldIndex = stage.world; g.WorldManager.adventureIndex = stage.adv;
  var lo = Infinity, hi = 0;
  for (var i = 0; i < 9; i++) { g.WorldManager.enemyIndex = i; var n = g.WorldManager.generateEnemy().maxHp; lo = Math.min(lo, n); hi = Math.max(hi, n); }
  g.WorldManager.enemyIndex = 9; var wb = g.WorldManager.generateEnemy();
  out.world = { normalLo: lo, normalHi: hi, boss: wb.maxHp, bossName: wb.name };
  return out;
}

/* ---------- Campagne ---------- */
function main() {
  var g = buildSandbox();
  function run(code) { return vm.runInContext(code, g); }
  console.log("Banc Donjon (" + (LEGACY ? "patchs D-0" : "code réel v3.245.0") + ") — " + RUNS + " runs par cellule · élite générique ×" + ELITE_GENERIC.endurance + " PV / ×" + ELITE_GENERIC.power + " puissance · cumul +" + Math.round(CONFIG.markStackBonus * 100) + " %/Marque");
  console.log("Colonnes : † taux d'échec · v vague moyenne atteinte (16 = boss vaincu) · rounds du run. Potions : 3 soins mineurs, cap 2/sortie.\n");

  var CONFIGS = [
    { key: "nu", label: "Run nu (état actuel)", marks: [], opts: {} },
    { key: "elites", label: "+ élites vagues 5/10", marks: [], opts: { elites: true } },
    { key: "traque", label: "Traque seule", marks: ["aff_elite"], opts: { elites: true, traque: true } },
    { key: "colossus", label: "Colosses seule", marks: ["aff_colossus"], opts: { elites: true, colossus: true } },
    { key: "fleau", label: "Fléau seule", marks: ["aff_plague"], opts: { elites: true } },
    { key: "frag", label: "Fragilité seule", marks: ["aff_fragility"], opts: { elites: true } },
    { key: "asc", label: "Ascétisme seule", marks: ["aff_asceticism"], opts: { elites: true } },
    { key: "trio_pression", label: "Colosses+Traque+Fléau", marks: ["aff_colossus", "aff_elite", "aff_plague"], opts: { elites: true, traque: true, colossus: true } },
    { key: "trio_heros", label: "Fragilité+Ascétisme+Fléau", marks: ["aff_fragility", "aff_asceticism", "aff_plague"], opts: { elites: true } }
  ];
  if (QUICK) CONFIGS = CONFIGS.slice(0, 2);

  var report = { runs: RUNS, eliteGeneric: ELITE_GENERIC, config: CONFIG, stages: {} };
  STAGES.forEach(function (stage) {
    var tiers = stage.world === 0 ? [1] : [1, 2];
    tiers.forEach(function (tierId) {
      var tierLabel = "Donjon " + tierId + (tierId === 1 ? " (Tanière)" : "");
      console.log("=== " + stage.label + " · " + tierLabel + " ===");
      var stageOut = report.stages[stage.id + "|t" + tierId] = { heroes: {} };
      HEROES.forEach(function (h) {
        var profile = profileFor(g, run, h.id, stage);
        var rar = SLOTS.map(function (s) { return (profile.kit[s].rarity || "?").charAt(0).toUpperCase(); }).join("");
        var t = hpTable(g, run, h.id, stage, profile, tierId);
        console.log("  " + h.label.padEnd(10) + "kit " + rar + " n" + profile.level + " · héros " + t.hero.hp + " PV, " + t.hero.dmg + " dég/coup"
          + " · référence monde : farm " + t.world.normalLo + "–" + t.world.normalHi + " PV, boss " + t.world.boss + " (" + t.world.bossName + ")");
        console.log("    PV ennemis  v1 " + t.n1.hp + " · v7 " + t.n7.hp + " · v12 " + t.n12.hp + " · v15 " + t.n15.hp + " · boss " + t.n16.hp + " (" + t.n16.name + ")"
          + "   || élite v5 " + t.e5.maxHp + " (×" + (t.e5.maxHp / t.n5.hp).toFixed(1) + ") · élite v10 " + t.e10.maxHp + " (×" + (t.e10.maxHp / t.n10.hp).toFixed(1) + ") · boss/v15 ×" + (t.n16.hp / t.n15.hp).toFixed(1));
        var cells = {};
        CONFIGS.forEach(function (c) {
          var m = measure(g, run, h.id, stage, profile, tierId, c.marks, c.opts);
          cells[c.key] = m;
          var seve = (tierId === 1 && m) ? (1 - m.fail) * (2 + c.marks.length * CONFIG.specialPerMark) : null;
          var mult = 1 + c.marks.length * CONFIG.markStackBonus;
          console.log("    " + c.label.padEnd(28) + fmt(m) + (c.marks.length ? "   ×" + mult.toFixed(2) + (seve != null ? "  Sève/run " + seve.toFixed(1) : "") : (seve != null ? "          Sève/run " + seve.toFixed(1) : "")));
        });
        stageOut.heroes[h.id] = { profile: { level: profile.level, kit: rar, levels: profile.levels }, hp: t, cells: cells };
      });
      console.log("");
    });
  });
  fs.writeFileSync(path.join(ROOT, "sim", "dungeon-bench-out.json"), JSON.stringify(report, null, 2));
  console.log("Sortie détaillée : sim/dungeon-bench-out.json");
}
main();
