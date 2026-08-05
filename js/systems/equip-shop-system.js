"use strict";
/* ============================================================
Quest Idle — systems/equip-shop-system.js
Échoppe d'équipement du sous-onglet "Équipement" de la Boutique :
6 objets tirés aléatoirement (mêmes raretés débloquées que le butin
de boss, voir getAllowedRarities en loot-system.js), rachetables une
fois chacun, stock renouvelé toutes les 6h.
============================================================ */

var EQUIP_SHOP_SIZE = 6;
var EQUIP_SHOP_REFRESH_MS = 6 * 3600 * 1000;

/* v2.27 : renouvellement payant, en plus du renouvellement gratuit
   toutes les 6h — coût CROISSANT à chaque renouvellement payant
   utilisé depuis le dernier renouvellement (payant ou naturel), pour
   ne pas pouvoir farmer le stock en boucle. */
var EQUIP_SHOP_MANUAL_REFRESH_BASE_COST = 1000;
var EQUIP_SHOP_MANUAL_REFRESH_MULT = 2.2;

/* Prix d'achat par rareté — volontairement bien au-dessus du prix de
   revente (getEquipmentSellValue en equipment-system.js), sinon
   "vendre pour racheter" n'aurait aucun sens. */
var EQUIP_SHOP_PRICES = {
  common: 300,
  green: 1200,
  rare: 4000,
  epic: 15000,
  legendary: 60000
};

var EquipShopManager = {
  ensure: function () {
    if (!Array.isArray(game.equipShopStock)) game.equipShopStock = [];
    if (typeof game.equipShopResetTime !== "number") game.equipShopResetTime = 0;
    if (typeof game.equipShopManualRefreshCount !== "number") game.equipShopManualRefreshCount = 0;
  },

  getPrice: function (item) {
    if (!item) return Infinity;
    return EQUIP_SHOP_PRICES[item.rarity] || EQUIP_SHOP_PRICES.common;
  },

  /* Tire EQUIP_SHOP_SIZE objets (via LootSystem.rollDrop, qui respecte
     déjà les raretés débloquées par le monde/cycle courant), chacun
     avec son prix et un statut "acheté" à false. */
  generateStock: function () {
    var stock = [];
    for (var i = 0; i < EQUIP_SHOP_SIZE; i++) {
      var item = window.LootSystem && typeof LootSystem.rollDrop === "function"
        ? LootSystem.rollDrop()
        : null;
      if (!item) continue;
      item.price = this.getPrice(item);
      item.bought = false;
      stock.push(item);
    }
    return stock;
  },

  /* Renouvelle le stock si le délai est écoulé (ou s'il n'existe pas
     encore, ex: toute première visite). Appelée avant chaque affichage
     de l'écran Équipement de la boutique. */
  checkRefresh: function () {
    this.ensure();
    var now = Date.now();
    if (!game.equipShopStock.length || now >= game.equipShopResetTime) {
      game.equipShopStock = this.generateStock();
      game.equipShopResetTime = now + EQUIP_SHOP_REFRESH_MS;
      game.equipShopManualRefreshCount = 0;
    }
  },

  /* Coût du prochain renouvellement payant — augmente à chaque fois
     qu'on l'utilise, remis à zéro par le prochain renouvellement
     naturel (voir checkRefresh ci-dessus). */
  getManualRefreshCost: function () {
    this.ensure();
    var count = Number(game.equipShopManualRefreshCount || 0);
    return Math.floor(EQUIP_SHOP_MANUAL_REFRESH_BASE_COST * Math.pow(EQUIP_SHOP_MANUAL_REFRESH_MULT, count));
  },

  /* Paye pour régénérer immédiatement tout le stock (objets déjà
     achetés remis en jeu inclus) et relance un plein cycle de 6h. */
  manualRefresh: function () {
    this.ensure();
    var cost = this.getManualRefreshCost();
    if ((game.gold || 0) < cost) return showToast("Pas assez d'or", 1000);

    game.gold -= cost;
    game.equipShopManualRefreshCount = Number(game.equipShopManualRefreshCount || 0) + 1;
    game.equipShopStock = this.generateStock();
    game.equipShopResetTime = Date.now() + EQUIP_SHOP_REFRESH_MS;

    if (window.QuestManager && typeof QuestManager.track === "function") {
      QuestManager.track("goldSpent", cost);
    }

    addLog("🔄 Échoppe renouvelée (" + formatNumber(cost) + " or)", "event");
    showToast("🔄 Stock renouvelé !", 1500);
    if (typeof renderAll === "function") renderAll();
    saveGame();
  },

  timeUntilRefresh: function () {
    this.ensure();
    var diff = Math.max(0, (game.equipShopResetTime || 0) - Date.now());
    var h = Math.floor(diff / 3600000);
    var m = Math.floor((diff % 3600000) / 60000);
    return h + "h " + m + "m";
  },

  /* Achète un objet du stock par son uid : vérifie qu'il n'est pas déjà
     acheté, que le joueur a assez d'or et de place dans le sac
     (addLootToInventory, voir equipment-system.js pour la limite de
     50 objets), puis marque l'objet "acheté" (reste affiché, grisé,
     jusqu'au prochain renouvellement). */
  buy: function (uid) {
    this.ensure();
    var item = game.equipShopStock.find(function (it) { return it.uid === uid; });
    if (!item) return showToast("Objet introuvable", 1000);
    if (item.bought) return showToast("Déjà acheté", 1000);

    var price = this.getPrice(item);
    if ((game.gold || 0) < price) return showToast("Pas assez d'or", 1000);

    var owned = Object.assign({}, item);
    delete owned.price;
    delete owned.bought;
    owned.uid = "itm_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);

    if (!addLootToInventory(owned)) return;

    game.gold -= price;
    item.bought = true;

    if (window.QuestManager && typeof QuestManager.track === "function") {
      QuestManager.track("goldSpent", price);
    }

    addLog("🛒 " + owned.name + " acheté à l'échoppe (" + formatNumber(price) + " or)", "event");
    showToast(owned.name, 1500);
    if (typeof renderAll === "function") renderAll();
    saveGame();
  }
};

window.EquipShopManager = EquipShopManager;
