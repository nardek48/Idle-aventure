"use strict";
/* sim/seve-bench.js — v3.234.0 : offre et demande de Sève d'Aeswyn (et de Résine
   durcie, son dérivé), la ressource rare de la Forêt.

   Question posée par Seb : « les ressources rares de Forêt sont très longues à
   avoir ». Ce banc ne juge pas au doigt mouillé — il lit les VRAIES tables du jeu
   (scene-templates.js pour le drop, village-buildings.js / forge-system.js /
   enchant-system.js / workshops.js pour les dépenses) et chiffre le nombre de
   jours de jeu nécessaires pour couvrir chaque poste.

   OFFRE : Petite Aventure Forêt seulement. Deux points de tirage —
     - chance par nœud résolu (perNodeChancePct, par profil)
     - bonus garanti à la chambre finale (finaleGuaranteedAmount, par profil)
   La Sève est créditée directement (jamais remise en jeu à la mort ou à la fuite),
   donc un run raté conserve la Sève des nœuds déjà franchis mais perd la finale.

   Plafond dur : PETITE_AVENTURE_DAILY_CAP runs par jour civil.

   Usage : node sim/seve-bench.js <racine projet> [--runs 20000] [--echec 0.35]
*/

var fs = require("fs"), path = require("path"), vm = require("vm");

var ROOT = process.argv[2] || ".";
function arg(nom, defaut) {
  var i = process.argv.indexOf(nom);
  return i > -1 ? Number(process.argv[i + 1]) : defaut;
}
var TIRAGES = arg("--runs", 20000);

/* Leviers de simulation. Sans option, le banc mesure le jeu TEL QU'IL EST ;
   avec, il chiffre un correctif envisagé sans toucher au code du jeu.
     --chance N   chance par nœud du profil bourrin (prudent = moitié)
     --finale N   bonus de finale du profil bourrin (prudent = moitié)
     --finale-par-intensite   bonus de finale proportionnel à la longueur
     --cap N      runs par jour
     --ratio N    Sève nécessaires pour 1 Résine durcie */
var O_CHANCE = arg("--chance", 0);
var O_FINALE = arg("--finale", 0);
var O_CAP = arg("--cap", 0);
var O_RATIO = arg("--ratio", 0);
var O_FINALE_PAR_INTENSITE = process.argv.indexOf("--finale-par-intensite") > -1;

/* Kills normaux par heure de farm en Forêt (le nom de la variable date de
   l'essence, retirée en v3.358.0 : 1 essence valait 1 kill). Ancre : le commentaire
   de hq_forest_battue (data/hunt-quests.js) chiffre 20 kills en Lisière à ~3 min,
   soit ~400 kills/h. Paramétrable : --essence-heure N */
var ESSENCE_PAR_HEURE = arg("--essence-heure", 400);
var HEURES_PAR_JOUR = arg("--heures", 1);

/* Chasse à la Sève. Le taux et l'aventure sont LUS dans hunt-quests.js ; --chasse
   et --rendement-kills ne servent plus qu'à simuler un autre réglage. */
var O_CHASSE = arg("--chasse", 0);
var RENDEMENT_KILLS = arg("--rendement-kills", 0);

/* PV moyens d'un ennemi normal, mesurés sur le vrai générateur : 101 en Lisière,
   132 au Cœur. Une chasse rattachée au Cœur fait donc 77 % des kills/heure. */
var PV_PAR_AVENTURE = [101, 132];
var ECHEC_PAR_DEFAUT = { sentier: 0.02, chemin: 0.12, periple: 0.35 };

/* ---------- Chargement des vraies tables ---------- */
var sandbox = { window: {}, console: { log: function () {}, error: function () {}, warn: function () {} }, Math: Math, Date: Date, JSON: JSON, Object: Object, Array: Array, Number: Number, String: String, Boolean: Boolean, game: {} };
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);

var FICHIERS = [
  "js/data/hunt-quests.js",       // WAREHOUSE_RESOURCES
  "js/data/scene-templates.js",   // SCENE_TEMPLATES, SCENE_INTENSITY
  "js/data/workshops.js",         // recette Menuiserie
  "js/data/village-buildings.js", // paliers de construction
  "js/data/equipment.js",         // EQUIPMENT_SLOTS / EQUIPMENT_SLOT_CONFIG (Forge)
  "js/data/dungeon.js",           // DUNGEON_TIERS / DUNGEON_CONFIG (2e source de Sève)
  "js/data/adventure-quests.js"   // quêtes élites (3e source, à usage unique)
];
FICHIERS.forEach(function (f) {
  var p = path.join(ROOT, f);
  if (!fs.existsSync(p)) { console.error("ANCRE MANQUANTE : " + f); process.exit(1); }
  try { vm.runInContext(fs.readFileSync(p, "utf8"), sandbox, { filename: f }); }
  catch (e) { console.error("ECHEC DE CHARGEMENT " + f + " : " + e.message); process.exit(1); }
});

var TPL = sandbox.SCENE_TEMPLATES && sandbox.SCENE_TEMPLATES.petite_aventure_foret;
var CFG = TPL && TPL.seveAeswyn;
if (!CFG || !CFG.perNodeChancePct) {
  console.error("ANCRE PERDUE : petite_aventure_foret.seveAeswyn introuvable — le banc refuse de tourner.");
  process.exit(1);
}
var INTENSITES = sandbox.SCENE_INTENSITY;
if (!INTENSITES || !INTENSITES.chemin) {
  console.error("ANCRE PERDUE : SCENE_INTENSITY introuvable.");
  process.exit(1);
}

/* Le cap journalier vit dans scene-run-system.js, qu'on ne peut pas charger seul
   (il dépend de tout le jeu). On le relit par expression régulière plutôt que de
   le recopier en dur : si la constante bouge, le banc suit. */
var CAP_SRC = fs.readFileSync(path.join(ROOT, "js/systems/scene-run-system.js"), "utf8");
var mCap = CAP_SRC.match(/PETITE_AVENTURE_DAILY_CAP\s*:\s*(\d+)/);
if (!mCap) { console.error("ANCRE PERDUE : PETITE_AVENTURE_DAILY_CAP introuvable."); process.exit(1); }
var CAP_JOUR = O_CAP || Number(mCap[1]);

/* Coût en Sève de l'Enchanteresse, relu de la même façon. */
var ENCH_SRC = fs.readFileSync(path.join(ROOT, "js/systems/enchant-system.js"), "utf8");
var mEnch = ENCH_SRC.match(/ENCHANT_BASE_SEVE\s*=\s*\{([^}]+)\}/);
var ENCH_BASE = {};
if (mEnch) {
  mEnch[1].split(",").forEach(function (p) {
    var kv = p.split(":");
    if (kv.length === 2) ENCH_BASE[kv[0].trim()] = Number(kv[1]);
  });
}
var mStep = ENCH_SRC.match(/ENCHANT_SEVE_STEP\s*=\s*(\d+)/);
var ENCH_STEP = mStep ? Number(mStep[1]) : 3;

/* Recette de Résine durcie. */
var recette = null;
Object.keys(sandbox.WORKSHOPS_CONFIG || {}).forEach(function (k) {
  (sandbox.WORKSHOPS_CONFIG[k].recipes || []).forEach(function (r) {
    if (r.id === "resine_durcie") recette = r;
  });
});
if (!recette) { console.error("ANCRE PERDUE : recette resine_durcie introuvable."); process.exit(1); }
var SEVE_PAR_RESINE = O_RATIO || ((recette.inputs.find(function (i) { return i.resourceId === "seve_aeswyn"; }) || {}).quantity || 2);

/* ---------- OFFRE : Monte-Carlo sur le vrai modèle de drop ---------- */
function chanceDe(profil) {
  if (!O_CHANCE) return Number(CFG.perNodeChancePct[profil] || 0);
  return profil === "bourrin" ? O_CHANCE : O_CHANCE / 2;
}
function finaleDe(profil, intensite) {
  /* v3.235.0 : la table du jeu est désormais par intensité. On lit les deux formes,
     comme scene-run-system._seveFinaleAmount. */
  var base;
  if (O_FINALE) {
    base = profil === "bourrin" ? O_FINALE : O_FINALE / 2;
  } else {
    var parProfil = CFG.finaleGuaranteedAmount && CFG.finaleGuaranteedAmount[profil];
    if (parProfil == null) base = 0;
    else if (typeof parProfil === "number") base = Number(parProfil);
    else base = Number(parProfil[intensite] != null ? parProfil[intensite] : parProfil[Object.keys(parProfil)[0]]) || 0;
  }
  if (!O_FINALE_PAR_INTENSITE) return base;
  var ref = INTENSITES.sentier.depthMax;
  return Math.round(base * (INTENSITES[intensite].depthMax / ref));
}

function simuleRun(profil, intensite, tauxEchec) {
  var depthMax = INTENSITES[intensite].depthMax;
  var chance = chanceDe(profil);
  var min = (CFG.perNodeAmount && CFG.perNodeAmount[0]) || 1;
  var max = (CFG.perNodeAmount && CFG.perNodeAmount[1]) || 1;

  /* Le run échoue à un nœud tiré au hasard : les nœuds déjà franchis ont
     déjà crédité leur Sève, la finale est perdue. */
  var echoue = Math.random() < tauxEchec;
  var noeuds = echoue ? Math.floor(Math.random() * depthMax) : depthMax;

  var total = 0;
  for (var i = 0; i < noeuds; i++) {
    if (Math.random() * 100 < chance) total += min + Math.floor(Math.random() * (max - min + 1));
  }
  if (!echoue) total += finaleDe(profil, intensite);
  return total;
}

function mesureOffre(profil, intensite) {
  var tauxEchec = ECHEC_PAR_DEFAUT[intensite];
  var somme = 0, zeros = 0;
  for (var i = 0; i < TIRAGES; i++) {
    var v = simuleRun(profil, intensite, tauxEchec);
    somme += v;
    if (v === 0) zeros++;
  }
  return { parRun: somme / TIRAGES, partRunsVides: zeros / TIRAGES, echec: tauxEchec };
}

/* ---------- DEMANDE : somme des vrais coûts ---------- */
function coutPalier(bat, niveau) {
  var tiers = bat.costTiers || [];
  for (var i = 0; i < tiers.length; i++) {
    var t = tiers[i];
    if (niveau >= t.minLevel && niveau <= t.maxLevel) {
      var mult = Math.pow(t.costMult || 1, niveau - t.minLevel);
      var out = {};
      Object.keys(t.baseCost || {}).forEach(function (k) { out[k] = Math.floor(t.baseCost[k] * mult); });
      return out;
    }
  }
  return {};
}

var demandeVillage = { seve: 0, resine: 0, detail: [] };
Object.keys(sandbox.VILLAGE_BUILDINGS || {}).forEach(function (id) {
  var bat = sandbox.VILLAGE_BUILDINGS[id];
  var seveB = 0, resineB = 0;
  for (var n = 0; n < (bat.maxLevel || 0); n++) {
    var c = coutPalier(bat, n);
    seveB += Number(c.seve_aeswyn || 0);
    resineB += Number(c.resine_durcie || 0);
  }
  if (seveB || resineB) {
    demandeVillage.seve += seveB;
    demandeVillage.resine += resineB;
    demandeVillage.detail.push({ nom: bat.name || id, seve: seveB, resine: resineB });
  }
});

/* Forge : résine à partir du niveau 6, jusqu'au plafond RÉEL.
   Le plafond n'est PAS 30 : getMaxLevel() = niveau du bâtiment × 5, et le
   bâtiment Forge a maxLevel 2 dans village-buildings.js — soit 10 niveaux
   d'objet, pas 30. On lit les deux valeurs plutôt que de les supposer. */
var FORGE_SRC = fs.readFileSync(path.join(ROOT, "js/systems/forge-system.js"), "utf8");
var mForge = FORGE_SRC.match(/cost\.resine_durcie\s*=\s*Math\.max\(1,\s*Math\.floor\(\(target - (\d+)\) \/ (\d+)\) \+ (\d+)\)/);
var mParNiveau = FORGE_SRC.match(/FORGE_LEVELS_PER_BUILDING_LEVEL\s*=\s*(\d+)/);
if (!mForge || !mParNiveau) { console.error("ANCRE PERDUE : coût de reforge introuvable."); process.exit(1); }
var batForge = (sandbox.VILLAGE_BUILDINGS || {}).forge;
if (!batForge) { console.error("ANCRE PERDUE : bâtiment forge introuvable."); process.exit(1); }
var NIVEAUX_FORGE = Number(batForge.maxLevel || 0) * Number(mParNiveau[1]);
var slots = (sandbox.EQUIPMENT_SLOTS || []).length || 7;
var seuil = Number(mForge[1]), div = Number(mForge[2]), plus = Number(mForge[3]);
var forgeParSlot = 0;
for (var lvl = 0; lvl < NIVEAUX_FORGE; lvl++) {
  var target = lvl + 1;
  if (target > seuil) forgeParSlot += Math.max(1, Math.floor((target - seuil) / div) + plus);
}
var demandeForge = forgeParSlot * slots;

/* Enchanteresse : coût d'une série de relances sur une pièce. */
function coutEnchant(rarete, relances) {
  var base = ENCH_BASE[rarete] || 1, total = 0;
  for (var n = 0; n < relances; n++) total += base + Math.floor(n / ENCH_STEP);
  return total;
}

/* ---------- Rapport ---------- */
function j(n) { return (Math.round(n * 100) / 100).toFixed(2); }

console.log("=== Sève d'Aeswyn — offre et demande ===");
console.log("Tirages Monte-Carlo : " + TIRAGES + " par combinaison");
console.log("Cap journalier lu dans le code : " + CAP_JOUR + " Petites Aventures par jour");
console.log("Recette : " + SEVE_PAR_RESINE + " Sève -> 1 Résine durcie");
if (O_CHANCE || O_FINALE || O_CAP || O_RATIO || O_FINALE_PAR_INTENSITE) {
  console.log("\n*** SIMULATION D'UN CORRECTIF — ce n'est PAS l'état actuel du jeu ***");
  if (O_CHANCE) console.log("    chance par nœud forcée à " + O_CHANCE + " % (bourrin)");
  if (O_FINALE) console.log("    bonus de finale forcé à " + O_FINALE + " (bourrin)");
  if (O_FINALE_PAR_INTENSITE) console.log("    bonus de finale proportionnel à la longueur du parcours");
  if (O_CAP) console.log("    cap journalier forcé à " + O_CAP);
  if (O_RATIO) console.log("    recette forcée à " + O_RATIO + " Sève -> 1 Résine");
}
console.log("");

console.log("--- OFFRE : Sève par run, par profil et intensité ---");
console.log("profil    intensité   nœuds  échec   Sève/run   runs vides   Sève/jour (cap " + CAP_JOUR + ")");
var meilleur = { parJour: 0 };
["bourrin", "prudent"].forEach(function (profil) {
  ["sentier", "chemin", "periple"].forEach(function (intensite) {
    var r = mesureOffre(profil, intensite);
    var parJour = r.parRun * CAP_JOUR;
    if (parJour > meilleur.parJour) meilleur = { parJour: parJour, profil: profil, intensite: intensite, parRun: r.parRun };
    console.log(
      profil.padEnd(10) + intensite.padEnd(12) +
      String(INTENSITES[intensite].depthMax).padEnd(7) +
      (Math.round(r.echec * 100) + "%").padEnd(8) +
      j(r.parRun).padStart(8) + "   " +
      (Math.round(r.partRunsVides * 100) + "%").padStart(10) + "   " +
      j(parJour).padStart(9)
    );
  });
});
console.log("\nMeilleur rendement : " + meilleur.profil + " / " + meilleur.intensite +
  " -> " + j(meilleur.parJour) + " Sève par jour de jeu.");


/* ---------- OFFRE 2 : le Donjon I ----------
   Contrairement à la Petite Aventure, le Donjon n'est PAS capé au calendrier :
   1 ticket gratuit par jour, plus jusqu'à maxTicketPurchasesPerDay tickets
   achetés à l'essence, à coût croissant. La Sève n'est créditée qu'à la RÉUSSITE
   complète (15 vagues + boss) — une fuite ou une mort ne donne rien. */
var TIER1 = (sandbox.DUNGEON_TIERS || []).find(function (t) { return t.specialResourceId === "seve_aeswyn"; });
var DCFG = sandbox.DUNGEON_CONFIG;
if (!TIER1 || !DCFG) { console.error("ANCRE PERDUE : palier de donjon donnant de la Sève introuvable."); process.exit(1); }

var SEVE_PAR_DONJON = Number(TIER1.specialResourceAmount || 0);
var worldBonus = 1 + Math.max(0, TIER1.worldPower || 0) * 0.5 + Math.sqrt(Math.max(1, TIER1.difficultyMult || 1)) * 0.4;
/* v3.358.0 (D7) : plus d'essence ni de tickets. Le Donjon I se fait au plus
   DUNGEON_CONFIG.runsPerDay fois par jour (+ la Clé de faille, au niveau max ici),
   quel que soit le temps de farm. */
var CLE = (sandbox.DUNGEON_SHOP || []).find(function (x) { return x.effect === "runsBonus"; });
var SORTIES_JOUR = Number(DCFG.runsPerDay || 0) + (CLE ? Number(CLE.perLevel || 0) * Number(CLE.maxLevel || 0) : 0);
/* Ancienne interface du banc : 1 + k = donjons par jour, insensible au farm. */
function ticketsAchetables() { return Math.max(0, SORTIES_JOUR - 1); }

console.log("--- OFFRE 2 : Donjon I ---");
console.log("   Sève par réussite ............ " + SEVE_PAR_DONJON);
console.log("   Sorties par jour ............. " + DCFG.runsPerDay + (CLE ? " (+" + (CLE.perLevel * CLE.maxLevel) + " avec la Clé de faille au max)" : ""));
console.log("   -> au plus " + SORTIES_JOUR + " donjons/jour, " + j(SORTIES_JOUR * SEVE_PAR_DONJON) + " Sève/jour, quel que soit le temps de farm.\n");

/* ---------- OFFRE 3 : quêtes élites (usage unique) ---------- */
var seveElites = 0, nbElites = 0;
Object.keys(sandbox.ADVENTURE_QUESTS || {}).forEach(function (k) {
  var q = sandbox.ADVENTURE_QUESTS[k];
  var v = Number((q.reward || {}).seve || 0);
  if (v > 0) { seveElites += v; nbElites++; }
});
console.log("--- OFFRE 3 : quêtes élites ---");
console.log("   " + nbElites + " quêtes x Sève -> " + seveElites + " Sève, UNE SEULE FOIS (non répétables).\n");


/* ---------- OFFRE 4 : chasse à la Sève (envisagée) ----------
   Le moteur de chasse (hunt-quest-system.js, PROTÉGÉ) ne lit que sept champs :
   worldId, adventureIndex, enemyFilter, resourceKey, dropChancePct, lotSize,
   rewardGold. Aucun multiplicateur de difficulté. Les seuls leviers sont donc
   le taux de drop, le pool d'ennemis et l'aventure de rattachement.

   POINT CLÉ : les kills d'une chasse passent par le moteur de combat normal et
   rapportent donc AUSSI leur essence (1 par ennemi). Chasser, c'est farmer
   l'essence des tickets de Donjon en même temps. La chasse est strictement
   additive : elle ne coûte aucune heure aux autres sources. */
/* Chasse à la Sève réellement présente dans la donnée. */
var chasseSeve = null;
Object.keys(sandbox.HUNT_QUESTS || {}).forEach(function (k) {
  var q = sandbox.HUNT_QUESTS[k];
  if (q.resourceKey === "seve_aeswyn" && q.dropChancePct > 0) chasseSeve = q;
});
var tauxChasse = O_CHASSE || (chasseSeve ? Number(chasseSeve.dropChancePct) : 0);
var rendement = RENDEMENT_KILLS
  || (chasseSeve ? PV_PAR_AVENTURE[0] / (PV_PAR_AVENTURE[Number(chasseSeve.adventureIndex || 0)] || PV_PAR_AVENTURE[0]) : 1);
var KILLS_PAR_HEURE = ESSENCE_PAR_HEURE * rendement;
var seveChasseHeure = KILLS_PAR_HEURE * (tauxChasse / 100);
O_CHASSE = tauxChasse; // le reste du banc lit cette variable
if (tauxChasse) {
  console.log("--- OFFRE 4 : chasse à la Sève ---");
  console.log("   Quête ........................ " + (chasseSeve ? ("« " + chasseSeve.name + " », lot de " + chasseSeve.lotSize) : "(simulée)"));
  console.log("   Taux de drop ................. " + tauxChasse + " % par kill");
  console.log("   Kills par heure .............. " + Math.round(KILLS_PAR_HEURE)
    + (rendement !== 1 ? "  (rendement " + (Math.round(rendement * 100) / 100) + " : ennemis plus coriaces)" : ""));
  console.log("   Sève par heure de chasse ..... " + j(seveChasseHeure));
  console.log("   La taille du lot n'entre PAS dans ce calcul : le drop est par kill.");
  console.log("   Elle ne change que la MISE — un lot perdu à la mort emporte sa Sève.\n");
}

console.log("\n--- DEMANDE ---");
console.log("Village, tous bâtiments jusqu'au niveau max :");
demandeVillage.detail.forEach(function (d) {
  console.log("   " + d.nom.padEnd(26) + " Sève " + String(d.seve).padStart(4) + "   Résine " + String(d.resine).padStart(4)
    + "   (soit " + String(d.seve + d.resine * SEVE_PAR_RESINE).padStart(4) + " Sève)");
});
var villageEnSeve = demandeVillage.seve + demandeVillage.resine * SEVE_PAR_RESINE;
console.log("   " + "TOTAL VILLAGE".padEnd(26) + " Sève " + String(demandeVillage.seve).padStart(4)
  + "   Résine " + String(demandeVillage.resine).padStart(4) + "   (soit " + villageEnSeve + " Sève)");

var forgeEnSeve = demandeForge * SEVE_PAR_RESINE;
console.log("\nForge (plafond réel : bâtiment niv. " + batForge.maxLevel + " x " + mParNiveau[1]
  + " = " + NIVEAUX_FORGE + " niveaux d'objet) :");
console.log("   UN emplacement au max ....... Résine " + String(forgeParSlot).padStart(4)
  + "   (soit " + String(forgeParSlot * SEVE_PAR_RESINE).padStart(4) + " Sève)");
console.log("   Les " + slots + " emplacements ........... Résine " + String(demandeForge).padStart(4)
  + "   (soit " + String(forgeEnSeve).padStart(4) + " Sève)");

console.log("\nEnchanteresse, coût d'une série de relances sur UNE pièce :");
[["rare", 5], ["epic", 5], ["legendary", 5], ["legendary", 10], ["legendary", 20]].forEach(function (c) {
  console.log("   " + c[0].padEnd(11) + String(c[1]).padStart(2) + " relances -> " + String(coutEnchant(c[0], c[1])).padStart(4) + " Sève");
});

console.log("\nGrande ration : 3 Sève l'unité (via la Cuisine de camp).");

var kJour = ticketsAchetables(ESSENCE_PAR_HEURE * HEURES_PAR_JOUR);
var seveDonjonJour = (1 + kJour) * SEVE_PAR_DONJON;
var seveChasseJour = seveChasseHeure * HEURES_PAR_JOUR;
var seveTotaleJour = meilleur.parJour + seveDonjonJour + seveChasseJour;
console.log("\n--- TEMPS DE JEU NÉCESSAIRE ---");
console.log("   Petite Aventure (" + meilleur.profil + "/" + meilleur.intensite + ") .... " + j(meilleur.parJour) + " Sève/jour  (capée, insensible au temps)");
console.log("   Donjon I (" + HEURES_PAR_JOUR + " h de farm/jour) ...... " + j(seveDonjonJour) + " Sève/jour  (plafonnée par les sorties du jour)");
if (O_CHASSE) console.log("   Chasse (" + HEURES_PAR_JOUR + " h) .................. " + j(seveChasseJour) + " Sève/jour  (PROPORTIONNELLE au temps)");
console.log("   TOTAL ................................ " + j(seveTotaleJour) + " Sève/jour\n");

/* Sensibilité à l'effort : c'est LE chiffre qui dit si la chasse règle le
   problème mesuré (« dix fois plus de temps ne divise le délai que par 1,7 »). */
console.log("   Sensibilité à l'effort — Village + Forge (" + (villageEnSeve + forgeEnSeve) + " Sève) :");
[0.5, 1, 2, 3, 5].forEach(function (h) {
  var k = ticketsAchetables(ESSENCE_PAR_HEURE * h);
  var total = meilleur.parJour + (1 + k) * SEVE_PAR_DONJON + seveChasseHeure * h;
  console.log("      " + String(h).padStart(4) + " h/jour -> " + j(total).padStart(6) + " Sève/jour -> "
    + String(Math.ceil((villageEnSeve + forgeEnSeve) / total)).padStart(3) + " jours");
});
console.log("");
function jours(seve) { return Math.ceil(seve / seveTotaleJour); }
console.log("   Village complet ................. " + String(villageEnSeve).padStart(5) + " Sève -> " + String(jours(villageEnSeve)).padStart(4) + " jours");
console.log("   Forge, 1 emplacement au max ..... " + String(forgeParSlot * SEVE_PAR_RESINE).padStart(5) + " Sève -> " + String(jours(forgeParSlot * SEVE_PAR_RESINE)).padStart(4) + " jours");
console.log("   Forge, " + slots + " emplacements au max .... " + String(forgeEnSeve).padStart(5) + " Sève -> " + String(jours(forgeEnSeve)).padStart(4) + " jours");
console.log("   Une légendaire, 10 relances ..... " + String(coutEnchant("legendary", 10)).padStart(5) + " Sève -> " + String(jours(coutEnchant("legendary", 10))).padStart(4) + " jours");
console.log("   10 Grandes rations .............. " + String(30).padStart(5) + " Sève -> " + String(jours(30)).padStart(4) + " jours");
var totalSeve = villageEnSeve + forgeEnSeve;
console.log("   (les " + seveElites + " Sève des quêtes élites retirent " + (Math.ceil(totalSeve / seveTotaleJour) - Math.ceil((totalSeve - seveElites) / seveTotaleJour)) + " jour(s) au total)");
console.log("   " + "-".repeat(64));
console.log("   Village + Forge ................. " + String(totalSeve).padStart(5) + " Sève -> " + String(jours(totalSeve)).padStart(4) + " jours");
console.log("\n(Hors Enchanteresse et rations, qui sont des dépenses répétables sans fin.)");

/* Remarque de calibrage relevée par le banc : le Sentier (6 nœuds, 2 % d'échec)
   rapporte PLUS de Sève que le Périple (10 nœuds, 35 % d'échec), parce que le
   bonus de finale pèse plus lourd que les tirages par nœud et qu'un Périple raté
   le perd une fois sur trois. L'intensité la plus risquée est donc la moins
   rentable en Sève — l'inverse de l'intention affichée. */
console.log("\n--- REMARQUE DE CALIBRAGE ---");
var sentier = mesureOffre("bourrin", "sentier").parRun;
var periple = mesureOffre("bourrin", "periple").parRun;
console.log("   Sentier " + j(sentier) + " Sève/run  contre  Périple " + j(periple) + " Sève/run");
var ecart = Math.round((periple / sentier - 1) * 100);
if (ecart > 0) {
  console.log("   OK : le Périple rapporte " + ecart + " % de Sève de plus que le Sentier — le risque paie.");
} else {
  console.log("   ANOMALIE : le Sentier (court et sûr) rapporte " + (-ecart)
    + " % de Sève de plus que le Périple — le risque ne paie pas.");
}
console.log("   Bonus de finale (bourrin) : Sentier " + finaleDe("bourrin", "sentier")
  + " · Chemin " + finaleDe("bourrin", "chemin") + " · Périple " + finaleDe("bourrin", "periple")
  + "   |   tirages par nœud : " + chanceDe("bourrin") + " %");
