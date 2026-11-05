"use strict";
/* tools/sim/seve-bench.js — v3.707.0 (réécrit) : la Sève d'Aeswyn rapportée par les Petites Aventures de la Forêt,
   mesurée sur des parcours RÉELS (moteur Pa2Run, robot de tools/sim/pa2-bench.js), par anneau et par étape.

   Modèle du jeu (depuis v3.388.0) : PA2_RARE.forest (js/data/pa2-content.js), lu par
     - Pa2Run.takeRelic : chaque trouvaille ramassée donne 1 Sève à findChancePct % × qualité du jet (un 20 la garantit) ;
     - Pa2Run.finish("dest") : 2 / 3 / 4 Sève à la destination selon l'anneau (Sentier, Chemin, Périple).
   Un KO garde la Sève déjà trouvée et perd celle de la destination. Hors mesure : la récompense de secteur de la
   carte vivante (première libération), les Mémoires (Récolte…) et la rumeur du village.

   Usage : node tools/sim/seve-bench.js . [--runs 300] */

var fs = require("fs"), path = require("path");
var ROOT = require("../chemins.js").jeu(process.argv[2]);
var ai = process.argv.indexOf("--runs");
var RUNS = ai > 0 ? Number(process.argv[ai + 1]) || 300 : 300;

/* Le robot de pa2-bench.js, chargé tel quel (sans son main) ; l'anneau devient réglable. */
var src = fs.readFileSync(path.join(__dirname, "pa2-bench.js"), "utf8").replace(/\nmain\(\);\s*$/, "\n");
var mod = { exports: {} };
new Function("require", "process", "module", "__dirname", src
  + "\nmodule.exports = { g: g, B: B, playRun: playRun, STAGES: STAGES, setRing: function (r) { RING = r; } };")(
  require, { argv: [process.argv[0], "x", ROOT, String(RUNS), "sentier"] }, mod, __dirname);
var M = mod.exports, g = M.g, P = g.Pa2Run;

/* Relevé par run : Sève des trouvailles (takeRelic) et de la destination (finish), trouvailles ramassées. */
var cpt = null;
var take0 = P.takeRelic, fin0 = P.finish;
P.takeRelic = function () {
  var r = take0.apply(this, arguments);
  if (cpt && r && r.ok !== false) { var res = (r.result || (this.getRun() || {}).lastResult || {}); cpt.trouvailles++; cpt.seveTrouv += Number(res.rare || 0); }
  return r;
};
P.finish = function () {
  var end = fin0.apply(this, arguments);
  if (cpt && end) cpt.seveDest += Number(end.rare || 0);
  return end;
};

var RARE = g.PA2_RARE.forest, RINGS = ["sentier", "chemin", "periple"];
var CAP = g.SceneRunManager.PETITE_AVENTURE_DAILY_CAP; // réserve de la Forêt (WORLD_CAPS : 3), sans Carte de l'éclaireur

function f2(x) { return x.toFixed(2); }
function pct(x) { return String(Math.round(x * 100)).padStart(3) + " %"; }

console.log("SÈVE D'AESWYN — Petites Aventures de la Forêt, parcours réels (Pa2Run), " + RUNS + " runs par cellule.");
console.log("Modèle lu dans le jeu : trouvaille " + RARE.findChancePct + " % × qualité du jet ; destination "
  + RINGS.map(function (r) { return g.PA2_RINGS[r].label + " " + RARE.dest[g.PA2_RINGS[r].ring]; }).join(" / ")
  + " ; réserve " + CAP + " places par jour.\n");

var parAnneau = {};
RINGS.forEach(function (ring) {
  M.setRing(ring);
  console.log("--- " + g.PA2_RINGS[ring].label + " ---");
  console.log("  " + "Classe".padEnd(11) + "Étape".padEnd(36) + "dest.    KO   trouv./run  Sève trouv.  Sève dest.  Sève/run  runs à 0");
  var tot = { seve: 0, n: 0, dest: 0, ko: 0, trouv: 0, st: 0, sd: 0, zero: 0 };
  M.B.CLASSES.forEach(function (c) {
    M.STAGES.forEach(function (st) {
      var a = { dest: 0, ko: 0, trouv: 0, st: 0, sd: 0, zero: 0 };
      for (var r = 0; r < RUNS; r++) {
        M.B.seedRng(70000 + r);
        cpt = { trouvailles: 0, seveTrouv: 0, seveDest: 0 };
        var x = M.playRun(c, st);
        if (x.how === "dest") a.dest++; else if (x.how === "ko") a.ko++;
        a.trouv += cpt.trouvailles; a.st += cpt.seveTrouv; a.sd += cpt.seveDest;
        if (cpt.seveTrouv + cpt.seveDest === 0) a.zero++;
        cpt = null;
      }
      console.log("  " + c.label.padEnd(11) + st.label.padEnd(36) + pct(a.dest / RUNS) + "  " + pct(a.ko / RUNS)
        + "   " + f2(a.trouv / RUNS).padStart(6) + "      " + f2(a.st / RUNS).padStart(6) + "      " + f2(a.sd / RUNS).padStart(6)
        + "    " + f2((a.st + a.sd) / RUNS).padStart(6) + "   " + pct(a.zero / RUNS));
      tot.n += RUNS; tot.dest += a.dest; tot.ko += a.ko; tot.trouv += a.trouv; tot.st += a.st; tot.sd += a.sd; tot.zero += a.zero;
    });
  });
  var parRun = (tot.st + tot.sd) / tot.n;
  parAnneau[ring] = parRun;
  console.log("  Moyenne : destination " + pct(tot.dest / tot.n) + ", KO " + pct(tot.ko / tot.n) + ", " + f2(tot.trouv / tot.n) + " trouvailles, "
    + f2(tot.st / tot.n) + " + " + f2(tot.sd / tot.n) + " = " + f2(parRun) + " Sève par run, " + f2(parRun * CAP) + " par jour (réserve pleine).\n");
});

/* Demande : bâtiments du village jusqu'au niveau max, coûts lus par VillageBuildingManager.getLevelCost. */
var recette = null;
Object.keys(g.WORKSHOPS_CONFIG || {}).forEach(function (k) { (g.WORKSHOPS_CONFIG[k].recipes || []).forEach(function (r) { if (r.id === "resine_durcie") recette = r; }); });
var ratio = recette ? ((recette.inputs.filter(function (i) { return i.resourceId === "seve_aeswyn"; })[0] || {}).quantity || 0) : 0;
var seve = 0, resine = 0;
Object.keys(g.VILLAGE_BUILDINGS).forEach(function (id) {
  for (var n = 0; n < Number(g.VILLAGE_BUILDINGS[id].maxLevel || 0); n++) {
    var c = g.VillageBuildingManager.getLevelCost(id, n) || {};
    seve += Number(c.seve_aeswyn || 0); resine += Number(c.resine_durcie || 0);
  }
});
var besoin = seve + resine * ratio;
console.log("--- Demande : village au niveau max ---");
console.log("  " + seve + " Sève + " + resine + " Résine durcie (× " + ratio + " Sève) = " + besoin + " Sève.");
RINGS.forEach(function (ring) {
  console.log("  " + g.PA2_RINGS[ring].label.padEnd(8) + " : " + Math.ceil(besoin / parAnneau[ring]) + " runs, soit " + Math.ceil(besoin / (parAnneau[ring] * CAP)) + " jours à réserve pleine (Petites Aventures seules).");
});
