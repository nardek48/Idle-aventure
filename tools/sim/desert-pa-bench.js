"use strict";
/* tools/sim/desert-pa-bench.js — v3.304.0 : la Petite Aventure du Désert, jouée sur le vrai moteur
   (SceneRunManager, bac à sable de forecast-calibration-bench.js).
   Question : le Souffle par palier (5 en Forêt, 6 ou 7 au Désert) avec et sans Outre, par
   intensité et par mutateur. Garde-fou de la conception (§8.2) : un Périple doit rester
   faisable sans Outre. Les combats sont ici comptés gagnés (leur coût se mesure à part,
   partie B) : on isole le Souffle et les blessures.
   Politique de joueur : porte la plus sûre, voie à meilleure chance parmi celles qu'il peut
   payer en gardant une réserve, boit quand il ne peut plus payer le palier suivant.
   USAGE : node tools/sim/desert-pa-bench.js . [--runs N] [--combat] */
var fs = require("fs"), path = require("path");
var src = fs.readFileSync(path.join(__dirname, "forecast-calibration-bench.js"), "utf8").replace(/\nmain\(\);\s*$/, "\n");
var ROOT = require("../chemins.js").jeu(process.argv[2]);
var RUNS = 400;
for (var ai = 3; ai < process.argv.length; ai++) if (process.argv[ai] === "--runs") RUNS = Number(process.argv[ai + 1]) || RUNS;
var AVEC_COMBAT = process.argv.indexOf("--combat") !== -1;
var mod = { exports: {} };
new Function("require", "process", "module", "__dirname", src + "\nmodule.exports = { g: g, run: run, seedRng: seedRng, setup: setup, CLASSES: CLASSES };")(
  require, { argv: [process.argv[0], "x", ROOT] }, mod, __dirname);
var B = mod.exports, g = B.g;
var TPL = g.SCENE_TEMPLATES.petite_aventure_desert;
if (!TPL) { console.error("ANCRE PERDUE : petite_aventure_desert"); process.exit(1); }
var M = g.SceneRunManager, E = g.SceneEngine, C = g.SceneCheckSystem;
var HERO = { weapon: 25, kit: true, train: 30, potions: 2 }; // arrivée au Désert (étape 2 faite)

/* ---------- Politique ---------- */
function stepCost() { return Number(TPL.breathPerDepth || 0); }
function chance(run, gab, voie, slot) {
  var f = M._obstacleFactors(run, voie);
  var st = M.statEffective(run, gab.options[voie].stat);
  var diff = C.depthDifficulty(gab.baseDifficulty || 4, run.depth) * ((slot && slot.riskMod) || 1) * f.diffMult;
  return C.successChance(st, diff);
}
// Boit l'objet le moins précieux : gourde (gratuite) d'abord, puis l'Outre
function boire(run) {
  if (run.gourdeAvailable && M.useSceneGourde().ok) return "gourde";
  if (run.breathItems && run.breathItems.outre > 0 && M.useBreathItem("outre").ok) return "outre";
  return null;
}
function besoin(run, slot) {
  var need = stepCost() + 1;
  if (slot && slot.type === "obstacle") {
    var gab = E.getNodeBank().obstacles[slot.gabaritId];
    if (!(gab.ropeOption && run.ropeCharges > 0)) {
      var min = Infinity;
      E.nodeVoies(gab, slot).forEach(function (v) { min = Math.min(min, M._obstacleFactors(run, v).breathCost); });
      if (min < Infinity) need += min;
    }
  }
  return need;
}
function scorePorte(run, slot) {
  var t = slot.type;
  if (t === "source") return run.breath < 70 || run.injuries.length ? 6 : 3;
  if (t === "autel") return run.injuries.length ? 5 : 2;
  if (t === "decouverte") return 4;
  if (t === "obstacle") return 3;
  if (t === "mystere" || t === "bloqueur") return 2;
  return 1; // combat
}

function jouerNoeud(run, stats) {
  var n = run.pendingNode;
  if (!n) return;
  if (n.type === "obstacle") {
    var gab = E.getNodeBank().obstacles[n.gabaritId];
    var slot = (M.getCurrentLevel() || [])[run.currentGate] || n;
    if (gab.ropeOption && run.ropeCharges > 0) { M.resolveObstacle("corde"); return; }
    for (var essai = 0; essai < 6; essai++) {
      var voies = M.affordableVoies(run, gab, slot);
      if (voies.length) {
        var reserve = stepCost() + 5; // garder de quoi franchir le palier suivant
        var sures = voies.filter(function (v) { return run.breath - M._obstacleFactors(run, v).breathCost >= reserve; });
        var pool = sures.length ? sures : voies;
        pool.sort(function (a, b) { return chance(run, gab, b, slot) - chance(run, gab, a, slot); });
        M.resolveObstacle(pool[0]);
        return;
      }
      var bu = boire(run); if (!bu) break; stats[bu]++;
    }
    M.abandon(); stats.bloque++; // aucune voie payable, rien à boire
    return;
  }
  if (n.type === "autel") { M.resolveAutel(run.injuries.length > 0); return; }
  if (n.type === "decouverte") { M.resolveDecouverte(); return; }
  if (n.type === "source") { M.resolveSource(); return; }
  if (n.type === "bloqueur") { run.blockerReadyAt = 0; M.resolveBloqueur(); return; }
  if (n.type === "combat") {
    var guard = 60;
    while (run.status === "combat" && guard-- > 0) M.onCombatWon(); // partie A : combat compté gagné
  }
}

function unRun(profil, intensite, loadout) {
  var gm = g.game;
  gm.explorationProgression.petiteAventure = { day: "", count: 0 };
  g.WarehouseManager.addResource("petite_ration", 1, true);
  g.WarehouseManager.addResource("outre_pleine", 3, true);
  M.clearRun();
  var r = M.startRun("petite_aventure_desert");
  if (!r.ok) throw new Error("départ refusé : " + r.reason);
  M.chooseProfile(profil); M.chooseIntensity(intensite); M.acknowledgeMutator();
  var c = M.confirmLoadout(loadout);
  if (!c.ok) throw new Error("préparation refusée : " + c.reason);
  var run = M.getRun();
  var stats = { gourde: 0, outre: 0, bloque: 0, souffleMin: 100 };
  var guard = 80;
  while (run.status !== "completed" && guard-- > 0) {
    stats.souffleMin = Math.min(stats.souffleMin, run.breath);
    if (run.status === "finale") { M.resolveFinale("sur"); break; }
    if (run.status === "gate") {
      // boire AVANT de s'engager si le palier ne laisse plus rien pour la moindre voie
      var level = M.getCurrentLevel(), best = 0;
      for (var i = 1; i < level.length; i++) if (scorePorte(run, level[i]) > scorePorte(run, level[best])) best = i;
      // le moteur épuise le run à l'entrée si le palier ou l'obstacle ne sont plus payables :
      // le joueur boit AVANT de s'engager, juste ce qu'il faut
      var tries = 0;
      while (run.breath < besoin(run, level[best]) && tries++ < 6) { var bu = boire(run); if (!bu) break; stats[bu]++; }
      M.enterGate(best);
      continue;
    }
    if (run.status === "node") { jouerNoeud(run, stats); continue; }
    if (run.status === "combat") { jouerNoeud(run, stats); continue; }
    break;
  }
  stats.souffleMin = Math.min(stats.souffleMin, run.breath);
  stats.issue = run.exhausted ? "epuise" : (run.status === "completed" && run.depth >= run.card.length ? "ok"
    : (run.injuries.length >= M.getMaxInjuries(run.templateId) ? "blesse" : (stats.bloque ? "epuise" : "autre")));
  return stats;
}

var LOADOUTS = [
  { id: "rien", label: "sans gourde ni Outre", items: ["provisions", "amulette", "torche"] },
  { id: "outre", label: "Outre", items: ["outre", "provisions", "amulette"] },
  { id: "gourde", label: "gourde (1 gorgée)", items: ["gourde", "provisions", "amulette"] },
  { id: "deux", label: "gourde+Outre+amulette", items: ["gourde", "outre", "amulette"] },
  { id: "deux", label: "gourde+Outre+provis.", items: ["gourde", "outre", "provisions"] }
];
var MUTS = [["aucun"], ["tempete"], ["chaleur"], ["nuit"]];
var COUTS = [5, 6, 7];
var INTENS = ["sentier", "chemin", "periple"];

function cellule(profil, intensite, loadout, mut, cout, classe) {
  TPL.breathPerDepth = cout;
  TPL.mutatorWeights = {}; TPL.mutatorWeights[mut] = 1;
  var n = { ok: 0, epuise: 0, blesse: 0, autre: 0, gourde: 0, outre: 0, souffle: 0 };
  for (var i = 0; i < RUNS; i++) {
    B.seedRng(90000 + i);
    var s = unRun(profil, intensite, loadout.items);
    n[s.issue]++; n.gourde += s.gourde; n.outre += s.outre; n.souffle += s.souffleMin;
  }
  return n;
}

B.setup("knight", "knight", HERO);
g.saveGame = function () {}; // chaque action du run sauvegarde : inutile ici, et c'est l'essentiel du temps
g.game.unlockedTabs.village = true;
console.log("PETITE AVENTURE DU DÉSERT — " + RUNS + " runs par cellule, Chevalier à l'arrivée, combats comptés gagnés");
console.log("Colonnes : réussite · épuisé · évacué (blessures) · Souffle min moyen · gourdes bues · Outres bues\n");
["prudent", "bourrin"].forEach(function (profil) {
  INTENS.forEach(function (it) {
    console.log("== " + profil + " · " + it);
    LOADOUTS.forEach(function (lo) {
      COUTS.forEach(function (cout) {
        var ligne = "  " + lo.label.padEnd(22) + " " + cout + "/palier ";
        MUTS.forEach(function (m) {
          var n = cellule(profil, it, lo, m[0], cout);
          ligne += " | " + m[0].slice(0, 6).padEnd(6) + " " + String(Math.round(100 * n.ok / RUNS)).padStart(3) + "% ép" + String(Math.round(100 * n.epuise / RUNS)).padStart(3)
            + "% bl" + String(Math.round(100 * n.blesse / RUNS)).padStart(3) + "% S" + String(Math.round(n.souffle / RUNS)).padStart(3)
            + (lo.id === "gourde" || lo.id === "deux" ? " g" + (n.gourde / RUNS).toFixed(1) : "") + (lo.id === "outre" || lo.id === "deux" ? " o" + (n.outre / RUNS).toFixed(1) : "");
        });
        console.log(ligne);
      });
    });
  });
});
