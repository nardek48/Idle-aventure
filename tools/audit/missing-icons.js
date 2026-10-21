"use strict";
/* tools/audit/missing-icons.js — v3.304.0 : liste des images citées par le jeu et absentes du disque.
   Règle Seb : une icône pas encore dessinée garde son vrai chemin dans les données (le jeu
   affiche l'icône générique à sa place) ; ce contrôle en fait la liste à générer en une fois.
   Lit js/, css/ et index.html, puis les données chargées (v3.457.1 : chemins construits au chargement).
   Les chemins construits plus tard, à l'exécution, échappent encore : en jeu, window.MISSING_ICONS les liste.
   USAGE : node tools/audit/missing-icons.js . */
var fs = require("fs"), path = require("path");
var ROOT = require("../chemins.js").jeu(process.argv[2]);
// v3.449.3 : aussi src=… sans guillemets (src=images/….png>), qui échappait au contrôle
var RE = /["'(=]((?:\.{0,2}\/)*images\/[^"'()\s>]+?\.(?:png|jpe?g|webp|svg|gif))(?=["')>\s])/gi;

function walk(dir, out) {
  fs.readdirSync(dir).forEach(function (f) {
    var p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.(js|css|html)$/.test(f)) out.push(p);
  });
  return out;
}

var fichiers = walk(path.join(ROOT, "js"), walk(path.join(ROOT, "css"), [path.join(ROOT, "index.html")]));
var manquants = {}; // chemin normalisé -> [fichiers qui le citent]
fichiers.forEach(function (f) {
  var src = fs.readFileSync(f, "utf8"), m;
  RE.lastIndex = 0;
  while ((m = RE.exec(src)) !== null) {
    var rel = m[1].replace(/^(\.{0,2}\/)+/, ""); // tout est servi depuis la racine
    if (fs.existsSync(path.join(ROOT, rel))) continue;
    var cite = path.relative(ROOT, f);
    (manquants[rel] = manquants[rel] || []);
    if (manquants[rel].indexOf(cite) === -1) manquants[rel].push(cite);
  }
});

/* v3.457.1 : seconde passe — les données chargées (js/data) livrent les chemins construits au
   chargement (icônes des hauts faits : ACH_ICON + id + ".webp"), que la lecture du texte ne voit pas. */
(function () {
  var vm = require("vm"), sb = { console: { log: function () {}, warn: function () {}, error: function () {} }, Math: Math, JSON: JSON, Date: Date,
    _t: function (x) { return x; }, _td: function (x) { return x; }, _tn: function (n, a) { return a; }, game: {}, localStorage: { getItem: function () { return null; }, setItem: function () {} } };
  sb.window = sb; sb.self = sb;
  vm.createContext(sb);
  var scripts = require("../harness/index-scripts.js")(ROOT, /pwa\.js|boot\.js/).filter(function (f) { return /^js\/(core|data)\//.test(f); });
  scripts.forEach(function (f) { try { vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sb, { filename: f }); } catch (e) { /* donnée qui dépend d'un système : ignorée */ } });
  var vus = [];
  function fouille(v, d) {
    if (d > 8 || v == null) return;
    if (typeof v === "string") {
      if (!/^(\.{0,2}\/)*images\/.+\.(png|jpe?g|webp|svg|gif)$/i.test(v)) return;
      var rel = v.replace(/^(\.{0,2}\/)+/, "");
      if (!fs.existsSync(path.join(ROOT, rel))) { manquants[rel] = manquants[rel] || []; if (manquants[rel].indexOf("(données chargées)") === -1) manquants[rel].push("(données chargées)"); }
      return;
    }
    if (typeof v !== "object" || vus.indexOf(v) !== -1) return;
    vus.push(v);
    Object.keys(v).forEach(function (k) { try { fouille(v[k], d + 1); } catch (e) {} });
  }
  Object.keys(sb).forEach(function (k) { if (/^[A-Z][A-Z0-9_]+$/.test(k)) fouille(sb[k], 0); });
})();

var cles = Object.keys(manquants).sort();
console.log(cles.length ? cles.length + " image(s) absente(s) :\n" : "Aucune image absente.");
cles.forEach(function (k) { console.log("  " + k + "   <- " + manquants[k].join(", ")); });
