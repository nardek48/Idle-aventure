"use strict";
/* tools/publication/sans-commentaires.js — PERF-7 (option A, Seb 05/11) : retire les commentaires des JS
   de la copie PUBLIÉE (workflow pages.yml, après les harnais). Le dépôt garde ses commentaires.

   Sans bundler ni regroupement (décision O6) : chaque fichier reste à sa place, son code n'est pas touché.
   acorn repère les commentaires (jamais une chaîne ou une regex) ; un commentaire de bloc est remplacé
   par autant de sauts de ligne qu'il en contenait (sinon une espace) : numéros de ligne et règle
   d'insertion des points-virgules restent ceux du dépôt. Chaque fichier est relu par acorn après coup.

   USAGE : node tools/publication/sans-commentaires.js <dossier>     (réécrit les .js du dossier, en place)
   Dépendance d'outillage seulement : npm install --no-save acorn@8.14.0 */

var fs = require("fs"), path = require("path"), zlib = require("zlib");
var acorn = require("acorn");

var DOSSIER = process.argv[2];
if (!DOSSIER || !fs.existsSync(DOSSIER)) { console.error("USAGE : node tools/publication/sans-commentaires.js <dossier>"); process.exit(2); }

function walk(dir, out) {
  fs.readdirSync(dir).forEach(function (f) {
    var p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.js$/.test(f)) out.push(p);
  });
  return out;
}

function sansCommentaires(src, nom) {
  var coms = [];
  acorn.parse(src, { ecmaVersion: "latest", sourceType: "script", allowHashBang: true, onComment: function (bloc, texte, debut, fin) { coms.push([debut, fin]); } });
  var out = "", pos = 0;
  coms.forEach(function (c) {
    var bout = src.slice(c[0], c[1]), sauts = (bout.match(/\r\n|\n|\r|\u2028|\u2029/g) || []).length;
    out += src.slice(pos, c[0]) + (sauts ? new Array(sauts + 1).join("\n") : (bout.indexOf("//") === 0 ? "" : " "));
    pos = c[1];
  });
  out += src.slice(pos);
  out = out.replace(/[ \t]+$/gm, ""); // espaces de fin de ligne laissées par les commentaires
  acorn.parse(out, { ecmaVersion: "latest", sourceType: "script", allowHashBang: true }); // relu : lève si le fichier est cassé
  return out;
}

var avant = 0, apres = 0, gzAvant = 0, gzApres = 0, n = 0;
walk(path.resolve(DOSSIER), []).forEach(function (f) {
  var src = fs.readFileSync(f, "utf8"), out;
  try { out = sansCommentaires(src, f); } catch (e) { console.error("ÉCHEC " + f + " : " + e.message); process.exit(1); }
  fs.writeFileSync(f, out);
  avant += Buffer.byteLength(src); apres += Buffer.byteLength(out);
  gzAvant += zlib.gzipSync(src, { level: 9 }).length; gzApres += zlib.gzipSync(out, { level: 9 }).length; n++;
});
function ko(b) { return (b / 1024).toFixed(0) + " Ko"; }
console.log(n + " fichiers JS sans commentaires : " + ko(avant) + " → " + ko(apres) + " (gzip " + ko(gzAvant) + " → " + ko(gzApres) + ", −" + ko(gzAvant - gzApres) + ")");
