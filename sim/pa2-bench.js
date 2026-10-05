"use strict";
/* sim/pa2-bench.js — v3.381.0 (Petites Aventures v2, lot PA2-0) : premier relevé du mode v2.
   Joue des runs complets sur le vrai moteur (Pa2Run), avec une politique de joueur raisonnable,
   pour des héros de référence par étape de la campagne. Mesure : issue, PV perdus par acte, or,
   Sève d'Aeswyn, nombre de nœuds joués (base de l'estimation de durée).
   Usage : node sim/pa2-bench.js . [runs=300] [anneau=sentier|chemin|periple] */

var fs = require("fs"), path = require("path");
var ROOT = path.resolve(process.argv[2] || ".");
var RUNS = Number(process.argv[3] || 300);
var RING = process.argv[4] || "sentier";
var DETAIL = process.argv.indexOf("--detail") > 0;
var NO_RATION = process.argv.indexOf("--sans-rations") > 0; // v3.383.0 : le joueur qui part sans vivres
var SUMMARY = process.argv.indexOf("--resume") > 0;          // v3.383.0 : une ligne de moyennes (recherche de réglages)
var DESERT = process.argv.indexOf("--desert") > 0;        // v3.387.0 : la Petite Aventure du Désert (étapes de niveau 8 et plus, Outre)
var RUINES = process.argv.indexOf("--ruines") > 0;        // v3.429.0 : la Petite Aventure des Ruines (murs qui bougent, Craie)
var TPL = RUINES ? "petite_aventure_ruines" : DESERT ? "petite_aventure_desert" : "petite_aventure_foret";
var OVR = (process.argv.filter(function (a) { return a.indexOf("--ovr=") === 0; })[0] || "").slice(6); // réglages d'essai, JSON

var src = fs.readFileSync(path.join(__dirname, "forecast-calibration-bench.js"), "utf8").replace(/\nmain\(\);\s*$/, "\n");
var mod = { exports: {} };
new Function("require", "process", "module", "__dirname", src + "\nmodule.exports = { g: g, run: run, seedRng: seedRng, setup: setup, CLASSES: CLASSES };")(
  require, { argv: [process.argv[0], "x", ROOT] }, mod, __dirname);
var B = mod.exports, g = B.g;
/* --ovr={"map":"foret_2","acts":[1,1,1],"camp":0.3,"seuil":0.2,"scale1":0.8,"guard":[3.5,1.5],"gold":1,"rings":[1,1.6,2.4]} */
if (OVR) {
  var o = JSON.parse(OVR);
  if (o.acts) [1, 2, 3].forEach(function (a, i) { g.PA2_ACTS[a].foeMult = o.acts[i]; });
  if (o.fail) [1, 2, 3].forEach(function (a, i) { g.PA2_ACTS[a].failPct = o.fail[i]; });
  if (o.camp != null) g.PA2_RULES.campRestPct = o.camp;
  if (o.seuil != null) g.PA2_RULES.seuilRestPct = o.seuil;
  if (o.scale1 != null) g.PA2_LEVEL_BANDS[0].foeScale = o.scale1;
  if (o.guard) { g.PA2_GUARDIAN.forest.hpMult = o.guard[0]; g.PA2_GUARDIAN.forest.powMult = o.guard[1]; }
  if (o.gold) Object.keys(g.PA2_GOLD).forEach(function (k) { if (!/Mid$/.test(k) && k !== "ruse") g.PA2_GOLD[k] *= o.gold; });
  if (o.rings) ["sentier", "chemin", "periple"].forEach(function (r, i) { g.PA2_RINGS[r].lootMult = o.rings[i]; });
  if (o.src != null) g.PA2_RULES.sourceAmount = o.src;
  if (o.ringFoe) ["sentier", "chemin", "periple"].forEach(function (r, i) { g.PA2_RINGS[r].foeMult = o.ringFoe[i]; });
  if (o.map) g.PA2_MAPS_BY_WORLD.forest = [o.map]; // v3.386.0 : banc sur une carte donnée (foret_1, foret_2)
  if (o.map && o.tune) g.PA2_MAPS[o.map].tune = o.tune; // v3.386.0 : {"foeMult":0.9,"lootMult":1.1}
  if (o.ringDiff) ["sentier", "chemin", "periple"].forEach(function (r, i) { g.PA2_RINGS[r].diffMult = o.ringDiff[i]; });
}

/* Héros de référence : niveau et développement attendus à chaque étape (repères de campagne
   v3.365.0 : niveau 8 à l'arrivée au Désert, 12 à la fin du chapitre II). */
var STAGES_ALL = [
  { id: "foret1", label: "Forêt acte I (niv. 3)", level: 3, p: { weapon: 15, kit: false, train: 0, potions: 0 } },
  { id: "foret2", label: "Forêt acte II (niv. 6)", level: 6, p: { weapon: 25, kit: true, train: 20, potions: 0 } },
  { id: "foret3", label: "Forêt acte III (niv. 8)", level: 8, p: { weapon: 25, kit: true, train: 40, potions: 0 } },
  { id: "desert", label: "Désert, refaire la Forêt (niv. 12)", level: 12, p: { weapon: 40, kit: true, train: 70, potions: 0 } }
];

STAGES_ALL.splice(3, 0, { id: "desert10", label: "Désert, milieu du chapitre (niv. 10)", level: 10, p: { weapon: 32, kit: true, train: 55, potions: 0 } });
var STAGES_RUINES = [
  { id: "ruines1", label: "Ruines, acte I (niv. 12)", level: 12, p: { weapon: 50, kit: true, train: 110, potions: 0 } },
  { id: "ruines2", label: "Ruines, acte II (niv. 13)", level: 13, p: { weapon: 55, kit: true, train: 120, potions: 0 } }
];
var STAGES = RUINES ? STAGES_RUINES : DESERT ? STAGES_ALL.filter(function (x) { return x.level >= 8; }) : STAGES_ALL.filter(function (x) { return x.id !== "desert10"; });

/* Secondes par action, pour l'estimation de durée : lire, choisir, voir le dé ou le combat. */
/* v3.383.0 : même base que l'ancien banc v1 (retiré en v3.388.0 ; ses chiffres : CHANGELOG_v3.383.0). */
var SECONDS = { move: 5, obstacle: 20, combat: 22, boss: 30, source: 8, autel: 10, trouvaille: 15, evenement: 20, camp: 15, seuil: 15, clairiere: 15, tertre: 25, prep: 45 };

function prepHero(c, stage) {
  B.setup(c.hero, c.id, stage.p);
  g.game.heroLevel = stage.level;
  g.game.resources.petite_ration = 6; g.game.resources.ration = 2; g.game.resources.grande_ration = 0;
  g.SceneRunManager.ensureDefaults();
  g.game.explorationProgression.petiteAventure = { spent: 0, since: null };
  g.game.sceneRun = null;
  g.game.heroHp = g.game.heroMaxHp;
}

/* Politique : 2 petites rations, gourde, corde, torche, 1 place libre ; soigne sous 40 %. */
function playRun(c, stage) {
  var P = g.Pa2Run, S = g.SceneRunManager, T = g.SCENE_TEMPLATES[TPL];
  prepHero(c, stage);
  var opts = null;
  if (RING !== "sentier" && RUINES) opts = { livingMap: { mapId: "ruins", sectorId: RING === "chemin" ? "couloirs" : "escalier" } };
  else if (RING !== "sentier") opts = DESERT ? { livingMap: { mapId: "desert", sectorId: RING === "chemin" ? "verrerie" : "bete_dune" } }
    : { livingMap: { mapId: "forest", sectorId: RING === "chemin" ? "menhirs" : "portail" } };
  S.startRun(TPL, opts);
  var run = g.game.sceneRun;
  (NO_RATION ? ["gourde", "corde", "torche"] : ["petite_ration", "petite_ration", "gourde", "corde", "torche"]).forEach(function (id) { P.addItem(id); });
  if (DESERT) { g.game.resources.outre_pleine = 5; P.addItem("outre"); } // la place libre : l'Outre
  if (RUINES) P.addItem("craie"); // la place libre : la Craie d'Edda (gratuite)
  var pr0 = g.game.resources.petite_ration;
  P.depart();
  var max = g.game.heroMaxHp, seconds = SECONDS.prep, nodes = 0;
  var lossByAct = { 1: 0, 2: 0, 3: 0 }, guard = 200, koAt = null;
  var target = ["BOSS", "CLAIRIERE", "TERTRE"][Math.floor(Math.random() * 3)];
  function eat() {
    if (g.game.heroHp / max >= 0.4) return;
    ["grande_ration", "ration", "petite_ration"].forEach(function (id) { if (g.game.heroHp / max < 0.4 && run.stock[id] > 0) P.useItem(id); });
  }
  while (run.status !== "completed" && guard-- > 0) {
    if (run.status === "pa2-map") {
      var mv = P.openMoves();
      var pickMove = mv[Math.floor(Math.random() * mv.length)];
      if (mv.indexOf(target) >= 0) pickMove = target;
      P.moveTo(pickMove); seconds += SECONDS.move; continue;
    }
    var n = P.node(run.at), t = n.type, hp0 = g.game.heroHp, res;
    nodes++; seconds += SECONDS[t] || 20;
    eat();
    if (t === "obstacle" || t === "tertre") {
      var o = P.obstacleOptions().filter(function (x) { return x.affordable; })
        .sort(function (a, b) { return (a.thr - b.thr) || (a.cost - b.cost); });
      var rope = P.obstacleOptions().filter(function (x) { return x.rope; })[0];
      if (rope && (!o.length || o[0].thr >= 5)) res = P.resolveObstacle("precision", true);
      else if (o.length) {
        if (run.breath < 30 && run.stock.gourde > 0) P.useItem("gourde"); else if (run.breath < 30 && run.stock.outre > 0) P.useItem("outre");
        res = P.resolveObstacle(o[0].voie);
      } else res = P.bruteForce();
    } else if (t === "combat") {
      if (run.lastResult && run.lastResult.surprised) res = P.fight("tenir", true);
      else {
        var pv = P.combatPreview();
        // Annoncé mortel : le joueur mange d'abord, puis fuit ou ruse s'il le faut.
        ["grande_ration", "ration", "petite_ration"].forEach(function (id) { while (run.stock[id] > 0 && P.combatPreview().tenir.hpLoss * 1.2 >= g.game.heroHp && P.useItem(id).ok) { /* mange */ } });
        pv = P.combatPreview();
        if (pv.tenir.verdict === "mortel") {
          if (pv.ruse.thr <= 4) res = P.ruse();
          else if (pv.flee.affordable) res = P.flee();
          else res = P.fight("tenir");
        } else res = P.fight(pv.charger.hpLoss < g.game.heroHp * 0.3 ? "charger" : "tenir");
      }
      if (run.lastResult && run.lastResult.surprised && run.status === "pa2-node") res = P.fight("tenir", true);
    } else if (t === "boss") {
      // Le joueur lit l'estimation : il mange tant que le gardien s'annonce mortel.
      ["grande_ration", "ration", "petite_ration"].forEach(function (id) { while (run.stock[id] > 0 && P.combatPreview().tenir.hpLoss * 1.2 >= g.game.heroHp && P.useItem(id).ok) { /* mange */ } });
      res = P.fight("tenir");
    }
    else if (t === "source") res = P.drink();
    else if (t === "autel") res = P.altar(run.wounds > 0 && run.loot >= P.altarCost());
    else if (t === "trouvaille") res = P.takeRelic();
    else if (t === "evenement") res = P.eventChoice(P.hookBranches().filter(function (b) { return b.ok; })[0].id);
    else if (t === "camp" || t === "seuil") {
      if (t === "seuil" && target === "BOSS") {
        // Le joueur lit l'estimation du gardien au seuil (C1) : trop cher, il vise une autre fin.
        var gp = P.guardianPreview(), rat = P._rationInStock(run) ? max * 0.35 : 0;
        if (!gp || gp.tenir.unwinnable || gp.tenir.hpLoss > (g.game.heroHp + rat) * 0.8) target = Math.random() < 0.5 ? "CLAIRIERE" : "TERTRE";
      }
      var low = g.game.heroHp / max;
      if (low < 0.25 && !P._rationInStock(run)) res = P.placeAction("home");
      else if (low < 0.5 && P._rationInStock(run)) res = P.placeAction("cook");
      else res = P.placeAction("rest");
    } else if (t === "clairiere") res = P.clairiere();
    if (run.status === "completed" && run.end && run.end.how === "ko") koAt = (t === "boss" || t === "tertre" ? t : t + n.act);
    var lost = Math.max(0, hp0 - g.game.heroHp);
    lossByAct[n.act <= 3 ? n.act : 3] += lost;
    if (!res || !res.ok) break;
  }
  var end = run.end || {};
  var kept = (end.summary && end.summary.kept) ? end.summary.kept.gold : 0;
  return {
    how: end.how || "stuck", dest: end.dest, target: target, koAt: koAt, gold: kept, eaten: pr0 - g.game.resources.petite_ration, seve: Number(run.rareFound || 0), // Sève du run seul (hors récompense de secteur)
    nodes: nodes, seconds: seconds, shifts: Object.keys(run.walls || {}).length,
    loss: { 1: lossByAct[1] / max, 2: lossByAct[2] / max, 3: lossByAct[3] / max }
  };
}

function pct(x) { return String(Math.round(x * 100)).padStart(3) + " %"; }

function main() {
  if (SUMMARY) return summary();
  console.log("PETITES AVENTURES v2 — premier relevé (" + RUNS + " runs par cellule, anneau « " + RING + " »).");
  console.log("Politique : 2 petites rations, gourde, corde, torche ; une destination visée au hasard ; soin sous 40 % des PV.\n");
  console.log("  " + "Classe".padEnd(11) + "Étape".padEnd(34) + "dest.  camp/seuil  KO    PV perdus I/II/III        or/run   Sève   nœuds  durée");
  B.CLASSES.forEach(function (c) {
    STAGES.forEach(function (st) {
      var acc = { eaten: 0, dest: 0, home: 0, ko: 0, gold: 0, seve: 0, nodes: 0, sec: 0, l1: 0, l2: 0, l3: 0, n: 0, koAt: {}, dests: {} };
      for (var r = 0; r < RUNS; r++) {
        B.seedRng(90000 + r);
        var x = playRun(c, st);
        acc.n++;
        if (x.how === "dest") { acc.dest++; acc.dests[x.dest] = (acc.dests[x.dest] || 0) + 1; } else if (x.how === "home") acc.home++; else { acc.ko++; acc.koAt[x.koAt] = (acc.koAt[x.koAt] || 0) + 1; }
        acc.gold += x.gold; acc.seve += x.seve; acc.eaten += x.eaten; acc.nodes += x.nodes; acc.sec += x.seconds;
        acc.l1 += x.loss[1]; acc.l2 += x.loss[2]; acc.l3 += x.loss[3];
      }
      var n = acc.n;
      console.log("  " + c.label.padEnd(11) + st.label.padEnd(34)
        + pct(acc.dest / n) + "   " + pct(acc.home / n) + "   " + pct(acc.ko / n)
        + "   " + pct(acc.l1 / n) + " /" + pct(acc.l2 / n) + " /" + pct(acc.l3 / n)
        + "   " + String(Math.round(acc.gold / n)).padStart(6)
        + "   " + (acc.seve / n).toFixed(2).padStart(4)
        + "   " + (acc.nodes / n).toFixed(1).padStart(4)
        + "   " + (acc.sec / n / 60).toFixed(1).padStart(4) + " min");
      if (DETAIL) console.log("      rations mangées : " + (acc.eaten / n).toFixed(2) + " · KO où : " + JSON.stringify(acc.koAt) + " · destinations : " + JSON.stringify(acc.dests));
    });
  });
}

/* Une ligne : moyennes sur les 12 cellules (3 classes × 4 étapes), plus le pire KO. */
function summary() {
  var t = { ko: 0, eaten: 0, gold: 0, seve: 0, sec: 0, n: 0, worst: 0, worstAt: "" };
  B.CLASSES.forEach(function (c) {
    STAGES.forEach(function (st) {
      var ko = 0;
      for (var r = 0; r < RUNS; r++) {
        B.seedRng(90000 + r);
        var x = playRun(c, st);
        if (x.how === "ko") ko++;
        t.eaten += x.eaten; t.gold += x.gold; t.seve += x.seve; t.sec += x.seconds; t.n++;
      }
      t.ko += ko;
      if (ko / RUNS > t.worst) { t.worst = ko / RUNS; t.worstAt = c.label + " " + st.id; }
    });
  });
  console.log(RING + (NO_RATION ? " sans rations" : "") + " | KO " + pct(t.ko / t.n) + " (pire " + pct(t.worst) + " " + t.worstAt + ") | rations " + (t.eaten / t.n).toFixed(2) +
    " | or " + Math.round(t.gold / t.n) + " (" + (t.gold / t.sec * 60).toFixed(1) + "/min) | Sève " + (t.seve / t.n).toFixed(2) + " | " + (t.sec / t.n / 60).toFixed(1) + " min");
}

main();
