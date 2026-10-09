"use strict";
/* tools/sim/campagne-lot.js — v3.354.0 : lance un LOT de campagnes (tools/sim/campagne-harness.js) et
   agrège les résultats : murs, temps par étape, qui tue, boss et élites, farm, obstacles.

   USAGE : node tools/sim/campagne-lot.js . [--n 4] [--combats] [--tactique] [--classes knight,ranger,mage]
   Les fichiers de chaque partie sont écrits dans captures/campagne-lot/ (JSON + sortie texte).
   Compter environ 1 min par partie en --combats, 2 s sans. */

var fs = require("fs"), path = require("path"), cp = require("child_process");
var ROOT = require("../chemins.js").jeu(process.argv[2]);
var ARGS = process.argv.slice(3);
function arg(name, def) { var i = ARGS.indexOf(name); return i >= 0 ? ARGS[i + 1] : def; }
var N = Number(arg("--n", 4));
var CLASSES = arg("--classes", "knight,ranger,mage").split(",");
var PASS = ["--combats", "--tactique", "--compagnons-malins", "--investi", "--laisser"].filter(function (f) { return ARGS.indexOf(f) >= 0; });
var OUT = require("../chemins.js").captures("campagne-lot");
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

var runs = [];
var RELIRE = ARGS.indexOf("--relire") >= 0;   // relit les JSON du dernier lot sans rejouer les parties
CLASSES.forEach(function (c) {
  for (var i = 1; i <= N; i++) {
    var json = path.join(OUT, c + "_" + i + ".json");
    if (RELIRE) { if (fs.existsSync(json)) runs.push(JSON.parse(fs.readFileSync(json, "utf8"))); continue; }
    process.stdout.write("  " + c + " #" + i + " … ");
    var txt = cp.spawnSync(process.execPath, [path.join(__dirname, "campagne-harness.js"), ROOT, "--classe", c, "--json", json].concat(PASS), { encoding: "utf8", maxBuffer: 1 << 28 }).stdout || "";
    fs.writeFileSync(json.replace(/\.json$/, ".txt"), txt);
    var j = fs.existsSync(json) ? JSON.parse(fs.readFileSync(json, "utf8")) : null;
    console.log(j ? (j.failures ? "ÉCHEC" : "au bout") + ", " + j.totalH.toFixed(0) + " h" + (j.stats.murs.length ? ", murs " + j.stats.murs.map(function (m) { return m.step; }).join(" ") : "") : "pas de résultat");
    if (j) runs.push(j);
  }
});

function med(a) { a = a.slice().sort(function (x, y) { return x - y; }); return a.length ? a[Math.floor(a.length / 2)] : 0; }
function pct(a, b) { return b ? Math.round(a / b * 100) + " %" : "—"; }

console.log("\n== " + runs.length + " parties" + (PASS.length ? " (" + PASS.join(" ") + ")" : ""));
var tot = runs.map(function (j) { return j.totalH; });
console.log("Temps simulé : médiane " + med(tot).toFixed(0) + " h (de " + Math.min.apply(null, tot).toFixed(0) + " à " + Math.max.apply(null, tot).toFixed(0) + " h)");
// Temps actif = combats seuls, à comparer au « Temps de jeu » du journal (le reste avance hors ligne)
var act = runs.map(function (j) { return j.stats.combatMs / 3600e3; });
if (PASS.indexOf("--combats") >= 0 && act.length) console.log("Temps actif estimé (combats) : médiane " + med(act).toFixed(1) + " h (de " + Math.min.apply(null, act).toFixed(1) + " à " + Math.max.apply(null, act).toFixed(1) + " h)");

// où part le temps : médiane par cause, puis les étapes qui pèsent (moyenne du lot)
if (runs.length && runs[0].stats.attente) {
  var causes = {};
  runs.forEach(function (j) {
    var p = { combat: j.stats.combatMs / 3600e3, "soin au camp": j.stats.healMs / 3600e3 };
    Object.keys(j.stats.attente).forEach(function (k) { p[k] = j.stats.attente[k] / 3600e3; });
    Object.keys(p).forEach(function (k) { (causes[k] = causes[k] || []).push(p[k]); });
  });
  console.log("\nOù part le temps (médiane par partie, h) : " + Object.keys(causes).map(function (k) { while (causes[k].length < runs.length) causes[k].push(0); return [k, med(causes[k]), Math.max.apply(null, causes[k])]; })
    .sort(function (a, b) { return b[1] - a[1]; }).filter(function (x) { return x[2] >= 0.5; }).map(function (x) { return x[0] + " " + x[1].toFixed(1) + " (max " + x[2].toFixed(0) + ")"; }).join(" · "));
  var parEtape = {};
  runs.forEach(function (j) { j.stats.steps.forEach(function (st) {
    if (!st.temps) return;
    var a = parEtape[st.id] = parEtape[st.id] || { tot: [], parts: {} };
    a.tot.push(st.temps.total);
    Object.keys(st.temps.parts).forEach(function (k) { a.parts[k] = (a.parts[k] || 0) + st.temps.parts[k] / runs.length; });
  }); });
  console.log("Étapes qui pèsent (h : médiane, max ; causes en moyenne du lot) :");
  Object.keys(parEtape).filter(function (k) { return Math.max.apply(null, parEtape[k].tot) >= 3; }).forEach(function (k) {
    var a = parEtape[k], top = Object.keys(a.parts).filter(function (c) { return a.parts[c] >= 0.3; }).sort(function (x, y) { return a.parts[y] - a.parts[x]; }).slice(0, 4);
    console.log("  " + k.padEnd(16) + med(a.tot).toFixed(1).padStart(6) + Math.max.apply(null, a.tot).toFixed(0).padStart(6) + "   " + top.map(function (c) { return c + " " + a.parts[c].toFixed(1); }).join(" · "));
  });
}

// par classe
CLASSES.forEach(function (c) {
  var r = runs.filter(function (j) { return j.classe === c; });
  if (!r.length) return;
  console.log("  " + c.padEnd(7) + " morts " + r.map(function (j) { return j.stats.deaths || 0; }).join("/") + " · combat " + med(r.map(function (j) { return j.stats.combatMs / 3600e3; })).toFixed(1) + " h · soin " + med(r.map(function (j) { return j.stats.healMs / 3600e3; })).toFixed(1) + " h · farm " + med(r.map(function (j) { return j.stats.grindMs / 3600e3; })).toFixed(0) + " h");
});

// murs
var murs = {};
runs.forEach(function (j) { j.stats.murs.forEach(function (m) { var a = murs[m.step] = murs[m.step] || { n: 0, cls: {}, title: m.title }; a.n++; a.cls[j.classe] = (a.cls[j.classe] || 0) + 1; }); });
console.log("\nMurs (étape rejouée combats gagnés d'office) :");
Object.keys(murs).forEach(function (k) { console.log("  " + k + " « " + murs[k].title + " » : " + murs[k].n + "/" + runs.length + " " + JSON.stringify(murs[k].cls)); });

// étapes
var steps = {};
runs.forEach(function (j) { j.stats.steps.forEach(function (s) { var a = steps[s.id] = steps[s.id] || { h: [], lvl: [], d: [] }; a.h.push(s.h); a.lvl.push(s.level); a.d.push(s.deaths || 0); }); });
console.log("\nÉtapes (médianes) :        durée    niv.  morts");
Object.keys(steps).forEach(function (k) { var a = steps[k]; console.log("  " + k.padEnd(22) + (med(a.h).toFixed(1) + " h").padStart(9) + String(med(a.lvl)).padStart(7) + String(med(a.d)).padStart(7)); });

// qui tue
var killers = {};
runs.forEach(function (j) { j.stats.fights.forEach(function (f) { if (f.died) { var k = f.step + " · " + f.name; killers[k] = (killers[k] || 0) + 1; } }); });
console.log("\nQui tue (étape · ennemi : morts sur le lot) :");
Object.keys(killers).sort(function (a, b) { return killers[b] - killers[a]; }).slice(0, 15).forEach(function (k) { console.log("  " + k + " : " + killers[k]); });

// boss et élites
var bosses = {};
runs.forEach(function (j) { j.stats.fights.forEach(function (f) { if (f.kind === "normal") return; var k = f.name; var a = bosses[k] = bosses[k] || { n: 0, lost: 0, died: 0, rounds: 0 }; a.n++; a.lost += f.hpLost || 0; a.rounds += f.rounds; if (f.died) a.died++; }); });
console.log("\nBoss et élites :                          combats  PV perdus  morts   rounds");
Object.keys(bosses).sort(function (a, b) { return bosses[b].n - bosses[a].n; }).forEach(function (k) { var a = bosses[k]; console.log("  " + k.padEnd(40) + String(a.n).padStart(6) + pct(a.lost, a.n).padStart(10) + pct(a.died, a.n).padStart(8) + (a.rounds / a.n).toFixed(1).padStart(8)); });

// farm, obstacles, secteurs
var gf = {}, ob = {}, se = {};
runs.forEach(function (j) {
  Object.keys(j.stats.goldFarm || {}).forEach(function (k) { var a = gf[k] = gf[k] || { lots: 0, or: 0, h: 0 }, b = j.stats.goldFarm[k]; a.lots += b.lots; a.or += b.or; a.h += b.h; });
  Object.keys(j.stats.obstacles || {}).forEach(function (k) { var a = ob[k] = ob[k] || { ok: 0, rate: 0 }; a.ok += j.stats.obstacles[k].ok; a.rate += j.stats.obstacles[k].rate; });
  Object.keys(j.stats.secteurs || {}).forEach(function (k) { var a = se[k] = se[k] || { e: 0, l: 0 }; a.e += j.stats.secteurs[k].essais; a.l += j.stats.secteurs[k].liberes; });
});
console.log("\nFarm : " + Object.keys(gf).map(function (k) { var a = gf[k]; return k + " " + a.lots + " lots, " + Math.round(a.or / a.lots) + " or/lot, " + Math.round(a.or / a.h) + " or/h"; }).join(" · "));
console.log("Obstacles (estimation → réussite) : " + Object.keys(ob).map(function (k) { return k + " " + pct(ob[k].ok, ob[k].ok + ob[k].rate) + " (" + (ob[k].ok + ob[k].rate) + ")"; }).join(" · "));
console.log("Secteurs libérés / tentés : " + Object.keys(se).map(function (k) { return k + " " + se[k].l + "/" + se[k].e; }).join(" · "));
