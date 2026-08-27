"use strict";
/* systems/farm-plots-system.js — FarmPlotsSystem, logique des parcelles des Champs. Persistance
   directement dans game.production.farm.plots (objet libre déjà sérialisé par save-system.js,
   aucune modification de save-system.js nécessaire). Détail : COMMENTAIRES_ORIGINAUX.md */

var FarmPlotsSystem = {
  ensurePlots: function () {
    if (!window.ProductionManager || typeof ProductionManager.ensure !== "function") return;
    ProductionManager.ensure();
    if (!game.production || !game.production.farm) return;

    var farm = game.production.farm;
    if (!Array.isArray(farm.plots) || farm.plots.length !== FARM_PLOTS_CONFIG.totalPlots) {
      farm.plots = [];
      for (var i = 0; i < FARM_PLOTS_CONFIG.totalPlots; i++) {
        farm.plots.push({
          state: i < FARM_PLOTS_CONFIG.startingOpenPlots ? "open" : "locked",
          improvements: []
        });
      }
    }
    if (typeof farm.pendingUpgradeChoice !== "boolean") farm.pendingUpgradeChoice = false;
  },

  getPlots: function () {
    this.ensurePlots();
    return (game.production && game.production.farm && game.production.farm.plots) || [];
  },

  hasPendingChoice: function () {
    this.ensurePlots();
    return !!(game.production && game.production.farm && game.production.farm.pendingUpgradeChoice);
  },

  /* Appelée par ProductionManager.buy("farm") à chaque niveau atteint — indépendant du
     coût d'amélioration lui-même. */
  markChoicePending: function () {
    this.ensurePlots();
    if (!game.production || !game.production.farm) return;
    // Un choix n'est proposé que s'il reste au moins une action possible (voir
    // getAvailableChoices) — sinon le palier est silencieusement ignoré plutôt que de
    // bloquer le joueur avec un popup vide.
    if (this.getAvailableChoices().length > 0) {
      game.production.farm.pendingUpgradeChoice = true;
    }
  },

  /* Actions ("open"/"fertile"/"irrigated") encore possibles compte tenu de l'état actuel
     de la grille — utilisé pour filtrer les boutons du popup de choix. */
  getAvailableChoices: function () {
    var plots = this.getPlots();
    var available = [];

    var hasLocked = plots.some(function (p) { return p.state === "locked"; });
    if (hasLocked) available.push("open");

    var hasOpenWithoutFertile = plots.some(function (p) { return p.state === "open" && p.improvements.indexOf("fertile") === -1; });
    if (hasOpenWithoutFertile) available.push("fertile");

    var hasOpenWithoutIrrigated = plots.some(function (p) { return p.state === "open" && p.improvements.indexOf("irrigated") === -1; });
    if (hasOpenWithoutIrrigated) available.push("irrigated");

    return available;
  },

  /* Index des parcelles éligibles pour une action donnée — utilisé pour la sélection
     directe sur la grille (le joueur tape la case voulue parmi celles surlignées). */
  getEligiblePlotIndexes: function (action) {
    var plots = this.getPlots();
    var indexes = [];
    plots.forEach(function (p, i) {
      if (action === "open" && p.state === "locked") indexes.push(i);
      else if (action === "fertile" && p.state === "open" && p.improvements.indexOf("fertile") === -1) indexes.push(i);
      else if (action === "irrigated" && p.state === "open" && p.improvements.indexOf("irrigated") === -1) indexes.push(i);
    });
    return indexes;
  },

  /* Applique l'action choisie à la parcelle indiquée. Idempotent par construction : une
     action déjà appliquée à une parcelle n'est plus dans getEligiblePlotIndexes(), donc
     ne peut plus être re-sélectionnée par l'UI normale. Retourne { ok, reason }. */
  applyChoice: function (action, plotIndex) {
    this.ensurePlots();
    if (!this.hasPendingChoice()) return { ok: false, reason: "Aucun choix disponible" };

    var choiceDef = FARM_UPGRADE_CHOICES[action];
    if (!choiceDef) return { ok: false, reason: "Choix invalide" };

    var eligible = this.getEligiblePlotIndexes(action);
    if (eligible.indexOf(plotIndex) === -1) return { ok: false, reason: "Parcelle invalide pour ce choix" };

    var plots = this.getPlots();
    var plot = plots[plotIndex];

    if (action === "open") {
      plot.state = "open";
    } else {
      plot.improvements.push(action);
    }

    game.production.farm.pendingUpgradeChoice = false;

    addLog("🌾 Champs : " + choiceDef.label + " (parcelle " + (plotIndex + 1) + ")", "event");
    if (typeof renderPanel === "function") renderPanel();
    if (typeof saveGame === "function") saveGame();

    return { ok: true, reason: null };
  },

  /* Bonus cumulé de toutes les parcelles, en fraction (0.18 = +18%) — lu par
     ProductionManager.getRatePerMin("farm"). */
  getBonusPct: function () {
    var plots = this.getPlots();
    var total = 0;
    plots.forEach(function (p) {
      p.improvements.forEach(function (imp) {
        total += FARM_PLOTS_CONFIG.bonusPerImprovement[imp] || 0;
      });
    });
    return total;
  },

  getOpenPlotsCount: function () {
    return this.getPlots().filter(function (p) { return p.state === "open"; }).length;
  }
};

window.FarmPlotsSystem = FarmPlotsSystem;
