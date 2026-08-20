"use strict";
/* ============================================================
Aethervale — systems/warehouse-system.js
v3.31 : extraction du mécanisme d'ajout à l'Entrepôt (jusqu'ici un
`game.resources[key] += n` écrit en dur dans hunt-quest-system.js,
seul appelant existant) en une fonction centrale UNIQUE — demande
explicite : l'Entrepôt doit rester la source de vérité des ressources
disponibles pour les dépenses, tout ajout doit passer par ici.
HuntQuestManager ET ProductionManager (voir systems/production-system.js)
appellent tous les deux WarehouseManager.addResource() — plus aucun
accès direct à game.resources[key] ailleurs dans le code.

v3.43 : le craft n'est plus instantané — file d'attente FIFO
(game.craftQueue), voir enqueueCraft()/tickCraftQueue()/cancelCraft()
ci-dessous. Intrants déduits IMMÉDIATEMENT à la mise en file (pas au
démarrage réel), outputs crédités seulement à la fin du décompte
(recipe.craftTimeMs × quantité). Activation du champ `station`
(recipe.station, voir data/recipes.js) dans canCraft() — les 3
recettes existantes ont station: null, donc inaffectées.
============================================================ */

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

  /* Point d'entrée UNIQUE pour créditer l'Entrepôt. `silent` évite le
     log individuel (utile pour la récolte en masse d'un bâtiment de
     production, qui log elle-même un seul message groupé plutôt que
     N lignes). Ne fait rien pour un montant <= 0 ou une clé inconnue
     du catalogue.
     v3.35 : respecte WAREHOUSE_RESOURCES[key].cap si défini (montant
     réellement ajouté borné pour ne jamais dépasser le cap — le
     surplus est simplement perdu, pas de file d'attente). Absent/
     undefined = illimité, comme avant pour les ressources brutes.
     Renvoie le montant RÉELLEMENT ajouté (peut être < amount demandé
     si le cap a tronqué). */
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

    // v3.39 : hook optionnel pour la chaîne de déblocage de l'Atelier
    // (voir systems/workshop-unlock-system.js) — DÉCOUPLÉ du flag
    // `silent` ci-dessus (qui ne contrôle que le LOG de cette
    // fonction) : ProductionManager.harvest() appelle addResource()
    // en silent=true (un seul log groupé côté production-system.js),
    // mais la progression de la chaîne doit quand même être notifiée.
    // v3.44 : "pierre" ajouté — bug corrigé (oubli v3.39, seul "bois"
    // avait ce hook). L'étape 3 ("Récolter 15 Pierre") ne se validait
    // donc jamais en temps réel à la récolte, seulement quand
    // checkCurrentStep() était redéclenché ailleurs par hasard (ex.
    // ConstructionManager.buy(), voir systems/construction-system.js)
    // — d'où le symptôme remonté par Seb : la quête ne se validait
    // qu'après avoir déjà construit un niveau de l'Atelier. Filtré sur
    // "bois"/"pierre" (les 2 seules ressources brutes suivies par la
    // chaîne, étapes 1 et 3) ; ignoré silencieusement si le manager
    // n'est pas chargé.
    if ((key === "bois" || key === "pierre") && window.WorkshopUnlockManager && typeof WorkshopUnlockManager.checkCurrentStep === "function") {
      WorkshopUnlockManager.checkCurrentStep();
    }

    return applied;
  },

  /* v3.37 : chemin de SORTIE symétrique à addResource(), mais SANS
     conversion en or (contrairement à sellResource() ci-dessous) —
     utilisé par tout système qui doit consommer un coût en ressource
     d'Entrepôt sans rien recevoir en retour (ex. ConstructionManager,
     voir systems/construction-system.js). Ne mute rien et renvoie
     false si le stock est insuffisant (jamais de solde négatif). */
  removeResource: function (key, amount) {
    this.ensure();
    amount = Math.floor(Number(amount || 0));
    if (amount <= 0) return true; // rien à retirer : succès trivial
    if (typeof WAREHOUSE_RESOURCES === "undefined" || !WAREHOUSE_RESOURCES[key]) return false;

    var current = Number(game.resources[key] || 0);
    if (current < amount) return false;

    game.resources[key] = current - amount;
    return true;
  },

  /* v3.37 : point d'extension unique pour un bonus multiplicatif sur
     TOUTES les ventes de l'Entrepôt — lu par sellResource() ci-dessous.
     Ce fichier ne connaît PAS ConstructionManager directement (évite
     une dépendance data/systems inversée) : hook global optionnel,
     même principe que les `window.QuestManager &&` déjà utilisés plus
     bas. Renvoie 1 (neutre) si aucun système n'a encore été chargé ou
     n'a pas encore été investi — comportement IDENTIQUE à avant
     l'ajout de cette fonction. */
  getSellPriceMultiplier: function () {
    if (window.ConstructionManager && typeof ConstructionManager.getSellBonus === "function") {
      return ConstructionManager.getSellBonus();
    }
    return 1;
  },

  /* v3.32 : vend `amount` unités de `key` contre de l'or (voir
     WAREHOUSE_RESOURCES[key].sellPrice) — chemin de SORTIE symétrique
     à addResource() ci-dessus, seul endroit qui doit retirer du stock
     de l'Entrepôt pour une vente. Quantité toujours bornée au stock
     réellement disponible (jamais de vente à découvert). Renvoie le
     montant d'or réellement gagné (0 si rien n'a pu être vendu). */
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
    // v3.37 : bonus de vente de l'Atelier de Construction (voir
    // getSellPriceMultiplier() ci-dessus) — 1 (neutre) tant qu'aucun
    // niveau n'est investi, comportement inchangé sinon.
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

  /* v3.35 : artisanat tier 1 (voir data/recipes.js) — canCraft() ne
     mute rien, juste une vérification pure du stock disponible pour
     `times` crafts. `times` toujours implicitement borné à >= 1 par
     l'appelant (le stepper de ui/warehouse-view.js ne descend jamais
     sous 1).
     v3.43 : ajoute la vérification de `recipe.station` — si défini
     (ex. "workshop"), le craft n'est autorisé que si ce bâtiment de
     Construction est au moins niveau 1. Les 3 recettes existantes ont
     station: null, donc totalement inaffectées (déjà true avant même
     ce check) — voir data/recipes.js. */
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

  /* v3.43 : remplace l'ancien craft() instantané par une FILE
     D'ATTENTE (game.craftQueue, tableau FIFO). Les intrants sont
     déduits IMMÉDIATEMENT ici (pas au démarrage réel de la commande)
     pour empêcher de commander plus que ce qu'on possède — les
     outputs, eux, ne sont crédités qu'à la fin du décompte
     (tickCraftQueue ci-dessous). Renvoie false sans rien muter si le
     stock/station est insuffisant (canCraft revérifié en interne). */
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

  /* v3.43 : fait avancer UNIQUEMENT la commande en tête de file
     (game.craftQueue[0]) — une seule commande "en cours" à la fois,
     les suivantes attendent leur tour (FIFO), même principe que
     ProductionManager.tick()/CombatEngine pour le throttle de rendu
     (voir isWarehouseScreenVisible(), ui/warehouse-view.js). Aucun
     rattrapage hors-ligne : appelée uniquement depuis
     main/game-loop.js tant que l'app reste ouverte. */
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

      // v3.38 : hook chaîne de déblocage de l'Atelier — inchangé,
      // seule la position dans le flux a changé (à la fin réelle du
      // craft, plus au moment de la commande).
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

    // Enchaîne immédiatement sur la commande suivante avec le reliquat
    // de dt (évite de perdre jusqu'à une frame entière à chaque
    // transition entre deux commandes de la file).
    var leftoverMs = -entry.msRemaining;
    if (leftoverMs > 0 && game.craftQueue.length) {
      this.tickCraftQueue(leftoverMs / 1000);
    }
  },

  /* v3.43 : rendu throttlé (~1×/seconde) de l'écran Entrepôt pendant
     qu'une commande est en cours — même principe EXACT que
     ProductionManager.tick() (v3.31.1), pour ne pas détruire/recréer
     le panel à chaque frame pendant que le joueur regarde la barre de
     progression. */
  _maybeRenderWarehouse: function (dt) {
    if (typeof isWarehouseScreenVisible !== "function" || !isWarehouseScreenVisible()) return;
    this._renderAccum = Number(this._renderAccum || 0) + dt;
    if (this._renderAccum < 1) return;
    this._renderAccum = 0;
    if (typeof renderPanel === "function") renderPanel();
  },

  /* v3.43 : annule une commande ENCORE EN ATTENTE (jamais celle en
     tête de file, déjà en cours) — remboursement intégral des
     intrants déduits à la mise en file. Renvoie false si l'id est
     introuvable ou correspond à la commande en cours (index 0). */
  cancelCraft: function (queueId) {
    this.ensure();
    var index = game.craftQueue.findIndex(function (e) { return e.id === queueId; });
    if (index <= 0) return false; // introuvable OU commande en cours (index 0) : pas annulable

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

  /* v3.43 : rembourse INTÉGRALEMENT toute la file (y compris la
     commande en cours) puis la vide — utilisé uniquement à
     l'ascension (voir hardResetState(), systems/save-system.js),
     décision explicite de Seb : contrairement à huntRun/dungeonRun
     (progression en cours perdue sans remboursement), une commande de
     craft interrompue par une ascension rend ses intrants. */
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
