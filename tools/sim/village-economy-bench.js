"use strict";
/* tools/sim/village-economy-bench.js — ÉCONOMIE DU VILLAGE DE LA FORÊT, sur les vrais systèmes.

   POURQUOI (décision Seb, 18/09/2026 — option B). Le village de la Forêt doit être
   ENTAMÉ en Forêt et PAS TERMINÉ à l'arrivée au Désert : le joueur revient
   régulièrement au village. Ce banc dit, pour un réglage et un profil de joueur,
   où en est chaque bâtiment à l'arrivée au Désert et combien de temps il faut
   ensuite pour finir — avec la seule production de la Forêt (borne basse).

   CE QUI TOURNE POUR DE VRAI (chargé depuis index.html, sandbox VM, horloge simulée) :
   ProductionPlotsSystem (tick, rattrapage hors ligne, récolte, zones, améliorations),
   VillageBuildingManager (rangs, coûts, chantier unique à minuteur), WarehouseManager.
   HYPOTHÈSES (à confronter au jeu réel) :
   - L'atelier n'est jamais le goulot (mesuré : 20 planches/min au niv. 1 contre
     ~1,3/min de bois) : la conversion bois -> planche est faite à la demande, au ratio
     lu dans WORKSHOPS_CONFIG.
   - L'or est illimité : le banc isole les RESSOURCES. L'or dépensé est rapporté à part.
   - Aucune consommation hors village (rations, Apothicaire, Taverne) : borne optimiste.
   - Politique d'achat gloutonne (--policy) : par défaut le chantier le moins cher en
     équivalent bois passe d'abord, puis la zone la moins chère avec le reste.

   USAGE
     node tools/sim/village-economy-bench.js .                 tous les scénarios × profils
     node tools/sim/village-economy-bench.js . --scen=S0       un scénario
     node tools/sim/village-economy-bench.js . --detail        niveaux par bâtiment à l'arrivée
     node tools/sim/village-economy-bench.js . --harvest=3     récolte toutes les 3 min (défaut 10)
     node tools/sim/village-economy-bench.js . --policy=zones  la production avant le village
     TRACE=1 node tools/sim/village-economy-bench.js . --scen=S0   minute de chaque chantier
*/

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var ROOT = require("../chemins.js").jeu(process.argv[2]);
var ARGS = process.argv.slice(3).join(" ");
function arg(nom, defaut) {
  var m = ARGS.match(new RegExp("--" + nom + "=([^\\s]+)"));
  return m ? m[1] : defaut;
}
var DETAIL = ARGS.indexOf("--detail") !== -1;
/* Politique : « village » = le bâtisseur visé par B — le prochain chantier est mis de côté,
   les zones ne dépensent que le surplus ; « zones » = la production d'abord, le village
   avec ce qui reste. */
var POLICY = arg("policy", "village");

/* ---------- Horloge simulée : tous les Date.now() du jeu la lisent ---------- */
var NOW = Date.UTC(2026, 8, 18, 8, 0, 0);
var RealDate = Date;
class FakeDate extends RealDate {
  constructor() { if (arguments.length) super(...arguments); else super(NOW); }
  static now() { return NOW; }
}

function el() {
  return {
    style: { setProperty: function () {}, removeProperty: function () {} },
    classList: { add: function () {}, remove: function () {}, toggle: function () {}, contains: function () { return false; } },
    innerHTML: "", textContent: "", scrollTop: 0, disabled: false,
    querySelector: function () { return null; }, querySelectorAll: function () { return []; },
    addEventListener: function () {}, setAttribute: function () {}, getAttribute: function () { return null; },
    appendChild: function () {}, remove: function () {}, hasChildNodes: function () { return false; },
    focus: function () {}, dataset: {}, offsetWidth: 0, parentNode: null
  };
}

function buildSandbox() {
  var storage = {};
  var s = {
    console: { log: function () {}, warn: function () {}, error: function () {} },
    Date: FakeDate, Math: Math, JSON: JSON, Object: Object, Array: Array,
    Number: Number, String: String, Boolean: Boolean,
    setTimeout: function () { return 0; }, clearTimeout: function () {},
    setInterval: function () { return 0; }, clearInterval: function () {},
    requestAnimationFrame: function () {},
    performance: { now: function () { return NOW; } },
    navigator: { serviceWorker: null, userAgent: "bench", vibrate: function () {} },
    location: { href: "", search: "", hash: "", protocol: "https:" },
    localStorage: {
      getItem: function (k) { return storage.hasOwnProperty(k) ? storage[k] : null; },
      setItem: function (k, v) { storage[k] = String(v); },
      removeItem: function (k) { delete storage[k]; },
      key: function (i) { return Object.keys(storage)[i] || null; },
      get length() { return Object.keys(storage).length; }
    },
    document: {
      getElementById: function () { return el(); },
      querySelector: function () { return null; }, querySelectorAll: function () { return []; },
      createElement: function () { return el(); }, addEventListener: function () {},
      body: el(), documentElement: el(), hidden: false, activeElement: null
    },
    alert: function () {}, confirm: function () { return true; },
    atob: function (x) { return Buffer.from(x, "base64").toString("binary"); },
    btoa: function (x) { return Buffer.from(x, "binary").toString("base64"); },
    structuredClone: function (v) { return JSON.parse(JSON.stringify(v)); },
    TextEncoder: TextEncoder, TextDecoder: TextDecoder, URL: URL, Blob: function () {}
  };
  s.window = s; s.self = s; s.globalThis = s;
  vm.createContext(s);
  var html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  var re = /<script src="([^"]+\.js)"/g, m;
  while ((m = re.exec(html))) {
    if (/pwa\.js|boot\.js/.test(m[1])) continue;
    vm.runInContext(fs.readFileSync(path.join(ROOT, m[1]), "utf8"), s, { filename: m[1] });
  }
  return s;
}

/* ---------- Grille actée (D11/D12, Conception Désert v1.3 §11) ---------- */
var FOREST_CAPS = { workshop: 4, training: 4, hall: 4, warehouse: 3, palisade: 3, tavern: 2, apothecary: 2, forge: 0, enchanter: 0 };
var FOREST_RANKS = { training: 1, apothecary: 2, forge: 2, enchanter: 2, palisade: 2, warehouse: 3, hall: 4, tavern: 4 };
var PROD_IDS = ["sawmill", "quarry", "mine", "well", "farm", "hunt"];

/* Minutes de jeu ACTIF à partir desquelles chaque porte s'ouvre (hypothèse à
   confirmer sur une partie réelle — ordre lu dans le code : Veine instable d'abord). */
var UNLOCKS = {
  quarry: 6, sawmill: 9, mine: 12, farm: 14, well: 18, hunt: 22,
  workshopSite: 10,   // dernière étape des Fondations = premier chantier
  training: 15        // une caractéristique butée à 20
};

/* ---------- Scénarios : les leviers qu'on veut comparer ---------- */
var SCENARIOS = {
  REF: { label: "référence v3.288.0 (9 zones niv. 5, sans plafond de zone)", zoneLevel: 5, zones: 9, costMult: {}, prodMult: {} },
  S0: { label: "grille actée (3 zones niv. 3)", zoneLevel: 3, zones: 3, costMult: {}, prodMult: {} },
  S1: { label: "zones niv. 4", zoneLevel: 4, zones: 3, costMult: {}, prodMult: {} },
  S2: { label: "Halle/Entrepôt/Palissade ÷2", zoneLevel: 3, zones: 3,
        costMult: { hall: 0.5, warehouse: 0.5, palisade: 0.5 }, prodMult: {} },
  S3: { label: "Scierie ×2 (débit par bâtiment)", zoneLevel: 3, zones: 3, costMult: {}, prodMult: { sawmill: 2 } },
  S5: { label: "débit de base ×2 partout", zoneLevel: 3, zones: 3, costMult: {},
        prodMult: { sawmill: 2, quarry: 2, mine: 2, well: 2, farm: 2, hunt: 2 } },
  S6: { label: "débit de base ×3 partout", zoneLevel: 3, zones: 3, costMult: {},
        prodMult: { sawmill: 3, quarry: 3, mine: 3, well: 3, farm: 3, hunt: 3 } },
  /* v3.290.0 : réglage livré. Les coûts sont ceux du code chargé ; seule la dotation est
     rejouée ici (le banc ouvre les bâtiments sans passer par unlockBuilding). Les scénarios
     S0-S6 et D1-D7 se lisent désormais sur ces coûts-là. */
  V290: { label: "réglage livré v3.290.0 (dotation 60 bois + 45 pierre)", zoneLevel: 3, zones: 3, costMult: {}, prodMult: {},
          levers: { unlockGift: { bois: 60, pierre: 45 } } },
  D1: { label: "réserve de base ×3", zoneLevel: 3, zones: 3, costMult: {}, prodMult: {}, levers: { capMult: 3 } },
  D2: { label: "améliorations et ouvertures de zone ÷2", zoneLevel: 3, zones: 3, costMult: {}, prodMult: {}, levers: { upCostMult: 0.5, unlockCostMult: 0.5 } },
  D3: { label: "dotation 40 bois + 30 pierre (livrée en v3.289.0)", zoneLevel: 3, zones: 3, costMult: {}, prodMult: {},
        levers: { unlockGift: { bois: 40, pierre: 30 } } },
  D4: { label: "chasse ×4 par bête, 1/4 du temps actif", zoneLevel: 3, zones: 3, costMult: {}, prodMult: {}, levers: { huntShare: 0.25, huntQty: 4 } },
  D5: { label: "réserve ×3 + dotation", zoneLevel: 3, zones: 3, costMult: {}, prodMult: {},
        levers: { capMult: 3, unlockGift: { bois: 40, pierre: 30 } } },
  D6: { label: "réserve ×3 + dotation + chasse ×4", zoneLevel: 3, zones: 3, costMult: {}, prodMult: {},
        levers: { capMult: 3, unlockGift: { bois: 40, pierre: 30 }, huntShare: 0.25, huntQty: 4 } },
  D7: { label: "réserve ×2 + dotation + zones ÷2", zoneLevel: 3, zones: 3, costMult: {}, prodMult: {},
        levers: { capMult: 2, unlockGift: { bois: 40, pierre: 30 }, upCostMult: 0.5, unlockCostMult: 0.5 } },
  S4: { label: "zones niv. 4 + trois gros ÷2", zoneLevel: 4, zones: 3,
        costMult: { hall: 0.5, warehouse: 0.5, palisade: 0.5 }, prodMult: {} }
};

/* ---------- Profils de joueur ----------
   arrival : minutes de jeu actif à l'arrivée au Désert (Forêt + gestion du village).
   session / gap : durée d'une séance et absence entre deux séances (minutes).
   harvest : cadence de récolte pendant une séance. */
var PROFILES = {
  enchaine:  { label: "enchaîné (tout d'une traite)", arrival: 75, session: 75, gap: 600, harvest: 10 },
  soirees:   { label: "3 séances/jour de 25 min", arrival: 75, session: 25, gap: 300, harvest: 10 },
  quotidien: { label: "1 séance/jour de 40 min", arrival: 75, session: 40, gap: 1400, harvest: 10 }
};

/* ---------- Une campagne ---------- */
function campaign(scen, prof) {
  var g = buildSandbox();
  function run(code) { return vm.runInContext(code, g); }
  NOW = Date.UTC(2026, 8, 18, 8, 0, 0);

  run("fullResetState(); game.playerName='Bench'; game.heroId='knight';");
  // Rien ne s'affiche : le banc n'a pas de DOM utile.
  ["renderPanel", "renderHud", "saveGame", "showToast", "addLog"].forEach(function (f) { g[f] = function () {}; });

  // Grille actée : plafonds, rangs, seuils [1,2,3,4], coûts de scénario.
  run("VILLAGE_RANK_THRESHOLDS = [1, 2, 3, 4];");
  Object.keys(FOREST_CAPS).forEach(function (id) { g.VILLAGE_BUILDINGS[id].maxLevel = FOREST_CAPS[id]; });
  Object.keys(FOREST_RANKS).forEach(function (id) { g.VILLAGE_BUILDINGS[id].rank = FOREST_RANKS[id]; });
  // Paliers de coût remplacés en entier (calibrage) : { id: [costTiers...] }
  Object.keys(scen.tiers || {}).forEach(function (id) { g.VILLAGE_BUILDINGS[id].costTiers = JSON.parse(JSON.stringify(scen.tiers[id])); });
  Object.keys(scen.costMult).forEach(function (id) {
    g.VILLAGE_BUILDINGS[id].costTiers.forEach(function (t) {
      Object.keys(t.baseCost).forEach(function (k) { t.baseCost[k] = t.baseCost[k] * scen.costMult[id]; });
    });
  });

  /* v3.289.0 : les plafonds de zones sont dans le code (data/world-caps.js). Un scénario
     qui les dépasse (REF = avant le lot) les lève explicitement. La dotation du code n'est
     jamais versée ici (le banc ouvre les bâtiments sans unlockBuilding) : seule compte
     celle du scénario (levers.unlockGift), pour comparer avec et sans. */
  if (scen.zones > 3 || scen.zoneLevel > 3) {
    g.WorldCaps.getZoneRows = function () { return Math.ceil(scen.zones / 3); };
    g.WorldCaps.getZoneLevel = function () { return scen.zoneLevel; };
  }

  // Leviers de démarrage : on modifie les DONNÉES, les formules restent celles du jeu.
  var L = scen.levers || {};
  Object.keys(g.PRODUCTION_PLOTS_SHARED.profiles).forEach(function (k) {
    var pr = g.PRODUCTION_PLOTS_SHARED.profiles[k];
    if (L.capMult) pr.baseCapacity = pr.baseCapacity * L.capMult;      // réserve de base
    if (L.rateMult) pr.baseRatePerMin = pr.baseRatePerMin * L.rateMult; // débit de base
  });
  Object.keys(g.PRODUCTION_PLOTS_BUILDINGS).forEach(function (b) {
    var cfg = g.PRODUCTION_PLOTS_BUILDINGS[b];
    if (L.upCostMult) Object.keys(cfg.upgradeCost.base).forEach(function (k) { cfg.upgradeCost.base[k] *= L.upCostMult; });
    if (L.unlockCostMult) Object.keys(cfg.unlockCost.base).forEach(function (k) { cfg.unlockCost.base[k] *= L.unlockCostMult; });
  });

  // Levier « débit par bâtiment » : crochet sur le taux, le calcul reste celui du jeu.
  var PPS = g.ProductionPlotsSystem, cur = null;
  var origRate = PPS.getPlotRatePerMin.bind(PPS);
  PPS.getPlotRatePerMin = function (i, p) { return origRate(i, p) * (scen.prodMult[cur] || 1); };
  ["tick", "catchUpOffline"].forEach(function (fn) {
    var orig = PPS[fn].bind(PPS);
    PPS[fn] = function (b, dt) { cur = b; var r = orig(b, dt); cur = null; return r; };
  });

  g.game.gold = 1e9; var goldStart = g.game.gold;
  var active = 0;               // minutes de jeu actif cumulées
  var huntAcc = 0;
  var prog = g.game.explorationProgression = g.game.explorationProgression || {};
  var flags = g.PRODUCTION_UNLOCK_FLAGS;
  g.WorkshopUnlockManager.isWorkshopVisible = function () { return active >= UNLOCKS.workshopSite; };

  function openGates() {
    PROD_IDS.forEach(function (id) {
      if (active >= UNLOCKS[id] && !prog[flags[id]]) {
        prog[flags[id]] = true;
        run("ProductionManager.ensure();");
        PPS.ensurePlots(id);
        PPS.getPlots(id).forEach(function (p) { p.lastTick = NOW; });
        if (L.unlockGift) Object.keys(L.unlockGift).forEach(function (k) { g.WarehouseManager.addResource(k, L.unlockGift[k], true); });
      }
    });
    if (active >= UNLOCKS.training) g.game.upgrades.utrain_power = Math.max(20, g.game.upgrades.utrain_power || 0);
  }

  function harvestAll() {
    PROD_IDS.forEach(function (id) {
      if (!prog[flags[id]]) return;
      var n = PPS.harvestAll(id);
      if (n > 0) g.WarehouseManager.addResource(PRODUCTION_KEY(id), n, true);
    });
  }
  function PRODUCTION_KEY(id) { return g.PRODUCTION_BUILDINGS[id].resourceKey; }
  function amt(k) { return g.WarehouseManager.getAmount(k); }
  var RESERVE = {};   // ressources réservées au prochain chantier (politique « village »)
  function afford(cost) { return Object.keys(cost).every(function (k) { return k === "gold" || amt(k) - (RESERVE[k] || 0) >= cost[k]; }); }

  // Planches à la demande, au ratio de la recette réelle.
  var plankRecipe = g.WORKSHOPS_CONFIG.scierie_fine.recipes[0];
  var woodPerPlank = plankRecipe.inputs[0].quantity / plankRecipe.outputs[0].quantity;
  function makePlanks(need) {
    var miss = need - amt("planche");
    if (miss <= 0) return true;
    if (amt("bois") < miss * woodPerPlank) return false;
    g.WarehouseManager.removeResource("bois", miss * woodPerPlank);
    g.WarehouseManager.addResource("planche", miss, true);
    return true;
  }
  function woodEq(cost) { return (cost.bois || 0) + (cost.planche || 0) * woodPerPlank + (cost.pierre || 0) + (cost.fer || 0) + (cost.eau || 0); }

  // Zones : ouvrir, monter, améliorer — la moins chère d'abord, dans la ligne de la Forêt.
  function investZones() {
    var did = true;
    while (did) {
      did = false; var best = null;
      PROD_IDS.forEach(function (id) {
        if (!prog[flags[id]]) return;
        var cfg = g.PRODUCTION_PLOTS_BUILDINGS[id];
        PPS.getPlots(id).forEach(function (p, i) {
          if (i >= scen.zones) return;
          var opt = null;
          if (p.state === "locked") opt = { cost: g.getProductionPlotUnlockCost(id, i), go: function () { return PPS.unlockPlot(id, i); } };
          else if (p.level < scen.zoneLevel) opt = { cost: g.getProductionPlotUpgradeCost(id, p.level, i), go: function () { return PPS.upgradePlot(id, i); } };
          else if (!p.fertile) opt = { cost: cfg.improvementCost.fertile.cost, go: function () { return PPS.toggleImprovement(id, i, "fertile"); } };
          else if (!p.irrigated) opt = { cost: cfg.improvementCost.irrigated.cost, go: function () { return PPS.toggleImprovement(id, i, "irrigated"); } };
          if (opt && afford(opt.cost) && (!best || woodEq(opt.cost) < woodEq(best.cost))) best = opt;
        });
      });
      if (best && best.go().ok) did = true;
    }
  }

  var VBM = g.VillageBuildingManager;
  var ORDER = g.VILLAGE_BUILDING_ORDER;
  function investVillage() {
    VBM.tick();
    if (VBM.isBuilding()) return;
    var best = null;
    ORDER.forEach(function (id) {
      if (VBM.isMaxLevel(id)) return;
      var r = VBM.getBlockReason(id);
      if (r && r !== "Matériaux manquants") return;
      var c = VBM.getNextCost(id);
      if (!best || woodEq(c) < woodEq(best.c)) best = { id: id, c: c };
    });
    RESERVE = {};
    if (!best) return;
    var c = best.c;
    if (POLICY === "village") {
      // Le bâtisseur met de côté : bois pour les planches manquantes, pierre, etc.
      Object.keys(c).forEach(function (k) {
        if (k === "gold") return;
        if (k === "planche") RESERVE.bois = (RESERVE.bois || 0) + Math.max(0, c.planche - amt("planche")) * woodPerPlank;
        else RESERVE[k] = (RESERVE[k] || 0) + c[k];
      });
    }
    if (!Object.keys(c).every(function (k) { return k === "gold" || k === "planche" || amt(k) >= c[k]; })) return;
    if (!makePlanks(c.planche || 0)) return;
    if (VBM.startBuild(best.id) && process.env.TRACE) console.log("   t=" + active + " min actif : chantier " + best.id + " -> " + (VBM.getLevel(best.id) + 1));
    RESERVE = {};
  }

  function totalTarget() { var t = 0; Object.keys(FOREST_CAPS).forEach(function (id) { t += FOREST_CAPS[id]; }); return t; }
  function builtLevels() { var t = 0; Object.keys(FOREST_CAPS).forEach(function (id) { t += VBM.getLevel(id); }); return t; }
  function snapshot() { var o = {}; Object.keys(FOREST_CAPS).forEach(function (id) { if (FOREST_CAPS[id]) o[id] = VBM.getLevel(id) + "/" + FOREST_CAPS[id]; }); return o; }

  var TARGET = totalTarget();
  var atArrival = null, doneActive = null, doneReal = null;
  var realMin = 0, guard = 0;

  while (guard++ < 5000) {
    // --- une séance ---
    PROD_IDS.forEach(function (id) { if (prog[flags[id]]) PPS.catchUpOffline(id); });
    VBM.tick();
    for (var m = 0; m < prof.session; m++) {
      openGates();
      NOW += 60000; active += 1; realMin += 1;
      PROD_IDS.forEach(function (id) { if (prog[flags[id]]) PPS.tick(id, 60); });
      if (L.huntShare && prog[flags.hunt]) {
        // HYPOTHÈSE : ~7 bêtes/min en Lisière (Battue : 20 en ~3 min), 50 % de butin, 6 ressources
        huntAcc += L.huntShare * 7 * 0.5 * (L.huntQty || 1) / 6;
        var whole = Math.floor(huntAcc);
        if (whole > 0) { huntAcc -= whole; ["viande", "ble", "bois", "fer", "pierre", "eau"].forEach(function (k) { g.WarehouseManager.addResource(k, whole, true); }); }
      }
      if (m % prof.harvest === 0 || m === prof.session - 1) { harvestAll(); if (POLICY === "zones") { investZones(); investVillage(); } else { investVillage(); investZones(); } }
      else VBM.tick();
      if (!atArrival && active >= prof.arrival) {
        atArrival = { pct: Math.round(100 * builtLevels() / TARGET), snap: snapshot(), gold: goldStart - g.game.gold, realH: realMin / 60 };
      }
      if (builtLevels() >= TARGET && !VBM.isBuilding()) { doneActive = active; doneReal = realMin; break; }
    }
    if (doneActive) break;
    // --- absence ---
    NOW += prof.gap * 60000; realMin += prof.gap;
    VBM.tick();
  }
  return { atArrival: atArrival, doneActive: doneActive, doneReal: doneReal, gold: goldStart - g.game.gold };
}

/* ---------- Rapport ---------- */
function h(min) { return min == null ? "jamais" : (min >= 1440 ? (min / 1440).toFixed(1) + " j" : (min / 60).toFixed(1) + " h"); }
if (process.env.SWEEP) { var extra = JSON.parse(require("fs").readFileSync(process.env.SWEEP, "utf8")); Object.keys(extra).forEach(function (k) { SCENARIOS[k] = extra[k]; }); }
var only = arg("scen", null);
var HARVEST = arg("harvest", null);   // force la cadence de récolte (minutes) sur tous les profils
if (HARVEST) Object.keys(PROFILES).forEach(function (k) { PROFILES[k].harvest = Number(HARVEST); });
Object.keys(SCENARIOS).forEach(function (sk) {
  if (only && only !== sk) return;
  var sc = SCENARIOS[sk];
  console.log("\n== " + sk + " — " + sc.label);
  Object.keys(PROFILES).forEach(function (pk) {
    var p = PROFILES[pk], r = campaign(sc, p);
    var a = r.atArrival || { pct: "?", snap: {} };
    console.log("  " + p.label.padEnd(30) + " à l'arrivée au Désert : " + String(a.pct).padStart(3) + " % des niveaux"
      + " | fini après " + h(r.doneActive) + " de jeu actif, " + h(r.doneReal) + " réelles"
      + " | or total " + Math.round(r.gold));
    if (DETAIL) console.log("     " + JSON.stringify(a.snap));
  });
});
