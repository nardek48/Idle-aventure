"use strict";
/* systems/production-system.js — ProductionManager, 4+ bâtiments à stock local plafonné (distinct de VillageManager, bonus % sans stock).
   tick(dt) en continu + catchUpOffline() au boot (lastTick propre, indépendant de game.lastOnline). Détail complet : COMMENTAIRES_ORIGINAUX.md */

var ProductionManager = {
  ensure: function () {
    if (!game.production || typeof game.production !== "object") game.production = {};
    Object.keys(PRODUCTION_BUILDINGS).forEach(function (id) {
      if (!game.production[id] || typeof game.production[id] !== "object") {
        game.production[id] = { level: 1, stock: 0, lastTick: Date.now() };
      }
      var b = game.production[id];
      if (typeof b.level !== "number" || b.level < 1) b.level = 1;
      if (typeof b.stock !== "number" || b.stock < 0) b.stock = 0;
      if (typeof b.lastTick !== "number") b.lastTick = Date.now();
    });
  },

  getLevel: function (id) {
    this.ensure();
    return Number((game.production[id] || {}).level || 1);
  },

  getStock: function (id) {
    this.ensure();
    return Number((game.production[id] || {}).stock || 0);
  },

  getRatePerMin: function (id) {
    var level = this.getLevel(id);
    return PRODUCTION_CONFIG.baseRatePerMin * Math.pow(PRODUCTION_CONFIG.rateGrowthPerLevel, level - 1);
  },

  getCapacity: function (id) {
    var level = this.getLevel(id);
    return Math.floor(PRODUCTION_CONFIG.baseCapacity * (1 + PRODUCTION_CONFIG.capacityGrowthPerLevel * (level - 1)));
  },

  isStockFull: function (id) {
    return this.getStock(id) >= this.getCapacity(id);
  },

  getCost: function (id) {
    var level = this.getLevel(id);
    return Math.floor(PRODUCTION_CONFIG.baseCost * Math.pow(PRODUCTION_CONFIG.costMult, level - 1));
  },

  isMaxLevel: function (id) {
    return this.getLevel(id) >= PRODUCTION_CONFIG.maxLevel;
  },

  getSecondsUntilFull: function (id) {
    var stock = this.getStock(id);
    var capacity = this.getCapacity(id);
    var ratePerMin = this.getRatePerMin(id);
    if (stock >= capacity || ratePerMin <= 0) return Infinity;
    return ((capacity - stock) / ratePerMin) * 60;
  },

  tick: function (dt) {
    this.ensure();
    dt = Math.max(0, Number(dt || 0));
    if (dt <= 0) return;

    var self = this;
    var changed = false;

    Object.keys(PRODUCTION_BUILDINGS).forEach(function (id) {
      var b = game.production[id];
      var capacity = self.getCapacity(id);
      if (b.stock >= capacity) {
        b.lastTick = Date.now();
        return;
      }

      var ratePerSec = self.getRatePerMin(id) / 60;
      var gained = ratePerSec * dt;
      var newStock = Math.min(capacity, b.stock + gained);
      if (newStock !== b.stock) {
        b.stock = newStock;
        changed = true;
      }
      b.lastTick = Date.now();
    });

    if (!changed) return;
    if (typeof isProductionScreenVisible !== "function" || !isProductionScreenVisible()) return;

    this._renderAccum = Number(this._renderAccum || 0) + dt;
    if (this._renderAccum < 1) return;
    this._renderAccum = 0;

    if (typeof renderPanel === "function") renderPanel();
  },

  catchUpOffline: function () {
    this.ensure();
    var now = Date.now();
    var self = this;

    Object.keys(PRODUCTION_BUILDINGS).forEach(function (id) {
      var b = game.production[id];
      var elapsedMs = now - Number(b.lastTick || now);
      if (elapsedMs <= 1000) {
        b.lastTick = now;
        return;
      }

      var capacity = self.getCapacity(id);
      if (b.stock < capacity) {
        var ratePerSec = self.getRatePerMin(id) / 60;
        var gained = ratePerSec * (elapsedMs / 1000);
        b.stock = Math.min(capacity, b.stock + gained);
      }
      b.lastTick = now;
    });
  },

  harvest: function (id) {
    this.ensure();
    var b = game.production[id];
    var def = PRODUCTION_BUILDINGS[id];
    if (!b || !def) return;

    var amount = Math.floor(b.stock);
    if (amount <= 0) {
      showToast("Rien à récolter", 1000);
      return;
    }

    WarehouseManager.addResource(def.resourceKey, amount, true);
    b.stock -= amount;
    b.lastTick = Date.now();

    var resDef = WAREHOUSE_RESOURCES[def.resourceKey];
    addLog("🌾 " + def.name + " récoltée : +" + formatNumber(amount) + " " + (resDef ? resDef.name : def.resourceKey), "event");
    showToast("+" + formatNumber(amount) + " " + (resDef ? resDef.name : ""), 1300);

    if (typeof renderPanel === "function") renderPanel();
    saveGame();
  },

  buy: function (id) {
    this.ensure();
    var b = game.production[id];
    var def = PRODUCTION_BUILDINGS[id];
    if (!b || !def) return;

    if (this.isMaxLevel(id)) {
      showToast("Niveau maximum", 1200);
      return;
    }

    var cost = this.getCost(id);
    if ((game.gold || 0) < cost) {
      showToast("Pas assez d'or", 1000);
      return;
    }

    game.gold -= cost;
    b.level += 1;

    if (window.QuestManager && typeof QuestManager.track === "function") {
      QuestManager.track("goldSpent", cost);
    }

    addLog(def.name + " amélioré (niv. " + b.level + ")", "event");
    showToast(def.name + " niv. " + b.level, 1200);

    if (typeof renderPanel === "function") renderPanel();
    saveGame();
  }
};

window.ProductionManager = ProductionManager;
