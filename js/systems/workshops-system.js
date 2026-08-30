"use strict";
/* systems/workshops-system.js — v3.98.0 : WorkshopsSystem, craft par ATELIER (file FIFO
   indépendante par atelier, pas une seule file partagée). Remplace le craft générique de
   l'Entrepôt (WarehouseManager.enqueueCraft/tickCraftQueue/canCraft/cancelCraft — retirés,
   voir warehouse-system.js). Persistance dans game.production[buildingId].workshops[workshopId]
   = { queue: [...], lastTick, level, autoRecipeId } — même bloc opaque déjà traité par
   save-system.js pour game.production, aucune modification de ce fichier protégé
   nécessaire.
   Tick appelé depuis ProductionManager.tick() (lui-même déjà appelé par game-loop.js,
   fichier protégé non modifié) — voir production-system.js.

   v3.98.4 : lastTick + catchUpOffline() : le craft continue hors ligne, sur les lots déjà
   en file au moment de la fermeture.

   v3.98.6 : niveau d'atelier (1 à WORKSHOP_LEVEL_CONFIG.maxLevel), INDÉPENDANT par
   atelier. getMaxQueueLength(workshopId) = niveau actuel de l'atelier.

   v3.98.13 : CHAÎNAGE AUTOMATIQUE — décisions validées avec Seb :
   - Un toggle auto PAR RECETTE (pas par atelier), mais une seule recette auto-active à la
     fois par atelier (autoRecipeId, null si aucune) : activer une recette désactive
     automatiquement l'autre sur le même atelier — sinon deux recettes se disputeraient la
     même file.
   - La quantité ×N utilisée par le chaînage réutilise le stepper existant
     (workshopCraftQty, voir ui/production-view.js), y compris "Max" — recalculé à CHAQUE
     déclenchement du chaînage (pas figé), toujours borné par
     ResourceReserveManager.getAvailableForAutoCraft() plutôt que le stock brut.
   - Le craft MANUEL (enqueueCraft, appelé par le bouton "Fabriquer") n'est JAMAIS limité
     par la réserve protégée — seul le chaînage auto la respecte. Idem pour les
     améliorations (upgradeWorkshop) : jamais concernées.
   - Le chaînage se déclenche à chaque fin de lot, en tick normal ET en rattrapage hors
     ligne (cohérent avec le craft normal déjà hors-ligne) : dès qu'une entrée se termine,
     _tryAutoEnqueue() est appelée avant de passer à l'entrée suivante de la cascade — si
     la file a de la place ET que la quantité voulue (bornée par la réserve) est >= 1, un
     nouveau lot est poussé, qui participera lui-même à cette même cascade s'il reste du
     temps écoulé à consommer (rattrapage hors ligne).
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
      bucket.workshops[workshopId] = { queue: [], lastTick: Date.now(), level: 1, autoRecipeId: null };
    }
    var w = bucket.workshops[workshopId];
    if (!Array.isArray(w.queue)) w.queue = [];
    if (typeof w.lastTick !== "number") w.lastTick = Date.now();
    if (typeof w.level !== "number") w.level = 1;
    if (typeof w.autoRecipeId === "undefined") w.autoRecipeId = null;
    return w;
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
  /* craftTimeMs effectif de la recette, réduit linéairement selon le niveau de
     l'atelier (-speedBonusPerLevel par niveau au-delà du niveau 1). `levelOverride`
     optionnel (v3.98.16) permet de calculer l'effet à un AUTRE niveau que l'actuel —
     utilisé pour afficher l'aperçu "au niveau suivant" sur le bouton Améliorer. */
  getEffectiveCraftTimeMs: function (workshopId, recipe, levelOverride) {
    if (!recipe) return 0;
    var level = typeof levelOverride === "number" ? levelOverride : this.getLevel(workshopId);
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

  /* v3.98.13 : équivalent de getMaxCraftTimes, mais borné par
     ResourceReserveManager.getAvailableForAutoCraft() plutôt que le stock brut — utilisé
     UNIQUEMENT par le chaînage auto, jamais par le craft manuel.
     v3.98.21 : ajoute aussi une borne sur la marge disponible avant le PLAFOND (cap) de
     chaque ressource PRODUITE par la recette (retour Seb — le chaînage continuait de
     consommer des intrants et d'occuper la file même quand la sortie était déjà pleine,
     gaspillant intrants/temps de craft pour un résultat qui aurait été silencieusement
     écrêté par WarehouseManager.addResource au moment du crédit). Le craft MANUEL n'est
     jamais concerné par cette borne non plus (cohérent avec la réserve : le joueur reste
     libre de lancer un craft "à perte" s'il le décide lui-même). */
  getMaxAutoCraftTimes: function (workshopId, recipeId) {
    var recipe = this.getRecipe(workshopId, recipeId);
    if (!recipe) return 0;

    var maxFromInputs = (!window.ResourceReserveManager)
      ? this.getMaxCraftTimes(workshopId, recipeId)
      : recipe.inputs.reduce(function (min, input) {
          var possible = Math.floor(ResourceReserveManager.getAvailableForAutoCraft(input.resourceId) / input.quantity);
          return Math.min(min, possible);
        }, Infinity);

    var maxFromOutputCaps = recipe.outputs.reduce(function (min, output) {
      var def = WAREHOUSE_RESOURCES[output.resourceId];
      var cap = def && typeof def.cap === "number" ? def.cap : Infinity;
      if (cap === Infinity) return min;
      var current = WarehouseManager.getAmount(output.resourceId);
      var remainingRoom = Math.max(0, cap - current);
      var possible = Math.floor(remainingRoom / output.quantity);
      return Math.min(min, possible);
    }, Infinity);

    return Math.min(maxFromInputs, maxFromOutputCaps);
  },

  canCraft: function (workshopId, recipeId, times) {
    times = Math.floor(Number(times || 1));
    if (times <= 0) return false;
    return this.getMaxCraftTimes(workshopId, recipeId) >= times;
  },

  /* Recette actuellement auto-active sur cet atelier, ou null. */
  getAutoRecipeId: function (workshopId) {
    var def = WORKSHOPS_CONFIG[workshopId];
    if (!def) return null;
    return this.ensureWorkshop(def.buildingId, workshopId).autoRecipeId || null;
  },

  /* Active/désactive le chaînage auto sur `recipeId`. Une seule recette auto-active à la
     fois par atelier (règle validée avec Seb) : appeler avec une recette différente de
     celle déjà active la REMPLACE (pas de cumul) ; appeler avec la même recette déjà
     active la DÉSACTIVE (toggle). */
  setAutoRecipe: function (workshopId, recipeId) {
    var def = WORKSHOPS_CONFIG[workshopId];
    if (!def || !def.active) return;
    var workshop = this.ensureWorkshop(def.buildingId, workshopId);

    if (workshop.autoRecipeId === recipeId) {
      workshop.autoRecipeId = null;
      if (typeof showToast === "function") showToast("Production automatique désactivée", 1200);
    } else {
      workshop.autoRecipeId = recipeId;
      var recipe = this.getRecipe(workshopId, recipeId);
      var outDef = recipe ? WAREHOUSE_RESOURCES[recipe.outputs[0].resourceId] : null;
      if (typeof showToast === "function") showToast("Auto : " + (outDef ? outDef.name : recipeId), 1200);
    }

    if (typeof renderPanel === "function") renderPanel();
    saveGame();
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
     explicitement par Seb, décision différente de celle des zones. JAMAIS limité par la
     réserve protégée (règle du chaînage auto, sans rapport avec les améliorations). */
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
     v3.98.6 : refuse au-delà de getMaxQueueLength(workshopId) entrées.
     v3.98.13 : CRAFT MANUEL — n'utilise JAMAIS ResourceReserveManager, seul le stock brut
     (via canCraft/getMaxCraftTimes) limite ce qui est possible ; la réserve protégée ne
     s'applique qu'au chaînage auto (voir _tryAutoEnqueue). `fromAuto` (interne, non
     exposé côté UI) évite de spammer logs/toasts lors d'un enqueue déclenché par le
     chaînage plutôt que par un clic joueur. */
  enqueueCraft: function (workshopId, recipeId, times, fromAuto) {
    var def = WORKSHOPS_CONFIG[workshopId];
    if (!def || !def.active) return false;
    var recipe = this.getRecipe(workshopId, recipeId);
    if (!recipe) return false;
    times = Math.floor(Number(times || 1));
    if (!this.canCraft(workshopId, recipeId, times)) return false;

    var workshop = this.ensureWorkshop(def.buildingId, workshopId);
    var maxQueueLength = this.getMaxQueueLength(workshopId);
    if (workshop.queue.length >= maxQueueLength) {
      if (!fromAuto && typeof showToast === "function") showToast("File pleine (max " + maxQueueLength + ")", 1200);
      return false;
    }

    recipe.inputs.forEach(function (input) {
      game.resources[input.resourceId] = Number(game.resources[input.resourceId] || 0) - input.quantity * times;
    });

    workshop.queue.push({
      id: "wq_" + Date.now() + "_" + Math.floor(Math.random() * 100000),
      recipeId: recipe.id,
      times: times,
      msRemaining: this.getEffectiveCraftTimeMs(workshopId, recipe) * times,
      auto: !!fromAuto
    });

    var outDef = WAREHOUSE_RESOURCES[recipe.outputs[0].resourceId];
    addLog((outDef ? outDef.name : recipe.id) + (fromAuto ? " remise en file automatiquement (" : " mise en file (") + def.name + ")", "event");

    if (!fromAuto) {
      if (typeof renderPanel === "function") renderPanel();
      if (typeof renderHud === "function") renderHud();
      saveGame();
    }
    return true;
  },

  /* v3.98.13 : tente de pousser un nouveau lot automatique dans la file, si une recette
     est auto-active sur cet atelier. Appelée après CHAQUE complétion de lot (tick normal
     et rattrapage hors ligne), avant de passer à la suite de la cascade. Quantité = le
     réglage stepper du joueur pour cette recette (workshopCraftQty, ui/production-view.js
     — "Max" y est déjà résolu au moment de l'appel par l'appelant si besoin, voir
     resolveAutoCraftQty), bornée par getMaxAutoCraftTimes (respecte la réserve). Ne fait
     RIEN silencieusement si la file est pleine ou si la réserve ne laisse pas de quoi
     faire un lot complet — pas de blocage, juste une attente au prochain lot. */
  /* v3.98.13 : tente de pousser un nouveau lot automatique dans la file, si une recette
     est auto-active sur cet atelier. Appelée après CHAQUE complétion de lot (tick normal
     et rattrapage hors ligne), avant de passer à la suite de la cascade. Quantité = le
     réglage stepper du joueur pour cette recette (workshopCraftQty, ui/production-view.js
     — "Max" y est déjà résolu au moment de l'appel par l'appelant si besoin, voir
     resolveAutoCraftQty), bornée par getMaxAutoCraftTimes (respecte la réserve). Ne fait
     RIEN silencieusement si la file est pleine ou si la réserve ne laisse pas de quoi
     faire un lot complet — pas de blocage, juste une attente au prochain lot.
     v3.98.18 : retourne true/false selon qu'un lot a été poussé — utilisé par
     tickWorkshop pour re-tenter PÉRIODIQUEMENT même quand la file est vide (voir plus
     bas), sans déclencher de re-render/save à chaque tick "rien ne s'est passé". */
  _tryAutoEnqueue: function (workshopId) {
    var def = WORKSHOPS_CONFIG[workshopId];
    if (!def || !def.active) return false;
    var workshop = this.ensureWorkshop(def.buildingId, workshopId);
    var recipeId = workshop.autoRecipeId;
    if (!recipeId) return false;

    var maxAuto = this.getMaxAutoCraftTimes(workshopId, recipeId);
    if (maxAuto <= 0) return false;

    var desiredQty = (typeof resolveAutoCraftQty === "function") ? resolveAutoCraftQty(workshopId, recipeId, maxAuto) : maxAuto;
    var qty = Math.max(0, Math.min(maxAuto, Math.floor(Number(desiredQty) || 0)));
    if (qty <= 0) return false;

    return this.enqueueCraft(workshopId, recipeId, qty, true);
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
     écoulé, tente le chaînage auto, enchaîne sur le suivant avec le temps restant (même
     logique que l'ancien tickCraftQueue). Appelé par tickAll() pour chaque atelier actif.
     v3.98.18 : si la file est VIDE mais qu'une recette auto est active, retente
     PÉRIODIQUEMENT _tryAutoEnqueue (throttlé à ~1x/s via _autoRetryAccum, indépendant du
     rythme du tick appelant) — jusque-là, un chaînage bloqué par la réserve protégée ne
     se relançait JAMAIS tout seul une fois la file vidée : plus aucune complétion de lot
     ne pouvait redéclencher _tryAutoEnqueue (elle n'était appelée qu'après une
     complétion). Si le joueur libère de la ressource entre-temps (vente, dépense
     ailleurs), l'auto repart de lui-même au prochain check plutôt que de rester bloqué
     indéfiniment tant que personne ne relance manuellement un lot. */
  tickWorkshop: function (workshopId, dt) {
    var def = WORKSHOPS_CONFIG[workshopId];
    if (!def || !def.active) return;
    var workshop = this.ensureWorkshop(def.buildingId, workshopId);
    workshop.lastTick = Date.now();
    var queue = workshop.queue;

    if (!queue.length) {
      if (!workshop.autoRecipeId) return;
      workshop._autoRetryAccum = Number(workshop._autoRetryAccum || 0) + dt;
      if (workshop._autoRetryAccum < 1) return;
      workshop._autoRetryAccum = 0;

      var pushed = this._tryAutoEnqueue(workshopId);
      if (pushed) {
        // v3.98.21 : même correctif que plus bas — rafraîchissement ciblé au lieu d'un
        // renderPanel() complet, pour ne pas casser le scroll de la page Production.
        if (typeof refreshWorkshopQueueDOM === "function") refreshWorkshopQueueDOM(workshopId);
        if (typeof renderHud === "function") renderHud();
        saveGame();
      }
      return;
    }

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

    this._tryAutoEnqueue(workshopId);

    // v3.98.21 : renderPanel() complet retiré ici (retour Seb — cassait le scroll de la
    // page Production, jank toutes les quelques secondes dès qu'un auto-craft à cycle
    // court tournait). Remplacé par un rafraîchissement CIBLÉ du seul bloc file de cet
    // atelier (garde la structure de la file à jour : entrée qui disparaît, nouvelle
    // entrée auto qui apparaît) + renderHud (léger, pas de reconstruction de page).
    // Le badge "File : X/Y" et le reste (temps, barre) restent couverts par
    // ProductionManager.updateDOM(), déjà appelée chaque seconde indépendamment.
    if (typeof refreshWorkshopQueueDOM === "function") refreshWorkshopQueueDOM(workshopId);
    if (typeof renderHud === "function") renderHud();
    saveGame();

    var leftoverMs = -entry.msRemaining;
    if (leftoverMs > 0 && queue.length) {
      this.tickWorkshop(workshopId, leftoverMs / 1000);
    }
  },

  /* Rattrapage hors ligne d'UN atelier : consomme le temps écoulé en cascade sur les
     entrées en file (celles déjà présentes + celles ajoutées par le chaînage auto en
     cours de cascade, v3.98.13 — le chaînage hors ligne est cohérent avec le rattrapage
     déjà en place pour le craft normal, décision validée avec Seb). Même logique de
     complétion que tickWorkshop (outputs crédités, hook Planches, log), sans
     renderPanel/renderHud à chaque étape (pas encore de premier rendu à ce stade du
     boot) — un seul saveGame() à la fin, déclenché par l'appelant
     (ProductionManager.catchUpOffline()). */
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

      this._tryAutoEnqueue(workshopId);
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
