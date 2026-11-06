"use strict";
/* tools/sim/bouclier-soin-bench.js — banc du BOUCLIER et du SOIN DES BOSS (compte rendu de conception du 05/11, §5, §6, §9).
   Vrai moteur dans un vm (socle de charge-bench.js) ; rien du jeu ne change : les profils sont posés dans le contexte du banc.

   Profils (non cumulés) :
     jeu  moteur nu (compteurs en lecture seule)          ref  Référence enveloppée : 50 % / 2 rounds, 15 % des PV actuels
     b1   bouclier 60 % / 2 rounds                          b2   bouclier 50 % / 3 rounds
     s1   soin 10 % des PV max, plafonné aux PV manquants   s2   soin 12 % des PV actuels
   Enveloppes : BOSS_SHIELD_REDUCTION, BOSS_SHIELD_DURATION_ROUNDS, BOSS_HEAL_PERCENT (globales du contexte, lues à l'exécution) ;
   CombatEngine.resolveBossHeal (PV rendus recalculés depuis les PV d'avant, même Sépulcre, pour TOUS les profils enveloppés :
   la Référence passe donc par le même chemin, d'où la vérification) ; estimateCounterValue("healIncoming") en S1.
   Fréquence du soin, suspension pendant les renforts de phase et contre (P5, v3.730.0) : moteur tel quel.

   Scénarios : quêtes de boss de monde jouées en entier et deux donjons (sortie de l'Histoire), sauvegardes du robot
   (--joueur) à l'entrée de l'étape : captures/bouclier-soin/saves (SAVE_IN/SAVE_OUT de campagne-harness.js).

   USAGE : node tools/sim/bouclier-soin-bench.js . [--runs 200] [--classes knight,ranger,mage] [--scen orc,...] [--profils jeu,ref,b1,b2,s1,s2]
           node tools/sim/bouclier-soin-bench.js . --verif [--runs 40]   Référence enveloppée = moteur nu, partie par partie */
var fs = require("fs"), path = require("path"), cp = require("child_process");
var CB = require("./charge-bench.js");
var CH = require("../chemins.js");
var ROOT = CH.jeu(process.argv[2]);
var ARGS = process.argv.slice(3);
function opt(k, d) { var i = ARGS.indexOf(k); return i >= 0 ? ARGS[i + 1] : d; }
var RUNS = Number(opt("--runs", 200));
var SAVES = opt("--saves", path.join(CH.DEPOT, "captures", "bouclier-soin", "saves"));
var WORKER = ARGS.indexOf("--worker") >= 0, VERIF = ARGS.indexOf("--verif") >= 0;

var PROFILS = {
  jeu: { label: "Jeu (moteur nu)", nu: true },
  ref: { label: "Référence 50 %/2 r · 15 % PV actuels", red: 0.5, dur: 2, heal: "cur", pct: 0.15 },
  b1: { label: "B1 bouclier 60 %/2 r", red: 0.6, dur: 2, heal: "cur", pct: 0.15 },
  b2: { label: "B2 bouclier 50 %/3 r", red: 0.5, dur: 3, heal: "cur", pct: 0.15 },
  s1: { label: "S1 soin 10 % PV max (plafonné)", red: 0.5, dur: 2, heal: "max", pct: 0.10 },
  s2: { label: "S2 soin 12 % PV actuels", red: 0.5, dur: 2, heal: "cur", pct: 0.12 }
};
// quest : quête d'aventure jouée en entier ; dungeon : sortie de donjon de l'Histoire (toutes les vagues + boss)
var SCENARIOS = {
  orc: { step: "forest_15", chap: "forest", quest: "aq_forest_depths", label: "Forêt · Seigneur de guerre orc (20 kills + boss)" },
  basilic: { step: "forest_14", chap: "forest", dungeon: 1, label: "Donjon 1 · Basilic (phases + renforts)" },
  nezzam: { step: "desert_17", chap: "desert", quest: "aq_desert_trone", label: "Désert · Nezzam (3 rencontres + boss, renfort)" },
  varrek: { step: "ruines_15", chap: "ruins", dungeon: 3, label: "Donjon 3 · Varrek (Ruines, relève)" },
  plan: { step: "ruines_19", chap: "ruins", quest: "aq_ruines_plan", label: "Ruines · Maître d'œuvre (Bâtisseurs + boss)" },
  liche: { step: "crypte_19", chap: "crypt", quest: "aq_crypte_retient", label: "Crypte · Nécromancien suprême (renforts)" },
  dragon: { step: "montagne_19", chap: "mountain", quest: "aq_montagne_dragon", label: "Montagne · Dragon ancien (renforts)" },
  silhouette: { step: "tour_18", chap: "tower", quest: "aq_tour_silhouette", label: "Tour · La silhouette (boss seul)" },
  // Trolls (« shielded » ordinaire) : sauvegarde de charge-bench (forest_12), copiée dans le dossier du banc
  coeur: { step: "forest_12", chap: "forest", quest: "aq_story_coeur", label: "Forêt · Tenir le Cœur (10 seuls, Trolls)" }
};
var CLASSES = { knight: "Chevalier", ranger: "Rôdeur", mage: "Mage" };
function liste(k, all) { var v = opt(k, null); return v ? v.split(",") : Object.keys(all); }
var L_CLASSES = liste("--classes", CLASSES), L_SCEN = liste("--scen", SCENARIOS), L_PROF = liste("--profils", PROFILS);

/* ---------- Compteurs (lecture seule) ---------- */
function wrap(obj, name, fn) { var o = obj[name]; obj[name] = function () { return fn.call(this, o, arguments); }; }
function instrument(g) {
  var CE = g.CombatEngine, CCM = g.ClassCombatManager, RS = g.RiseSystem, S = { st: null };
  function rec() { return S.st; }
  function cur() { return S.st && S.st.cur; }
  wrap(CE, "beginRound", function (o, a) { if (rec()) { rec().rounds++; if (cur()) cur().r++; } return o.apply(this, a); });
  wrap(g.CompanionManager, "noteKo", function (o, a) { if (rec()) rec().ko++; return o.apply(this, a); });
  wrap(g.PotionManager, "useHealingPotion", function (o, a) { var r = o.apply(this, a); if (r === true && rec()) rec().potions++; return r; });
  wrap(CE, "onHeroDefeated", function (o, a) {
    var ca = g.CombatActors && g.CombatActors.ensure(), rose0 = !!(ca && ca.heroRose), r = o.apply(this, a);
    if (!(!rose0 && ca && ca.heroRose && g.game.heroHp > 0) && rec()) rec().mort = true;
    return r;
  });
  // ressource de classe dépensée par les techniques (Rage, Concentration, Mana)
  wrap(CCM, "useSkill", function (o, a) {
    var rs = g.game.classResource, b = rs ? Number(rs.current || 0) : 0, r = o.apply(this, a);
    var rs2 = g.game.classResource, d = rs2 ? b - Number(rs2.current || 0) : 0;
    if (rec() && r) { rec().tech++; if (d > 0) rec().res += d; }
    return r;
  });
  function kind(e) { return !e ? "?" : (e.isBoss && !e.isElite) ? "boss" : e.isElite ? "elite" : (RS && RS.isSupport(e)) ? "bat" : "shielded"; }
  wrap(CE, "telegraphPattern", function (o, a) {
    var e = a[0], k = a[1], r = o.apply(this, a);
    if (rec() && e) {
      if (k === "shield" && e.shieldTelegraphed) rec().tel["sh_" + kind(e)] = (rec().tel["sh_" + kind(e)] || 0) + 1;
      if (k === "heal" && e.healTelegraphed) rec().tel.heal = (rec().tel.heal || 0) + 1;
    }
    return r;
  });
  wrap(CE, "rescheduleCounteredPattern", function (o, a) {
    if (rec()) { if (a[0] === "shieldIncoming") rec().ctrShield++; if (a[0] === "healIncoming") rec().ctrHeal++; }
    return o.apply(this, a);
  });
  wrap(CE, "resolveBossShield", function (o, a) {
    var e = g.game.enemy, all = g.CombatActors ? g.CombatActors.enemies() : [], w0 = all.map(function (x) { return !!x.wallShield; });
    var r = o.apply(this, a);
    if (rec() && e) {
      var wall = e;
      all.forEach(function (x, i) { if (x !== e && x.wallShield && !w0[i]) wall = x; });
      if (wall === e) all.forEach(function (x) { if (x !== e && x.wallShield && Number(x.shieldRounds || 0) === g.BOSS_SHIELD_DURATION_ROUNDS) wall = x; });
      var k = kind(e); rec().sh[k] = (rec().sh[k] || 0) + 1;
      if (wall !== e) { rec().shAllie++; if (RS && RS.isSupport(wall)) rec().shSoutien++; if (wall.hasRisen) rec().shReleve++; if (wall.isBoss && !wall.isElite) rec().shBoss++; }
    }
    return r;
  });
  wrap(CE, "resolveBossHeal", function (o, a) {
    var e = g.game.enemy, h0 = e ? Number(e.hp || 0) : 0, r = o.apply(this, a);
    if (rec() && e) { var d = Number(e.hp || 0) - h0; rec().soins++; rec().soinPct += d / Math.max(1, e.maxHp); if (h0 / Math.max(1, e.maxHp) < 0.3) rec().soinsBas++; if (cur()) cur().soins++; }
    return r;
  });
  wrap(CE, "bossHealSuspended", function (o, a) { var r = o.apply(this, a); if (r && rec()) rec().suspendu++; return r; });
  // dégâts retenus par un bouclier actif (estimés depuis les PV réellement perdus et la réduction en vigueur)
  wrap(CE, "dealDamage", function (o, a) {
    var foe = a[4] || g.game.enemy;
    var on = foe && (foe.isBoss || foe.archetype === "shielded" || foe.wallShield) && Number(foe.shieldRounds || 0) > 0;
    var h0 = foe ? Number(foe.hp || 0) : 0, r = o.apply(this, a);
    if (on && rec()) {
      var R = (g.CombatItems && g.CombatItems.holds("shielded")) ? g.COMBAT_ITEM_ACID_SHIELD_REDUCTION : g.BOSS_SHIELD_REDUCTION;
      var d = Math.max(0, h0 - Math.max(0, Number(foe.hp || 0)));
      rec().coupsBouclier++; rec().absorbe += R < 1 ? d * R / (1 - R) : 0; rec().degTotal += d;
    } else if (rec() && foe) rec().degTotal += Math.max(0, h0 - Math.max(0, Number(foe.hp || 0)));
    return r;
  });
  // relevé par rencontre (boss ou non)
  var CA = g.CombatActors, oSet = CA.setEnemies;
  CA.setEnemies = function (list) {
    var avant = CA.enemies().slice(), r = oSet.apply(this, arguments), apres = CA.enemies();
    if (S.st && apres.length && (apres.length !== avant.length || apres.some(function (e, i) { return e !== avant[i] && avant.indexOf(e) < 0; }))) {
      var boss = apres.some(function (e) { return e.isBoss && !e.isElite; }), suite = S.st.cur && S.st.cur.boss && boss && avant.some(function (e) { return apres.indexOf(e) >= 0 && e.isBoss && !e.isElite; });
      if (!suite) { S.st.cur = { r: 0, boss: boss, elite: apres.some(function (e) { return e.isElite; }), soins: 0 }; S.st.combats.push(S.st.cur); }
    }
    return r;
  };
  return S;
}

/* ---------- Profil (enveloppes) ---------- */
function applyProfil(g, P) {
  if (P.nu) return;
  var CE = g.CombatEngine;
  g.BOSS_SHIELD_REDUCTION = P.red; g.BOSS_SHIELD_DURATION_ROUNDS = P.dur; g.BOSS_HEAL_PERCENT = P.pct;
  function amount(e, h0) {
    var m = g.uniquePowerMult("dun_sepulcre");
    if (P.heal === "max") return Math.max(1, Math.min(Math.max(0, e.maxHp - h0), Math.floor(Number(e.maxHp || 0) * P.pct * m)));
    return Math.max(1, Math.floor(h0 * P.pct * m));
  }
  // posé AVANT les compteurs : ceux-ci lisent les PV rendus réellement
  wrap(CE, "resolveBossHeal", function (o, a) {
    var e = g.game.enemy; if (!e) return o.apply(this, a);
    var h0 = Number(e.hp || 0), r = o.apply(this, a);
    e.hp = Math.min(e.maxHp, h0 + amount(e, h0));
    return r;
  });
  if (P.heal === "max") wrap(CE, "estimateCounterValue", function (o, a) {
    if (a[0] === "healIncoming" && g.game.enemy) { var e = g.game.enemy; return Math.max(1, Math.min(Math.max(0, e.maxHp - e.hp), Math.floor(e.maxHp * P.pct))); }
    return o.apply(this, a);
  });
}

/* ---------- Un run ---------- */
function prepare(g, saveTxt, sc) {
  g.fullResetState();
  g.restoreBaseState(JSON.parse(saveTxt));
  g.ensureGrimoireRules();
  g.game.unlockedTabs.grimoire = true;
  g.game.combatMode = "grimoire";
  // donjon : la sortie de l'Histoire, comme une première fois (le robot a pu déjà le finir en farmant : sinon vivres et victoire faussée)
  if (sc.dungeon && g.game.dungeonTierCleared) delete g.game.dungeonTierCleared[sc.dungeon];
  // l'étape est acceptée, comme le robot avant de jouer (onglets, ticket de donjon de l'Histoire)
  var st = g.StoryQuestManager.getCurrentStep(sc.chap);
  if (st && st.id === sc.step) { try { g.StoryQuestManager.acceptStep(sc.chap); } catch (e) {} }
  g.EquipmentManager.recalcStats();
  g.game.heroHp = g.game.heroMaxHp;
  g.CompanionManager.healAll();
  g.CombatEngine.ensureState();
  var q = sc.quest && g.ADVENTURE_QUESTS[sc.quest];
  st = g.StoryQuestManager.getCurrentStep(sc.chap);
  if (q && q.requiresVoie && st && st.choice && !g.CompanionManager.state(q.requiresVoie).voie) g.storyMakeChoice(sc.chap, st.choice.options[0].value);
}
function playRun(g, S, saveTxt, sc, s) {
  CB.seed(s); CB.CLOCK.now = Date.UTC(2026, 9, 1, 8);
  prepare(g, saveTxt, sc);
  var st = S.st = { rounds: 0, ko: 0, potions: 0, mort: false, tech: 0, res: 0, tel: {}, sh: {}, shAllie: 0, shSoutien: 0, shReleve: 0, shBoss: 0,
    ctrShield: 0, ctrHeal: 0, soins: 0, soinPct: 0, soinsBas: 0, suspendu: 0, coupsBouclier: 0, absorbe: 0, degTotal: 0, combats: [], cur: null, trace: 0, entree: true };
  var D = g.DungeonManager, active;
  if (sc.dungeon) {
    D.start(sc.dungeon, []);
    st.entree = !!g.game.dungeonRun.active;
    active = function () { return g.game.dungeonRun && g.game.dungeonRun.active; };
  } else {
    delete g.game.adventureQuestsCompleted[sc.quest];
    g.AdventureQuestManager.start(sc.quest);
    st.entree = !!g.game.adventureQuestRun.active;
    active = function () { return g.game.adventureQuestRun.active; };
  }
  g.__flush();
  var CE = g.CombatEngine, stall = 0, last = -1, t;
  for (t = 0; t < 12000 && active() && !st.mort && g.game.heroHp > 0; t++) {
    g.game.activeTab = "combat";
    if (D.isCampPending && D.isCampPending()) { D.campAction("souffler"); g.__flush(); continue; }
    if (g.game.heroHp / (g.game.heroMaxHp || 1) < 0.30) {   // le robot : potion à la main sous 30 %
      var pid = ["potion_soin_majeur", "potion_soin_mineur"].filter(function (id) { return (g.game.healingPotionsOwned || {})[id] > 0; })[0];
      if (pid && CE.isHeroTurnAvailable()) CE.heroAction("potion", pid);
    }
    CE.tickRoundClock(1.5);
    CB.CLOCK.now += 1500;
    g.__flush();
    g.StoryQuestManager._trackKills();
    if (sc.dungeon && active()) g.StoryQuestManager._checkNow();
    if (g.closeBossFinal) g.closeBossFinal();
    st.trace = (st.trace * 31 + Math.floor(g.game.heroHp) + 7 * st.rounds) % 1000000007;
    if (st.rounds === last) { if (++stall > 60) { st.fige = true; break; } } else { stall = 0; last = st.rounds; }
  }
  var win = sc.dungeon ? !!(g.game.dungeonTierCleared || {})[sc.dungeon] : !!g.game.adventureQuestsCompleted[sc.quest];
  var timeout = !win && !st.mort && g.game.heroHp > 0 && active();
  var hp = Math.max(0, g.game.heroHp) / (g.game.heroMaxHp || 1);
  if (sc.dungeon) { if (active()) try { D.forfeit(); } catch (e) {} }
  else if (g.game.adventureQuestRun.active) { try { g.AdventureQuestManager.forfeit && g.AdventureQuestManager.forfeit(); } catch (e) {} }
  S.st = null;
  var boss = st.combats.filter(function (c) { return c.boss && c.r > 0; });
  return { win: win, hp: win ? hp : 0, rounds: st.rounds, bossR: boss.length ? boss[boss.length - 1].r : 0, bossVu: boss.length > 0,
    ko: st.ko, potions: st.potions, tech: st.tech, res: Math.round(st.res), tel: st.tel, sh: st.sh, shAllie: st.shAllie, shSoutien: st.shSoutien, shReleve: st.shReleve, shBoss: st.shBoss,
    ctrShield: st.ctrShield, ctrHeal: st.ctrHeal, soins: st.soins, soinPct: st.soinPct, soinsBas: st.soinsBas, suspendu: st.suspendu,
    coupsBouclier: st.coupsBouclier, absorbePct: st.degTotal ? st.absorbe / st.degTotal : 0, fige: !!st.fige, timeout: timeout, entree: st.entree, trace: st.trace, mort: st.mort };
}
function saveFor(classe, sid) { return fs.readFileSync(path.join(SAVES, classe + "_" + SCENARIOS[sid].step + ".json"), "utf8"); }
function seedFor(si, i) { return 700000 + si * 10000 + i; }

/* ---------- Agrégats ---------- */
function q(arr, p) { if (!arr.length) return 0; var s = arr.slice().sort(function (a, b) { return a - b; }); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))]; }
function agg(runs) {
  var n = runs.length, W = runs.filter(function (r) { return r.win; });
  function moy(k) { return runs.reduce(function (a, r) { return a + (typeof k === "function" ? k(r) : r[k]); }, 0) / n; }
  var bossW = W.filter(function (r) { return r.bossR > 0; }).map(function (r) { return r.bossR; });
  var bossAll = runs.filter(function (r) { return r.bossVu; }).map(function (r) { return r.bossR; });
  var runW = W.map(function (r) { return r.rounds; });
  function sumObj(k) { var o = {}; runs.forEach(function (r) { Object.keys(r[k]).forEach(function (x) { o[x] = (o[x] || 0) + r[k][x] / n; }); }); return o; }
  return { n: n, win: W.length / n, hpMoy: W.length ? W.reduce(function (a, r) { return a + r.hp; }, 0) / W.length : 0,
    runMed: q(runW, 0.5), runP90: q(runW, 0.9), bossMed: q(bossW, 0.5), bossP90: q(bossW, 0.9), bossMax: bossAll.length ? Math.max.apply(null, bossAll) : 0,
    bossVu: runs.filter(function (r) { return r.bossVu; }).length / n,
    ko: moy("ko"), potions: moy("potions"), tech: moy("tech"), res: moy("res"), tel: sumObj("tel"), sh: sumObj("sh"),
    shAllie: moy("shAllie"), shSoutien: moy("shSoutien"), shReleve: moy("shReleve"), shBoss: moy("shBoss"),
    ctrShield: moy("ctrShield"), ctrHeal: moy("ctrHeal"), soins: moy("soins"), soinPct: moy("soinPct"), soinsBas: moy("soinsBas"), suspendu: moy("suspendu"),
    coupsBouclier: moy("coupsBouclier"), absorbePct: moy("absorbePct"), morts: runs.filter(function (r) { return r.mort; }).length,
    figes: runs.filter(function (r) { return r.fige; }).length, timeouts: runs.filter(function (r) { return r.timeout; }).length,
    entreesRefusees: runs.filter(function (r) { return !r.entree; }).length };
}

/* ---------- Worker : une classe × un profil ---------- */
function worker() {
  var classe = L_CLASSES[0], pid = L_PROF[0], out = {};
  var g = CB.launch(); applyProfil(g, PROFILS[pid]); var S = instrument(g);
  L_SCEN.forEach(function (sid) {
    var txt = saveFor(classe, sid), si = Object.keys(SCENARIOS).indexOf(sid), runs = [];
    var n = SCENARIOS[sid].dungeon ? Math.min(RUNS, Number(opt("--runs-donjon", 100))) : RUNS;
    for (var i = 0; i < n; i++) runs.push(playRun(g, S, txt, SCENARIOS[sid], seedFor(si, i)));
    out[[pid, classe, sid].join("|")] = { agg: agg(runs), runs: runs };
    process.stderr.write(".");
  });
  fs.writeFileSync(opt("--out"), JSON.stringify(out));
}

/* ---------- Vérification : Référence enveloppée = moteur nu ---------- */
function verif() {
  var n = Number(opt("--runs", 40)), ecarts = 0, total = 0, lignes = [];
  L_CLASSES.forEach(function (classe) {
    var gNu = CB.launch(), sNu = instrument(gNu);
    var gRef = CB.launch(); applyProfil(gRef, PROFILS.ref); var sRef = instrument(gRef);
    var gS1 = CB.launch(); applyProfil(gS1, PROFILS.s1); var sS1 = instrument(gS1);
    L_SCEN.forEach(function (sid) {
      var txt = saveFor(classe, sid), si = Object.keys(SCENARIOS).indexOf(sid), diff = 0, dS1 = 0, w = 0;
      for (var i = 0; i < n; i++) {
        var a = playRun(gNu, sNu, txt, SCENARIOS[sid], seedFor(si, i)), b = playRun(gRef, sRef, txt, SCENARIOS[sid], seedFor(si, i)), c = playRun(gS1, sS1, txt, SCENARIOS[sid], seedFor(si, i));
        total++; if (a.win) w++;
        if (a.trace !== b.trace || a.win !== b.win || a.rounds !== b.rounds || a.hp !== b.hp || a.soinPct !== b.soinPct) { diff++; ecarts++; }
        if (a.trace !== c.trace) dS1++;
      }
      lignes.push("  " + CLASSES[classe].padEnd(10) + sid.padEnd(11) + " Référence ≠ nu : " + diff + " / " + n + "   (S1 ≠ nu : " + dS1 + ", victoires nu " + w + "/" + n + ")");
    });
  });
  var txt = ["VÉRIFICATION — même graine, moteur nu contre Référence enveloppée (empreinte PV/rounds de chaque tick, PV rendus)"].concat(lignes)
    .concat([ecarts === 0 ? "OK : " + total + " parties identiques." : "ÉCART : " + ecarts + " / " + total]).join("\n");
  fs.writeFileSync(path.join(CH.captures("bouclier-soin"), "verif-" + n + "runs.txt"), txt + "\n");
  console.log(txt);
  process.exit(ecarts === 0 ? 0 : 1);
}

/* ---------- Principal : une tâche par classe × profil (4 à la fois), puis tableaux ---------- */
function main() {
  var dir = CH.captures("bouclier-soin"), t0 = Date.now(), tag = opt("--tag", "bouclier-soin");
  var taches = []; L_CLASSES.forEach(function (c) { L_PROF.forEach(function (p) { taches.push([c, p]); }); });
  var all = {}, k = 0, actifs = 0;
  new Promise(function (fin, echec) {
    function suivante() {
      if (k >= taches.length) { if (!actifs) fin(); return; }
      var t = taches[k++], out = path.join(dir, "part-" + t[0] + "-" + t[1] + ".json"); actifs++;
      var args = [__filename, ROOT, "--worker", "--classes", t[0], "--profils", t[1], "--runs", String(RUNS), "--runs-donjon", opt("--runs-donjon", "100"), "--scen", L_SCEN.join(","), "--saves", SAVES, "--out", out];
      var pr = cp.spawn(process.execPath, args, { stdio: ["ignore", "ignore", "inherit"] });
      pr.on("exit", function (code) {
        actifs--;
        if (code) return echec(new Error("worker " + t.join("/") + " : code " + code));
        Object.assign(all, JSON.parse(fs.readFileSync(out, "utf8"))); fs.unlinkSync(out);
        suivante();
      });
    }
    for (var i = 0; i < Number(opt("--jobs", 4)); i++) suivante();
  }).then(function () {
    var brut = path.join(dir, tag + "-" + RUNS + "runs.json");
    fs.writeFileSync(brut, JSON.stringify({ date: new Date().toISOString(), runs: RUNS, profils: PROFILS, scenarios: SCENARIOS, cellules: all }));
    var resume = {}; Object.keys(all).forEach(function (x) { resume[x] = all[x].agg; });
    fs.writeFileSync(path.join(dir, tag + "-resume.json"), JSON.stringify(resume, null, 1));
    var txt = rapport(all, (Date.now() - t0) / 60000, brut);
    fs.writeFileSync(path.join(dir, tag + "-" + RUNS + "runs.txt"), txt);
    console.log(txt);
  }).catch(function (e) { console.error(e.message); process.exit(1); });
}
function rapport(all, minutes, brut) {
  var out = [];
  function p0(x) { return (100 * x).toFixed(0).padStart(3) + "%"; }
  function obj(o) { return Object.keys(o).sort().map(function (k) { return k + " " + o[k].toFixed(1); }).join(" "); }
  out.push("BANC BOUCLIER / SOIN DES BOSS — " + RUNS + " parties par cellule (donjons : " + opt("--runs-donjon", "100") + "), graines fixes, " + minutes.toFixed(1) + " min");
  out.push("Profils : " + L_PROF.map(function (k) { return k + " = " + PROFILS[k].label; }).join(" · "));
  out.push("Colonnes : victoires · PV restants (victoires) · rounds de la partie gagnée méd/p90 · rounds du combat de boss gagné méd/p90 (max vu)"
    + " · potions · ressource dépensée · KO comp. · soins/partie (PV rendus, % PV max du boss ; contrés) · boucliers posés (contrés ; sur un allié/soutien/relevé) · part des dégâts retenue par bouclier"
    + " · morts / figés / hors délai");
  L_SCEN.forEach(function (sid) {
    out.push("\n " + SCENARIOS[sid].label);
    L_CLASSES.forEach(function (c) {
      L_PROF.forEach(function (pid) {
        var x = all[[pid, c, sid].join("|")]; if (!x) return; var a = x.agg;
        var nsh = Object.keys(a.sh).reduce(function (s, k) { return s + a.sh[k]; }, 0);
        out.push("   " + CLASSES[c].padEnd(10) + pid.padEnd(4) + p0(a.win) + "  PV " + p0(a.hpMoy) + "  run " + String(a.runMed).padStart(3) + "/" + String(a.runP90).padStart(3)
          + "  boss " + String(a.bossMed).padStart(3) + "/" + String(a.bossP90).padStart(3) + " (" + a.bossMax + ")"
          + "  pot " + a.potions.toFixed(2) + "  res " + Math.round(a.res).toString().padStart(4) + "  KO " + a.ko.toFixed(2)
          + "  soin " + a.soins.toFixed(2) + " (" + (100 * a.soinPct).toFixed(0) + " % ; c " + a.ctrHeal.toFixed(2) + ")"
          + "  bouc " + nsh.toFixed(2) + " (c " + a.ctrShield.toFixed(2) + " ; " + a.shAllie.toFixed(2) + "/" + a.shSoutien.toFixed(2) + "/" + a.shReleve.toFixed(2) + ")"
          + "  ret " + (100 * a.absorbePct).toFixed(1) + " %"
          + "  " + a.morts + "/" + a.figes + "/" + a.timeouts + (a.entreesRefusees ? "  ENTRÉE REFUSÉE " + a.entreesRefusees : ""));
      });
      var r = all[["ref", c, sid].join("|")] || all[["jeu", c, sid].join("|")];
      if (r) out.push("   " + "".padEnd(14) + "boucliers posés par type : " + obj(r.agg.sh) + " · soin suspendu (rounds) " + r.agg.suspendu.toFixed(1) + " · soins sous 30 % PV " + r.agg.soinsBas.toFixed(2));
    });
  });
  out.push("\nJSON brut : " + brut);
  return out.join("\n");
}

if (WORKER) worker(); else if (VERIF) verif(); else main();
