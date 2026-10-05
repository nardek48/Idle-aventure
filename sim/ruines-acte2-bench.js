"use strict";
/* sim/ruines-acte2-bench.js — v3.429.0 (Ruines, lot U-7) : les deux quêtes de combat de l'acte II
   (« Celui qui pose les pierres », « La salle qu'il évite »), même banc que l'acte I.
   Copie de ruines-acte1-bench.js — en-tête d'origine :
   les deux quêtes de combat de l'acte I,
   jouées en entier sur le vrai moteur (relève comprise), au profil de fin du chapitre II.

   Cible (Seb, 03/10/2026) : aucun mort, 30 à 45 % de PV perdus. Mesuré SANS potion, pour que
   les PV restants disent la vraie perte. Profil « fin2 » : celui de la campagne de
   plafond-bench.js (uniques, heaume, Forge arme 4 / armure 2, entraînement 110, 11 talents),
   arme du Fleuve en main, Wenna +5, Maddoc +2 (tronc), Edda +0.

   USAGE : node sim/ruines-acte2-bench.js . [--cible soutien]
   ancien usage : node sim/ruines-acte1-bench.js . [--runs N] [--enc hp,power] [--regle]
     --enc   : multiplicateurs d'essai des rencontres (encounterHpMult, enemyPowerMult)
     --regle : le héros a la règle « Un ennemi se relève » (première compétence) */
var fs = require("fs"), path = require("path");
var base = fs.readFileSync(path.join(__dirname, "plafond-bench.js"), "utf8");
base = base.slice(0, base.indexOf('console.log("COMBATS DE L\'HISTOIRE'));
var ARGV = process.argv.slice(3);
var ENC = ARGV.indexOf("--enc") >= 0 ? ARGV[ARGV.indexOf("--enc") + 1].split(",").map(Number) : null;
var REGLE = ARGV.indexOf("--regle") >= 0;
var CIBLE = ARGV.indexOf("--cible") >= 0 ? ARGV[ARGV.indexOf("--cible") + 1] : null;

var extra = function () {
  PROFILS.fin2 = { label: "Fin du chapitre II", train: 110, gear: "fleuve", points: 11, wenna: 5, maddoc: 2 };
  /* Profil « palier » (étape 10) : fin2, puis chaque pièce commune remplacée par une pièce
     Inhabituelle du monde 3 (generateEquipmentItem, tirage moyen) et reforge 4 partout. */
  PROFILS.palier = { label: "Palier de l'acte II", train: 120, gear: "palier", points: 12, wenna: 5, maddoc: 4 };
  var _equipFor = equipFor;
  equipFor = function (p) {
    if (p.gear !== "fleuve" && p.gear !== "palier") return _equipFor(p);
    _equipFor({ gear: "cite" });
    var it = g.EliteManager.buildUniqueLoot("arme_fleuve");
    if (it) g.game.equipped.weapon = it;
    if (p.gear === "palier") {
      var E = g.game.equipped, order = g.RARITY_ORDER;
      g.EQUIPMENT_SLOTS.forEach(function (slot) {
        if (E[slot] && order.indexOf(E[slot].rarity) >= order.indexOf("green")) return;
        var n = g.generateEquipmentItem(slot, "green", 2);
        if (n) E[slot] = n;
      });
      g.game.forge = { levels: { weapon: 4, armor: 4, helmet: 3, gloves: 3, boots: 3, ring: 2, amulet: 2 } };
    }
  };
  if (ENC) ["aq_ruines_batisseur", "aq_ruines_salle"].forEach(function (id) {
    g.ADVENTURE_QUESTS[id].encounterHpMult = ENC[0]; g.ADVENTURE_QUESTS[id].enemyPowerMult = ENC[1];
  });

  function party(ids) {
    ["wenna", "maddoc", "edda"].forEach(function (id) {
      var st = g.CompanionManager.state(id); st.present = ids.indexOf(id) !== -1;
    });
    g.CompanionManager.refreshParty();
  }
  var CAS = [
    { label: "Étape 8 · Celui qui pose les pierres (Wenna, Maddoc)", q: "aq_ruines_batisseur", party: ["wenna", "maddoc"] },
    { label: "Étape 8 · Celui qui pose les pierres (Maddoc, Edda)", q: "aq_ruines_batisseur", party: ["maddoc", "edda"] },
    { label: "Étape 8 · Celui qui pose les pierres (Wenna, Edda)", q: "aq_ruines_batisseur", party: ["wenna", "edda"] },
    { label: "Étape 10 · La salle qu'il évite (Wenna, Maddoc)", q: "aq_ruines_salle", party: ["wenna", "maddoc"] },
    { label: "Étape 10 · La salle qu'il évite (Maddoc, Edda)", q: "aq_ruines_salle", party: ["maddoc", "edda"] }
  ];
  var rises = 0, finished = 0;
  var _tr = g.RiseSystem.tryRise, _ot = g.RiseSystem.onEnemyTurn;
  g.RiseSystem.tryRise = function (e) { var d = e && e.downed; var r = _tr.call(this, e); if (d) finished++; return r; };
  g.RiseSystem.onEnemyTurn = function (e) { var was = e && e.downed && Number(e.riseIn) === 1; var r = _ot.call(this, e); if (was && !e.downed) rises++; return r; };

  function mesure(ct, c) {
    var n = 0, ok = 0, rounds = 0, hp = 0, r0 = 0, f0 = 0;
    for (var i = 0; i < RUNS; i++) {
      B.seedRng(61000 + i);
      prepare(c, ct.q === "aq_ruines_salle" ? PROFILS.palier : PROFILS.fin2, 2, true, true);
      g.CompanionManager.unlock("edda");
      party(ct.party);
      B.run("CompanionManager.healAll();");
      g.game.healingPotionsOwned = {};
      if (REGLE) {
        g.ensureGrimoireRules();
        g.game.grimoireRules[0] = { conditionId: "enemyRising", actionSlot: "skill1" };
      }
      if (CIBLE) g.game.grimoireTarget = CIBLE;
      g.game.adventureQuestsCompleted = {};
      var rb = rises, fb = finished;
      var r = playQuest(ct.q);
      if (!r) continue;
      n++; r0 += rises - rb; f0 += finished - fb;
      if (r.ok) { ok++; rounds += r.rounds; hp += Math.max(0, g.game.heroHp) / g.game.heroMaxHp; }
    }
    return n ? { win: ok / n, rounds: ok ? rounds / ok : 0, hp: ok ? hp / ok : 0, rises: r0 / n, finished: f0 / n } : null;
  }

  console.log("RUINES, ACTE II — " + (CIBLE ? "cible « " + CIBLE + " » · " : "") + "" + RUNS + " runs, profil fin2, SANS potion, Grimoire auto" + (REGLE ? " + règle « Un ennemi se relève »" : "")
    + (ENC ? " · essai : rencontres PV ×" + ENC[0] + ", puissance ×" + ENC[1] : " · réglage du jeu"));
  console.log("Cible : aucun mort, 30 à 45 % de PV perdus.\n");
  CAS.forEach(function (ct) {
    console.log(ct.label);
    B.CLASSES.forEach(function (c) {
      var r = mesure(ct, c);
      console.log("   " + c.label.padEnd(10) + " réussite " + String(Math.round(100 * r.win)).padStart(3) + " %   rounds " + String(Math.round(r.rounds)).padStart(3)
        + "   PV perdus " + String(Math.round(100 * (1 - r.hp))).padStart(3) + " %   relevés " + r.rises.toFixed(1) + "   achevés à terre " + r.finished.toFixed(1));
    });
  });
};
eval(base + "\n(" + extra.toString() + ")();");
