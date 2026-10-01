"use strict";
/* sim/affix-bench.js — Lot 0 (chantier Équipement multi-affixes).
   Partie A : distribution du générateur d'affixes (bornes, unicité, comptes).
   Partie B : puissance équipée AVEC et SANS affixes, sur le vrai moteur, pour
              4 profils de joueur, puis duel contre le boss du monde.

   AUCUN fichier du jeu n'est modifié : la boucle d'équipement de
   stats-system.js est complétée AU CHARGEMENT du bac à sable pour lire
   item.affixes (crochet SIM_APPLY_AFFIXES). Les tables d'affixes ci-dessous
   sont celles du document de conception v1.1, défense recalée sur l'échelle
   d'armure v3.219.0.

   USAGE : node sim/affix-bench.js . [--runs N] [--kits N] [--v2] [--lite] */

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var ROOT = process.argv[2] || ".";
var RUNS = 200, KITS = 400;
for (var ai = 3; ai < process.argv.length; ai++) {
  if (process.argv[ai] === "--runs") RUNS = Number(process.argv[ai + 1]) || RUNS;
  if (process.argv[ai] === "--kits") KITS = Number(process.argv[ai + 1]) || KITS;
}

/* ---------- Tables d'affixes (doc v1.1, § 3.3 / 4 / 5) ---------- */
/* --v2 : variante « primaire dès l'Inhabituel » (voir rapport Lot 0). */
var V2 = process.argv.indexOf("--v2") !== -1;
var AFFIX_COUNT_BY_RARITY = V2 ? {
  common: { primary: 0, secondary: 0 },
  green: { primary: 1, secondary: 0 },
  rare: { primary: 1, secondary: 1 },
  epic: { primary: 2, secondary: 1 },
  legendary: { primary: 2, secondary: 2 }
} : {
  common: { primary: 0, secondary: 0 },
  green: { primary: 0, secondary: 1 },
  rare: { primary: 1, secondary: 1 },
  epic: { primary: 1, secondary: 2 },
  legendary: { primary: 2, secondary: 2 }
};
/* --lite : tapDmg limité à gants/anneau et fourchette réduite à ~30 % de
   l'arme (mesure Lot 0 : avec tapDmg sur 5 emplacements, la somme des affixes
   plats dépassait la valeur de l'arme elle-même). */
var LITE = process.argv.indexOf("--lite") !== -1;
var AFFIX_POOLS = {
  weapon: { primary: ["tapMult", "critChance", "critMult"], secondary: ["goldMult", "xpMult", "dropChance"] },
  armor: { primary: ["maxHpPct", "autoDps", LITE ? "critChance" : "tapDmg"], secondary: ["goldMult", "xpMult", "dropChance"] },
  helmet: { primary: ["critChance", "maxHpPct", LITE ? "tapMult" : "tapDmg"], secondary: ["goldMult", "xpMult", "dropChance"] },
  gloves: { primary: ["tapDmg", "critChance", "autoDps"], secondary: ["goldMult", "xpMult", "dropChance"] },
  boots: { primary: ["maxHpPct", "defense", LITE ? "critMult" : "tapDmg"], secondary: ["goldMult", "xpMult", "dropChance"] },
  ring: { primary: ["tapDmg", "critChance", "tapMult"], secondary: ["xpMult", "dropChance"] },
  amulet: { primary: ["critMult", "tapMult", "maxHpPct"], secondary: ["goldMult", "xpMult", "dropChance"] }
};
/* [min, max] par rareté ; flat = suit l'échelle de monde (EQUIP_WORLD_SCALE). */
var AFFIX_RANGES = {
  tapDmg: LITE
    ? { flat: true, decimals: 0, green: [6, 10], rare: [9, 15], epic: [14, 22], legendary: [18, 28] }
    : { flat: true, decimals: 0, green: [8, 14], rare: [12, 20], epic: [18, 30], legendary: [24, 38] },
  tapMult: { decimals: 2, green: [0.08, 0.15], rare: [0.15, 0.25], epic: [0.25, 0.40], legendary: [0.40, 0.65] },
  critChance: { decimals: 0, green: [1, 2], rare: [2, 4], epic: [4, 6], legendary: [6, 9] },
  critMult: { decimals: 2, green: [0.08, 0.15], rare: [0.15, 0.25], epic: [0.25, 0.40], legendary: [0.40, 0.60] },
  defense: { decimals: 3, green: [0.015, 0.025], rare: [0.022, 0.036], epic: [0.034, 0.047], legendary: [0.045, 0.06] },
  autoDps: { flat: true, decimals: 0, green: [2, 3], rare: [3, 5], epic: [4, 7], legendary: [5, 9] },
  maxHpPct: { decimals: 2, green: [0.03, 0.06], rare: [0.06, 0.10], epic: [0.10, 0.15], legendary: [0.15, 0.22] },
  goldMult: { decimals: 2, green: [0.03, 0.06], rare: [0.05, 0.10], epic: [0.08, 0.15], legendary: [0.12, 0.20] },
  xpMult: { decimals: 2, green: [0.03, 0.06], rare: [0.05, 0.10], epic: [0.08, 0.15], legendary: [0.12, 0.20] },
  dropChance: { decimals: 0, green: [2, 4], rare: [4, 7], epic: [6, 10], legendary: [8, 14] }
};
var WORLD_SCALE = [1, 1.4, 2.2, 4, 10, 18];

var rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function nextRandom() {
  rngState = (rngState + 0x6D2B79F5) >>> 0;
  var t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function randInt(a, b) { return a + Math.floor(nextRandom() * (b - a + 1)); }
function randFloat(a, b) { return a + nextRandom() * (b - a); }

function rollAffix(stat, rarity, worldIndex) {
  var r = AFFIX_RANGES[stat];
  var range = r[rarity];
  var raw = randFloat(range[0], range[1]);
  if (r.flat) raw = raw * WORLD_SCALE[Math.min(worldIndex, WORLD_SCALE.length - 1)];
  var f = Math.pow(10, r.decimals);
  return Math.round(raw * f) / f;
}
function rollAffixes(slot, baseStat, rarity, worldIndex) {
  var count = AFFIX_COUNT_BY_RARITY[rarity];
  var out = [];
  ["primary", "secondary"].forEach(function (tier) {
    var pool = AFFIX_POOLS[slot][tier].filter(function (s) { return s !== baseStat; });
    var n = count[tier];
    for (var i = 0; i < n && pool.length; i++) {
      var idx = randInt(0, pool.length - 1);
      var stat = pool.splice(idx, 1)[0];
      out.push({ stat: stat, value: rollAffix(stat, rarity, worldIndex), tier: tier === "primary" ? "P" : "S" });
    }
  });
  return out;
}

/* ---------- Partie A : distribution ---------- */
function partA() {
  console.log("A. Générateur d'affixes — 10 000 tirages par couple emplacement/rareté\n");
  var slots = Object.keys(AFFIX_POOLS);
  var baseStat = { weapon: "tapDmg", armor: "defense", helmet: "critMult", gloves: "tapMult", boots: "autoDps", ring: "goldMult", amulet: "critChance" };
  var problems = 0;
  var freq = {};
  slots.forEach(function (slot) {
    ["green", "rare", "epic", "legendary"].forEach(function (rar) {
      seedRng(1234);
      var cnt = AFFIX_COUNT_BY_RARITY[rar];
      for (var i = 0; i < 10000; i++) {
        var af = rollAffixes(slot, baseStat[slot], rar, 0);
        if (af.length !== cnt.primary + cnt.secondary) problems++;
        var seen = {};
        af.forEach(function (a) {
          if (seen[a.stat] || a.stat === baseStat[slot]) problems++;
          seen[a.stat] = 1;
          var rg = AFFIX_RANGES[a.stat][rar];
          if (a.value < rg[0] - 1e-9 || a.value > rg[1] + 1e-9) problems++;
          freq[a.stat] = (freq[a.stat] || 0) + 1;
        });
      }
    });
  });
  console.log("  Anomalies (doublon / stat de base dupliquée / hors bornes / mauvais compte) : " + problems);
  var tot = 0; Object.keys(freq).forEach(function (k) { tot += freq[k]; });
  console.log("  Fréquence globale par stat (tous emplacements, raretés Inhab.→Légend. à poids égal) :");
  Object.keys(freq).sort(function (a, b) { return freq[b] - freq[a]; }).forEach(function (k) {
    console.log("    " + k.padEnd(11) + (100 * freq[k] / tot).toFixed(1) + " %");
  });
  console.log("");
  return problems === 0;
}

/* ---------- Bac à sable ---------- */
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
var PATCH_TARGET = "else if (item.stat === \"defense\") game.equipDefensePct += value;\n    });";
var PATCH_REPLACE =
  "else if (item.stat === \"defense\") game.equipDefensePct += value;\n" +
  "      if (typeof SIM_APPLY_AFFIXES === 'function') SIM_APPLY_AFFIXES(item, game);\n    });";

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
  while ((m = re.exec(html)) !== null) if (!/pwa\.js|boot\.js/.test(m[1])) scripts.push(m[1]);
  var patched = false;
  scripts.forEach(function (s) {
    var code = fs.readFileSync(path.join(ROOT, s), "utf8");
    if (/stats-system\.js$/.test(s)) {
      if (code.indexOf(PATCH_TARGET) === -1) { console.error("Cible de patch introuvable dans stats-system.js."); process.exit(1); }
      code = code.replace(PATCH_TARGET, PATCH_REPLACE);
      patched = true;
    }
    try { vm.runInContext(code, sandbox, { filename: s }); }
    catch (e) { console.error("ÉCHEC DE CHARGEMENT " + s + " : " + e.message); process.exit(1); }
  });
  if (!patched) process.exit(1);

  /* Crochet : applique les affixes d'une pièce. maxHpPct est approximé ici par
     un multiplicateur direct sur heroMaxHp (dans le vrai code : accumulateur
     appliqué avant le clamp final, même résultat). xpMult/dropChance : ignorés
     en combat. */
  sandbox.SIM_APPLY_AFFIXES = function (item, game) {
    if (!sandbox.SIM_AFFIXES_ON || !item.affixes) return;
    item.affixes.forEach(function (a) {
      var v = a.value;
      if (a.stat === "tapDmg") game.equipFlatTapBonus += v;
      else if (a.stat === "tapMult") game.tapMult += v;
      else if (a.stat === "goldMult") game.goldMult += v;
      else if (a.stat === "critChance") game.critChance += v;
      else if (a.stat === "critMult") game.critMult += v;
      else if (a.stat === "autoDps") game.bonusCelerity += v;
      else if (a.stat === "defense") game.equipDefensePct += v;
      else if (a.stat === "maxHpPct") game.heroMaxHp = Math.floor(game.heroMaxHp * (1 + v));
    });
  };
  return sandbox;
}

/* ---------- Combat (identique à forest-bench.js) ---------- */
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
  for (var j = 0; j < fallback.length; j++) if (g.CombatEngine.heroAction(fallback[j])) return true;
  return false;
}

/* ---------- Partie B : profils ---------- */
var PROFILES = [
  { id: "finForet", label: "Fin Forêt", world: 0, adv: 1, trained: 20, rarities: { common: 1 } },
  { id: "miDesert", label: "Mi-Désert", world: 1, adv: 0, trained: 40, rarities: { common: 0.4, green: 0.6 } },
  { id: "finDesert", label: "Fin Désert", world: 1, adv: 1, trained: 60, rarities: { green: 1 } },
  { id: "ruines", label: "Ruines", world: 2, adv: 1, trained: 80, rarities: { green: 0.5, rare: 0.5 } }
];
var SLOTS = ["weapon", "armor", "helmet", "gloves", "boots", "ring", "amulet"];

function pickRarity(mix) {
  var r = nextRandom(), acc = 0;
  var keys = Object.keys(mix);
  for (var i = 0; i < keys.length; i++) { acc += mix[keys[i]]; if (r < acc) return keys[i]; }
  return keys[keys.length - 1];
}
function makeKit(g, profile) {
  var kit = {};
  SLOTS.forEach(function (slot) {
    var rar = pickRarity(profile.rarities);
    var item = g.generateEquipmentItem(slot, rar, profile.world);
    item.affixes = rollAffixes(slot, item.stat, rar, profile.world);
    kit[slot] = item;
  });
  return kit;
}
function setup(g, run, heroId, profile, kit, affixesOn) {
  run("fullResetState(); game.playerName='Bench'; game.heroId='" + heroId + "';");
  g.game.upgrades.utrain_power = profile.trained;
  g.game.upgrades.utrain_endurance = Math.floor(profile.trained / 2);
  SLOTS.forEach(function (s) { g.game.equipped[s] = kit[s]; });
  g.SIM_AFFIXES_ON = affixesOn;
  run("EquipmentManager.recalcStats(); game.heroHp = game.heroMaxHp;");
  return {
    dmg: g.StatsSystem.effectiveTapDamage(), hp: g.game.heroMaxHp,
    crit: g.game.critChance, critMult: g.game.critMult, def: g.game.heroDefensePct, cel: g.CombatEngine.getTotalCelerity()
  };
}
function duel(g, run, heroId, profile, kit, affixesOn) {
  var st = setup(g, run, heroId, profile, kit, affixesOn);
  g.game.unlockedTabs.combat = true; g.game.activeTab = "combat";
  g.ClassCombatManager.resetForNewHero(); g.CombatEngine.ensureState();
  g.WorldManager.worldIndex = profile.world; g.WorldManager.adventureIndex = profile.adv;
  var adv = g.WorldManager.getAdventure();
  g.WorldManager.enemyIndex = Math.max(0, (adv.enemyCount || 1) - 1);
  g.CombatEngine.spawnEnemy();
  var enemy = g.game.enemy;
  if (!enemy || !enemy.isBoss) return null;
  var hpMax = g.game.heroMaxHp, rounds = 0, guard = 300;
  while (g.game.enemy === enemy && enemy.hp > 0 && g.game.heroHp > 0 && guard-- > 0) { if (!playRound(g)) break; rounds++; }
  return { rounds: rounds, hpLost: Math.max(0, 1 - g.game.heroHp / hpMax), died: g.game.heroHp <= 0, st: st };
}
function pct(arr, p) { var s = arr.slice().sort(function (a, b) { return a - b; }); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; }
function mean(arr) { var t = 0; arr.forEach(function (x) { t += x; }); return t / arr.length; }

function partB() {
  var g = buildSandbox();
  function run(code) { return vm.runInContext(code, g); }
  console.log("B. Puissance équipée — " + KITS + " kits par profil, héros Chevalier pour les stats, duel boss du monde × " + RUNS + " runs\n");
  var HERO = ["knight", "ranger", "mage"];
  var out = {};
  PROFILES.forEach(function (p) {
    seedRng(777);
    var kits = [];
    for (var k = 0; k < KITS; k++) kits.push(makeKit(g, p));
    /* Stats statiques (Chevalier) avec et sans affixes. */
    var rows = { off: [], on: [] };
    kits.forEach(function (kit) {
      rows.off.push(setup(g, run, "knight", p, kit, false));
      rows.on.push(setup(g, run, "knight", p, kit, true));
    });
    function col(key) {
      var off = rows.off.map(function (r) { return r[key]; }), on = rows.on.map(function (r) { return r[key]; });
      return { offM: mean(off), onM: mean(on), onP90: pct(on, 0.9) };
    }
    var dmg = col("dmg"), hp = col("hp"), cr = col("crit"), df = col("def"), cm = col("critMult");
    console.log("=== " + p.label + " (monde " + p.world + ", entr. Force +" + p.trained + ", mix " + JSON.stringify(p.rarities) + ")");
    console.log("  Chevalier statique      sans affixes   avec (moy.)   avec (P90)   ratio moy.");
    function line(lbl, c, fmtf) {
      console.log("  " + lbl.padEnd(24) + fmtf(c.offM).padStart(12) + fmtf(c.onM).padStart(14) + fmtf(c.onP90).padStart(13) + ("×" + (c.onM / c.offM).toFixed(2)).padStart(12));
    }
    line("Dégâts effectifs", dmg, function (v) { return String(Math.round(v)); });
    line("PV max", hp, function (v) { return String(Math.round(v)); });
    line("Chance crit. (%)", cr, function (v) { return v.toFixed(1); });
    line("Mult. crit. (×)", cm, function (v) { return v.toFixed(2); });
    line("Défense", df, function (v) { return (100 * v).toFixed(1) + "%"; });

    /* Duel : kit médian et kit P90 (classés par dégâts effectifs avec affixes). */
    var ranked = kits.map(function (kit, i) { return { kit: kit, d: rows.on[i].dmg }; }).sort(function (a, b) { return a.d - b.d; });
    var medKit = ranked[Math.floor(ranked.length / 2)].kit, p90Kit = ranked[Math.floor(ranked.length * 0.9)].kit;
    console.log("  Duel boss (rounds / PV perdus / morts) :");
    HERO.forEach(function (h) {
      var cells = [];
      [["médian, sans", medKit, false], ["médian, avec", medKit, true], ["P90, avec", p90Kit, true]].forEach(function (cfg) {
        var rd = [], hl = [], dd = 0, n = 0;
        for (var r = 0; r < RUNS; r++) {
          seedRng(5000 + r);
          var res = duel(g, run, h, p, cfg[1], cfg[2]);
          if (!res) continue;
          rd.push(res.rounds); hl.push(res.hpLost); if (res.died) dd++; n++;
        }
        var m = { rounds: mean(rd), hpLost: mean(hl), death: dd / n };
        out[p.id + "|" + h + "|" + cfg[0]] = m;
        cells.push(cfg[0] + " " + m.rounds.toFixed(1) + "rd " + Math.round(m.hpLost * 100) + "%" + (m.death > 0 ? " †" + Math.round(m.death * 100) + "%" : ""));
      });
      console.log("    " + h.padEnd(8) + cells.join("  |  "));
    });
    console.log("");
  });
  fs.writeFileSync(path.join(ROOT, "sim", "affix-bench-out" + (V2 ? "-v2" : "") + (LITE ? "-lite" : "") + ".json"), JSON.stringify(out, null, 2));
}

var okA = partA();
partB();
console.log(okA ? "Partie A : OK" : "Partie A : ANOMALIES");
