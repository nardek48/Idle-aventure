"use strict";
/* systems/equipment-system.js — actions sur l'inventaire (équiper/déséquiper/vendre/trier).
   EquipmentSystem = logique réelle ; EquipmentManager = façade legacy déléguant à StatsSystem pour les "effective*". Détail : COMMENTAIRES_ORIGINAUX.md */

/* v3.225.0 — affixes d'un objet, toujours un tableau (objet d'avant v3.225.0 ou Commun : []).
   Seul point de lecture : stats-system.js, equipment-view.js, equip-shop-view.js passent par ici. */
function getItemAffixes(item) {
  if (!item || !Array.isArray(item.affixes)) return [];
  return item.affixes.filter(function (a) { return a && typeof a.stat === "string" && typeof a.value === "number"; });
}

/* v3.226.0 — comparaison ligne à ligne (Lot 2, D6 : delta par ligne, jamais de score global).
   Union des stats des deux objets : stat de base d'abord, puis les affixes du candidat,
   puis les stats que seul l'objet équipé porte (ce que le joueur perdrait). Une stat
   absente d'un côté vaut 0. equipped null (emplacement vide) : tout est un gain.
   Valeurs de tirage (item.value) : même emplacement, donc même multiplicateur de Forge. */
function getEquipmentCompareLines(candidate, equipped) {
  var lines = [], byStat = {};
  if (!candidate) return lines;
  function line(stat, tier) {
    if (!byStat[stat]) { byStat[stat] = { stat: stat, tier: tier, candValue: 0, equipValue: 0, onlyEquipped: false }; lines.push(byStat[stat]); }
    return byStat[stat];
  }
  line(candidate.stat, "B").candValue += Number(candidate.value) || 0;
  getItemAffixes(candidate).forEach(function (a) { line(a.stat, a.tier === "S" ? "S" : "P").candValue += a.value; });
  if (equipped) {
    var eqBase = line(equipped.stat, "B"); eqBase.equipValue += Number(equipped.value) || 0;
    getItemAffixes(equipped).forEach(function (a) { line(a.stat, a.tier === "S" ? "S" : "P").equipValue += a.value; });
  }
  lines.forEach(function (l) {
    l.onlyEquipped = l.candValue === 0 && l.equipValue !== 0;
    l.delta = Math.round((l.candValue - l.equipValue) * 1000) / 1000;
  });
  return lines;
}

/* v3.230.0 — pouvoir légendaire d'un objet, ou null. Les objets d'avant v3.230.0
   et toutes les raretés inférieures renvoient null : un seul point de lecture. */
function getItemPower(item) {
  if (!item || typeof item.power !== "string") return null;
  return (typeof LEGENDARY_POWER_BY_ID !== "undefined") ? (LEGENDARY_POWER_BY_ID[item.power] || null) : null;
}

/* Le héros porte-t-il ce pouvoir ? Seul point d'interrogation pour le moteur. */
function hasLegendaryPower(powerId) {
  var equipped = game.equipped || {};
  for (var i = 0; i < EQUIPMENT_SLOTS.length; i++) {
    var item = equipped[EQUIPMENT_SLOTS[i]];
    if (item && item.power === powerId) return true;
  }
  return false;
}

function getEquipmentSellValue(item) {
  if (!item) return 0;
  return item.rarity === "legendary" ? 1000 :
         item.rarity === "epic" ? 200 :
         item.rarity === "rare" ? 50 :
         item.rarity === "green" ? 25 : 10;
}

var EQUIPMENT_ICON_PNG_TYPES = {
  amulet: true, armor: true, axe: true, bottes: true, bow: true, casque: true,
  gants: true, ring: true, robe: true, staff: true, sword: true
};

var EQUIPMENT_ICON_JPG_RARITY_FALLBACK = {
  common: "common",
  green: "common",
  rare: "rare",
  epic: "epic",
  legendary: "legendary"
};

function getEquipmentIconPath(item) {
  if (!item || !item.icon) return "";

  if (EQUIPMENT_ICON_PNG_TYPES[item.icon]) {
    return "images/Icons/equipment_icon/" + item.icon + "_" + item.rarity + ".png";
  }

  var rarityFile = EQUIPMENT_ICON_JPG_RARITY_FALLBACK[item.rarity] || "common";
  return "images/Icons/equipment_icon/" + item.icon + "_" + rarityFile + ".jpg";
}

function isWeaponIconAllowedForCurrentHero(icon) {
  if (typeof getAllowedWeaponIconsForCurrentHero !== "function") return true;
  var allowed = getAllowedWeaponIconsForCurrentHero();
  if (!Array.isArray(allowed) || !allowed.length) return true;
  return allowed.indexOf(icon) !== -1;
}

/* Génère et équipe directement (sans passer par l'inventaire) une arme de départ à 1 dégât tap, liée à la classe du héros actif.
   v3.260.0 : plus appelée à la création, seulement au changement de héros sans arme compatible (heros-view.js). */
function equipStarterWeapon() {
  if (typeof getAllowedWeaponIconsForCurrentHero !== "function" || typeof generateEquipmentItem !== "function") return null;
  if (!game.equipped) return null;

  var allowedIcons = getAllowedWeaponIconsForCurrentHero();
  var icon = (Array.isArray(allowedIcons) && allowedIcons.length) ? allowedIcons[0] : null;

  var item = generateEquipmentItem("weapon", "common");
  if (!item) return null;
  if (icon) {
    item.icon = icon;
    var config = (typeof EQUIPMENT_SLOT_CONFIG !== "undefined") ? EQUIPMENT_SLOT_CONFIG.weapon : null;
    var namePool = config && config.namesByIcon && config.namesByIcon[icon];
    if (namePool && namePool.length) item.name = namePool[0];
  }
  item.value = 1;

  game.equipped.weapon = item;
  return item;
}
window.equipStarterWeapon = equipStarterWeapon;

/* Déséquipe l'arme active si elle n'est plus compatible avec la classe du héros actif (ex. après changement de héros). Renvoie l'arme retirée vers l'inventaire. */
function unequipIncompatibleWeapon() {
  if (!game.equipped || !game.equipped.weapon) return false;
  if (isWeaponIconAllowedForCurrentHero(game.equipped.weapon.icon)) return false;

  var item = game.equipped.weapon;
  game.inventory.push(item);
  game.equipped.weapon = null;

  addLog("⚔️ " + item.name + " retirée (incompatible avec la nouvelle classe)", "event");
  return true;
}
window.unequipIncompatibleWeapon = unequipIncompatibleWeapon;
window.isWeaponIconAllowedForCurrentHero = isWeaponIconAllowedForCurrentHero;

/* v3.322.0 (Offrande, O8) : 25 places de base, 50 avec le Sac profond. MAX_INVENTORY_SIZE
   reste la valeur de repli ; la vraie limite se lit dans getInventoryCap(). */
var MAX_INVENTORY_SIZE = 25;

function getInventoryCap() {
  return (window.MemoryManager && typeof MemoryManager.getInventoryCap === "function")
    ? MemoryManager.getInventoryCap() : MAX_INVENTORY_SIZE;
}

function addLootToInventory(item) {
  if (!item) return false;
  if (!Array.isArray(game.inventory)) game.inventory = [];

  /* v3.322.0 : sac plein -> l'objet est offert au lieu d'être perdu. Un objet unique
     (arme d'élite) n'est jamais offert d'office : il entre en dépassement. */
  if (game.inventory.length >= getInventoryCap() && !item.unique) {
    var gained = (window.MemoryManager) ? MemoryManager.offerItem(item, "full") : 0;
    showToast("🎒 Sac plein : " + item.name + " offert" + (gained > 0 ? " (+" + gained + " Aether)" : ""), 2000);
    return false;
  }

  game.inventory.push(item);
  return true;
}

function addDropToInventory(item) {
  if (!item) return false;

  // v3.322.0 : l'autovente devient l'auto-offrande (même réglage, même seuil de rareté)
  if (game.autoSellEquipment && !item.unique) {
    // v3.205.0 : un objet unique (arme d'élite) n'est JAMAIS autovendu. Sans
    // cette garde, un seuil réglé sur Inhabituel liquidait le trophée à
    // l'instant même où il tombait.
    var threshold = game.autoSellRarityThreshold || "common";
    var thresholdRank = RARITY_ORDER.indexOf(threshold);
    var dropRank = RARITY_ORDER.indexOf(item.rarity);

    if (thresholdRank !== -1 && dropRank <= thresholdRank) {
      if (window.MemoryManager) MemoryManager.offerItem(item, "auto");
      return true;
    }
  }

  return addLootToInventory(item);
}

var EquipmentSystem = {
  equip: function (uid) {
    if (window.heroLockToast && heroLockToast()) return; // v3.307.0 : héros en expédition
    var index = (game.inventory || []).findIndex(function (item) {
      return item.uid === uid;
    });

    if (index === -1) return;

    var item = game.inventory[index];
    if (!item || !item.slot || !game.equipped) return;

    if (item.slot === "weapon" && !isWeaponIconAllowedForCurrentHero(item.icon)) {
      showToast("⚔️ Cette arme ne convient pas à ta classe", 1600);
      return;
    }

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
    if (window.heroLockToast && heroLockToast()) return; // v3.307.0 : héros en expédition
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

  /* v3.322.0 (O2) : la vente d'équipement devient l'Offrande. Le nom est gardé pour les appelants. */
  sell: function (uid) {
    if (window.MemoryManager) MemoryManager.offer(uid);
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

    var slotOrder = (typeof EQUIPMENT_SLOTS !== "undefined") ? EQUIPMENT_SLOTS : ["weapon", "armor", "amulet"];

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

  /* v3.322.0 : « Tout offrir » — jamais les objets uniques. */
  sellAllInventory: function () {
    if (window.MemoryManager) MemoryManager.offerAll();
  },

  sellInventoryByRarity: function (rarity) {
    // v3.322.0 : offre tous les objets d'une rareté (jamais un objet unique)
    var self = window.MemoryManager;
    if (!self) return;
    var gained = 0, n = 0;
    game.inventory = (game.inventory || []).filter(function (item) {
      if (item.rarity !== rarity || item.unique) return true;
      gained += self.offerItem(item, "manual"); n++;
      return false;
    });
    if (!n) showToast("Aucun objet à offrir", 1200);
    if (typeof renderPanel === "function") renderPanel();
    if (typeof saveGame === "function") saveGame();
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
  /* v3.221.0 : valeur d'une pièce, forge comprise. Passerelle vers
     ForgeManager pour que l'UI et StatsSystem lisent la même chose. */
  getForgedValue: function (item) {
    return (window.ForgeManager && typeof ForgeManager.getForgedValue === "function")
      ? ForgeManager.getForgedValue(item)
      : Number((item && item.value) || 0);
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
  },
  getActiveSetBonuses: function () {
    return StatsSystem.getActiveSetBonuses();
  }
};

window.getEquipmentSellValue = getEquipmentSellValue;
window.getItemAffixes = getItemAffixes;
window.getEquipmentCompareLines = getEquipmentCompareLines;
window.getItemPower = getItemPower;
window.hasLegendaryPower = hasLegendaryPower;
window.getEquipmentIconPath = getEquipmentIconPath;
window.addLootToInventory = addLootToInventory;
window.addDropToInventory = addDropToInventory;

function toggleAutoSellEquipment() {
  game.autoSellEquipment = !game.autoSellEquipment;
  addLog(game.autoSellEquipment ? "🤖 Auto-offrande activée" : "🤖 Auto-offrande désactivée", "event"); // v3.322.0
  showToast(game.autoSellEquipment ? "Auto-offrande activée" : "Auto-offrande désactivée", 1300);
  if (typeof renderPanel === "function") renderPanel();
  saveGame();
}
window.toggleAutoSellEquipment = toggleAutoSellEquipment;

function setAutoSellRarityThreshold(rarity) {
  if (typeof RARITY_ORDER === "undefined" || RARITY_ORDER.indexOf(rarity) === -1) return;
  game.autoSellRarityThreshold = rarity;
  var label = (typeof RARITY_LABELS !== "undefined" && RARITY_LABELS[rarity]) || rarity;
  showToast("Seuil d\u2019auto-offrande : " + label + " et en dessous", 1300);
  if (typeof renderPanel === "function") renderPanel();
  saveGame();
}
window.setAutoSellRarityThreshold = setAutoSellRarityThreshold;
window.MAX_INVENTORY_SIZE = MAX_INVENTORY_SIZE;
window.getInventoryCap = getInventoryCap;
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
