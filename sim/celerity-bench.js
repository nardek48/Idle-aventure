"use strict";
/* sim/celerity-bench.js — mesure la célérité TOTALE du héros et la fréquence des
   frappes bonus, monde par monde, en chargeant les vraies tables du jeu.
   Usage : node sim/celerity-bench.js <racine> */
var fs = require("fs"), path = require("path"), vm = require("vm");
var ROOT = process.argv[2] || ".";

var FILES = [
  "js/core/constants.js", "js/data/heroes.js", "js/data/equipment.js"
];

var sandbox = {
  console: console, Math: Math, JSON: JSON, Object: Object, Array: Array,
  Number: Number, String: String, Boolean: Boolean, Date: Date
};
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
FILES.forEach(function (f) {
  var p = path.join(ROOT, f);
  if (!fs.existsSync(p)) return;
  try { vm.runInContext(fs.readFileSync(p, "utf8"), sandbox, { filename: f }); }
  catch (e) { console.error("LOAD FAIL", f, e.message); }
});

var SLOT_CFG = sandbox.EQUIPMENT_SLOT_CONFIG;
var SCALE = sandbox.EQUIP_WORLD_SCALE;
var AFFIX = sandbox.AFFIX_VALUE_RANGES || null;

/* Célérité = stat "autoDps". Quels emplacements peuvent en porter ? */
var CELERITY_SLOTS = [];
Object.keys(SLOT_CFG).forEach(function (slot) {
  if (SLOT_CFG[slot].stat === "autoDps") CELERITY_SLOTS.push(slot);
});

var WORLD_NAMES = ["Forêt", "Désert", "Ruines", "Crypte", "Montagne", "Tour"];
var RARITIES = ["common", "green", "rare", "epic", "legendary"];

/* Rareté plausible par monde (la meilleure couramment portée). */
var TYPICAL_RARITY = ["green", "rare", "rare", "epic", "epic", "legendary"];

function midRange(r) { return (r[0] + r[1]) / 2; }

console.log("=== Célérité : sources et jauge ===");
console.log("Emplacements portant la célérité (stat autoDps) en primaire :", CELERITY_SLOTS.join(", "));
console.log("EQUIP_WORLD_SCALE :", SCALE.join(" · "));
console.log("");

/* Base de classe */
var HERO_BASE = {};
(sandbox.HEROES_DB || sandbox.HEROES || []).forEach(function (h) {
  if (h && h.stats) HERO_BASE[h.id || h.name] = h.stats.celerity;
});
console.log("Célérité de base par héros :", JSON.stringify(HERO_BASE));
console.log("");

var GAUGE_MAX = 100;

console.log("Monde        | rareté     | bottes | autres prim. | total équip | +base 32 | jauge/action | frappes bonus par action");
console.log("-------------|------------|--------|--------------|-------------|----------|--------------|-------------------------");

for (var w = 0; w < 6; w++) {
  var rar = TYPICAL_RARITY[w];
  var scale = SCALE[w];

  var bootsVal = midRange(SLOT_CFG.boots.ranges[rar]) * scale;

  /* Les autres emplacements dont autoDps est dans la liste primaire :
     un tirage sur trois environ tombe sur autoDps (3 stats primaires possibles). */
  var otherPrimary = 0;
  ["armor", "gloves"].forEach(function (slot) {
    var cfg = SLOT_CFG[slot];
    if (!cfg) return;
    var prim = (sandbox.AFFIX_POOLS && sandbox.AFFIX_POOLS[slot]) ? sandbox.AFFIX_POOLS[slot].primary : null;
    if (!prim || prim.indexOf("autoDps") === -1) return;
    /* espérance : 1 chance sur (nb de stats primaires) que ce soit autoDps */
    var cfgRange = (sandbox.AFFIX_RANGES && sandbox.AFFIX_RANGES.autoDps)
      ? sandbox.AFFIX_RANGES.autoDps[rar] : null;
    var nAffix = (sandbox.AFFIX_COUNT_BY_RARITY && sandbox.AFFIX_COUNT_BY_RARITY[rar])
      ? sandbox.AFFIX_COUNT_BY_RARITY[rar].primary : 0;
    if (cfgRange) otherPrimary += midRange(cfgRange) * scale * (nAffix / prim.length);
  });

  var totalEquip = bootsVal + otherPrimary;
  var base = 32; // Chevalier
  var total = base + totalEquip;
  var strikesPerAction = total / GAUGE_MAX;

  console.log(
    (WORLD_NAMES[w] + "            ").slice(0, 12) + " | " +
    (rar + "          ").slice(0, 10) + " | " +
    bootsVal.toFixed(0).padStart(6) + " | " +
    otherPrimary.toFixed(0).padStart(12) + " | " +
    totalEquip.toFixed(0).padStart(11) + " | " +
    total.toFixed(0).padStart(8) + " | " +
    total.toFixed(0).padStart(12) + " | " +
    strikesPerAction.toFixed(2).padStart(24)
  );
}

console.log("");
console.log("Lecture : « jauge/action » est le gain de jauge par action offensive,");
console.log("à comparer au plafond de " + GAUGE_MAX + ". Au-delà de 100, la jauge se remplit");
console.log("intégralement à CHAQUE action : une frappe bonus systématique.");
