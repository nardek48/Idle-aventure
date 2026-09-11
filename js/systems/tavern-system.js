"use strict";
/* systems/tavern-system.js — v3.217.0 (lot V-6) : TavernManager.

   ÉTAT EN SAUVEGARDE :
     game.tavern = { contracts: [ { id, resourceId, quantity, reward, done } ], resetTime }

   Le tableau se renouvelle toutes les 6 h, comme l'échoppe. Un contrat livré
   reste affiché barré jusqu'au renouvellement : le joueur voit ce qu'il a déjà
   fait, plutôt qu'une ligne qui s'évapore.

   Nombre de contrats simultanés = 1 + niveau/2, soit 1 à 5. C'est le seul effet
   du bâtiment : la Taverne ne change pas la valeur des contrats, elle en donne
   davantage à la fois.

   Toute écriture de ressource passe par WarehouseManager. */

var TavernManager = {

  getLevel: function () {
    return (window.VillageBuildingManager && typeof VillageBuildingManager.getLevel === "function")
      ? VillageBuildingManager.getLevel("tavern")
      : 0;
  },

  /* Un contrat par niveau. Une grille « un sur deux » a été essayée puis
     abandonnée : la moitié des niveaux n'apportaient rien de visible, et payer
     un chantier pour ne rien voir changer est exactement ce qu'on évite
     partout ailleurs dans le village. */
  getSlotCount: function (level) {
    var lvl = (typeof level === "number") ? level : this.getLevel();
    return Math.max(0, Math.min(VILLAGE_BUILDINGS.tavern.maxLevel, lvl));
  },

  /* Rang de modèles accessible : les contrats de ressources fabriquées, plus
     rentables mais qui supposent des ateliers, arrivent avec les niveaux. */
  getTemplateTier: function (level) {
    var lvl = (typeof level === "number") ? level : this.getLevel();
    return Math.max(1, Math.min(4, lvl));
  },

  ensure: function () {
    if (!game.tavern || typeof game.tavern !== "object") game.tavern = {};
    if (!Array.isArray(game.tavern.contracts)) game.tavern.contracts = [];
    if (typeof game.tavern.resetTime !== "number") game.tavern.resetTime = 0;

    /* Un contrat portant sur une ressource disparue (sauvegarde ancienne,
       table modifiée) est retiré plutôt que d'afficher une ligne morte. */
    game.tavern.contracts = game.tavern.contracts.filter(function (c) {
      return c && WAREHOUSE_RESOURCES[c.resourceId];
    });
  },

  getRewardFor: function (resourceId, quantity) {
    var def = WAREHOUSE_RESOURCES[resourceId];
    var unit = def ? Number(def.sellPrice || 0) : 0;
    /* Une ressource invendable (matériau de monde, intrant) n'a pas de valeur
       de référence : elle ne sort jamais en contrat, mais la garde évite un
       contrat à 0 or si un modèle est ajouté par erreur. */
    if (unit <= 0) return 0;
    return Math.max(1, Math.floor(unit * quantity * TAVERN_REWARD_MULT));
  },

  generateContracts: function () {
    var level = this.getLevel();
    var slots = this.getSlotCount(level);
    if (slots <= 0) return [];

    var maxTier = this.getTemplateTier(level);
    var pool = (TAVERN_CONTRACT_TEMPLATES || []).filter(function (t) {
      return t.tier <= maxTier && WAREHOUSE_RESOURCES[t.resourceId]
        && Number(WAREHOUSE_RESOURCES[t.resourceId].sellPrice || 0) > 0;
    });
    if (!pool.length) return [];

    var out = [];
    var used = {};
    for (var i = 0; i < slots && pool.length; i++) {
      /* Pas deux fois la même ressource sur un même tableau : sinon un joueur
         peut tomber sur trois contrats de bois et n'avoir aucun choix. */
      var candidates = pool.filter(function (t) { return !used[t.resourceId]; });
      if (!candidates.length) break;

      var tpl = candidates[Math.floor(Math.random() * candidates.length)];
      used[tpl.resourceId] = true;

      var span = Math.max(0, tpl.max - tpl.min);
      var quantity = tpl.min + Math.floor(Math.random() * (span + 1));

      out.push({
        id: tpl.id + "_" + Date.now() + "_" + i,
        templateId: tpl.id,
        title: tpl.title,
        resourceId: tpl.resourceId,
        quantity: quantity,
        reward: this.getRewardFor(tpl.resourceId, quantity),
        done: false
      });
    }
    return out;
  },

  checkRefresh: function () {
    this.ensure();
    if (this.getLevel() <= 0) {
      game.tavern.contracts = [];
      return;
    }

    var now = Date.now();
    if (!game.tavern.contracts.length || now >= game.tavern.resetTime) {
      game.tavern.contracts = this.generateContracts();
      game.tavern.resetTime = now + TAVERN_REFRESH_MS;
      return;
    }

    /* La Taverne vient de monter d'un niveau : on COMPLÈTE le tableau au lieu
       de le régénérer, même raison qu'à la Halle — améliorer ne doit jamais
       effacer un contrat que le joueur était en train de préparer. */
    var slots = this.getSlotCount();
    if (game.tavern.contracts.length < slots) {
      var manquants = this.generateContracts().filter(function (c) {
        return !game.tavern.contracts.some(function (ex) { return ex.resourceId === c.resourceId; });
      });
      while (game.tavern.contracts.length < slots && manquants.length) {
        game.tavern.contracts.push(manquants.shift());
      }
    }
  },

  getContracts: function () {
    this.checkRefresh();
    return game.tavern.contracts || [];
  },

  getContract: function (id) {
    this.ensure();
    return (game.tavern.contracts || []).find(function (c) { return c.id === id; }) || null;
  },

  canDeliver: function (id) {
    var c = this.getContract(id);
    if (!c || c.done) return false;
    return WarehouseManager.getAmount(c.resourceId) >= c.quantity;
  },

  timeUntilRefresh: function () {
    this.ensure();
    return Math.max(0, (game.tavern.resetTime || 0) - Date.now()) / 1000;
  },

  _delivering: false,

  deliver: function (id) {
    if (this._delivering) return false;

    var c = this.getContract(id);
    if (!c) return false;
    if (c.done) {
      showToast("Contrat déjà honoré", 1200);
      return false;
    }

    var def = WAREHOUSE_RESOURCES[c.resourceId];
    if (WarehouseManager.getAmount(c.resourceId) < c.quantity) {
      showToast("Pas assez de " + (def ? def.name : c.resourceId), 1400);
      return false;
    }

    this._delivering = true;

    WarehouseManager.removeResource(c.resourceId, c.quantity);
    game.gold = Number(game.gold || 0) + c.reward;
    c.done = true;

    if (window.QuestManager && typeof QuestManager.track === "function") {
      QuestManager.track("goldEarned", c.reward);
    }

    addLog("🍺 Contrat honoré : " + c.title + " (+" + formatNumber(c.reward) + " or)", "event");
    showToast("+" + formatNumber(c.reward) + " or", 1400);

    if (typeof renderAll === "function") renderAll();
    saveGame();

    this._delivering = false;
    return true;
  }
};

window.TavernManager = TavernManager;
