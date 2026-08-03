"use strict";
/* ============================================================
QUEST IDLE — data/upgrades.js
Deux boutiques distinctes :
  - UPGRADES    achats en or, dispo dès le début (voir shop-view.js
                pour l'écran "Boutique"). `apply(lvl)` est appelée
                à chaque achat avec le NIVEAU TOTAL (pas juste +1),
                donc chaque apply() doit fixer la valeur finale.
  - AETHER_SHOP achats en Aether (monnaie de prestige de l'ascension),
                voir ascension-view.js pour l'écran "Boutique d'Aether"
                et getAetherBonuses() en stats-system.js pour l'effet
                réel (contrairement à UPGRADES, ces items n'ont pas de
                fonction apply : leurs bonus sont calculés à la volée
                à partir du niveau, dans getAetherBonuses()).
unlockWorld = index de monde minimum pour que l'amélioration apparaisse
dans la boutique (0 = dispo depuis le début).
============================================================ */

var UPGRADES = [
  {
    id: "utrain_power",
    name: "Terrain d'entraînement (Force)",
    icon: "💪",
    desc: "+1 Force par niveau (augmente les dégâts de tap).",
    baseCost: 15,
    costMult: 1.20,
    maxLevel: 400,
    unlockWorld: 0,
    apply: function(lvl) {
      game.trainedStats.power = lvl;
    }
  },
  {
    id: "utrain_celerity",
    name: "Terrain d'entraînement (Célérité)",
    icon: "⚡",
    desc: "+1 Célérité par niveau (augmente l'auto DPS).",
    baseCost: 45,
    costMult: 1.24,
    maxLevel: 320,
    unlockWorld: 0,
    apply: function(lvl) {
      game.trainedStats.celerity = lvl;
    }
  },
  {
    id: "utrain_precision",
    name: "Terrain d'entraînement (Précision)",
    icon: "🎯",
    desc: "+1 Précision par niveau (augmente la chance de critique).",
    baseCost: 50,
    costMult: 1.24,
    maxLevel: 100,
    unlockWorld: 0,
    apply: function(lvl) {
      game.trainedStats.precision = lvl;
    }
  },
  {
    id: "utrain_will",
    name: "Terrain d'entraînement (Volonté)",
    icon: "✨",
    desc: "+1 Volonté par niveau (améliore les critiques).",
    baseCost: 60,
    costMult: 1.26,
    maxLevel: 130,
    unlockWorld: 0,
    apply: function(lvl) {
      game.trainedStats.will = lvl;
    }
  },
  {
    id: "utrain_endurance",
    name: "Terrain d'entraînement (Endurance)",
    icon: "🛡️",
    desc: "+1 Endurance par niveau (augmente les PV du héros).",
    baseCost: 60,
    costMult: 1.26,
    maxLevel: 200,
    unlockWorld: 0,
    apply: function(lvl) {
      game.trainedStats.endurance = lvl;
    }
  },
  {
    id: "u_gold",
    name: "Bourse lourde",
    icon: "💰",
    desc: "+3% or gagné par niveau.",
    baseCost: 55,
    costMult: 1.23,
    maxLevel: 200,
    unlockWorld: 0,
    apply: function (lvl) { game.goldMult = 1 + lvl * 0.03; }
  },
    {
    id: "u_bounty",
    name: "Contrats lucratifs",
    icon: "📜",
    desc: "+10% or sur boss par niveau.",
    baseCost: 260,
    costMult: 1.34,
    maxLevel: 50,
    unlockWorld: 2,
    apply: function (lvl) { game.goldMult = (game.goldMult || 1) + lvl * 0.10; }
  }
];

function getUpgradeById(id) {
  for (var i = 0; i < UPGRADES.length; i++) {
    if (UPGRADES[i].id === id) return UPGRADES[i];
  }
  return null;
}

/* getUpgradeCost() est définie dans systems/progression-system.js. */

var AETHER_SHOP = [
  { id: "a_tap", name: "Puissance ancestrale", icon: "⚔️", desc: "+10% dégâts de tap globaux par niveau.", baseCost: 1, costMult: 1.9, maxLevel: 20 },
  { id: "a_gold", name: "Fortune astrale", icon: "💰", desc: "+10% or global par niveau.", baseCost: 1, costMult: 1.9, maxLevel: 20 },
  { id: "a_loot", name: "Main du destin", icon: "🎁", desc: "+3% chance de loot boss par niveau.", baseCost: 2, costMult: 2.1, maxLevel: 15 },
  { id: "a_essence", name: "Noyau d'essence", icon: "🔮", desc: "+1 essence boss tous les 2 niveaux.", baseCost: 2, costMult: 2.2, maxLevel: 12 }
];

/* getAetherUpgradeCost() est définie dans systems/stats-system.js. */

function getAetherUpgradeById(id) {
  return (AETHER_SHOP || []).find(function (u) {
    return u.id === id;
  }) || null;
}