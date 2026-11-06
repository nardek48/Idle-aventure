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
           node tools/sim/charge-bench.js . --verif [--runs 40]   Référence enveloppée = moteur nu, run par run */
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
  ctrl: { label: "Contrôle ×1,70", mult: 1.7, deseq: 0 }
};
// Scénarios : la quête de l'étape, jouée en entier (rencontres enchaînées sans soin, comme en jeu)
var SCENARIOS = {
  coeur: { step: "forest_12", quest: "aq_story_coeur", label: "Forêt · Tenir le Cœur (10 seuls)" },
  gouffre: { step: "desert_08", quest: "aq_desert_gouffre", label: "Désert · Le gouffre (3 seuls)" },
  nuee: { step: "desert_10", quest: "aq_desert_nuee", label: "Désert · La nuée (5 groupes + 1 seul)" },
  couloirs: { step: "ruines_02", quest: "aq_ruines_couloirs", label: "Ruines · Couloirs (3 seuls + 2 groupes)" },
  sepulcres: { step: "crypte_02", quest: "aq_crypte_sepulcres", label: "Crypte · Sépulcres (4 groupes + 1 seul)" },
  pentes: { step: "montagne_02", quest: "aq_montagne_pentes", label: "Montagne · Pentes (4 groupes + 1 seul)" }
};
var CHAPITRE = { aq_story_coeur: "forest", aq_desert_gouffre: "desert", aq_desert_nuee: "desert", aq_ruines_couloirs: "ruins", aq_crypte_sepulcres: "crypt", aq_montagne_pentes: "mountain" };
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
  S.clear = function () { status.length = 0; strike = null; };
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
  var st = S.st = { rounds: 0, annonces: 0, contrees: 0, subies: 0, subiesComp: 0, degatsCharge: 0, poses: 0, declenches: 0, degatsDeseq: 0, ko: 0, potions: 0, mort: false, combats: [], cur: null, trace: 0 };
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
    poses: st.poses, declenches: st.declenches, degatsDeseq: st.degatsDeseq, fige: !!st.fige, trace: st.trace, maxHp: g.game.heroMaxHp };
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
    degatsDeseqPctPv: sum("degatsDeseq") / n / (runs[0] ? runs[0].maxHp : 1), figes: runs.filter(function (r) { return r.fige; }).length };
}

/* ---------- Worker : une classe ---------- */
function worker() {
  var classe = L_CLASSES[0], out = {};
  var g = launch(), S = instrument(g, null), prof = null;
  // Un bac à sable par profil : les enveloppes ne se cumulent pas
  L_PROF.forEach(function (pid) {
    g = launch(); S = instrument(g, PROFILS[pid]); suivreCombats(g, S);
    L_SCEN.forEach(function (sid) {
      var txt = saveFor(classe, sid), si = Object.keys(SCENARIOS).indexOf(sid);
      L_POL.forEach(function (pol) {
        var runs = [];
        for (var i = 0; i < RUNS; i++) runs.push(playRun(g, S, txt, SCENARIOS[sid].quest, pol, seedFor(si, i)));
        out[[pid, classe, sid, pol].join("|")] = { agg: agg(runs), runs: runs.map(function (r) { delete r.trace; return r; }) };
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

if (require.main !== module) module.exports = { launch: launch, instrument: instrument, suivreCombats: suivreCombats, prepare: prepare, playRun: playRun, saveFor: saveFor, PROFILS: PROFILS, SCENARIOS: SCENARIOS };
else if (WORKER) worker(); else if (VERIF) verif(); else main();
