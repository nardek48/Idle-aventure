"use strict";
/* ============================================================
Quest Idle — systems/equipment-system.js
Actions sur l'inventaire : équiper/déséquiper/vendre, tri.
Deux objets exposés :
  - EquipmentSystem  contient la vraie logique (ci-dessous)
  - EquipmentManager façade utilisée par le reste du code (UI +
    ce fichier lui-même) : ajoute les méthodes "effective*" qui
    délèguent à StatsSystem. Les deux existent pour historique,
    garder les deux pour ne rien casser ailleurs dans le code.
============================================================ */

/* Prix de revente d'un objet selon sa rareté (fixe, ne dépend pas
   de son stat/valeur). */
function getEquipmentSellValue(item) {
  if (!item) return 0;
  return item.rarity === "legendary" ? 1000 :
         item.rarity === "epic" ? 200 :
         item.rarity === "rare" ? 50 :
         item.rarity === "green" ? 25 : 10;
}

/* v2.23 : chemin de l'icône illustrée d'un objet (images/Icons/equipment_icon/),
   une image DIFFÉRENTE par type ET par rareté (avant, une seule
   icône générique par type, ignorant la rareté). Le jeu de fichiers
   fourni ne couvre pas la rareté "green" (Inhabituel) — on retombe
   sur l'image "common" du même type en attendant un visuel dédié. */
var EQUIPMENT_ICON_RARITY_FALLBACK = {
  common: "common",
  green: "common",   // pas d'asset dédié fourni, repli sur "common"
  rare: "rare",
  epic: "epic",
  legendary: "legendary"
};

function getEquipmentIconPath(item) {
  if (!item || !item.icon) return "";
  var rarityFile = EQUIPMENT_ICON_RARITY_FALLBACK[item.rarity] || "common";
  return "images/Icons/equipment_icon/" + item.icon + "_" + rarityFile + ".jpg";
}

/* Capacité maximale du sac (voir l'affichage "Sac (X/50)" dans
   equipment-view.js). Utilisé UNIQUEMENT quand un objet entre pour
   la première fois dans l'inventaire (butin trouvé) — équiper/
   déséquiper ne fait jamais perdre un objet à cause de ça, seul un
   NOUVEAU butin peut être refusé si le sac est plein. */
var MAX_INVENTORY_SIZE = 50;

/* Ajoute un objet de butin à l'inventaire si la place le permet.
   Renvoie true si l'objet a bien été ajouté, false si le sac est
   plein (avec un message clair pour le joueur). */
function addLootToInventory(item) {
  if (!item) return false;
  if (!Array.isArray(game.inventory)) game.inventory = [];

  if (game.inventory.length >= MAX_INVENTORY_SIZE) {
    addLog("🎒 Sac plein (" + MAX_INVENTORY_SIZE + "/" + MAX_INVENTORY_SIZE + ") : " + item.name + " perdu.", "event");
    showToast("🎒 Sac plein ! Vends des objets pour faire de la place", 2000);
    return false;
  }

  game.inventory.push(item);
  return true;
}

/* v2.26 : autovente. Si activée (game.autoSellEquipment), tout
   nouveau BUTIN (pas les achats à l'échoppe, qui passent directement
   par addLootToInventory) dont la rareté est INFÉRIEURE à celle de
   l'objet déjà équipé sur le même emplacement est vendu
   automatiquement au lieu d'encombrer le sac. Renvoie true si
   l'objet a été traité d'une façon ou d'une autre (ajouté ou vendu),
   false seulement si le sac est plein ET qu'il n'a pas été vendu. */
function addDropToInventory(item) {
  if (!item) return false;

  if (game.autoSellEquipment) {
    var equippedItem = game.equipped ? game.equipped[item.slot] : null;
    var equippedRank = equippedItem ? RARITY_ORDER.indexOf(equippedItem.rarity) : -1;
    var dropRank = RARITY_ORDER.indexOf(item.rarity);

    if (equippedItem && dropRank < equippedRank) {
      var value = getEquipmentSellValue(item);
      game.gold += value;
      addLog("💰 " + item.name + " vendu automatiquement (+" + formatNumber(value) + " or)", "event");
      return true;
    }
  }

  return addLootToInventory(item);
}

var EquipmentSystem = {
  /* Équipe un objet de l'inventaire par son uid. Si un objet occupait
     déjà cet emplacement, il retourne dans l'inventaire (pas de perte). */
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

  /* Retire l'objet d'un emplacement et le remet dans l'inventaire. */
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

  /* Vend un objet précis de l'inventaire pour de l'or (voir
     getEquipmentSellValue pour le prix). */
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

  /* Trie l'inventaire par rareté (décroissante), puis emplacement,
     puis nom. Utilisé par le bouton de tri de l'écran équipement. */
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

  /* Trie l'inventaire par emplacement (arme/armure/amulette) d'abord,
     puis par rareté. */
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

  /* Vend l'inventaire entier d'un coup (bouton "Tout vendre"). */
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

  /* Vend tous les objets d'une rareté donnée (boutons de vente rapide
     par rareté sur l'écran équipement). */
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
window.getEquipmentIconPath = getEquipmentIconPath;
window.addLootToInventory = addLootToInventory;
window.addDropToInventory = addDropToInventory;

/* Bascule l'autovente et redessine l'écran Équipement pour refléter
   le nouvel état du bouton. */
function toggleAutoSellEquipment() {
  game.autoSellEquipment = !game.autoSellEquipment;
  addLog(game.autoSellEquipment ? "🤖 Autovente activée" : "🤖 Autovente désactivée", "event");
  showToast(game.autoSellEquipment ? "Autovente activée" : "Autovente désactivée", 1300);
  if (typeof renderPanel === "function") renderPanel();
  saveGame();
}
window.toggleAutoSellEquipment = toggleAutoSellEquipment;
window.MAX_INVENTORY_SIZE = MAX_INVENTORY_SIZE;
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