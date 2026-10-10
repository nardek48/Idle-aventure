"use strict";
/* tools/sim/compare-journal.js — v3.437.0 : met une vraie partie (export du journal de test, Paramètres ›
   Appareil) en face du banc de campagne, étape par étape : temps réel, temps de jeu actif, morts, niveau.

   USAGE : node tools/sim/compare-journal.js <journal.json> [dossier du lot]
   Le lot par défaut est captures/campagne-lot (node tools/sim/campagne-lot.js . --combats) ; seules les
   parties de la même classe sont comparées. Sans lot, seule la vraie partie est affichée. */

var fs = require("fs"), path = require("path");
var FICHIER = process.argv[2];
if (!FICHIER) { console.error("USAGE : node tools/sim/compare-journal.js <journal.json> [dossier du lot]"); process.exit(2); }
var LOT = process.argv[3] || require("../chemins.js").captures("campagne-lot");

var J = JSON.parse(fs.readFileSync(FICHIER, "utf8"));
if (!J.aethervaleJournalTest) { console.error("Ce fichier n'est pas un journal de test Aethervale."); process.exit(2); }
var lignes = (J.lignes || []).filter(function (l) { return !J.heros || !J.heros.id || l.h === J.heros.id; });
if (!lignes.length) { console.error("Journal vide pour ce héros."); process.exit(2); }

var releves = lignes.filter(function (l) { return l.type === "releve"; });
var classe = (releves.filter(function (r) { return r.d.classe; })[0] || { d: {} }).d.classe;
var t0 = lignes[0].t, pt0 = lignes[0].pt;
function h(ms) { return (ms / 3600e3).toFixed(1); }

/* Étapes de la vraie partie : fin de chaque étape (ligne « etape »), morts et niveau entre deux fins. */
var etapes = [], prec = { t: t0, pt: pt0 }, morts = 0, potions = 0;
lignes.forEach(function (l) {
  if (l.type === "mort") morts++;
  if (l.type === "potion") potions++;
  if (l.type !== "etape") return;
  etapes.push({ id: l.d.etape, niv: l.d.niv, reelH: (l.t - prec.t) / 3600e3, actifH: (l.pt - prec.pt) / 3600, cumulReelH: (l.t - t0) / 3600e3, cumulActifH: (l.pt - pt0) / 3600, morts: morts, potions: potions });
  prec = l; morts = 0; potions = 0;
});

/* Sessions : nombre d'ouvertures, durée moyenne au premier plan. */
var sessions = 0, auPremierPlan = 0, debut = null;
lignes.forEach(function (l) {
  if (l.type === "session_debut") { sessions++; debut = l.t; }
  if (l.type === "session_fin" && debut !== null) { auPremierPlan += l.t - debut; debut = null; }
});

/* Le banc : médianes par étape, même classe. */
function med(a) { a = a.slice().sort(function (x, y) { return x - y; }); return a.length ? a[Math.floor(a.length / 2)] : null; }
var banc = {}, nBanc = 0;
if (fs.existsSync(LOT)) fs.readdirSync(LOT).filter(function (f) { return /\.json$/.test(f); }).forEach(function (f) {
  var r = JSON.parse(fs.readFileSync(path.join(LOT, f), "utf8"));
  if (classe && r.classe !== classe) return;
  nBanc++;
  (r.stats.steps || []).forEach(function (s) {
    var b = banc[s.id] = banc[s.id] || { h: [], combat: [], cumul: [], morts: [], niv: [] };
    b.h.push(s.temps ? s.temps.total : s.h); b.combat.push(s.combatH); b.cumul.push(s.totalH); b.morts.push(s.deaths || 0); b.niv.push(s.level);
  });
});

var heros = J.heros || {};
console.log("Journal de " + (heros.nom || "?") + " (" + (classe || "classe ?") + "), version " + J.version + " : " + lignes.length + " lignes, "
  + etapes.length + " étapes terminées, " + sessions + " sessions, " + h(lignes[lignes.length - 1].t - t0) + " h réelles, "
  + ((lignes[lignes.length - 1].pt - pt0) / 3600).toFixed(1) + " h de jeu actif" + (sessions ? " (" + Math.round(auPremierPlan / Math.max(1, sessions) / 60e3) + " min par session)" : ""));
console.log("Banc : " + (nBanc ? nBanc + " partie(s) de la même classe dans " + LOT : "aucun lot trouvé — seule la vraie partie est affichée"));
console.log("\nÉtape                   ─── ta partie ───────────────────────   ─── banc (médiane) ────────");
console.log("                          réel    actif   cumul réel  morts niv.    durée  combat  cumul  morts niv.");
etapes.forEach(function (e) {
  var b = banc[e.id];
  var ligne = "  " + e.id.padEnd(20) + (e.reelH.toFixed(1) + " h").padStart(8) + (e.actifH.toFixed(2) + " h").padStart(9)
    + (e.cumulReelH.toFixed(1) + " h").padStart(11) + String(e.morts).padStart(6) + String(e.niv).padStart(5);
  if (b) ligne += (med(b.h).toFixed(1) + " h").padStart(11) + (med(b.combat).toFixed(2) + " h").padStart(8) + (med(b.cumul).toFixed(0) + " h").padStart(7) + String(med(b.morts)).padStart(6) + String(med(b.niv)).padStart(5);
  console.log(ligne);
});

/* Le rapport utile à l'étalonnage : temps actif du joueur / temps de combat du robot. */
var actif = 0, combat = 0, n = 0;
etapes.forEach(function (e) { var b = banc[e.id]; if (!b) return; actif += e.actifH; combat += med(b.combat); n++; });
if (n && combat > 0) console.log("\nSur " + n + " étapes communes : " + actif.toFixed(1) + " h de jeu actif pour " + combat.toFixed(1) + " h de combat au banc (×" + (actif / combat).toFixed(1) + ").");
var mortsJ = lignes.filter(function (l) { return l.type === "mort"; });
if (mortsJ.length) {
  var qui = {};
  mortsJ.forEach(function (m) { var k = m.d.ennemi || m.d.onglet || "?"; qui[k] = (qui[k] || 0) + 1; });
  console.log("Morts (" + mortsJ.length + ") : " + Object.keys(qui).sort(function (a, b) { return qui[b] - qui[a]; }).map(function (k) { return k + " " + qui[k]; }).join(" · "));
}
