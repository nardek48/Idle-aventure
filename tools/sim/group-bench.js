"use strict";
/* tools/sim/group-bench.js — banc de mesure du COMBAT DE GROUPE, sur le VRAI moteur (lot L-1).
   Doc : Aethervale_Conception_Combat_Groupe_v1_0.docx §9.

   MÊME PRINCIPE QUE forest-bench.js, et pour la même raison : on charge les vrais
   scripts d'index.html dans une sandbox VM et on joue de vrais rounds via
   CombatEngine.heroAction(). Aucune formule n'est reproduite ici — un banc qui
   réécrirait la boucle de round ne verrait pas bouger une modification du moteur.

   CE QU'IL MESURE AUJOURD'HUI (L-1) : le côté ENNEMI du groupe. Le héros joue seul
   contre 1, 2 ou 3 ennemis. Le côté allié (compagnons) arrive au lot L-2 : il n'existe
   aucun modèle de compagnon à mesurer avant, et en inventer un ici reviendrait
   précisément au modèle parallèle que ce banc évite.

   LA QUESTION À TRANCHER : groupHpMult. Trois loups ne doivent pas coûter trois fois
   un loup — la difficulté d'une meute vient du nombre de frappes par round, pas de la
   somme des PV. On cherche la valeur qui donne à une meute de trois le même coût qu'un
   boss de Forêt, soit ~40 % des PV du héros (cible actée le 10/09/2026).

   MÉTRIQUES : PV perdus (continu, sensible même sans mort), rounds, frappes ennemies
   encaissées, et taux d'échec — qui redevient pertinent ici, un groupe devant être
   réellement dangereux.

   USAGE :
     node tools/sim/group-bench.js .                 tableau 1 v N par classe
     node tools/sim/group-bench.js . --sweep         balayage de groupHpMult (répond à la décision 8)
     node tools/sim/group-bench.js . --save          écrit tools/sim/group-bench-ref.json
     node tools/sim/group-bench.js . --diff          compare à la référence enregistrée
*/

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var ROOT = require("../chemins.js").jeu(process.argv[2]);
var MODE = process.argv[3] || "";
var RUNS = 300;
var REF_FILE = path.join(__dirname, "group-bench-ref.json");

/* ---------- Sandbox : identique à forest-bench.js ---------- */
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
  var scripts = [], re = /<script src="([^"]+\.js)"/g, m;
  while ((m = re.exec(html))) {
    if (!/pwa\.js|boot\.js/.test(m[1])) scripts.push(m[1]);
  }
  scripts.forEach(function (s) {
    var code = fs.readFileSync(path.join(ROOT, s), "utf8");
    try { vm.runInContext(code, sandbox, { filename: s }); }
    catch (e) { console.error("LOAD FAIL", s, e.message); process.exit(1); }
  });
  return { g: sandbox, scriptCount: scripts.length };
}

/* ---------- Politique de jeu ---------- */

/* Reprise de forest-bench.js : on propose les slots par ordre de valeur, le moteur
   arbitre lui-même la disponibilité (heroAction renvoie false sans consommer le round).
   Une action n'est jouée sur un télégraphe que si ses `counters` déclarent la condition —
   sans ça, le héros gaspille un round sur deux en Garde inutile. */
function pendingConditionOf(e) {
  if (!e) return null;
  if (e.healTelegraphed) return "healIncoming";
  if (e.shieldTelegraphed) return "shieldIncoming";
  if (e.surgeTelegraphed) return "eliteSurgeIncoming";
  if (e.chargeTelegraphed) return "chargeIncoming";
  if (e.silenceTelegraphed) return "enemySilenceIncoming";
  return null;
}

/* Choix de cible du joueur « raisonnable » : on achève le plus bas en PV, mais on
   traite d'abord celui qui télégraphie — c'est exactement la règle de retour
   automatique décrite au §6.1 du document, jouée ici à la main. */
function chooseFocus(g) {
  var list = g.CombatActors.aliveEnemies();
  if (!list.length) return null;
  for (var i = 0; i < list.length; i++) {
    if (pendingConditionOf(list[i])) return list[i];
  }
  var best = list[0];
  for (var j = 1; j < list.length; j++) {
    if (list[j].hp < best.hp) best = list[j];
  }
  return best;
}

function playRound(g) {
  var focus = chooseFocus(g);
  if (!focus) return false;
  g.CombatActors.setTarget(focus);

  var maxHp = Number(g.game.heroMaxHp || 0);
  if (maxHp > 0 && (g.game.heroHp / maxHp) < 0.30) {
    if (g.CombatEngine.heroAction("potion", "potion_soin_mineur")) return true;
  }

  var pending = pendingConditionOf(focus);
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

/* ---------- Un combat ---------- */

var TRAINING_UPGRADE_IDS = ["utrain_power", "utrain_endurance", "utrain_celerity", "utrain_precision", "utrain_will"];

/* Fabrique N ennemis d'un même id à la position de Forêt demandée, via le VRAI
   generateEnemy() (échange temporaire du pool de l'aventure, comme le fait déjà
   QuestEnemyManager.spawnFor pour enemyFilter). hpMult s'applique à chaque membre,
   exactement comme le ferait groupHpMult dans les données de quête. */
function buildGroup(g, enemyId, count, adventureIndex, hpMult) {
  g.WorldManager.worldIndex = 0;
  g.WorldManager.adventureIndex = adventureIndex;
  g.WorldManager.enemyIndex = 0;

  var adv = g.WorldManager.getAdventure();
  var savedPool = adv.enemyPool;
  adv.enemyPool = [enemyId];

  var members = [];
  for (var i = 0; i < count; i++) {
    var e = g.WorldManager.generateEnemy();
    if (hpMult && hpMult !== 1) {
      e.hp = Math.max(1, Math.floor(e.maxHp * hpMult));
      e.maxHp = e.hp;
    }
    members.push(e);
  }
  adv.enemyPool = savedPool;
  return members;
}

/* stagger : décale l'arrivée au contact des membres (0, 1, 2 rounds) au lieu de les
   faire approcher tous ensemble. Posé APRÈS spawnGroup, donc après prepareEnemy qui
   règle engageIn — c'est ce que ferait une règle de spawn de groupe côté données. */
function applyEngageStagger(g, members) {
  for (var i = 0; i < members.length; i++) {
    var base = Number(members[i].engageIn || 0);
    members[i].engageIn = (base > 0) ? i : 0;
  }
}

/* v3.268.0 (L-2) : met Wenna dans le groupe, débloquée et présente, PV pleins. */
function withCompanion(g, run, companionId) {
  if (!g.CompanionManager || !companionId) return;
  var st = g.CompanionManager.state(companionId);
  st.unlocked = true;
  st.present = true;
  st.control = "auto";
  st.hp = g.CompanionManager.maxHpOf(companionId);
}

function fightGroup(g, run, heroId, trained, enemyId, count, adventureIndex, hpMult, stagger, companionId) {
  run("fullResetState(); game.playerName='Bench'; game.heroId='" + heroId + "';");
  TRAINING_UPGRADE_IDS.forEach(function (id) { g.game.upgrades[id] = trained; });
  run("EquipmentManager.recalcStats(); game.heroHp = game.heroMaxHp;");
  g.game.unlockedTabs.combat = true;
  g.game.activeTab = "combat";
  g.ClassCombatManager.resetForNewHero();
  g.CombatEngine.ensureState();

  if (companionId) withCompanion(g, run, companionId);

  var members = buildGroup(g, enemyId, count, adventureIndex, hpMult);
  g.CombatEngine.spawnGroup(members);
  if (g.CombatActors.enemies().length !== count) return null;
  if (stagger) applyEngageStagger(g, members);

  var hpMax = g.game.heroMaxHp;
  var rounds = 0, strikes = 0;
  var allyHpMax = 0, allyKo = 0;
  if (companionId) allyHpMax = g.CompanionManager.maxHpOf(companionId);
  var guard = 400;
  var hpBefore = g.game.heroHp;

  /* Fin du combat : plus aucun membre du groupe INITIAL en vie. On ne s'appuie pas
     sur game.enemy, qui repart sur un nouvel ennemi dès que le groupe se vide (le
     spawn enchaîné du farm libre est conservé tant que le retrait de groupe n'est
     pas câblé — lot L-3). */
  function groupAlive() {
    for (var i = 0; i < members.length; i++) {
      if (Number(members[i].hp || 0) > 0 && g.CombatActors.enemies().indexOf(members[i]) !== -1) return true;
    }
    return false;
  }

  while (groupAlive() && g.game.heroHp > 0 && guard-- > 0) {
    var hpAvant = g.game.heroHp;
    if (!playRound(g)) break;
    rounds += 1;
    if (g.game.heroHp < hpAvant) strikes += 1;
  }

  var allyLost = 0;
  if (companionId) {
    var hpNow = g.CompanionManager.hpOf(companionId);
    allyLost = allyHpMax > 0 ? Math.max(0, 1 - (hpNow / allyHpMax)) : 0;
    if (hpNow <= 0) allyKo = 1;
  }

  return {
    hpLostPct: Math.max(0, 1 - (g.game.heroHp / hpMax)),
    rounds: rounds,
    strikeRounds: strikes,
    died: g.game.heroHp <= 0,
    allyLostPct: allyLost,
    allyKo: allyKo,
    unused: hpBefore
  };
}

function measure(g, run, heroId, trained, enemyId, count, adventureIndex, hpMult, stagger, companionId) {
  var hp = 0, rd = 0, st = 0, deaths = 0, n = 0, ally = 0, kos = 0;
  for (var r = 0; r < RUNS; r++) {
    seedRng(9000 + r);
    var res = fightGroup(g, run, heroId, trained, enemyId, count, adventureIndex, hpMult, stagger, companionId);
    if (!res) continue;
    hp += res.hpLostPct; rd += res.rounds; st += res.strikeRounds;
    ally += (res.allyLostPct || 0); kos += (res.allyKo || 0);
    if (res.died) deaths += 1;
    n += 1;
  }
  if (!n) return null;
  return {
    hpLostPct: hp / n, rounds: rd / n, strikeRounds: st / n, deathRate: deaths / n,
    allyLostPct: ally / n, allyKoRate: kos / n, samples: n
  };
}

function cell(label, m) {
  if (!m) return label + " —";
  return label + " " + Math.round(m.hpLostPct * 100) + "%pv "
    + m.rounds.toFixed(1) + "rd "
    + Math.round(m.deathRate * 100) + "%mort";
}

/* ---------- Campagne ---------- */
function main() {
  var boot = buildSandbox();
  var g = boot.g;
  function run(code) { return vm.runInContext(code, g); }

  var HEROES = [
    { id: "knight", label: "C" },
    { id: "ranger", label: "R" },
    { id: "mage", label: "M" }
  ];
  var TRAINED = 4;           // sortie de tutoriel, héros nu : même profil que forest-bench
  var ENEMY = "wolf";        // la Meute affamée est le premier groupe prévu (§5.1)
  var ADVENTURE = 0;         // Lisière

  console.log("Banc Groupe — " + boot.scriptCount + " scripts chargés, " + RUNS + " runs par cellule.");
  console.log("Héros SEUL (le côté compagnon arrive au lot L-2), nu, entraînement +" + TRAINED + ", loups de Lisière.");
  console.log("Cible de référence : un boss de Forêt coûte ~40 % des PV (acté 10/09/2026).\n");

  var out = {};

  /* v3.267.0 : les classes à distance (arc, magie) laissent l'ennemi approcher pendant
     engageIn rounds avant qu'il ne frappe (v3.105.0). À plusieurs, les membres approchent
     TOUS EN MÊME TEMPS : un groupe affaibli meurt avant d'arriver au contact, et le
     Mage ne perd rien. Ce mode compare l'arrivée simultanée à une arrivée décalée. */
  /* v3.268.0 (L-2) : ce que Wenna change. On regarde ce que le héros économise, ce
     qu'elle encaisse à sa place (menace pondérée, §6.2), et combien de fois elle tombe. */
  if (MODE === "--ally") {
    console.log("Effet d'un compagnon Soutien (Wenna, Auto) — héros seul vs héros + Wenna\n");
    [1, 2].forEach(function (count) {
      var mult = (count === 1) ? 1 : 0.50;
      HEROES.forEach(function (h) {
        var solo = measure(g, run, h.id, TRAINED, ENEMY, count, ADVENTURE, mult, true, null);
        var duo = measure(g, run, h.id, TRAINED, ENEMY, count, ADVENTURE, mult, true, "wenna");
        out["ally|" + count + "|" + h.id] = duo;
        var gain = (solo.hpLostPct - duo.hpLostPct) * 100;
        console.log(("1 c. " + count + " · " + h.label).padEnd(14)
          + "seul " + Math.round(solo.hpLostPct * 100) + "%pv " + solo.rounds.toFixed(1) + "rd"
          + "   |   à deux " + Math.round(duo.hpLostPct * 100) + "%pv " + duo.rounds.toFixed(1) + "rd"
          + " · Wenna " + Math.round(duo.allyLostPct * 100) + "%pv, KO " + Math.round(duo.allyKoRate * 100) + "%"
          + "   |   gain héros " + (gain >= 0 ? "+" : "") + gain.toFixed(1) + " pts");
      });
      console.log("");
    });
    return;
  }

  if (MODE === "--engage") {
    console.log("Arrivée au contact d'un groupe — simultanée (état actuel) vs décalée (0/1/2 rounds)\n");
    [0.35, 0.45].forEach(function (mult) {
      [false, true].forEach(function (stagger) {
        var cells = HEROES.map(function (h) {
          var m = measure(g, run, h.id, TRAINED, ENEMY, 3, ADVENTURE, mult, stagger);
          out["engage|" + mult + "|" + (stagger ? "decalee" : "simultanee") + "|" + h.id] = m;
          return cell(h.label, m);
        });
        console.log(("1 contre 3 · ×" + mult.toFixed(2) + " · " + (stagger ? "décalée" : "simultanée")).padEnd(34) + cells.join("   "));
      });
      console.log("");
    });
    return;
  }

  if (MODE === "--sweep") {
    console.log("Balayage de groupHpMult — coût d'une meute selon les PV de chaque membre\n");
    var MULTS = [0.35, 0.45, 0.55, 0.70, 1.00];
    [2, 3].forEach(function (count) {
      MULTS.forEach(function (mult) {
        var cells = HEROES.map(function (h) {
          var m = measure(g, run, h.id, TRAINED, ENEMY, count, ADVENTURE, mult);
          out[count + "|" + mult + "|" + h.id] = m;
          return cell(h.label, m);
        });
        console.log(("1 contre " + count + " · ×" + mult.toFixed(2)).padEnd(26) + cells.join("   "));
      });
      console.log("");
    });
    return;
  }

  [1, 2, 3].forEach(function (count) {
    var cells = HEROES.map(function (h) {
      var m = measure(g, run, h.id, TRAINED, ENEMY, count, ADVENTURE, 1);
      out[count + "|1|" + h.id] = m;
      return cell(h.label, m);
    });
    console.log(("1 contre " + count + " · PV pleins").padEnd(26) + cells.join("   "));
  });

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
