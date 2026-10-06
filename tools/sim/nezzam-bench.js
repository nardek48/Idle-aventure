"use strict";
/* tools/sim/nezzam-bench.js — v3.362.0 (acte IV, lot X-2) : le trône de sable, run entier.

   Trois rencontres dans le lit du fleuve, puis Nezzam le Desséché (aq_desert_trone), joués
   sur le vrai moteur au profil « campagne » de tools/sim/plafond-bench.js (entraînement 110, uniques
   de la Forêt, heaume, arme de la Cité, reforge arme 4 / armure 2, Wenna +5, Maddoc +2 tronc),
   Grimoire automatique, potion sous 35 %, 2 potions.

   Cibles (document « Désert — Acte IV » v1.0, §6) :
     réussite au premier essai 75 à 90 % par classe, Rôdeur ≥ 70 % ;
     PV à l'arrivée à Nezzam 60 à 75 % ; PV en fin de combat 20 à 40 % ;
     1 à 2 potions ; Nezzam en 20 à 30 rounds.

   Mesure aussi ce que le document laissait ouvert : le vol de vie de Nezzam pendant que le
   ver de sa phase à 60 % est debout, et les silences lancés après 30 %.

   USAGE : node tools/sim/nezzam-bench.js . [--runs N] [--enc hp,power] [--boss hp,power]
                                      [--profil campagne|desertfin] [--voie A|B] */
var fs = require("fs"), path = require("path");

/* On charge plafond-bench.js sans sa partie exécutable : ses profils, son équipement et sa
   politique de jeu font foi, un seul endroit à tenir. */
var BENCH = fs.readFileSync(path.join(__dirname, "plafond-bench.js"), "utf8");
var CUT = BENCH.indexOf('console.log("COMBATS DE L');
var ARGS = process.argv.slice(3);
var RUNS = 40, ENC = null, BOSS = null, PROFIL = "campagne";
for (var i = 0; i < ARGS.length; i++) {
  if (ARGS[i] === "--runs") RUNS = Number(ARGS[i + 1]) || RUNS;
  if (ARGS[i] === "--enc") ENC = ARGS[i + 1].split(",").map(Number);
  if (ARGS[i] === "--boss") BOSS = ARGS[i + 1].split(",").map(Number);
  if (ARGS[i] === "--profil") PROFIL = ARGS[i + 1];
}
/* --boss et --runs sont aussi lus par plafond-bench : on ne lui passe que la racine et la voie */
var passArgs = [process.argv[0], process.argv[1], require("../chemins.js").jeu(process.argv[2])];
var vi = ARGS.indexOf("--voie"); if (vi !== -1) passArgs.push("--voie", ARGS[vi + 1]);
var api = {};
new Function("require", "process", "__dirname", "api", BENCH.slice(0, CUT)
  + "\napi.g = g; api.B = B; api.prepare = prepare; api.autoRound = autoRound; api.PROFILS = PROFILS;")(
  require, { argv: passArgs }, __dirname, api);
var g = api.g, B = api.B;

var Q = g.ADVENTURE_QUESTS.aq_desert_trone;
if (ENC) { Q.encounterHpMult = ENC[0]; Q.enemyPowerMult = ENC[1]; }
if (BOSS) { Q.bossHpMult = BOSS[0]; Q.bossPowerMult = BOSS[1]; }

/* Sonde du vol de vie : on enveloppe la fonction du moteur (lecture seule, aucun effet). */
var stolen = { withAdd: 0, alone: 0 }, silences = 0;
var origLife = g.getVampiricLifestealAmount;
g.getVampiricLifestealAmount = function () {
  var v = origLife.apply(this, arguments);
  var e = g.game.enemy;
  if (e && e.id === "nezzam" && v > 0) {
    var adds = g.CombatActors ? g.CombatActors.aliveEnemies().filter(function (x) { return x !== e; }).length : 0;
    if (adds) stolen.withAdd += v; else stolen.alone += v;
  }
  return v;
};
var origSil = g.CombatEngine.resolveSilenceCast;
g.CombatEngine.resolveSilenceCast = function () {
  if (g.game.enemy && g.game.enemy.id === "nezzam") silences++;
  return origSil.apply(this, arguments);
};

function playTrone() {
  g.AdventureQuestManager.ensureDefaults();
  g.game.adventureQuestsCompleted.aq_desert_trone = false;
  g.AdventureQuestManager.start("aq_desert_trone");
  if (!g.game.adventureQuestRun.active) return null;
  var rounds = 0, bossRounds = 0, arrive = null, guard = 4000;
  while (g.game.adventureQuestRun.active && g.game.heroHp > 0 && guard-- > 0) {
    g.game.activeTab = "combat";
    var e = g.game.enemy;
    var onBoss = !!(e && e.id === "nezzam");
    if (onBoss && arrive === null) arrive = g.game.heroHp / g.game.heroMaxHp;
    if (!api.autoRound()) break;
    rounds++;
    if (onBoss) bossRounds++;
  }
  return { ok: !!g.game.adventureQuestsCompleted.aq_desert_trone, rounds: rounds, bossRounds: bossRounds, arrive: arrive };
}

var P = api.PROFILS[PROFIL];
console.log("LE TRÔNE DE SABLE — " + RUNS + " runs par classe, profil " + PROFIL + " (" + P.label + ")");
console.log("Rencontres : PV ×" + Q.encounterHpMult + ", puissance ×" + Q.enemyPowerMult
  + " · Nezzam : PV ×" + Q.bossHpMult + ", puissance ×" + Q.bossPowerMult + "\n");
B.CLASSES.forEach(function (c) {
  var n = 0, ok = 0, hpEnd = 0, arr = 0, arrN = 0, pots = 0, br = 0;
  stolen = { withAdd: 0, alone: 0 }; silences = 0;
  for (var r = 0; r < RUNS; r++) {
    B.seedRng(51000 + r);
    api.prepare(c, P, 1, true, true);
    var pot0 = Number(g.game.healingPotionsOwned.potion_soin_mineur || 0);
    var res = playTrone();
    if (!res) continue;
    n++;
    pots += pot0 - Number(g.game.healingPotionsOwned.potion_soin_mineur || 0);
    if (res.arrive !== null) { arr += res.arrive; arrN++; }
    if (res.ok) { ok++; hpEnd += Math.max(0, g.game.heroHp) / g.game.heroMaxHp; br += res.bossRounds; }
  }
  if (!n) { console.log("   " + c.label.padEnd(10) + " — indisponible"); return; }
  console.log("   " + c.label.padEnd(10)
    + " réussite " + String(Math.round(100 * ok / n)).padStart(3) + " %"
    + "   PV à l'arrivée " + String(Math.round(100 * (arrN ? arr / arrN : 0))).padStart(3) + " %"
    + "   PV à la fin " + String(Math.round(100 * (ok ? hpEnd / ok : 0))).padStart(3) + " %"
    + "   potions " + (pots / n).toFixed(1)
    + "   rounds contre Nezzam " + String(Math.round(ok ? br / ok : 0)).padStart(3)
    + "   vol de vie (avec ver / seul) " + Math.round(stolen.withAdd / n) + " / " + Math.round(stolen.alone / n)
    + "   silences " + (silences / n).toFixed(1));
});
