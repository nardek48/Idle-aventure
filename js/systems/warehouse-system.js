"use strict";
/* systems/warehouse-system.js — Entrepôt : SEUL point d'écriture sur game.resources (addResource/removeResource/sellResource).
   v3.98.0 : le craft n'est plus géré ici — remplacé par des ateliers locaux par bâtiment
   (voir WorkshopsSystem, systems/workshops-system.js). game.craftQueue reste initialisé
   ci-dessous en tableau vide pour rester compatible avec save-system.js (fichier protégé,
   non modifié, qui lit/écrit encore ce champ) — plus jamais rempli ni lu par le jeu.
   Détail : COMMENTAIRES_ORIGINAUX.md */

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

  /* v3.98.0 : le craft générique de l'Entrepôt (RECIPES/game.craftQueue/enqueueCraft/
     tickCraftQueue/canCraft/cancelCraft) est retiré — remplacé par des ateliers locaux à
     chaque bâtiment de Production, chacun sa propre file (voir WorkshopsSystem,
     systems/workshops-system.js). Seul refundAndClearCraftQueue() est conservé ci-dessous
     comme point d'entrée générique : save-system.js:hardResetState() (fichier protégé)
     l'appelle par son nom sans connaître son implémentation interne — délègue maintenant
     au remboursement de TOUTES les files d'ateliers plutôt qu'à l'ancienne file unique.
     game-loop.js (protégé) vérifie typeof WarehouseManager.tickCraftQueue === "function"
     avant d'appeler — cette méthode n'existant plus, l'appel est simplement sauté, sans
     erreur (le tick des ateliers passe désormais par ProductionManager.tick(), lui-même
     déjà appelé par game-loop.js). */
  refundAndClearCraftQueue: function () {
    if (window.WorkshopsSystem && typeof WorkshopsSystem.refundAndClearAll === "function") {
      WorkshopsSystem.refundAndClearAll();
    }
  }
};

window.WarehouseManager = WarehouseManager;
