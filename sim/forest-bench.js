"use strict";
/* sim/forest-bench.js — banc de mesure de la FORÊT, sur le VRAI moteur (lot E0).

   Pourquoi ce fichier existe alors que sim/combat-round-sim.js mesure déjà :
   combat-round-sim.js est un MODÈLE PARALLÈLE. Il reproduit les formules du
   moteur, il ne les exécute pas. Le chantier « patterns coûteux » (E2) modifie
   combat-engine.js — un banc bâti sur le modèle ne verrait donc RIEN bouger.
   Ici on charge les vrais scripts, comme round-harness.js, et on joue de vrais
   rounds via CombatEngine.heroAction().

   MÉTRIQUE : pas le taux de mort. La Forêt en Acte III est gagnée à 100 %, un
   taux binaire y est saturé et bruité (constaté : résultats non monotones).
   On mesure ce que le combat COÛTE — PV perdus, rounds, impacts de pattern —
   qui sont continus, donc sensibles même quand personne ne meurt. Le taux de
   mort redeviendra la bonne métrique pour les élites, qu'on veut mortelles.

   CIBLE ACTÉE (Seb, 10/09/2026) : un boss de Forêt doit coûter ~40 % des PV.
   Mesure de référence avant E2 : 22 à 37 % selon la classe.

   USAGE :
     node sim/forest-bench.js .              affiche le tableau
     node sim/forest-bench.js . --save       écrit sim/forest-bench-ref.json
     node sim/forest-bench.js . --diff       compare à la référence enregistrée

   Le mode --diff est le point de l'outil : on enregistre AVANT de toucher au
   moteur, on modifie, on relance, on lit l'écart. */

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var ROOT = process.argv[2] || ".";
var MODE = process.argv[3] || "";
var RUNS = 400;              // par cellule ; 400 suffit sur une métrique continue
var REF_FILE = path.join(ROOT, "sim", "forest-bench-ref.json");

/* ---------- Sandbox : même principe que round-harness.js ---------- */
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

/* Un duel : héros neuf à PV pleins contre le boss courant, sans potion, pour
   isoler le coût brut du combat. Renvoie null si le combat n'a pas pu se jouer.

   PIÈGE : game.trainedStats est une valeur DÉRIVÉE, pas une entrée. À chaque
   StatsSystem.recalcStats(), UPGRADES.forEach(u.apply(niveau)) la réécrit
   depuis game.upgrades — y poser une valeur à la main ne survit pas au premier
   recalcul (constaté : entraînement +4 et +8 donnaient des chiffres
   rigoureusement identiques). La seule entrée est le niveau d'amélioration. */
var TRAINING_UPGRADE_IDS = ["utrain_power", "utrain_endurance", "utrain_celerity", "utrain_precision", "utrain_will"];

function duelBoss(g, run, heroId, trained, adventureIndex, archetype, counterArchetype) {
  run("fullResetState(); game.playerName='Bench'; game.heroId='" + heroId + "';");
  TRAINING_UPGRADE_IDS.forEach(function (id) { g.game.upgrades[id] = trained; });
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

  /* Archétype posé APRÈS prepareEnemy (qui remet les compteurs à zéro), comme
     le fera EliteManager au spawn. Un boss porte enraged/armored/vampiric/
     corrupted sans conflit : le moteur ne les lit que hors du système de
     télégraphe, réservé lui aux patterns bouclier/soin. */
  if (archetype) {
    enemy.isElite = true;   // v3.204.0 (E4) : active l'exaltation et retire le soin
    enemy.archetype = archetype;
    enemy.corruptedStacks = 0;
    enemy.vampiricSuppressedRounds = 0;
    enemy.armorSuppressedRounds = 0;
    enemy.rageFreezeRounds = 0;
    if (typeof g.CombatEngine.prepareEnemy === "function") {
      enemy._roundReady = false;
      g.CombatEngine.prepareEnemy(enemy);
    }
  }

  var hpMax = g.game.heroMaxHp;
  var rounds = 0, impacts = 0;
  var guard = 300;
  while (g.game.enemy === enemy && enemy.hp > 0 && g.game.heroHp > 0 && guard-- > 0) {
    var before = { charge: enemy.chargeTelegraphed, shield: enemy.shieldTelegraphed, heal: enemy.healTelegraphed };
    if (!playRound(g, counterArchetype)) break;
    rounds += 1;
    // un télégraphe présent avant le round et absent après = impact résolu
    if ((before.charge && !enemy.chargeTelegraphed) || (before.shield && !enemy.shieldTelegraphed)
      || (before.heal && !enemy.healTelegraphed)) impacts += 1;
  }

  return {
    hpLostPct: Math.max(0, 1 - (g.game.heroHp / hpMax)),
    rounds: rounds,
    impacts: impacts,
    died: g.game.heroHp <= 0
  };
}

/* ---------- Campagne de mesure ---------- */
function measure(g, run, heroId, trained, adventureIndex, archetype, counterArchetype) {
  var hp = 0, rd = 0, im = 0, deaths = 0, n = 0;
  for (var r = 0; r < RUNS; r++) {
    seedRng(9000 + r);
    var res = duelBoss(g, run, heroId, trained, adventureIndex, archetype, counterArchetype);
    if (!res) continue;
    hp += res.hpLostPct; rd += res.rounds; im += res.impacts;
    if (res.died) deaths += 1;
    n += 1;
  }
  if (!n) return null;
  return {
    hpLostPct: hp / n, rounds: rd / n, impacts: im / n, deathRate: deaths / n, samples: n
  };
}

function main() {
  var boot = buildSandbox();
  var g = boot.g;
  function run(code) { return vm.runInContext(code, g); }

  var HEROES = [
    { id: "knight", label: "Chevalier" },
    { id: "ranger", label: "Rôdeur" },
    { id: "mage", label: "Mage" }
  ];
  var ZONES = [
    { index: 0, label: "Lisière · Roi Slime" },
    { index: 1, label: "Cœur · Seigneur orc" }
  ];
  var TRAINED = [4, 8];

  console.log("Banc Forêt — " + boot.scriptCount + " scripts chargés, " + RUNS + " runs par cellule.");
  console.log("Duel à PV pleins, sans potion, héros NU. Depuis v3.232.0 la difficulté vise un joueur\néquipé : ce banc sert de détecteur de régression, plus de cible. Voir sim/balance-bench.js.\n");

  var out = {};
  ZONES.forEach(function (z) {
    TRAINED.forEach(function (t) {
      var cells = [];
      HEROES.forEach(function (h) {
        var m = measure(g, run, h.id, t, z.index);
        var key = z.index + "|" + t + "|" + h.id;
        out[key] = m;
        cells.push(m
          ? h.label.charAt(0) + " " + Math.round(m.hpLostPct * 100) + "% "
            + m.rounds.toFixed(1) + "rd " + m.impacts.toFixed(1) + "imp"
          : h.label.charAt(0) + " —");
      });
      console.log((z.label + " · entr.+" + t).padEnd(30) + cells.join("   "));
    });
  });

  if (MODE === "--arch") {
    console.log("\nPoids réel de chaque archétype — Cœur, entraînement +8, boss porteur");
    console.log("(écart de PV perdus par rapport au boss nu, en points)\n");
    var base = {};
    HEROES.forEach(function (h) { base[h.id] = measure(g, run, h.id, 8, 1, null); });
    ["armored", "vampiric", "corrupted", "enraged"].forEach(function (a) {
      var cells = HEROES.map(function (h) {
        var m = measure(g, run, h.id, 8, 1, a);
        var c = measure(g, run, h.id, 8, 1, a, a);
        var d = (m.hpLostPct - base[h.id].hpLostPct) * 100;
        var gain = (m.hpLostPct - c.hpLostPct) * 100;
        return h.label.charAt(0) + " " + Math.round(m.hpLostPct * 100) + "%"
          + " (" + (d >= 0 ? "+" : "") + d.toFixed(1) + ") contre " + Math.round(c.hpLostPct * 100) + "%"
          + " [" + (gain >= 0 ? "gain " : "PERTE ") + Math.abs(gain).toFixed(1) + "]";
      });
      console.log(("  " + a).padEnd(14) + cells.join("   "));
    });
    var b = HEROES.map(function (h) {
      return h.label.charAt(0) + " " + Math.round(base[h.id].hpLostPct * 100) + "% ("
        + base[h.id].rounds.toFixed(1) + "rd)";
    });
    console.log(("  aucun").padEnd(14) + b.join("        "));
    return;
  }

  if (MODE === "--save") {
    fs.writeFileSync(REF_FILE, JSON.stringify(out, null, 2));
    console.log("\nRéférence enregistrée : " + REF_FILE);
  } else if (MODE === "--diff") {
    if (!fs.existsSync(REF_FILE)) {
      console.log("\nAucune référence enregistrée (lancer d'abord avec --save).");
      return;
    }
    var ref = JSON.parse(fs.readFileSync(REF_FILE, "utf8"));
    console.log("\nÉcart avec la référence (PV perdus, points de pourcentage) :");
    Object.keys(out).forEach(function (k) {
      if (!ref[k] || !out[k]) return;
      var d = (out[k].hpLostPct - ref[k].hpLostPct) * 100;
      if (Math.abs(d) < 0.5) return;
      console.log("  " + k + " : " + (d > 0 ? "+" : "") + d.toFixed(1) + " pts");
    });
  }
}

main();
