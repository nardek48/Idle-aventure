"use strict";
/* ============================================================
Quest Idle — systems/loot-system.js
Drop generation only
============================================================ */

function cloneItem(template, slot) {
  return {
    uid: "itm_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8),
    slot: slot,
    name: template.name,
    icon: template.icon,
    rarity: template.rarity,
    stat: template.stat,
    value: template.value
  };
}

var LootSystem = {
  rollDrop: function () {
    var slot = ["weapon", "armor", "amulet"][randInt(0, 2)];
    var pool = EQUIPMENT_DB[slot] || [];
    if (!pool.length) return null;

    var roll = Math.random() * 100;
    var rarity;

    if (roll < (RARITY_DROP_RATES.common || 0)) rarity = "common";
    else if (roll < (RARITY_DROP_RATES.common || 0) + (RARITY_DROP_RATES.rare || 0)) rarity = "rare";
    else if (roll < (RARITY_DROP_RATES.common || 0) + (RARITY_DROP_RATES.rare || 0) + (RARITY_DROP_RATES.epic || 0)) rarity = "epic";
    else rarity = "legendary";

    if (game.talents.t_lucky_find && rarity === "common" && chance(20)) {
      rarity = "rare";
    }

    var candidates = pool.filter(function (item) {
      return item.rarity === rarity;
    });

    if (!candidates.length) candidates = pool;
    return cloneItem(candidates[randInt(0, candidates.length - 1)], slot);
  }
};

window.LootSystem = LootSystem;
window.cloneItem = cloneItem;