"use strict";
/* tools/sim/tir-perforant-bench.js — v3.708.0 (décision A, Seb 05/11) : trait propre de Tir perforant (Rôdeur), perdu avec les
   faiblesses (v3.701). Candidats posés par le banc seulement (le jeu n'est pas touché), sur le vrai moteur et une vraie sauvegarde.

   Variantes (--variante, plusieurs séparées par des virgules) :
     actuel  : 200 % des dégâts, rien d'autre (ignoreAffinity est inerte depuis v3.701) ;
     perce   : ignore les réductions de la cible (bouclier levé 50 %, Blindé 10-20 %, carapace du Golem-forge) ;
     guet    : +X % (--x, 0,5 par défaut) contre une cible qui annonce un coup, a levé un bouclier ou est Blindée ;
     plein   : critique garanti si la Concentration est pleine au lancement ;
     crit    : critique garanti toujours (borne haute de « plein ») ;
     traverse: la flèche touche aussi un second ennemi debout (--traverse, part du coup, 1 par défaut).
     Depuis v3.709.0, « traverse » est dans le jeu : « actuel » l'inclut, la variante « traverse » la doublerait.
     Leviers de fréquence (Seb 05/11, mesure seule) : cout40 (coût de base 50 → 40, le talent Perforation fixe toujours 40/35) ;
     prio2 / pret : Tir perforant prêt (sans recharge) passe avant Tir précis et Rafale, la Concentration est gardée pour lui
     (attaque de base), avec au moins 2 ennemis debout (prio2) ou toujours (pret) ; contres et Défense du repli jamais touchés.
     Depuis v3.713.0, « pret » est dans le jeu au repli (règle explicite du Grimoire prioritaire) : « actuel » l'inclut.
   Contenus : --donjon N (vagues, campement « souffler », boss) ou --quete id (ex. aq_montagne_dragon).

   USAGE : node tools/sim/tir-perforant-bench.js . --save ranger.json --donjon 3 [--quete id] [--runs N] [--variante actuel,perce,traverse] [--x 0.5] [--traverse 1] */
var fs = require("fs"), path = require("path");
var base = fs.readFileSync(path.join(__dirname, "plafond-bench.js"), "utf8");
base = base.slice(0, base.indexOf('console.log("COMBATS DE L\'HISTOIRE'));
var ARGV = process.argv.slice(3);
function opt(k) { var i = ARGV.indexOf(k); return i >= 0 ? ARGV[i + 1] : null; }
var SAVE = opt("--save");
var DJ = opt("--donjon") ? Number(opt("--donjon")) : null;
var QID = opt("--quete");
var VARIANTES = (opt("--variante") || "actuel,perce,guet,plein,traverse").split(",");
var X = opt("--x") !== null ? Number(opt("--x")) : 0.5;
var TRAVERSE = opt("--traverse") !== null ? Number(opt("--traverse")) : 1; // part du coup reçue par le second ennemi
if (!SAVE || (!DJ && !QID)) { console.log("--save <fichier> et --donjon N ou --quete id attendus"); process.exit(1); }

var extra = function () {
  var TP_ID = "archer_piercing_shot", V = "actuel", tp = false, plein = false, tpHit = null, TRAV = TRAVERSE;
  var M; // mesures de la variante en cours
  function zero() { return { n: 0, ok: 0, hp: 0, rounds: 0, hero: 0, tpDmg: 0, tpCasts: 0, tpPlein: 0, traverse: 0, cibles: {}, slots: {} }; }
  // Concentration au lancement (avant le coût) : lue avant useSkill
  var us0 = g.ClassCombatManager.useSkill.bind(g.ClassCombatManager);
  g.ClassCombatManager.useSkill = function (slot) {
    var a = g.ClassCombatManager.getAction(slot), rs = g.game.classResource || {};
    plein = !!(a && a.id === TP_ID && Number(rs.current || 0) >= Number(rs.max || 100));
    var r = us0.apply(g.ClassCombatManager, arguments);
    if (r) M.slots[slot] = (M.slots[slot] || 0) + 1;
    if (r && a && a.id === TP_ID) { M.tpCasts++; if (plein) M.tpPlein++; }
    return r;
  };
  var ad0 = g.ClassCombatManager.applyDamageAction.bind(g.ClassCombatManager);
  g.ClassCombatManager.applyDamageAction = function (action, cond) {
    if (!action || action.id !== TP_ID) return ad0(action, cond);
    if (V === "crit" || (V === "plein" && plein)) action = Object.assign({}, action, { critBonus: 100 });
    tp = true; tpHit = null;
    var cible = g.game.enemy;
    try {
      var r = ad0(action, cond);
      // traverse : la flèche touche aussi un second ennemi debout, même coup (critique compris), réductions de la cible comprises
      if (V === "traverse" && tpHit) {
        var autre = (g.CombatActors.standingEnemies() || []).filter(function (e) { return e !== cible; })[0];
        if (autre) { M.traverse++; g.CombatEngine.dealDamage(tpHit.dmg * TRAV, tpHit.crit, true, true, autre); }
      }
      return r;
    } finally { tp = false; }
  };
  // Leviers prio2 / pret : un contre (annonce ou archétype), la Défense et la veine gardent la main
  var CCM = g.ClassCombatManager, cr0 = CCM.chooseRoundAction.bind(CCM);
  CCM.chooseRoundAction = function (forExec) {
    var r = cr0(forExec);
    if (V !== "prio2" && V !== "pret") return r;
    if (r && (r.slot === "skill3" || r.slot === "defense" || r.slot === "vein")) return r;
    var tpA = CCM.getAction("skill3");
    if (!tpA || Number((g.game.classCooldowns || {})[TP_ID] || 0) > 0) return r;
    if (V === "prio2" && (g.CombatActors.standingEnemies() || []).length < 2) return r;
    if (r && r.slot) {
      var a = CCM.getAction(r.slot), ctx = CCM.getGrimoireCombatContext();
      if (g.actionCountersLiveAnnounce(a, ctx) || (r.matchedConditionId && g.isCounterConditionOfAction(a, r.matchedConditionId))) return r;
    }
    if (Number((g.game.classResource || {}).current || 0) >= Number(tpA.resourceCost || 0)) return { slot: "skill3", matchedConditionId: null };
    return null; // attaque de base : la Concentration monte jusqu'au Tir perforant
  };
  var ab0 = g.VeinSystem.absorb.bind(g.VeinSystem);
  g.VeinSystem.absorb = function (foe, dmg) { return (tp && V === "perce") ? dmg : ab0(foe, dmg); };
  var dd0 = g.CombatEngine.dealDamage.bind(g.CombatEngine);
  g.CombatEngine.dealDamage = function (dmg, isCrit, fromTap, ign, target) {
    var foe = target || g.game.enemy;
    if (tp && foe && !tpHit) tpHit = { dmg: dmg, crit: isCrit };
    if (tp && foe) {
      if (V === "perce") {
        var keep = 1;
        if ((foe.isBoss || foe.archetype === "shielded" || foe.wallShield) && Number(foe.shieldRounds || 0) > 0)
          keep *= 1 - ((g.CombatItems && g.CombatItems.holds("shielded")) ? g.COMBAT_ITEM_ACID_SHIELD_REDUCTION : g.BOSS_SHIELD_REDUCTION);
        if (foe.archetype === "armored") keep *= 1 - g.getArmoredEffectiveDamageReduction(foe);
        dmg = dmg / Math.max(0.05, keep);
      } else if (V === "guet") {
        var guet = foe.chargeTelegraphed || foe.shieldTelegraphed || foe.healTelegraphed || foe.silenceTelegraphed || foe.surgeTelegraphed
          || Number(foe.shieldRounds || 0) > 0 || foe.archetype === "armored";
        if (guet) dmg *= 1 + X;
      }
    }
    var h0 = foe ? Number(foe.hp || 0) + Number(foe.shell || 0) : 0;
    var r = dd0(dmg, isCrit, fromTap, ign, target);
    if (foe && !g.game._dtComp && M) {
      var dl = Math.max(0, Math.min(h0, h0 - Math.max(0, Number(foe.hp || 0)) - Number(foe.shell || 0)));
      M.hero += dl; if (tp) M.tpDmg += dl;
      if (foe.isBoss || foe.isElite) { var c = M.cibles[foe.name] = M.cibles[foe.name] || { hero: 0, tp: 0, rounds: 0 }; c.hero += dl; if (tp) c.tp += dl; }
    }
    return r;
  };
  var CM = g.CompanionManager;
  ["takeTurn", "playTurn", "companionTurn", "actTurn"].forEach(function (k) { if (typeof CM[k] === "function") { var f = CM[k].bind(CM); CM[k] = function () { g.game._dtComp = true; try { return f.apply(CM, arguments); } finally { g.game._dtComp = false; } }; } });
  var ar0 = autoRound;
  autoRound = function () {
    var marq = (g.CombatActors.aliveEnemies() || []).filter(function (e) { return e.isBoss || e.isElite; })[0];
    if (marq && M) { var c = M.cibles[marq.name] = M.cibles[marq.name] || { hero: 0, tp: 0, rounds: 0 }; c.rounds++; }
    return ar0.apply(this, arguments);
  };

  function charge(saveTxt, seed) {
    B.seedRng(seed);
    g.restoreBaseState(JSON.parse(saveTxt));
    B.seedRng(seed);
    g.ensureGrimoireRules();
    B.run("game.combatMode = 'grimoire'; EquipmentManager.recalcStats(); game.heroHp = game.heroMaxHp; CompanionManager.healAll();");
  }
  function donjon() {
    var d = g.DUNGEONS.filter(function (x) { return x.id === DJ; })[0];
    var cleared = Object.assign({}, g.game.dungeonTierCleared); delete cleared[DJ];
    g.game.dungeonTierCleared = cleared; g.game.dungeonRunsUsed = {};
    if (g.game.dungeonRun) g.game.dungeonRun.active = false;
    var garde = d.requiresStoryStep; d.requiresStoryStep = null;
    var boss0 = Number(g.game.dungeonBossClears || 0);
    g.DungeonManager.start(DJ, []);
    d.requiresStoryStep = garde;
    if (!g.game.dungeonRun.active) return null;
    var rounds = 0, guard = 8000;
    while (g.game.dungeonRun.active && g.game.heroHp > 0 && guard-- > 0) {
      if (g.DungeonManager.isCampPending()) { g.DungeonManager.campAction("souffler"); if (!g.game.dungeonRun.active) break; }
      if (g.DungeonManager.isHaltPending && g.DungeonManager.isHaltPending()) g.DungeonManager.haltAction(null);
      g.game.activeTab = "combat";
      if (!autoRound()) break;
      rounds++;
    }
    return { ok: Number(g.game.dungeonBossClears || 0) > boss0, rounds: rounds };
  }
  function quete() {
    g.game.adventureQuestsCompleted = {}; g.game.adventureQuestProgress = {};
    var garde = g.ADVENTURE_QUESTS[QID].requiresStoryStep; g.ADVENTURE_QUESTS[QID].requiresStoryStep = null;
    var r = playQuest(QID);
    g.ADVENTURE_QUESTS[QID].requiresStoryStep = garde;
    return r;
  }

  var t = fs.readFileSync(SAVE, "utf8"), sv = JSON.parse(t);
  console.log("TIR PERFORANT — " + (DJ ? "donjon " + DJ : QID) + " · " + path.basename(SAVE) + " (" + sv.heroId + ", niv. " + sv.heroLevel + ") · " + RUNS + " runs par variante, mêmes tirages"
    + " · guet +" + Math.round(X * 100) + " %");
  var ref = null;
  VARIANTES.forEach(function (v) {
    V = v; M = zero();
    g.CLASS_SKILLS.archer.actions.skill3.resourceCost = v === "cout40" ? 40 : 50;
    for (var i = 0; i < RUNS; i++) {
      charge(t, 97000 + i);
      var r = DJ ? donjon() : quete();
      if (!r) continue;
      M.n++; M.rounds += r.rounds;
      if (r.ok) { M.ok++; M.hp += Math.max(0, g.game.heroHp) / g.game.heroMaxHp; }
    }
    var n = Math.max(1, M.n), dpr = M.hero / Math.max(1, M.rounds);
    if (!ref) ref = dpr;
    console.log("  " + v.padEnd(7) + " victoire " + String(Math.round(100 * M.ok / n)).padStart(3) + " %  PV fin " + String(Math.round(100 * (M.ok ? M.hp / M.ok : 0))).padStart(3) + " %"
      + "  rounds " + String(Math.round(M.rounds / n)).padStart(4) + "  dégâts héros/round " + String(Math.round(dpr)).padStart(6) + " (" + (dpr / ref >= 1 ? "+" : "") + Math.round(100 * (dpr / ref - 1)) + " %)"
      + "  part TP " + String(Math.round(100 * M.tpDmg / Math.max(1, M.hero))).padStart(3) + " %  TP/run " + (M.tpCasts / n).toFixed(1) + " (plein " + Math.round(100 * M.tpPlein / Math.max(1, M.tpCasts)) + " %, second touché " + Math.round(100 * M.traverse / Math.max(1, M.tpCasts)) + " %)"
      + "  techniques/run " + Object.keys(M.slots).sort().map(function (k) { return k + " " + (M.slots[k] / n).toFixed(1); }).join(" · "));
    Object.keys(M.cibles).forEach(function (k) {
      var c = M.cibles[k];
      if (c.rounds / n < 1) return;
      console.log("          " + k.padEnd(28) + " rounds/run " + (c.rounds / n).toFixed(1).padStart(5) + "  dégâts héros/round " + String(Math.round(c.hero / Math.max(1, c.rounds))).padStart(6) + "  part TP " + Math.round(100 * c.tp / Math.max(1, c.hero)) + " %");
    });
  });
};
eval(base + "\n(" + extra.toString() + ")();");
