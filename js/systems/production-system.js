"use strict";
/* systems/production-system.js — ProductionManager, 4+ bâtiments à stock local plafonné (distinct de VillageManager, bonus % sans stock).
   tick(dt) en continu + catchUpOffline() au boot (lastTick propre, indépendant de game.lastOnline).
   v3.92.0 : la Carrière (quarry) est le premier bâtiment soumis à un verrou de déblocage réel
   (voir isBuildingUnlocked/unlockBuilding) — aucune production tant que non débloquée.
   v3.93.0 : la Chasse (hunt) suit le même principe, débloquée par la quête "La Meute Affamée"
   (data/adventure-quests.js, AdventureQuestManager existant, aucune nouvelle mécanique de
   combat créée). v3.94.0 : le Puits (well) suit le même principe, débloqué par la quête
   "La Source Tarie" (systems/well-system.js). Détail complet : COMMENTAIRES_ORIGINAUX.md */

var PRODUCTION_UNLOCK_FLAGS = {
  quarry: "quarryUnlocked",
  hunt: "huntBuildingUnlocked",
  well: "wellUnlocked"
};

var ProductionManager = {
  /* v3.93.0/v3.94.0 : généralisé à tout bâtiment listé dans PRODUCTION_UNLOCK_FLAGS
     (quarry, hunt, well) — retourne toujours true pour tout bâtiment non soumis à un verrou. */
  isBuildingUnlocked: function (id) {
    var flagName = PRODUCTION_UNLOCK_FLAGS[id];
    if (!flagName) return true;
    return !!(game.explorationProgression && game.explorationProgression[flagName]);
  },

  ensure: function () {
    if (!game.production || typeof game.production !== "object") game.production = {};
    var self = this;
    Object.keys(PRODUCTION_BUILDINGS).forEach(function (id) {
      if (!self.isBuildingUnlocked(id)) return; // pas d'initialisation tant que verrouillé
      // v3.97.0 : tout bâtiment listé dans PRODUCTION_PLOTS_BUILDINGS (les 6 : Chasse,
      // Champs, Scierie, Mine, Carrière, Puits) n'a plus de niveau/stock de bâtiment —
      // délégué en totalité à ProductionPlotsSystem (9 zones indépendantes). Généralise
      // ce qui était câblé sur "farm" en dur depuis v3.96.0.
      if (window.ProductionPlotsSystem && ProductionPlotsSystem.isManaged(id)) {
        ProductionPlotsSystem.ensurePlots(id);
        return;
      }
      if (!game.production[id] || typeof game.production[id] !== "object") {
        game.production[id] = { level: 1, stock: 0, lastTick: Date.now() };
      }
      var b = game.production[id];
      if (typeof b.level !== "number" || b.level < 1) b.level = 1;
      if (typeof b.stock !== "number" || b.stock < 0) b.stock = 0;
      if (typeof b.lastTick !== "number") b.lastTick = Date.now();
    });
  },

  /* Initialisation rétroactive au moment du déblocage de n'importe quel bâtiment verrouillable
     (appelée par MiningManager.settle() pour quarry, par openQuestCompletePopup() pour hunt).
     Idempotent : ne réinitialise pas un bâtiment déjà présent (ex. migration). */
  unlockBuilding: function (id) {
    if (!game.production || typeof game.production !== "object") game.production = {};
    if (!game.production[id] || typeof game.production[id] !== "object") {
      game.production[id] = { level: 1, stock: 0, lastTick: Date.now() };
    }
  },

  /* v3.97.0 : tout bâtiment géré par ProductionPlotsSystem (9 zones indépendantes) n'a
     plus de niveau de bâtiment unique — retourne 1 par convention pour tout appelant
     externe (aucun connu actuellement, gardé par sécurité). Généralisé depuis "farm". */
  getLevel: function (id) {
    if (window.ProductionPlotsSystem && ProductionPlotsSystem.isManaged(id)) return 1;
    this.ensure();
    return Number((game.production[id] || {}).level || 1);
  },

  getStock: function (id) {
    this.ensure();
    if (window.ProductionPlotsSystem && ProductionPlotsSystem.isManaged(id)) {
      return ProductionPlotsSystem.getTotalStock(id);
    }
    return Number((game.production[id] || {}).stock || 0);
  },

  getRatePerMin: function (id) {
    if (window.ProductionPlotsSystem && ProductionPlotsSystem.isManaged(id)) {
      return ProductionPlotsSystem.getTotalRatePerMin(id);
    }
    var level = this.getLevel(id);
    return PRODUCTION_CONFIG.baseRatePerMin * Math.pow(PRODUCTION_CONFIG.rateGrowthPerLevel, level - 1);
  },

  getCapacity: function (id) {
    if (window.ProductionPlotsSystem && ProductionPlotsSystem.isManaged(id)) {
      return ProductionPlotsSystem.getTotalCapacity(id);
    }
    var level = this.getLevel(id);
    return Math.floor(PRODUCTION_CONFIG.baseCapacity * (1 + PRODUCTION_CONFIG.capacityGrowthPerLevel * (level - 1)));
  },

  isStockFull: function (id) {
    return this.getStock(id) >= this.getCapacity(id);
  },

  /* v3.95.0 : coût multi-ressources par bâtiment (voir getProductionBuildingCost dans
     production-buildings.js). Retourne { gold, <ressource1>, <ressource2> } — remplace
     l'ancien getCost() en or seul, appelé désormais getNextCost() par cohérence de nom
     avec ConstructionManager.getNextCost() (même pattern). */
  getNextCost: function (id) {
    if (this.isMaxLevel(id)) return null;
    var level = this.getLevel(id);
    return getProductionBuildingCost(id, level);
  },

  /* Vérifie si le joueur peut payer le prochain palier (or + toutes les ressources
     requises). Même pattern que ConstructionManager.getAffordability(). */
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

    // v3.97.0 : tous les bâtiments gérés par ProductionPlotsSystem (les 6) délégués en
    // totalité — tick propre par zone. Généralisé depuis "farm" seul.
    ProductionPlotsSystem.getManagedBuildingIds().forEach(function (id) {
      if (!self.isBuildingUnlocked(id)) return;
      ProductionPlotsSystem.tick(id, dt);
      changed = true;
    });

    Object.keys(PRODUCTION_BUILDINGS).forEach(function (id) {
      if (ProductionPlotsSystem.isManaged(id)) return; // géré ci-dessus
      if (!self.isBuildingUnlocked(id)) return; // v3.92.0 : Carrière verrouillée -> aucune production
      var b = game.production[id];
      if (!b) return; // garde défensive (ne devrait pas arriver après ensure(), mais sécurise tick())
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

    // v3.97.0 : tous les bâtiments gérés par ProductionPlotsSystem délégués en totalité —
    // rattrapage propre par zone. Généralisé depuis "farm" seul.
    ProductionPlotsSystem.getManagedBuildingIds().forEach(function (id) {
      if (!self.isBuildingUnlocked(id)) return;
      ProductionPlotsSystem.catchUpOffline(id);
    });

    Object.keys(PRODUCTION_BUILDINGS).forEach(function (id) {
      if (ProductionPlotsSystem.isManaged(id)) return; // géré ci-dessus
      if (!self.isBuildingUnlocked(id)) return; // v3.92.0 : Carrière verrouillée -> aucun rattrapage
      var b = game.production[id];
      if (!b) return; // garde défensive, même raison que tick() ci-dessus
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

  /* v3.97.0 : tout bâtiment géré par ProductionPlotsSystem récolte via harvestAll(id)
     (somme de toutes les zones ouvertes), généralisé depuis "farm" seul. */
  harvest: function (id) {
    this.ensure();
    if (!this.isBuildingUnlocked(id)) return; // v3.92.0 : garde défensive
    var def = PRODUCTION_BUILDINGS[id];
    if (!def) return;

    var amount;
    if (window.ProductionPlotsSystem && ProductionPlotsSystem.isManaged(id)) {
      amount = ProductionPlotsSystem.harvestAll(id);
    } else {
      var b = game.production[id];
      if (!b) return;
      amount = Math.floor(b.stock);
      if (amount > 0) b.stock -= amount;
    }

    if (amount <= 0) {
      showToast("Rien à récolter", 1000);
      return;
    }

    WarehouseManager.addResource(def.resourceKey, amount, true);
    if (!(window.ProductionPlotsSystem && ProductionPlotsSystem.isManaged(id))) game.production[id].lastTick = Date.now();

    var resDef = WAREHOUSE_RESOURCES[def.resourceKey];
    addLog("🌾 " + def.name + " récoltée : +" + formatNumber(amount) + " " + (resDef ? resDef.name : def.resourceKey), "event");
    showToast("+" + formatNumber(amount) + " " + (resDef ? resDef.name : ""), 1300);

    if (typeof renderPanel === "function") renderPanel();
    saveGame();
  },

  /* v3.97.0 : tout bâtiment géré par ProductionPlotsSystem n'a plus de niveau de bâtiment
     ni de bouton "Améliorer" global — ses zones s'améliorent individuellement via
     ProductionPlotsSystem.unlockPlot()/upgradePlot()/toggleImprovement(), appelées
     directement depuis l'UI. buy() reste réservé aux bâtiments non gérés (garde défensive
     ci-dessous si jamais appelée sur un bâtiment à zones). Généralisé depuis "farm" seul. */
  buy: function (id) {
    if (window.ProductionPlotsSystem && ProductionPlotsSystem.isManaged(id)) return; // plus de niveau de bâtiment unique
    this.ensure();
    if (!this.isBuildingUnlocked(id)) return; // v3.92.0 : garde défensive
    var b = game.production[id];
    var def = PRODUCTION_BUILDINGS[id];
    if (!b || !def) return;

    if (this.isMaxLevel(id)) {
      showToast("Niveau maximum", 1200);
      return;
    }

    var cost = this.getNextCost(id);
    var afford = this.getAffordability(id);

    var missingKey = Object.keys(afford).find(function (key) {
      return key !== "all" && afford[key] === false;
    });
    if (missingKey) {
      var missingLabel = missingKey === "gold" ? "or" : (WAREHOUSE_RESOURCES[missingKey] ? WAREHOUSE_RESOURCES[missingKey].name : missingKey);
      showToast("Pas assez de " + missingLabel, 1000);
      return;
    }

    game.gold -= cost.gold;
    Object.keys(cost).forEach(function (key) {
      if (key === "gold") return;
      WarehouseManager.removeResource(key, cost[key]);
    });

    b.level += 1;

    if (window.QuestManager && typeof QuestManager.track === "function") {
      QuestManager.track("goldSpent", cost.gold);
    }

    addLog(def.name + " amélioré (niv. " + b.level + ")", "event");
    showToast(def.name + " niv. " + b.level, 1200);

    if (typeof renderPanel === "function") renderPanel();
    saveGame();
  }
};

window.ProductionManager = ProductionManager;
