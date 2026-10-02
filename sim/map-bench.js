"use strict";
/* sim/map-bench.js — v3.255.0 (Cartes Vivantes, lot C-1) : le modèle abstrait du
   rapport de conception (§5.4) porté sur le VRAI LivingMapManager.

   Ce que le banc mesure, en jours de jeu et à 20 000 parties par ligne :
     - le temps pour libérer la Forêt entière (9 secteurs)
     - le nombre de régressions subies par partie
     - la Sève de secteur (5 / 8 / 12, LIVING_MAP_RULES.firstReward) et la Sève de run
       (nœuds + finale, seveAeswyn de petite_aventure_foret — même modèle que
       sim/seve-bench.js), face aux 32 Sève/jour d'offre totale de référence
     - la sensibilité au frein de Palissade (7 %/niveau) et à la tenue par anneau

   Ce qui est RÉEL : living-maps.js, living-map-system.js (états, atteignabilité,
   pickRegression, frein, tenue, Sève), scene-templates.js (Sève de run, depthMax).
   Ce qui est un MODÈLE : le taux d'échec par intensité. Aucun banc ne joue encore
   une Petite Aventure entière sur le vrai moteur ; on reprend les taux mesurés en
   v3.198.0/v3.199.0 et repris par seve-bench (2 / 12 / 35 %), paramétrables.

   Joueur simulé : au cap (3 runs/jour), cible le secteur atteignable non libéré
   d'anneau le plus BAS (meilleure chance) — profil « prudent de carte ».
   --audacieux : cible l'anneau le plus HAUT atteignable.
   Un secteur d'élite (Camp des toiles) est un combat : hors cap, échec --echec-elite.

   Usage : node sim/map-bench.js <racine projet>
             [--runs 20000] [--cap 3] [--profil bourrin|prudent] [--audacieux]
             [--echec-sentier 0.02] [--echec-chemin 0.12] [--echec-periple 0.35] [--echec-elite 0.35]
             [--ascension N]   simule une Ascension tous les N jours (0 = jamais)
             [--frein 0.07]    frein par niveau, pour tester une autre valeur */

var fs = require("fs"), path = require("path"), vm = require("vm");
var ROOT = process.argv[2] || ".";
function arg(nom, defaut) { var i = process.argv.indexOf(nom); return i > -1 ? Number(process.argv[i + 1]) : defaut; }
function argStr(nom, defaut) { var i = process.argv.indexOf(nom); return i > -1 ? process.argv[i + 1] : defaut; }
var TIRAGES = arg("--runs", 20000);
var O_CAP = arg("--cap", 0);
var PROFIL = argStr("--profil", "bourrin");
var AUDACIEUX = process.argv.indexOf("--audacieux") > -1;
var ECHEC = {
  sentier: arg("--echec-sentier", 0.02),
  chemin: arg("--echec-chemin", 0.12),
  periple: arg("--echec-periple", 0.35),
  elite: arg("--echec-elite", 0.35)
};
var ASCENSION_TOUS_LES = arg("--ascension", 0);
var O_FREIN = arg("--frein", 0);

/* ---------- Chargement des vrais fichiers, sur un jeu factice ---------- */
var sb = {
  console: { log: function () {}, error: function () {}, warn: function () {} },
  Math: Math, Date: Date, JSON: JSON, Object: Object, Array: Array, Number: Number, String: String, Boolean: Boolean,
  game: {}, addLog: function () {}
};
sb.window = sb; sb.globalThis = sb;
vm.createContext(sb);
["js/data/scene-nodes.js", "js/data/scene-templates.js", "js/data/living-maps.js", "js/systems/living-map-system.js"].forEach(function (f) {
  var p = path.join(ROOT, f);
  if (!fs.existsSync(p)) { console.error("ANCRE MANQUANTE : " + f); process.exit(1); }
  try { vm.runInContext(fs.readFileSync(p, "utf8"), sb, { filename: f }); }
  catch (e) { console.error("ECHEC DE CHARGEMENT " + f + " : " + e.message); process.exit(1); }
});
var LM = sb.LivingMapManager, MAP = sb.LIVING_MAPS && sb.LIVING_MAPS.forest, RULES = sb.LIVING_MAP_RULES;
var TPL = sb.SCENE_TEMPLATES && sb.SCENE_TEMPLATES.petite_aventure_foret, CFG = TPL && TPL.seveAeswyn, INT = sb.SCENE_INTENSITY;
if (!LM || !MAP || !CFG || !INT) { console.error("ANCRE PERDUE : LivingMapManager / LIVING_MAPS.forest / seveAeswyn / SCENE_INTENSITY."); process.exit(1); }
if (O_FREIN) RULES.palisade.brakePerLevel = O_FREIN;

var CAP_SRC = fs.readFileSync(path.join(ROOT, "js/systems/scene-run-system.js"), "utf8");
var mCap = CAP_SRC.match(/PETITE_AVENTURE_DAILY_CAP\s*:\s*(\d+)/);
if (!mCap) { console.error("ANCRE PERDUE : PETITE_AVENTURE_DAILY_CAP."); process.exit(1); }
var CAP_JOUR = O_CAP || Number(mCap[1]);

/* Stubs des voisins : l'Entrepôt compte la Sève, le Village porte le niveau de Palissade. */
var seveCredit = 0, palisadeLevel = 0;
sb.WarehouseManager = { addResource: function (key, n) { if (key === RULES.seveResourceId) seveCredit += n; return n; } };
sb.VillageBuildingManager = { getLevel: function (id) { return id === RULES.palisade.buildingId ? palisadeLevel : 0; } };

/* ---------- Sève de run : même modèle que seve-bench ---------- */
function finaleDe(profil, intensite) {
  var v = CFG.finaleGuaranteedAmount && CFG.finaleGuaranteedAmount[profil];
  if (v == null) return 0;
  if (typeof v === "number") return v;
  return Number(v[intensite] != null ? v[intensite] : v[Object.keys(v)[0]]) || 0;
}
function seveDuRun(profil, intensite, echoue) {
  var depthMax = INT[intensite].depthMax, chance = Number(CFG.perNodeChancePct[profil] || 0);
  var noeuds = echoue ? Math.floor(Math.random() * depthMax) : depthMax, total = 0;
  for (var i = 0; i < noeuds; i++) if (Math.random() * 100 < chance) total += 1;
  if (!echoue) total += finaleDe(profil, intensite);
  return total;
}

/* ---------- Une partie ---------- */
function choisirCible() {
  var open = LM.getOpenTargets("forest");
  if (!open.length) return null;
  var defs = open.map(function (id) { return LM.getSectorDef("forest", id); });
  defs.sort(function (a, b) { return AUDACIEUX ? b.ring - a.ring : a.ring - b.ring; });
  return defs[0];
}

function jouerPartie(niveauPalissade) {
  sb.game = { ascensionCount: 0, livingMaps: {}, sceneRun: null };
  seveCredit = 0; palisadeLevel = niveauPalissade;
  LM.ensureDefaults();
  var jours = 0, runs = 0, regressions = 0, freins = 0, seveRun = 0, ascensions = 0;
  var LIMITE_JOURS = 60;
  while (LM.getSummary("forest").libere < MAP.sectors.length && jours < LIMITE_JOURS) {
    jours += 1;
    if (ASCENSION_TOUS_LES > 0 && jours > 1 && (jours - 1) % ASCENSION_TOUS_LES === 0) {
      sb.game.ascensionCount += 1; ascensions += 1;
      LM.ensureDefaults();
    }
    var slots = CAP_JOUR;
    while (slots > 0) {
      var cible = choisirCible();
      if (!cible) break;
      var content = LM.getContentFor("forest", cible.id);
      var elite = content && content.type === "elite";
      var intensite = LM.getIntensity(cible);
      var taux = elite ? ECHEC.elite : ECHEC[intensite];
      var echoue = Math.random() < taux;
      if (!elite) { slots -= 1; runs += 1; seveRun += seveDuRun(PROFIL, intensite, echoue); }
      var r = LM.onRunEnd("forest", cible.id, echoue ? "fail" : "success");
      if (r.regressed) regressions += 1;
      if (r.braked) freins += 1;
    }
  }
  return { jours: jours, runs: runs, regressions: regressions, freins: freins, seveSecteur: seveCredit, seveRun: seveRun, fini: LM.getSummary("forest").libere === MAP.sectors.length, ascensions: ascensions };
}

function mesurer(niveauPalissade) {
  var acc = { jours: 0, runs: 0, regressions: 0, freins: 0, seveSecteur: 0, seveRun: 0, nonFini: 0 };
  for (var i = 0; i < TIRAGES; i++) {
    var p = jouerPartie(niveauPalissade);
    acc.jours += p.jours; acc.runs += p.runs; acc.regressions += p.regressions; acc.freins += p.freins;
    acc.seveSecteur += p.seveSecteur; acc.seveRun += p.seveRun; if (!p.fini) acc.nonFini += 1;
  }
  var n = TIRAGES;
  return { jours: acc.jours / n, runs: acc.runs / n, regressions: acc.regressions / n, freins: acc.freins / n,
    seveSecteur: acc.seveSecteur / n, seveRun: acc.seveRun / n, nonFini: acc.nonFini / n };
}

/* ---------- Sortie ---------- */
function f1(x) { return x.toFixed(1); } function f2(x) { return x.toFixed(2); }
console.log("Cartes Vivantes — Forêt, " + MAP.sectors.length + " secteurs, cap " + CAP_JOUR + "/jour, profil " + PROFIL + (AUDACIEUX ? ", audacieux" : ", prudent de carte"));
console.log("Échec par intensité : Sentier " + (ECHEC.sentier * 100) + " % · Chemin " + (ECHEC.chemin * 100) + " % · Périple " + (ECHEC.periple * 100) + " % · élite " + (ECHEC.elite * 100) + " %");
console.log("Sève de secteur : " + [1, 2, 3].map(function (r) { return RULES.firstReward[r]; }).join(" / ") + " · frein " + (RULES.palisade.brakePerLevel * 100) + " %/niveau · tenue anneaux à " + [1, 2, 3].map(function (r) { return RULES.palisade.holdRingLevels[r]; }).join(" / ") + (ASCENSION_TOUS_LES ? " · Ascension tous les " + ASCENSION_TOUS_LES + " jours" : ""));
console.log("");
console.log("Palissade | jours  | runs  | régress. | freins | Sève secteur | Sève run | non fini à 60 j");
[0, 3, 5, 7, 10].forEach(function (lvl) {
  var m = mesurer(lvl);
  console.log(String(lvl).padStart(9) + " | " + f1(m.jours).padStart(6) + " | " + f1(m.runs).padStart(5) + " | " + f2(m.regressions).padStart(8) + " | " + f2(m.freins).padStart(6) + " | " + f1(m.seveSecteur).padStart(12) + " | " + f1(m.seveRun).padStart(8) + " | " + (m.nonFini * 100).toFixed(1) + " %");
});
console.log("");
console.log("Lecture : Sève secteur = " + Object.keys(RULES.firstReward).reduce(function (s, r) { return s + RULES.firstReward[r] * 3; }, 0) + " pour la Forêt entière, une seule fois par partie ; Sève run = nœuds + finale, comme toute Petite Aventure.");
console.log("Référence seve-bench : offre totale ~32 Sève/jour à 1 h de jeu, dont ~11 par la Petite Aventure au cap.");
