"use strict";
/* ============================================================
Quest Idle — systems/offline-system.js
Village and offline rewards
============================================================ */

var VILLAGE_CONFIG = {
  goldMine: { name: "Mine d'or", desc: "Augmente les gains d'or hors-ligne.", baseCost: 250, costMult: 1.65, maxLevel: 25 },
  essenceWell: { name: "Puits d'essence", desc: "Ajoute de l'essence gagnée hors-ligne.", baseCost: 400, costMult: 1.75, maxLevel: 20 },
  barracks: { name: "Caserne", desc: "Améliore l'efficacité hors-ligne.", baseCost: 600, costMult: 1.8, maxLevel: 20 },
  timeRelay: { name: "Relais du temps", desc: "Augmente la durée maximale des gains hors-ligne.", baseCost: 900, costMult: 2, maxLevel: 10 }
};

var VillageManager = {
  ensure: function () {
    if (!game.village || typeof game.village !== "object") game.village = {};
    if (typeof game.village.goldMine !== "number") game.village.goldMine = 0;
    if (typeof game.village.essenceWell !== "number") game.village.essenceWell = 0;
    if (typeof game.village.barracks !== "number") game.village.barracks = 0;
    if (typeof game.village.timeRelay !== "number") game.village.timeRelay = 0;
  },

  getLevel: function (id) {
    this.ensure();
    return Number(game.village[id] || 0);
  },

  getConfig: function (id) {
    return VILLAGE_CONFIG[id] || null;
  },

  getCost: function (id) {
    var cfg = this.getConfig(id);
    if (!cfg) return Infinity;
    var level = this.getLevel(id);
    return Math.floor(cfg.baseCost * Math.pow(cfg.costMult, level));
  },

  canBuy: function (id) {
    var cfg = this.getConfig(id);
    if (!cfg) return false;
    var level = this.getLevel(id);
    if (level >= (cfg.maxLevel || Infinity)) return false;
    return game.gold >= this.getCost(id);
  },

  buy: function (id) {
    var cfg = this.getConfig(id);
    if (!cfg) {
      showToast("Bâtiment introuvable", 1200);
      return;
    }

    var level = this.getLevel(id);
    if (level >= (cfg.maxLevel || Infinity)) {
      showToast("Niveau maximum", 1200);
      return;
    }

    var cost = this.getCost(id);
    if (game.gold < cost) {
      showToast("Pas assez d'or", 1000);
      return;
    }

    game.gold -= cost;
    game.village[id] = level + 1;

    if (window.QuestManager && typeof QuestManager.track === "function") {
      QuestManager.track("goldSpent", cost);
    }

    addLog("Village : " + cfg.name + " niv. " + game.village[id], "event");
    showToast(cfg.name + " +1", 1200);
    if (typeof renderAll === "function") renderAll();
    saveGame();
  },

  getOfflineBonuses: function () {
    this.ensure();
    return {
      goldMult: 1 + this.getLevel("goldMine") * 0.12,
      essenceFlat: this.getLevel("essenceWell"),
      efficiencyBonus: this.getLevel("barracks") * 0.04,
      extraHours: this.getLevel("timeRelay") * 0.5
    };
  }
};

var OfflineManager = {
  calculate: function () {
    if (!game.lastOnline) return null;
    if (!window.VillageManager || typeof VillageManager.getOfflineBonuses !== "function") return null;

    VillageManager.ensure();

    var elapsedMs = Date.now() - game.lastOnline;
    if (elapsedMs <= 1000) return null;

    var bonuses = VillageManager.getOfflineBonuses();
    var baseCapHours = 2;
    var maxHours = baseCapHours + Number(bonuses.extraHours || 0);
    var cappedMs = Math.min(elapsedMs, maxHours * 3600 * 1000);
    var seconds = cappedMs / 1000;

    var baseGoldPerSec = 1;
    var gold = Math.floor(baseGoldPerSec * seconds * (1 + Number(bonuses.efficiencyBonus || 0)) * Number(bonuses.goldMult || 1));
    var essence = Math.floor(seconds / 3600 * Number(bonuses.essenceFlat || 0));

    if (gold <= 0 && essence <= 0) return null;

    return {
      ms: cappedMs,
      gold: Math.max(0, gold),
      essence: Math.max(0, essence)
    };
  },

  show: function (offline) {
    if (!offline) return;

    game.gold += Number(offline.gold || 0);
    game.essence += Number(offline.essence || 0);
    game.totalGoldEarned += Number(offline.gold || 0);

    addLog("Gain hors-ligne : +" + formatNumber(offline.gold || 0) + " or, +" + formatNumber(offline.essence || 0) + " essence", "event");
    showToast("Hors-ligne : +" + formatNumber(offline.gold || 0) + " or", 1800);
    if (typeof renderAll === "function") renderAll();
  }
};

window.VillageManager = VillageManager;
window.OfflineManager = OfflineManager;
window.VILLAGE_CONFIG = VILLAGE_CONFIG;
