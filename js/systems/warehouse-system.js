"use strict";
/* systems/warehouse-system.js — Entrepôt : SEUL point d'écriture sur game.resources (addResource/removeResource/sellResource).
   Craft via file FIFO (game.craftQueue) : intrants déduits à la mise en file, outputs crédités à la fin. Détail : COMMENTAIRES_ORIGINAUX.md */

var WarehouseManager = {
  ensure: function () {
    if (!game.resources || typeof game.resources !== "object") game.resources = {};
    if (!Array.isArray(game.craftQueue)) game.craftQueue = [];
    if (typeof WAREHOUSE_RESOURCES === "undefined") return;
    Object.keys(WAREHOUSE_RESOURCES).forEach(function (key) {
      if (typeof game.resources[key] !== "number") game.resources[key] = 0;
    });
  },

  getAmount: function (key) {
    this.ensure();
    return Number((game.resources || {})[key] || 0);
  },

  addResource: function (key, amount, silent) {
    this.ensure();
    amount = Math.floor(Number(amount || 0));
    if (amount <= 0) return 0;
    if (typeof WAREHOUSE_RESOURCES === "undefined" || !WAREHOUSE_RESOURCES[key]) return 0;

    var def = WAREHOUSE_RESOURCES[key];
    var current = Number(game.resources[key] || 0);
    var cap = typeof def.cap === "number" ? def.cap : Infinity;
    var applied = Math.max(0, Math.min(amount, cap - current));
    if (applied <= 0) return 0;

    game.resources[key] = current + applied;

    if (!silent) {
      addLog(def.name + " +" + formatNumber(applied) + " (Entrepôt)", "event");
    }

    if ((key === "bois" || key === "pierre") && window.WorkshopUnlockManager && typeof WorkshopUnlockManager.checkCurrentStep === "function") {
      WorkshopUnlockManager.checkCurrentStep();
    }

    return applied;
  },

  removeResource: function (key, amount) {
    this.ensure();
    amount = Math.floor(Number(amount || 0));
    if (amount <= 0) return true;
    if (typeof WAREHOUSE_RESOURCES === "undefined" || !WAREHOUSE_RESOURCES[key]) return false;

    var current = Number(game.resources[key] || 0);
    if (current < amount) return false;

    game.resources[key] = current - amount;
    return true;
  },

  getSellPriceMultiplier: function () {
    if (window.ConstructionManager && typeof ConstructionManager.getSellBonus === "function") {
      return ConstructionManager.getSellBonus();
    }
    return 1;
  },

  sellResource: function (key, amount) {
    this.ensure();
    if (typeof WAREHOUSE_RESOURCES === "undefined" || !WAREHOUSE_RESOURCES[key]) return 0;

    var available = this.getAmount(key);
    var qty = Math.floor(Math.min(available, Number(amount || 0)));
    if (qty <= 0) {
      showToast("Rien à vendre", 1000);
      return 0;
    }

    var def = WAREHOUSE_RESOURCES[key];
    var price = Number(def.sellPrice || 0);
    var goldGain = Math.floor(qty * price * this.getSellPriceMultiplier());

    game.resources[key] = available - qty;
    game.gold += goldGain;
    game.totalGoldEarned += goldGain;

    if (window.QuestManager && typeof QuestManager.track === "function") {
      QuestManager.track("goldEarned", goldGain);
    }

    addLog(def.name + " vendue ×" + formatNumber(qty) + " (+" + formatNumber(goldGain) + " or)", "event");
    showToast("+" + formatNumber(goldGain) + " or", 1300);

    if (typeof renderPanel === "function") renderPanel();
    if (typeof renderHud === "function") renderHud();
    saveGame();

    return goldGain;
  },

  canCraft: function (recipe, times) {
    this.ensure();
    times = Math.floor(Number(times || 1));
    if (times <= 0 || !recipe || !recipe.inputs) return false;
    if (recipe.station) {
      var stationLevel = (game.construction && game.construction[recipe.station] && game.construction[recipe.station].level) || 0;
      if (stationLevel < 1) return false;
    }
    return recipe.inputs.every(function (input) {
      return WarehouseManager.getAmount(input.resourceId) >= input.quantity * times;
    });
  },

  enqueueCraft: function (recipe, times) {
    this.ensure();
    times = Math.floor(Number(times || 1));
    if (!this.canCraft(recipe, times)) return false;

    recipe.inputs.forEach(function (input) {
      game.resources[input.resourceId] = Number(game.resources[input.resourceId] || 0) - input.quantity * times;
    });

    var entry = {
      id: "cq_" + Date.now() + "_" + Math.floor(Math.random() * 100000),
      recipeId: recipe.id,
      times: times,
      msRemaining: Number(recipe.craftTimeMs || 0) * times
    };
    game.craftQueue.push(entry);

    addLog((WAREHOUSE_RESOURCES[recipe.outputs[0].resourceId] || {}).name + " ×" + formatNumber(times) + " mis en file (Entrepôt)", "event");

    if (typeof renderPanel === "function") renderPanel();
    if (typeof renderHud === "function") renderHud();
    saveGame();

    return true;
  },

  tickCraftQueue: function (dt) {
    this.ensure();
    dt = Math.max(0, Number(dt || 0));
    if (dt <= 0 || !game.craftQueue.length) return;

    var entry = game.craftQueue[0];
    entry.msRemaining -= dt * 1000;

    if (entry.msRemaining > 0) {
      if (typeof this._maybeRenderWarehouse === "function") this._maybeRenderWarehouse(dt);
      return;
    }

    game.craftQueue.shift();

    var recipe = (typeof RECIPES !== "undefined") ? RECIPES[entry.recipeId] : null;
    if (recipe) {
      recipe.outputs.forEach(function (output) {
        WarehouseManager.addResource(output.resourceId, output.quantity * entry.times, true);
      });

      recipe.outputs.forEach(function (output) {
        if (output.resourceId === "planche" && window.WorkshopUnlockManager && typeof WorkshopUnlockManager.notifyPlanchesCrafted === "function") {
          WorkshopUnlockManager.notifyPlanchesCrafted(output.quantity * entry.times);
        }
      });

      var outDef = WAREHOUSE_RESOURCES[recipe.outputs[0].resourceId];
      addLog((outDef ? outDef.name : recipe.label) + " fabriquée ×" + formatNumber(entry.times) + " (Entrepôt)", "event");
    }

    if (typeof renderPanel === "function") renderPanel();
    if (typeof renderHud === "function") renderHud();
    saveGame();

    var leftoverMs = -entry.msRemaining;
    if (leftoverMs > 0 && game.craftQueue.length) {
      this.tickCraftQueue(leftoverMs / 1000);
    }
  },

  _maybeRenderWarehouse: function (dt) {
    if (typeof isWarehouseScreenVisible !== "function" || !isWarehouseScreenVisible()) return;
    this._renderAccum = Number(this._renderAccum || 0) + dt;
    if (this._renderAccum < 1) return;
    this._renderAccum = 0;
    if (typeof renderPanel === "function") renderPanel();
  },

  cancelCraft: function (queueId) {
    this.ensure();
    var index = game.craftQueue.findIndex(function (e) { return e.id === queueId; });
    if (index <= 0) return false;

    var entry = game.craftQueue[index];
    var recipe = (typeof RECIPES !== "undefined") ? RECIPES[entry.recipeId] : null;
    if (recipe) {
      recipe.inputs.forEach(function (input) {
        game.resources[input.resourceId] = Number(game.resources[input.resourceId] || 0) + input.quantity * entry.times;
      });
    }

    game.craftQueue.splice(index, 1);
    addLog("Commande de craft annulée, ressources remboursées", "event");

    if (typeof renderPanel === "function") renderPanel();
    saveGame();

    return true;
  },

  refundAndClearCraftQueue: function () {
    this.ensure();
    game.craftQueue.forEach(function (entry) {
      var recipe = (typeof RECIPES !== "undefined") ? RECIPES[entry.recipeId] : null;
      if (!recipe) return;
      recipe.inputs.forEach(function (input) {
        game.resources[input.resourceId] = Number(game.resources[input.resourceId] || 0) + input.quantity * entry.times;
      });
    });
    game.craftQueue = [];
  }
};

window.WarehouseManager = WarehouseManager;
