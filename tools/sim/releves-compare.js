"use strict";
/* tools/sim/releves-compare.js — compare deux relevés de campagne (tools/sim/releves/, écrits par campagne-harness.js --releve <nom>).
   USAGE : node tools/sim/releves-compare.js                 les deux derniers relevés
           node tools/sim/releves-compare.js <A> <B>         deux relevés (nom de fichier, ou début de nom)
           node tools/sim/releves-compare.js --liste         la liste des relevés */
var fs = require("fs"), path = require("path");
var DIR = path.join(__dirname, "releves");
var files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter(function (f) { return /\.json$/.test(f); }).sort(function (a, b) {
  return fs.statSync(path.join(DIR, a)).mtimeMs - fs.statSync(path.join(DIR, b)).mtimeMs; }) : [];
var args = process.argv.slice(2);
if (args[0] === "--liste" || files.length < 2 && !args.length) {
  files.forEach(function (f) { var r = JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")); console.log(f + "  ·  " + r.resume.reussies + " étapes, " + r.resume.totalH.toFixed(1) + " h, arrêt : " + (r.resume.arret ? r.resume.arret.split(" «")[0].replace(/^\S+ /, "") : "aucun")); });
  process.exit(0);
}
function pick(q) { var f = files.filter(function (x) { return x.indexOf(q) === 0 || x === q; }).pop(); if (!f) { console.error("Relevé introuvable : " + q); process.exit(2); } return f; }
var fa = args[0] ? pick(args[0]) : files[files.length - 2], fb = args[1] ? pick(args[1]) : files[files.length - 1];
var A = JSON.parse(fs.readFileSync(path.join(DIR, fa), "utf8")), B = JSON.parse(fs.readFileSync(path.join(DIR, fb), "utf8"));
function n(x, d) { return x == null ? "—" : Number(x).toFixed(d == null ? 1 : d); }
function delta(a, b, d) { if (a == null || b == null) return ""; var v = b - a; return (v >= 0 ? "+" : "") + v.toFixed(d == null ? 1 : d); }
console.log("A : " + fa + "\nB : " + fb + "\n");
console.log("Résumé                    A            B         écart");
[["étapes réussies", A.resume.reussies, B.resume.reussies, 0], ["heures de jeu", A.resume.totalH, B.resume.totalH, 1], ["niveau final", A.resume.niveau, B.resume.niveau, 0], ["morts", A.resume.morts, B.resume.morts, 0],
 ["or gagné", (A.resume.economie || {}).orGagne, (B.resume.economie || {}).orGagne, 0]].forEach(function (r) {
  console.log("  " + r[0].padEnd(20) + n(r[1], r[3]).padStart(12) + n(r[2], r[3]).padStart(13) + delta(r[1], r[2], r[3]).padStart(12));
});
console.log("  arrêt A : " + (A.resume.arret || "aucun").slice(0, 110));
console.log("  arrêt B : " + (B.resume.arret || "aucun").slice(0, 110));
console.log("\nFin de chaque monde        h (A → B)        niveau     or gagné dans le monde      entraînement (A → B)");
var mondes = {}; (A.mondes || []).forEach(function (m) { mondes[m.monde] = { a: m }; }); (B.mondes || []).forEach(function (m) { (mondes[m.monde] = mondes[m.monde] || {}).b = m; });
Object.keys(mondes).forEach(function (k) {
  var a = mondes[k].a || {}, b = mondes[k].b || {};
  var tr = function (m) { return m.entr ? Object.keys(m.entr).map(function (s) { return m.entr[s]; }).join("/") : "—"; };
  console.log("  " + k.padEnd(10) + (n(a.h) + " → " + n(b.h)).padStart(16) + ("  " + (a.niv || "—") + " → " + (b.niv || "—")).padStart(12) + ("  " + n(a.orMonde, 0) + " → " + n(b.orMonde, 0)).padStart(24) + "      " + tr(a) + " → " + tr(b));
});
console.log("\nÉtapes dont la durée change de plus de 0,3 h :");
var ia = {}; (A.etapes || []).forEach(function (e) { ia[e.id] = e; });
(B.etapes || []).forEach(function (e) {
  var a = ia[e.id]; if (!a) { console.log("  " + e.id.padEnd(16) + " nouvelle dans B (" + n(e.h) + " h)"); return; }
  if (Math.abs((e.h || 0) - (a.h || 0)) >= 0.3) console.log("  " + e.id.padEnd(16) + (n(a.h) + " h → " + n(e.h) + " h").padStart(18) + "   fin à " + n(a.finH) + " → " + n(e.finH) + " h");
});
var gestes = {}; [["a", A], ["b", B]].forEach(function (p) { (p[1].etapes || []).forEach(function (e) { Object.keys(e.actions || {}).forEach(function (k) { var g = gestes[k] = gestes[k] || { a: { n: 0, or: 0 }, b: { n: 0, or: 0 } }; g[p[0]].n += e.actions[k].n; g[p[0]].or += e.actions[k].or; }); }); });
console.log("\nGestes du robot (nombre, or dépensé) :");
Object.keys(gestes).sort().forEach(function (k) { var g = gestes[k]; console.log("  " + k.padEnd(20) + (g.a.n + " (" + g.a.or + ")").padStart(18) + (g.b.n + " (" + g.b.or + ")").padStart(20)); });
