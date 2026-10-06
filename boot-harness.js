"use strict";
/* Harnais dédié au flux de TOUT PREMIER lancement (boot.js/init(), aucune save en localStorage).
   round-harness.js exclut volontairement boot.js/pwa.js (bruit hors-scope) ; ce script complémentaire
   couvre spécifiquement ce chemin, seul endroit où le bug v3.107.2 (0 ration au 1er lancement) existait. */
var fs = require("fs"), path = require("path"), vm = require("vm");
var ROOT = process.argv[2];
var scripts = require("./sim/index-scripts.js")(ROOT, /pwa\.js/); // garde boot.js

function el() { return { style:{setProperty:function(){},removeProperty:function(){}}, classList:{add:function(){},remove:function(){},toggle:function(){},contains:function(){return false;}}, innerHTML:"", textContent:"", scrollTop:0, disabled:false, querySelector:function(){return null;}, querySelectorAll:function(){return [];}, addEventListener:function(){}, setAttribute:function(){}, getAttribute:function(){return null;}, appendChild:function(){}, remove:function(){}, hasChildNodes:function(){return false;}, focus:function(){}, dataset:{}, offsetWidth:0, parentNode:null }; }
var storage = {};
var sandbox = { console: console, Date: Date, Math: Math, JSON: JSON, Object: Object, Array: Array, Number: Number, String: String, Boolean: Boolean,
  setTimeout: function(){return 0;}, clearTimeout: function(){}, setInterval: function(){return 0;}, clearInterval: function(){},
  requestAnimationFrame: function(){}, performance: { now: function(){return Date.now();} },
  navigator: { serviceWorker: null, userAgent: "vm", vibrate: function(){} }, location: { href:"", search:"", hash:"", protocol:"https:" },
  localStorage: { getItem:function(k){return storage.hasOwnProperty(k)?storage[k]:null;}, setItem:function(k,v){storage[k]=String(v);}, removeItem:function(k){delete storage[k];}, key:function(i){return Object.keys(storage)[i]||null;}, get length(){return Object.keys(storage).length;} },
  document: { getElementById:function(){return el();}, querySelector:function(){return null;}, querySelectorAll:function(){return [];}, createElement:function(){return el();}, addEventListener:function(){}, body: el(), documentElement: el(), hidden:false, activeElement:null },
  alert: function(){}, confirm: function(){return true;}, atob: function(s){return Buffer.from(s,"base64").toString("binary");}, btoa: function(s){return Buffer.from(s,"binary").toString("base64");},
  structuredClone: function(v){return JSON.parse(JSON.stringify(v));}, TextEncoder: TextEncoder, TextDecoder: TextDecoder, URL: URL, Blob: function(){} };
sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
sandbox.addEventListener = function () {}; sandbox.removeEventListener = function () {};
vm.createContext(sandbox);
scripts.forEach(function (s) {
  try { vm.runInContext(fs.readFileSync(path.join(ROOT, s), "utf8"), sandbox, { filename: s }); }
  catch (e) { console.error("LOAD FAIL", s, e.message); process.exit(1); }
});
var g = sandbox;

var passes = 0, failures = 0;
function ok(cond, msg) { if (cond) { passes++; console.log("  ✔ " + msg); } else { failures++; console.log("  ✘ " + msg); } }

console.log("[boot-1] Tout premier lancement (aucune save) : init() pose bien les valeurs de départ");
g.init();
ok(g.game.resources.ration === 3, "3 rations de départ posées dès le tout premier lancement (v3.107.2) : " + g.game.resources.ration);
ok(g.game.heroHp === 1 && g.game.gold === 0, "état neutre attendu avant sélection de héros (heroHp=1, gold=0)");

console.log("\n[boot-2] Vrai flux joueur (v3.107.3) : écran titre -> Nouvelle Partie -> création de héros");
var g2 = null;
(function () {
  var scripts2 = require("./sim/index-scripts.js")(ROOT, /pwa\.js/);
  var storage2 = {};
  var sandbox2 = { console: console, Date: Date, Math: Math, JSON: JSON, Object: Object, Array: Array, Number: Number, String: String, Boolean: Boolean,
    setTimeout: function(){return 0;}, clearTimeout: function(){}, setInterval: function(){return 0;}, clearInterval: function(){},
    requestAnimationFrame: function(){}, performance: { now: function(){return Date.now();} },
    navigator: { serviceWorker: null, userAgent: "vm", vibrate: function(){} }, location: { href:"", search:"", hash:"", protocol:"https:" },
    localStorage: { getItem:function(k){return storage2.hasOwnProperty(k)?storage2[k]:null;}, setItem:function(k,v){storage2[k]=String(v);}, removeItem:function(k){delete storage2[k];}, key:function(i){return Object.keys(storage2)[i]||null;}, get length(){return Object.keys(storage2).length;} },
    document: { getElementById:function(){return el();}, querySelector:function(){return null;}, querySelectorAll:function(){return [];}, createElement:function(){return el();}, addEventListener:function(){}, body: el(), documentElement: el(), hidden:false, activeElement:null },
    alert: function(){}, confirm: function(){return true;}, atob: function(s){return Buffer.from(s,"base64").toString("binary");}, btoa: function(s){return Buffer.from(s,"binary").toString("base64");},
    structuredClone: function(v){return JSON.parse(JSON.stringify(v));}, TextEncoder: TextEncoder, TextDecoder: TextDecoder, URL: URL, Blob: function(){} };
  sandbox2.window = sandbox2; sandbox2.self = sandbox2; sandbox2.globalThis = sandbox2;
  sandbox2.addEventListener = function () {}; sandbox2.removeEventListener = function () {};
  vm.createContext(sandbox2);
  scripts2.forEach(function (s) { vm.runInContext(fs.readFileSync(path.join(ROOT, s), "utf8"), sandbox2, { filename: s }); });
  g2 = sandbox2;
})();
g2.ensureGameStateDefaults();
g2.initSaveSystem();
g2.HeroSlotManager.createHeroInSlot(1);
ok(g2.game.resources.ration === 3, "après createHeroInSlot(1) (clic « Nouvelle Partie ») : 3 rations");
g2.pendingHeroId = "knight";
g2.pendingPlayerName = "TestPlayer";
g2.confirmHeroSelection();
ok(g2.game.resources.ration === 3 && g2.game.playerName === "TestPlayer" && g2.game.heroHp === g2.game.heroMaxHp, "après confirmHeroSelection (héros+nom validés) : 3 rations toujours là, personnage prêt");

console.log("\n" + passes + " OK, " + failures + " échec(s)");
process.exit(failures ? 1 : 0);
