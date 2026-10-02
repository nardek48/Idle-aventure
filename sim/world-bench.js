"use strict";
/* sim/world-bench.js — Lot 3 (chantier Équipement multi-affixes, D3).
   Mesure par MONDE, sur le vrai moteur (v3.226.0, affixes en place) :
   pour chaque classe, un kit réaliste du monde (meilleur de 5 drops par
   emplacement, raretés du monde), avec ses affixes puis le MÊME kit sans,
   contre un ennemi normal et le boss. L'écart dit ce que les affixes
   apportent, donc ce que les monstres doivent reprendre.

   --mult "a,b,c,d,e,f" : essaie une autre table WORLD_MULT_BY_WORLD (patch
   AU CHARGEMENT du bac à sable, aucun fichier du jeu modifié).

   USAGE : node sim/world-bench.js . [--runs N] [--mult "1.264,1.637,..."] */

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var ROOT = process.argv[2] || ".";
var RUNS = 300;
for (var ai = 3; ai < process.argv.length; ai++) {
  if (process.argv[ai] === "--runs") RUNS = Number(process.argv[ai + 1]) || RUNS;
}

var MULT_ARG = null;
for (var mi = 3; mi < process.argv.length; mi++) if (process.argv[mi] === "--mult") MULT_ARG = process.argv[mi + 1];
var PATCH_TARGET = "var WORLD_MULT_BY_WORLD = [1.264, 0.378, 0.694, 1.507, 2.025, 3.019];"; // table v3.232.0

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
    if (/progression-system\.js$/.test(s)) {
      if (code.indexOf(PATCH_TARGET) === -1) { console.error("Table WORLD_MULT_BY_WORLD introuvable — banc invalide."); process.exit(1); }
      if (MULT_ARG) code = code.replace(PATCH_TARGET, "var WORLD_MULT_BY_WORLD = [" + MULT_ARG + "];");
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
/* Entraînement plausible par monde (niveaux sur stat principale ; Endurance = moitié). */
var TRAINED_BY_WORLD = [15, 40, 65, 90, 115, 140];
var RARITY_ORDER = ["common", "green", "rare", "epic", "legendary"];

/* Meilleur de 5 drops réels du monde (LootSystem.rollDrop restreint aux raretés du monde). */
function makeKit(g) {
  var kit = {};
  SLOTS.forEach(function (slot) {
    var best = null;
    for (var i = 0; i < 5; i++) {
      var it = g.LootSystem.rollDropAtRarity ? null : null;
      var rar = pickRarity(g);
      it = g.generateEquipmentItem(slot, rar, g.WorldManager.worldIndex);
      if (!best || RARITY_ORDER.indexOf(it.rarity) > RARITY_ORDER.indexOf(best.rarity)
        || (it.rarity === best.rarity && it.value > best.value)) best = it;
    }
    kit[slot] = best;
  });
  return kit;
}
function pickRarity(g) {
  var allowed = g.getAllowedRarities();
  var total = 0; allowed.forEach(function (r) { total += g.RARITY_DROP_RATES[r]; });
  var x = nextRandom() * total, acc = 0;
  for (var i = 0; i < allowed.length; i++) { acc += g.RARITY_DROP_RATES[allowed[i]]; if (x < acc) return allowed[i]; }
  return allowed[allowed.length - 1];
}
function strip(kit) {
  var out = {};
  SLOTS.forEach(function (s) { out[s] = Object.assign({}, kit[s], { affixes: [] }); });
  return out;
}

function setup(g, run, heroId, world, kit) {
  run("fullResetState(); game.playerName='Bench'; game.heroId='" + heroId + "';");
  g.game.upgrades["utrain_" + MAIN_STAT[heroId]] = TRAINED_BY_WORLD[world];
  g.game.upgrades.utrain_endurance = Math.floor(TRAINED_BY_WORLD[world] / 2);
  g.game.worldsEverReached = {}; for (var w = 0; w <= world; w++) g.game.worldsEverReached[w] = true;
  g.WorldManager.worldIndex = world;
  if (kit) SLOTS.forEach(function (s) { g.game.equipped[s] = kit[s]; });
  run("EquipmentManager.recalcStats(); game.heroHp = game.heroMaxHp;");
  g.game.unlockedTabs.combat = true; g.game.activeTab = "combat";
  g.ClassCombatManager.resetForNewHero(); g.CombatEngine.ensureState();
}
function fight(g, run, heroId, world, kit, adv, boss) {
  setup(g, run, heroId, world, kit);
  g.WorldManager.adventureIndex = adv;
  var a = g.WorldManager.getAdventure();
  g.WorldManager.enemyIndex = boss ? Math.max(0, (a.enemyCount || 1) - 1) : 0;
  g.CombatEngine.spawnEnemy();
  var e = g.game.enemy; if (!e || (!!e.isBoss) !== boss) return null;
  var hpMax = g.game.heroMaxHp, rounds = 0, guard = 300;
  while (g.game.enemy === e && e.hp > 0 && g.game.heroHp > 0 && guard-- > 0) { if (!playRound(g)) break; rounds++; }
  return { rounds: rounds, hpLost: Math.max(0, 1 - g.game.heroHp / hpMax), died: g.game.heroHp <= 0 };
}
function measure(g, run, heroId, world, kit, adv, boss) {
  var rd = 0, hl = 0, dd = 0, n = 0;
  for (var r = 0; r < RUNS; r++) {
    seedRng(4000 + r);
    var res = fight(g, run, heroId, world, kit, adv, boss);
    if (!res) continue;
    rd += res.rounds; hl += res.hpLost; if (res.died) dd++; n++;
  }
  return n ? { rounds: rd / n, hpLost: hl / n, death: dd / n } : null;
}
function fmt(m) { return m ? m.rounds.toFixed(1) + "rd " + Math.round(m.hpLost * 100) + "%" + (m.death > 0 ? " †" + Math.round(m.death * 100) : "") : "—"; }

function main() {
  var g = buildSandbox();
  function run(code) { return vm.runInContext(code, g); }
  console.log("Banc monde — " + RUNS + " runs par cellule" + (MULT_ARG ? ", WORLD_MULT = [" + MULT_ARG + "]" : ", WORLD_MULT du jeu") + ".");
  console.log("Kit = meilleur de 5 drops du monde par emplacement ; « sans » = même kit, affixes retirés.\n");
  var out = {};
  for (var world = 0; world < 6; world++) {
    console.log("=== Monde " + world + " (" + g.WORLDS[world].name + ") · entr. +" + TRAINED_BY_WORLD[world]);
    HEROES.forEach(function (h) {
      /* Kit médian : 15 kits, classé par dégâts effectifs avec affixes. */
      seedRng(100 + world); setup(g, run, h.id, world, null);
      var kits = []; for (var k = 0; k < 15; k++) kits.push(makeKit(g));
      var ranked = kits.map(function (kit) { setup(g, run, h.id, world, kit); return { kit: kit, d: g.StatsSystem.effectiveTapDamage() }; })
        .sort(function (a, b) { return a.d - b.d; });
      var med = ranked[7].kit;
      var cells = [];
      [["normal", 0, false], ["boss", 1, true]].forEach(function (cfg) {
        var sans = measure(g, run, h.id, world, strip(med), cfg[1], cfg[2]);
        var avec = measure(g, run, h.id, world, med, cfg[1], cfg[2]);
        out[world + "|" + h.id + "|" + cfg[0]] = { sans: sans, avec: avec };
        cells.push(cfg[0] + " sans " + fmt(sans) + " → avec " + fmt(avec)
          + (sans && avec && avec.rounds > 0 ? " (rd ×" + (avec.rounds / sans.rounds).toFixed(2) + ")" : ""));
      });
      console.log("  " + h.label.padEnd(10) + cells.join("   |   "));
    });
  }
  fs.writeFileSync(path.join(ROOT, "sim", "world-bench-out" + (MULT_ARG ? "-alt" : "") + ".json"), JSON.stringify(out, null, 2));
}
main();
