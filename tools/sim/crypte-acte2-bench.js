"use strict";
/* tools/sim/crypte-acte2-bench.js — v3.454.0 (Crypte, lot C-3) : les deux quêtes de combat de l'acte II
   (« Celui qui appelle », « Ceux qui sont tenus »), sur le vrai moteur, l'appel du Nécromancien actif.
   Profils : entrée de l'acte II (celui de l'acte I, + 2 points de Commandement) pour l'appel ;
   palier Rare (7 Rares, arme reforgée à 8) pour les chaînes. Dérivé de crypte-acte1-bench.js.

   Cibles (Seb) : aucun mort ; l'étape finie avec 25 à 35 % des PV en laissant dormir (16/10/2026) ;
   un combat normal de 3 à 5 rounds (CR2, 15/10/2026). Mesuré SANS potion, pour que les PV restants
   disent la vraie perte. Profil « crypte » : celui de la campagne à l'entrée de crypte_02 (entraînement
   130, 13 talents, l'arme du Cœur, Rares sur cinq emplacements, reforge arme et armure 8, Wenna et
   Maddoc +5).

   USAGE : node tools/sim/crypte-acte2-bench.js . [--runs N] [--enc hp,power] [--reveiller]
     --enc       : multiplicateurs d'essai des rencontres (encounterHpMult, enemyPowerMult) ; --enc2 : ceux de l'étape 3 seule
     --reveiller : le héros a la règle « Un ennemi dort » (il réveille les dormeurs)
     --cmd N     : v3.453.0, les N premiers nœuds du Commandement (plafond 15 de l'acte I = 13 + 2) */
var fs = require("fs"), path = require("path");
var base = fs.readFileSync(path.join(__dirname, "plafond-bench.js"), "utf8");
base = base.slice(0, base.indexOf('console.log("COMBATS DE L\'HISTOIRE'));
var ARGV = process.argv.slice(3);
var ENC = ARGV.indexOf("--enc") >= 0 ? ARGV[ARGV.indexOf("--enc") + 1].split(",").map(Number) : null;
var ENC2 = ARGV.indexOf("--enc2") >= 0 ? ARGV[ARGV.indexOf("--enc2") + 1].split(",").map(Number) : ENC; // quête d'Ysolt (étape 3)
var REVEILLER = ARGV.indexOf("--reveiller") >= 0;
var CMD = ARGV.indexOf("--cmd") >= 0 ? Number(ARGV[ARGV.indexOf("--cmd") + 1]) : 2; // plafond 15 de l'acte I = 13 + 2 nœuds du Commandement

var extra = function () {
  PROFILS.crypte = { label: "Fin des Ruines (entrée de la Crypte)", train: 130, gear: "coeur", points: 13, wenna: 5, maddoc: 5 };
  var _equipFor = equipFor;
  equipFor = function (p) {
    if (p.gear !== "coeur") return _equipFor(p);
    _equipFor({ gear: "cite" });
    var E = g.game.equipped, order = g.RARITY_ORDER;
    g.EQUIPMENT_SLOTS.forEach(function (slot) {
      if (E[slot] && order.indexOf(E[slot].rarity) >= order.indexOf("green")) return;
      var n = g.generateEquipmentItem(slot, "green", 2);
      if (n) E[slot] = n;
    });
    ["armor", "helmet", "gloves", "boots", "ring"].forEach(function (slot) { var n = g.generateEquipmentItem(slot, "rare", 2); if (n) E[slot] = n; });
    var arme = g.EliteManager.buildUniqueLoot("arme_coeur");
    if (arme) E.weapon = arme;
    g.game.forge = { levels: { weapon: 8, armor: 8, helmet: 3, gloves: 3, boots: 3, ring: 2, amulet: 2 } };
  };
  var _isReached = g.StoryQuestManager.isStepReached;
  g.StoryQuestManager.isStepReached = function (id) { return id === "crypte_08" ? true : _isReached.call(g.StoryQuestManager, id); }; // l'appel actif
  function palier() { // 7 Rares (l'arme du Cœur, Épique, compte), arme reforgée à 8
    ["helmet", "amulet"].forEach(function (slot) { var n = g.generateEquipmentItem(slot, "rare", 2); if (n) g.game.equipped[slot] = n; });
    g.game.forge.levels.weapon = 8;
  }
  [["aq_crypte_appel", ENC], ["aq_crypte_chaines", ENC2]].forEach(function (x) {
    if (!x[1]) return;
    g.ADVENTURE_QUESTS[x[0]].encounterHpMult = x[1][0]; g.ADVENTURE_QUESTS[x[0]].enemyPowerMult = x[1][1];
  });

  function party(ids) {
    ["wenna", "maddoc", "edda", "ysolt"].forEach(function (id) {
      var st = g.CompanionManager.state(id); st.present = ids.indexOf(id) !== -1;
    });
    g.CompanionManager.refreshParty();
  }
  var CAS = [
    { label: "Étape 8 · Celui qui appelle (Wenna, Maddoc)", q: "aq_crypte_appel", party: ["wenna", "maddoc"] },
    { label: "Étape 8 · Celui qui appelle (Ysolt, Maddoc)", q: "aq_crypte_appel", party: ["maddoc", "ysolt"] },
    { label: "Étape 10 · Ceux qui sont tenus, au palier (Wenna, Maddoc)", q: "aq_crypte_chaines", party: ["wenna", "maddoc"], palier: true },
    { label: "Étape 10 · Ceux qui sont tenus, au palier (Ysolt, Maddoc)", q: "aq_crypte_chaines", party: ["maddoc", "ysolt"], palier: true }
  ];
  var seuls = 0, _wake = g.SleepSystem.wake;
  g.SleepSystem.wake = function (e, byHero) { if (e && e.asleep && !byHero) seuls++; return _wake.apply(this, arguments); };

  function mesure(ct, c) {
    var n = 0, ok = 0, rounds = 0, hp = 0, s0 = 0;
    for (var i = 0; i < RUNS; i++) {
      B.seedRng(71000 + i);
      prepare(c, PROFILS.crypte, 3, true, true);
      g.game.worldsEverReached = { 0: true, 1: true, 2: true, 3: true };
      g.CompanionManager.unlock("edda"); g.CompanionManager.unlock("ysolt");
      if (ct.palier) palier();
      g.TALENT_COMMAND.nodes.slice(0, CMD).forEach(function (n) { g.game.talents[n.id] = 1; });
      party(ct.party);
      B.run("CompanionManager.healAll();");
      g.game.healingPotionsOwned = {};
      if (REVEILLER) {
        g.ensureGrimoireRules();
        g.game.grimoireRules[0] = { conditionId: "enemySleeping", actionSlot: "basic" };
      }
      g.game.adventureQuestsCompleted = {};
      var sb = seuls;
      var r = playQuest(ct.q);
      if (!r) continue;
      n++; s0 += seuls - sb;
      if (r.ok) { ok++; rounds += r.rounds; hp += Math.max(0, g.game.heroHp) / g.game.heroMaxHp; }
    }
    var enc = g.ADVENTURE_QUESTS[ct.q].encounters.length;
    return n ? { win: ok / n, rounds: ok ? rounds / ok / enc : 0, hp: ok ? hp / ok : 0, seuls: s0 / n } : null;
  }

  console.log("CRYPTE, ACTE II — " + RUNS + " runs, profil crypte, SANS potion, Grimoire auto" + (REVEILLER ? " + règle « Un ennemi dort » (réveiller)" : " (laisser dormir)") + (CMD ? " · Commandement " + CMD + " nœud(s)" : "")
    + (ENC ? " · essai : rencontres PV ×" + ENC[0] + ", puissance ×" + ENC[1] + (ENC2 !== ENC ? " ; étape 3 PV ×" + ENC2[0] + ", puissance ×" + ENC2[1] : "") : " · réglage du jeu"));
  console.log("Cibles : aucun mort, 25 à 35 % des PV restants en fin d'étape, 3 à 5 rounds par combat.\n");
  CAS.forEach(function (ct) {
    console.log(ct.label);
    B.CLASSES.forEach(function (c) {
      var r = mesure(ct, c);
      console.log("   " + c.label.padEnd(10) + " réussite " + String(Math.round(100 * r.win)).padStart(3) + " %   rounds/combat " + r.rounds.toFixed(1).padStart(4)
        + "   PV restants " + String(Math.round(100 * r.hp)).padStart(3) + " %   levés seuls " + r.seuls.toFixed(1));
    });
  });
};
eval(base + "\n(" + extra.toString() + ")();");
