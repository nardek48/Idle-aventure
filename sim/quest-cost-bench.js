"use strict";
/* sim/quest-cost-bench.js — COÛT D'UN OBJECTIF DE QUÊTE, sur le vrai moteur.

   POURQUOI CE BANC EXISTE (décision Seb, 17/09/2026).
   Les bancs précédents mesurent le coût d'UN COMBAT. Ça ne suffit pas dès qu'une quête
   introduit un groupe : mesuré sur La Meute Affamée, une meute de deux coûte plus cher
   qu'un ennemi seul PAR COMBAT, mais l'objectif « tuer 10 loups » devient 2,4 fois plus
   rapide et 40 % moins coûteux, puisque chaque combat rapporte deux crans. Le chiffre
   qui compte pour équilibrer une quête est donc le coût de son OBJECTIF ENTIER.

   Et il n'existe pas de réglage neutre : les points de vie d'un groupe se divisent
   (groupHpMult) mais les dégâts qu'il inflige se multiplient par le nombre de membres.
   À ×0,70, le Chevalier s'en sort et le Mage meurt à 98 %. C'est pour ça qu'on équilibre
   quête par quête plutôt qu'avec une formule — et pour ça qu'il faut un banc.

   MÊME PRINCIPE QUE LES AUTRES BANCS : les vrais scripts d'index.html sont chargés dans
   une sandbox VM et on joue de vrais rounds via CombatEngine.heroAction(). Aucune
   formule n'est reproduite ici ; un banc qui réécrirait la boucle ne verrait pas bouger
   une modification du moteur.

   CE QU'IL MESURE, par quête et par classe :
     - rounds joués pour boucler l'objectif,
     - PV perdus cumulés (cumulés, pas au pic : c'est le vrai coût en potions et en repas),
     - or récolté,
     - taux de mort.

   L'ÉQUIPEMENT COMPTE (remarque de Seb) : trois profils sont mesurés, et l'écart entre
   eux est aussi une information — une quête qui ne bouge pas entre « nu » et « équipé »
   est une quête où l'équipement ne sert à rien.

   USAGE
     node sim/quest-cost-bench.js .                     toutes les quêtes, profil moyen
     node sim/quest-cost-bench.js . --quest=hq_wolf_pack   une seule quête, les 3 profils
     node sim/quest-cost-bench.js . --gear=all           les 3 profils sur toutes les quêtes
     node sim/quest-cost-bench.js . --runs=80            change le nombre de campagnes
     node sim/quest-cost-bench.js . --solo               force le combat à l'unité (comparaison)
*/

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var ROOT = process.argv[2] || ".";
var ARGS = process.argv.slice(3).join(" ");
function arg(nom, defaut) {
  var m = ARGS.match(new RegExp("--" + nom + "=([^\\s]+)"));
  return m ? m[1] : defaut;
}
var UNE_QUETE = arg("quest", null);
var RUNS = Number(arg("runs", 40));
var GEAR = arg("gear", UNE_QUETE ? "all" : "moyen");
var FORCE_SOLO = ARGS.indexOf("--solo") !== -1;

/* ---------- Sandbox : identique aux autres bancs ---------- */
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
  var s = {
    console: { log: function () {}, warn: function () {}, error: function () {} },
    Date: Date, Math: fakeMath, JSON: JSON, Object: Object, Array: Array,
    Number: Number, String: String, Boolean: Boolean,
    setTimeout: function () { return 0; }, clearTimeout: function () {},
    setInterval: function () { return 0; }, clearInterval: function () {},
    requestAnimationFrame: function () {},
    performance: { now: function () { return Date.now(); } },
    navigator: { serviceWorker: null, userAgent: "bench", vibrate: function () {} },
    location: { href: "", search: "", hash: "", protocol: "https:" },
    localStorage: {
      getItem: function (k) { return storage.hasOwnProperty(k) ? storage[k] : null; },
      setItem: function (k, v) { storage[k] = String(v); },
      removeItem: function (k) { delete storage[k]; },
      key: function (i) { return Object.keys(storage)[i] || null; },
      get length() { return Object.keys(storage).length; }
    },
    document: {
      getElementById: function () { return el(); },
      querySelector: function () { return null; }, querySelectorAll: function () { return []; },
      createElement: function () { return el(); }, addEventListener: function () {},
      body: el(), documentElement: el(), hidden: false, activeElement: null
    },
    alert: function () {}, confirm: function () { return true; },
    atob: function (x) { return Buffer.from(x, "base64").toString("binary"); },
    btoa: function (x) { return Buffer.from(x, "binary").toString("base64"); },
    structuredClone: function (v) { return JSON.parse(JSON.stringify(v)); },
    TextEncoder: TextEncoder, TextDecoder: TextDecoder, URL: URL, Blob: function () {}
  };
  s.window = s; s.self = s; s.globalThis = s;
  vm.createContext(s);

  var html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  var re = /<script src="([^"]+\.js)"/g, m;
  while ((m = re.exec(html))) {
    if (/pwa\.js|boot\.js/.test(m[1])) continue;
    vm.runInContext(fs.readFileSync(path.join(ROOT, m[1]), "utf8"), s, { filename: m[1] });
  }
  return s;
}

var g = buildSandbox();
function run(code) { return vm.runInContext(code, g); }

/* ---------- Profils d'équipement ----------
   game.trainedStats est DÉRIVÉ : la seule entrée est le niveau d'amélioration
   (voir le piège documenté dans forest-bench.js). L'arme, elle, se pose directement. */
var TRAINING_IDS = ["utrain_power", "utrain_endurance", "utrain_celerity", "utrain_precision", "utrain_will"];

var PROFILS = {
  nu:     { label: "nu",      trained: 0, arme: null },
  moyen:  { label: "moyen",   trained: 4, arme: { id: "b_w1", name: "Lame de banc", rarity: "common", slot: "weapon", stat: "tapDmg", value: 4 } },
  equipe: { label: "équipé",  trained: 8, arme: { id: "b_w2", name: "Lame de banc +", rarity: "rare", slot: "weapon", stat: "tapDmg", value: 14 } }
};

function preparer(heroId, profil) {
  run("fullResetState(); game.playerName='Bench'; game.heroId='" + heroId + "';");
  TRAINING_IDS.forEach(function (id) { g.game.upgrades[id] = profil.trained; });
  if (profil.arme) g.game.equipped.weapon = JSON.parse(JSON.stringify(profil.arme));
  run("EquipmentManager.recalcStats(); game.heroHp = game.heroMaxHp;");
  g.game.unlockedTabs.combat = true;
  g.game.activeTab = "combat";
  g.ClassCombatManager.resetForNewHero();
  g.CombatEngine.ensureState();
}

/* ---------- Catalogue des quêtes mesurables ----------
   Une quête est mesurable si son objectif se compte en kills : on sait alors quand il
   est bouclé. Les étapes d'Histoire n'ont pas de run propre et sortent du cadre. */
function catalogue() {
  var out = [];
  Object.keys(g.ADVENTURE_QUESTS || {}).forEach(function (id) {
    var q = g.ADVENTURE_QUESTS[id];
    if (!q || !Array.isArray(q.steps)) return;
    var etape = q.steps.filter(function (s) { return s.type === "kill"; })[0];
    if (!etape || !etape.target) return;
    out.push({ id: id, nom: q.name || id, cible: etape.target, quest: q, type: "aventure" });
  });
  Object.keys(g.HUNT_QUESTS || {}).forEach(function (id) {
    var q = g.HUNT_QUESTS[id];
    if (!q || !q.lotSize) return;
    out.push({ id: id, nom: q.name || id, cible: q.lotSize, quest: q, type: "chasse" });
  });
  return out;
}

/* ---------- Une campagne : boucler l'objectif d'une quête ----------
   Les PV sont remis au maximum ENTRE les combats : on mesure le coût cumulé de
   l'objectif, pas la capacité à enchaîner sans se soigner. Le repos entre deux combats
   existe en jeu (repas, potions) ; ce qu'on cherche ici, c'est ce qu'il coûte. */
function campagne(entree, heroId, profil) {
  preparer(heroId, profil);

  var q = entree.quest;
  if (FORCE_SOLO && Array.isArray(q.group)) {
    q = JSON.parse(JSON.stringify(q));
    delete q.group;
  }

  var kills = 0, rounds = 0, pvPerdus = 0, or0 = g.game.gold;
  var mort = false, garde = 4000;

  while (kills < entree.cible && garde-- > 0) {
    var spawn = g.QuestEnemyManager.spawnFor(q, false);
    if (!spawn) break;
    var membres = [].concat(spawn);
    g.CombatEngine.spawnGroup(membres);
    run("game.heroHp = game.heroMaxHp;");
    var hp0 = g.game.heroHp;

    var vivant = function () {
      for (var i = 0; i < membres.length; i++) {
        if (membres[i].hp > 0 && g.CombatActors.enemies().indexOf(membres[i]) !== -1) return true;
      }
      return false;
    };

    var g2 = 300;
    while (vivant() && g.game.heroHp > 0 && g2-- > 0) {
      if (!g.CombatEngine.heroAction("basic")) break;
      rounds += 1;
    }
    pvPerdus += Math.max(0, hp0 - g.game.heroHp);
    kills += membres.length;
    if (g.game.heroHp <= 0) { mort = true; break; }
  }

  return {
    rounds: rounds, pv: pvPerdus, kills: kills, mort: mort,
    or: g.game.gold - or0
  };
}

function mesurer(entree, heroId, profil) {
  var acc = { rounds: 0, pv: 0, or: 0, morts: 0, kills: 0 };
  for (var r = 0; r < RUNS; r++) {
    seedRng(4200 + r * 7);
    var x = campagne(entree, heroId, profil);
    acc.rounds += x.rounds; acc.pv += x.pv; acc.or += x.or;
    acc.kills += x.kills;
    if (x.mort) acc.morts += 1;
  }
  return {
    rounds: acc.rounds / RUNS, pv: acc.pv / RUNS, or: acc.or / RUNS,
    kills: acc.kills / RUNS, mortPct: acc.morts / RUNS * 100
  };
}

/* ---------- Sortie ---------- */
var CLASSES = [["knight", "Chevalier"], ["ranger", "Rôdeur"], ["mage", "Mage"]];

function ligne(label, m, cible) {
  /* « PV / cran » est LA colonne d'équilibrage : c'est ce que coûte un point d'objectif,
     comparable d'une quête à l'autre et d'un groupe à un solo. */
  var parCran = cible > 0 ? (m.pv / cible) : 0;
  return "  " + label.padEnd(26)
    + m.rounds.toFixed(1).padStart(7) + " rd"
    + Math.round(m.pv).toString().padStart(8) + " PV"
    + Math.round(parCran).toString().padStart(7) + " PV/cran"
    + Math.round(m.or).toString().padStart(7) + " or"
    + Math.round(m.mortPct).toString().padStart(6) + " % morts";
}

var liste = catalogue().filter(function (e) { return !UNE_QUETE || e.id === UNE_QUETE; });
if (!liste.length) {
  console.log("Aucune quête mesurable" + (UNE_QUETE ? " pour l'id « " + UNE_QUETE + " »" : "") + ".");
  process.exit(0);
}

var profils = (GEAR === "all") ? ["nu", "moyen", "equipe"] : [GEAR];

console.log("\nCOÛT DES OBJECTIFS DE QUÊTE — " + RUNS + " campagnes par ligne"
  + (FORCE_SOLO ? " — GROUPES DÉSACTIVÉS (comparaison)" : ""));
console.log("PV remis au maximum entre deux combats : on mesure le coût CUMULÉ de l'objectif.\n");

liste.forEach(function (e) {
  var taille = Array.isArray(e.quest.group) ? e.quest.group.length : 1;
  console.log("── " + e.nom + " (" + e.id + ") — objectif " + e.cible + " crans"
    + (taille > 1 && !FORCE_SOLO ? ", par groupes de " + taille + " ×" + (e.quest.groupHpMult || "?") : "")
    + " ──");
  profils.forEach(function (pid) {
    var p = PROFILS[pid];
    if (!p) return;
    CLASSES.forEach(function (c) {
      console.log(ligne(c[1] + " · " + p.label, mesurer(e, c[0], p), e.cible));
    });
    if (profils.length > 1) console.log("");
  });
  console.log("");
});
