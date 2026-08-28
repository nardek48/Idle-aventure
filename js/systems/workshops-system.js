"use strict";
/* systems/workshops-system.js — v3.98.0 : WorkshopsSystem, craft par ATELIER (file FIFO
   indépendante par atelier, pas une seule file partagée). Remplace le craft générique de
   l'Entrepôt (WarehouseManager.enqueueCraft/tickCraftQueue/canCraft/cancelCraft — retirés,
   voir warehouse-system.js). Persistance dans game.production[buildingId].workshops[workshopId]
   = { queue: [...] } — même bloc opaque déjà traité par save-system.js pour game.production,
   aucune modification de ce fichier protégé nécessaire.
   Tick appelé depuis ProductionManager.tick() (lui-même déjà appelé par game-loop.js,
   fichier protégé non modifié) — voir production-system.js.
   v3.98.0 : niveau fixe, file illimitée (voir data/workshops.js pour le détail des
   décisions de design validées avec Seb). Détail : COMMENTAIRES_ORIGINAUX.md */

var WorkshopsSystem = {
  ensureWorkshop: function (buildingId, workshopId) {
    if (!game.production || typeof game.production !== "object") game.production = {};
    if (!game.production[buildingId] || typeof game.production[buildingId] !== "object") {
      game.production[buildingId] = {};
    }
    var bucket = game.production[buildingId];
    if (!bucket.workshops || typeof bucket.workshops !== "object") bucket.workshops = {};
    if (!bucket.workshops[workshopId] || typeof bucket.workshops[workshopId] !== "object") {
      bucket.workshops[workshopId] = { queue: [] };
    }
    if (!Array.isArray(bucket.workshops[workshopId].queue)) bucket.workshops[workshopId].queue = [];
    return bucket.workshops[workshopId];
  },

  getQueue: function (workshopId) {
    var def = WORKSHOPS_CONFIG[workshopId];
    if (!def) return [];
    return this.ensureWorkshop(def.buildingId, workshopId).queue;
  },

  getRecipe: function (workshopId, recipeId) {
    var def = WORKSHOPS_CONFIG[workshopId];
    if (!def || !def.recipes) return null;
    if (recipeId) return def.recipes.find(function (r) { return r.id === recipeId; }) || null;
    return def.recipes[0] || null;
  },

  getMaxCraftTimes: function (workshopId, recipeId) {
    var recipe = this.getRecipe(workshopId, recipeId);
    if (!recipe) return 0;
    return recipe.inputs.reduce(function (min, input) {
      var possible = Math.floor(WarehouseManager.getAmount(input.resourceId) / input.quantity);
      return Math.min(min, possible);
    }, Infinity);
  },

  canCraft: function (workshopId, recipeId, times) {
    times = Math.floor(Number(times || 1));
    if (times <= 0) return false;
    return this.getMaxCraftTimes(workshopId, recipeId) >= times;
  },

  /* Met en file `times` lots de `recipeId` dans l'atelier `workshopId`. Intrants déduits
     immédiatement (comme l'ancien système), outputs crédités à la fin du craft. */
  enqueueCraft: function (workshopId, recipeId, times) {
    var def = WORKSHOPS_CONFIG[workshopId];
    if (!def || !def.active) return false;
    var recipe = this.getRecipe(workshopId, recipeId);
    if (!recipe) return false;
    times = Math.floor(Number(times || 1));
    if (!this.canCraft(workshopId, recipeId, times)) return false;

    recipe.inputs.forEach(function (input) {
      game.resources[input.resourceId] = Number(game.resources[input.resourceId] || 0) - input.quantity * times;
    });

    var workshop = this.ensureWorkshop(def.buildingId, workshopId);
    workshop.queue.push({
      id: "wq_" + Date.now() + "_" + Math.floor(Math.random() * 100000),
      recipeId: recipe.id,
      times: times,
      msRemaining: Number(recipe.craftTimeMs || 0) * times
    });

    var outDef = WAREHOUSE_RESOURCES[recipe.outputs[0].resourceId];
    addLog((outDef ? outDef.name : recipe.id) + " mise en file (" + def.name + ")", "event");

    if (typeof renderPanel === "function") renderPanel();
    if (typeof renderHud === "function") renderHud();
    saveGame();
    return true;
  },

  cancelCraft: function (workshopId, queueId) {
    var def = WORKSHOPS_CONFIG[workshopId];
    if (!def) return false;
    var queue = this.getQueue(workshopId);
    var index = queue.findIndex(function (e) { return e.id === queueId; });
    if (index <= 0) return false; // le lot en cours (index 0) ne s'annule pas, comme l'ancien système

    var entry = queue[index];
    var recipe = this.getRecipe(workshopId, entry.recipeId);
    if (recipe) {
      recipe.inputs.forEach(function (input) {
        game.resources[input.resourceId] = Number(game.resources[input.resourceId] || 0) + input.quantity * entry.times;
      });
    }
    queue.splice(index, 1);
    addLog("Commande annulée, ressources remboursées (" + def.name + ")", "event");

    if (typeof renderPanel === "function") renderPanel();
    saveGame();
    return true;
  },

  /* Tick d'UN atelier : avance le lot en tête de file, le complète si son temps est
     écoulé, enchaîne sur le suivant avec le temps restant (même logique que l'ancien
     tickCraftQueue). Appelé par tickAll() pour chaque atelier actif. */
  tickWorkshop: function (workshopId, dt) {
    var def = WORKSHOPS_CONFIG[workshopId];
    if (!def || !def.active) return;
    var queue = this.getQueue(workshopId);
    if (!queue.length) return;

    var entry = queue[0];
    entry.msRemaining -= dt * 1000;
    if (entry.msRemaining > 0) return;

    queue.shift();
    var recipe = this.getRecipe(workshopId, entry.recipeId);
    if (recipe) {
      recipe.outputs.forEach(function (output) {
        WarehouseManager.addResource(output.resourceId, output.quantity * entry.times, true);
      });

      // v3.98.0 : le tutoriel de déblocage de l'Atelier de Construction exige "Fabriquer
      // 5 Planches" (voir data/workshop-unlock.js) — hook conservé ici, Planche vit
      // désormais dans l'atelier Scierie fine plutôt que dans l'ancien craft Entrepôt.
      recipe.outputs.forEach(function (output) {
        if (output.resourceId === "planche" && window.WorkshopUnlockManager && typeof WorkshopUnlockManager.notifyPlanchesCrafted === "function") {
          WorkshopUnlockManager.notifyPlanchesCrafted(output.quantity * entry.times);
        }
      });

      var outDef = WAREHOUSE_RESOURCES[recipe.outputs[0].resourceId];
      addLog((outDef ? outDef.name : recipe.id) + " fabriquée ×" + formatNumber(entry.times) + " (" + def.name + ")", "event");
    }

    if (typeof renderPanel === "function") renderPanel();
    if (typeof renderHud === "function") renderHud();
    saveGame();

    var leftoverMs = -entry.msRemaining;
    if (leftoverMs > 0 && queue.length) {
      this.tickWorkshop(workshopId, leftoverMs / 1000);
    }
  },

  /* Rembourse et vide TOUTES les files de tous les ateliers — appelé depuis
     WarehouseManager.refundAndClearCraftQueue() (point d'entrée générique conservé,
     lui-même appelé par save-system.js:hardResetState(), fichier protégé non modifié). */
  refundAndClearAll: function () {
    var self = this;
    Object.keys(WORKSHOPS_CONFIG).forEach(function (workshopId) {
      var queue = self.getQueue(workshopId);
      queue.forEach(function (entry) {
        var recipe = self.getRecipe(workshopId, entry.recipeId);
        if (!recipe) return;
        recipe.inputs.forEach(function (input) {
          game.resources[input.resourceId] = Number(game.resources[input.resourceId] || 0) + input.quantity * entry.times;
        });
      });
      queue.length = 0;
    });
  }
};

window.WorkshopsSystem = WorkshopsSystem;
