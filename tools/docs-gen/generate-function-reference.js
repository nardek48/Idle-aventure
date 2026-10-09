"use strict";
/* tools/docs-gen/generate-function-reference.js — régénère la RÉFÉRENCE DES FONCTIONS en Markdown.
   Lecture textuelle des scripts de js/core, js/data, js/systems, js/ui, js/main (pas d'exécution).
   Rôle = commentaire écrit juste au-dessus de la fonction, vide s'il n'y en a pas.
   USAGE : node tools/docs-gen/generate-function-reference.js <racine du projet> <fichier.md de sortie> */
var fs = require("fs"), path = require("path");
var ROOT = require("../chemins.js").jeu(process.argv[2]);
var OUT = process.argv[3] || "Aethervale_Reference_Fonctions.md";
var DIRS = ["core", "data", "systems", "ui", "main"];

var version = (/GAME_VERSION\s*=\s*"([^"]+)"/.exec(fs.readFileSync(path.join(ROOT, "js/core/constants.js"), "utf8")) || [])[1] || "?";

/* Les trois formes reconnues : déclaration, propriété d'objet (dont `name = function`), accesseur get/set. */
var RE_FUNC = /^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/;
var RE_METHOD = /^\s*([A-Za-z_$][\w$]*)\s*:\s*(?:async\s+)?function\s*[\w$]*\s*\(([^)]*)\)/;
var RE_ACCESSOR = /^\s*(get|set)\s+[A-Za-z_$][\w$]*\s*\(([^)]*)\)\s*\{/;

/* Commentaire juste au-dessus de la ligne i : lignes `//` consécutives, ou bloc `/* … *\/` fermé sur la ligne précédente. */
function commentAbove(lines, i) {
  var j = i - 1, out = [];
  if (j < 0) return "";
  if (/^\s*\/\//.test(lines[j])) {
    while (j >= 0 && /^\s*\/\//.test(lines[j])) { out.unshift(lines[j].replace(/^\s*\/\/+\s?/, "")); j--; }
  } else if (/\*\/\s*$/.test(lines[j])) {
    while (j >= 0) { out.unshift(lines[j]); if (/\/\*/.test(lines[j])) break; j--; }
    out = out.map(function (l) { return l.replace(/^\s*\/\*+\s?/, "").replace(/\s*\*+\/\s*$/, "").replace(/^\s*\*\s?/, ""); });
  }
  return clean(out.join(" "));
}
function clean(s) { return String(s || "").replace(/\s+/g, " ").replace(/\|/g, "\\|").trim(); }

var total = 0, perDir = {}, body = [];
DIRS.forEach(function (d) {
  var dir = path.join(ROOT, "js", d);
  if (!fs.existsSync(dir)) return;
  var files = fs.readdirSync(dir).filter(function (f) { return /\.js$/.test(f); }).sort();
  perDir[d] = 0;
  body.push("# js/" + d, "");
  files.forEach(function (f) {
    var lines = fs.readFileSync(path.join(dir, f), "utf8").split("\n"), rows = [];
    lines.forEach(function (line, i) {
      var m, type, name, args;
      if ((m = RE_FUNC.exec(line))) { type = "function"; name = m[1]; args = m[2]; }
      else if ((m = RE_METHOD.exec(line))) { type = "method"; name = m[1]; args = m[2]; }
      else if ((m = RE_ACCESSOR.exec(line))) { type = "method"; name = m[1]; args = m[2]; }
      else return;
      // Le commentaire de fin de ligne compte aussi quand rien n'est écrit au-dessus
      var role = commentAbove(lines, i) || clean((/\/\/\s*(.*)$/.exec(line.replace(/"[^"]*"|'[^']*'/g, "")) || [])[1]);
      rows.push("| " + name + " | " + type + " | " + clean(args).replace(/\s*,\s*/g, ", ") + " | " + (i + 1) + " | " + role + " |");
    });
    if (!rows.length) return;
    perDir[d] += rows.length; total += rows.length;
    body.push("## js/" + d + "/" + f, "", "| Fonction | Type | Arguments | Ligne | Rôle |", "| --- | --- | --- | --- | --- |");
    body.push.apply(body, rows); body.push("");
  });
});

var now = new Date(), date = ("0" + now.getDate()).slice(-2) + "/" + ("0" + (now.getMonth() + 1)).slice(-2) + "/" + now.getFullYear();
var head = ["# Aethervale — Référence des fonctions", "",
  "**Régénérée le " + date + " depuis le code source actuel (v" + version + ").** " + total + " fonctions et méthodes répertoriées. Le rôle est le commentaire écrit juste au-dessus de la fonction dans le code ; il est vide quand il n'y en a pas. Générateur : `tools/docs-gen/generate-function-reference.js`.", "",
  "| Dossier | Fonctions |", "| --- | --- |"];
DIRS.forEach(function (d) { if (perDir[d] != null) head.push("| js/" + d + " | " + perDir[d] + " |"); });
head.push("");
fs.writeFileSync(OUT, head.concat(body).join("\n"));
console.log("Référence écrite : " + OUT + " (" + total + " fonctions, v" + version + ")");
