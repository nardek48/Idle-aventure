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
    // v3.95.2 : compteur de choix déjà consommés — permet de rattraper les paliers
    // franchis avant l'introduction de ce système (héros déjà haut niveau, ou plusieurs
    // niveaux achetés d'affilée sans jamais rouvrir le panneau). Une ancienne sauvegarde
    // sans ce champ est traitée comme "aucun choix consommé", donc rattrapée au complet
    // à la prochaine vérification (voir syncPendingChoices ci-dessous).
    if (typeof farm.choicesConsumed !== "number" || farm.choicesConsumed < 0) {
      farm.choicesConsumed = 0;
    }
    this.syncPendingChoices();
  },

  /* v3.95.2 : recalcule si un choix devrait être en attente, en comparant le nombre de
     paliers franchis (niveau - 1) au nombre de choix déjà consommés — rattrape
     automatiquement tout retard (progression antérieure à ce système, ou plusieurs
     niveaux achetés sans jamais avoir ouvert le panneau). N'affiche jamais plus d'un
     choix à la fois dans l'UI (un seul à consommer, puis le suivant apparaît une fois
     celui-ci résolu) — mais ne perd aucun palier dû. Utilise _getAvailableChoicesRaw()
     (jamais getAvailableChoices()) pour éviter tout appel circulaire vers ensurePlots(). */
  syncPendingChoices: function () {
    if (!game.production || !game.production.farm) return;
    var farm = game.production.farm;
    if (farm.pendingUpgradeChoice) return; // déjà un choix affiché, rien à faire

    var level = Number((window.ProductionManager && ProductionManager.getLevel("farm")) || 1);
    var earnedChoices = Math.max(0, level - 1);
    if (farm.choicesConsumed < earnedChoices && this._getAvailableChoicesRaw(farm.plots).length > 0) {
      farm.pendingUpgradeChoice = true;
    }
  },

  /* Version interne sans garde ensurePlots() — réservée aux appels depuis
     syncPendingChoices()/ensurePlots() elles-mêmes, sur un tableau plots déjà garanti
     exister. getAvailableChoices() (publique) reste la version sûre pour l'UI. */
  _getAvailableChoicesRaw: function (plots) {
    plots = plots || [];
    var available = [];

    var hasLocked = plots.some(function (p) { return p.state === "locked"; });
    if (hasLocked) available.push("open");

    var hasOpenWithoutFertile = plots.some(function (p) { return p.state === "open" && p.improvements.indexOf("fertile") === -1; });
    if (hasOpenWithoutFertile) available.push("fertile");

    var hasOpenWithoutIrrigated = plots.some(function (p) { return p.state === "open" && p.improvements.indexOf("irrigated") === -1; });
    if (hasOpenWithoutIrrigated) available.push("irrigated");

    return available;
  },

  getPlots: function () {
    this.ensurePlots();
    return (game.production && game.production.farm && game.production.farm.plots) || [];
  },

  hasPendingChoice: function () {
    this.ensurePlots();
    return !!(game.production && game.production.farm && game.production.farm.pendingUpgradeChoice);
  },

  /* Nombre TOTAL de choix dus (paliers franchis moins choix déjà consommés), y compris
     celui actuellement affiché dans pendingUpgradeChoice s'il y en a un — utilisé tel
     quel pour le badge "+N" du bouton (pas besoin d'additionner hasPendingChoice() en
     plus, ce serait un double comptage). */
  getOutstandingChoicesCount: function () {
    this.ensurePlots();
    if (!game.production || !game.production.farm) return 0;
    var farm = game.production.farm;
    var level = Number((window.ProductionManager && ProductionManager.getLevel("farm")) || 1);
    var earnedChoices = Math.max(0, level - 1);
    var remaining = earnedChoices - farm.choicesConsumed;
    return Math.max(0, remaining);
  },

  /* Appelée par ProductionManager.buy("farm") à chaque niveau atteint — indépendant du
     coût d'amélioration lui-même. Ne fait plus qu'appeler syncPendingChoices() (le
     comptage réel se base sur le niveau, pas sur un simple flag posé ici). */
  markChoicePending: function () {
    this.ensurePlots();
    this.syncPendingChoices();
  },

  /* Actions ("open"/"fertile"/"irrigated") encore possibles compte tenu de l'état actuel
     de la grille — utilisé pour filtrer les boutons du popup de choix. Version publique,
     sûre (passe par getPlots()/ensurePlots()) ; réutilise _getAvailableChoicesRaw(). */
  getAvailableChoices: function () {
    return this._getAvailableChoicesRaw(this.getPlots());
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
    game.production.farm.choicesConsumed += 1;
    this.syncPendingChoices(); // ré-affiche immédiatement le choix suivant s'il en reste

    addLog("🌾 Champs : " + choiceDef.label + " (parcelle " + (plotIndex + 1) + ")", "event");
    if (typeof renderPanel === "function") renderPanel();
    if (typeof saveGame === "function") saveGame();

    return { ok: true, reason: null };
  },

  /* Bonus cumulé de toutes les parcelles, en fraction (0.18 = +18%) — lu par
     ProductionManager.getRatePerMin("farm"). v3.95.3 : toute parcelle ouverte contribue
     désormais baseBonusPerOpenPlot, en plus des bonus fertile/irrigated cumulables. */
  getBonusPct: function () {
    var plots = this.getPlots();
    var total = 0;
    plots.forEach(function (p) {
      if (p.state === "open") total += FARM_PLOTS_CONFIG.baseBonusPerOpenPlot;
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
