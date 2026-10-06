"use strict";
/* tools/sim/retour-demarrage-bench.js — v3.340.0 : écran de retour au DÉMARRAGE de la PWA.
   Un héros joué la veille, l'app tuée, relancée : écran titre -> « Charger ».
   Deux cas : le héros chargé est le dernier joué, ou un autre (switchToSlot).
   Attendu : UN écran de retour dès 5 min d'absence, dans les deux cas.
   Lancer : node tools/sim/retour-demarrage-bench.js <racine>   (scripts lus dans index.html) */
var fs = require("fs"), path = require("path"), vm = require("vm");
var ROOT = require("../chemins.js").jeu(process.argv[2]);
var scripts = require("../harness/index-scripts.js")(ROOT, /pwa\.js/);

function el() { return { style:{setProperty:function(){},removeProperty:function(){}}, classList:{add:function(){},remove:function(){},toggle:function(){},contains:function(){return false;}}, innerHTML:"", textContent:"", scrollTop:0, disabled:false, querySelector:function(){return null;}, querySelectorAll:function(){return [];}, addEventListener:function(){}, setAttribute:function(){}, getAttribute:function(){return null;}, appendChild:function(){}, removeChild:function(){}, remove:function(){}, hasChildNodes:function(){return false;}, focus:function(){}, dataset:{}, offsetWidth:0, parentNode:null }; }

/* Un contexte = un lancement de la PWA ; `storage` = le localStorage de l'iPhone, partagé. */
function launch(storage) {
  var sb = { console: { log: function(){}, warn: function(){}, error: console.error }, Date: Date, Math: Math, JSON: JSON, Object: Object, Array: Array, Number: Number, String: String, Boolean: Boolean,
    setTimeout: function(){return 0;}, clearTimeout: function(){}, setInterval: function(){return 0;}, clearInterval: function(){},
    requestAnimationFrame: function(){}, performance: { now: function(){return Date.now();} },
    navigator: { serviceWorker: null, userAgent: "vm", vibrate: function(){} }, location: { href:"", search:"", hash:"", protocol:"https:" },
    localStorage: { getItem:function(k){return storage.hasOwnProperty(k)?storage[k]:null;}, setItem:function(k,v){storage[k]=String(v);}, removeItem:function(k){delete storage[k];}, key:function(i){return Object.keys(storage)[i]||null;}, get length(){return Object.keys(storage).length;} },
    document: { getElementById:function(){return el();}, querySelector:function(){return null;}, querySelectorAll:function(){return [];}, createElement:function(){return el();}, addEventListener:function(){}, body: el(), documentElement: el(), hidden:false, activeElement:null, readyState: "complete" },
    alert: function(){}, confirm: function(){return true;}, atob: function(s){return Buffer.from(s,"base64").toString("binary");}, btoa: function(s){return Buffer.from(s,"binary").toString("base64");},
    structuredClone: function(v){return JSON.parse(JSON.stringify(v));}, TextEncoder: TextEncoder, TextDecoder: TextDecoder, URL: URL, Blob: function(){} };
  sb.window = sb; sb.self = sb; sb.globalThis = sb; sb.addEventListener = function(){}; sb.removeEventListener = function(){};
  vm.createContext(sb);
  scripts.forEach(function (s) { vm.runInContext(fs.readFileSync(path.join(ROOT, s), "utf8"), sb, { filename: s }); });
  return sb;
}

/* Recule toutes les dates « récentes » d'une sauvegarde : l'absence, sans attendre. */
function age(storage, key, ms) {
  var now = Date.now();
  (function shift(o) { if (!o || typeof o !== "object") return; Object.keys(o).forEach(function (k) {
    var v = o[k]; if (typeof v === "number" && v > now - 864e5 && v <= now + 1000) o[k] = v - ms; else shift(v); }); })(storage[key] = JSON.parse(storage[key]));
  storage[key] = JSON.stringify(storage[key]);
}

function scenario(otherSlotLast, absenceMin) {
  var storage = {};
  var a = launch(storage);
  a.ensureGameStateDefaults(); a.initSaveSystem();
  a.HeroSlotManager.createHeroInSlot(1); a.pendingHeroId = "knight"; a.pendingPlayerName = "Nardek"; a.confirmHeroSelection();
  // Un village qui produit, PV pleins : la production est la seule chose à dire au retour
  Object.keys(a.PRODUCTION_UNLOCK_FLAGS).forEach(function (id) { a.game.explorationProgression[a.PRODUCTION_UNLOCK_FLAGS[id]] = true; });
  Object.keys(a.PRODUCTION_BUILDINGS).forEach(function (id) { a.ProductionManager.unlockBuilding(id); });
  a.game.heroHp = a.game.heroMaxHp; a.game.activeTab = "campement"; a.saveGame();
  age(storage, "quest_idle_save_v6_slot1", absenceMin * 60e3);
  if (otherSlotLast) storage.quest_idle_active_slot = "2";           // le dernier héros joué était un autre
  var b = launch(storage), opened = 0;
  b.openReturnScreen = function () { opened++; };
  b.startGame(); b.titleScreenConfirmLoad(1);
  return opened;
}

var fails = 0;
[[false, 25], [false, 480], [true, 25], [true, 480]].forEach(function (c) {
  var n = scenario(c[0], c[1]);
  var ok = n === 1;
  if (!ok) fails++;
  console.log((ok ? "  ✔ " : "  ✘ ") + (c[0] ? "autre héros chargé" : "même héros") + ", absence " + c[1] + " min : " + n + " écran(s) de retour (attendu 1)");
});
/* v3.341.0 : « Continuer » reprend le dernier héros ; charger un AUTRE héros au démarrage ne
   réécrit pas celui qu'on quitte (sa date, donc son prochain retour, restent intacts). */
(function () {
  var storage = {};
  var a = launch(storage);
  a.ensureGameStateDefaults(); a.initSaveSystem();
  a.HeroSlotManager.createHeroInSlot(1); a.pendingHeroId = "knight"; a.pendingPlayerName = "Nardek"; a.confirmHeroSelection();
  a.HeroSlotManager.createHeroInSlot(2); a.pendingHeroId = "archer"; a.pendingPlayerName = "Luca"; a.confirmHeroSelection();
  age(storage, "quest_idle_save_v6_slot1", 8 * 3600e3); age(storage, "quest_idle_save_v6_slot2", 3600e3);
  var lucaAt = JSON.parse(storage.quest_idle_save_v6_slot2).savedAt;

  var b = launch(storage); b.startGame();
  var c1 = b.getTitleScreenContinueSlot() === 2;
  if (!c1) fails++;
  console.log((c1 ? "  ✔ " : "  ✘ ") + "« Continuer » propose le dernier héros joué (Luca, emplacement 2)");

  b.titleScreenShowLoad(); b.titleScreenConfirmLoad(1);   // Charger Nardek au démarrage
  var kept = JSON.parse(storage.quest_idle_save_v6_slot2).savedAt === lucaAt;
  if (!kept) fails++;
  console.log((kept ? "  ✔ " : "  ✘ ") + "charger Nardek au démarrage ne réécrit pas la sauvegarde de Luca");
  var loaded = b.game.playerName === "Nardek";
  if (!loaded) fails++;
  console.log((loaded ? "  ✔ " : "  ✘ ") + "Nardek est bien chargé");
})();

console.log(fails ? fails + " échec(s)" : "OK");
process.exit(fails ? 1 : 0);
