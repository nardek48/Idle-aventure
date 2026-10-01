"use strict";
/* sim/arbremere-bench.js — v3.258.0 (Cartes Vivantes, C-5) : frein interne de l'Arbre-mère.

   Question : à quel pas de frein (+X % PV et dégâts par victoire du jour) un joueur de fin de
   Forêt enchaîne-t-il 3 à 5 victoires avant de tomber, et combien de Sève par victoire garde
   l'offre quotidienne dans l'ordre de la Petite Aventure (~11 Sève/jour au cap) ?

   RÉEL : moteur de combat, EliteManager.build (avec brakeMult), classes, potions, politique
   de round des autres bancs (contre le télégraphe, potion sous 35 % PV).
   MODÈLE : entre deux combats le héros est soigné à plein et repart avec ses potions (le
   Campement régénère, les potions s'achètent) ; il s'arrête à la première défaite (une mort
   devant l'Arbre-mère est un échec de secteur : personne n'insiste). 10 victoires au plus.

   Usage : node sim/arbremere-bench.js . [--runs 60] [--pas 0.25,0.35,0.5] */
var fs = require("fs"), path = require("path"), vm = require("vm");
var ROOT = process.argv[2] || ".";
var RUNS = 60, PAS = [0.25, 0.35, 0.5];
for (var ai = 3; ai < process.argv.length; ai++) {
  if (process.argv[ai] === "--runs") RUNS = Number(process.argv[ai + 1]) || RUNS;
  if (process.argv[ai] === "--pas") PAS = process.argv[ai + 1].split(",").map(Number);
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

var CLASSES = [{ id: "knight", hero: "knight", label: "Chevalier" }, { id: "archer", hero: "ranger", label: "Rôdeur" }, { id: "mage", hero: "mage", label: "Mage" }];
/* Profils : le joueur qui atteint l'anneau 3 a au moins la vitrine et 20 niveaux ; celui qui
   finit la Forêt a une meilleure arme, le Terrain, et quelques niveaux de héros. */
var PROFILS = [
  { id: "milieu", label: "vitrine + 20 niveaux", weapon: 25, kit: true, train: 20, potions: 3, level: 5 },
  { id: "fin", label: "arme +40, 50 niveaux", weapon: 40, kit: true, train: 50, potions: 3, level: 10 },
  { id: "cycle1", label: "fin + Cycle 1", weapon: 40, kit: true, train: 50, potions: 3, level: 12, cycle: 1 }
];

function setup(heroId, classId, p) {
  run("fullResetState(); game.playerName='Bench'; game.heroId='" + heroId + "';");
  g.game.equipped.weapon = { uid: "w", slot: "weapon", name: "Arme", icon: "sword", rarity: "common", stat: "tapDmg", value: p.weapon, affixes: [] };
  (g.EQUIP_SHOP_STARTER || []).forEach(function (d) {
    if (d.slot === "weapon") return;
    g.game.equipped[d.slot] = { uid: "x" + d.slot, slot: d.slot, name: d.name, icon: d.icon, rarity: "common", stat: d.stat, value: d.value, affixes: [] };
  });
  var main = g.getClassMainStat(classId);
  g.game.upgrades["utrain_" + main.stat] = p.train;
  g.game.upgrades.utrain_endurance = p.train;
  g.game.heroLevel = p.level || 1;
  g.game.cycleCount = p.cycle || 0;
  g.PotionManager.ensureHealing();
  run("EquipmentManager.recalcStats(); game.heroHp = game.heroMaxHp;");
  g.game.unlockedTabs.combat = true; g.game.activeTab = "combat";
  g.ClassCombatManager.resetForNewHero(); g.CombatEngine.ensureState();
}

/* Un combat contre l'Arbre-mère au k-ième cran de frein. Retourne true si vaincue. */
function fight(p, brakeMult) {
  g.game.heroHp = g.game.heroMaxHp;
  g.game.healingPotionsOwned = { potion_soin_mineur: p.potions };
  g.ClassCombatManager.resetForNewHero(); g.CombatEngine.ensureState();
  var enemy = g.EliteManager.build("arbre_mere", g.EliteManager.scaleFor(0, 0), { brakeMult: brakeMult });
  g.game.enemy = enemy; g.CombatEngine.prepareEnemy(enemy);
  var guard = 600;
  /* killEnemy() fait apparaître l'ennemi suivant du farm : on suit l'OBJET de l'Arbre-mère, pas game.enemy. */
  while (g.game.enemy === enemy && enemy.hp > 0 && g.game.heroHp > 0 && guard-- > 0) {
    if (!playRound()) break;
  }
  return g.game.heroHp > 0 && enemy.hp <= 0;
}

/* Victoires consécutives dans la journée, au plus 10. */
function day(heroId, classId, p, pas) {
  setup(heroId, classId, p);
  var wins = 0;
  while (wins < 10) {
    if (!fight(p, 1 + pas * wins)) break;
    wins++;
  }
  return wins;
}

console.log("ARBRE-MÈRE — frein interne. " + RUNS + " journées par cellule, base Troll ×2,6 endurance, échelle Forêt (scaleFor(0,0)).");
console.log("Cellule = victoires moyennes avant la première défaite (10 max) · % de journées sans aucune victoire.\n");
var head = "Classe      Profil                 ";
PAS.forEach(function (x) { head += ("+" + Math.round(x * 100) + " %/victoire").padStart(16); });
console.log(head);
var totals = {};
CLASSES.forEach(function (c) {
  PROFILS.forEach(function (p) {
    var line = "  " + c.label.padEnd(10) + p.label.padEnd(23);
    PAS.forEach(function (x) {
      var sum = 0, zero = 0;
      for (var r = 0; r < RUNS; r++) { seedRng(41000 + r); var w = day(c.hero, c.id, p, x); sum += w; if (w === 0) zero++; }
      var avg = sum / RUNS;
      totals[x] = totals[x] || []; totals[x].push({ profil: p.id, avg: avg });
      line += (avg.toFixed(1) + " (" + Math.round(zero / RUNS * 100) + " %)").padStart(16);
    });
    console.log(line);
  });
});
console.log("");
PAS.forEach(function (x) {
  var fin = totals[x].filter(function (t) { return t.profil === "fin"; });
  var avgFin = fin.reduce(function (s, t) { return s + t.avg; }, 0) / fin.length;
  console.log("+" + Math.round(x * 100) + " % : fin de Forêt = " + avgFin.toFixed(1) + " victoires/jour en moyenne -> à 3 Sève/victoire : " + (avgFin * 3).toFixed(1) + " Sève/jour ; à 2 : " + (avgFin * 2).toFixed(1));
});
console.log("\nRéférence : Petite Aventure au cap ~11 Sève/jour, offre totale ~32 Sève/jour (seve-bench).");
