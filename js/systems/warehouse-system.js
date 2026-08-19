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
============================================================ */

var WarehouseManager = {
  ensure: function () {
    if (!game.resources || typeof game.resources !== "object") game.resources = {};
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

    return applied;
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
    var goldGain = qty * price;

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
     sous 1). */
  canCraft: function (recipe, times) {
    this.ensure();
    times = Math.floor(Number(times || 1));
    if (times <= 0 || !recipe || !recipe.inputs) return false;
    return recipe.inputs.every(function (input) {
      return WarehouseManager.getAmount(input.resourceId) >= input.quantity * times;
    });
  },

  /* Consomme les inputs puis crédite les outputs via addResource()
     (donc le cap éventuel des outputs, ex. planche/lingot, est
     automatiquement respecté). Instantané — pas de craftTimeMs
     appliqué en V1 (voir data/recipes.js). `station` non vérifié non
     plus (toujours null pour l'instant). Renvoie false sans rien
     muter si le stock est insuffisant (canCraft revérifié en interne
     pour éviter tout état incohérent en cas d'appel direct). */
  craft: function (recipe, times) {
    this.ensure();
    times = Math.floor(Number(times || 1));
    if (!this.canCraft(recipe, times)) return false;

    recipe.inputs.forEach(function (input) {
      game.resources[input.resourceId] = Number(game.resources[input.resourceId] || 0) - input.quantity * times;
    });

    recipe.outputs.forEach(function (output) {
      WarehouseManager.addResource(output.resourceId, output.quantity * times, true);
    });

    var outDef = WAREHOUSE_RESOURCES[recipe.outputs[0].resourceId];
    addLog((outDef ? outDef.name : recipe.label) + " fabriquée ×" + formatNumber(times) + " (Entrepôt)", "event");

    if (typeof renderPanel === "function") renderPanel();
    if (typeof renderHud === "function") renderHud();
    saveGame();

    return true;
  }
};

window.WarehouseManager = WarehouseManager;
