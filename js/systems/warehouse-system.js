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
     du catalogue. */
  addResource: function (key, amount, silent) {
    this.ensure();
    amount = Math.floor(Number(amount || 0));
    if (amount <= 0) return 0;
    if (typeof WAREHOUSE_RESOURCES === "undefined" || !WAREHOUSE_RESOURCES[key]) return 0;

    game.resources[key] = Number(game.resources[key] || 0) + amount;

    if (!silent) {
      var def = WAREHOUSE_RESOURCES[key];
      addLog(def.name + " +" + formatNumber(amount) + " (Entrepôt)", "event");
    }

    return amount;
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
  }
};

window.WarehouseManager = WarehouseManager;
