"use strict";
/* tools/sim/crypte-acte3-bench.js — v3.455.0 (Crypte, lot C-4) : l'acte III sur le vrai moteur.
   L'Ossuaire de bout en bout (Porte-couronne, campement, Pleureuse, Liche), et la quête de la Pleureuse (étape 14).
   Socle : crypte-acte2-bench.js (profil crypte) et ruines-acte3-bench.js (donjon, campement).

   Profils : rare   = palier Rare de l'acte II (7 Rares, arme à 8), l'entrée de crypte_12 ;
             epique = palier Épique (3 Épiques, arme à 9), l'entrée de crypte_14 et de la Liche (crypte_15).
   Cibles (Conception) : combats d'Histoire 65-80 % par classe, Rôdeur ≥ 60 %.

   USAGE : node tools/sim/crypte-acte3-bench.js . [--runs N] [--profil rare|epique] [--party wenna,maddoc] [--camp souffler|sortir]
           [--diff x] [--boss p,e]
           node tools/sim/crypte-acte3-bench.js . --pleureuse [--runs N] [--party ysolt,maddoc] [--enc pv,puissance] [--elite p,e]
           node tools/sim/crypte-acte3-bench.js . --quete aq_crypte_maillons|aq_crypte_retient [--runs N] [--enc pv,puissance] [--qboss pv,puissance]  (v3.456.0, acte IV) */
var fs = require("fs"), path = require("path");
var base = fs.readFileSync(path.join(__dirname, "plafond-bench.js"), "utf8");
base = base.slice(0, base.indexOf('console.log("COMBATS DE L\'HISTOIRE'));
var ARGV = process.argv.slice(3);
function arg(k) { return ARGV.indexOf(k) >= 0 ? ARGV[ARGV.indexOf(k) + 1] : null; }
var PROFIL_ARG = arg("--profil");
var QUETE = arg("--quete");   // v3.456.0 : une quête de l'acte IV (aq_crypte_maillons, aq_crypte_retient), même profil
var PLEUREUSE = ARGV.indexOf("--pleureuse") >= 0 || !!QUETE;
var PARTY = (arg("--party") || (PLEUREUSE && !QUETE ? "ysolt,maddoc" : "wenna,maddoc")).split(",");
var QBOSS4 = arg("--qboss") ? arg("--qboss").split(",").map(Number) : null; // essai bossHpMult,bossPowerMult
var CAMP = arg("--camp") || "souffler";
var QENC = arg("--enc") ? arg("--enc").split(",").map(Number) : null;
var QELITE = arg("--elite") ? arg("--elite").split(",").map(Number) : null;
var DIFF3 = arg("--diff") ? Number(arg("--diff")) : null;
var BOSS3 = arg("--boss") ? arg("--boss").split(",").map(Number) : null;

var extra = function () {
  PROFILS.rare = { label: "Palier Rare (entrée de l'Ossuaire)", train: 140, gear: "rare", points: 13, wenna: 6, maddoc: 6 };
  PROFILS.epique = { label: "Palier Épique (Pleureuse, Liche)", train: 150, gear: "epique", points: 13, wenna: 7, maddoc: 7 };
  var _equipFor = equipFor;
  equipFor = function (p) {
    if (p.gear !== "rare" && p.gear !== "epique") return _equipFor(p);
    _equipFor({ gear: "cite" });
    var E = g.game.equipped;
    // 7 Rares (l'arme du Cœur, Épique, compte) ; au palier Épique, deux Épiques de plus et l'arme à 9
    g.EQUIPMENT_SLOTS.forEach(function (slot) { var n = g.generateEquipmentItem(slot, "rare", 3); if (n) E[slot] = n; });
    var arme = g.EliteManager.buildUniqueLoot("arme_coeur");
    if (arme) E.weapon = arme;
    g.game.forge = { levels: { weapon: 8, armor: 8, helmet: 4, gloves: 4, boots: 4, ring: 3, amulet: 3 } };
    if (p.gear === "epique") {
      ["armor", "helmet"].forEach(function (slot) { var n = g.generateEquipmentItem(slot, "epic", 3); if (n) E[slot] = n; });
      g.game.forge.levels.weapon = 9;
    }
  };
  var _isReached = g.StoryQuestManager.isStepReached;
  g.StoryQuestManager.isStepReached = function (id) { return id === "crypte_08" ? true : _isReached.call(g.StoryQuestManager, id); }; // l'appel actif
  // plafond de l'acte III : 18 points = 13 + 5 nœuds du Commandement
  function commandement() { g.TALENT_COMMAND.nodes.slice(0, 5).forEach(function (n) { g.game.talents[n.id] = 1; }); }
  function party(ids) {
    ["wenna", "maddoc", "edda", "ysolt"].forEach(function (id) { var st = g.CompanionManager.state(id); st.present = ids.indexOf(id) !== -1; });
    g.CompanionManager.refreshParty();
  }
  function prep(c, profil, seed) {
    B.seedRng(seed);
    prepare(c, profil, 3, true, true);
    g.game.worldsEverReached = { 0: true, 1: true, 2: true, 3: true };
    g.CompanionManager.unlock("edda"); g.CompanionManager.unlock("ysolt");
    commandement(); party(PARTY);
    B.run("CompanionManager.healAll();");
  }

  if (PLEUREUSE) {
    var QID = QUETE || "aq_crypte_pleureuse", Q = g.ADVENTURE_QUESTS[QID];
    if (QBOSS4) { Q.bossHpMult = QBOSS4[0]; Q.bossPowerMult = QBOSS4[1]; }
    if (QENC) { Q.encounterHpMult = QENC[0]; Q.enemyPowerMult = QENC[1]; }
    if (QELITE) Q.eliteStatMult = { power: QELITE[0], endurance: QELITE[1] };
    var garde = Q.requiresStoryStep; Q.requiresStoryStep = null;
    console.log(Q.name.toUpperCase() + " — " + RUNS + " runs, profil " + (PROFIL_ARG || "epique") + ", " + PARTY.join(" + ") + ", potions du profil"
      + (QENC ? " · essai rencontres PV ×" + QENC[0] + " puissance ×" + QENC[1] : "") + (QELITE ? " · essai Pleureuse p" + QELITE[0] + " e" + QELITE[1] : "") + (QBOSS4 ? " · essai boss PV ×" + QBOSS4[0] + " puissance ×" + QBOSS4[1] : ""));
    console.log("Cible : 65-80 % par classe, Rôdeur ≥ 60 %.\n");
    var chaines = 0, _chain = g.SleepSystem.chainedTurn; // v3.456.0 : tours perdus aux chaînes
    g.SleepSystem.chainedTurn = function (a) { var r = _chain.apply(this, arguments); if (r) chaines++; return r; };
    B.CLASSES.forEach(function (c) {
      var n = 0, ok = 0, rounds = 0, hp = 0;
      chaines = 0;
      for (var i = 0; i < RUNS; i++) {
        prep(c, PROFILS[PROFIL_ARG || "epique"], 79000 + i); // v3.456.3 : --profil rare pour la quête de l'étape 12
        g.game.adventureQuestsCompleted = {};
        var r = playQuest(QID);
        if (!r) continue;
        n++;
        if (r.ok) { ok++; rounds += r.rounds; hp += Math.max(0, g.game.heroHp) / g.game.heroMaxHp; }
      }
      console.log("   " + c.label.padEnd(10) + " réussite " + String(Math.round(100 * ok / Math.max(1, n))).padStart(3) + " %   rounds " + String(Math.round(ok ? rounds / ok : 0)).padStart(4)
        + "   PV fin " + String(Math.round(100 * (ok ? hp / ok : 0))).padStart(3) + " %   tours enchaînés " + (chaines / Math.max(1, n)).toFixed(1) + "   (" + n + " runs)");
    });
    Q.requiresStoryStep = garde;
    return;
  }

  /* L'Ossuaire, de bout en bout : la halte est tranchée par CAMP. */
  function playOssuaire() {
    var d = g.DUNGEONS.filter(function (x) { return x.id === 4; })[0];
    var garde = d.requiresStoryStep;
    g.game.dungeonTierCleared = { 1: true, 2: true, 3: true };
    g.DungeonManager.ensure();
    g.game.dungeonRunsUsed = {};
    d.requiresStoryStep = null;
    if (DIFF3) d.difficultyMult = DIFF3;
    if (BOSS3) { d.boss.statMult.power = BOSS3[0]; d.boss.statMult.endurance = BOSS3[1]; }
    var boss0 = Number(g.game.dungeonBossClears || 0);
    g.DungeonManager.start(4, []);
    d.requiresStoryStep = garde;
    if (!g.game.dungeonRun.active) return null;
    var rounds = 0, guard = 6000, camp = false, hpCamp = null, hpBoss = null, pot0 = Number(g.game.healingPotionsOwned.potion_soin_mineur || 0);
    while (g.game.dungeonRun.active && g.game.heroHp > 0 && guard-- > 0) {
      if (g.DungeonManager.isCampPending()) {
        camp = true; hpCamp = g.game.heroHp / g.game.heroMaxHp;
        g.DungeonManager.campAction(CAMP);
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

  var profils = PROFIL_ARG ? [PROFIL_ARG] : ["rare", "epique"];
  console.log("OSSUAIRE — " + RUNS + " runs, Grimoire auto, potions du profil, campement : " + CAMP + " · groupe : " + PARTY.join(" + ")
    + (DIFF3 ? " · essai difficultyMult " + DIFF3 : "") + (BOSS3 ? " · essai Liche p" + BOSS3[0] + " e" + BOSS3[1] : ""));
  console.log("Cible : campement au palier Rare (étape 12), la Liche 65-80 % au palier Épique, Rôdeur ≥ 60 %.\n");
  profils.forEach(function (pid) {
    console.log(PROFILS[pid].label);
    B.CLASSES.forEach(function (c) {
      var n = 0, camp = 0, hpCamp = 0, boss = 0, ok = 0, rounds = 0, hp = 0, pots = 0;
      for (var i = 0; i < RUNS; i++) {
        prep(c, PROFILS[pid], 75000 + i);
        var r = playOssuaire();
        if (!r) continue;
        n++; pots += r.pots;
        if (r.camp) { camp++; hpCamp += r.hpCamp; }
        if (r.boss) boss++;
        if (r.ok) { ok++; rounds += r.rounds; hp += r.hp; }
      }
      n = Math.max(1, n);
      console.log("   " + c.label.padEnd(10) + " campement " + String(Math.round(100 * camp / n)).padStart(3) + " % (PV " + String(Math.round(100 * (camp ? hpCamp / camp : 0))).padStart(3) + " %)"
        + "   Liche atteinte " + String(Math.round(100 * boss / n)).padStart(3) + " %   vaincue " + String(Math.round(100 * ok / n)).padStart(3) + " %"
        + "   rounds " + String(Math.round(ok ? rounds / ok : 0)).padStart(4) + "   PV fin " + String(Math.round(100 * (ok ? hp / ok : 0))).padStart(3) + " %   potions " + (pots / n).toFixed(1));
    });
  });
};
eval(base + "\n(" + extra.toString() + ")();");
