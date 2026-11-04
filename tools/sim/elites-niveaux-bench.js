"use strict";
/* tools/sim/elites-niveaux-bench.js — v3.657.0 : jusqu'à quel niveau une élite de carte reste jouable, par classe et par monde
   (pronostic du jeu sur des sauvegardes réelles du robot). Usage : node tools/sim/elites-niveaux-bench.js . save1.json [save2.json …]
   Tête reprise de patrouille-bench.js (v3.334.0) : le rendement des patrouilles,
   comparé à ce qu'un joueur actif gagne par jour. Lit les vraies données du jeu.

   MODÈLE D'UNE JOURNÉE ACTIVE (hypothèses, réglables) :
   - matériaux : le joueur passe --visites fois par jour et vide des réserves pleines
     (zones au plafond du monde, améliorées ; la production continue n'est pas atteinte) ;
   - or : la Taverne à son plafond de monde, tous les contrats livrés à chaque renouvellement
     (6 h). Ne compte ni l'Histoire, ni les combats : dénominateur prudent, le vrai ratio
     d'or est plus bas ;
   - patrouilles : --heures par jour et par compagnon (8 h la nuit + 4 h = 12), compagnons
     présents dans ce monde (Forêt : Wenna ; Désert : Wenna et Maddoc), anneau moyen,
     --ameliorations moyennes.
   CIBLE (conception P5) : ~15 % des matériaux, au plus 10 % de l'or.
   USAGE : node tools/sim/patrouille-bench.js . [--visites 4] [--heures 12] [--ameliorations 2] */
var fs = require("fs"), path = require("path"), vm = require("vm");
var ROOT = require("../chemins.js").jeu(process.argv[2]);
function arg(name, def) { var i = process.argv.indexOf(name); return i > 0 ? Number(process.argv[i + 1]) : def; }
var VISITES = arg("--visites", 4), HEURES = arg("--heures", 12), UPG = arg("--ameliorations", 2);
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


var G = sandbox;
vm.runInContext("fullResetState(); game.playerName='Bench'; game.heroId='knight';", G);
var S = G.PRODUCTION_PLOTS_SHARED, CAPS = G.WORLD_CAPS, R = G.WAREHOUSE_RESOURCES;
function fmt(n) { return Math.round(n).toLocaleString("fr-FR"); }

/* Réserve pleine d'un bâtiment : n zones au niveau lvl (même formule que revente-bench). */
function reserve(n, lvl) {
  var cap = 0;
  for (var i = 0; i < n; i++) {
    var pr = S.profiles[S.profilePattern[i]];
    cap += Math.floor(pr.baseCapacity * Math.pow(pr.capacityGrowthPerLevel, lvl - 1));
  }
  return cap;
}

/* Or de la Taverne par jour, au plafond du monde, tout livré. */
function tavernGoldPerDay(level) {
  var TM = G.TavernManager, tier = TM.getTemplateTier(level), slots = TM.getSlotCount(level);
  var pool = G.TAVERN_CONTRACT_TEMPLATES.filter(function (t) { return t.tier <= tier && Number((R[t.resourceId] || {}).sellPrice || 0) > 0; });
  var avg = pool.reduce(function (s, t) { return s + TM.getRewardFor(t.resourceId, (t.min + t.max) / 2); }, 0) / pool.length;
  return avg * slots * (24 * 3600e3 / G.TAVERN_REFRESH_MS);
}


var fsx = require("fs"), files = process.argv.slice(3);
var OKS = { trivial: 1, abordable: 1 }, LIM = 60;
files.forEach(function (f) {
  var save = JSON.parse(fsx.readFileSync(f, "utf8"));
  G.restoreBaseState(save);
  if (typeof G.reapplyProgressEffects === "function") G.reapplyProgressEffects();
  G.StatsSystem.recalcStats();
  var LM = G.LivingMapManager, rows = [];
  Object.keys(G.LIVING_MAPS).forEach(function (mapId) {
    var map = G.LIVING_MAPS[mapId];
    (map.sectors || []).forEach(function (d) {
      if (!LM.isRepeatable(mapId, d.id)) return;
      var st = LM.getState(mapId, d.id); if (st) { st.dailyWins = 0; st.dailyKey = null; }
      var safe = 0, risky = 0;
      for (var L = 1; L <= LIM; L++) {
        var fc = G.CombatForecast.forMapElite(mapId, d.id, d.content.eliteId, L);
        if (!fc) break;
        if (OKS[fc.id]) safe = L;
        if (fc.id !== "tresdur" && fc.id !== "horsportee") risky = L; else break;
      }
      rows.push(mapId + "/" + d.content.eliteId + " : sûr " + safe + " (" + LM.getRepeatRewardAt(mapId, Math.max(1, safe)) + "/vict.), risqué " + risky + " (" + LM.getRepeatRewardAt(mapId, Math.max(1, risky)) + ")");
    });
  });
  console.log("== " + require("path").basename(f) + " · monde " + G.WorldManager.worldIndex + " · niv. " + G.game.heroLevel);
  rows.forEach(function (r) { console.log("   " + r); });
});
