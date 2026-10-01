"use strict";
/* sim/pa-v1-ref-bench.js — v3.383.0 (Petites Aventures v2, lot PA2-3) : la RÉFÉRENCE v1.
   Joue l'ancienne Petite Aventure de la Forêt (marque paVersion retirée) sur le vrai moteur,
   combats compris, round par round (politique de forecast-calibration-bench.js), avec les
   mêmes héros de référence que sim/pa2-bench.js. Mesure l'or rapporté, la Sève, la réussite
   et une durée estimée : c'est le point de comparaison de l'or v2 (conception §5, PA2-3).
   Politique : profil et intensité au choix, porte et voie de campagne-harness.js.
   Usage : node sim/pa-v1-ref-bench.js . [runs=100] [profil=bourrin|prudent] [sentier|chemin|periple] */

var fs = require("fs"), path = require("path");
var ROOT = path.resolve(process.argv[2] || ".");
var RUNS = Number(process.argv[3] || 100);
var PROFIL = process.argv[4] || "bourrin";
var INTENS = process.argv[5] || "sentier";

var src = fs.readFileSync(path.join(__dirname, "forecast-calibration-bench.js"), "utf8").replace(/\nmain\(\);\s*$/, "\n");
var mod = { exports: {} };
new Function("require", "process", "module", "__dirname", src + "\nmodule.exports = { g: g, run: run, seedRng: seedRng, setup: setup, CLASSES: CLASSES, playRound: playRound };")(
  require, { argv: [process.argv[0], "x", ROOT] }, mod, __dirname);
var B = mod.exports, g = B.g;
delete g.SCENE_TEMPLATES.petite_aventure_foret.paVersion; // l'ancien moteur

var STAGES = [
  { id: "foret1", label: "Forêt acte I (niv. 3)", level: 3, p: { weapon: 15, kit: false, train: 0, potions: 3 } },
  { id: "foret2", label: "Forêt acte II (niv. 6)", level: 6, p: { weapon: 25, kit: true, train: 20, potions: 3 } },
  { id: "foret3", label: "Forêt acte III (niv. 8)", level: 8, p: { weapon: 25, kit: true, train: 40, potions: 3 } },
  { id: "desert", label: "Désert, refaire la Forêt (niv. 12)", level: 12, p: { weapon: 40, kit: true, train: 70, potions: 3 } }
];
var SECONDS = { gate: 6, obstacle: 20, source: 8, autel: 10, decouverte: 12, evenement: 20, mystere: 12, round: 2.5, finale: 20, prep: 30 };

function playRun(c, stage) {
  var S = g.SceneRunManager;
  B.setup(c.hero, c.id, stage.p);
  g.game.heroLevel = stage.level;
  g.game.resources.petite_ration = 6;
  S.ensureDefaults();
  g.game.explorationProgression.petiteAventure = { spent: 0, since: null };
  g.game.sceneRun = null;
  var seve0 = Number(g.game.resources.seve_aeswyn || 0), gold0 = Number(g.game.gold || 0);
  var r = S.startRun("petite_aventure_foret");
  if (!r.ok) return { how: "refus " + r.reason };
  var sec = SECONDS.prep, rounds = 0, guard = 400;
  while (guard-- > 0) {
    var run = S.getRun();
    if (!run || run.status === "completed") break;
    var st = run.status;
    if (st === "profile") S.chooseProfile(PROFIL);
    else if (st === "intensity") S.chooseIntensity(INTENS);
    else if (st === "mutator-announce") g.acknowledgeSceneMutator();
    else if (st === "preparation") {
      var tpl = g.SceneEngine.getTemplate(run.templateId), slots = (tpl.loadoutSlots || tpl.prepSlots || 3), pick = [];
      (tpl.loadoutOffer || []).forEach(function (id) { if (pick.length < slots && pick.indexOf(id) < 0) pick.push(id); });
      if (!S.confirmLoadout(pick).ok) return { how: "prep" };
    } else if (st === "gate") {
      if (run.breath !== undefined && S.useSceneGourde && run.breath < 30) S.useSceneGourde();
      var lvl = S.getCurrentLevel() || [], blesse = (run.injuries || []).length;
      var SC = { source: blesse ? 5 : 1, autel: blesse ? 4 : 0, decouverte: 2, combat: 1, evenement: 1, mystere: 0, bloqueur: 0, obstacle: blesse ? -3 : 0 };
      var best = 0;
      lvl.forEach(function (sl, i) { if ((SC[sl.type] || 0) > (SC[lvl[best].type] || 0)) best = i; });
      S.enterGate(best); sec += SECONDS.gate;
    } else if (st === "node") {
      var n = run.pendingNode || {};
      sec += SECONDS[n.type] || 12;
      if (n.type === "obstacle") {
        var gab = g.SCENE_NODES.obstacles[n.gabaritId];
        var slot = (S.getCurrentLevel() || [])[run.currentGate] || n;
        var voies = g.SceneEngine.nodeVoies(gab, slot).filter(function (k) { return Number(run.breath || 0) >= S._obstacleFactors(run, k).breathCost; });
        var RANG = { high: 3, good: 3, medium: 2, mid: 2, low: 1 };
        voies.sort(function (a, b) { return (RANG[S.getObstacleEstimate(b)] || 0) - (RANG[S.getObstacleEstimate(a)] || 0); });
        var sure = voies.length && /^(high|good)$/.test(S.getObstacleEstimate(voies[0]));
        if (!sure && Number(run.ropeCharges || 0) > 0 && gab.ropeOption) S.resolveObstacle("corde");
        else if (voies.length) S.resolveObstacle(voies[0]);
        else break;
      } else if (n.type === "autel") S.resolveAutel(true);
      else if (n.type === "decouverte") S.resolveDecouverte();
      else if (n.type === "source") S.resolveSource();
      else if (n.type === "evenement" || n.type === "event") {
        var ev = S.getPendingEvent();
        var br = ev && (ev.branches || []).filter(function (b) { return S.canTakeEventBranch(b); });
        S.resolveEvent(br && br.length ? br[br.length - 1].id : null);
      } else if (n.type === "bloqueur") { S.resolveBloqueur && S.resolveBloqueur(); }
      else break;
    } else if (st === "combat") {
      g.game.activeTab = "combat";
      if (!g.game.enemy) break;
      if (!B.playRound()) break;
      rounds++; sec += SECONDS.round;
    } else if (st === "finale") { S.resolveFinale("sur"); sec += SECONDS.finale; }
    else break;
  }
  var fin = S.getRun() || {};
  return {
    how: fin.status === "completed" ? "fin" : "bloqué:" + fin.status,
    gold: Number(g.game.gold || 0) - gold0,
    seve: Number(g.game.resources.seve_aeswyn || 0) - seve0,
    dead: g.game.heroHp <= 0,
    hpLeft: g.game.heroHp / g.game.heroMaxHp,
    sec: sec, rounds: rounds
  };
}

console.log("PETITE AVENTURE v1 (référence), profil « " + PROFIL + " », " + INTENS + ", " + RUNS + " runs par cellule.");
console.log("  " + "Classe".padEnd(11) + "Étape".padEnd(36) + "fini   mort   or/run  Sève   PV fin   durée");
B.CLASSES.forEach(function (c) {
  STAGES.forEach(function (st) {
    var a = { fin: 0, dead: 0, gold: 0, seve: 0, hp: 0, sec: 0, n: 0, stuck: {} };
    for (var i = 0; i < RUNS; i++) {
      B.seedRng(70000 + i);
      var x = playRun(c, st);
      a.n++;
      if (x.how === "fin") a.fin++; else a.stuck[x.how] = (a.stuck[x.how] || 0) + 1;
      if (x.dead) a.dead++;
      a.gold += x.gold || 0; a.seve += x.seve || 0; a.hp += x.hpLeft || 0; a.sec += x.sec || 0;
    }
    console.log("  " + c.label.padEnd(11) + st.label.padEnd(36) + (Math.round(100 * a.fin / a.n) + " %").padStart(5) + (Math.round(100 * a.dead / a.n) + " %").padStart(7) +
      String(Math.round(a.gold / a.n)).padStart(9) + (a.seve / a.n).toFixed(2).padStart(7) + (Math.round(100 * a.hp / a.n) + " %").padStart(8) + ((a.sec / a.n / 60).toFixed(1) + " min").padStart(10) +
      (Object.keys(a.stuck).length ? "  " + JSON.stringify(a.stuck) : ""));
  });
});
