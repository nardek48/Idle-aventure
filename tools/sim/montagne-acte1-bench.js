"use strict";
/* tools/sim/montagne-acte1-bench.js — v3.488.0 (Montagne, lot M-2) : les trois quêtes de combat de l'acte I,
   jouées en entier sur le vrai moteur (veines comprises), au héros de fin de Crypte.

   Cibles (doc Montagne acte I, §4 à §6) : aucun mort ; l'étape finie avec 25 à 35 % des PV en laissant
   les veines ; un combat normal de 3 à 5 rounds. Mesuré SANS potion. Le héros est celui d'une vraie
   sauvegarde de fin de Crypte (SAVE_OUT de campagne-harness.js), arrivé à la Montagne.

   USAGE : node tools/sim/montagne-acte1-bench.js . --save a.json[,b.json] [--runs N] [--tailler]
     --enc hp,power : essai pour l'étape 2 ; --enc2 : étape 3 ; --enc3 : étape 4
     --tailler      : le héros a la règle « Veine intacte → Tailler » (une taille par combat) */
var fs = require("fs"), path = require("path");
var base = fs.readFileSync(path.join(__dirname, "plafond-bench.js"), "utf8");
base = base.slice(0, base.indexOf('console.log("COMBATS DE L\'HISTOIRE'));
var ARGV = process.argv.slice(3);
function opt(k) { var i = ARGV.indexOf(k); return i >= 0 ? ARGV[i + 1] : null; }
var SAVES = String(opt("--save") || "").split(",").filter(Boolean);
var ENC = opt("--enc") ? opt("--enc").split(",").map(Number) : null;
var ENC2 = opt("--enc2") ? opt("--enc2").split(",").map(Number) : null;
var ENC3 = opt("--enc3") ? opt("--enc3").split(",").map(Number) : null;
var TAILLER = ARGV.indexOf("--tailler") >= 0;
// audit P5 (26/10) : --set q:pv,puissance[;q:pv,puissance] (essai sur n'importe quelle quête) ; --quete q : ce seul cas
var SET = opt("--set") ? opt("--set").split(";").map(function (x) { var p = x.split(":"); return [p[0], p[1].split(",").map(Number)]; }) : [];
var SEULE = opt("--quete");
if (!SAVES.length) { console.log("--save <fichier> attendu (sauvegarde de fin de Crypte)"); process.exit(1); }

var extra = function () {
  [["aq_montagne_pentes", ENC], ["aq_montagne_sarkel", ENC2], ["aq_montagne_veines", ENC3]].forEach(function (x) {
    if (!x[1]) return;
    g.ADVENTURE_QUESTS[x[0]].encounterHpMult = x[1][0]; g.ADVENTURE_QUESTS[x[0]].enemyPowerMult = x[1][1];
  });
  SET.forEach(function (x) { g.ADVENTURE_QUESTS[x[0]].encounterHpMult = x[1][0]; g.ADVENTURE_QUESTS[x[0]].enemyPowerMult = x[1][1]; });
  function party(ids) {
    Object.keys(g.COMPANIONS_DB).forEach(function (id) { var st = g.CompanionManager.state(id); if (st) st.present = ids.indexOf(id) !== -1; });
    g.CompanionManager.refreshParty();
  }
  function cuts() { return Number((g.AchievementManager.ensure().counters || {}).veinsCut || 0); }
  var CAS = [
    { label: "Étape 2 · Ce qui affleure (Wenna, Maddoc)", q: "aq_montagne_pentes", party: ["wenna", "maddoc"] },
    { label: "Étape 3 · Celui qui taille (Sarkel, Wenna)", q: "aq_montagne_sarkel", party: ["sarkel", "wenna"] },
    { label: "Étape 3 · Celui qui taille (Sarkel, Maddoc)", q: "aq_montagne_sarkel", party: ["sarkel", "maddoc"] },
    { label: "Étape 4 · Ça ne fond pas (Sarkel, Wenna)", q: "aq_montagne_veines", party: ["sarkel", "wenna"] },
    { label: "Étape 8 · acte II, Tri (Sarkel, Wenna)", q: "aq_montagne_tri", party: ["sarkel", "wenna"], acte2: true },
    { label: "Étape 10 · acte II, Ouvrage (Sarkel, Wenna)", q: "aq_montagne_ouvrage", party: ["sarkel", "wenna"], acte2: true }
  ].filter(function (ct) { return SEULE ? ct.q === SEULE : !ct.acte2; });
  function mesure(ct, saveTxt) {
    var n = 0, ok = 0, rounds = 0, hp = 0, v = 0;
    for (var i = 0; i < RUNS; i++) {
      B.seedRng(88000 + i);
      g.restoreBaseState(JSON.parse(saveTxt));
      g.WorldTravel.arrive("mountain", 0);
      g.CompanionManager.unlock("sarkel");
      party(ct.party);
      g.ensureGrimoireRules();
      g.game.grimoireRules = g.game.grimoireRules.filter(function (r) { return !r || (r.actionSlot !== "vein" && r.conditionId !== "veinIntact"); });
      if (TAILLER) g.game.grimoireRules.unshift({ conditionId: "veinIntact", actionSlot: "vein" });
      B.run("game.combatMode = 'grimoire'; EquipmentManager.recalcStats(); game.heroHp = game.heroMaxHp; CompanionManager.healAll();");
      g.game.healingPotionsOwned = {};
      g.game.adventureQuestsCompleted = {}; g.game.adventureQuestProgress = {};
      var c0 = cuts();
      var r = playQuest(ct.q);
      if (!r) continue;
      n++; v += cuts() - c0;
      if (r.ok) { ok++; rounds += r.rounds; hp += Math.max(0, g.game.heroHp) / g.game.heroMaxHp; }
    }
    var enc = g.ADVENTURE_QUESTS[ct.q].encounters.length;
    return n ? { win: ok / n, rounds: ok ? rounds / ok / enc : 0, hp: ok ? hp / ok : 0, veines: v / n } : null;
  }

  console.log("MONTAGNE, ACTE I — " + RUNS + " runs par sauvegarde, SANS potion, Grimoire" + (TAILLER ? " + « Veine intacte → Tailler »" : " (veines laissées)")
    + (SET.length ? " · essai " + JSON.stringify(SET) : "") + ((ENC || ENC2 || ENC3) ? " · essai " + JSON.stringify({ e2: ENC, e3: ENC2, e4: ENC3 }) : " · réglage du jeu"));
  console.log("Cibles : aucun mort, 25 à 35 % des PV restants en fin d'étape, 3 à 5 rounds par combat.\n");
  var textes = SAVES.map(function (f) { return fs.readFileSync(f, "utf8"); });
  CAS.forEach(function (ct) {
    console.log(ct.label);
    textes.forEach(function (t, k) {
      var cls = JSON.parse(t).heroId || path.basename(SAVES[k]);
      var r = mesure(ct, t);
      if (!r) { console.log("   " + String(cls).padEnd(10) + " quête non lancée"); return; }
      console.log("   " + String(cls).padEnd(10) + " réussite " + String(Math.round(100 * r.win)).padStart(3) + " %   rounds/combat " + r.rounds.toFixed(1).padStart(4)
        + "   PV restants " + String(Math.round(100 * r.hp)).padStart(3) + " %   veines taillées " + r.veines.toFixed(1));
    });
  });
};
eval(base + "\n(" + extra.toString() + ")();");
