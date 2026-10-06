"use strict";
/* tools/sim/mainstat-bench.js — Lot 0 (chantier Équipement multi-affixes, D11).
   Mesure sur le VRAI moteur l'effet d'une stat principale par classe :
   Chevalier → Force, Rôdeur → Célérité, Mage → Volonté.

   AUCUN fichier du jeu n'est modifié : la ligne `game.tapDamage += totalPower
   * FORCE_TAP_COEF` de stats-system.js est réécrite AU CHARGEMENT du bac à
   sable, via un crochet SIM_MAIN_STAT injecté dans le contexte. Si la ligne
   n'est pas trouvée, le banc s'arrête (le patch serait silencieusement nul).

   USAGE : node tools/sim/mainstat-bench.js . [--runs N] */

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var ROOT = require("../chemins.js").jeu(process.argv[2]);
var RUNS = 300;
for (var ai = 3; ai < process.argv.length; ai++) {
  if (process.argv[ai] === "--runs") RUNS = Number(process.argv[ai + 1]) || RUNS;
}

var PATCH_TARGET = "game.tapDamage += totalPower * FORCE_TAP_COEF;";
var PATCH_REPLACE =
  "game.tapDamage += (typeof SIM_MAIN_STAT === 'function' ? SIM_MAIN_STAT(hero, game, totalPower * FORCE_TAP_COEF) : totalPower * FORCE_TAP_COEF);";

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
      if (code.indexOf(PATCH_TARGET) === -1) {
        console.error("Ligne cible introuvable dans stats-system.js — banc invalide.");
        process.exit(1);
      }
      code = code.replace(PATCH_TARGET, PATCH_REPLACE);
      patched = true;
    }
    try { vm.runInContext(code, sandbox, { filename: s }); }
    catch (e) { console.error("ÉCHEC DE CHARGEMENT " + s + " : " + e.message); process.exit(1); }
  });
  if (!patched) { console.error("stats-system.js non chargé."); process.exit(1); }
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

var STAT_UPGRADE = { power: "utrain_power", endurance: "utrain_endurance", celerity: "utrain_celerity", precision: "utrain_precision", will: "utrain_will" };

/* trained : { power: n, celerity: n, ... } — niveaux d'amélioration par stat. */
function duelBoss(g, run, heroId, trained, adventureIndex) {
  run("fullResetState(); game.playerName='Bench'; game.heroId='" + heroId + "';");
  Object.keys(STAT_UPGRADE).forEach(function (st) { g.game.upgrades[STAT_UPGRADE[st]] = trained[st] || 0; });
  run("EquipmentManager.recalcStats(); game.heroHp = game.heroMaxHp;");
  g.game.unlockedTabs.combat = true;
  g.game.activeTab = "combat";
  g.ClassCombatManager.resetForNewHero();
  g.CombatEngine.ensureState();
  g.WorldManager.worldIndex = 0;
  g.WorldManager.adventureIndex = adventureIndex;
  var adv = g.WorldManager.getAdventure();
  g.WorldManager.enemyIndex = Math.max(0, (adv.enemyCount || 1) - 1);
  g.CombatEngine.spawnEnemy();
  var enemy = g.game.enemy;
  if (!enemy || !enemy.isBoss) return null;
  var hpMax = g.game.heroMaxHp;
  var tapDmg = g.StatsSystem.effectiveTapDamage();
  var rounds = 0, guard = 300;
  while (g.game.enemy === enemy && enemy.hp > 0 && g.game.heroHp > 0 && guard-- > 0) {
    if (!playRound(g)) break;
    rounds += 1;
  }
  return { hpLostPct: Math.max(0, 1 - (g.game.heroHp / hpMax)), rounds: rounds, died: g.game.heroHp <= 0, tapDmg: tapDmg };
}

function measure(g, run, heroId, trained, adventureIndex) {
  var hp = 0, rd = 0, deaths = 0, n = 0, td = 0;
  for (var r = 0; r < RUNS; r++) {
    seedRng(9000 + r);
    var res = duelBoss(g, run, heroId, trained, adventureIndex);
    if (!res) continue;
    hp += res.hpLostPct; rd += res.rounds; td = res.tapDmg;
    if (res.died) deaths += 1;
    n += 1;
  }
  if (!n) return null;
  return { hpLostPct: hp / n, rounds: rd / n, deathRate: deaths / n, tapDmg: td };
}

/* ---------- Scénarios ---------- */
var MAIN_STAT = { knight: "power", ranger: "celerity", mage: "will" };

function makeRule(coefs) {
  /* coefs : { knight, ranger, mage } — coefficient par point de stat principale.
     `hero` est l'entrée HEROES_DB ; la stat entraînée est lue dans game.trainedStats. */
  return function (hero, game, defaultValue) {
    if (!hero || !coefs[hero.id]) return defaultValue;
    var st = MAIN_STAT[hero.id];
    var base = Number(hero.stats[st]) || 0;
    var tr = (game.trainedStats && game.trainedStats[st]) || 0;
    return (base + tr) * coefs[hero.id];
  };
}

var SCENARIOS = [
  { id: "BASE", label: "Actuel (Force ×0,2 pour tous)", rule: null },
  { id: "D11-A", label: "Stat principale, coef 0,2 partout", rule: makeRule({ knight: 0.2, ranger: 0.2, mage: 0.2 }) },
  { id: "D11-B", label: "Stat principale, iso-dégâts au niveau 0", rule: makeRule({ knight: 0.2, ranger: 46 * 0.2 / 70, mage: 62 * 0.2 / 76 }) }
];

var HEROES = [
  { id: "knight", label: "Chevalier" },
  { id: "ranger", label: "Rôdeur" },
  { id: "mage", label: "Mage" }
];

/* Paliers d'entraînement : stat principale seule (ce que fera le joueur après D11).
   Sous BASE, « stat principale » = Force pour tous (ce que fait le joueur aujourd'hui). */
var TIERS = [0, 15, 30, 60];

function trainedFor(scenarioId, heroId, n) {
  var t = {};
  var st = scenarioId === "BASE" ? "power" : MAIN_STAT[heroId];
  t[st] = n;
  return t;
}

function fmt(m) {
  if (!m) return "—";
  return String(Math.round(m.tapDmg)).padStart(3) + "dmg "
    + m.rounds.toFixed(1).padStart(5) + "rd "
    + String(Math.round(m.hpLostPct * 100)).padStart(3) + "%PV"
    + (m.deathRate > 0 ? " †" + Math.round(m.deathRate * 100) + "%" : "");
}

function main() {
  var g = buildSandbox();
  function run(code) { return vm.runInContext(code, g); }
  var ZONE = 1; // Cœur · Seigneur orc
  console.log("Banc stat principale — " + RUNS + " runs par cellule, boss Cœur (Seigneur orc), PV pleins.\n");
  var results = {};

  SCENARIOS.forEach(function (sc) {
    g.SIM_MAIN_STAT = sc.rule;
    console.log("=== " + sc.id + " — " + sc.label);
    TIERS.forEach(function (tier) {
      var cells = HEROES.map(function (h) {
        var m = measure(g, run, h.id, trainedFor(sc.id, h.id, tier), ZONE);
        results[sc.id + "|" + tier + "|" + h.id] = m;
        return h.label.charAt(0) + " " + fmt(m);
      });
      console.log(("  stat princ. +" + tier).padEnd(20) + cells.join("   "));
    });
    console.log("");
  });

  /* Dispersion entre classes par palier (écart max/min sur les rounds). */
  console.log("Dispersion entre classes (rounds, max/min) :");
  SCENARIOS.forEach(function (sc) {
    var line = TIERS.map(function (tier) {
      var rds = HEROES.map(function (h) { return results[sc.id + "|" + tier + "|" + h.id].rounds; });
      var mx = Math.max.apply(null, rds), mn = Math.min.apply(null, rds);
      return "+" + tier + ": " + (mx / mn).toFixed(2);
    });
    console.log("  " + sc.id.padEnd(7) + line.join("   "));
  });
  fs.writeFileSync(path.join(__dirname, "mainstat-bench-out.json"), JSON.stringify(results, null, 2));
}

main();
