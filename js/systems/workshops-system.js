"use strict";
/* systems/workshops-system.js — v3.98.0 : WorkshopsSystem, craft par ATELIER (file FIFO
   indépendante par atelier, pas une seule file partagée). Remplace le craft générique de
   l'Entrepôt (WarehouseManager.enqueueCraft/tickCraftQueue/canCraft/cancelCraft — retirés,
   voir warehouse-system.js). Persistance dans game.production[buildingId].workshops[workshopId]
   = { queue: [...], lastTick, level } — même bloc opaque déjà traité par save-system.js
   pour game.production, aucune modification de ce fichier protégé nécessaire.
   Tick appelé depuis ProductionManager.tick() (lui-même déjà appelé par game-loop.js,
   fichier protégé non modifié) — voir production-system.js.

   v3.98.4 : lastTick + catchUpOffline() : le craft continue hors ligne, MAIS uniquement
   sur les lots déjà en file au moment de la fermeture — décision validée avec Seb, aucun
   nouveau lot n'est ajouté automatiquement pendant l'absence (à distinguer d'une
   éventuelle automatisation future qui, elle, pousserait de nouvelles entrées dans la
   queue ; le rattrapage en cascade ci-dessous les consommerait alors nativement sans
   modification).

   v3.98.6 : niveau d'atelier (1 à WORKSHOP_LEVEL_CONFIG.maxLevel), INDÉPENDANT par
   atelier (voir data/workshops.js pour la config complète des décisions validées avec
   Seb). Remplace l'ancienne constante globale WORKSHOP_MAX_QUEUE_LENGTH (posée en
   v3.98.4) : la taille de file max devient getMaxQueueLength(workshopId) = niveau actuel
   de l'atelier (niveau 1 -> 1 entrée, niveau max -> WORKSHOP_LEVEL_CONFIG.maxLevel
   entrées). La vitesse effective (getEffectiveCraftTimeMs) réduit linéairement le
   craftTimeMs de base de la recette de speedBonusPerLevel par niveau au-delà du niveau 1.
   Détail : COMMENTAIRES_ORIGINAUX.md */

var WorkshopsSystem = {
  ensureWorkshop: function (buildingId, workshopId) {
    if (!game.production || typeof game.production !== "object") game.production = {};
    if (!game.production[buildingId] || typeof game.production[buildingId] !== "object") {
      game.production[buildingId] = {};
    }
    var bucket = game.production[buildingId];
    if (!bucket.workshops || typeof bucket.workshops !== "object") bucket.workshops = {};
    if (!bucket.workshops[workshopId] || typeof bucket.workshops[workshopId] !== "object") {
      bucket.workshops[workshopId] = { queue: [], lastTick: Date.now(), level: 1 };
    }
    if (!Array.isArray(bucket.workshops[workshopId].queue)) bucket.workshops[workshopId].queue = [];
    if (typeof bucket.workshops[workshopId].lastTick !== "number") bucket.workshops[workshopId].lastTick = Date.now();
    if (typeof bucket.workshops[workshopId].level !== "number") bucket.workshops[workshopId].level = 1;
    return bucket.workshops[workshopId];
  },

  getLevel: function (workshopId) {
    var def = WORKSHOPS_CONFIG[workshopId];
    if (!def) return 1;
    return this.ensureWorkshop(def.buildingId, workshopId).level;
  },

  isMaxLevel: function (workshopId) {
    return this.getLevel(workshopId) >= WORKSHOP_LEVEL_CONFIG.maxLevel;
  },

  /* Taille de file max ACTUELLE de l'atelier = son niveau (niveau 1 -> 1 entrée,
     niveau max -> WORKSHOP_LEVEL_CONFIG.maxLevel entrées). */
  getMaxQueueLength: function (workshopId) {
    return this.getLevel(workshopId);
  },

  /* craftTimeMs effectif de la recette, réduit linéairement selon le niveau de
     l'atelier (-speedBonusPerLevel par niveau au-delà du niveau 1). */
  getEffectiveCraftTimeMs: function (workshopId, recipe) {
    if (!recipe) return 0;
    var level = this.getLevel(workshopId);
    var reduction = Math.min(0.95, WORKSHOP_LEVEL_CONFIG.speedBonusPerLevel * (level - 1));
    return Math.max(1, Math.round(Number(recipe.craftTimeMs || 0) * (1 - reduction)));
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

  /* Coût pour améliorer l'atelier à son niveau suivant, null si déjà au niveau max. */
  getUpgradeCost: function (workshopId) {
    if (this.isMaxLevel(workshopId)) return null;
    return getWorkshopUpgradeCost(workshopId, this.getLevel(workshopId));
  },

  getUpgradeAffordability: function (workshopId) {
    var cost = this.getUpgradeCost(workshopId);
    if (!cost) return { all: false };
    var result = {};
    Object.keys(cost).forEach(function (key) {
      result[key] = WarehouseManager.getAmount(key) >= cost[key];
    });
    result.all = Object.keys(result).every(function (k) { return result[k]; });
    return result;
  },

  /* Améliore l'atelier d'un niveau — coût en Planche+Lingot (voir data/workshops.js),
     jamais la propre PRODUCTION BRUTE du bâtiment (règle des zones), mais peut inclure
     l'extrant propre de l'atelier lui-même (Scierie fine/Fonderie) : accepté
     explicitement par Seb, décision différente de celle des zones. */
  upgradeWorkshop: function (workshopId) {
    var def = WORKSHOPS_CONFIG[workshopId];
    if (!def || !def.active) return { ok: false, reason: "Atelier invalide" };
    if (this.isMaxLevel(workshopId)) return { ok: false, reason: "Niveau maximum" };

    var cost = this.getUpgradeCost(workshopId);
    if (!cost) return { ok: false, reason: "Atelier invalide" };
    var canAfford = Object.keys(cost).every(function (key) {
      return WarehouseManager.getAmount(key) >= cost[key];
    });
    if (!canAfford) return { ok: false, reason: "Ressources insuffisantes" };

    Object.keys(cost).forEach(function (key) { WarehouseManager.removeResource(key, cost[key]); });

    var workshop = this.ensureWorkshop(def.buildingId, workshopId);
    workshop.level += 1;

    addLog("⚙️ " + def.name + " amélioré (niv. " + workshop.level + ")", "event");
    if (typeof showToast === "function") showToast(def.name + " niv. " + workshop.level, 1200);

    if (typeof renderPanel === "function") renderPanel();
    saveGame();
    return { ok: true, reason: null };
  },

  /* Met en file `times` lots de `recipeId` dans l'atelier `workshopId`. Intrants déduits
     immédiatement (comme l'ancien système), outputs crédités à la fin du craft.
     v3.98.6 : refuse au-delà de getMaxQueueLength(workshopId) entrées — dépend
     désormais du niveau de l'atelier plutôt que d'une constante globale (le nombre
     d'ENTRÉES, pas la somme des ×N — un lot ×20 compte pour 1 entrée comme un lot ×1). */
  enqueueCraft: function (workshopId, recipeId, times) {
    var def = WORKSHOPS_CONFIG[workshopId];
    if (!def || !def.active) return false;
    var recipe = this.getRecipe(workshopId, recipeId);
    if (!recipe) return false;
    times = Math.floor(Number(times || 1));
    if (!this.canCraft(workshopId, recipeId, times)) return false;

    var workshop = this.ensureWorkshop(def.buildingId, workshopId);
    var maxQueueLength = this.getMaxQueueLength(workshopId);
    if (workshop.queue.length >= maxQueueLength) {
      if (typeof showToast === "function") showToast("File pleine (max " + maxQueueLength + ")", 1200);
      return false;
    }

    recipe.inputs.forEach(function (input) {
      game.resources[input.resourceId] = Number(game.resources[input.resourceId] || 0) - input.quantity * times;
    });

    workshop.queue.push({
      id: "wq_" + Date.now() + "_" + Math.floor(Math.random() * 100000),
      recipeId: recipe.id,
      times: times,
      msRemaining: this.getEffectiveCraftTimeMs(workshopId, recipe) * times
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
    var workshop = this.ensureWorkshop(def.buildingId, workshopId);
    workshop.lastTick = Date.now();
    var queue = workshop.queue;
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

  /* Rattrapage hors ligne d'UN atelier : consomme le temps écoulé en cascade sur les
     entrées DÉJÀ en file (option B validée avec Seb — aucun nouveau lot ajouté
     automatiquement, contrairement à un futur système d'automatisation qui pousserait
     lui-même de nouvelles entrées avant ce rattrapage). Même logique de complétion que
     tickWorkshop (outputs crédités, hook Planches, log), sans renderPanel/renderHud à
     chaque étape (pas encore de premier rendu à ce stade du boot) — un seul saveGame()
     à la fin, déclenché par l'appelant (ProductionManager.catchUpOffline()). */
  catchUpOffline: function (workshopId) {
    var def = WORKSHOPS_CONFIG[workshopId];
    if (!def || !def.active) return;
    var workshop = this.ensureWorkshop(def.buildingId, workshopId);
    var now = Date.now();
    var elapsedMs = now - Number(workshop.lastTick || now);
    workshop.lastTick = now;
    if (elapsedMs <= 1000) return;

    var queue = workshop.queue;
    while (queue.length && elapsedMs > 0) {
      var entry = queue[0];
      entry.msRemaining -= elapsedMs;
      if (entry.msRemaining > 0) break;

      elapsedMs = -entry.msRemaining;
      queue.shift();
      var recipe = this.getRecipe(workshopId, entry.recipeId);
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
        addLog((outDef ? outDef.name : recipe.id) + " fabriquée ×" + formatNumber(entry.times) + " (" + def.name + ", hors ligne)", "event");
      }
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
