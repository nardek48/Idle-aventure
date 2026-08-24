"use strict";
/* systems/construction-system.js — ConstructionManager (data/construction.js), indépendant de Production/Village.
   Consomme l'Entrepôt via WarehouseManager.removeResource() uniquement ; or débité en dur (pattern du projet). Détail : COMMENTAIRES_ORIGINAUX.md */

var ConstructionManager = {
  ensure: function () {
    if (!game.construction || typeof game.construction !== "object") game.construction = {};
    Object.keys(CONSTRUCTION_BUILDINGS).forEach(function (id) {
      if (!game.construction[id] || typeof game.construction[id] !== "object") {
        game.construction[id] = { level: 0 };
      }
      if (typeof game.construction[id].level !== "number" || game.construction[id].level < 0) {
        game.construction[id].level = 0;
      }
    });
  },

  getLevel: function (id) {
    this.ensure();
    return Number((game.construction[id] || {}).level || 0);
  },

  isMaxLevel: function (id) {
    var def = CONSTRUCTION_BUILDINGS[id];
    if (!def) return true;
    return this.getLevel(id) >= def.maxLevel;
  },

  getNextCost: function (id) {
    var def = CONSTRUCTION_BUILDINGS[id];
    if (!def) return null;
    if (this.isMaxLevel(id)) return null;
    return def.costPerLevel(this.getLevel(id));
  },

  getCurrentBonusMultiplier: function (id) {
    var def = CONSTRUCTION_BUILDINGS[id];
    if (!def) return 1;
    return def.bonusMultiplierAtLevel(this.getLevel(id));
  },

  getNextBonusMultiplier: function (id) {
    var def = CONSTRUCTION_BUILDINGS[id];
    if (!def) return 1;
    var nextLevel = Math.min(def.maxLevel, this.getLevel(id) + 1);
    return def.bonusMultiplierAtLevel(nextLevel);
  },

  getAffordability: function (id) {
    var cost = this.getNextCost(id);
    if (!cost) return { all: false };

    var result = { gold: Number(game.gold || 0) >= cost.gold };
    Object.keys(cost).forEach(function (key) {
      if (key === "gold") return;
      result[key] = WarehouseManager.getAmount(key) >= cost[key];
    });
    result.all = Object.keys(result).every(function (k) { return result[k]; });
    return result;
  },

  _buying: false,

  buy: function (id) {
    var def = CONSTRUCTION_BUILDINGS[id];
    if (!def) return false;
    if (this._buying) return false;

    this.ensure();

    if (this.isMaxLevel(id)) {
      showToast("Niveau maximum", 1200);
      return false;
    }

    var cost = this.getNextCost(id);
    var afford = this.getAffordability(id);

    var missingKey = Object.keys(afford).find(function (key) {
      return key !== "all" && afford[key] === false;
    });
    if (missingKey) {
      var missingLabel = missingKey === "gold" ? "or" : (WAREHOUSE_RESOURCES[missingKey] ? WAREHOUSE_RESOURCES[missingKey].name : missingKey);
      showToast("Pas assez de " + missingLabel, 1000);
      return false;
    }

    this._buying = true;

    game.gold -= cost.gold;
    Object.keys(cost).forEach(function (key) {
      if (key === "gold") return;
      WarehouseManager.removeResource(key, cost[key]);
    });

    game.construction[id].level += 1;

    if (window.QuestManager && typeof QuestManager.track === "function") {
      QuestManager.track("goldSpent", cost.gold);
    }

    if (window.WorkshopUnlockManager && typeof WorkshopUnlockManager.checkCurrentStep === "function") {
      WorkshopUnlockManager.checkCurrentStep();
    }

    addLog(def.name + " amélioré (niv. " + game.construction[id].level + ")", "event");
    showToast(def.name + " niv. " + game.construction[id].level, 1200);

    if (typeof renderPanel === "function") renderPanel();
    if (typeof renderHud === "function") renderHud();
    saveGame();

    this._buying = false;
    return true;
  },

  getSellBonus: function () {
    if (!CONSTRUCTION_BUILDINGS.workshop) return 1;
    return this.getCurrentBonusMultiplier("workshop");
  }
};

window.ConstructionManager = ConstructionManager;
