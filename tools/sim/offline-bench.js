"use strict";
/* tools/sim/offline-bench.js — v3.238.0 : que devient le temps écoulé quand le joueur
   n'est pas devant l'écran ?

   Question posée par Seb : « je reviens dans le jeu après quelques minutes et les
   ressources n'ont pas bougé », et le même symptôme en changeant de héros.

   Le jeu a DEUX chemins pour créditer le temps écoulé :
     A. catchUpOffline()  — lit lastTick, calcule l'écoulé réel, crédite. Appelé
        UNIQUEMENT depuis main/boot.js, donc uniquement au chargement de la page.
     B. tick(dt)          — appelé à chaque frame par main/game-loop.js, avec un dt
        BORNÉ à 0,25 s (protection anti-saut). Écrase lastTick à chaque passage.

   Ce banc charge le vrai moteur dans une VM, pilote l'horloge, et compare ce que
   chaque chemin crédite pour une même absence. Il ne modifie aucun fichier du jeu.

   Usage : node tools/sim/offline-bench.js <racine projet> [--minutes 10]
*/

var fs = require("fs"), path = require("path"), vm = require("vm");

var ROOT = require("../chemins.js").jeu(process.argv[2]);
function arg(nom, defaut) {
  var i = process.argv.indexOf(nom);
  return i > -1 ? Number(process.argv[i + 1]) : defaut;
}

/* ---------- Horloge pilotée ---------- */
var CLOCK = 1700000000000;
function FakeDate(a, b, c, d, e, f, g) {
  if (!(this instanceof FakeDate)) return new FakeDate().toString();
  if (arguments.length === 0) return new RealDate(CLOCK);
  return new (Function.prototype.bind.apply(RealDate, [null].concat([].slice.call(arguments))))();
}
var RealDate = Date;
FakeDate.now = function () { return CLOCK; };
FakeDate.prototype = RealDate.prototype;
function avancer(ms) { CLOCK += ms; }

/* ---------- Chargement du vrai moteur ---------- */
function el() {
  return { style: { setProperty: function(){}, removeProperty: function(){} }, classList: { add: function(){}, remove: function(){}, toggle: function(){}, contains: function(){ return false; } },
    innerHTML: "", textContent: "", scrollTop: 0, disabled: false, querySelector: function(){ return null; }, querySelectorAll: function(){ return []; },
    addEventListener: function(){}, setAttribute: function(){}, getAttribute: function(){ return null; }, appendChild: function(){}, remove: function(){}, hasChildNodes: function(){ return false; }, focus: function(){}, dataset: {}, offsetWidth: 0, parentNode: null };
}
var storage = {};
var sandbox = {
  console: { log: function(){}, error: function(){}, warn: function(){} },
  Date: FakeDate, Math: Math, JSON: JSON, Object: Object, Array: Array, Number: Number, String: String, Boolean: Boolean,
  setTimeout: function(){ return 0; }, clearTimeout: function(){}, setInterval: function(){ return 0; }, clearInterval: function(){},
  requestAnimationFrame: function(){}, performance: { now: function(){ return CLOCK; } },
  navigator: { serviceWorker: null, userAgent: "vm", vibrate: function(){} }, location: { href: "", search: "", hash: "", protocol: "https:" },
  localStorage: { getItem: function(k){ return storage.hasOwnProperty(k) ? storage[k] : null; }, setItem: function(k,v){ storage[k]=String(v); }, removeItem: function(k){ delete storage[k]; }, key: function(i){ return Object.keys(storage)[i] || null; }, get length(){ return Object.keys(storage).length; } },
  document: { getElementById: function(){ return el(); }, querySelector: function(){ return null; }, querySelectorAll: function(){ return []; }, createElement: function(){ return el(); }, addEventListener: function(){}, body: el(), documentElement: el(), hidden: false, activeElement: null },
  alert: function(){}, confirm: function(){ return true; }, atob: function(s){ return Buffer.from(s,"base64").toString("binary"); }, btoa: function(s){ return Buffer.from(s,"binary").toString("base64"); },
  structuredClone: function (v) { return JSON.parse(JSON.stringify(v)); }, TextEncoder: TextEncoder, TextDecoder: TextDecoder, URL: URL, Blob: function(){},
  addEventListener: function(){}, removeEventListener: function(){} // initSaveSystem() en pose sur window
};
sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);

var scripts = require("../harness/index-scripts.js")(ROOT, /pwa\.js|boot\.js/);
scripts.forEach(function (s) {
  var code = fs.readFileSync(path.join(ROOT, s), "utf8");
  try { vm.runInContext(code, sandbox, { filename: s }); }
  catch (e) { console.error("ECHEC DE CHARGEMENT " + s + " : " + e.message); process.exit(1); }
});
var g = sandbox;
function run(code) { return vm.runInContext(code, g); }

/* ---------- Ancres : le banc refuse de tourner si le jeu a changé de forme ---------- */
var LOOP_SRC = fs.readFileSync(path.join(ROOT, "js/main/game-loop.js"), "utf8");
var mClamp = LOOP_SRC.match(/if\s*\(dt\s*>\s*([0-9.]+)\)\s*dt\s*=\s*[0-9.]+;/);
if (!mClamp) { console.error("ANCRE PERDUE : le plafond de dt de game-loop.js est introuvable."); process.exit(1); }
var DT_MAX = Number(mClamp[1]);

var BOOT_SRC = fs.readFileSync(path.join(ROOT, "js/main/boot.js"), "utf8");
if (BOOT_SRC.indexOf("ProductionManager.catchUpOffline") === -1) {
  console.error("ANCRE PERDUE : boot.js n'appelle plus catchUpOffline()."); process.exit(1);
}
var SAVE_SRC = fs.readFileSync(path.join(ROOT, "js/systems/save-system.js"), "utf8");
var mSwitch = SAVE_SRC.match(/switchToSlot:[\s\S]*?\n  \},/);
if (!mSwitch) { console.error("ANCRE PERDUE : switchToSlot introuvable."); process.exit(1); }
var SWITCH_APPELLE_CATCHUP = /catchUpOffline/.test(mSwitch[0]);

var MINUTES = arg("--minutes", 10);
var ABSENCE_MS = MINUTES * 60 * 1000;

/* ---------- Mise en place : une partie avec de la production qui tourne ---------- */
function partiePrete() {
  run("initSaveSystem();"); // sans lui, game.saveSupported reste faux et saveGame() ne fait rien
  run("fullResetState(); game.playerName='Banc'; game.heroId='knight';");
  // Débloque les 6 bâtiments de Production et ouvre 3 zones sur chacun.
  run("game.explorationProgression = game.explorationProgression || {};");
  run("['quarryUnlocked','huntBuildingUnlocked','wellUnlocked','sawmillUnlocked','mineUnlocked','farmUnlocked'].forEach(function(f){ game.explorationProgression[f] = true; });");
  run("ProductionManager.ensure();");
  run("ProductionPlotsSystem.getManagedBuildingIds().forEach(function(id){ var p = ProductionPlotsSystem.getPlots(id); for (var i=0;i<3;i++){ p[i].state='open'; p[i].stock=0; p[i].lastTick=Date.now(); } });");
}

function stockTotal() {
  return run("ProductionPlotsSystem.getManagedBuildingIds().reduce(function(s,id){ return s + ProductionPlotsSystem.getTotalStock(id); }, 0);");
}
function debitParMin() {
  return run("ProductionPlotsSystem.getManagedBuildingIds().reduce(function(s,id){ return s + ProductionPlotsSystem.getTotalRatePerMin(id); }, 0);");
}

/* Rejoue une frame de game-loop.js telle qu'elle se présente au RETOUR d'une
   absence : le dt réel est énorme, la boucle le borne, puis tick() écrase lastTick. */
function frameDeRetour() {
  var dt = ABSENCE_MS / 1000;
  if (dt > DT_MAX) dt = DT_MAX;
  run("ProductionManager.tick(" + dt + ");");
  return dt;
}

/* ---------- Scénarios ---------- */
function scenarioFermeture() {
  partiePrete();
  var avant = stockTotal();
  avancer(ABSENCE_MS);
  run("ProductionManager.catchUpOffline();");
  return stockTotal() - avant;
}

function scenarioArrierePlan() {
  partiePrete();
  var avant = stockTotal();
  avancer(ABSENCE_MS);
  var dt = frameDeRetour();
  var apres = stockTotal();
  // Une fois lastTick écrasé, même un catchUpOffline plus tard ne récupère rien :
  // on le prouve en l'appelant juste derrière.
  run("ProductionManager.catchUpOffline();");
  var apresRattrapageTardif = stockTotal();
  return { gain: apres - avant, dtCredite: dt, recuperable: apresRattrapageTardif - apres };
}

function scenarioChangementHeros() {
  partiePrete();
  run("saveGame();");
  var avant = stockTotal();
  avancer(ABSENCE_MS);
  // switchToSlot() vers un autre emplacement puis retour : on mesure le retour,
  // c'est-à-dire le chargement d'un héros laissé de côté pendant l'absence.
  var aDeuxSlots = run("(function(){ try { return HeroSlotManager.createHeroInSlot(2); } catch(e) { return 'ERR:'+e.message; } })();");
  var revenu = run("(function(){ try { return HeroSlotManager.switchToSlot(1); } catch(e) { return 'ERR:'+e.message; } })();");
  var brut = stockTotal();
  // Ce que font les deux appelants depuis v3.239.0, juste après switchToSlot.
  if (g.ResumeManager) run("ResumeManager.catchUpAfterSlotLoad();");
  return { avant: avant, apres: brut, apresAppelant: stockTotal(), aDeuxSlots: aDeuxSlots, revenu: revenu };
}

/* ---------- Rapport ---------- */
console.log("=== Banc hors-ligne — absence de " + MINUTES + " min ===\n");
console.log("Ancres lues dans le code :");
console.log("  plafond de dt (game-loop.js)        : " + DT_MAX + " s");
console.log("  catchUpOffline appelé par boot.js   : oui");
console.log("  catchUpOffline dans switchToSlot    : " + (SWITCH_APPELLE_CATCHUP ? "oui" : "NON"));

partiePrete();
console.log("\nPartie de test : 6 bâtiments, 3 zones ouvertes chacun, "
  + debitParMin().toFixed(2) + " unités/min au total.\n");

var attendu = scenarioFermeture();
console.log("A. Application FERMÉE puis rouverte (passe par boot.js)");
console.log("   crédité : " + attendu.toFixed(0) + " unités   <- référence, comportement correct");

var bg = scenarioArrierePlan();
console.log("\nB. Application RESTÉE OUVERTE en arrière-plan puis reprise");
console.log("   dt crédité : " + bg.dtCredite + " s sur " + (ABSENCE_MS / 1000) + " s réelles");
console.log("   crédité : " + bg.gain.toFixed(0) + " unités   (" + (attendu > 0 ? (100 * bg.gain / attendu).toFixed(1) : "0") + " % de la référence)");
console.log("   perdu   : " + (attendu - bg.gain).toFixed(0) + " unités");
console.log("   récupérable par un catchUpOffline APRÈS coup : " + bg.recuperable.toFixed(0) + " unités"
  + (bg.recuperable < 1 ? "   <- la perte est DÉFINITIVE (lastTick déjà écrasé)" : ""));

/* Reprise telle que la boucle la traite DEPUIS v3.239.0 : garde d'écart avant le
   plafond. Le banc rejoue la garde, il ne la suppose pas — si elle disparaît de
   game-loop.js, l'ancre plus bas le dit. */
function scenarioArrierePlanCorrige() {
  if (!g.ResumeManager) return null;
  partiePrete();
  var avant = stockTotal();
  avancer(ABSENCE_MS);
  var dt = ABSENCE_MS / 1000;
  if (dt > g.ResumeManager.GAP_S) { run("ResumeManager.catchUpAfterGap(" + dt + ");"); dt = 0; }
  if (dt > DT_MAX) dt = DT_MAX;
  if (dt > 0) run("ProductionManager.tick(" + dt + ");");
  return stockTotal() - avant;
}

var corrige = scenarioArrierePlanCorrige();
if (corrige !== null) {
  var gardePresente = /ResumeManager\.catchUpAfterGap/.test(LOOP_SRC);
  console.log("\nB'. Même absence, avec la garde d'écart de v3.239.0");
  console.log("   garde présente dans game-loop.js : " + (gardePresente ? "oui" : "NON — le banc a rejoué une garde absente du jeu !"));
  console.log("   crédité : " + corrige.toFixed(0) + " unités   ("
    + (attendu > 0 ? (100 * corrige / attendu).toFixed(1) : "0") + " % de la référence)");
}

var sw = scenarioChangementHeros();
console.log("\nC. Retour sur un héros laissé de côté pendant l'absence");
if (String(sw.revenu).indexOf("ERR:") === 0 || String(sw.aDeuxSlots).indexOf("ERR:") === 0) {
  console.log("   non mesurable dans la VM : " + (String(sw.aDeuxSlots).indexOf("ERR:") === 0 ? sw.aDeuxSlots : sw.revenu));
} else {
  console.log("   switchToSlot() seul         : " + (sw.apres - sw.avant).toFixed(0)
    + " unités sur " + attendu.toFixed(0) + " attendues (le rattrapage n'est pas de son ressort)");
  console.log("   + rattrapage de l'appelant  : " + (sw.apresAppelant - sw.avant).toFixed(0)
    + " unités   <- ce que font title-screen-view.js et modal-view.js depuis v3.239.0");
}

/* ---------- Les ateliers subissent-ils la même chose ? ---------- */
function scenarioAtelier(mode) {
  partiePrete();
  // Matière première à volonté, puis un lot lancé dans le premier atelier actif.
  run("Object.keys(WAREHOUSE_RESOURCES).forEach(function(k){ game.resources[k] = 9999; });");
  var wid = run("Object.keys(WORKSHOPS_CONFIG).filter(function(id){ return WORKSHOPS_CONFIG[id].active; })[0];");
  var rid = run("(WORKSHOPS_CONFIG['" + wid + "'].recipes[0] || {}).id;");
  run("WorkshopsSystem.enqueueCraft('" + wid + "', '" + rid + "', 1);");
  var resteAvant = run("(WorkshopsSystem.getQueue('" + wid + "')[0] || {}).msRemaining || 0;");
  avancer(ABSENCE_MS);
  if (mode === "arriere-plan") { run("WorkshopsSystem.tickWorkshop('" + wid + "', " + DT_MAX + ");"); }
  else if (mode === "corrige") { run("ResumeManager.catchUpAfterGap(" + (ABSENCE_MS / 1000) + ");"); }
  else { run("WorkshopsSystem.catchUpOffline('" + wid + "');"); }
  var e = run("WorkshopsSystem.getQueue('" + wid + "')[0];");
  var resteApres = e ? (e.msRemaining || 0) : 0;
  return { atelier: wid, recette: rid, avanceMs: e ? (resteAvant - resteApres) : resteAvant, termine: !e };
}

console.log("\n=== Ateliers de craft : même question ===");
var atFerme = scenarioAtelier("ferme");
var atBg = scenarioAtelier("arriere-plan");
var atFix = scenarioAtelier("corrige");
console.log("  atelier testé : " + atFerme.atelier + " / recette " + atFerme.recette);
console.log("  A. fermée puis rouverte  : lot avancé de " + (atFerme.avanceMs / 1000).toFixed(0) + " s"
  + (atFerme.termine ? " (terminé)" : ""));
console.log("  B. arrière-plan puis retour : lot avancé de " + (atBg.avanceMs / 1000).toFixed(2) + " s"
  + (atBg.termine ? " (terminé)" : ""));
console.log("  B'. même reprise, avec la garde : lot avancé de " + (atFix.avanceMs / 1000).toFixed(0) + " s"
  + (atFix.termine ? " (terminé)" : ""));

/* ---------- Inventaire : qui compte le temps en dt, qui lit l'horloge ---------- */
console.log("\n=== Inventaire : qui compte le temps comment ===");
var CIBLES = [
  ["js/systems/production-system.js", "production des 6 bâtiments"],
  ["js/systems/workshops-system.js", "files de craft des ateliers"]
];
CIBLES.forEach(function (c) {
  var src = fs.readFileSync(path.join(ROOT, c[0]), "utf8");
  console.log("  " + c[1] + " : dt + catchUpOffline " + (/catchUpOffline/.test(src) ? "(appelé au boot seulement)" : "ABSENT"));
});
console.log("  file de craft de l'Entrepôt : méthode retirée en v3.98, l'appel de game-loop.js"
  + " est sauté par son garde typeof — sans objet.");
var horloge = [
  ["VillageBuildingManager.tick", "js/systems/village-building-system.js"],
  ["CampManager.applyRegen", "js/systems/camp-system.js"],
  ["PotionManager.tick", "js/systems/potion-system.js"]
];
console.log("\n  Pour comparaison, les systèmes qui lisent l'horloge murale (donc immunisés) :");
horloge.forEach(function (h) {
  var src = fs.readFileSync(path.join(ROOT, h[1]), "utf8");
  console.log("    " + h[0] + " : " + (/Date\.now\(\)/.test(src) ? "lit Date.now()" : "ne lit pas l'horloge"));
});
