"use strict";
/* tools/sim/forecast-calibration-bench.js — calibration du PRONOSTIC DE COMBAT (v3.249.0).

   Problème constaté : le pronostic livré en v3.247.0 annonçait « hors de portée » sur des
   combats que tools/sim/lisiere-quest-bench.js gagne à 100 %. Il ignorait trois choses que le
   joueur a réellement : la Défense jouée face aux télégraphes, les potions de soin (cap 2
   par sortie) et la montée en ressource de classe. Il criait donc au loup.

   Ce banc met face à face, pour une série de profils :
     - ce que le pronostic annonce (verdict et ratio rounds-pour-tuer / rounds-pour-tomber) ;
     - le taux d'échec RÉEL du run complet, joué round par round sur le vrai moteur.
   De quoi placer les seuils sur des mesures et non à l'estime.

   USAGE : node tools/sim/forecast-calibration-bench.js . [--runs N] */

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var ROOT = require("../chemins.js").jeu(process.argv[2]);
var RUNS = 80;
for (var ai = 3; ai < process.argv.length; ai++) if (process.argv[ai] === "--runs") RUNS = Number(process.argv[ai + 1]) || RUNS;

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

var g = buildSandbox();
function run(code) { return vm.runInContext(code, g); }

/* ---------- Politique de round (celle des autres bancs) ---------- */
function pendingConditionOf(e) {
  if (!e) return null;
  if (e.healTelegraphed) return "healIncoming";
  if (e.shieldTelegraphed) return "shieldIncoming";
  if (e.surgeTelegraphed) return "eliteSurgeIncoming";
  if (e.chargeTelegraphed) return "chargeIncoming";
  if (e.silenceTelegraphed) return "enemySilenceIncoming";
  return null;
}
function playRound() {
  var pending = pendingConditionOf(g.game.enemy);
  var maxHp = Number(g.game.heroMaxHp || 0);
  if (maxHp > 0 && (g.game.heroHp / maxHp) < 0.35) {
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

var SLOTS = ["weapon", "armor", "helmet", "gloves", "boots", "ring", "amulet"];
var CLASSES = [{ id: "knight", hero: "knight", label: "Chevalier" }, { id: "archer", hero: "ranger", label: "Rôdeur" }, { id: "mage", hero: "mage", label: "Mage" }];

/* Profils, du plus démuni au mieux équipé. */
var PROFILS = [
  { id: "nu", label: "rien du tout", weapon: 0, kit: false, train: 0, potions: 0 },
  { id: "nu-pot", label: "rien, 3 potions", weapon: 0, kit: false, train: 0, potions: 3 },
  { id: "arme10", label: "arme +10", weapon: 10, kit: false, train: 0, potions: 3 },
  { id: "arme15", label: "arme +15", weapon: 15, kit: false, train: 0, potions: 3 },
  { id: "arme25", label: "arme +25 (vitrine)", weapon: 25, kit: false, train: 0, potions: 3 },
  { id: "kit", label: "vitrine complète", weapon: 25, kit: true, train: 0, potions: 3 },
  { id: "kit-train", label: "vitrine + 20 niveaux", weapon: 25, kit: true, train: 20, potions: 3 }
];

function setup(heroId, classId, p) {
  run("fullResetState(); game.playerName='Bench'; game.heroId='" + heroId + "';");
  if (p.weapon > 0) {
    g.game.equipped.weapon = { uid: "w", slot: "weapon", name: "Arme", icon: "sword", rarity: "common", stat: "tapDmg", value: p.weapon, affixes: [] };
  }
  if (p.kit) {
    (g.EQUIP_SHOP_STARTER || []).forEach(function (d) {
      if (d.slot === "weapon") return;
      g.game.equipped[d.slot] = { uid: "x" + d.slot, slot: d.slot, name: d.name, icon: d.icon, rarity: "common", stat: d.stat, value: d.value, affixes: [] };
    });
  }
  if (p.train > 0) {
    var main = g.getClassMainStat(classId);
    g.game.upgrades["utrain_" + main.stat] = p.train;
    g.game.upgrades.utrain_endurance = p.train;
  }
  g.PotionManager.ensureHealing();
  g.game.healingPotionsOwned = { potion_soin_mineur: p.potions };
  run("EquipmentManager.recalcStats(); game.heroHp = game.heroMaxHp;");
  g.game.unlockedTabs.combat = true; g.game.activeTab = "combat";
  g.ClassCombatManager.resetForNewHero(); g.CombatEngine.ensureState();
}

/* Un run complet de « Prouver sa valeur » : 9 ennemis puis le boss, sans repos. */
function runQuest(heroId, classId, p) {
  setup(heroId, classId, p);
  g.AdventureQuestManager.ensureDefaults();
  g.AdventureQuestManager.start("aq_forest_expedition");
  if (!g.game.adventureQuestRun.active) return null;
  var guard = 900;
  while (g.game.adventureQuestRun.active && g.game.heroHp > 0 && guard-- > 0) {
    if (!playRound()) break;
  }
  return !!(g.game.adventureQuestsCompleted || {}).aq_forest_expedition;
}

function main() {
  console.log("CALIBRATION DU PRONOSTIC — " + RUNS + " runs par cellule, quête « Prouver sa valeur ».");
  console.log("Colonnes : verdict annoncé par le pronostic · ratio (rounds pour tuer / rounds pour tomber) · échec RÉEL mesuré.\n");

  var lignes = [];
  CLASSES.forEach(function (c) {
    PROFILS.forEach(function (p) {
      /* Pronostic, mesuré sur le boss annoncé (le pire ennemi du run). */
      setup(c.hero, c.id, p);
      /* forMission : c'est le chemin réel du jeu (usure du run comprise), pas forEnemy seul. */
      var f = g.CombatForecast.forMission({ sourceKind: "adventure", questId: "aq_forest_expedition", title: "Prouver sa valeur" });
      var ratio = f.unwinnable ? 99 : (f.roundsToKill / Math.max(1, f.roundsToDie));

      /* Réel. */
      var ok = 0, n = 0;
      for (var r = 0; r < RUNS; r++) {
        seedRng(31000 + r);
        var res = runQuest(c.hero, c.id, p);
        if (res === null) continue;
        n++; if (res) ok++;
      }
      var fail = n ? (1 - ok / n) : null;
      lignes.push({ classe: c.label, profil: p.label, verdict: f.id, ratio: ratio, fail: fail, unwinnable: f.unwinnable });
      console.log("  " + c.label.padEnd(11) + p.label.padEnd(22)
        + g.CombatForecast.getLevelDef(f.id).label.padEnd(16)
        + "ratio " + (ratio >= 99 ? "  ∞" : ratio.toFixed(2).padStart(5))
        + "   échec réel " + (fail === null ? "—" : String(Math.round(fail * 100)).padStart(3) + " %"));
    });
  });

  /* Tableau de correspondance : à quel ratio correspond quel échec réel. */
  console.log("\n--- Correspondance ratio -> échec réel (toutes classes confondues) ---");
  var tries = lignes.filter(function (l) { return l.fail !== null && l.ratio < 99; }).sort(function (a, b) { return a.ratio - b.ratio; });
  tries.forEach(function (l) {
    console.log("  ratio " + l.ratio.toFixed(2).padStart(5) + "  ->  échec " + String(Math.round(l.fail * 100)).padStart(3) + " %   (" + l.classe + ", " + l.profil + ")");
  });
  var infinis = lignes.filter(function (l) { return l.unwinnable; });
  if (infinis.length) {
    console.log("\n  Déclarés « hors de portée » par le soin :");
    infinis.forEach(function (l) { console.log("    " + l.classe + ", " + l.profil + " -> échec réel " + (l.fail === null ? "—" : Math.round(l.fail * 100) + " %")); });
  }
  console.log("\nLecture : un seuil est bien placé si tous les profils au-dessus échouent vraiment, et si aucun profil en dessous n'est averti pour rien.");
}
main();
