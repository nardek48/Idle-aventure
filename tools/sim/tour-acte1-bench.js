"use strict";
/* tools/sim/tour-acte1-bench.js — v3.626.0 (Tour, lot T-1) : les deux quêtes de combat de l'acte I, jouées en entier
   sur le vrai moteur, au héros de fin de Montagne (sauvegarde d'entrée du chapitre VI : SAVE_MONDES de campagne-harness.js).

   Cibles (comme la Montagne) : aucun mort ; l'étape finie avec 25 à 35 % des PV ; un combat de 3 à 5 rounds. SANS potion.

   USAGE : node tools/sim/tour-acte1-bench.js . --save a.json[,b.json] [--runs N] [--set q:pv,puissance[;...]] [--quete q] [--braise garder|poser] */
var fs = require("fs"), path = require("path");
var base = fs.readFileSync(path.join(__dirname, "plafond-bench.js"), "utf8");
base = base.slice(0, base.indexOf('console.log("COMBATS DE L\'HISTOIRE'));
var ARGV = process.argv.slice(3);
function opt(k) { var i = ARGV.indexOf(k); return i >= 0 ? ARGV[i + 1] : null; }
var SAVES = String(opt("--save") || "").split(",").filter(Boolean);
var SET = opt("--set") ? opt("--set").split(";").map(function (x) { var p = x.split(":"); return [p[0], p[1].split(",").map(Number)]; }) : [];
var SEULE = opt("--quete"), BRAISE = opt("--braise");
if (!SAVES.length) { console.log("--save <fichier> attendu (sauvegarde d'entrée de la Tour)"); process.exit(1); }

var extra = function () {
  SET.forEach(function (x) { g.ADVENTURE_QUESTS[x[0]].encounterHpMult = x[1][0]; g.ADVENTURE_QUESTS[x[0]].enemyPowerMult = x[1][1]; });
  function party(ids) {
    Object.keys(g.COMPANIONS_DB).forEach(function (id) { var st = g.CompanionManager.state(id); if (st) st.present = ids.indexOf(id) !== -1; });
    g.CompanionManager.refreshParty();
  }
  var CAS = [
    { label: "Étape 2 · Le pied de la Tour (Wenna, Maddoc)", q: "aq_tour_pied", party: ["wenna", "maddoc"] },
    { label: "Étape 4 · L'étage du sable (Wenna, Maddoc)", q: "aq_tour_sable", party: ["wenna", "maddoc"] }
  ].filter(function (ct) { return !SEULE || ct.q === SEULE; });
  function mesure(ct, saveTxt) {
    var n = 0, ok = 0, rounds = 0, hp = 0;
    for (var i = 0; i < RUNS; i++) {
      B.seedRng(91000 + i);
      g.restoreBaseState(JSON.parse(saveTxt));
      g.WorldTravel.arrive("tower", 0);
      if (BRAISE) { g.StoryQuestManager.ensure(); g.game.storyQuests.tower.choices.braise = BRAISE; }
      party(ct.party);
      g.ensureGrimoireRules();
      B.run("game.combatMode = 'grimoire'; EquipmentManager.recalcStats(); game.heroHp = game.heroMaxHp; CompanionManager.healAll();");
      g.game.healingPotionsOwned = {};
      g.game.adventureQuestsCompleted = {}; g.game.adventureQuestProgress = {};
      var r = playQuest(ct.q);
      if (!r) continue;
      n++;
      if (r.ok) { ok++; rounds += r.rounds; hp += Math.max(0, g.game.heroHp) / g.game.heroMaxHp; }
    }
    var enc = g.ADVENTURE_QUESTS[ct.q].encounters.length;
    return n ? { win: ok / n, rounds: ok ? rounds / ok / enc : 0, hp: ok ? hp / ok : 0 } : null;
  }
  console.log("TOUR, ACTE I — " + RUNS + " runs par sauvegarde, SANS potion, Grimoire" + (BRAISE ? " · braise " + BRAISE : "") + (SET.length ? " · essai " + JSON.stringify(SET) : " · réglage du jeu"));
  console.log("Cibles : aucun mort, 25 à 35 % des PV restants en fin d'étape, 3 à 5 rounds par combat.\n");
  var textes = SAVES.map(function (f) { return fs.readFileSync(f, "utf8"); });
  CAS.forEach(function (ct) {
    console.log(ct.label);
    textes.forEach(function (t, k) {
      var cls = JSON.parse(t).heroId || path.basename(SAVES[k]);
      var r = mesure(ct, t);
      if (!r) { console.log("   " + String(cls).padEnd(10) + " quête non lancée"); return; }
      console.log("   " + String(cls).padEnd(10) + " réussite " + String(Math.round(100 * r.win)).padStart(3) + " %   rounds/combat " + r.rounds.toFixed(1).padStart(4)
        + "   PV restants " + String(Math.round(100 * r.hp)).padStart(3) + " %");
    });
  });
};
eval(base + "\n(" + extra.toString() + ")();");
