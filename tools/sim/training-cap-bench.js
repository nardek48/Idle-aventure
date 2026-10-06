"use strict";
/* tools/sim/training-cap-bench.js — v3.308.0 : plafonds des cinq entraînements.

   Question (Seb, 19/09/2026) : Précision plafonnée à 60, Volonté à 80, Célérité à 120,
   Force et Endurance à 150 — faut-il un plafond commun ? Volonté est la stat principale
   du Mage, Célérité celle du Rôdeur : un plafond bas freine leur classe, pas une stat.

   MÉTRIQUE : rounds pour abattre le boss des Dunes brûlantes (monde 2), sur le vrai moteur
   (soins et boucliers du boss compris). Le héros est remis à PV pleins à chaque round : on
   mesure ce qu'il FRAPPE, pas s'il survit (il est nu). Sortie : rounds, et vitesse relative
   au Chevalier (rounds du Chevalier / rounds de la classe). PIÈGE évité : gonfler les PV du
   boss fausse tout, ses soins et boucliers sont en % de ses PV max.

   Les cinq entraînements sont posés au niveau L (60, 110 = Terrain 9 au Désert, 150), puis
   bornés par le plafond de la variante : « avant » = plafonds v3.307.0 lus dans une table
   figée ici, « après » = maxLevel actuels de UPGRADES.

   USAGE : node tools/sim/training-cap-bench.js . [--runs N] [--world 0|1] [--levels 0,20,60]
           [--classes] [--variant coef=0.12|gauge=1.5|k=30]   (~1 min à 120 runs) */

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var ROOT = require("../chemins.js").jeu(process.argv[2]);
var RUNS = 120, GEAR = null, WORLD = 1, LEVELS = [60, 110, 150], VARIANT = null, CLASS_ONLY = false;
for (var ai = 3; ai < process.argv.length; ai++) {
  if (process.argv[ai] === "--runs") RUNS = Number(process.argv[ai + 1]) || RUNS;
  if (process.argv[ai] === "--world") WORLD = Number(process.argv[ai + 1]) || 0;
  if (process.argv[ai] === "--levels") LEVELS = process.argv[ai + 1].split(",").map(Number);
  // --variant coef=0.12 | gauge=1.5 | k=30 : réglage du Rôdeur essayé dans le bac à sable, jeu intact
  if (process.argv[ai] === "--variant") VARIANT = process.argv[ai + 1];
  // --classes : une seule ligne par niveau (plafonds actuels), sans comparaison avant/après
  if (process.argv[ai] === "--classes") CLASS_ONLY = true;
  // --gear common|green : une pièce tirée du monde mesuré dans chaque emplacement (affixes compris)
  if (process.argv[ai] === "--gear") GEAR = process.argv[ai + 1];
}

/* Réglages du Rôdeur essayés sans toucher au jeu. */
function applyVariant(g) {
  if (!VARIANT) return;
  var kv = VARIANT.split("="), key = kv[0], val = Number(kv[1]);
  if (key === "coef") {
    g.CLASSES.forEach(function (c) { if (c.id === "archer") c.mainStatTapCoef = val; });
  } else if (key === "gauge" || key === "k") {
    var CE = g.CombatEngine, orig = CE.getGaugeGainPerAction;
    CE.getGaugeGainPerAction = function () {
      var cls = g.getClassByHeroId(g.game.heroId);
      if (!cls || cls.id !== "archer") return orig.call(this);
      var talentMult = 1 + 0.15 * Number((g.game.talents && g.game.talents.t_auto_tap) || 0);
      var raw = this.getTotalCelerity() * talentMult * (key === "gauge" ? val : 1);
      var K = (key === "k") ? val : g.CELERITY_SOFT_CAP_K;
      return raw <= 0 ? raw : 100 * raw / (raw + K);
    };
  }
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

/* RNG déterministe (mulberry32, même famille que combat-round-sim). Le moteur
   appelle Math.random() partout : on lui fournit un Math dérivé dont seule
   random() change, pour que deux passages du banc soient comparables. */
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
  scripts.forEach(function (s) {
    var code = fs.readFileSync(path.join(ROOT, s), "utf8");
    try {
      vm.runInContext(code, sandbox, { filename: s });
    } catch (e) {
      console.error("ÉCHEC DE CHARGEMENT " + s + " : " + e.message);
      process.exit(1);
    }
  });
  return { g: sandbox, scriptCount: scripts.length };
}

/* ---------- Pilotage d'un combat ---------- */

/* Politique de jeu. On propose les slots par ordre de valeur décroissante :
   heroAction() renvoie false SANS consommer le round si l'action n'est pas
   jouable (recharge, ressource, condition), donc c'est le moteur lui-même qui
   arbitre — aucune règle de disponibilité n'est réécrite ici.

   PIÈGE (corrigé) : sur un télégraphe, tenter « defense » en premier est
   toujours ACCEPTÉ par le moteur, mais la Garde ne contre que la charge et le
   silence — jamais le bouclier ni le soin d'un boss. Le héros passait donc un
   round sur deux à une défense inutile contre les boss, ce qui gonflait les
   rounds de ~50 % et faussait toute la mesure. On ne joue une action que si
   ses `counters` déclarent la condition réellement en cours. */
function pendingConditionOf(e) {
  if (!e) return null;
  if (e.healTelegraphed) return "healIncoming";
  if (e.shieldTelegraphed) return "shieldIncoming";
  if (e.surgeTelegraphed) return "eliteSurgeIncoming"; // v3.204.0 (E4)
  if (e.chargeTelegraphed) return "chargeIncoming";
  if (e.silenceTelegraphed) return "enemySilenceIncoming";
  return null;
}

/* Slot du kit portant la suppression d'un archétype donné (enemyRageSuppression,
   enemyArmorSuppression, enemyLifestealSuppression, enemyCorruptionPurge).
   Le moteur applique l'effet tout seul dans useSkillManual() dès qu'on joue le
   bon slot face au bon archétype — rien à forcer ici. */
var SUPPRESSION_BY_EFFECT = {
  enemyRageSuppression: "enraged",
  enemyArmorSuppression: "armored",
  enemyLifestealSuppression: "vampiric",
  enemyCorruptionPurge: "corrupted"
};
function counterSlotFor(kit, archetype) {
  var slots = ["skill1", "skill2", "skill3", "defense"];
  for (var i = 0; i < slots.length; i++) {
    var fx = (kit.actions[slots[i]] && kit.actions[slots[i]].effects) || [];
    for (var j = 0; j < fx.length; j++) {
      if (SUPPRESSION_BY_EFFECT[fx[j].type] === archetype) return slots[i];
    }
  }
  return null;
}

/* La suppression court-elle encore ? Rejouer le contre pendant qu'il est actif
   gaspille le round — c'est un vrai piège de règle de Grimoire. */
function suppressionActive(e, archetype) {
  if (!e) return false;
  if (archetype === "armored") return Number(e.armorSuppressedRounds || 0) > 0;
  if (archetype === "vampiric") return Number(e.vampiricSuppressedRounds || 0) > 0;
  if (archetype === "enraged") return Number(e.rageFreezeRounds || 0) > 0;
  if (archetype === "corrupted") return Number(e.corruptedStacks || 0) === 0;
  return false;
}

function playRound(g, counterArchetype) {
  var pending = pendingConditionOf(g.game.enemy);

  /* Potion sous 30 % de PV, comme la politique de référence du simulateur.
     Le cap de 2 par sortie est appliqué par SortieManager, pas ici. Sans ça,
     une mesure de sortie complète (pistage + cible) est bien trop sévère : le
     héros enchaîne sept combats sans jamais se soigner. */
  var maxHp = Number(g.game.heroMaxHp || 0);
  if (maxHp > 0 && (g.game.heroHp / maxHp) < 0.30) {
    if (g.CombatEngine.heroAction("potion", "potion_soin_mineur")) return true;
  }

  if (counterArchetype) {
    var e = g.game.enemy;
    var cl = g.getClassByHeroId(g.game.heroId);
    var k = cl ? g.getClassSkills(cl.id) : null;
    var cs = k ? counterSlotFor(k, counterArchetype) : null;
    if (cs && !suppressionActive(e, counterArchetype) && g.CombatEngine.heroAction(cs)) return true;
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
  for (var j = 0; j < fallback.length; j++) {
    if (g.CombatEngine.heroAction(fallback[j])) return true;
  }
  return false;
}

/* ---------- Mesure ---------- */
var IDS = ["utrain_power", "utrain_endurance", "utrain_celerity", "utrain_precision", "utrain_will"];
var CAPS_BEFORE = { utrain_power: 150, utrain_endurance: 150, utrain_celerity: 120, utrain_precision: 60, utrain_will: 80 };

function roundsToKill(g, run, heroId, level, caps) {
  run("fullResetState(); game.playerName='Bench'; game.heroId='" + heroId + "';");
  IDS.forEach(function (id) { g.game.upgrades[id] = Math.min(level, caps[id]); });
  if (GEAR) g.EQUIPMENT_SLOTS.forEach(function (slot) { g.game.equipped[slot] = g.generateEquipmentItem(slot, GEAR, WORLD); });
  run("EquipmentManager.recalcStats(); game.heroHp = game.heroMaxHp;");
  g.game.unlockedTabs.combat = true;
  g.game.activeTab = "combat";
  g.ClassCombatManager.resetForNewHero();
  g.CombatEngine.ensureState();
  g.WorldManager.worldIndex = WORLD;
  g.WorldManager.adventureIndex = 0;
  var adv = g.WorldManager.getAdventure();
  g.WorldManager.enemyIndex = Math.max(0, (adv.enemyCount || 1) - 1);
  g.CombatEngine.spawnEnemy();
  var enemy = g.game.enemy;
  if (!enemy) return null;
  var rounds = 0, guard = 400;
  while (g.game.enemy === enemy && enemy.hp > 0 && guard-- > 0) {
    g.game.heroHp = g.game.heroMaxHp;
    if (!playRound(g, null)) break;
    rounds += 1;
  }
  return (rounds && enemy.hp <= 0) ? rounds : null;
}

function measure(g, run, heroId, level, caps) {
  var sum = 0, n = 0;
  for (var r = 0; r < RUNS; r++) {
    seedRng(7000 + r);
    var d = roundsToKill(g, run, heroId, level, caps);
    if (d == null) continue;
    sum += d; n += 1;
  }
  return n ? sum / n : null;
}

function main() {
  var boot = buildSandbox();
  var g = boot.g;
  function run(code) { return vm.runInContext(code, g); }
  applyVariant(g);
  var capsAfter = {};
  g.UPGRADES.forEach(function (u) { if (IDS.indexOf(u.id) !== -1) capsAfter[u.id] = u.maxLevel; });

  var HEROES = [{ id: "knight", label: "Chevalier" }, { id: "ranger", label: "Rôdeur" }, { id: "mage", label: "Mage" }];
  console.log("Plafonds d'entraînement — " + RUNS + " runs par cellule, boss du monde " + (WORLD + 1) + " (1re aventure), héros nu.");
  console.log("Avant : " + JSON.stringify(CAPS_BEFORE));
  console.log("Après : " + JSON.stringify(capsAfter) + "\n");
  console.log("Rounds pour abattre le boss (vitesse relative au Chevalier)\n");
  if (VARIANT) console.log("Variante Rôdeur : " + VARIANT + "\n");
  if (GEAR) console.log("Équipement : une pièce " + GEAR + " du monde " + (WORLD + 1) + " par emplacement\n");
  var variants = CLASS_ONLY ? [["actuel", capsAfter]] : [["avant", CAPS_BEFORE], ["après", capsAfter]];
  LEVELS.forEach(function (L) {
    variants.forEach(function (v) {
      var vals = HEROES.map(function (h) { return measure(g, run, h.id, L, v[1]); });
      var cells = HEROES.map(function (h, i) {
        return h.label.charAt(0) + " " + vals[i].toFixed(1) + " rd (" + Math.round(100 * vals[0] / vals[i]) + " %)";
      });
      console.log(("entr. " + L + " · " + v[0]).padEnd(18) + cells.join("   "));
    });
  });
}

main();
