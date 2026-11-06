"use strict";
/* tools/sim/charge-bench.js — banc des profils de CHARGE ennemie (compte rendu de conception du 05/11, §4 et §9).
   Vrai moteur chargé dans un vm ; rien du jeu ne change : le profil est posé par ENVELOPPES dans le contexte du banc.

   Profils : ref ×1,30 (jeu actuel) · c1 ×1,40 + Déséquilibré 10 % · c2 ×1,50 + 15 % · c3 ×1,60 + 15 % · ctrl ×1,70.
   Déséquilibré (choix du banc, ouverts du document) :
     - posé si la Charge retire des PV à sa victime (esquive du Rôdeur = pas posé ; KO de la victime = pas posé) ;
     - un seul à la fois par victime : la frappe suivante le consomme, même esquivée, même venant d'un autre ennemi ;
     - le bonus multiplie la frappe AVANT critique, défense et Défense de classe (même étage que le multiplicateur de Charge) ;
     - expire après 2 fins de round (round de la Charge compris), au KO de la victime et à chaque nouveau combat ;
     - contre parfait : la Charge n'a pas lieu, donc ni dégâts ni Déséquilibré (aucune enveloppe nécessaire).
   Enveloppes : ENEMY_CHARGE_DMG_MULT (global du contexte), CombatEngine.resolveEnemyCharge (victime et PV),
   VeinSystem.takeSort (la victime est tirée UNE fois, comme enemyStrike le ferait, puis rendue avec le bonus),
   CombatEngine.endRoundGroup (expiration), CombatEngine.spawnGroup (nouveau combat). Compteurs en lecture seule.

   Héros : sauvegardes réelles du robot (--joueur), à l'entrée de l'étape de la quête jouée (captures/charge-bench/saves,
   produites par : SAVE_OUT=<f> node tools/sim/campagne-harness.js . --combats --joueur --classe <c> --jusqua <étape>).
   Politiques : « contre » = Grimoire de la sauvegarde (règle Charge → Défense comprise) ; « sans » = même Grimoire sans
   la règle Charge (les autres règles, offensives, restent). Potion à la main sous 30 % comme le robot.

   USAGE : node tools/sim/charge-bench.js . [--runs 200] [--classes knight,ranger,mage] [--scen coeur,gouffre,...]
           [--profils ref,c1,c2,c3,ctrl] [--politiques contre,sans] [--saves dossier]
           node tools/sim/charge-bench.js . --verif [--runs 40]   Référence enveloppée = moteur nu, run par run
           node tools/sim/charge-bench.js . --leviers --profils p0,p1,p2,p3,p4 [--p5 p1,p3 --tag leviers-p5]
             leviers du contre (option C, Seb 06/11) : captures/charge-bench/<tag>-<runs>runs.txt et .json */
var fs = require("fs"), path = require("path"), vm = require("vm"), cp = require("child_process");
var CH = require("../chemins.js");
var ROOT = CH.jeu(process.argv[2]);
var ARGS = process.argv.slice(3);
function opt(k, d) { var i = ARGS.indexOf(k); return i >= 0 ? ARGS[i + 1] : d; }
var RUNS = Number(opt("--runs", 200));
var SAVES = opt("--saves", path.join(CH.DEPOT, "captures", "charge-bench", "saves"));
var WORKER = ARGS.indexOf("--worker") >= 0, VERIF = ARGS.indexOf("--verif") >= 0;

var PROFILS = {
  ref: { label: "Référence ×1,30", mult: 1.3, deseq: 0 },
  c1: { label: "C1 ×1,40 +10 %", mult: 1.4, deseq: 0.10 },
  c2: { label: "C2 ×1,50 +15 %", mult: 1.5, deseq: 0.15 },
  c3: { label: "C3 ×1,60 +15 %", mult: 1.6, deseq: 0.15 },
  ctrl: { label: "Contrôle ×1,70", mult: 1.7, deseq: 0 },
  // Leviers du contre (Seb 06/11, option C) : Charge ×1,30, seul le contre change (enveloppes, voir installLeviers)
  p0: { label: "P0 Référence", mult: 1.3, deseq: 0, lev: {} },
  p1: { label: "P1 Contre protecteur", mult: 1.3, deseq: 0, lev: { groupe: true } },
  p2: { label: "P2 Contre offensif", mult: 1.3, deseq: 0, lev: { vuln: true } },
  p3: { label: "P3 Contre rapide", mult: 1.3, deseq: 0, lev: { rejoue: true } },
  p4: { label: "P4 Barrière 15", mult: 1.3, deseq: 0, lev: { barriere: true } },
  p5: { label: "P5 combinaison", mult: 1.3, deseq: 0, lev: null },   // posé par --p5 a,b (ex. --p5 p1,p3)
  // v3.730.0 : le jeu tel quel (P5 en jeu), moteur nu sans enveloppe ; compteurs couvert/rejoués en lecture seule
  jeu: { label: "Jeu (moteur nu)", nu: true }
};
(function () {   // P5 = union des leviers de deux profils
  var v = opt("--p5", null); if (!v) return;
  var l = {}; v.split(",").forEach(function (k) { Object.assign(l, PROFILS[k].lev); });
  PROFILS.p5.lev = l; PROFILS.p5.label = "P5 " + v.replace(",", "+").toUpperCase();
})();
// Scénarios : la quête de l'étape, jouée en entier (rencontres enchaînées sans soin, comme en jeu)
var SCENARIOS = {
  coeur: { step: "forest_12", quest: "aq_story_coeur", label: "Forêt · Tenir le Cœur (10 seuls)" },
  gouffre: { step: "desert_08", quest: "aq_desert_gouffre", label: "Désert · Le gouffre (3 seuls)" },
  nuee: { step: "desert_10", quest: "aq_desert_nuee", label: "Désert · La nuée (5 groupes + 1 seul)" },
  couloirs: { step: "ruines_02", quest: "aq_ruines_couloirs", label: "Ruines · Couloirs (3 seuls + 2 groupes)" },
  sepulcres: { step: "crypte_02", quest: "aq_crypte_sepulcres", label: "Crypte · Sépulcres (4 groupes + 1 seul)" },
  pentes: { step: "montagne_02", quest: "aq_montagne_pentes", label: "Montagne · Pentes (4 groupes + 1 seul)" },
  // v3.731.0 (Seb 06/11, piste C) : ajouté en dernier, les graines des autres scénarios ne bougent pas
  tries: { step: "montagne_18", quest: "aq_montagne_tries", label: "Montagne · Ceux qu'il a triés (4 groupes)" }
};
var CHAPITRE = { aq_story_coeur: "forest", aq_desert_gouffre: "desert", aq_desert_nuee: "desert", aq_ruines_couloirs: "ruins", aq_crypte_sepulcres: "crypt", aq_montagne_pentes: "mountain", aq_montagne_tries: "mountain" };
var CLASSES = { knight: "Chevalier", ranger: "Rôdeur", mage: "Mage" };
var POLITIQUES = { contre: "Grimoire avec contre de Charge", sans: "Grimoire sans contre de Charge" };
function liste(k, all) { var v = opt(k, null); return v ? v.split(",") : Object.keys(all); }
var L_CLASSES = liste("--classes", CLASSES), L_SCEN = liste("--scen", SCENARIOS), L_PROF = liste("--profils", PROFILS), L_POL = liste("--politiques", POLITIQUES);

/* ---------- Bac à sable (même socle que campagne-harness.js), hasard et horloge fixés ---------- */
var SCRIPTS = require("../harness/index-scripts.js")(ROOT, /pwa\.js/);
var SOURCES = SCRIPTS.map(function (s) { return { name: s, code: fs.readFileSync(path.join(ROOT, s), "utf8") }; });
var rng = 1;
function seed(s) { rng = (s >>> 0) || 1; }
function rand() { rng = (rng + 0x6D2B79F5) >>> 0; var t = rng; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
var CLOCK = { now: Date.UTC(2026, 9, 1, 8) };
var RealDate = Date;
function FakeDate() {
  var a = Array.prototype.slice.call(arguments);
  if (!(this instanceof FakeDate)) return new RealDate(CLOCK.now).toString();
  return a.length ? new (Function.prototype.bind.apply(RealDate, [null].concat(a)))() : new RealDate(CLOCK.now);
}
FakeDate.now = function () { return CLOCK.now; }; FakeDate.parse = RealDate.parse; FakeDate.UTC = RealDate.UTC; FakeDate.prototype = RealDate.prototype;
function el() {
  return { style: { setProperty: function () {}, removeProperty: function () {} }, classList: { add: function () {}, remove: function () {}, toggle: function () {}, contains: function () { return false; } },
    innerHTML: "", textContent: "", value: "", scrollTop: 0, disabled: false, querySelector: function () { return null; }, querySelectorAll: function () { return []; },
    addEventListener: function () {}, setAttribute: function () {}, getAttribute: function () { return null; }, appendChild: function () {}, removeChild: function () {},
    remove: function () {}, hasChildNodes: function () { return false; }, focus: function () {}, dataset: {}, offsetWidth: 0, parentNode: null,
    getBoundingClientRect: function () { return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0 }; }, clientWidth: 0, clientHeight: 0 };
}
function launch() {
  var timers = [], store = {}, M = Object.create(Math);
  M.random = rand;
  var sb = { console: { log: function () {}, warn: function () {}, error: function () {} },
    Date: FakeDate, Math: M, JSON: JSON, Object: Object, Array: Array, Number: Number, String: String, Boolean: Boolean,
    setTimeout: function (fn) { timers.push(fn); return timers.length; }, clearTimeout: function () {}, setInterval: function () { return 0; }, clearInterval: function () {},
    requestAnimationFrame: function () {}, performance: { now: function () { return CLOCK.now; } },
    navigator: { serviceWorker: null, userAgent: "vm", vibrate: function () {} }, location: { href: "", search: "", hash: "", protocol: "https:" },
    localStorage: { getItem: function (k) { return store.hasOwnProperty(k) ? store[k] : null; }, setItem: function (k, v) { store[k] = String(v); }, removeItem: function (k) { delete store[k]; }, key: function (i) { return Object.keys(store)[i] || null; }, get length() { return Object.keys(store).length; } },
    document: { getElementById: function () { return el(); }, querySelector: function () { return null; }, querySelectorAll: function () { return []; }, createElement: function () { return el(); }, addEventListener: function () {}, body: el(), documentElement: el(), hidden: false, activeElement: null, readyState: "complete" },
    alert: function () {}, confirm: function () { return true; }, atob: function (s) { return Buffer.from(s, "base64").toString("binary"); }, btoa: function (s) { return Buffer.from(s, "binary").toString("base64"); },
    structuredClone: function (v) { return JSON.parse(JSON.stringify(v)); }, TextEncoder: TextEncoder, TextDecoder: TextDecoder, URL: URL, Blob: function () {} };
  sb.window = sb; sb.self = sb; sb.globalThis = sb; sb.addEventListener = function () {}; sb.removeEventListener = function () {};
  vm.createContext(sb);
  SOURCES.forEach(function (s) { vm.runInContext(s.code, sb, { filename: s.name }); });
  sb.__flush = function () { for (var n = 0; n < 5 && timers.length; n++) timers.splice(0).forEach(function (fn) { try { if (typeof fn === "function") fn(); } catch (e) {} }); };
  return sb;
}

/* ---------- Instrumentation (lecture seule) et profil (enveloppes) ---------- */
function instrument(g, profil) {
  var CE = g.CombatEngine, S = { st: null }, P = profil;
  g.__S = S;
  function rec() { return S.st; }
  function wrap(obj, name, fn) { var o = obj[name]; obj[name] = function () { return fn.call(this, o, arguments); }; }
  // Compteurs
  wrap(CE, "telegraphPattern", function (o, a) { var e = a[0], r = o.apply(this, a); if (rec() && a[1] === "charge" && e && e.chargeTelegraphed) rec().annonces++; return r; });
  wrap(CE, "rescheduleCounteredPattern", function (o, a) { if (rec() && a[0] === "chargeIncoming") rec().contrees++; return o.apply(this, a); });
  wrap(CE, "beginRound", function (o, a) { if (rec()) { rec().rounds++; if (rec().cur) rec().cur.r++; } return o.apply(this, a); });
  wrap(g.CompanionManager, "noteKo", function (o, a) { if (rec()) rec().ko++; return o.apply(this, a); });
  wrap(g.PotionManager, "useHealingPotion", function (o, a) { var r = o.apply(this, a); if (r === true && rec()) rec().potions++; return r; });
  wrap(CE, "onHeroDefeated", function (o, a) {
    var ca = g.CombatActors && g.CombatActors.ensure(), rose0 = !!(ca && ca.heroRose), r = o.apply(this, a);
    var rose = !rose0 && ca && ca.heroRose && g.game.heroHp > 0;
    if (!rose && rec()) rec().mort = true;
    return r;
  });
  if (!P) return S;
  // Profil : multiplicateur de Charge (lu par resolveEnemyCharge et estimateCounterValue)
  g.ENEMY_CHARGE_DMG_MULT = P.mult;
  var status = [];   // Déséquilibré : [{ actor, left }]
  function find(actor) { for (var i = 0; i < status.length; i++) if (status[i].actor === actor) return i; return -1; }
  function hpOf(actor) { return g.CombatActors.isHero(actor) ? Number(g.game.heroHp || 0) : Number(actor.hp || 0); }
  var strike = null;   // la frappe en cours : victime, PV avant, bonus appliqué, Charge ou non
  wrap(g.VeinSystem, "takeSort", function (o, a) {
    var sorted = o.apply(this, a);
    var victim = sorted ? sorted.actor : CE.pickVictim();   // le tirage qu'aurait fait enemyStrike, une seule fois
    var bonus = 1, k = find(victim);
    if (k >= 0) { bonus = 1 + P.deseq; status.splice(k, 1); }
    strike = { victim: victim, hp0: hpOf(victim), bonus: bonus, charge: !!S.inCharge };
    return { actor: victim, mult: (sorted ? sorted.mult : 1) * bonus };
  });
  wrap(CE, "enemyStrike", function (o, a) {
    var outer = strike; strike = null;
    var r = o.apply(this, a), s = strike;
    if (s && rec()) {
      var dmg = Math.max(0, s.hp0 - hpOf(s.victim));
      if (s.charge) {
        rec().subies++; rec().degatsCharge += dmg;
        if (!g.CombatActors.isHero(s.victim)) rec().subiesComp++;
        if (dmg > 0 && hpOf(s.victim) > 0 && P.deseq > 0 && find(s.victim) < 0) { status.push({ actor: s.victim, left: 2 }); rec().poses++; }
      }
      if (s.bonus > 1) { rec().declenches++; rec().degatsDeseq += dmg - Math.round(dmg / s.bonus); }
    }
    strike = outer;
    return r;
  });
  wrap(CE, "resolveEnemyCharge", function (o, a) { S.inCharge = true; try { return o.apply(this, a); } finally { S.inCharge = false; } });
  wrap(CE, "endRoundGroup", function (o, a) {
    var r = o.apply(this, a);
    for (var i = status.length - 1; i >= 0; i--) { status[i].left -= 1; if (status[i].left <= 0 || hpOf(status[i].actor) <= 0) status.splice(i, 1); }
    return r;
  });
  S.clear = function () { status.length = 0; strike = null; if (S.clearLev) S.clearLev(); };
  if (P.lev) installLeviers(g, S, P.lev);
  return S;
}
/* Leviers du contre. « Annonce » = Charge, Silence, Exaltation (les annonces que contre la Défense de classe).
   groupe  (P1) : une Défense jouée sur une règle d'annonce couvre les compagnons tant que CETTE Défense dure
                  (même fenêtre que pour le héros : Garde/Esquive 1 round, Barrière 2) ; réduction ou absorption =
                  multiplicateur de la frappe, esquive = tirée par le chance() du jeu (frappe réduite à 1 PV).
                  La Charge contrée, elle, est déjà annulée pour tout le groupe (rescheduleCounteredPattern) : rien à envelopper.
   vuln    (P2) : Charge contrée -> l'émetteur prend +25 % de tous les dealDamage (héros, compagnons, DoT), 2 fins de round.
   rejoue  (P3) : Charge contrée -> après la Défense, le héros joue une attaque de base (playerAttack + jauge de célérité).
   barriere(P4) : Barrière du Mage à 50 % du coût (30 -> 15) pour une règle d'annonce : choix du Grimoire (règle par règle),
                  réserve d'approche (règle de contre prioritaire) et dépense réelle (useSkill). */
var ANNONCES = { chargeIncoming: 1, enemySilenceIncoming: 1, eliteSurgeIncoming: 1 };
function installLeviers(g, S, L) {
  var CE = g.CombatEngine, CCM = g.ClassCombatManager, L0 = S.lev = { couvert: 0, rejoues: 0, vulnDeg: 0, remises: 0 };
  function wrap(obj, name, fn) { var o = obj[name]; obj[name] = function () { return fn.call(this, o, arguments); }; }
  function rec() { return S.st; }
  var cover = null, vuln = [], chargeContree = false, remise = false;
  function isMage() { return CCM.getCurrentClassId() === "mage"; }
  function remiseKit(kit) {
    if (!kit || !kit.actions || !kit.actions.defense || !isMage()) return kit;
    var d = Object.assign({}, kit.actions.defense, { resourceCost: Math.round(Number(kit.actions.defense.resourceCost || 0) * 0.5) });
    return Object.assign({}, kit, { actions: Object.assign({}, kit.actions, { defense: d }) });
  }
  wrap(CE, "rescheduleCounteredPattern", function (o, a) {
    if (a[0] === "chargeIncoming") {
      chargeContree = true;
      if (L.vuln) { var e = a[1] || g.game.enemy; if (e) { vuln = vuln.filter(function (v) { return v.e !== e; }); vuln.push({ e: e, left: 2 }); } }
    }
    return o.apply(this, a);
  });
  wrap(CCM, "useSkill", function (o, a) {
    var slot = a[0], cond = a[1], annonce = slot === "defense" && !!ANNONCES[cond];
    chargeContree = false; remise = !!(L.barriere && annonce);
    var r;
    try { r = o.apply(this, a); } finally { remise = false; }
    if (r && annonce && L.groupe) cover = g.game.classActiveDefense || null;
    if (r && annonce && L.barriere && isMage() && rec()) rec().remises++;
    if (r && chargeContree && L.rejoue && g.game.enemy && g.game.heroHp > 0) {
      CE.playerAttack(false); CE.afterOffensiveAction();
      if (rec()) rec().rejoues++;
    }
    chargeContree = false;
    return r;
  });
  if (L.barriere) {
    wrap(CCM, "getAction", function (o, a) {
      var act = o.apply(this, a);
      if (!remise || a[0] !== "defense" || !act || !isMage()) return act;
      return Object.assign({}, act, { resourceCost: Math.round(Number(act.resourceCost || 0) * 0.5) });
    });
    wrap(g, "chooseGrimoireAction", function (o, a) {   // règle par règle : la remise ne vaut que pour une règle d'annonce
      var rules = a[0], kit = a[1];
      if (!Array.isArray(rules)) return o.apply(this, a);
      for (var i = 0; i < rules.length; i++) {
        var ru = rules[i], k = (ru && ru.actionSlot === "defense" && ANNONCES[ru.conditionId]) ? remiseKit(kit) : kit;
        var r = o.call(this, [ru], k, a[2], a[3], a[4]);
        if (r) return r;
      }
      return null;
    });
    function prioRemise(rules, kit) {
      var ru = g.getPrioritaryCounterRule(rules, kit, g.game.enemy);
      return ru && ru.actionSlot === "defense" && ANNONCES[ru.conditionId];
    }
    wrap(g, "getGrimoireCounterReserveAmount", function (o, a) { return o.call(this, a[0], prioRemise(a[0], a[1]) ? remiseKit(a[1]) : a[1], a[2]); });
    wrap(CCM, "shouldActivateGrimoireReserve", function (o, a) { return o.call(this, a[0], prioRemise(a[0], a[1]) ? remiseKit(a[1]) : a[1], a[2]); });
  }
  if (L.groupe) {
    wrap(CE, "enemyStrikeCompanion", function (o, a) {
      var act = CCM.getActiveDefenseEffect();
      if (!cover || act !== cover) return o.apply(this, a);
      var m = (typeof a[2] === "number" && a[2] > 0) ? a[2] : 1;
      if (act.effectType === "evasion") { if (g.chance(act.value * 100)) m = 1e-9; }
      else m = m * (1 - act.value);
      if (rec()) rec().couvert++;
      return o.call(this, a[0], a[1], m, a[3]);
    });
  }
  if (L.vuln) {
    wrap(CE, "dealDamage", function (o, a) {
      var foe = a[4] || g.game.enemy;
      for (var i = 0; i < vuln.length; i++) if (vuln[i].e === foe) {
        var d0 = Math.max(0, Number(a[0] || 0)); a[0] = d0 * 1.25;
        if (rec()) rec().vulnDeg += d0 * 0.25;
        break;
      }
      return o.apply(this, a);
    });
    wrap(CE, "endRoundGroup", function (o, a) {
      var r = o.apply(this, a);
      for (var i = vuln.length - 1; i >= 0; i--) { vuln[i].left -= 1; if (vuln[i].left <= 0 || Number(vuln[i].e.hp || 0) <= 0) vuln.splice(i, 1); }
      return r;
    });
  }
  S.clearLev = function () { cover = null; vuln.length = 0; chargeContree = false; remise = false; };
}
/* Moteur nu (profil « jeu ») : compte les frappes couvertes et les tours rendus, sans rien changer au moteur. */
function compteursJeu(g, S) {
  var CE = g.CombatEngine, CCM = g.ClassCombatManager, dans = 0;
  function wrap(obj, name, fn) { var o = obj[name]; obj[name] = function () { return fn.call(this, o, arguments); }; }
  wrap(CE, "enemyStrikeCompanion", function (o, a) { if (S.st && CCM.groupDefenseEffect && CCM.groupDefenseEffect()) S.st.couvert++; return o.apply(this, a); });
  wrap(CCM, "useSkill", function (o, a) { dans++; try { return o.apply(this, a); } finally { dans--; } });
  wrap(CE, "playerAttack", function (o, a) { if (dans && a[0] !== true && S.st) S.st.rejoues++; return o.apply(this, a); });
  return S;
}
// Nouveau combat (groupe posé, ou ennemi seul) : relevé par rencontre, Déséquilibré effacé (sans effet sur le moteur)
function suivreCombats(g, S) {
  var CA = g.CombatActors, o = CA.setEnemies;
  CA.setEnemies = function (list) {
    var avant = CA.enemies().slice(), r = o.apply(this, arguments), apres = CA.enemies();
    if (S.st && apres.length && (apres.length !== avant.length || apres.some(function (e, i) { return e !== avant[i]; }))) {
      if (S.clear) S.clear();
      S.st.cur = { r: 0, n: apres.length };
      S.st.combats.push(S.st.cur);
    }
    return r;
  };
}

/* ---------- Un run : la quête de l'étape, de bout en bout ---------- */
function prepare(g, saveTxt, politique, quest, chapitre) {
  g.fullResetState();
  g.restoreBaseState(JSON.parse(saveTxt));
  g.ensureGrimoireRules();
  var R = g.game.grimoireRules;
  if (!R.some(function (r) { return r && r.conditionId === "chargeIncoming"; })) {   // Forêt : le premier Grimoire du robot (charge → Défense)
    var i0 = R.findIndex(function (r) { return !r || !r.conditionId; });
    R[i0 < 0 ? 0 : i0] = { conditionId: "chargeIncoming", actionSlot: "defense" };
  }
  if (politique === "sans") g.game.grimoireRules = R.map(function (r) { return r && r.conditionId === "chargeIncoming" ? { conditionId: null, actionSlot: null } : r; });
  g.game.unlockedTabs.grimoire = true;
  g.game.combatMode = "grimoire";
  g.EquipmentManager.recalcStats();
  g.game.heroHp = g.game.heroMaxHp;
  g.CompanionManager.healAll();
  g.CombatEngine.ensureState();
  // La voie de Maddoc (desert_08) : le premier choix de l'étape, comme le robot (choiceStep)
  var st = g.StoryQuestManager.getCurrentStep(chapitre), q = g.ADVENTURE_QUESTS[quest];
  if (q && q.requiresVoie && st && st.choice && !g.CompanionManager.state(q.requiresVoie).voie) g.storyMakeChoice(chapitre, st.choice.options[0].value);
}
function playRun(g, S, saveTxt, quest, politique, s) {
  seed(s); CLOCK.now = Date.UTC(2026, 9, 1, 8);
  prepare(g, saveTxt, politique, quest, CHAPITRE[quest]);
  g.game.adventureQuestsCompleted[quest] = false; delete g.game.adventureQuestsCompleted[quest];
  var st = S.st = { rounds: 0, annonces: 0, contrees: 0, subies: 0, subiesComp: 0, degatsCharge: 0, poses: 0, declenches: 0, degatsDeseq: 0, ko: 0, potions: 0, mort: false, combats: [], cur: null, trace: 0,
    couvert: 0, rejoues: 0, vulnDeg: 0, remises: 0 };
  g.AdventureQuestManager.start(quest);
  g.__flush();
  var CE = g.CombatEngine, stall = 0, last = -1;
  for (var t = 0; t < 4000 && g.game.adventureQuestRun.active && !st.mort && g.game.heroHp > 0; t++) {
    g.game.activeTab = "combat";
    if (g.game.heroHp / (g.game.heroMaxHp || 1) < 0.30) {   // le robot : potion à la main sous 30 %
      var pid = ["potion_soin_majeur", "potion_soin_mineur"].filter(function (id) { return (g.game.healingPotionsOwned || {})[id] > 0; })[0];
      if (pid && CE.isHeroTurnAvailable()) CE.heroAction("potion", pid);
    }
    CE.tickRoundClock(1.5);
    CLOCK.now += 1500;
    g.__flush();
    st.trace = (st.trace * 31 + Math.floor(g.game.heroHp) + 7 * st.rounds) % 1000000007;   // empreinte de la partie (vérification)
    if (st.rounds === last) { if (++stall > 60) { st.fige = true; break; } } else { stall = 0; last = st.rounds; }
  }
  var win = !!g.game.adventureQuestsCompleted[quest];
  var hp = Math.max(0, g.game.heroHp) / (g.game.heroMaxHp || 1);
  if (g.game.adventureQuestRun.active) { try { g.AdventureQuestManager.forfeit && g.AdventureQuestManager.forfeit(); } catch (e) {} }
  S.st = null;
  return { win: win, hp: win ? hp : 0, rounds: st.rounds, combats: st.combats.map(function (c) { return [c.r, c.n]; }), ko: st.ko, potions: st.potions,
    annonces: st.annonces, contrees: st.contrees, subies: st.subies, subiesComp: st.subiesComp, degatsCharge: st.degatsCharge,
    poses: st.poses, declenches: st.declenches, degatsDeseq: st.degatsDeseq, fige: !!st.fige, trace: st.trace, maxHp: g.game.heroMaxHp,
    couvert: st.couvert, rejoues: st.rejoues, vulnDeg: Math.round(st.vulnDeg), remises: st.remises };
}
function saveFor(classe, scen) { return fs.readFileSync(path.join(SAVES, classe + "_" + SCENARIOS[scen].step + ".json"), "utf8"); }
function seedFor(scenIdx, i) { return 500000 + scenIdx * 10000 + i; }

/* ---------- Agrégats ---------- */
function q(arr, p) { if (!arr.length) return 0; var s = arr.slice().sort(function (a, b) { return a - b; }); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))]; }
function agg(runs) {
  // Durées par combat : rencontres d'au moins un round (une rencontre posée après la dernière victoire est ignorée)
  var n = runs.length, W = runs.filter(function (r) { return r.win; }), per = [], solo = [], grp = [];
  runs.forEach(function (r) { r.combats.forEach(function (c) { if (c[0] > 0) { per.push(c[0]); (c[1] > 1 ? grp : solo).push(c[0]); } }); });
  function sum(k) { return runs.reduce(function (a, r) { return a + r[k]; }, 0); }
  return { n: n, win: W.length / n, hpMoy: W.length ? W.reduce(function (a, r) { return a + r.hp; }, 0) / W.length : 0,
    roundsRunMed: q(runs.map(function (r) { return r.rounds; }), 0.5), roundsRunP90: q(runs.map(function (r) { return r.rounds; }), 0.9),
    combatMed: q(per, 0.5), combatP90: q(per, 0.9), soloMed: q(solo, 0.5), soloP90: q(solo, 0.9), groupeMed: q(grp, 0.5), groupeP90: q(grp, 0.9), nSolo: solo.length / n, nGroupe: grp.length / n, koParRun: sum("ko") / n, koRuns: runs.filter(function (r) { return r.ko > 0; }).length / n,
    potions: sum("potions") / n, annonces: sum("annonces") / n, contrees: sum("contrees") / n, subies: sum("subies") / n, subiesComp: sum("subiesComp") / n,
    degatsChargePctPv: sum("degatsCharge") / n / (runs[0] ? runs[0].maxHp : 1), declenches: sum("declenches") / n,
    degatsDeseqPctPv: sum("degatsDeseq") / n / (runs[0] ? runs[0].maxHp : 1),
    couvert: sum("couvert") / n, rejoues: sum("rejoues") / n, vulnDeg: sum("vulnDeg") / n, remises: sum("remises") / n, figes: runs.filter(function (r) { return r.fige; }).length };
}

/* ---------- Worker : une classe ---------- */
function worker() {
  var classe = L_CLASSES[0], out = {};
  var g = launch(), S = instrument(g, null), prof = null;
  // Un bac à sable par profil : les enveloppes ne se cumulent pas
  L_PROF.forEach(function (pid) {
    g = launch(); S = PROFILS[pid].nu ? compteursJeu(g, instrument(g, null)) : instrument(g, PROFILS[pid]); suivreCombats(g, S);
    L_SCEN.forEach(function (sid) {
      var txt = saveFor(classe, sid), si = Object.keys(SCENARIOS).indexOf(sid);
      L_POL.forEach(function (pol) {
        var runs = [];
        for (var i = 0; i < RUNS; i++) runs.push(playRun(g, S, txt, SCENARIOS[sid].quest, pol, seedFor(si, i)));
        out[[pid, classe, sid, pol].join("|")] = { agg: agg(runs), runs: runs.map(function (r) { if (!PROFILS[pid].lev && !PROFILS[pid].nu) delete r.trace; return r; }) };
        process.stderr.write(".");
      });
    });
  });
  fs.writeFileSync(opt("--out"), JSON.stringify(out));
}

/* ---------- Vérification : Référence enveloppée = moteur nu ---------- */
function verif() {
  var n = Number(opt("--runs", 40)), ecarts = 0, total = 0, lignes = [];
  L_CLASSES.forEach(function (classe) {
    var gNu = launch(), sNu = instrument(gNu, null); suivreCombats(gNu, sNu);
    var gRef = launch(), sRef = instrument(gRef, PROFILS.ref); suivreCombats(gRef, sRef);
    var gC2 = launch(), sC2 = instrument(gC2, PROFILS.c2); suivreCombats(gC2, sC2);
    L_SCEN.forEach(function (sid) {
      var txt = saveFor(classe, sid), si = Object.keys(SCENARIOS).indexOf(sid), diff = 0, diffC2 = 0;
      L_POL.forEach(function (pol) {
        for (var i = 0; i < n; i++) {
          var a = playRun(gNu, sNu, txt, SCENARIOS[sid].quest, pol, seedFor(si, i));
          var b = playRun(gRef, sRef, txt, SCENARIOS[sid].quest, pol, seedFor(si, i));
          var c = playRun(gC2, sC2, txt, SCENARIOS[sid].quest, pol, seedFor(si, i));
          total++;
          if (a.trace !== b.trace || a.win !== b.win || a.rounds !== b.rounds || a.hp !== b.hp) { diff++; ecarts++; }
          if (a.trace !== c.trace) diffC2++;
        }
      });
      lignes.push("  " + CLASSES[classe].padEnd(10) + sid.padEnd(10) + " Référence ≠ nu : " + diff + " / " + (n * L_POL.length) + "   (C2 ≠ nu : " + diffC2 + ")");
    });
  });
  console.log("VÉRIFICATION — même graine, moteur nu contre Référence enveloppée (empreinte PV/rounds de chaque tick)");
  lignes.forEach(function (l) { console.log(l); });
  console.log(ecarts === 0 ? "OK : " + total + " parties identiques." : "ÉCART : " + ecarts + " / " + total);
  process.exit(ecarts === 0 ? 0 : 1);
}

/* ---------- Principal : un worker par classe, puis tableaux ---------- */
function pct(x) { return String(Math.round(100 * x)).padStart(3) + " %"; }
function main() {
  var dir = CH.captures("charge-bench"), t0 = Date.now();
  var jobs = L_CLASSES.map(function (c) {
    var out = path.join(dir, "part-" + c + ".json");
    var args = [__filename, ROOT, "--worker", "--classes", c, "--runs", String(RUNS), "--scen", L_SCEN.join(","), "--profils", L_PROF.join(","), "--politiques", L_POL.join(","), "--saves", SAVES, "--out", out];
    return new Promise(function (res, rej) {
      var p = cp.spawn(process.execPath, args, { stdio: ["ignore", "inherit", "inherit"] });
      p.on("exit", function (code) { code ? rej(new Error("worker " + c + " : code " + code)) : res(JSON.parse(fs.readFileSync(out, "utf8"))); });
    });
  });
  Promise.all(jobs).then(function (parts) {
    var all = {}; parts.forEach(function (p) { Object.assign(all, p); });
    var brut = path.join(dir, "charge-bench-" + RUNS + "runs.json");
    fs.writeFileSync(brut, JSON.stringify({ date: new RealDate().toISOString(), runs: RUNS, profils: PROFILS, scenarios: SCENARIOS, cellules: all }));
    var resume = {};
    Object.keys(all).forEach(function (k) { resume[k] = all[k].agg; });
    fs.writeFileSync(path.join(dir, "charge-bench-resume.json"), JSON.stringify(resume, null, 1));
    console.log("\n\nBANC DE LA CHARGE — " + RUNS + " runs par cellule (quête entière, graines fixes), " + ((Date.now() - t0) / 60000).toFixed(1) + " min");
    L_POL.forEach(function (pol) {
      console.log("\n=== " + POLITIQUES[pol] + " ===");
      console.log("victoire / PV restants (victoires) / rounds par combat méd.-p90 / KO compagnons par run / potions / Charges annoncées-contrées-subies / dégâts Charge, Déséquilibré (% PV max)");
      L_SCEN.forEach(function (sid) {
        console.log("\n " + SCENARIOS[sid].label);
        L_CLASSES.forEach(function (c) {
          L_PROF.forEach(function (pid) {
            var a = resume[[pid, c, sid, pol].join("|")];
            console.log("   " + CLASSES[c].padEnd(10) + pid.padEnd(5) + pct(a.win) + "  PV " + pct(a.hpMoy) + "  r/c " + String(a.combatMed).padStart(2) + "-" + String(a.combatP90).padStart(2)
              + "  KO " + a.koParRun.toFixed(2) + "  pot " + a.potions.toFixed(2) + "  Ch " + a.annonces.toFixed(1) + "/" + a.contrees.toFixed(1) + "/" + a.subies.toFixed(1)
              + "  dég " + Math.round(100 * a.degatsChargePctPv) + "/" + Math.round(100 * a.degatsDeseqPctPv) + " %" + (a.figes ? "  figés " + a.figes : ""));
          });
        });
      });
    });
    console.log("\nJSON brut : " + brut);
  }).catch(function (e) { console.error(e.message); process.exit(1); });
}

/* ---------- Leviers du contre : une tâche par classe × profil (4 à la fois), puis synthèse ---------- */
function mainLeviers() {
  var dir = CH.captures("charge-bench"), t0 = Date.now(), tag = opt("--tag", "leviers");
  var taches = []; L_CLASSES.forEach(function (c) { L_PROF.forEach(function (pid) { taches.push([c, pid]); }); });
  var all = {}, k = 0, actifs = 0;
  return new Promise(function (fin, echec) {
    function suivante() {
      if (k >= taches.length) { if (!actifs) fin(); return; }
      var t = taches[k++], out = path.join(dir, "part-" + tag + "-" + t[0] + "-" + t[1] + ".json"); actifs++;
      var args = [__filename, ROOT, "--worker", "--classes", t[0], "--runs", String(RUNS), "--scen", L_SCEN.join(","), "--profils", t[1], "--politiques", L_POL.join(","), "--saves", SAVES, "--out", out];
      if (opt("--p5", null)) args.push("--p5", opt("--p5"));
      var pr = cp.spawn(process.execPath, args, { stdio: ["ignore", "ignore", "inherit"] });
      pr.on("exit", function (code) {
        actifs--;
        if (code) return echec(new Error("worker " + t.join("/") + " : code " + code));
        Object.assign(all, JSON.parse(fs.readFileSync(out, "utf8"))); fs.unlinkSync(out);
        suivante();
      });
    }
    for (var i = 0; i < 4; i++) suivante();
  }).then(function () {
    var brut = path.join(dir, tag + "-" + RUNS + "runs.json");
    fs.writeFileSync(brut, JSON.stringify({ date: new RealDate().toISOString(), runs: RUNS, profils: PROFILS, scenarios: SCENARIOS, cellules: all }));
    var txt = rapportLeviers(all, RUNS, (Date.now() - t0) / 60000, brut);
    fs.writeFileSync(path.join(dir, tag + "-" + RUNS + "runs.txt"), txt);
    console.log(txt);
  });
}
function rapportLeviers(all, runs, minutes, brut) {
  var out = [], AV = ["gouffre", "nuee", "couloirs", "sepulcres"].filter(function (x) { return L_SCEN.indexOf(x) >= 0; });
  function A(pid, c, sid, pol) { var x = all[[pid, c, sid, pol].join("|")]; return x ? x.agg : null; }
  function moy(pid, c, pol, scens, key) { var v = scens.map(function (sid) { return A(pid, c, sid, pol)[key]; }); return v.reduce(function (a, b) { return a + b; }, 0) / v.length; }
  function p(x) { return (x >= 0 ? " " : "") + (100 * x).toFixed(1).padStart(5); }
  function sg(x, d) { return (x >= 0 ? "+" : "") + x.toFixed(d); }
  var KEYS = [["win", "vict", function (x) { return (100 * x).toFixed(1).padStart(5) + "%"; }], ["hpMoy", "PV", function (x) { return (100 * x).toFixed(1).padStart(5) + "%"; }],
    ["koParRun", "KO/run", function (x) { return x.toFixed(2).padStart(5); }], ["degatsChargePctPv", "dégCh", function (x) { return (100 * x).toFixed(0).padStart(4) + "%"; }],
    ["roundsRunMed", "r méd", function (x) { return x.toFixed(1).padStart(5); }], ["roundsRunP90", "r p90", function (x) { return x.toFixed(1).padStart(5); }]];
  out.push("BANC DES LEVIERS DU CONTRE (Charge ×1,30) — " + runs + " runs par cellule, graines fixes, " + minutes.toFixed(1) + " min");
  out.push("Profils : " + L_PROF.map(function (k) { return k + " = " + PROFILS[k].label; }).join(" · "));
  function bloc(titre, scens) {
    out.push("\n=== " + titre + " ===");
    out.push("classe     prof pol    " + KEYS.map(function (k) { return k[1].padStart(6); }).join(" ") + "   contrées/annoncées  (couvert, rejoués, remises/run)");
    L_CLASSES.forEach(function (c) {
      L_PROF.forEach(function (pid) {
        L_POL.forEach(function (pol) {
          var l = CLASSES[c].padEnd(10) + " " + pid.padEnd(4) + " " + pol.padEnd(6) + " " + KEYS.map(function (k) { return k[2](moy(pid, c, pol, scens, k[0])).padStart(6); }).join(" ");
          l += "   " + moy(pid, c, pol, scens, "contrees").toFixed(2) + "/" + moy(pid, c, pol, scens, "annonces").toFixed(2);
          l += "  (" + moy(pid, c, pol, scens, "couvert").toFixed(1) + ", " + moy(pid, c, pol, scens, "rejoues").toFixed(1) + ", " + moy(pid, c, pol, scens, "remises").toFixed(1) + ")";
          out.push(l);
        });
      });
      out.push("");
    });
    out.push("--- Écart « contre − sans » (" + titre + ") : victoire pts, PV pts, KO/run, rounds méd., rounds p90 ---");
    L_CLASSES.forEach(function (c) {
      L_PROF.forEach(function (pid) {
        function d(key) { return moy(pid, c, "contre", scens, key) - moy(pid, c, "sans", scens, key); }
        out.push(CLASSES[c].padEnd(10) + " " + pid.padEnd(4) + "  vict " + sg(100 * d("win"), 1).padStart(6) + "   PV " + sg(100 * d("hpMoy"), 1).padStart(6)
          + "   KO " + sg(d("koParRun"), 2).padStart(6) + "   r méd " + sg(d("roundsRunMed"), 1).padStart(5) + "   r p90 " + sg(d("roundsRunP90"), 1).padStart(5));
      });
    });
  }
  if (AV.length) bloc("Moyenne des scénarios avec Charge hors Montagne (" + AV.join(", ") + ")", AV);
  if (L_SCEN.indexOf("pentes") >= 0) bloc("Montagne · Pentes (aq_montagne_pentes), à part", ["pentes"]);
  // Détail par scénario
  out.push("\n=== Détail par scénario (victoire / PV / KO/run / dégâts Charge % PV / rounds méd-p90 / contrées-annoncées) ===");
  L_SCEN.forEach(function (sid) {
    out.push("\n " + SCENARIOS[sid].label);
    L_CLASSES.forEach(function (c) {
      L_PROF.forEach(function (pid) {
        out.push("   " + CLASSES[c].padEnd(10) + pid.padEnd(4) + L_POL.map(function (pol) {
          var a = A(pid, c, sid, pol);
          return pol + " " + (100 * a.win).toFixed(0).padStart(3) + "% " + (100 * a.hpMoy).toFixed(0).padStart(3) + "% KO " + a.koParRun.toFixed(2) + " dég " + (100 * a.degatsChargePctPv).toFixed(0).padStart(3)
            + "% r " + a.roundsRunMed + "-" + a.roundsRunP90 + " Ch " + a.contrees.toFixed(1) + "/" + a.annonces.toFixed(1);
        }).join("  |  "));
      });
    });
  });
  // Invariance de « sans » : même graine, empreinte de chaque tick comparée à P0
  if (L_PROF.indexOf("p0") >= 0 && L_POL.indexOf("sans") >= 0) {
    out.push("\n=== Politique « sans » : parties ≠ P0 (empreinte tick par tick, même graine) / " + runs + " — et écart de victoire ===");
    L_PROF.filter(function (x) { return x !== "p0"; }).forEach(function (pid) {
      var l = pid.padEnd(4);
      L_CLASSES.forEach(function (c) {
        l += "  " + CLASSES[c] + " : " + L_SCEN.map(function (sid) {
          var a = all[["p0", c, sid, "sans"].join("|")].runs, b = all[[pid, c, sid, "sans"].join("|")].runs, n = 0;
          for (var i = 0; i < a.length; i++) if (a[i].trace !== b[i].trace) n++;
          var dw = 100 * (A(pid, c, sid, "sans").win - A("p0", c, sid, "sans").win);
          return sid.slice(0, 4) + " " + n + (n ? " (" + sg(dw, 1) + ")" : "");
        }).join(", ");
      });
      out.push(l);
    });
  }
  out.push("\nJSON brut : " + brut);
  return out.join("\n");
}

if (require.main !== module) module.exports = { launch: launch, instrument: instrument, suivreCombats: suivreCombats, prepare: prepare, playRun: playRun, saveFor: saveFor, PROFILS: PROFILS, SCENARIOS: SCENARIOS };
else if (WORKER) worker(); else if (VERIF) verif();
else if (ARGS.indexOf("--leviers") >= 0) mainLeviers().catch(function (e) { console.error(e.message); process.exit(1); });
else main();
