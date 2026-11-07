"use strict";
/* tools/sim/grimoire-vivant-bench.js — étude « Grimoire vivant » (Seb 07/11) : Grimoire universel vs adapté, phases des boss.
   Vrai moteur dans un vm (socle de charge-bench.js) ; rien du jeu ne change : profils et politiques posés dans le contexte du banc.

   Politiques de Grimoire (posées après le chargement de la sauvegarde) :
     robot    Grimoire de la sauvegarde (le « Grimoire universel » du robot ; Forêt vide → Charge → Défense, comme charge-bench)
     vide     aucune règle (repli seul)
     adapte   règles construites pour CE scénario : situations relevées au pilote (robot, 20 parties), contre du kit, rangées par fréquence
     robot3 / adapte3   les mêmes, limitées à 3 emplacements (piste « moins d'emplacements »)
     prepare3  v3.736.0 : Grimoire du robot réduit à 3, puis « Tout préparer » du pronostic du jeu (grimoirePrepareAll)
   Profils (enveloppes, non cumulés sauf mention) :
     jeu  moteur nu
     A    contres dédiés : la Défense ne contre plus que la Charge ; Silence → technique 1, Exaltation → technique 2
     B    boss (non élite) PV ×1,5          B2  boss PV ×1,5 et puissance ×0,8   B3  boss PV ×2 et puissance ×0,7
     D    annonces durcies : Charge ×1,6, bouclier 65 %, soin 15 % PV max, silence 3 rounds
     AD   A + D           ABD  A + B2 + D

   USAGE : node tools/sim/grimoire-vivant-bench.js . [--runs 100] [--classes knight,ranger,mage] [--scen orc,...] [--profils jeu,A] [--pols robot,vide,adapte]
             [--jobs 3] [--tag nom]   sorties : captures/grimoire-vivant/<tag>-<runs>runs.{txt,json} */
var fs = require("fs"), path = require("path"), cp = require("child_process");
var CB = require("./charge-bench.js");
var CH = require("../chemins.js");
var ROOT = CH.jeu(process.argv[2]);
var ARGS = process.argv.slice(3);
function opt(k, d) { var i = ARGS.indexOf(k); return i >= 0 ? ARGS[i + 1] : d; }
var RUNS = Number(opt("--runs", 100));
var WORKER = ARGS.indexOf("--worker") >= 0;
var SV_BS = path.join(CH.DEPOT, "captures", "bouclier-soin", "saves"), SV_CB = path.join(CH.DEPOT, "captures", "charge-bench", "saves");

var SCENARIOS = {
  // boss (banc bouclier-soin)
  orc: { step: "forest_15", chap: "forest", quest: "aq_forest_depths", sv: SV_BS, boss: true, label: "Forêt · Seigneur de guerre orc" },
  basilic: { step: "forest_14", chap: "forest", dungeon: 1, sv: SV_BS, boss: true, label: "Donjon 1 · Basilic (renfort 75 %, rage 25 %)" },
  nezzam: { step: "desert_17", chap: "desert", quest: "aq_desert_trone", sv: SV_BS, boss: true, label: "Désert · Nezzam (ver 60 %, silence 30 %)" },
  varrek: { step: "ruines_15", chap: "ruins", dungeon: 3, sv: SV_BS, boss: true, label: "Donjon 3 · Varrek (relève)" },
  plan: { step: "ruines_19", chap: "ruins", quest: "aq_ruines_plan", sv: SV_BS, boss: true, label: "Ruines · Maître d'œuvre (relève, bâtisseurs, blindé 15 %)" },
  liche: { step: "crypte_19", chap: "crypt", quest: "aq_crypte_retient", sv: SV_BS, boss: true, label: "Crypte · Nécromancien suprême (4 phases)" },
  dragon: { step: "montagne_19", chap: "mountain", quest: "aq_montagne_dragon", sv: SV_BS, boss: true, label: "Montagne · Dragon ancien (4 phases)" },
  silhouette: { step: "tour_18", chap: "tower", quest: "aq_tour_silhouette", sv: SV_BS, boss: true, label: "Tour · La silhouette (3 phases)" },
  // combats ordinaires (banc charge-bench)
  coeur: { step: "forest_12", chap: "forest", quest: "aq_story_coeur", sv: SV_CB, label: "Forêt · Tenir le Cœur (Trolls)" },
  gouffre: { step: "desert_08", chap: "desert", quest: "aq_desert_gouffre", sv: SV_CB, label: "Désert · Le gouffre" },
  nuee: { step: "desert_10", chap: "desert", quest: "aq_desert_nuee", sv: SV_CB, label: "Désert · La nuée" },
  couloirs: { step: "ruines_02", chap: "ruins", quest: "aq_ruines_couloirs", sv: SV_CB, label: "Ruines · Couloirs" },
  sepulcres: { step: "crypte_02", chap: "crypt", quest: "aq_crypte_sepulcres", sv: SV_CB, label: "Crypte · Sépulcres" },
  pentes: { step: "montagne_02", chap: "mountain", quest: "aq_montagne_pentes", sv: SV_CB, label: "Montagne · Pentes" },
  tries: { step: "montagne_18", chap: "mountain", quest: "aq_montagne_tries", sv: SV_CB, label: "Montagne · Ceux qu'il a triés" }
};
var PROFILS = {
  jeu: {}, A: { A: true }, B: { hp: 1.5 }, B2: { hp: 1.5, pow: 0.8 }, B3: { hp: 2, pow: 0.7 }, D: { D: true },
  AD: { A: true, D: true }, ABD: { A: true, D: true, hp: 1.5, pow: 0.8 }
};
var POLS = ["robot", "vide", "adapte", "robot3", "adapte3", "prepare3"];
var CLASSES = { knight: "Chevalier", ranger: "Rôdeur", mage: "Mage" };
function liste(k, all) { var v = opt(k, null); return v ? v.split(",") : (Array.isArray(all) ? all : Object.keys(all)); }
var L_CLASSES = liste("--classes", CLASSES), L_SCEN = liste("--scen", SCENARIOS), L_PROF = liste("--profils", ["jeu"]), L_POL = liste("--pols", POLS);
var CONDS_TELEG = ["chargeIncoming", "shieldIncoming", "healIncoming", "eliteSurgeIncoming", "enemySilenceIncoming"];

function wrap(obj, name, fn) { var o = obj[name]; obj[name] = function () { return fn.call(this, o, arguments); }; }

/* ---------- Profil (enveloppes) ---------- */
function applyProfil(g, P) {
  if (P.A) {   // la Défense ne contre plus que la Charge ; Silence → technique 1, Exaltation → technique 2
    Object.keys(g.CLASS_SKILLS).forEach(function (c) {
      var a = g.CLASS_SKILLS[c].actions;
      a.defense.counters = ["chargeIncoming"];
      a.skill1.counters = (a.skill1.counters || []).concat(["enemySilenceIncoming"]);
      a.skill2.counters = (a.skill2.counters || []).concat(["eliteSurgeIncoming"]);
    });
  }
  if (P.D) { g.ENEMY_CHARGE_DMG_MULT = 1.6; g.BOSS_SHIELD_REDUCTION = 0.65; g.BOSS_HEAL_PERCENT = 0.15; g.SILENCE_DURATION_ROUNDS = 3; }
  // un boss seul passe par game.enemy = boss (CombatActors.setEnemies), un groupe par spawnGroup → setEnemies : on enveloppe setEnemies
  if (P.hp || P.pow) wrap(g.CombatActors, "setEnemies", function (o, a) {
    [].concat(a[0] || []).forEach(function (e) {
      if (!e || !e.isBoss || e.isElite || e._gvScaled) return;
      e._gvScaled = true;
      if (P.hp) { e.maxHp = Math.floor(e.maxHp * P.hp); e.hp = Math.floor(e.hp * P.hp); }
      if (P.pow && e.stats) e.stats = Object.assign({}, e.stats, { power: Math.max(1, Math.floor(Number(e.stats.power || 0) * P.pow)) });
    });
    return o.apply(this, a);
  });
}

/* ---------- Compteurs (lecture seule) ---------- */
function instrument(g) {
  var CE = g.CombatEngine, CCM = g.ClassCombatManager, S = { st: null };
  function rec() { return S.st; }
  function cur() { return S.st && S.st.cur; }
  function isBoss(e) { return !!(e && e.isBoss && !e.isElite); }
  wrap(CE, "beginRound", function (o, a) { if (rec()) { rec().rounds++; if (cur()) cur().r++; } return o.apply(this, a); });
  wrap(g.PotionManager, "useHealingPotion", function (o, a) { var r = o.apply(this, a); if (r === true && rec()) { rec().potions++; if (cur()) cur().pot++; } return r; });
  wrap(CE, "onHeroDefeated", function (o, a) {
    var ca = g.CombatActors && g.CombatActors.ensure(), rose0 = !!(ca && ca.heroRose), r = o.apply(this, a);
    if (!(!rose0 && ca && ca.heroRose && g.game.heroHp > 0) && rec()) { rec().mort = true; if (cur()) cur().mort = true; }
    return r;
  });
  // décisions du héros : règle du Grimoire (condition), technique du repli, attaque ; situations vraies au moment de décider
  wrap(CCM, "_chooseRoundAction", function (o, a) {
    var r = o.apply(this, a);
    if (a[0] && rec() && g.game.enemy) {
      var c = cur(), ctx = this.getGrimoireCombatContext();
      g.GRIMOIRE_CONDITION_ORDER.forEach(function (id) { if (g.evaluateGrimoireCondition(id, ctx)) rec().vu[id] = (rec().vu[id] || 0) + 1; });
      if (c) {
        c.dec++;
        if (r && r.matchedConditionId) { c.regle++; c.regles[r.matchedConditionId] = (c.regles[r.matchedConditionId] || 0) + 1; }
        else if (r && r.slot) c.repli++;
        if (c.boss) c.parPhase[c.ph] = c.parPhase[c.ph] || { r0: c.r, dec: 0, regle: 0, tel: 0, ctr: 0 }, c.parPhase[c.ph].dec++, (r && r.matchedConditionId) && c.parPhase[c.ph].regle++;
      }
    }
    return r;
  });
  wrap(CE, "telegraphPattern", function (o, a) {
    var e = a[0], k = a[1], flag = { charge: "chargeTelegraphed", silence: "silenceTelegraphed", shield: "shieldTelegraphed", heal: "healTelegraphed", surge: "surgeTelegraphed" }[k];
    var r = o.apply(this, a), c = cur();
    if (rec() && e && e[flag]) {
      rec().tel[k] = (rec().tel[k] || 0) + 1;
      if (c) { c.tel++; if (c.boss) { var p = c.parPhase[c.ph] = c.parPhase[c.ph] || { r0: c.r, dec: 0, regle: 0, tel: 0, ctr: 0 }; p.tel++; c.telK[(isBoss(e) ? "B:" : "a:") + k] = (c.telK[(isBoss(e) ? "B:" : "a:") + k] || 0) + 1; } }
    }
    return r;
  });
  wrap(CE, "rescheduleCounteredPattern", function (o, a) {
    var c = cur();
    if (rec()) { rec().ctr[a[0]] = (rec().ctr[a[0]] || 0) + 1; if (c) { c.ctr++; if (c.boss && c.parPhase[c.ph]) c.parPhase[c.ph].ctr++; } }
    return o.apply(this, a);
  });
  ["resolveEnemyCharge", "resolveSilenceCast", "resolveBossShield", "resolveBossHeal", "resolveEliteSurge"].forEach(function (n) {
    wrap(CE, n, function (o, a) { if (rec()) rec().subi[n] = (rec().subi[n] || 0) + 1; return o.apply(this, a); });
  });
  // phases : seuils de PV (checkPhases → BossMomentManager.onPhase) et relève
  wrap(g.BossMomentManager, "onPhase", function (o, a) {
    var e = a[0], ph = a[1], c = cur();
    if (c && c.boss && isBoss(e)) { c.ph++; c.phases.push({ r: c.r, pct: ph ? ph.atPct : null, lab: ph && ph.label || "", releve: !!e.hasRisen }); c.parPhase[c.ph] = { r0: c.r, dec: 0, regle: 0, tel: 0, ctr: 0 }; }
    return o.apply(this, a);
  });
  wrap(g.RiseSystem, "onBossRisen", function (o, a) {
    var e = a[0], c = cur();
    if (c && c.boss && isBoss(e)) { c.ph++; c.phases.push({ r: c.r, pct: "relève", lab: "relève", releve: true }); c.parPhase[c.ph] = { r0: c.r, dec: 0, regle: 0, tel: 0, ctr: 0 }; }
    return o.apply(this, a);
  });
  // un relevé par rencontre (le boss garde son relevé quand ses renforts arrivent)
  var CA = g.CombatActors, oSet = CA.setEnemies;
  CA.setEnemies = function () {
    var avant = CA.enemies().slice(), r = oSet.apply(this, arguments), apres = CA.enemies();
    if (S.st && apres.length && (apres.length !== avant.length || apres.some(function (e, i) { return e !== avant[i] && avant.indexOf(e) < 0; }))) {
      var boss = apres.some(isBoss), suite = S.st.cur && S.st.cur.boss && boss && avant.some(function (e) { return apres.indexOf(e) >= 0 && isBoss(e); });
      if (!suite) {
        S.st.cur = { r: 0, boss: boss, elite: apres.some(function (e) { return e.isElite; }), arch: apres.map(function (e) { return e.archetype || "-"; }).join("+"),
          dec: 0, regle: 0, repli: 0, regles: {}, tel: 0, ctr: 0, pot: 0, mort: false, ph: 0, phases: [], parPhase: {}, telK: {} };
        S.st.combats.push(S.st.cur);
      }
    }
    return r;
  };
  return S;
}

/* ---------- Grimoires ---------- */
function counterSlotFor(g, kit, cond) {
  if (cond === "enemyRising") return "skill1";   // comme le robot : la première compétence achève
  var slots = ["defense", "skill1", "skill2", "skill3"];
  for (var i = 0; i < slots.length; i++) {
    var act = kit.actions[slots[i]];
    if (act && g.getAllGrimoireCounterIds(act).indexOf(cond) >= 0) return slots[i];
  }
  return null;
}
function buildAdapte(g, vu) {
  var kit = g.getGrimoireCurrentKit(), rules = [];
  // annonces d'abord (une annonce = un round où la condition est vraie), puis relève, puis traits permanents
  var poids = function (id) { return (vu[id] || 0) * (CONDS_TELEG.indexOf(id) >= 0 || id === "enemyRising" ? 10 : 1); };
  Object.keys(vu).filter(function (id) { return vu[id] > 0 && counterSlotFor(g, kit, id); })
    .sort(function (a, b) { return poids(b) - poids(a); })
    .forEach(function (id) { rules.push({ conditionId: id, actionSlot: counterSlotFor(g, kit, id) }); });
  return rules;
}
function setRules(g, rules, n) {
  var R = rules.slice(0, n);
  while (R.length < 6) R.push({ conditionId: null, actionSlot: null });
  g.game.grimoireRules = R;
}

/* ---------- Un run ---------- */
function prepare(g, saveTxt, sc, pol, adapte) {
  g.fullResetState();
  g.restoreBaseState(JSON.parse(saveTxt));
  g.ensureGrimoireRules();
  g.game.unlockedTabs.grimoire = true;
  g.game.combatMode = "grimoire";
  var slots = g.getGrimoireSlotCount(g.game.worldsEverReached);
  var robot = g.game.grimoireRules.filter(function (r) { return r && r.conditionId && r.actionSlot; });
  if (!robot.some(function (r) { return r.conditionId === "chargeIncoming"; }) && !robot.length) robot = [{ conditionId: "chargeIncoming", actionSlot: "defense" }];
  if (pol === "robot") setRules(g, robot, slots);
  else if (pol === "robot3") setRules(g, robot, Math.min(3, slots));
  else if (pol === "vide") setRules(g, [], 0);
  else if (pol === "adapte") setRules(g, adapte || robot, slots);
  else if (pol === "adapte3") setRules(g, adapte || robot, Math.min(3, slots));
  else if (pol === "prepare3") setRules(g, robot, Math.min(3, slots));
  if (sc.dungeon && g.game.dungeonTierCleared) delete g.game.dungeonTierCleared[sc.dungeon];
  var st = g.StoryQuestManager.getCurrentStep(sc.chap);
  if (st && st.id === sc.step) { try { g.StoryQuestManager.acceptStep(sc.chap); } catch (e) {} }
  g.EquipmentManager.recalcStats();
  g.game.heroHp = g.game.heroMaxHp;
  g.CompanionManager.healAll();
  g.CombatEngine.ensureState();
  var q = sc.quest && g.ADVENTURE_QUESTS[sc.quest];
  st = g.StoryQuestManager.getCurrentStep(sc.chap);
  if (q && q.requiresVoie && st && st.choice && !g.CompanionManager.state(q.requiresVoie).voie) g.storyMakeChoice(sc.chap, st.choice.options[0].value);
  // v3.736.0 : le joueur suit le pronostic, « Tout préparer » juste avant de partir
  if (pol === "prepare3" && typeof g.grimoirePrepareAll === "function") g.grimoirePrepareAll(sc.dungeon ? { type: "dungeon", id: sc.dungeon } : { type: "adventure", id: sc.quest });
  return { slots: slots, rules: g.game.grimoireRules.filter(function (r) { return r && r.conditionId; }).map(function (r) { return r.conditionId + ">" + r.actionSlot; }) };
}
function playRun(g, S, saveTxt, sc, s, pol, adapte) {
  CB.seed(s); CB.CLOCK.now = Date.UTC(2026, 9, 1, 8);
  var info = prepare(g, saveTxt, sc, pol, adapte);
  var st = S.st = { rounds: 0, potions: 0, mort: false, tel: {}, ctr: {}, subi: {}, vu: {}, combats: [], cur: null };
  var D = g.DungeonManager, active;
  if (sc.dungeon) { D.start(sc.dungeon, []); active = function () { return g.game.dungeonRun && g.game.dungeonRun.active; }; }
  else { delete g.game.adventureQuestsCompleted[sc.quest]; g.AdventureQuestManager.start(sc.quest); active = function () { return g.game.adventureQuestRun.active; }; }
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
    if (st.rounds === last) { if (++stall > 60) { st.fige = true; break; } } else { stall = 0; last = st.rounds; }
  }
  var win = sc.dungeon ? !!(g.game.dungeonTierCleared || {})[sc.dungeon] : !!g.game.adventureQuestsCompleted[sc.quest];
  var hp = Math.max(0, g.game.heroHp) / (g.game.heroMaxHp || 1);
  if (sc.dungeon) { if (active()) try { D.forfeit(); } catch (e) {} }
  else if (g.game.adventureQuestRun.active) { try { g.AdventureQuestManager.forfeit && g.AdventureQuestManager.forfeit(); } catch (e) {} }
  S.st = null;
  var bs = st.combats.filter(function (c) { return c.boss && c.r > 0; }), b = bs.length ? bs[bs.length - 1] : null;
  var tous = st.combats.filter(function (c) { return c.r > 0; });
  var sum = function (k) { return tous.reduce(function (x, c) { return x + c[k]; }, 0); };
  return { win: win, hp: win ? hp : 0, rounds: st.rounds, potions: st.potions, mort: st.mort, fige: !!st.fige, tel: st.tel, ctr: st.ctr, subi: st.subi, vu: st.vu,
    dec: sum("dec"), regle: sum("regle"), repli: sum("repli"), nComb: tous.length, slots: info.slots, rules: info.rules,
    boss: b ? { r: b.r, mort: b.mort, pot: b.pot, dec: b.dec, regle: b.regle, repli: b.repli, regles: b.regles, tel: b.tel, ctr: b.ctr, phases: b.phases, parPhase: b.parPhase, telK: b.telK, arch: b.arch } : null };
}
function saveFor(classe, sid) { var sc = SCENARIOS[sid]; return fs.readFileSync(path.join(sc.sv, classe + "_" + sc.step + ".json"), "utf8"); }
function seedFor(si, i) { return 900000 + si * 10000 + i; }

/* ---------- Agrégats ---------- */
function q(arr, p) { if (!arr.length) return 0; var s = arr.slice().sort(function (a, b) { return a - b; }); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))]; }
function agg(runs) {
  var n = runs.length, W = runs.filter(function (r) { return r.win; });
  var moy = function (f) { return runs.reduce(function (a, r) { return a + f(r); }, 0) / n; };
  var B = runs.filter(function (r) { return r.boss; }), BW = B.filter(function (r) { return r.win; });
  var o = { n: n, win: W.length / n, hp: W.length ? W.reduce(function (a, r) { return a + r.hp; }, 0) / W.length : 0, pot: moy(function (r) { return r.potions; }),
    runMed: q(W.map(function (r) { return r.rounds; }), 0.5), regleShare: moy(function (r) { return r.dec ? r.regle / r.dec : 0; }), repliShare: moy(function (r) { return r.dec ? r.repli / r.dec : 0; }),
    tel: moy(function (r) { return Object.keys(r.tel).reduce(function (a, k) { return a + r.tel[k]; }, 0); }),
    ctr: moy(function (r) { return Object.keys(r.ctr).reduce(function (a, k) { return a + r.ctr[k]; }, 0); }),
    figes: runs.filter(function (r) { return r.fige; }).length, slots: runs[0] ? runs[0].slots : 0, rules: runs[0] ? runs[0].rules : [] };
  var vu = {}; runs.forEach(function (r) { Object.keys(r.vu).forEach(function (k) { vu[k] = (vu[k] || 0) + r.vu[k] / n; }); }); o.vu = vu;
  if (B.length) {
    o.bossVu = B.length / n; o.bossMed = q(BW.map(function (r) { return r.boss.r; }), 0.5); o.bossP10 = q(BW.map(function (r) { return r.boss.r; }), 0.1); o.bossP90 = q(BW.map(function (r) { return r.boss.r; }), 0.9);
    o.bossMort = B.filter(function (r) { return r.boss.mort; }).length / B.length;
    o.bossRegle = B.reduce(function (a, r) { return a + (r.boss.dec ? r.boss.regle / r.boss.dec : 0); }, 0) / B.length;
    o.bossTel = B.reduce(function (a, r) { return a + r.boss.tel; }, 0) / B.length;
    o.bossCtr = B.reduce(function (a, r) { return a + r.boss.ctr; }, 0) / B.length;
    // phases : atteinte, round d'entrée, rounds passés, annonces et règles par phase (victoires et défaites confondues)
    var maxPh = 0; B.forEach(function (r) { maxPh = Math.max(maxPh, r.boss.phases.length); });
    o.ph = [];
    for (var k = 0; k <= maxPh; k++) {
      var at = [], dur = [], tel = [], regle = [], dec = [], ctr = [], lab = "";
      B.forEach(function (r) {
        var b = r.boss, P = b.phases;
        if (k > P.length) return;
        var r0 = k === 0 ? 0 : P[k - 1].r, r1 = k < P.length ? P[k].r : b.r;
        if (k > 0) lab = lab || String(P[k - 1].pct) + (P[k - 1].lab ? " " + P[k - 1].lab : "");
        at.push(r0); dur.push(Math.max(0, r1 - r0));
        var pp = b.parPhase[k] || { tel: 0, regle: 0, dec: 0, ctr: 0 };
        tel.push(pp.tel); regle.push(pp.regle); dec.push(pp.dec); ctr.push(pp.ctr);
      });
      var mean = function (a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : 0; };
      o.ph.push({ k: k, lab: k === 0 ? "début" : lab, part: at.length / B.length, at: q(at, 0.5), dur: mean(dur), durMed: q(dur, 0.5), dur1: dur.filter(function (d) { return d <= 1; }).length / Math.max(1, dur.length),
        tel: mean(tel), ctr: mean(ctr), regleShare: mean(dec) ? mean(regle) / mean(dec) : 0 });
    }
    var tk = {}; B.forEach(function (r) { Object.keys(r.boss.telK).forEach(function (x) { tk[x] = (tk[x] || 0) + r.boss.telK[x] / B.length; }); }); o.telK = tk;
    var rg = {}; B.forEach(function (r) { Object.keys(r.boss.regles).forEach(function (x) { rg[x] = (rg[x] || 0) + r.boss.regles[x] / B.length; }); }); o.bossRegles = rg;
  }
  return o;
}

/* ---------- Worker : une classe × un profil, toutes politiques ---------- */
function worker() {
  var classe = L_CLASSES[0], pid = L_PROF[0], out = {};
  var g = CB.launch(); applyProfil(g, PROFILS[pid]); var S = instrument(g);
  L_SCEN.forEach(function (sid) {
    var txt = saveFor(classe, sid), si = Object.keys(SCENARIOS).indexOf(sid), sc = SCENARIOS[sid];
    var n = sc.dungeon ? Math.min(RUNS, Number(opt("--runs-donjon", 60))) : RUNS;
    // pilote : situations rencontrées avec le Grimoire du robot (graines à part)
    var adapte = null;
    if (L_POL.some(function (p) { return /^adapte/.test(p); })) {
      var vu = {};
      for (var j = 0; j < 20; j++) { var pr = playRun(g, S, txt, sc, 50000 + si * 100 + j, "robot", null); Object.keys(pr.vu).forEach(function (k) { vu[k] = (vu[k] || 0) + pr.vu[k]; }); }
      adapte = buildAdapte(g, vu);
    }
    L_POL.forEach(function (pol) {
      var runs = [];
      for (var i = 0; i < n; i++) runs.push(playRun(g, S, txt, sc, seedFor(si, i), pol, adapte));
      out[[pid, pol, classe, sid].join("|")] = { agg: agg(runs) };
    });
    process.stderr.write(".");
  });
  fs.writeFileSync(opt("--out"), JSON.stringify(out));
}

/* ---------- Principal ---------- */
function main() {
  var dir = CH.captures("grimoire-vivant"), t0 = Date.now(), tag = opt("--tag", "gv");
  var taches = []; L_CLASSES.forEach(function (c) { L_PROF.forEach(function (p) { taches.push([c, p]); }); });
  var all = {}, k = 0, actifs = 0;
  new Promise(function (fin, echec) {
    function suivante() {
      if (k >= taches.length) { if (!actifs) fin(); return; }
      var t = taches[k++], out = path.join(dir, "part-" + tag + "-" + t[0] + "-" + t[1] + ".json"); actifs++;
      var args = [__filename, ROOT, "--worker", "--classes", t[0], "--profils", t[1], "--pols", L_POL.join(","), "--runs", String(RUNS), "--runs-donjon", opt("--runs-donjon", "60"), "--scen", L_SCEN.join(","), "--out", out];
      var pr = cp.spawn(process.execPath, args, { stdio: ["ignore", "ignore", "inherit"] });
      pr.on("exit", function (code) {
        actifs--;
        if (code) return echec(new Error("worker " + t.join("/") + " : code " + code));
        Object.assign(all, JSON.parse(fs.readFileSync(out, "utf8"))); fs.unlinkSync(out);
        suivante();
      });
    }
    for (var i = 0; i < Number(opt("--jobs", 3)); i++) suivante();
  }).then(function () {
    var brut = path.join(dir, tag + "-" + RUNS + "runs.json");
    fs.writeFileSync(brut, JSON.stringify({ date: new Date().toISOString(), runs: RUNS, profils: PROFILS, scenarios: SCENARIOS, cellules: all }, null, 1));
    var txt = rapport(all, (Date.now() - t0) / 60000, brut);
    fs.writeFileSync(path.join(dir, tag + "-" + RUNS + "runs.txt"), txt);
    console.log(txt);
  }).catch(function (e) { console.error(e.message); process.exit(1); });
}
function rapport(all, minutes, brut) {
  var out = [], p0 = function (x) { return (100 * x).toFixed(0).padStart(3) + "%"; };
  out.push("BANC GRIMOIRE VIVANT — " + RUNS + " parties par cellule (donjons : " + opt("--runs-donjon", "60") + "), graines fixes, " + minutes.toFixed(1) + " min");
  out.push("Profils : " + L_PROF.join(", ") + " · Politiques : " + L_POL.join(", "));
  out.push("Colonnes : victoires · PV restants · potions · rounds (partie gagnée, méd.) · part des décisions prises par une RÈGLE / par une technique du repli · annonces / contres par partie"
    + " · boss : rounds méd. (p10-p90) des victoires, morts face au boss, part des décisions par règle");
  L_SCEN.forEach(function (sid) {
    out.push("\n " + SCENARIOS[sid].label);
    L_CLASSES.forEach(function (c) {
      L_PROF.forEach(function (pid) {
        L_POL.forEach(function (pol) {
          var x = all[[pid, pol, c, sid].join("|")]; if (!x) return; var a = x.agg;
          var l = "   " + CLASSES[c].padEnd(10) + pid.padEnd(4) + pol.padEnd(8) + p0(a.win) + "  PV " + p0(a.hp) + "  pot " + a.pot.toFixed(2) + "  r " + String(a.runMed).padStart(3)
            + "  règle " + p0(a.regleShare) + " repli " + p0(a.repliShare) + "  ann " + a.tel.toFixed(1) + " ctr " + a.ctr.toFixed(1);
          if (a.bossVu) l += "  | boss " + a.bossMed + " (" + a.bossP10 + "-" + a.bossP90 + ")  mort " + p0(a.bossMort) + "  règle " + p0(a.bossRegle);
          if (a.figes) l += "  FIGÉS " + a.figes;
          out.push(l);
          if (pol === "adapte" || pol === "robot" || pol === "prepare3") out.push("        " + "".padEnd(10) + pol + " (" + a.slots + " empl.) : " + a.rules.join(" · "));
        });
        var r = all[[pid, "robot", c, sid].join("|")] || all[[pid, L_POL[0], c, sid].join("|")];
        if (r && r.agg.ph) {
          out.push("        phases (" + pid + ", " + (all[[pid, "robot", c, sid].join("|")] ? "robot" : L_POL[0]) + ") : " + r.agg.ph.map(function (p) {
            return "[" + p.k + " " + p.lab.slice(0, 22) + "] " + p0(p.part).trim() + " entre r" + p.at + ", " + p.dur.toFixed(1) + " r (méd " + p.durMed + ", ≤1 r " + p0(p.dur1).trim() + "), ann " + p.tel.toFixed(2) + ", ctr " + p.ctr.toFixed(2) + ", règle " + p0(p.regleShare).trim();
          }).join("\n                       "));
          out.push("        annonces du combat de boss : " + Object.keys(r.agg.telK).sort().map(function (k) { return k + " " + r.agg.telK[k].toFixed(2); }).join(" · ")
            + "  · règles jouées : " + Object.keys(r.agg.bossRegles).sort().map(function (k) { return k + " " + r.agg.bossRegles[k].toFixed(1); }).join(" · "));
        }
      });
    });
  });
  out.push("\nJSON brut : " + brut);
  return out.join("\n");
}

if (WORKER) worker(); else main();
