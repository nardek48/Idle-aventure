"use strict";
/* systems/loot-system.js — génération procédurale des drops (kill de boss uniquement). Détail complet : COMMENTAIRES_ORIGINAUX.md */

function generateEquipmentItem(slot, rarity) {
  var config = EQUIPMENT_SLOT_CONFIG[slot];
  if (!config) return null;

  var range = config.ranges[rarity] || config.ranges.common;
  var raw = randFloat(range[0], range[1]);
  var decimals = config.decimals || 0;
  var factor = Math.pow(10, decimals);
  var value = Math.round(raw * factor) / factor;

  // Arme : restreint l'icône aux types compatibles avec la classe du héros actif (un archer ne trouve pas de bâton).
  var iconPool = config.icons;
  if (slot === "weapon" && typeof getAllowedWeaponIconsForCurrentHero === "function") {
    var allowedIcons = getAllowedWeaponIconsForCurrentHero();
    if (Array.isArray(allowedIcons) && allowedIcons.length) iconPool = allowedIcons;
  }

  var icon = iconPool[randInt(0, iconPool.length - 1)];
  var namePool = (config.namesByIcon && config.namesByIcon[icon]) || config.names;
  var name = namePool[randInt(0, namePool.length - 1)];

  return {
    uid: "itm_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8),
    slot: slot,
    name: name,
    icon: icon,
    rarity: rarity,
    stat: config.stat,
    value: value
  };
}

function getAllowedRarities() {
  var worldIndex = (window.WorldManager && WorldManager.worldIndex) || 0;
  var towerQuestDone = !!(window.WorldQuestManager && WorldQuestManager.isWorldUnlocked(5));
  var isCycling = (game.cycleCount || 0) > 0 && towerQuestDone;
  var maxTier = WORLD_RARITY_UNLOCKS.length - 1;
  var tierIndex = isCycling ? maxTier : Math.min(Math.max(0, worldIndex), maxTier);
  return WORLD_RARITY_UNLOCKS[tierIndex] || ["common"];
}

var LootSystem = {
  rollDrop: function () {
    var slot = EQUIPMENT_SLOTS[randInt(0, EQUIPMENT_SLOTS.length - 1)];

    var allowed = getAllowedRarities();
    var weights = allowed.map(function (r) { return RARITY_DROP_RATES[r] || 0; });
    var totalWeight = weights.reduce(function (a, b) { return a + b; }, 0);

    if (totalWeight <= 0) {
      allowed = ["common"];
      weights = [1];
      totalWeight = 1;
    }

    var roll = Math.random() * totalWeight;
    var rarity = allowed[allowed.length - 1];
    var acc = 0;
    for (var i = 0; i < allowed.length; i++) {
      acc += weights[i];
      if (roll < acc) {
        rarity = allowed[i];
        break;
      }
    }

    return generateEquipmentItem(slot, rarity);
  },

  rollDropAtRarity: function (rarity) {
    var slot = EQUIPMENT_SLOTS[randInt(0, EQUIPMENT_SLOTS.length - 1)];
    return generateEquipmentItem(slot, rarity);
  }
};

window.LootSystem = LootSystem;
window.generateEquipmentItem = generateEquipmentItem;
window.getAllowedRarities = getAllowedRarities;
