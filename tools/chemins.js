"use strict";
/* tools/chemins.js — chemins communs des outils (harnais, bancs, audits, générateurs).
   Le jeu vit dans game/ ; les sorties (captures, rapports jetables) dans captures/, hors git. */
var fs = require("fs"), path = require("path");

var DEPOT = path.join(__dirname, "..");

/* Racine du jeu. Sans argument : game/. Avec la racine du dépôt (ancien usage « . »), bascule sur game/. */
function jeu(arg) {
  if (!arg) return path.join(DEPOT, "game");
  // Les outils lisent leurs options à partir du 2e argument : la racine doit précéder les options.
  if (/^-/.test(arg)) { console.error("Premier argument : la racine du jeu (« . » ou « game »), avant les options (" + arg + ")."); process.exit(2); }
  var r = path.resolve(arg);
  if (!fs.existsSync(path.join(r, "index.html")) && fs.existsSync(path.join(r, "game", "index.html"))) return path.join(r, "game");
  return r;
}

/* Dossier de sortie sous captures/, créé au besoin. */
function captures(sous) {
  var d = path.join(DEPOT, "captures", sous || "");
  fs.mkdirSync(d, { recursive: true });
  return d;
}

module.exports = { DEPOT: DEPOT, jeu: jeu, captures: captures, outils: __dirname };
