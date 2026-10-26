"use strict";
/* tools/audit/telegraphes-audit.js — v3.492.14 (demande Seb, 26/10) : chaque sortie qui passe par la préparation
   (quête, chasse, élite de carte, donjon), ce que ses créatures font vraiment en combat, contre ce que la feuille
   « Ce que tu vas affronter » annonce (toutes les créatures supposées déjà vaincues). Lecture seule.
   USAGE : node tools/audit/telegraphes-audit.js [--json fichier] */
var fs = require("fs"), path = require("path");
var dir = path.join(__dirname, "..", "sim");
var src = fs.readFileSync(path.join(dir, "forecast-calibration-bench.js"), "utf8").replace(/\nmain\(\);\s*$/, "\n");
var mod = { exports: {} };
var req = function (m) { return require(m.indexOf("../") === 0 ? path.join(dir, m) : m); };
new Function("require", "process", "module", "__dirname", src + "\nmodule.exports = { g: g };")(req, { argv: [process.argv[0], "x", require("../chemins.js").jeu()] }, mod, dir);
var g = mod.exports.g;
var JSON_OUT = (function () { var i = process.argv.indexOf("--json"); return i > 0 ? process.argv[i + 1] : null; })();

// Libellés : traits de la préparation (6) et autres mécaniques
var TRAIT_NOM = { shielded: "Bouclier", silenced: "Silence", armored: "Blindé", enraged: "Enragé", vampiric: "Vampirique", corrupted: "Corrupteur",
  heal: "Soin", surge: "Exaltation", adds: "Renforts", calling: "Appel", rising: "Se relève", asleep: "Dormeurs", chaining: "Chaînes",
  sorting: "Tri", shell: "Carapace", burning: "Brûlure", heat: "Chaleur", diving: "Plongée" }; // v3.492.14 : tout ce que la préparation annonce
var ITEM_PAR_TRAIT = {};
Object.keys(g.COMBAT_ITEMS).forEach(function (id) { var it = g.COMBAT_ITEMS[id]; if (it.trait) ITEM_PAR_TRAIT[TRAIT_NOM[it.trait]] = it.name; });

// toutes les créatures « déjà vaincues » : la préparation montre alors tout ce qu'elle sait montrer
g.game.killCounts = {};
Object.keys(g.ENEMY_DB).concat(Object.keys(g.ELITE_DB), Object.keys(g.BOSS_DB || {})).forEach(function (id) { g.game.killCounts[id] = 1; });
g.game.dungeonTierCleared = {}; g.DUNGEONS.forEach(function (d) { g.game.dungeonTierCleared[d.id] = true; });

/* Mécaniques réelles d'une créature, d'après les données et les règles du moteur (combat-engine.js) :
   boss = soin + bouclier ; élite = bouclier + exaltation ; normal = charge, ou son trait fixe. */
function mecaEnnemi(id, monde, out, donjon) {
  var e = g.ENEMY_DB[id] || {}, nom = e.name || id, fixe = g.FIXED_ENEMY_ARCHETYPES[id];
  if (fixe) add(out, TRAIT_NOM[fixe], nom);
  else {
    add(out, "Charge", nom);
    if (monde >= g.SILENCED_MIN_WORLD_INDEX) add(out, "Silence (au hasard)", nom);
  }
  // en donjon (dungeon-system.js) : pas de relève ni d'appel ; le tri seulement dans la Gueule (veines)
  if (e.sorts && (!donjon || donjon === "mountain")) add(out, "Tri", nom);
  if (e.rises && !donjon) add(out, "Se relève", nom);
  if (e.calls && !donjon) add(out, "Appel", nom);
}
function mecaElite(id, monde, out, donjon) {
  var el = g.ELITE_DB[id] || {}, nom = el.name || id;
  add(out, "Bouclier", nom); add(out, "Exaltation", nom);
  if (el.archetype) add(out, TRAIT_NOM[el.archetype], nom);
  if (el.sorts) add(out, "Tri", nom);
  if (el.forgeShell) add(out, "Carapace", nom);
  if (el.burns) add(out, "Brûlure", nom);
  ((el.escort && el.escort.members) || []).forEach(function (m) { mecaEnnemi(m, monde, out, donjon); });
}
function mecaBoss(nom, archetype, phases, out) {
  add(out, "Soin", nom); add(out, "Bouclier", nom);
  if (archetype) add(out, TRAIT_NOM[archetype], nom);
  (phases || []).forEach(function (p) {
    // phases : surprise voulue (décision v3.378.0), relevées à part, jamais comptées comme oubli
    if (p.archetype) add(out, TRAIT_NOM[p.archetype] + " (phase)", nom);
    if (p.adds) add(out, "Renforts (phase)", nom);
    if (p.sleepAdds || p.halfSleep || p.wakeAll) add(out, "Dormeurs (phase)", nom);
    if (p.sorts) add(out, "Tri (phase)", nom);
    if (p.heat) add(out, "Chaleur (phase)", nom);
    if (p.dive) add(out, "Plongée (phase)", nom);
    if (p.chainBoth) add(out, "Chaînes (phase)", nom);
  });
}
function add(out, meca, nom) { (out[meca] = out[meca] || []).indexOf(nom) === -1 && out[meca].push(nom); }

function mondeIndex(worldId) { for (var i = 0; i < g.WORLDS.length; i++) if (g.WORLDS[i].id === worldId) return i; return 0; }

/* Contextes : quêtes (aventure et chasse), élites de carte, donjons. */
var lignes = [];
function audit(type, id, titre, monde, reel) {
  var prev = g.getEnemyTraitsPreview({ type: type, id: id });
  var annonce = prev.traits.map(function (t) { return TRAIT_NOM[t.trait]; });
  var absent = Object.keys(reel).filter(function (m) { return !/\(phase\)$/.test(m) && annonce.indexOf(m) === -1 && m !== "Charge" && m !== "Silence (au hasard)"; });
  lignes.push({ type: type, id: id, titre: titre, monde: g.WORLDS[monde] ? g.WORLDS[monde].name : monde, annonce: annonce, reel: reel, absent: absent });
}
Object.keys(g.ADVENTURE_QUESTS).forEach(function (id) {
  var q = g.ADVENTURE_QUESTS[id], w = mondeIndex(q.worldId), reel = {};
  g.etCreaturesFor({ type: "adventure", id: id }).forEach(function (c) {
    if (c.kind === "enemy") mecaEnnemi(c.id, w, reel);
    if (c.kind === "elite") mecaElite(c.id, w, reel);
    if (c.kind === "boss") mecaBoss((g.BOSS_DB[c.id] || {}).name || c.id, q.bossArchetype, q.bossPhases, reel);
  });
  if (q.chains) add(reel, "Chaînes", "quête");
  (q.encounters || []).forEach(function (e) { if (e && e.sleepers) add(reel, "Dormeurs", "rencontres"); });
  audit("adventure", id, q.name, w, reel);
});
Object.keys(g.HUNT_QUESTS).forEach(function (id) {
  var q = g.HUNT_QUESTS[id], w = mondeIndex(q.worldId), reel = {};
  g.etCreaturesFor({ type: "hunt", id: id }).forEach(function (c) { if (c.kind === "enemy") mecaEnnemi(c.id, w, reel); });
  audit("hunt", id, q.name, w, reel);
});
Object.keys(g.ELITE_DB).forEach(function (id) {
  var reel = {}, w = Number(g.ELITE_DB[id].worldIndex || 0);
  mecaElite(id, w, reel);
  audit("elite", id, g.ELITE_DB[id].name, w, reel);
});
g.DUNGEONS.forEach(function (d) {
  var reel = {}, w = Number(d.worldPower || 0);
  g.etDungeonPool(d).forEach(function (eid) { mecaEnnemi(eid, w, reel, d.worldId); });
  Object.keys(d.eliteWaves || {}).forEach(function (k) { mecaElite(d.eliteWaves[k], w, reel, d.worldId); });
  if (d.boss) { mecaBoss(d.boss.name, d.boss.archetype, d.boss.phases, reel); if (d.boss.rises) add(reel, "Se relève", d.boss.name); }
  audit("dungeon", d.id, d.name, w, reel);
});

// Sortie texte
var parMeca = {};
lignes.forEach(function (l) {
  console.log("\n" + l.type.toUpperCase() + " · " + l.titre + " (" + l.id + ", " + l.monde + ")");
  console.log("   Annoncé : " + (l.annonce.length ? l.annonce.join(", ") : "rien"));
  var ph = Object.keys(l.reel).filter(function (m) { return /\(phase\)$/.test(m); });
  if (ph.length) console.log("   Surprise de phase (non annoncée, voulu) : " + ph.join(", "));
  console.log("   Pas annoncé : " + (l.absent.length ? l.absent.map(function (m) { return m + " [" + l.reel[m].join(", ") + "]"; }).join(" ; ") : "—"));
  l.absent.forEach(function (m) { parMeca[m] = (parMeca[m] || 0) + 1; });
});
console.log("\nSYNTHÈSE — mécaniques jamais annoncées, en nombre de sorties (" + lignes.length + " sorties)");
Object.keys(parMeca).sort(function (a, b) { return parMeca[b] - parMeca[a]; }).forEach(function (m) {
  console.log("   " + (m + "").padEnd(32) + String(parMeca[m]).padStart(3) + "   objet : " + (ITEM_PAR_TRAIT[m] || "aucun"));
});
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(lignes, null, 1));
