"use strict";
/* tools/sim/debouches-bench.js — refonte de l'économie, lot F2 : LES DÉBOUCHÉS DES MATIÈRES COMMUNES.

   Village fini au plafond d'un monde (bâtiments, zones au niveau max avec améliorations), un joueur
   qui passe N fois par jour. À chaque passage : vivres et potions, contrats de la Taverne, caravanes
   (déchargement, puis un départ par marché libre), patrouilles, puis récolte des zones. Les patrouilles tournent en continu.
   On mesure, par ressource et par jour : produit, consommé, livré à la Taverne, parti en caravane,
   perdu au plafond, temps passé au plafond ; et l'or rapporté.

   CE QUI TOURNE POUR DE VRAI : ProductionPlotsSystem (zones, réserve, récolte), WarehouseManager
   (plafonds), TavernManager (tableau, livraisons), CaravanManager (chargement, trajets, or).
   HYPOTHÈSES (à confronter au jeu réel) :
   - patrouilles : 2 compagnons, 8 h, anneau 2, 5 améliorations, ressource dominante en rotation ; butin pris et
     patrouille relancée au premier passage après le retour ;
   - vivres : 4 Rations moyennes par jour (15 viandes, 15 blés, 5 eaux chacune, par la chaîne d'ateliers) ;
   - potions : 10 Soins mineurs par jour (3 eaux, 4 blés) ;
   - Taverne : chaque contrat livrable est livré, les produits fabriqués préparés depuis le brut ; caravane : trajet Long si le passage suivant est à
     8 h ou plus, Moyen sinon, Court jamais.

   USAGE : node tools/sim/debouches-bench.js . [--monde=1|3] [--visites=4] [--scen=A0] [--jours=7]  */

var fs = require("fs"), path = require("path"), vm = require("vm");
var ROOT = require("../chemins.js").jeu(process.argv[2]);
var ARGS = process.argv.slice(3).join(" ");
function arg(nom, def) { var m = ARGS.match(new RegExp("--" + nom + "=([^\\s]+)")); return m ? m[1] : def; }

var NOW = Date.UTC(2026, 9, 26, 6, 0, 0), RealDate = Date;
class FakeDate extends RealDate { constructor() { if (arguments.length) super(...arguments); else super(NOW); } static now() { return NOW; } }

function el() {
  return { style: { setProperty: function () {}, removeProperty: function () {} }, classList: { add: function () {}, remove: function () {}, toggle: function () {}, contains: function () { return false; } },
    innerHTML: "", textContent: "", scrollTop: 0, disabled: false, querySelector: function () { return null; }, querySelectorAll: function () { return []; },
    addEventListener: function () {}, setAttribute: function () {}, getAttribute: function () { return null; }, appendChild: function () {}, remove: function () {}, hasChildNodes: function () { return false; }, focus: function () {}, dataset: {} };
}
var scripts = require("../harness/index-scripts.js")(ROOT, /pwa\.js|boot\.js/);
var CODE = scripts.map(function (s) { return { s: s, code: fs.readFileSync(path.join(ROOT, s), "utf8") }; });

/* Rng déterministe : deux scénarios voient les mêmes tableaux de Taverne et les mêmes trajets. */
function rngFrom(seed) { var x = seed >>> 0; return function () { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; }

function boot() {
  var storage = {};
  var sb = { console: { log: function () {}, warn: function () {}, error: console.error, info: function () {} }, Date: FakeDate, Math: Object.create(Math), JSON: JSON, Object: Object, Array: Array, Number: Number, String: String, Boolean: Boolean,
    setTimeout: function () { return 0; }, clearTimeout: function () {}, setInterval: function () { return 0; }, clearInterval: function () {}, requestAnimationFrame: function () {}, performance: { now: function () { return NOW; } },
    navigator: { serviceWorker: null, userAgent: "vm", vibrate: function () {} }, location: { href: "", search: "", hash: "", protocol: "https:" },
    localStorage: { getItem: function (k) { return storage.hasOwnProperty(k) ? storage[k] : null; }, setItem: function (k, v) { storage[k] = String(v); }, removeItem: function (k) { delete storage[k]; }, key: function () { return null; }, length: 0 },
    document: { getElementById: function () { return el(); }, querySelector: function () { return null; }, querySelectorAll: function () { return []; }, createElement: function () { return el(); }, addEventListener: function () {}, body: el(), documentElement: el(), head: el(), hidden: false },
    alert: function () {}, confirm: function () { return true; }, atob: function (s) { return Buffer.from(s, "base64").toString("binary"); }, btoa: function (s) { return Buffer.from(s, "binary").toString("base64"); },
    structuredClone: function (v) { return JSON.parse(JSON.stringify(v)); }, TextEncoder: TextEncoder, TextDecoder: TextDecoder, URL: URL, Blob: function () {} };
  sb.window = sb; sb.self = sb; sb.globalThis = sb;
  sb.Math.random = rngFrom(12345);
  vm.createContext(sb);
  CODE.forEach(function (c) { vm.runInContext(c.code, sb, { filename: c.s }); });
  return sb;
}

var RAW = ["bois", "fer", "pierre", "eau", "ble", "viande"];
/* Brut nécessaire par unité de produit fabriqué (data/workshops.js). */
var RECIPE = { planche: { bois: 5 }, lingot: { fer: 5 }, farine: { ble: 5 }, viande_sechee: { viande: 5 },
  pain: { ble: 15, eau: 5 }, ration: { viande: 15, ble: 15, eau: 5 } };
var PREFIX = ["forest", "desert", "ruines", "crypte"];

var SCENARIOS = {
  A0: { label: "aujourd'hui (v3.480.0 : Bois et Fer en caravane, comme A1)" },
  A1: { label: "caravane : bois et fer acceptés", noExclude: true },
  A2: { label: "A1 + la caravane garde le quart du plafond (au lieu de la moitié)", noExclude: true, keep: 0.25 },
  A3: { label: "Taverne : quantités des contrats ×2", tavernQty: 2 },
  A4: { label: "A1 + Taverne ×2", noExclude: true, tavernQty: 2 },
  A5: { label: "A1 + capacité des caravanes ×2", noExclude: true, capMult: 2 },
  Z1: { label: "aujourd'hui, avec l'ancienne réserve des zones (avant v3.478.0)", zoneCap: 1 / 3 }
};

function campaign(world, visits, scen, days) {
  NOW = Date.UTC(2026, 9, 26, 6, 0, 0);
  var g = boot();
  vm.runInContext("fullResetState(); game.playerName='Banc'; game.heroId='knight';", g);
  ["renderPanel", "renderHud", "renderAll", "saveGame", "showToast", "addLog", "showHowToToast"].forEach(function (f) { g[f] = function () {}; });

  // Monde atteint, Histoire de ce monde jouée, cartes libérées (marchés)
  g.game.worldsEverReached = {}; for (var w = 0; w <= world; w++) g.game.worldsEverReached[w] = true;
  g.WorldManager.worldIndex = world;
  g.StoryQuestManager.isStepReached = function (id) { var i = PREFIX.findIndex(function (p) { return String(id).indexOf(p) === 0; }); return i >= 0 && i <= world; };
  g.LivingMapManager.isLiberated = function (m) { var map = g.LIVING_MAPS[m], wi = -1; g.WORLDS.forEach(function (x, i) { if (map && x.id === map.worldId) wi = i; }); return wi >= 0 && wi <= world; };

  // Village au plafond du monde
  g.VillageBuildingManager.ensure();
  Object.keys(g.VILLAGE_BUILDINGS).forEach(function (id) {
    var cap = Math.min(g.VILLAGE_BUILDINGS[id].maxLevel, g.WorldCaps.getVillageCap(id));
    g.game.village.buildings[id] = Object.assign(g.game.village.buildings[id] || {}, { level: cap });
  });

  // Zones au plafond, améliorées ; bâtiments de production ouverts
  var flags = g.PRODUCTION_UNLOCK_FLAGS; g.game.explorationProgression = g.game.explorationProgression || {};
  Object.keys(flags).forEach(function (id) { g.game.explorationProgression[flags[id]] = true; });
  var PPS = g.ProductionPlotsSystem, rows = g.WorldCaps.getZoneRows(), zl = g.WorldCaps.getZoneLevel();
  PPS.getManagedBuildingIds().forEach(function (b) {
    PPS.getPlots(b).forEach(function (p, i) { var open = Math.floor(i / 3) < rows; p.state = open ? "open" : "locked"; p.level = open ? zl : 1; p.fertile = p.irrigated = open; p.stock = 0; p.lastTick = NOW; });
  });

  // Leviers du scénario (données seulement)
  if (scen.noExclude) g.CARAVAN_EXCLUDED.length = 0;
  if (scen.keep != null) vm.runInContext("CARAVAN_KEEP_SHARE = " + scen.keep + ";", g);
  if (scen.zoneCap) Object.keys(g.PRODUCTION_PLOTS_SHARED.profiles).forEach(function (k) { g.PRODUCTION_PLOTS_SHARED.profiles[k].baseCapacity *= scen.zoneCap; });
  if (scen.capMult) Object.keys(g.CARAVAN_TRIPS).forEach(function (t) { g.CARAVAN_TRIPS[t].units *= scen.capMult; });
  if (scen.tavernQty) g.TAVERN_CONTRACT_TEMPLATES.forEach(function (t) { t.min *= scen.tavernQty; t.max *= scen.tavernQty; });

  var W = g.WarehouseManager, C = g.CaravanManager, T = g.TavernManager;
  RAW.forEach(function (k) { g.game.resources[k] = Math.floor(W.getCap(k) / 2); });
  g.game.gold = 0;

  var S = {}; RAW.forEach(function (k) { S[k] = { zones: 0, patrol: 0, lost: 0, eaten: 0, tavern: 0, caravan: 0, fullMin: 0 }; });
  var gold = { tavern: 0, caravan: 0 }, measuring = false;

  // Patrouilles : 2 compagnons en continu, 8 h, ressource dominante en rotation
  var rate = g.PATROL_RATES[["forest", "desert", "ruins", "crypt"][world]].matPerHour * g.PATROL_RING_MULT[2] * (1 + 5 * g.PATROL_UPGRADE_BONUS);
  var patrolTurn = 0, patrolEnd = null;
  /* Le butin d'une patrouille ne rentre qu'au passage du joueur (PatrolManager.collect), qui relance aussitôt. */
  function patrolCollect() {
    if (patrolEnd !== null && NOW < patrolEnd) return;
    if (patrolEnd !== null) patrolReturn();
    patrolEnd = NOW + 8 * 3600e3;
  }
  function patrolReturn() {
    for (var c = 0; c < 2; c++) {
      var main = RAW[(patrolTurn + c * 3) % 6], second = RAW[(patrolTurn + c * 3 + 1) % 6];
      [[main, 0.7], [second, 0.3]].forEach(function (x) {
        var n = Math.floor(rate * 8 * x[1]), got = W.addResource(x[0], n, true);
        if (measuring) { S[x[0]].patrol += got; S[x[0]].lost += n - got; }
      });
    }
    patrolTurn++;
  }
  function take(k, n) { var have = W.getAmount(k), q = Math.min(have, n); W.removeResource(k, q); return q; }

  // Passages : répartis sur 16 h d'éveil (7 h → 23 h)
  var hours = visits === 1 ? [19] : Array.from({ length: visits }, function (_, i) { return 7 + Math.round(i * 16 / (visits - 1)); });
  var perVisit = { ration: 4 / visits, soin: 10 / visits };

  function harvest() {
    PPS.getManagedBuildingIds().forEach(function (b) {
      PPS.catchUpOffline(b);
      var key = g.PRODUCTION_BUILDINGS[b].resourceKey, free = W.getFreeSpace(key);
      var n = PPS.harvestAll(b, free); W.addResource(key, n, true);
      if (measuring) S[key].zones += n;
    });
  }
  function visit(nextGapH) {
    // ordre d'un joueur avisé : vivres, Taverne et caravanes d'abord, puis patrouilles, puis zones (elles gardent leur reste)
    // vivres et potions (par la chaîne : Ration moyenne = 15 viandes, 15 blés, 5 eaux ; Soin mineur = 3 eaux, 4 blés)
    var r = perVisit.ration, s = perVisit.soin;
    [["viande", 15 * r], ["ble", 15 * r + 4 * s], ["eau", 5 * r + 3 * s]].forEach(function (x) { var q = take(x[0], Math.round(x[1])); if (measuring) S[x[0]].eaten += q; });
    // Taverne : tout ce qui est livrable ; un contrat de produit fabriqué se prépare depuis le brut (ratios des ateliers)
    T.getContracts().forEach(function (c) {
      if (c.done) return;
      var rec = RECIPE[c.resourceId], need = {};
      if (rec) {
        var miss = Math.max(0, c.quantity - W.getAmount(c.resourceId));
        Object.keys(rec).forEach(function (k) { need[k] = rec[k] * miss; });
        if (!Object.keys(need).every(function (k) { return W.getAmount(k) >= need[k]; })) return;
        Object.keys(need).forEach(function (k) { W.removeResource(k, need[k]); });
        g.game.resources[c.resourceId] = W.getAmount(c.resourceId) + miss;
      } else if (!T.canDeliver(c.id)) return;
      else need[c.resourceId] = c.quantity;
      var g0 = g.game.gold;
      if (T.deliver(c.id) && measuring) { gold.tavern += g.game.gold - g0; Object.keys(need).forEach(function (k) { S[k].tavern += need[k]; }); }
    });
    // Caravanes : décharger, puis un départ par marché libre
    var g1 = g.game.gold; C.unload(); if (measuring) gold.caravan += g.game.gold - g1;
    var trip = nextGapH >= 8 && C.isTripOpen("long") ? "long" : "moyen";
    C.getMarkets().forEach(function (m) {
      if (!C.hasFreeSlot() || C.get(m.world)) return;
      var before = {}; RAW.forEach(function (k) { before[k] = W.getAmount(k); });
      if (C.depart(trip, m.world) && measuring) RAW.forEach(function (k) { S[k].caravan += before[k] - W.getAmount(k); });
    });
    patrolCollect();
    harvest();
  }

  var minute = 0, total = (days + 2) * 1440;
  for (minute = 0; minute < total; minute += 10) {
    NOW += 600000;
    measuring = minute >= 2 * 1440;
    var d = new RealDate(NOW), h = d.getUTCHours(), mi = d.getUTCMinutes();
    if (measuring) RAW.forEach(function (k) { if (W.getFreeSpace(k) <= 0) S[k].fullMin += 10; });
    var idx = hours.indexOf(h);
    if (idx >= 0 && mi === 0) {
      var next = idx < hours.length - 1 ? hours[idx + 1] - h : 24 - h + hours[0];
      visit(next);
    }
  }
  // Production théorique des zones (si elles ne s'arrêtaient jamais)
  var theo = {};
  PPS.getManagedBuildingIds().forEach(function (b) { theo[g.PRODUCTION_BUILDINGS[b].resourceKey] = PPS.getTotalRatePerMin(b) * 1440; });
  return { S: S, gold: gold, days: days, theo: theo, cap: W.getCap("bois"), caravans: C.getMaxCaravans(), markets: C.getMarkets().length, tavernSlots: T.getSlotCount() };
}

/* ---------- Rapport ---------- */
var NOMS = { bois: "Bois", fer: "Fer", pierre: "Pierre", eau: "Eau", ble: "Blé", viande: "Viande" };
var worlds = arg("monde", null) ? [Number(arg("monde"))] : [1, 3];
var visits = Number(arg("visites", 4)), days = Number(arg("jours", 7)), only = arg("scen", null);
worlds.forEach(function (world) {
  Object.keys(SCENARIOS).forEach(function (sk) {
    if (only && only !== sk) return;
    var r = campaign(world, visits, SCENARIOS[sk], days), D = r.days;
    console.log("\n== " + ["Forêt", "Désert", "Ruines", "Crypte"][world] + " · " + visits + " passages par jour · " + sk + " — " + SCENARIOS[sk].label
      + "  (Entrepôt " + r.cap + ", " + r.tavernSlots + " contrats, " + r.markets + " marché(s) pour " + r.caravans + " caravane(s))");
    console.log("   ressource  zones/j (théorie)   patrouilles/j  perdu/j  vivres/j  Taverne/j  caravane/j  au plafond");
    RAW.forEach(function (k) {
      var s = r.S[k], f = function (x) { return String(Math.round(x / D)).padStart(7); };
      console.log("   " + NOMS[k].padEnd(9) + f(s.zones) + " (" + String(Math.round(r.theo[k])).padStart(6) + ")" + f(s.patrol).padStart(15) + f(s.lost).padStart(9)
        + f(s.eaten).padStart(10) + f(s.tavern).padStart(11) + f(s.caravan).padStart(12) + String(Math.round(s.fullMin / (D * 1440) * 100) + " %").padStart(12));
    });
    var T0 = { zones: 0, patrol: 0, lost: 0, tavern: 0, caravan: 0, theo: 0 };
    RAW.forEach(function (k) { Object.keys(T0).forEach(function (x) { T0[x] += x === "theo" ? r.theo[k] : r.S[k][x] / D; }); });
    console.log("   TOTAL/j : zones " + Math.round(T0.zones) + " sur " + Math.round(T0.theo) + " théoriques (" + Math.round(T0.zones / T0.theo * 100) + " %) · patrouilles " + Math.round(T0.patrol)
      + " · perdu " + Math.round(T0.lost) + " · Taverne " + Math.round(T0.tavern) + " · caravane " + Math.round(T0.caravan));
    console.log("   or par jour : Taverne " + Math.round(r.gold.tavern / D) + " · caravane " + Math.round(r.gold.caravan / D) + " · total " + Math.round((r.gold.tavern + r.gold.caravan) / D));
  });
});
