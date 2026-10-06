"use strict";
/* tools/audit/missing-icons.js — v3.304.0 : liste des images citées par le jeu et absentes du disque.
   Règle Seb : une icône pas encore dessinée garde son vrai chemin dans les données (le jeu
   affiche l'icône générique à sa place) ; ce contrôle en fait la liste à générer en une fois.
   Lit js/, css/ et index.html. Les chemins construits à l'exécution (concaténations) échappent
   à ce contrôle : en jeu, window.MISSING_ICONS liste ceux qui sont réellement tombés.
   USAGE : node tools/audit/missing-icons.js . */
var fs = require("fs"), path = require("path");
var ROOT = require("../chemins.js").jeu(process.argv[2]);
var RE = /["'(]((?:\.{0,2}\/)*images\/[^"'()\s]+?\.(?:png|jpe?g|webp|svg|gif))["')]/gi;

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

var cles = Object.keys(manquants).sort();
console.log(cles.length ? cles.length + " image(s) absente(s) :\n" : "Aucune image absente.");
cles.forEach(function (k) { console.log("  " + k + "   <- " + manquants[k].join(", ")); });
