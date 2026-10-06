"use strict";
/* tools/sim/village-acte-bench.js — v3.329.x (plan C, partie 2) : LE VILLAGE PAR ACTE, sur une frise de jeu.
   Production horaire du village aux plafonds de chaque monde, valeur de revente, et dépenses
   d or jusqu à la fin du Désert. Lit les vraies données et fonctions de coût du jeu.
   USAGE : node tools/sim/revente-bench.js . */
var fs = require("fs"), path = require("path"), vm = require("vm");
var ROOT = require("../chemins.js").jeu(process.argv[2]);
var scripts = (function () { var html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8"), re = /<script src="([^"]+)"><\/script>/g, m, out = []; while ((m = re.exec(html)) !== null) out.push(m[1]); return out; })().filter(function (s) { return !/pwa\.js|boot\.js/.test(s); });

function el() {
  return { style: { setProperty: function(){}, removeProperty: function(){} }, classList: { add: function(){}, remove: function(){}, toggle: function(){}, contains: function(){ return false; } },
    innerHTML: "", textContent: "", scrollTop: 0, disabled: false, querySelector: function(){ return null; }, querySelectorAll: function(){ return []; },
    addEventListener: function(){}, setAttribute: function(){}, getAttribute: function(){ return null; }, appendChild: function(){}, remove: function(){}, hasChildNodes: function(){ return false; }, focus: function(){}, dataset: {}, offsetWidth: 0, parentNode: null };
}
var storage = {};
var sandbox = {
  console: console, Date: Date, Math: Math, JSON: JSON, Object: Object, Array: Array, Number: Number, String: String, Boolean: Boolean,
  setTimeout: function(){ return 0; }, clearTimeout: function(){}, setInterval: function(){ return 0; }, clearInterval: function(){},
  requestAnimationFrame: function(){}, performance: { now: function(){ return Date.now(); } },
  navigator: { serviceWorker: null, userAgent: "vm", vibrate: function(){} }, location: { href: "", search: "", hash: "", protocol: "https:" },
  localStorage: { getItem: function(k){ return storage.hasOwnProperty(k) ? storage[k] : null; }, setItem: function(k,v){ storage[k]=String(v); }, removeItem: function(k){ delete storage[k]; }, key: function(i){ return Object.keys(storage)[i] || null; }, get length(){ return Object.keys(storage).length; } },
  document: { getElementById: function(){ return el(); }, querySelector: function(){ return null; }, querySelectorAll: function(){ return []; }, createElement: function(){ return el(); }, addEventListener: function(){}, body: el(), documentElement: el(), hidden: false, activeElement: null },
  alert: function(){}, confirm: function(){ return true; }, atob: function(s){ return Buffer.from(s,"base64").toString("binary"); }, btoa: function(s){ return Buffer.from(s,"binary").toString("base64"); },
  structuredClone: function (v) { return JSON.parse(JSON.stringify(v)); }, TextEncoder: TextEncoder, TextDecoder: TextDecoder, URL: URL, Blob: function(){}
};
sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
scripts.forEach(function (s) {
  var code = fs.readFileSync(path.join(ROOT, s), "utf8");
  try { vm.runInContext(code, sandbox, { filename: s }); } catch (e) { console.error("LOAD FAIL", s, e.message); process.exit(1); }
});


/* Modèle (minute par minute, données et fonctions de coût du jeu) :
   - Frise : les étapes de l'Histoire au rythme de Mar (203 min pour la Forêt et le Désert),
     découpées en actes (TRAINING_CAP_BY_ACT). Deux joueurs :
       « rapide »    : tout d'une traite, récolte toutes les 10 min, puis 3 visites par jour ;
       « quotidien » : un acte par jour (séance de l'acte, puis visites à +6 h et +12 h).
   - Production : zones des six bâtiments, réserve plafonnée, récolte aux visites.
   - Investissement, dans l'ordre : Terrain jusqu'au plafond de l'acte (chemin de l'Histoire),
     Forge jusqu'au plafond (Désert), puis zones et bâtiments, le moins cher d'abord.
   - Transformations à la demande (planche, lingot, acier, bloc) ; matériaux spéciaux
     (Sève, résine, Verre trempé) supposés disponibles : ils ne viennent pas des zones.
   - Vivres de sortie (option) : SORTIES rations par acte, prélevées à l'entrée de l'acte.
   - Or illimité : rapporté à part (dépensé, et valeur de revente du surplus).
   USAGE : node tools/sim/village-acte-bench.js . [--scen S] [--detail] */
var G = sandbox;
function run(c) { return vm.runInContext(c, G); }
function fmt(n) { return Math.round(n).toLocaleString("fr-FR"); }
var ARGS = process.argv.slice(3).join(" ");
function arg(n, d) { var m = ARGS.match(new RegExp("--" + n + "(?:=([^\\s]+))?")); return m ? (m[1] === undefined ? true : m[1]) : d; }
run("fullResetState(); game.playerName='B'; game.heroId='knight'; VillageBuildingManager.ensure();");
G.game.worldsEverReached = { 0: true, 1: true }; G.WorldManager.worldIndex = 1;
G.WorldCaps.getTrainingActCap = function () { return Infinity; };

var SH = G.PRODUCTION_PLOTS_SHARED, PB = G.PRODUCTION_PLOTS_BUILDINGS, VB = G.VILLAGE_BUILDINGS;
var IDS = ["quarry", "sawmill", "mine", "farm", "well", "hunt"];
var KEY = { sawmill: "bois", quarry: "pierre", mine: "fer", well: "eau", farm: "ble", hunt: "viande" };
var UNLOCK_MIN = { quarry: 6, sawmill: 9, mine: 12, farm: 14, well: 18, hunt: 22 }; // minutes actives (banc Forêt)
var RAW = ["bois", "pierre", "fer", "eau", "ble", "viande"];

/* Coûts réels des bâtiments, niveau par niveau, jusqu'au plafond du Désert */
var BCOST = {};
Object.keys(G.WORLD_CAPS[1].village).forEach(function (id) {
  if (!VB[id] || !VB[id].implemented) return;
  BCOST[id] = [];
  for (var l = 0; l < G.WORLD_CAPS[1].village[id]; l++) {
    G.game.village.buildings[id] = { level: l };
    BCOST[id].push(G.VillageBuildingManager.getNextCost(id) || {});
  }
  G.game.village.buildings[id] = { level: 0 };
});

/* ---------- Scénarios ---------- */
var H = { rapide: 1, equilibree: 4, lente: 8 };
var SCEN = {
  S0: { label: "actuel" },
  C1: { label: "plafond de stock brut 500 + 250 par niveau d'Entrepôt", stock: [500, 250] },
  C2: { label: "C1 + réserves en heures (1 h / 4 h / 8 h), débit ×0,5", stock: [500, 250], reserveHours: H, rateMult: 0.5 },
  C3: { label: "C2 + Bloc taillé (moitié des planches du Désert)", stock: [500, 250], reserveHours: H, rateMult: 0.5, bloc: true },
  C4: { label: "C3 + vivres de sortie (4 par acte) + dotation du Terrain à l'entrée de l'acte", stock: [500, 250], reserveHours: H, rateMult: 0.5, bloc: true, sorties: 4, dotation: true },
  C6: { label: "sans toucher au débit : plafond de stock + Bloc + vivres (2 par acte) + dotation du Terrain", stock: [500, 250], bloc: true, sorties: 2, dotation: true },
  C5: { label: "C4, débit ×0,35", stock: [500, 250], reserveHours: H, rateMult: 0.35, bloc: true, sorties: 4, dotation: true }
};

/* Coût d'un niveau, avec l'option « bloc » : au Désert (niveaux qui demandent déjà un lingot
   ou de l'acier), la moitié des planches devient des blocs, à nombre égal. */
function costOf(id, level, sc) {
  var c = JSON.parse(JSON.stringify(BCOST[id][level] || {}));
  if (sc.bloc && (c.lingot || c.acier) && c.planche) {
    var half = Math.floor(c.planche / 2);
    c.planche -= half; c.bloc = (c.bloc || 0) + half;
  }
  return c;
}

/* ---------- Frise de l'Histoire ---------- */
var steps = [];
["forest", "desert"].forEach(function (ch) { G.STORY_QUESTS[ch].steps.forEach(function (s) { steps.push(s.id); }); });
var ACTS = G.TRAINING_CAP_BY_ACT.map(function (a, i) {
  var from = steps.indexOf(a.stepId), next = G.TRAINING_CAP_BY_ACT[i + 1];
  var to = next ? steps.indexOf(next.stepId) : steps.length;
  return { label: (a.worldIndex ? "Désert " : "Forêt ") + a.act, world: a.worldIndex, terrain: a.terrain, nSteps: to - from };
});
var MIN_PER_STEP = 203 / steps.length;
ACTS.forEach(function (a) { a.minutes = Math.round(a.nSteps * MIN_PER_STEP); });

var PROFILS = {
  traite: { label: "d'une traite (sans hors ligne)", daysPerAct: 0 },
  presse: { label: "pressé (2 actes par jour)", daysPerAct: 0.5 },
  quotidien: { label: "quotidien (1 acte par jour)", daysPerAct: 1 },
  tranquille: { label: "tranquille (1 acte tous les 2 jours)", daysPerAct: 2 }
};
function simulate(sc, profil) {
  var st = { res: {}, lv: {}, plots: {}, t: 0, active: 0, busyUntil: 0, world: 0, act: 0, goldSpent: 0, missingRations: 0, log: [] };
  RAW.concat(["planche", "lingot", "acier", "bloc"]).forEach(function (k) { st.res[k] = 0; });
  Object.keys(BCOST).forEach(function (id) { st.lv[id] = 0; });
  IDS.forEach(function (id) { st.plots[id] = null; });
  function prof(i) { return SH.profiles[SH.profilePattern[i]]; }
  function rate(i, p) { var pr = prof(i); var b = 1 + (p.f ? SH.bonusPerImprovement.fertile : 0) + (p.ir ? SH.bonusPerImprovement.irrigated : 0); return pr.baseRatePerMin * Math.pow(pr.rateGrowthPerLevel, p.l - 1) * b * (sc.rateMult || 1); }
  function cap(i, p) {
    if (sc.reserveHours) return rate(i, p) * 60 * sc.reserveHours[SH.profilePattern[i]];
    var pr = prof(i); return Math.floor(pr.baseCapacity * Math.pow(pr.capacityGrowthPerLevel, p.l - 1));
  }
  function stockCap() { return sc.stock[0] + sc.stock[1] * (st.lv.warehouse || 0); }
  function zonesMax() { return st.world ? 6 : 3; }
  function zoneLvlMax() { return st.world ? 5 : 3; }
  function advance(dt) {
    IDS.forEach(function (id) { (st.plots[id] || []).forEach(function (p, i) { p.s = Math.min(cap(i, p), p.s + rate(i, p) * dt); }); });
    st.t += dt;
  }
  function harvest() {
    IDS.forEach(function (id) { (st.plots[id] || []).forEach(function (p) {
      var n = Math.floor(p.s), k = KEY[id];
      if (sc.stock) {
        // au plafond, le joueur transforme ce qui peut l'être (planches, lingots, blocs : plafond 999)
        var conv = { bois: ["planche", 5], fer: ["lingot", 5], pierre: sc.bloc ? ["bloc", 6] : null }[k];
        if (conv && st.res[k] + n > stockCap()) {
          var q = Math.min(Math.floor((st.res[k] + n - stockCap()) / conv[1]), Math.max(0, 999 - st.res[conv[0]]));
          st.res[conv[0]] += q; n -= q * conv[1];
        }
        n = Math.max(0, Math.min(n, stockCap() - st.res[k]));
      }
      p.s -= n; st.res[k] += n;
    }); });
    invest();
  }
  // Transformations à la demande
  var REC = { planche: { bois: 5 }, lingot: { fer: 5 }, acier: { lingot: 3, bois: 6 }, bloc: { pierre: 6, fer: 2 } };
  function have(k, n) {
    if (st.res[k] >= n) return true;
    if (!REC[k]) return ["resine_durcie", "verre_trempe", "seve_aeswyn"].indexOf(k) !== -1;
    var miss = n - st.res[k];
    return Object.keys(REC[k]).every(function (r) { return have(r, REC[k][r] * miss); });
  }
  function take(k, n) {
    if (["resine_durcie", "verre_trempe", "seve_aeswyn"].indexOf(k) !== -1) return;
    if (st.res[k] < n) { var miss = n - st.res[k]; Object.keys(REC[k]).forEach(function (r) { take(r, REC[k][r] * miss); }); st.res[k] += miss; }
    st.res[k] -= n;
  }
  function afford(c) {
    // vérifie l'ensemble (les sous-recettes partagent le bois et le fer)
    var snap = JSON.stringify(st.res), ok = true;
    try { Object.keys(c).forEach(function (k) { if (k === "gold") return; if (!have(k, c[k])) ok = false; else take(k, c[k]); }); } finally { st.res = JSON.parse(snap); }
    return ok;
  }
  function pay(c) { Object.keys(c).forEach(function (k) { if (k === "gold") st.goldSpent += c[k]; else take(k, c[k]); }); }
  function woodEq(c) { return (c.bois || 0) + (c.planche || 0) * 5 + (c.pierre || 0) + (c.fer || 0) + (c.eau || 0) + (c.bloc || 0) * 8 + (c.lingot || 0) * 5; }
  function bCap(id) {
    var c = G.WORLD_CAPS[st.world].village[id] || 0;
    if (id === "training") c = Math.min(c, ACTS[st.act].terrain);
    return Math.min(c, BCOST[id].length);
  }
  function rankOk(id) { var r = VB[id].rank || 0; return r === 0 || Math.min(4, st.lv.workshop) >= G.VILLAGE_RANK_THRESHOLDS[r - 1]; }
  function tryBuild(id) {
    if (st.t < st.busyUntil || st.lv[id] >= bCap(id) || !rankOk(id)) return false;
    var c = costOf(id, st.lv[id], sc);
    if (!afford(c)) return false;
    pay(c); st.lv[id] += 1; st.busyUntil = st.t + G.getVillageBuildSeconds(st.lv[id]) / 60;
    return true;
  }
  function zoneOptions() {
    var out = [];
    IDS.forEach(function (id) {
      var ps = st.plots[id]; if (!ps) return;
      for (var i = 0; i < zonesMax(); i++) {
        var p = ps[i];
        if (!p) { out.push({ c: G.getProductionPlotUnlockCost(id, i) || {}, go: (function (id, i) { return function () { st.plots[id][i] = { l: 1, s: 0, f: false, ir: false }; }; })(id, i) }); break; }
        if (p.l < zoneLvlMax()) out.push({ c: G.getProductionPlotUpgradeCost(id, p.l, i), go: (function (p) { return function () { p.l += 1; }; })(p) });
        else if (!p.f) out.push({ c: PB[id].improvementCost.fertile.cost, go: (function (p) { return function () { p.f = true; }; })(p) });
        else if (!p.ir) out.push({ c: PB[id].improvementCost.irrigated.cost, go: (function (p) { return function () { p.ir = true; }; })(p) });
      }
    });
    return out;
  }
  function invest() {
    for (var guard = 0; guard < 200; guard++) {
      // 1. chemin de l'Histoire : Terrain au plafond de l'acte, Atelier pour son rang, Forge au Désert
      if (tryBuild("training")) continue;
      if (st.lv.training < bCap("training") && !rankOk("training") && tryBuild("workshop")) continue;
      if (st.world && tryBuild("forge")) continue;
      if (sc.stock && st.res.bois + st.res.pierre >= stockCap() && tryBuild("warehouse")) continue; // stock plein : Entrepôt d'abord
      // 2. le reste, le moins cher d'abord (zones et bâtiments) — sans entamer ce que le
      //    prochain niveau du chemin de l'Histoire demande (réserve)
      var crit = null;
      if (st.lv.training < bCap("training")) crit = rankOk("training") ? costOf("training", st.lv.training, sc) : costOf("workshop", st.lv.workshop, sc);
      else if (st.world && st.lv.forge < bCap("forge") && rankOk("forge")) crit = costOf("forge", st.lv.forge, sc);
      function affordWith(c) {
        if (!crit) return afford(c);
        var both = JSON.parse(JSON.stringify(crit));
        Object.keys(c).forEach(function (k) { both[k] = (both[k] || 0) + c[k]; });
        return afford(both);
      }
      var best = null;
      zoneOptions().forEach(function (o) { if (afford(o.c) && (!best || woodEq(o.c) < woodEq(best.c))) best = o; });
      Object.keys(BCOST).forEach(function (id) {
        if (st.t < st.busyUntil || st.lv[id] >= bCap(id) || !rankOk(id)) return;
        var c = costOf(id, st.lv[id], sc);
        if (affordWith(c) && (!best || woodEq(c) < woodEq(best.c))) best = { c: c, go: function () { st.lv[id] += 1; st.busyUntil = st.t + G.getVillageBuildSeconds(st.lv[id]) / 60; }, b: true };
      });
      if (!best) return;
      pay(best.c); best.go();
    }
  }
  function openBuildings() {
    IDS.forEach(function (id) {
      if (st.plots[id] || st.active < UNLOCK_MIN[id]) return;
      st.plots[id] = [{ l: 1, s: 0, f: false, ir: false }];
      Object.keys(G.PRODUCTION_UNLOCK_GIFT || {}).forEach(function (k) { st.res[k] += G.PRODUCTION_UNLOCK_GIFT[k]; }); // dotation d'ouverture
    });
  }
  function eatRations() {
    var n = sc.sorties || 0;
    for (var k = 0; k < n; k++) {
      var c = st.world ? { viande: 50, ble: 15, eau: 5 } : { viande: 8, eau: 4 };
      if (afford(c)) pay(c); else st.missingRations += 1;
    }
  }
  var report = [];
  function session(minutes) { for (var m = 0; m < minutes; m += 10) { var d = Math.min(10, minutes - m); advance(d); st.active += d; openBuildings(); harvest(); } }
  function visitAfter(minutes) { advance(minutes); harvest(); }

  ACTS.forEach(function (a, ai) {
    st.act = ai; st.world = a.world;
    var t0 = st.t;
    eatRations();
    if (sc.dotation) {   // les matériaux du Terrain de l'acte sont offerts : on le compte construit (l'or reste dû)
      for (var l = st.lv.training; l < a.terrain; l++) st.goldSpent += Number(BCOST.training[l].gold || 0);
      st.lv.training = Math.max(st.lv.training, a.terrain);
      if (st.lv.workshop < 1) st.lv.workshop = 1;
    }
    var P = PROFILS[profil];
    session(a.minutes);
    if (P.daysPerAct > 0) {   // le reste du temps de l'acte : 3 visites par jour
      var rest = P.daysPerAct * 1440 - a.minutes, n = Math.max(1, Math.round(3 * P.daysPerAct) - 1);
      for (var v = 0; v < n; v++) visitAfter(rest / n);
    }
    report.push({ act: a.label, terrain: st.lv.training, cap: a.terrain, t: st.t - t0 });
    if (process.env.DBG) console.log(profil, a.label, JSON.stringify(st.lv), JSON.stringify(st.res), "zones", IDS.map(function (id) { return (st.plots[id] || []).length; }).join(""), "busy", (st.busyUntil - st.t).toFixed(0));
  });
  // Après l'Histoire : 3 visites par jour jusqu'à la fin du village du Désert (60 jours au plus)
  var endStory = st.t, days = null, stockEnd = JSON.parse(JSON.stringify(st.res));
  function villageDone() {
    var b = Object.keys(BCOST).every(function (id) { return st.lv[id] >= bCap(id); });
    var z = IDS.every(function (id) { var ps = st.plots[id] || []; return ps.length >= 6 && ps.slice(0, 6).every(function (p) { return p && p.l >= 5 && p.f && p.ir; }); });
    return b && z;
  }
  var doneAtStory = villageDone();
  for (var d = 0; d < 60 && !villageDone(); d++) { visitAfter(480); visitAfter(480); visitAfter(480); }
  days = villageDone() ? (st.t - endStory) / 1440 : null;
  // surplus 10 jours après la fin du village (3 visites/jour), revendu
  for (var e = 0; e < 10; e++) { visitAfter(480); visitAfter(480); visitAfter(480); }
  var price = function (k) { return Number((G.WAREHOUSE_RESOURCES[k] || {}).sellPrice || 0); };
  var surplus10 = RAW.reduce(function (s, k) { return s + st.res[k]; }, 0);
  var or10 = RAW.reduce(function (s, k) { return s + st.res[k] * price(k); }, 0);
  return { report: report, doneAtStory: doneAtStory, days: days, stockEnd: stockEnd, surplus10: surplus10, or10: or10, gold: st.goldSpent, missingRations: st.missingRations, res10: st.res };
}

var only = arg("scen", null), detail = arg("detail", false);
console.log("VILLAGE PAR ACTE — frise de Mar (" + steps.length + " étapes, 203 min), " + ACTS.map(function (a) { return a.label + " " + a.minutes + " min"; }).join(" · ") + "\n");
Object.keys(SCEN).forEach(function (k) {
  if (only && k !== only) return;
  var sc = SCEN[k];
  console.log(k + " — " + sc.label);
  Object.keys(PROFILS).forEach(function (pf) {
    var r = simulate(sc, pf);
    var late = r.report.filter(function (x) { return x.terrain < x.cap; }).map(function (x) { return x.act + " " + x.terrain + "/" + x.cap; });
    console.log("   " + pf.padEnd(10) + "Terrain au plafond à la fin de chaque acte : " + (late.length ? "NON (" + late.join(", ") + ")" : "oui")
      + " · village fini " + (r.doneAtStory ? "pendant l'Histoire" : (r.days != null ? r.days.toFixed(1) + " j après" : "pas en 60 j"))
      + " · rations manquées " + r.missingRations);
    console.log("   " + "".padEnd(10) + "stock brut à la fin de l'Histoire : " + RAW.map(function (x) { return x + " " + fmt(r.stockEnd[x]); }).join(", "));
    console.log("   " + "".padEnd(10) + "10 jours après le village : " + fmt(r.surplus10) + " unités en trop (" + fmt(r.or10) + " or à la revente)");
  });
  console.log("");
});
if (arg("terrain", false)) {
  console.log("Coût du Terrain par acte (niveaux ouverts par l'acte) :");
  var prev = 0;
  ACTS.forEach(function (a) {
    var c = {};
    for (var l = prev; l < a.terrain; l++) Object.keys(BCOST.training[l]).forEach(function (k) { c[k] = (c[k] || 0) + BCOST.training[l][k]; });
    console.log("   " + a.label.padEnd(12) + "niv. " + prev + " → " + a.terrain + " : " + JSON.stringify(c));
    prev = Math.max(prev, a.terrain);
  });
}
