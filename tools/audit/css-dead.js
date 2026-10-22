"use strict";
/* tools/audit/css-dead.js — v3.459.5 (audit O11) : classes CSS que ni le JS ni index.html ne citent.
   v3.459.7 : aussi les sélecteurs d'ID (#x) dont l'id n'est cité nulle part.
   Un nom construit par concaténation ("pc-sum-" + x, 'is-' + etat) n'est pas mort : la classe dont un
   préfixe (jusqu'à un tiret) finit une chaîne du JS est classée « construite », à vérifier à la main.
   USAGE : node tools/audit/css-dead.js [.] */
var fs = require("fs"), path = require("path");
var ROOT = require("../chemins.js").jeu(process.argv[2]);

function walk(dir, ext, out) {
  fs.readdirSync(dir).forEach(function (f) {
    var p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, ext, out);
    else if (ext.test(f)) out.push(p);
  });
  return out;
}

// Le code qui peut poser une classe : tout le JS (sauf les traductions) et index.html
var code = walk(path.join(ROOT, "js"), /\.js$/, [path.join(ROOT, "index.html")])
  .filter(function (f) { return !/[\\/]lang[\\/]/.test(f); })
  .map(function (f) { return fs.readFileSync(f, "utf8"); }).join("\n");

// Préfixes qui terminent une chaîne avant un + : "pc-sum-" + x, ' is-' + y, `cbx-${…}`, "cbx-team c" + n
var prefixes = {}, m, RP = /["'`][^"'`\n]*?([a-z][a-z0-9_-]*)(?:["'`]\s*\+|\$\{)/g;
while ((m = RP.exec(code))) prefixes[m[1]] = true;

var classes = {}, ids = {}; // classe ou id -> fichiers CSS
walk(path.join(ROOT, "css"), /\.css$/, []).forEach(function (f) {
  var css = fs.readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/url\([^)]*\)/g, "");
  var RC = /\.(-?[a-zA-Z_][a-zA-Z0-9_-]*)/g, c;
  // seuls les sélecteurs comptent : le texte avant chaque {
  css.split("{").forEach(function (part) {
    var sel = part.slice(part.lastIndexOf("}") + 1);
    while ((c = RC.exec(sel))) (classes[c[1]] = classes[c[1]] || {})[path.basename(f)] = true;
    var RI = /#([a-zA-Z_][a-zA-Z0-9_-]*)/g, d;
    while ((d = RI.exec(sel))) (ids[d[1]] = ids[d[1]] || {})[path.basename(f)] = true;
  });
});

var mortes = [], construites = [];
Object.keys(classes).sort().forEach(function (k) {
  if (new RegExp("(^|[^a-zA-Z0-9_-])" + k.replace(/[-]/g, "\\-") + "($|[^a-zA-Z0-9_-])").test(code)) return;
  // sans tiret final ("c" + n), seule une suite simple compte : c2, o1, pas cbx-crown
  var pre = Object.keys(prefixes).filter(function (p) { return k.indexOf(p) === 0 && k !== p && (/-$/.test(p) || /^[a-z0-9]+$/.test(k.slice(p.length))); });
  (pre.length ? construites : mortes).push(k + "  (" + Object.keys(classes[k]).join(", ") + ")" + (pre.length ? "  <- " + pre.join(" ") : ""));
});

var idsMorts = Object.keys(ids).sort().filter(function (k) {
  return !new RegExp("(^|[^a-zA-Z0-9_-])" + k.replace(/[-]/g, "\\-") + "($|[^a-zA-Z0-9_-])").test(code);
}).map(function (k) { return k + "  (" + Object.keys(ids[k]).join(", ") + ")"; });

console.log("Classes mortes (" + mortes.length + ") :\n  " + mortes.join("\n  "));
console.log("\nConstruites par concaténation, à vérifier (" + construites.length + ") :\n  " + construites.join("\n  "));
console.log("\nID morts (" + idsMorts.length + ") :\n  " + idsMorts.join("\n  "));
