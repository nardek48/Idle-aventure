"use strict";
/* tools/sim/badge-quetes.js — v3.768.0 (Seb 10/11) : le badge Facile / Moyen / Difficile des quêtes, tiré du robot.
   Lit les lots de campagne (captures/<lot>/*.json, campagne-lot.js --combats) : par quête et par partie, PV perdus
   + 0,35 × potions bues (une potion rend 35 % des PV), et les morts. Médiane < 35 % : facile ; < 65 % : moyen ; sinon,
   ou une mort dans plus de 5 % des parties : difficile. --ecrire met à jour `difficulty` dans data/adventure-quests.js.
   USAGE : node tools/sim/badge-quetes.js . lot-c1,lot-c2,lot-c3b1 [--ecrire] */
var fs = require("fs"), path = require("path"), vm = require("vm");
var ROOT = require("../chemins.js").jeu(process.argv[2]);
var LOTS = String(process.argv[3] || "campagne-lot").split(",");
var ECRIRE = process.argv.indexOf("--ecrire") >= 0;
var SEUILS = { facile: 0.35, moyen: 0.65, morts: 0.05 }, POTION = 0.35;

/* Étape d'Histoire de chaque quête : le lien « adv_<quête> » (même règle que QuestEnemyManager.placeOf). */
var sb = { console: console, _t: function (s) { return s; } }; sb.window = sb; vm.createContext(sb);
["js/data/story-quests.js", "js/data/adventure-quests.js"].forEach(function (f) {
  try { vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sb, { filename: f }); } catch (e) { /* dépendances absentes : on lit ce qui est posé */ }
});
var Q = sb.ADVENTURE_QUESTS || {}, etapeDe = {};
Object.keys(sb.STORY_QUESTS || {}).forEach(function (c) {
  (sb.STORY_QUESTS[c].steps || []).forEach(function (st) {
    var card = String((st.linkTo && st.linkTo.cardId) || "");
    if (card.indexOf("adv_") === 0 && !etapeDe[card.slice(4)]) etapeDe[card.slice(4)] = st.id;
  });
});

/* Par partie : coût de chaque quête (combats d'Histoire de son étape, ou combats d'élite « élite <quête> »). */
var parQuete = {}, quetePourEtape = {};
Object.keys(etapeDe).forEach(function (q) { quetePourEtape[etapeDe[q]] = q; });
LOTS.forEach(function (lot) {
  var dir = require("../chemins.js").captures(lot);
  if (!fs.existsSync(dir)) { console.log("lot absent : " + dir); return; }
  fs.readdirSync(dir).filter(function (f) { return /\.json$/.test(f); }).forEach(function (f) {
    var d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")), cout = {};
    ((d.stats && d.stats.fights) || []).forEach(function (x) {
      var q = x.ctx === "histoire" ? quetePourEtape[x.step] : (x.ctx === "élites" ? String(x.step || "").replace(/^élite /, "") : null);
      if (!q || !Q[q]) return;
      var c = cout[q] = cout[q] || { pv: 0, mort: false };
      c.pv += Number(x.hpLost || 0) + POTION * Number(x.potions || 0);
      if (x.died) c.mort = true;
    });
    Object.keys(cout).forEach(function (q) { (parQuete[q] = parQuete[q] || []).push(cout[q]); });
  });
});

function mediane(a) { a = a.slice().sort(function (x, y) { return x - y; }); return a.length ? a[Math.floor(a.length / 2)] : NaN; }
var badges = {}, lignes = [];
Object.keys(Q).forEach(function (q) {
  var v = parQuete[q];
  if (!v || v.length < 5) { lignes.push([q, Q[q].difficulty, "(pas assez de parties)", ""]); return; }
  var m = mediane(v.map(function (c) { return c.pv; })), morts = v.filter(function (c) { return c.mort; }).length / v.length;
  var b = (morts > SEUILS.morts || m >= SEUILS.moyen) ? "hard" : (m < SEUILS.facile ? "easy" : "medium");
  badges[q] = b;
  lignes.push([q, Q[q].difficulty, b, Math.round(100 * m) + " % des PV, morts " + Math.round(100 * morts) + " % (" + v.length + " parties)"]);
});
console.log("BADGES DES QUÊTES — tirés du robot (" + LOTS.join(", ") + ")\n");
lignes.forEach(function (l) { console.log(l[0].padEnd(26) + String(l[1]).padEnd(8) + "→ " + String(l[2]).padEnd(8) + l[3]); });

if (ECRIRE) {
  var fichier = path.join(ROOT, "js/data/adventure-quests.js"), src = fs.readFileSync(fichier, "utf8"), n = 0;
  Object.keys(badges).forEach(function (q) {
    var re = new RegExp("(\\n  " + q + ": \\{[\\s\\S]*?\\n    difficulty: \")(easy|medium|hard)(\")");
    src = src.replace(re, function (all, a, old, c) { if (old !== badges[q]) n++; return a + badges[q] + c; });
  });
  fs.writeFileSync(fichier, src);
  console.log("\n" + n + " badge(s) changé(s) dans data/adventure-quests.js");
}
