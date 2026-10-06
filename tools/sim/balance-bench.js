"use strict";
/* tools/sim/balance-bench.js — session d'équilibrage Forêt/Désert (12/09/2026).
   Différence avec world-bench.js : le profil de joueur n'est plus posé à la
   main, il est DÉRIVÉ DE L'ÉCONOMIE RÉELLE. Pour un nombre d'ennemis vaincus
   donné, le banc calcule l'or gagné (récompenses réelles du moteur), en dépense
   60 % en améliorations (coûts réels de UPGRADES, achat glouton) et 40 % en
   équipement d'échoppe, ajoute les drops de boss (1 boss tous les 10 ennemis,
   50 % de chance de butin) et les points de talent gagnés par l'XP de mission.

   Sert à répondre à O9 (Chevalier sous la cible de 40 % de PV perdus) et à
   préparer O11 (Précision/Volonté) sans casser la Forêt.

   --mult  "a,b,c,d,e,f" : autre table WORLD_MULT_BY_WORLD
   --prec N / --will N   : autres PRECISION_CRIT_COEF / WILL_CRIT_MULT_COEF
   Aucun fichier du jeu n'est modifié : patch au chargement du bac à sable.

   USAGE : node tools/sim/balance-bench.js . [--runs N] [--mult ...] [--prec 0.23] */

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var ROOT = require("../chemins.js").jeu(process.argv[2]);
var RUNS = 300;
for (var ai = 3; ai < process.argv.length; ai++) {
  if (process.argv[ai] === "--runs") RUNS = Number(process.argv[ai + 1]) || RUNS;
}

var MULT_ARG = null, PREC_ARG = null, WILL_ARG = null, PVMULT_ARG = null, BOSSPV_ARG = null, QUEST_GOLD_ARG = null;
for (var mi = 3; mi < process.argv.length; mi++) {
  if (process.argv[mi] === "--mult") MULT_ARG = process.argv[mi + 1];
  if (process.argv[mi] === "--prec") PREC_ARG = process.argv[mi + 1];
  if (process.argv[mi] === "--will") WILL_ARG = process.argv[mi + 1];
  if (process.argv[mi] === "--pvmult") PVMULT_ARG = process.argv[mi + 1];
  if (process.argv[mi] === "--bosspv") BOSSPV_ARG = process.argv[mi + 1];
  if (process.argv[mi] === "--quests") QUEST_GOLD_ARG = process.argv[mi + 1];
}
var PVMULT_TARGET = "var ENEMY_PV_MULT = 6;";
var BOSSPV_TARGET = "var BOSS_PV_MULT = 12;";
var PREC_TARGET = "var PRECISION_CRIT_COEF = 0.06;";
var WILL_TARGET = "var WILL_CRIT_MULT_COEF = 0.01;";
var PATCH_TARGET = "var WORLD_MULT_BY_WORLD = [1.264, 0.378, 0.694, 1.507, 2.025, 3.019];"; // table v3.232.0 // table v3.227.0

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
  var scripts = [];
  var re = /<script src="([^"]+)"><\/script>/g, m;
  while ((m = re.exec(html)) !== null) {
    if (!/pwa\.js|boot\.js/.test(m[1])) scripts.push(m[1]);
  }
  var patched = false;
  scripts.forEach(function (s) {
    var code = fs.readFileSync(path.join(ROOT, s), "utf8");
    if (/stats-system\.js$/.test(s)) {
      if (code.indexOf(PREC_TARGET) === -1 || code.indexOf(WILL_TARGET) === -1) { console.error("Coefficients crit introuvables."); process.exit(1); }
      if (PREC_ARG) code = code.replace(PREC_TARGET, "var PRECISION_CRIT_COEF = " + PREC_ARG + ";");
      if (WILL_ARG) code = code.replace(WILL_TARGET, "var WILL_CRIT_MULT_COEF = " + WILL_ARG + ";");
    }
    if (/progression-system\.js$/.test(s)) {
      if (code.indexOf(PATCH_TARGET) === -1) { console.error("Table WORLD_MULT_BY_WORLD introuvable — banc invalide."); process.exit(1); }
      if (MULT_ARG) code = code.replace(PATCH_TARGET, "var WORLD_MULT_BY_WORLD = [" + MULT_ARG + "];");
      if (BOSSPV_ARG) {
        if (code.indexOf(BOSSPV_TARGET) === -1) { console.error("BOSS_PV_MULT introuvable."); process.exit(1); }
        code = code.replace(BOSSPV_TARGET, "var BOSS_PV_MULT = " + BOSSPV_ARG + ";");
      }
      if (PVMULT_ARG) {
        if (code.indexOf(PVMULT_TARGET) === -1) { console.error("ENEMY_PV_MULT introuvable."); process.exit(1); }
        code = code.replace(PVMULT_TARGET, "var ENEMY_PV_MULT = " + PVMULT_ARG + ";");
      }
      patched = true;
    }
    try { vm.runInContext(code, sandbox, { filename: s }); }
    catch (e) { console.error("ÉCHEC DE CHARGEMENT " + s + " : " + e.message); process.exit(1); }
  });
  if (!patched) { console.error("progression-system.js non chargé."); process.exit(1); }
  return sandbox;
}

/* ---------- Politique de combat (identique à forest-bench.js) ---------- */
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
  var maxHp = Number(g.game.heroMaxHp || 0);
  if (maxHp > 0 && (g.game.heroHp / maxHp) < 0.30) {
    if (g.CombatEngine.heroAction("potion", "potion_soin_mineur")) return true;
  }
  var pending = pendingConditionOf(g.game.enemy);
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
  for (var j = 0; j < fallback.length; j++) {
    if (g.CombatEngine.heroAction(fallback[j])) return true;
  }
  return false;
}



var SLOTS = ["weapon", "armor", "helmet", "gloves", "boots", "ring", "amulet"];
var HEROES = [{ id: "knight", label: "Chevalier" }, { id: "ranger", label: "Rôdeur" }, { id: "mage", label: "Mage" }];
var MAIN_STAT = { knight: "power", ranger: "celerity", mage: "will" };
var RARITY_ORDER = ["common", "green", "rare", "epic", "legendary"];
var TARGET_HP_LOST = 0.40; // cible actée : ~40 % de PV perdus sur un boss à PV pleins

/* Étapes mesurées : (monde, aventure, ennemis vaincus cumulés depuis le début). */
var ALL_STAGES = [
  { id: "f1", label: "Forêt · début", world: 0, adv: 0, kills: 25 },
  { id: "f2", label: "Forêt · milieu", world: 0, adv: 0, kills: 70 },
  { id: "f3", label: "Forêt · fin", world: 0, adv: 1, kills: 140 },
  { id: "d1", label: "Désert · début", world: 1, adv: 0, kills: 240 },
  { id: "d2", label: "Désert · milieu", world: 1, adv: 0, kills: 380 },
  { id: "d3", label: "Désert · fin", world: 1, adv: 1, kills: 550 }
];
/* --stages f3,d1 : ne mesurer que ces étapes (défaut : toutes). */
var STAGES_ARG = null;
for (var si = 3; si < process.argv.length; si++) if (process.argv[si] === "--stages") STAGES_ARG = process.argv[si + 1];
var STAGES = STAGES_ARG
  ? ALL_STAGES.filter(function (st) { return STAGES_ARG.split(",").indexOf(st.id) !== -1; })
  : ALL_STAGES;

/* --- Économie : or gagné pour N ennemis vaincus, aux récompenses réelles. --- */
function goldEarned(g, run, stage) {
  var total = 0, bosses = 0;
  var perWorld = Math.max(1, Math.floor(stage.kills / (stage.world + 1)));
  for (var w = 0; w <= stage.world; w++) {
    g.WorldManager.worldIndex = w;
    g.WorldManager.adventureIndex = 0;
    var n = (w === stage.world) ? (stage.kills - perWorld * w) : perWorld;
    for (var i = 0; i < n; i++) {
      var isBoss = (i % 10) === 9;
      g.WorldManager.enemyIndex = isBoss ? 9 : (i % 9);
      var e = g.WorldManager.generateEnemy();
      total += Number(e.goldReward || 0);
      if (isBoss) bosses += 1;
    }
  }
  /* Revenu hors combat. Les quêtes ne sont pas encore jouables (Seb, 12/09/2026) :
     par défaut zéro. --quests N rallume un budget de quêtes pour préparer l'après. */
  var questGold = QUEST_GOLD_ARG ? Number(QUEST_GOLD_ARG) * Math.min(1, stage.kills / 320) : 0;
  total += questGold;
  return { gold: total, bosses: bosses, questGold: questGold };
}

/* Achat glouton d'améliorations : stat principale d'abord, Endurance ensuite,
   au coût réel (baseCost × costMult^niveau). Renvoie les niveaux atteints. */
function buyUpgrades(g, heroId, budget) {
  var order = [MAIN_STAT[heroId], "endurance", "precision"];
  var levels = { power: 0, endurance: 0, celerity: 0, precision: 0, will: 0 };
  var byId = {};
  g.UPGRADES.forEach(function (u) { byId[u.id] = u; });
  var guard = 4000;
  while (guard-- > 0) {
    var bought = false;
    for (var i = 0; i < order.length; i++) {
      var st = order[i];
      var up = byId["utrain_" + st];
      if (!up || levels[st] >= up.maxLevel) continue;
      var cost = Math.floor(up.baseCost * Math.pow(up.costMult, levels[st]));
      /* Pondération : 60 % du budget sur la stat principale, 30 % Endurance, 10 % Précision. */
      var share = (i === 0) ? 0.6 : (i === 1 ? 0.3 : 0.1);
      if (cost <= budget * share) {
        budget -= cost;
        levels[st] += 1;
        bought = true;
      }
    }
    if (!bought) break;
  }
  return levels;
}

/* Équipement : drops de boss (50 %) + achats d'échoppe avec le budget restant. */
function buildKit(g, stage, shopBudget) {
  var kit = {};
  var eco = { world: stage.world };
  /* Drops : ~0,5 objet par boss, réparti sur les 7 emplacements. */
  var drops = Math.floor(stage.kills / 10 * 0.5);
  for (var d = 0; d < drops; d++) {
    var slot = SLOTS[randIntLocal(0, 6)];
    var it = g.generateEquipmentItem(slot, pickRarity(g, stage.world), stage.world);
    if (!kit[slot] || RARITY_ORDER.indexOf(it.rarity) > RARITY_ORDER.indexOf(kit[slot].rarity)) kit[slot] = it;
  }
  /* Échoppe : on remplit les trous avec ce que le budget permet, du meilleur au pire. */
  var prices = g.EQUIP_SHOP_PRICES;
  var worldMult = g.EQUIP_SHOP_WORLD_PRICE_MULT[stage.world] || 1;
  SLOTS.forEach(function (slot) {
    for (var r = RARITY_ORDER.length - 1; r >= 0; r--) {
      var rar = RARITY_ORDER[r];
      if (!allowedAt(g, stage.world, rar)) continue;
      var price = (prices[rar] || 0) * worldMult;
      var have = kit[slot];
      if (have && RARITY_ORDER.indexOf(have.rarity) >= r) break;
      if (price <= shopBudget) {
        shopBudget -= price;
        kit[slot] = g.generateEquipmentItem(slot, rar, stage.world);
        break;
      }
    }
  });
  SLOTS.forEach(function (slot) {
    if (!kit[slot]) kit[slot] = g.generateEquipmentItem(slot, "common", stage.world);
  });
  return kit;
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

/* Niveau de héros : 10 XP par mission réussie, une mission ~ 10 ennemis. */
function heroLevelFor(g, kills) {
  var xp = Math.floor(kills / 10) * 10, level = 1, need = 20;
  while (xp >= need && level < 60) {
    xp -= need; level += 1;
    need = Math.floor(20 * Math.pow(1.35, level - 1) + (level - 1) * 10);
  }
  return level;
}

/* Talents : 1 point par niveau de héros. Répartition plausible d'un joueur qui
   veut survivre : Cœur vaillant → Peau de pierre → Vitalité tenace côté défense,
   Lames affûtées → Instinct de guerre → Frappe précise côté dégâts, en alternance. */
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
  for (var i = 0; i < points && i < TALENT_ORDER.length; i++) {
    out[TALENT_ORDER[i]] = (out[TALENT_ORDER[i]] || 0) + 1;
  }
  return out;
}

function setup(g, run, heroId, stage, profile) {
  run("fullResetState(); game.playerName='Bench'; game.heroId='" + heroId + "';");
  Object.keys(profile.levels).forEach(function (st) { g.game.upgrades["utrain_" + st] = profile.levels[st]; });
  g.game.heroLevel = profile.level;
  g.game.talents = spendTalents(Math.max(0, profile.level - 1)); // 1 point par niveau
  /* Forge : niveau plausible du bâtiment au stade courant (0 en Forêt, 1 au Désert),
     appliqué à toutes les pièces — getForgedValue multiplie la stat de base. */
  g.VillageBuildingManager.ensure();
  g.game.village.buildings.forge = { level: profile.forgeLevel };
  if (profile.forgeLevel > 0 && g.ForgeManager) {
    g.ForgeManager.ensure();
    SLOTS.forEach(function (sl) { g.game.forge.levels[sl] = profile.forgeLevel; });
  }
  /* Potions : 3 soins mineurs, ce qu'un joueur emporte raisonnablement. */
  g.game.inventory = [{ uid: "po1", type: "potion", potionId: "potion_soin_mineur", quantity: 3 }];
  g.game.worldsEverReached = {}; for (var w = 0; w <= stage.world; w++) g.game.worldsEverReached[w] = true;
  g.WorldManager.worldIndex = stage.world;
  SLOTS.forEach(function (s) { g.game.equipped[s] = profile.kit[s]; });
  run("EquipmentManager.recalcStats(); game.heroHp = game.heroMaxHp;");
  g.game.unlockedTabs.combat = true; g.game.activeTab = "combat";
  g.ClassCombatManager.resetForNewHero(); g.CombatEngine.ensureState();
}

function fight(g, run, heroId, stage, profile, boss) {
  setup(g, run, heroId, stage, profile);
  g.WorldManager.adventureIndex = stage.adv;
  var a = g.WorldManager.getAdventure();
  g.WorldManager.enemyIndex = boss ? Math.max(0, (a.enemyCount || 1) - 1) : 0;
  g.CombatEngine.spawnEnemy();
  var e = g.game.enemy; if (!e || (!!e.isBoss) !== boss) return null;
  var hpMax = g.game.heroMaxHp, rounds = 0, guard = 300;
  while (g.game.enemy === e && e.hp > 0 && g.game.heroHp > 0 && guard-- > 0) { if (!playRound(g)) break; rounds++; }
  return { rounds: rounds, hpLost: Math.max(0, 1 - g.game.heroHp / hpMax), died: g.game.heroHp <= 0 };
}
function measure(g, run, heroId, stage, profile, boss) {
  var rd = 0, hl = 0, dd = 0, n = 0;
  for (var r = 0; r < RUNS; r++) {
    seedRng(7000 + r);
    var res = fight(g, run, heroId, stage, profile, boss);
    if (!res) continue;
    rd += res.rounds; hl += res.hpLost; if (res.died) dd++; n++;
  }
  return n ? { rounds: rd / n, hpLost: hl / n, death: dd / n } : null;
}
/* Diagnostic : PV du boss et dégâts par round qu'il inflige, face aux PV du héros. */
function diagnose(g, run, heroId, stage, profile) {
  setup(g, run, heroId, stage, profile);
  g.WorldManager.adventureIndex = stage.adv;
  var a = g.WorldManager.getAdventure();
  g.WorldManager.enemyIndex = Math.max(0, (a.enemyCount || 1) - 1);
  g.CombatEngine.spawnEnemy();
  var e = g.game.enemy;
  var heroHp = g.game.heroMaxHp;
  var heroDmg = g.StatsSystem.effectiveTapDamage();
  var hpBefore = g.game.heroHp;
  g.CombatEngine.enemyStrike(1, true);
  var taken = hpBefore - g.game.heroHp;
  return { enemyHp: e ? e.maxHp : 0, heroHp: heroHp, heroDmg: heroDmg, taken: taken,
    roundsToKill: e ? Math.ceil(e.maxHp / Math.max(1, heroDmg)) : 0,
    roundsToDie: Math.ceil(heroHp / Math.max(1, taken)) };
}

function fmt(m) {
  if (!m) return "—";
  return String(Math.round(m.hpLost * 100)).padStart(3) + "% "
    + m.rounds.toFixed(1).padStart(4) + "rd"
    + (m.death > 0 ? " †" + Math.round(m.death * 100) : "");
}

function main() {
  var g = buildSandbox();
  function run(code) { return vm.runInContext(code, g); }
  console.log("Banc équilibrage — " + RUNS + " runs par cellule"
    + (MULT_ARG ? ", WORLD_MULT=[" + MULT_ARG + "]" : "")
    + (PREC_ARG ? ", PRECISION_CRIT_COEF=" + PREC_ARG : "")
    + (WILL_ARG ? ", WILL_CRIT_MULT_COEF=" + WILL_ARG : "")
    + (PVMULT_ARG ? ", ENEMY_PV_MULT=" + PVMULT_ARG : "")
    + (BOSSPV_ARG ? ", BOSS_PV_MULT=" + BOSSPV_ARG : "") + ".");
  console.log("Profil dérivé de l'économie réelle. Cible : ~" + Math.round(TARGET_HP_LOST * 100) + " % de PV perdus sur le boss.\n");
  var out = {};
  STAGES.forEach(function (stage) {
    run("fullResetState(); game.heroId='knight';");
    var eco = goldEarned(g, run, stage);
    console.log("=== " + stage.label + " — " + stage.kills + " ennemis vaincus, "
      + Math.round(eco.gold) + " or (dont " + Math.round(eco.questGold) + " de quêtes), " + eco.bosses + " boss");
    HEROES.forEach(function (h) {
      seedRng(300 + stage.kills);
      var levels = buyUpgrades(g, h.id, eco.gold * 0.6);
      var kit = buildKit(g, stage, eco.gold * 0.4);
      var profile = { levels: levels, kit: kit, level: heroLevelFor(g, stage.kills),
        forgeLevel: stage.world >= 1 ? 1 : 0 };
      var normal = measure(g, run, h.id, stage, profile, false);
      var boss = measure(g, run, h.id, stage, profile, true);
      out[stage.label + "|" + h.id] = { normal: normal, boss: boss, levels: levels };
      var rarities = SLOTS.map(function (s) { return (kit[s].rarity || "?").charAt(0).toUpperCase(); }).join("");
      var dg = diagnose(g, run, h.id, stage, profile);
      out[stage.label + "|" + h.id].diag = dg;
      console.log("  " + h.label.padEnd(10)
        + ("entr. " + MAIN_STAT[h.id].slice(0, 4) + "+" + levels[MAIN_STAT[h.id]] + " end+" + levels.endurance).padEnd(22)
        + ("kit " + rarities + " n" + profile.level).padEnd(17)
        + "normal " + fmt(normal) + "   boss " + fmt(boss)
        + (boss ? "   écart " + (boss.hpLost > TARGET_HP_LOST ? "+" : "") + Math.round((boss.hpLost - TARGET_HP_LOST) * 100) : ""));
      console.log("".padEnd(12) + "boss " + dg.enemyHp + " PV / héros " + dg.heroHp + " PV · coup encaissé " + dg.taken
        + " · il faut " + dg.roundsToKill + " rounds pour le tuer, " + dg.roundsToDie + " pour mourir");
    });
    console.log("");
  });
  fs.writeFileSync(path.join(__dirname, "balance-bench-out.json"), JSON.stringify(out, null, 2));
}
main();
