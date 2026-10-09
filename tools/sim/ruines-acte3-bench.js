"use strict";
/* tools/sim/ruines-acte3-bench.js — v3.430.0 (Ruines, acte III, livraison 1) : le Sanctuaire scellé
   joué en entier sur le vrai moteur, campement compris (Souffler à la halte, ou --camp sortir).
   Même socle que ruines-acte2-bench.js (plafond-bench.js, profils fin2 / palier).

   Profils :
     palier : fin de l'acte II (Inhabituel complet, reforge 4), l'entrée de ruines_12 ;
     rare   : palier de l'acte III visé (4 pièces Rares dont l'arme du Fleuve, reforge de l'arme 7),
              le profil de ruines_15 (Varrek). Approximation : la Forge 4 n'existe pas encore.
   Cibles (Conception RU6) : combats d'Histoire 65-80 % par classe, Rôdeur ≥ 60 %.

   USAGE : node tools/sim/ruines-acte3-bench.js . [--runs N] [--profil palier|rare] [--diff x] [--boss p,e]
           [--party wenna,maddoc] [--camp souffler|changer]
           node tools/sim/ruines-acte3-bench.js . --golem [--quete aq_ruines_coeur] [--runs N] [--enc pv,puissance] [--golemmult puissance,endurance] [--qboss pv,puissance]  (étapes 14, 18, 19) */
var fs = require("fs"), path = require("path");
var base = fs.readFileSync(path.join(__dirname, "plafond-bench.js"), "utf8");
base = base.slice(0, base.indexOf('console.log("COMBATS DE L\'HISTOIRE'));
var ARGV = process.argv.slice(3);
function arg(k) { return ARGV.indexOf(k) >= 0 ? ARGV[ARGV.indexOf(k) + 1] : null; }
var PROFIL_ARG = arg("--profil");
var PARTY = (arg("--party") || "wenna,maddoc").split(",");
var CAMP = arg("--camp") || "souffler";
var GOLEM = ARGV.indexOf("--golem") >= 0;   // v3.431.0 : la quête de l'étape 14 au lieu du Sanctuaire
var QUETE = arg("--quete") || "aq_ruines_golem"; // v3.432.0 : ou aq_ruines_coeur (étape 18), aq_ruines_plan (19)
var QBOSS = arg("--qboss") ? arg("--qboss").split(",").map(Number) : null; // v3.433.0 : essai bossHpMult,bossPowerMult
var QENC = arg("--enc") ? arg("--enc").split(",").map(Number) : null; // essai : encounterHpMult,enemyPowerMult
var GOLEM_MULT = arg("--golemmult") ? arg("--golemmult").split(",").map(Number) : null; // essai : puissance,endurance

var extra = function () {
  PROFILS.palier = { label: "Palier de l'acte II", train: 120, gear: "palier", points: 12, wenna: 5, maddoc: 4 };
  PROFILS.rare = { label: "Palier Rare (acte III)", train: 120, gear: "rare", points: 12, wenna: 5, maddoc: 4 };
  var _equipFor = equipFor;
  equipFor = function (p) {
    if (p.gear !== "palier" && p.gear !== "rare") return _equipFor(p);
    _equipFor({ gear: "cite" });
    var it = g.EliteManager.buildUniqueLoot("arme_fleuve");
    if (it) g.game.equipped.weapon = it;
    var E = g.game.equipped, order = g.RARITY_ORDER;
    g.EQUIPMENT_SLOTS.forEach(function (slot) {
      if (E[slot] && order.indexOf(E[slot].rarity) >= order.indexOf("green")) return;
      var n = g.generateEquipmentItem(slot, "green", 2);
      if (n) E[slot] = n;
    });
    g.game.forge = { levels: { weapon: 4, armor: 4, helmet: 3, gloves: 3, boots: 3, ring: 2, amulet: 2 } };
    if (p.gear === "rare") {
      // 4 Rares sur 7 : l'arme du Fleuve + trois pièces Rares du monde 3 (tirage moyen) ; arme reforgée à 7
      ["armor", "helmet", "boots"].forEach(function (slot) { var n = g.generateEquipmentItem(slot, "rare", 2); if (n) E[slot] = n; });
      g.game.forge.levels.weapon = 7;
    }
  };

  function party(ids) {
    ["wenna", "maddoc", "edda"].forEach(function (id) {
      var st = g.CompanionManager.state(id); st.present = ids.indexOf(id) !== -1;
    });
    g.CompanionManager.refreshParty();
  }

  /* Le Sanctuaire, de bout en bout : la halte est tranchée par CAMP. */
  function playSanctuaire() {
    var d = g.DUNGEONS.filter(function (x) { return x.id === 3; })[0];
    var garde = d.requiresStoryStep;
    g.game.dungeonTierCleared = { 1: true, 2: true };
    g.DungeonManager.ensure();
    g.game.dungeonRunsUsed = {};
    d.requiresStoryStep = null;
    if (DIFF) d.difficultyMult = DIFF;
    if (BOSS) { d.boss.statMult.power = BOSS.power; d.boss.statMult.endurance = BOSS.endurance; }
    var boss0 = Number(g.game.dungeonBossClears || 0);
    g.DungeonManager.start(3, []);
    d.requiresStoryStep = garde;
    if (!g.game.dungeonRun.active) return null;
    var rounds = 0, guard = 5000, camp = false, hpCamp = null, hpBoss = null, pot0 = Number(g.game.healingPotionsOwned.potion_soin_mineur || 0);
    while (g.game.dungeonRun.active && g.game.heroHp > 0 && guard-- > 0) {
      if (g.DungeonManager.isCampPending()) {
        camp = true; hpCamp = g.game.heroHp / g.game.heroMaxHp;
        if (CAMP === "changer") g.DungeonManager.campAction("changer", ["edda", "maddoc"]) || g.DungeonManager.campAction("souffler");
        else g.DungeonManager.campAction(CAMP);
        if (!g.game.dungeonRun.active) break;
      }
      if (hpBoss === null && (g.game.dungeonRun.wave || 1) > g.DUNGEON_CONFIG.waveCount) hpBoss = g.game.heroHp / g.game.heroMaxHp;
      g.game.activeTab = "combat";
      if (!autoRound()) break;
      rounds++;
    }
    return { camp: camp, hpCamp: hpCamp, boss: hpBoss !== null, ok: Number(g.game.dungeonBossClears || 0) > boss0, rounds: rounds,
      hp: Math.max(0, g.game.heroHp) / g.game.heroMaxHp, pots: pot0 - Number(g.game.healingPotionsOwned.potion_soin_mineur || 0) };
  }

  function mesure(c, profil) {
    var n = 0, camp = 0, hpCamp = 0, boss = 0, ok = 0, rounds = 0, hp = 0, pots = 0;
    for (var i = 0; i < RUNS; i++) {
      B.seedRng(73000 + i);
      prepare(c, profil, 2, true, true);
      g.CompanionManager.unlock("edda");
      party(PARTY);
      B.run("CompanionManager.healAll();");
      var r = playSanctuaire();
      if (!r) continue;
      n++; pots += r.pots;
      if (r.camp) { camp++; hpCamp += r.hpCamp; }
      if (r.boss) boss++;
      if (r.ok) { ok++; rounds += r.rounds; hp += r.hp; }
    }
    return { n: n, camp: camp / n, hpCamp: camp ? hpCamp / camp : 0, boss: boss / n, win: ok / n, rounds: ok ? rounds / ok : 0, hp: ok ? hp / ok : 0, pots: pots / n };
  }

  /* v3.431.0 — étape 14 : « Ce que la cité ne finit pas » (3 rencontres puis le Golem), au palier Rare. */
  if (GOLEM) {
    var Q = g.ADVENTURE_QUESTS[QUETE];
    if (QENC) { Q.encounterHpMult = QENC[0]; Q.enemyPowerMult = QENC[1]; }
    if (QBOSS) { Q.bossHpMult = QBOSS[0]; Q.bossPowerMult = QBOSS[1]; }
    if (GOLEM_MULT) Q.eliteStatMult = { power: GOLEM_MULT[0], endurance: GOLEM_MULT[1] }; // v3.431.0 : le Golem de la quête
    var garde = Q.requiresStoryStep; Q.requiresStoryStep = null;
    console.log(Q.name.toUpperCase() + " — " + RUNS + " runs, profil Rare, " + PARTY.join(" + ") + ", potions du profil"
      + (QENC ? " · essai rencontres PV ×" + QENC[0] + " puissance ×" + QENC[1] : "") + (GOLEM_MULT ? " · essai Golem p" + GOLEM_MULT[0] + " e" + GOLEM_MULT[1] : "") + (QBOSS ? " · essai boss PV ×" + QBOSS[0] + " puissance ×" + QBOSS[1] : ""));
    console.log("Cible (RU6) : 65-80 % par classe, Rôdeur ≥ 60 %.\n");
    B.CLASSES.forEach(function (c) {
      var n = 0, ok = 0, rounds = 0, hp = 0;
      for (var i = 0; i < RUNS; i++) {
        B.seedRng(77000 + i);
        prepare(c, PROFILS[PROFIL_ARG || "rare"], 2, true, true);
        g.CompanionManager.unlock("edda"); party(PARTY);
        B.run("CompanionManager.healAll();");
        g.game.adventureQuestsCompleted = {};
        var r = playQuest(QUETE);
        if (!r) continue;
        n++;
        if (r.ok) { ok++; rounds += r.rounds; hp += Math.max(0, g.game.heroHp) / g.game.heroMaxHp; }
      }
      console.log("   " + c.label.padEnd(10) + " réussite " + String(Math.round(100 * ok / Math.max(1, n))).padStart(3) + " %   rounds " + String(Math.round(ok ? rounds / ok : 0)).padStart(4)
        + "   PV fin " + String(Math.round(100 * (ok ? hp / ok : 0))).padStart(3) + " %   (" + n + " runs)");
    });
    Q.requiresStoryStep = garde;
    return;
  }

  var profils = PROFIL_ARG ? [PROFIL_ARG] : ["palier", "rare"];
  console.log("SANCTUAIRE SCELLÉ — " + RUNS + " runs, Grimoire auto, potions du profil, campement : " + CAMP + " · groupe : " + PARTY.join(" + ")
    + (DIFF ? " · essai difficultyMult " + DIFF : "") + (BOSS ? " · essai boss p" + BOSS.power + " e" + BOSS.endurance : ""));
  console.log("Cible (RU6) : combats d'Histoire 65-80 % par classe, Rôdeur ≥ 60 %.\n");
  profils.forEach(function (pid) {
    console.log(PROFILS[pid].label);
    B.CLASSES.forEach(function (c) {
      var r = mesure(c, PROFILS[pid]);
      console.log("   " + c.label.padEnd(10) + " campement " + String(Math.round(100 * r.camp)).padStart(3) + " % (PV " + String(Math.round(100 * r.hpCamp)).padStart(3) + " %)"
        + "   Varrek atteint " + String(Math.round(100 * r.boss)).padStart(3) + " %   vaincu " + String(Math.round(100 * r.win)).padStart(3) + " %"
        + "   rounds " + String(Math.round(r.rounds)).padStart(4) + "   PV fin " + String(Math.round(100 * r.hp)).padStart(3) + " %   potions " + r.pots.toFixed(1));
    });
  });
};
eval(base + "\n(" + extra.toString() + ")();");
