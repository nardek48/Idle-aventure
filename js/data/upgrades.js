"use strict";
/* ============================================================
QUEST IDLE — data/upgrades.js
Améliorations classiques et boutique d'Aether.
============================================================ */

/* Colle ici ton tableau UPGRADES exactement tel qu'il existe dans data.js */
var UPGRADES = [
  { id: "u_tap", name: "Force du héros", icon: "⚔️", desc: "+1 dégâts de tap par niveau.", baseCost: 15, costMult: 1.18, maxLevel: 250, unlockWorld: 0, apply: function (lvl) { game.tapDamage = 1 + lvl; } },
  { id: "u_auto", name: "Compagnon d'armes", icon: "🤖", desc: "+1 DPS auto par niveau.", baseCost: 45, costMult: 1.22, maxLevel: 200, unlockWorld: 0, apply: function (lvl) { game.autoDps = lvl; } },
  { id: "u_crit", name: "Précision affûtée", icon: "🎯", desc: "+0.5% critique par niveau.", baseCost: 50, costMult: 1.22, maxLevel: 60, unlockWorld: 0, apply: function (lvl) { game.critChance = 5 + lvl * 0.5; } },
  { id: "u_gold", name: "Bourse lourde", icon: "💰", desc: "+3% or gagné par niveau.", baseCost: 55, costMult: 1.21, maxLevel: 120, unlockWorld: 0, apply: function (lvl) { game.goldMult = 1 + lvl * 0.03; } },
  { id: "u_tap_mult", name: "Frappe maîtrisée", icon: "💥", desc: "+10% multiplicateur de tap par niveau.", baseCost: 100, costMult: 1.28, maxLevel: 50, unlockWorld: 1, apply: function (lvl) { game.tapMult = 1 + lvl * 0.10; } },
  { id: "u_crit_mult", name: "Exécution", icon: "🩸", desc: "+10% multiplicateur critique par niveau.", baseCost: 150, costMult: 1.27, maxLevel: 40, unlockWorld: 1, apply: function (lvl) { game.critMult = 2 + lvl * 0.10; } },
  { id: "u_auto_mult", name: "Machine de guerre", icon: "⚙️", desc: "+18% DPS auto final par niveau.", baseCost: 190, costMult: 1.33, maxLevel: 40, unlockWorld: 2, apply: function (lvl) { game.autoDps = (game.autoDps || 0) * (1 + lvl * 0.18); } },
  { id: "u_bounty", name: "Contrats lucratifs", icon: "📜", desc: "+10% or sur boss par niveau.", baseCost: 260, costMult: 1.32, maxLevel: 30, unlockWorld: 2, apply: function (lvl) { game.goldMult = (game.goldMult || 1) + lvl * 0.10; } }
];

function getUpgradeById(id) {
  for (var i = 0; i < UPGRADES.length; i++) {
    if (UPGRADES[i].id === id) return UPGRADES[i];
  }
  return null;
}

function getUpgradeCost(upgrade) {
  var lvl = game.upgrades[upgrade.id] || 0;
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMult, lvl));
}

/* Colle ici ton tableau AETHER_SHOP exactement tel qu'il existe dans data.js */
var AETHER_SHOP = [
  { id: "a_tap", name: "Puissance ancestrale", icon: "⚔️", desc: "+10% dégâts de tap globaux par niveau.", baseCost: 1, costMult: 1.9, maxLevel: 20 },
  { id: "a_gold", name: "Fortune astrale", icon: "💰", desc: "+10% or global par niveau.", baseCost: 1, costMult: 1.9, maxLevel: 20 },
  { id: "a_loot", name: "Main du destin", icon: "🎁", desc: "+3% chance de loot boss par niveau.", baseCost: 2, costMult: 2.1, maxLevel: 15 },
  { id: "a_essence", name: "Noyau d'essence", icon: "🔮", desc: "+1 essence boss tous les 2 niveaux.", baseCost: 2, costMult: 2.2, maxLevel: 12 }
];

function getAetherUpgradeById(id) {
  for (var i = 0; i < AETHER_SHOP.length; i++) {
    if (AETHER_SHOP[i].id === id) return AETHER_SHOP[i];
  }
  return null;
}

function getAetherUpgradeCost(upgrade) {
  var lvl = game.aetherUpgrades[upgrade.id] || 0;
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMult, lvl));
}

function getAetherUpgradeById(id) {
  return (AETHER_SHOP || []).find(function (u) {
    return u.id === id;
  }) || null;
}