"use strict";
/* systems/equip-shop-system.js — échoppe d'équipement (Boutique) : 6 objets aléatoires, rachetables une fois chacun, stock renouvelé/6h.
   Détail complet : COMMENTAIRES_ORIGINAUX.md */

var EQUIP_SHOP_SIZE = 6;
var EQUIP_SHOP_REFRESH_MS = 6 * 3600 * 1000;

var EQUIP_SHOP_MANUAL_REFRESH_BASE_COST = 1000;
var EQUIP_SHOP_MANUAL_REFRESH_MULT = 2.2;

/* v3.114.0 (équilibrage or) : grille de BASE recalée sur l'or actif de la Forêt (~93-146
   or/sortie) — rare 4000→2500 (≈17 sorties, objectif long de fin de Forêt), epic/legendary
   abaissés en proportion. */
var EQUIP_SHOP_PRICES = {
  common: 300,
  green: 1000,
  rare: 2500,
  epic: 9000,
  legendary: 35000
};

/* v3.114.0 : multiplicateur de prix par MONDE MAX ATTEINT (game.worldsEverReached), calé sur
   la courbe réelle de l'or/kill (worldComponent^1.45 de progression-system.js : ×1 Forêt,
   ×~4.7 Désert, ×~12 Monde 3...) — décision validée avec Seb (option A : indexer les PRIX,
   ne jamais toucher aux gains). L'effort en sorties reste ainsi constant d'un monde à l'autre.
   Indexé sur le monde max ATTEINT (pas le monde courant) : reculer d'un monde ne baisse pas
   les prix. S'applique aussi au refresh manuel. Les potions ne sont PAS concernées. */
var EQUIP_SHOP_WORLD_PRICE_MULT = [1, 4, 10, 25, 90, 200];

function getEquipShopWorldPriceMult() {
  var maxWorld = 0;
  if (game.worldsEverReached && typeof game.worldsEverReached === "object") {
    Object.keys(game.worldsEverReached).forEach(function (k) {
      var idx = Number(k);
      if (game.worldsEverReached[k] && idx > maxWorld) maxWorld = idx;
    });
  }
  if (window.WorldManager && Number(WorldManager.worldIndex || 0) > maxWorld) {
    maxWorld = Number(WorldManager.worldIndex || 0);
  }
  var mult = EQUIP_SHOP_WORLD_PRICE_MULT[maxWorld];
  return mult != null ? mult : EQUIP_SHOP_WORLD_PRICE_MULT[EQUIP_SHOP_WORLD_PRICE_MULT.length - 1];
}

var EquipShopManager = {
  ensure: function () {
    if (!Array.isArray(game.equipShopStock)) game.equipShopStock = [];
    if (typeof game.equipShopResetTime !== "number") game.equipShopResetTime = 0;
    if (typeof game.equipShopManualRefreshCount !== "number") game.equipShopManualRefreshCount = 0;
  },

  getPrice: function (item) {
    if (!item) return Infinity;
    var base = EQUIP_SHOP_PRICES[item.rarity] || EQUIP_SHOP_PRICES.common;
    return Math.floor(base * getEquipShopWorldPriceMult());
  },

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

  checkRefresh: function () {
    this.ensure();
    var now = Date.now();
    if (!game.equipShopStock.length || now >= game.equipShopResetTime) {
      game.equipShopStock = this.generateStock();
      game.equipShopResetTime = now + EQUIP_SHOP_REFRESH_MS;
      game.equipShopManualRefreshCount = 0;
    }
  },

  getManualRefreshCost: function () {
    this.ensure();
    var count = Number(game.equipShopManualRefreshCount || 0);
    // v3.114.0 : base indexée sur le monde max atteint, même logique que getPrice().
    return Math.floor(EQUIP_SHOP_MANUAL_REFRESH_BASE_COST * getEquipShopWorldPriceMult() * Math.pow(EQUIP_SHOP_MANUAL_REFRESH_MULT, count));
  },

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

  buy: function (uid) {
    this.ensure();
    var item = game.equipShopStock.find(function (it) { return it.uid === uid; });
    if (!item) return showToast("Objet introuvable", 1000);
    if (item.bought) return showToast("Déjà acheté", 1000);

    // v3.114.0 : le joueur paie le prix AFFICHÉ (estampillé à la génération du stock) —
    // si un nouveau monde est atteint entre deux refresh, le stock courant garde ses prix,
    // le prochain renouvellement (6h ou manuel) appliquera le nouveau multiplicateur.
    var price = typeof item.price === "number" ? item.price : this.getPrice(item);
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
window.getEquipShopWorldPriceMult = getEquipShopWorldPriceMult;
window.EQUIP_SHOP_WORLD_PRICE_MULT = EQUIP_SHOP_WORLD_PRICE_MULT;
