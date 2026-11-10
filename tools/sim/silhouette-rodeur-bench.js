"use strict";
/* tools/sim/silhouette-rodeur-bench.js — diagnostic « La silhouette (tour_18) pour le Rôdeur » (Seb 07/11).
   Vrai moteur dans un vm (socle charge-bench.js) ; rien du jeu ne change : pistes posées par enveloppes dans le contexte.
   Partie : sauvegarde <classe>_tour_18 (captures/bouclier-soin/saves), Grimoire réduit à 3 puis « Tout préparer » (v3.736).
   Pistes (combinables par « + ») : jeu · huile (Huile de lame emportée, 1 place) · sansRegleB (règle Blindé retirée)
            sansBlinde (Blindé 0 %) · bl5 (Blindé 5 %) · sansMiroir · sansLumiere · soin0 (le boss ne se soigne pas)
            perfore (Tir perforant ignore le Blindé) · regleT3 (règle « Blindé → Tir perforant » au lieu de « → Rafale »)
            swap (Rôdeur : Tir précis contre le Soin, Rafale le Bouclier) · rafaleCd1 (Rafale recharge 1)
            objet (l'objet du trait de la classe : Baume froid / Huile de lame / Pastille de miel) · acide (Acide mordant)
            potionSage (pas de potion pendant une annonce contrée, au-dessus de 10 %) · hp350, hp300… (PV de la silhouette face au Rôdeur, sur l'ancienne échelle ×4,25)
            vamp / enrage (autre trait pris au Rôdeur) · hp375 (PV ×3,75 au lieu de ×4,25, Rôdeur seul)
   USAGE : node tools/sim/silhouette-rodeur-bench.js . [--runs 200] [--classes ranger,knight,mage] [--pistes jeu,huile] [--tag t] */
var fs = require("fs"), path = require("path");
var CB = require("./charge-bench.js");
var CH = require("../chemins.js");
var ROOT = CH.jeu(process.argv[2]);
var ARGS = process.argv.slice(3);
function opt(k, d) { var i = ARGS.indexOf(k); return i >= 0 ? ARGS[i + 1] : d; }
var RUNS = Number(opt("--runs", 200));
var SV = path.join(CH.DEPOT, "captures", "bouclier-soin", "saves");
var QUEST = "aq_tour_silhouette", CHAP = "tower", STEP = "tour_18";
var CLASSES = (opt("--classes", "ranger,knight,mage")).split(",");
var PISTES = (opt("--pistes", "jeu")).split(",");
var NOMS = { knight: "Chevalier", ranger: "Rôdeur", mage: "Mage" };

function wrap(obj, name, fn) { var o = obj[name]; obj[name] = function () { return fn.call(this, o, arguments); }; }

/* ---------- Pistes (enveloppes) ---------- */
function has(P, k) { return P.split("+").indexOf(k) >= 0; }
function applyPiste(g, PP, S) { PP.split("+").forEach(function (P) { applyOne(g, P, S); }); }
function applyOne(g, P, S) {
  var R = g.CLASS_SKILLS.archer.actions;
  if (P === "swap") { R.skill1.counters = ["healIncoming"]; R.skill2.counters = ["shieldIncoming"]; }   // contre du Soin sur Tir précis (recharge 1), comme le Chevalier
  if (P === "rafaleCd1") R.skill2.cooldownRounds = 1;
  if (P === "soin0") g.CombatEngine.resolveBossHeal = function () { var e = g.game.enemy; if (e) { e.healTelegraphed = false; e.healIn = g.BOSS_HEAL_ROUNDS; } };
  if (P === "sansBlinde") { g.ARMORED_DAMAGE_REDUCTION_PCT = 0; g.ARMORED_SUPPRESSION_REDUCTION_PCT = 0; }
  if (P === "bl0c") g.ARMORED_SUPPRESSION_REDUCTION_PCT = 0;   // contre (règle ou Huile) : l'armure tombe à 0 au lieu de 5 %
  if (P === "bl5") g.ARMORED_DAMAGE_REDUCTION_PCT = 0.05;
  if (P === "sansMiroir") g.TOWER_MIRROR_PENALTY = 0;
  if (P === "vamp") g.TOWER_CLASS_ARCHETYPE.ranger = "vampiric";
  if (P === "enrage") g.TOWER_CLASS_ARCHETYPE.ranger = "enraged";
  if (P === "sansLumiere") wrap(g.TowerSystem, "onBossPhase", function (o, a) { if (a[1] && a[1].through) { var ph = Object.assign({}, a[1]); delete ph.through; return o.call(this, a[0], ph); } return o.apply(this, a); });
  if (P === "perfore") {   // Tir perforant : le Blindé ne réduit pas ce coup
    var oRed = g.getArmoredEffectiveDamageReduction;
    g.getArmoredEffectiveDamageReduction = function (e) { return S.slot === "skill3" ? 0 : oRed(e); };
  }
  if (/^hp\d{3}$/.test(P)) wrap(g.CombatActors, "setEnemies", function (o, a) {   // hp375 = bossHpMult 3,75 au lieu de 4,25 (Rôdeur seul)
    var k = Number(P.slice(2)) / 100 / 4.25;
    [].concat(a[0] || []).forEach(function (e) {
      if (!e || !e.isBoss || e._sc || g.TowerSystem.baseHeroId(g.game.heroId) !== "ranger") return;
      e._sc = true; e.maxHp = Math.floor(e.maxHp * k); e.hp = Math.floor(e.hp * k);
    });
    return o.apply(this, a);
  });
}

/* ---------- Compteurs (lecture seule) ---------- */
function instrument(g) {
  var CE = g.CombatEngine, CCM = g.ClassCombatManager, S = { st: null, slot: null };
  var isB = function (e) { return !!(e && e.isBoss && !e.isElite); };
  wrap(CE, "beginRound", function (o, a) { if (S.st) S.st.r++; return o.apply(this, a); });
  wrap(CE, "heroAction", function (o, a) { var r = o.apply(this, a); if (S.st && r !== false) { S.st.lastAct = a[0]; S.st.nAct++; } return r; });
  wrap(CE, "telegraphPattern", function (o, a) { var r = o.apply(this, a); if (S.st && a[1] === "heal") S.st.nActTel = S.st.nAct; return r; });
  wrap(CCM, "useSkill", function (o, a) { var p = S.slot; S.slot = a[0]; try { return o.apply(this, a); } finally { S.slot = p; } });
  wrap(CE, "playerAttack", function (o, a) { var p = S.slot; if (!S.slot) S.slot = "basic"; try { return o.apply(this, a); } finally { S.slot = p; } });
  wrap(CE, "dealDamage", function (o, a) {
    var foe = a[4] || g.game.enemy, h0 = foe ? Number(foe.hp || 0) : 0, st = S.st;
    if (st && foe && isB(foe) && g.TowerSystem.blocksHit(foe)) st.through++;
    var r = o.apply(this, a);
    if (st && foe && isB(foe)) {
      st.bossMax = Math.max(st.bossMax || 0, Number(foe.maxHp || 0));
      var d = Math.max(0, h0 - Number(foe.hp || 0)), k = S.slot || "autre";
      st.dmg += d; st.parSlot[k] = (st.parSlot[k] || 0) + d; st.nbSlot[k] = (st.nbSlot[k] || 0) + 1;
      st.ph[st.phase] = (st.ph[st.phase] || 0) + d;
    }
    return r;
  });
  wrap(g.TowerSystem, "mirrorMult", function (o, a) { var m = o.apply(this, a); if (S.st && m < 1) S.st.miroir++; return m; });
  wrap(g.CombatReportManager, "logArchetypeImpact", function (o, a) { if (S.st && a[0] === "armoredDamageLost") S.st.blinde += Number(a[1] || 0); return o.apply(this, a); });
  // soin qui passe : la technique de la règle « Soin » était-elle jouable ? (ressource, recharge, silence)
  wrap(CE, "resolveBossHeal", function (o, a) {
    if (S.st) {
      var rr = (g.game.grimoireRules || []).slice(0, 3).filter(function (x) { return x && x.conditionId === "healIncoming"; })[0];
      var act = rr && CCM.getAction(rr.actionSlot), rs = g.game.classResource || {};
      var why = S.st.nAct === S.st.nActTel ? "pas de tour" : S.st.lastAct === "potion" ? "potion" : !act ? "sans règle" : !g.canAfford(rs, act.resourceCost) ? "ressource" : !g.isCooldownReady(g.game.classCooldowns, act.id) ? "recharge" : (CCM.getCombatContext().isSilenced ? "silence" : "jouable");
      S.st.soinPasse[why] = (S.st.soinPasse[why] || 0) + 1;
    }
    var e = g.game.enemy, h0 = e ? e.hp : 0, r = o.apply(this, a); if (S.st && e) { S.st.soin += Math.max(0, e.hp - h0); S.st.nSoin++; } return r; });
  wrap(CE, "resolveBossShield", function (o, a) { if (S.st) S.st.nBouc++; return o.apply(this, a); });
  wrap(CE, "rescheduleCounteredPattern", function (o, a) { if (S.st) S.st.ctr[a[0]] = (S.st.ctr[a[0]] || 0) + 1; return o.apply(this, a); });
  wrap(CE, "enemyTurn", function (o, a) { var h0 = g.game.heroHp, r = o.apply(this, a); if (S.st) S.st.subi += Math.max(0, h0 - g.game.heroHp); return r; });
  wrap(g.PotionManager, "useHealingPotion", function (o, a) { var r = o.apply(this, a); if (r === true && S.st) S.st.pot++; return r; });
  // « Le seuil » (Ruines) ou la Fiole relèvent le héros : ce n'est pas une mort
  wrap(CE, "onHeroDefeated", function (o, a) {
    var e = g.game.enemy, pct = e ? e.hp / e.maxHp : null, r = o.apply(this, a);
    if (S.st) { if (g.game.heroHp > 0 && g.game.adventureQuestRun.active) S.st.releve++; else { S.st.mort = true; S.st.bossPct = pct; } }
    return r;
  });
  wrap(g.BossMomentManager, "onPhase", function (o, a) { if (S.st && isB(a[0])) { S.st.phase++; S.st.phR.push(S.st.r); } return o.apply(this, a); });
  wrap(CCM, "_chooseRoundAction", function (o, a) { var r = o.apply(this, a); if (S.st && a[0] && r) { var k = (r.matchedConditionId ? r.matchedConditionId + ">" : "repli>") + (r.slot || "basic"); S.st.dec[k] = (S.st.dec[k] || 0) + 1; } return r; });
  return S;
}

/* potionSage : pas de potion (robot ni automatique) tant qu'une annonce contrée par une règle active est en cours, au-dessus de 10 % */
function annonceContree(g) {
  var e = g.game.enemy; if (!e) return false;
  var on = { healIncoming: e.healTelegraphed, shieldIncoming: e.shieldTelegraphed, chargeIncoming: e.chargeTelegraphed, enemySilenceIncoming: e.silenceTelegraphed };
  return (g.game.grimoireRules || []).slice(0, 3).some(function (r) { return r && on[r.conditionId]; });
}
function setRules(g, rules, n) { var R = rules.slice(0, n); while (R.length < 6) R.push({ conditionId: null, actionSlot: null }); g.game.grimoireRules = R; }

function playRun(g, S, txt, s, P) {
  CB.seed(s); CB.CLOCK.now = Date.UTC(2026, 9, 1, 8);
  g.fullResetState(); g.restoreBaseState(JSON.parse(txt)); g.ensureGrimoireRules();
  g.game.unlockedTabs.grimoire = true; g.game.combatMode = "grimoire";
  var slots = g.getGrimoireSlotCount(g.game.worldsEverReached);
  var robot = g.game.grimoireRules.filter(function (r) { return r && r.conditionId && r.actionSlot; });
  setRules(g, robot, Math.min(3, slots));
  var st0 = g.StoryQuestManager.getCurrentStep(CHAP);
  if (st0 && st0.id === STEP) { try { g.StoryQuestManager.acceptStep(CHAP); } catch (e) {} }
  if (has(P, "potionSage")) g.PotionAutoManager.pick = (function (o) { return function () { return g.game.heroHp / g.game.heroMaxHp > 0.10 && annonceContree(g) ? null : o.apply(this, arguments); }; })(g.PotionAutoManager._pick0 || (g.PotionAutoManager._pick0 = g.PotionAutoManager.pick));
  g.EquipmentManager.recalcStats(); g.game.heroHp = g.game.heroMaxHp; g.CompanionManager.healAll(); g.CombatEngine.ensureState();
  // objets emportés : huile (Huile de lame) · objet (celui du trait de la classe) · acide (Acide mordant)
  var cls = g.TowerSystem.baseHeroId(g.game.heroId), items = [];
  if (has(P, "huile")) items.push("huile_de_lame");
  if (has(P, "objet")) items.push({ knight: "baume_froid", ranger: "huile_de_lame", mage: "pastille_de_miel" }[cls]);
  if (has(P, "acide")) items.push("acide_mordant");
  items.forEach(function (id) { g.WarehouseManager.addResource(id, 1, true); });
  var huile = items.length > 0;
  g.grimoirePrepareAll({ type: "adventure", id: QUEST });
  if (has(P, "sansRegleB")) g.game.grimoireRules = g.game.grimoireRules.map(function (r) { return r && r.conditionId === "enemyArmored" ? { conditionId: null, actionSlot: null } : r; });
  if (has(P, "regleT3")) g.game.grimoireRules = g.game.grimoireRules.map(function (r) { return r && r.conditionId === "enemyArmored" ? { conditionId: "enemyArmored", actionSlot: "skill3" } : r; });
  var st = S.st = { r: 0, dmg: 0, parSlot: {}, nbSlot: {}, ph: {}, phase: 0, phR: [], miroir: 0, blinde: 0, soin: 0, nSoin: 0, nBouc: 0, ctr: {}, subi: 0, pot: 0, mort: false, through: 0, dec: {}, soinPasse: {}, bossMax: 0, releve: 0, perte: 0, gain: 0, nAct: 0, nActTel: -1, lastAct: null };
  delete g.game.adventureQuestsCompleted[QUEST];
  g.AdventureQuestManager.start(QUEST);
  if (huile) g.CombatItems.takeForSortie(items);
  g.__flush();
  var CE = g.CombatEngine, t, last = -1, stall = 0;
  for (t = 0; t < 12000 && g.game.adventureQuestRun.active && !st.mort && g.game.heroHp > 0; t++) {
    g.game.activeTab = "combat";
    var sage = has(P, "potionSage") && g.game.heroHp / (g.game.heroMaxHp || 1) > 0.10 && annonceContree(g);
    if (!sage && g.game.heroHp / (g.game.heroMaxHp || 1) < 0.30) {
      var pid = ["potion_soin_majeur", "potion_soin_mineur"].filter(function (id) { return (g.game.healingPotionsOwned || {})[id] > 0; })[0];
      if (pid && CE.isHeroTurnAvailable()) CE.heroAction("potion", pid);
    }
    var h0 = g.game.heroHp;
    CE.tickRoundClock(1.5); CB.CLOCK.now += 1500; g.__flush();
    var dh = g.game.heroHp - h0; if (dh < 0) st.perte -= dh; else st.gain += dh;
    g.StoryQuestManager._trackKills(); if (g.closeBossFinal) g.closeBossFinal();
    if (st.r === last) { if (++stall > 60) { st.fige = true; break; } } else { stall = 0; last = st.r; }
  }
  var win = !!g.game.adventureQuestsCompleted[QUEST];
  var e = g.game.enemy;
  if (!win && st.bossPct == null && e) st.bossPct = e.hp / e.maxHp;
  st.win = win; st.hp = win ? g.game.heroHp / g.game.heroMaxHp : 0; st.maxHpBoss = st.bossMax;
  st.rules = g.game.grimoireRules.slice(0, 3).filter(function (r) { return r && r.conditionId; }).map(function (r) { return r.conditionId + ">" + r.actionSlot; });
  st.items = g.CombatItems.carried();
  st.heroMax = g.game.heroMaxHp;
  if (g.game.adventureQuestRun.active) try { g.AdventureQuestManager.forfeit(); } catch (x) {}
  S.st = null;
  return st;
}

function moy(a, f) { return a.length ? a.reduce(function (x, r) { return x + f(r); }, 0) / a.length : 0; }
function med(a) { if (!a.length) return 0; var s = a.slice().sort(function (x, y) { return x - y; }); return s[Math.floor(s.length / 2)]; }
function agg(runs) {
  var W = runs.filter(function (r) { return r.win; }), L = runs.filter(function (r) { return !r.win; });
  var slots = {}, nb = {}, dec = {}, ctr = {}, sp = {};
  runs.forEach(function (r) {
    Object.keys(r.parSlot).forEach(function (k) { slots[k] = (slots[k] || 0) + r.parSlot[k] / runs.length; nb[k] = (nb[k] || 0) + r.nbSlot[k] / runs.length; });
    Object.keys(r.dec).forEach(function (k) { dec[k] = (dec[k] || 0) + r.dec[k] / runs.length; });
    Object.keys(r.ctr).forEach(function (k) { ctr[k] = (ctr[k] || 0) + r.ctr[k] / runs.length; });
    Object.keys(r.soinPasse).forEach(function (k) { sp[k] = (sp[k] || 0) + r.soinPasse[k] / runs.length; });
  });
  return { n: runs.length, win: W.length / runs.length, mort: runs.filter(function (r) { return r.mort; }).length / runs.length, fige: runs.filter(function (r) { return r.fige; }).length,
    r: med(runs.map(function (r) { return r.r; })), hpW: moy(W, function (r) { return r.hp; }), bossPctL: moy(L, function (r) { return r.bossPct || 0; }),
    dpr: moy(runs, function (r) { return r.dmg / Math.max(1, r.r); }), dprPct: moy(runs, function (r) { return r.dmg / Math.max(1, r.r) / r.maxHpBoss; }),
    bossHp: runs[0].maxHpBoss, heroMax: runs[0].heroMax, soin: moy(runs, function (r) { return r.soin; }), soinPct: moy(runs, function (r) { return r.soin / r.maxHpBoss; }),
    nSoin: moy(runs, function (r) { return r.nSoin; }), nBouc: moy(runs, function (r) { return r.nBouc; }),
    blinde: moy(runs, function (r) { return r.blinde; }), blindePct: moy(runs, function (r) { return r.blinde / r.maxHpBoss; }),
    miroir: moy(runs, function (r) { return r.miroir; }), through: moy(runs, function (r) { return r.through; }),
    releve: moy(runs, function (r) { return r.releve; }), perteR: moy(runs, function (r) { return r.perte / Math.max(1, r.r) / r.heroMax; }), gainR: moy(runs, function (r) { return r.gain / Math.max(1, r.r) / r.heroMax; }),
    subiR: moy(runs, function (r) { return r.subi / Math.max(1, r.r) / r.heroMax; }), pot: moy(runs, function (r) { return r.pot; }),
    phR: [1, 2].map(function (i) { return med(runs.filter(function (r) { return r.phR.length > i; }).map(function (r) { return r.phR[i]; })); }),
    phAtt: [1, 2].map(function (i) { return runs.filter(function (r) { return r.phR.length > i; }).length / runs.length; }),
    slots: slots, nb: nb, dec: dec, ctr: ctr, sp: sp, rules: runs[0].rules, items: runs[0].items };
}

/* --trace <graine> : une partie (première classe, première piste), journal du jeu round par round. */
function trace() {
  var P = PISTES[0], c = CLASSES[0], g = CB.launch(), S = instrument(g), lines = [];
  if (P !== "jeu") applyPiste(g, P, S);
  var oLog = g.addLog;
  g.addLog = function (m) { if (S.st) lines.push("r" + S.st.r + " PV " + Math.round(100 * g.game.heroHp / g.game.heroMaxHp) + "% boss " + (g.game.enemy ? Math.round(100 * g.game.enemy.hp / g.game.enemy.maxHp) : "-") + "% conc " + ((g.game.classResource || {}).current) + " | " + String(m).replace(/<[^>]+>/g, "")); return oLog.apply(this, arguments); };
  wrap(g.ClassCombatManager, "_chooseRoundAction", function (o, a) { var r = o.apply(this, a); if (a[0] && S.st) { var e = g.game.enemy || {}; lines.push("r" + S.st.r + "   décision " + (r ? (r.matchedConditionId || "repli") + ">" + r.slot : "attaque") + " · annonces soin " + !!e.healTelegraphed + " bouclier " + !!e.shieldTelegraphed + " · cd " + JSON.stringify(g.game.classCooldowns)); } return r; });
  wrap(g.CombatEngine, "heroAction", function (o, a) { var r = o.apply(this, a); if (S.st) lines.push("r" + S.st.r + "   geste " + a[0] + " (" + (a[2] || "") + ") -> " + r); return r; });
  var st = playRun(g, S, fs.readFileSync(path.join(SV, c + "_" + STEP + ".json"), "utf8"), Number(opt("--trace")), P);
  var f = path.join(CH.captures("silhouette-rodeur"), "trace-" + c + "-" + P + "-" + opt("--trace") + ".txt");
  fs.writeFileSync(f, lines.join("\n") + "\nvictoire " + st.win + " rounds " + st.r);
  console.log(f);
}
function main() {
  if (opt("--trace", null)) return trace();
  var dir = CH.captures("silhouette-rodeur"), tag = opt("--tag", "diag"), out = [], all = {}, t0 = Date.now();
  var g = CB.launch(), S = instrument(g), base = {};
  // une enveloppe = un contexte neuf (les pistes modifient des globales)
  PISTES.forEach(function (P) {
    var gg = P === "jeu" ? g : CB.launch(), SS = P === "jeu" ? S : instrument(gg);
    if (P !== "jeu") applyPiste(gg, P, SS);
    CLASSES.forEach(function (c) {
      var txt = fs.readFileSync(path.join(SV, c + "_" + STEP + ".json"), "utf8"), runs = [];
      for (var i = 0; i < RUNS; i++) runs.push(playRun(gg, SS, txt, 910000 + i, P));
      all[P + "|" + c] = agg(runs);
      process.stderr.write(P + "/" + c + " ");
    });
  });
  var p = function (x) { return (100 * x).toFixed(0) + " %"; }, f1 = function (x) { return x.toFixed(1); };
  out.push("BANC SILHOUETTE (tour_18) — " + RUNS + " parties par cellule, graines 910000+, Grimoire réduit à 3 puis « Tout préparer » (v3.736), " + ((Date.now() - t0) / 60000).toFixed(1) + " min");
  PISTES.forEach(function (P) {
    out.push("\n== Piste " + P);
    CLASSES.forEach(function (c) {
      var a = all[P + "|" + c];
      out.push("  " + NOMS[c].padEnd(10) + "victoires " + p(a.win).padStart(5) + " · morts " + p(a.mort) + " · rounds méd " + a.r + " · PV restants (vict.) " + p(a.hpW) + " · boss restant (déf.) " + p(a.bossPctL) + " · potions " + f1(a.pot) + (a.fige ? " · FIGÉS " + a.fige : ""));
      out.push("            boss " + a.bossHp + " PV, héros " + a.heroMax + " PV · dégâts/round " + Math.round(a.dpr) + " (" + (100 * a.dprPct).toFixed(2) + " % PV boss) · subis/round " + (100 * a.subiR).toFixed(1) + " % PV héros (toutes pertes " + (100 * a.perteR).toFixed(1) + " %, regain " + (100 * a.gainR).toFixed(1) + " % potions comprises) · relevé ×" + f1(a.releve));
      out.push("            soin du boss " + Math.round(a.soin) + " (" + p(a.soinPct) + " PV max, " + f1(a.nSoin) + " soins ; passés : " + Object.keys(a.sp).map(function (k) { return k + " " + f1(a.sp[k]); }).join(", ") + ") · boucliers " + f1(a.nBouc) + " · Blindé perdu " + Math.round(a.blinde) + " (" + p(a.blindePct) + " PV max) · miroir −25 % ×" + f1(a.miroir) + " · coups dans la lumière " + f1(a.through));
      out.push("            phases : 60 % au r" + a.phR[0] + " (" + p(a.phAtt[0]) + "), 30 % au r" + a.phR[1] + " (" + p(a.phAtt[1]) + ") · règles " + a.rules.join(" · ") + (a.items.length ? " · objets " + a.items.join(",") : ""));
      out.push("            dégâts par geste : " + Object.keys(a.slots).sort().map(function (k) { return k + " " + Math.round(a.slots[k]) + " (" + f1(a.nb[k]) + " coups)"; }).join(" · "));
      out.push("            décisions : " + Object.keys(a.dec).sort(function (x, y) { return a.dec[y] - a.dec[x]; }).map(function (k) { return k + " " + f1(a.dec[k]); }).join(" · ") + " · contres " + Object.keys(a.ctr).map(function (k) { return k + " " + f1(a.ctr[k]); }).join(" · "));
    });
  });
  var txt = out.join("\n");
  fs.writeFileSync(path.join(dir, tag + "-" + RUNS + "runs.txt"), txt);
  fs.writeFileSync(path.join(dir, tag + "-" + RUNS + "runs.json"), JSON.stringify(all, null, 1));
  console.log(txt);
}
main();
