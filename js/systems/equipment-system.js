"use strict";
/* ============================================================
Quest Idle — systems/equipment-system.js
Inventory actions, equip/unequip/sell, inventory sorting
============================================================ */

function getEquipmentSellValue(item) {
  if (!item) return 0;
  return item.rarity === "legendary" ? 1000 :
         item.rarity === "epic" ? 200 :
         item.rarity === "rare" ? 50 : 10;
}

var EquipmentSystem = {
  equip: function (uid) {
    var index = (game.inventory || []).findIndex(function (item) {
      return item.uid === uid;
    });

    if (index === -1) return;

    var item = game.inventory[index];
    if (!item || !item.slot || !game.equipped) return;

    var previous = game.equipped[item.slot];
    if (previous) {
      game.inventory.push(previous);
    }

    game.equipped[item.slot] = item;
    game.inventory.splice(index, 1);

    if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") {
      StatsSystem.recalcStats();
    }

    addLog("Équipé : " + item.name, "event");
    if (typeof renderAll === "function") renderAll();
    saveGame();
  },

  unequip: function (slot) {
    if (!game.equipped || !game.equipped[slot]) return;

    var item = game.equipped[slot];
    game.inventory.push(item);
    game.equipped[slot] = null;

    if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") {
      StatsSystem.recalcStats();
    }

    addLog("Retiré : " + item.name, "event");
    if (typeof renderAll === "function") renderAll();
    saveGame();
  },

  sell: function (uid) {
    var index = (game.inventory || []).findIndex(function (item) {
      return item.uid === uid;
    });

    if (index === -1) return;

    var item = game.inventory[index];
    var value = getEquipmentSellValue(item);

    game.inventory.splice(index, 1);
    game.gold += value;
    game.totalGoldEarned += value;

    addLog("Objet vendu : " + item.name + " (+" + value + " or)", "event");

    if (window.QuestManager && typeof QuestManager.track === "function") {
      QuestManager.track("goldEarned", value);
    }

    if (typeof renderAll === "function") renderAll();
    saveGame();
  },

  sortInventoryByRarity: function () {
    if (!Array.isArray(game.inventory)) game.inventory = [];

    var order = typeof RARITY_ORDER !== "undefined"
      ? RARITY_ORDER
      : ["common", "rare", "epic", "legendary"];

    game.inventory.sort(function (a, b) {
      var ra = order.indexOf(a.rarity);
      var rb = order.indexOf(b.rarity);

      if (ra !== rb) return ra - rb;
      if ((a.slot || "") !== (b.slot || "")) {
        return String(a.slot || "").localeCompare(String(b.slot || ""));
      }

      return String(a.name || "").localeCompare(String(b.name || ""));
    });

    if (typeof renderPanel === "function") renderPanel();
    saveGame();
  },

    sortInventoryByType: function () {
    if (!Array.isArray(game.inventory)) game.inventory = [];

    var slotOrder = ["weapon", "armor", "amulet"];

    game.inventory.sort(function (a, b) {
      var sa = slotOrder.indexOf(a.slot);
      var sb = slotOrder.indexOf(b.slot);

      if (sa === -1) sa = 999;
      if (sb === -1) sb = 999;
      if (sa !== sb) return sa - sb;

      var order = typeof RARITY_ORDER !== "undefined"
        ? RARITY_ORDER
        : ["common", "rare", "epic", "legendary"];

      var ra = order.indexOf(a.rarity);
      var rb = order.indexOf(b.rarity);

      if (ra !== rb) return ra - rb;

      return String(a.name || "").localeCompare(String(b.name || ""));
    });

    if (typeof renderPanel === "function") renderPanel();
    saveGame();
  },

  sellAllInventory: function () {
    if (!Array.isArray(game.inventory) || !game.inventory.length) {
      showToast("Aucun objet à vendre", 1200);
      return;
    }

    var soldCount = game.inventory.length;
    var goldGain = game.inventory.reduce(function (sum, item) {
      return sum + getEquipmentSellValue(item);
    }, 0);

    game.inventory = [];
    game.gold += goldGain;
    game.totalGoldEarned += goldGain;

    if (window.QuestManager && typeof QuestManager.track === "function") {
      QuestManager.track("goldEarned", goldGain);
    }

    addLog(
      "🧹 Vente totale de " + soldCount + " objets pour +" + formatNumber(goldGain) + " or",
      "event"
    );
    showToast("Inventaire vendu", 1200);

    if (typeof renderPanel === "function") renderPanel();
    if (typeof renderHud === "function") renderHud();
    saveGame();
  },

  sellInventoryByRarity: function (rarity) {
    var items = (game.inventory || []).filter(function (item) {
      return item.rarity === rarity;
    });

    if (!items.length) {
      showToast("Aucun objet à vendre", 1200);
      return;
    }

    var goldGain = items.reduce(function (sum, item) {
      return sum + getEquipmentSellValue(item);
    }, 0);

    game.inventory = game.inventory.filter(function (item) {
      return item.rarity !== rarity;
    });

    game.gold += goldGain;
    game.totalGoldEarned += goldGain;

    if (window.QuestManager && typeof QuestManager.track === "function") {
      QuestManager.track("goldEarned", goldGain);
    }

    addLog(
      "🧹 Vente de " + items.length + " objets " + rarity + " pour +" + formatNumber(goldGain) + " or",
      "event"
    );
    showToast("Vente effectuée", 1200);

    if (typeof renderPanel === "function") renderPanel();
    if (typeof renderHud === "function") renderHud();
    saveGame();
  }
};

window.EquipmentSystem = EquipmentSystem;

window.EquipmentManager = {
  equip: function (uid) {
    return EquipmentSystem.equip(uid);
  },
  unequip: function (slot) {
    return EquipmentSystem.unequip(slot);
  },
  sell: function (uid) {
    return EquipmentSystem.sell(uid);
  },
  sortInventoryByRarity: function () {
    return EquipmentSystem.sortInventoryByRarity();
  },
  sellInventoryByRarity: function (rarity) {
    return EquipmentSystem.sellInventoryByRarity(rarity);
  },
sortInventoryByType: function () {
    return EquipmentSystem.sortInventoryByType();
  },
  sellAllInventory: function () {
    return EquipmentSystem.sellAllInventory();
  },

  recalcStats: function () {
    return StatsSystem.recalcStats();
  },
  effectiveTapDamage: function () {
    return StatsSystem.effectiveTapDamage();
  },
  effectiveAutoDps: function () {
    return StatsSystem.effectiveAutoDps();
  },
  effectiveCritChance: function () {
    return StatsSystem.effectiveCritChance();
  },
  effectiveCritMult: function () {
    return StatsSystem.effectiveCritMult();
  },
  effectiveGoldMult: function () {
    return StatsSystem.effectiveGoldMult();
  },
  getSetBonus: function () {
    return StatsSystem.getSetBonus();
  }
};

window.getEquipmentSellValue = getEquipmentSellValue;
window.sortInventoryByRarity = function () {
  EquipmentSystem.sortInventoryByRarity();
};
window.sortInventoryByType = function () {
  EquipmentSystem.sortInventoryByType();
};
window.sellInventoryByRarity = function (rarity) {
  EquipmentSystem.sellInventoryByRarity(rarity);
};
window.sellAllInventory = function () {
  EquipmentSystem.sellAllInventory();
};