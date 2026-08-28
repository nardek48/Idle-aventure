"use strict";
/* systems/farm-plots-system.js — v3.96.0 : FarmPlotsSystem, refonte complète en parcelles
   INDÉPENDANTES (chacune son niveau, son stock, sa capacité, son tick propre — plus de
   bonus % global appliqué à un taux/stock unique de bâtiment). Persistance dans
   game.production.farm.plots (tableau de 9 objets), toujours dans le même emplacement déjà
   sérialisé par save-system.js — aucune modification de save-system.js nécessaire.
   ProductionManager continue d'exposer getStock("farm")/getCapacity("farm")/
   getRatePerMin("farm")/harvest("farm") pour tout code externe (ex. WorkshopUnlockManager),
   mais délègue en interne à FarmPlotsSystem pour id === "farm" (voir production-system.js).
   v3.96.0 casse la compatibilité de sauvegarde de l'ancien système à choix de palier
   (pendingUpgradeChoice/choicesConsumed/improvements[]) — décision validée avec Seb : toute
   ancienne progression Champs est réinitialisée (parcelle 0 rouverte niveau 1, le reste
   reverrouillé), pas de migration de bonus. Détail : COMMENTAIRES_ORIGINAUX.md */

var FarmPlotsSystem = {
  /* Structure d'une parcelle : { state: "locked"|"open", level, fertile, irrigated,
     stock, lastTick }. state/level/fertile/irrigated pilotent taux et capacité (voir
     getPlotRatePerMin/getPlotCapacity) ; stock/lastTick sont propres à CETTE parcelle,
     jamais partagés avec les autres. */
  ensurePlots: function () {
    if (!game.production || typeof game.production !== "object") game.production = {};
    if (!game.production.farm || typeof game.production.farm !== "object") {
      game.production.farm = {};
    }
    var farm = game.production.farm;

    var needsReset = !Array.isArray(farm.plots)
      || farm.plots.length !== FARM_PLOTS_CONFIG.totalPlots
      || typeof farm.plots[0].level !== "number"; // v3.96.0 : détecte l'ancien format (pas de level -> reset)

    if (needsReset) {
      farm.plots = [];
      for (var i = 0; i < FARM_PLOTS_CONFIG.totalPlots; i++) {
        farm.plots.push({
          state: i === 0 ? "open" : "locked", // v3.96.0 : seule la parcelle 0 démarre ouverte (gratuite)
          level: 1,
          fertile: false,
          irrigated: false,
          stock: 0,
          lastTick: Date.now()
        });
      }
    }

    // v3.96.0 : nettoie tout champ résiduel de l'ancien système (pendingUpgradeChoice,
    // choicesConsumed) — plus jamais lus, mais on évite de les laisser traîner en save.
    if (typeof farm.pendingUpgradeChoice !== "undefined") delete farm.pendingUpgradeChoice;
    if (typeof farm.choicesConsumed !== "undefined") delete farm.choicesConsumed;
  },

  getPlots: function () {
    this.ensurePlots();
    return game.production.farm.plots;
  },

  getProfile: function (plotIndex) {
    var profileKey = FARM_PLOTS_CONFIG.profilePattern[plotIndex] || "equilibree";
    return FARM_PLOTS_CONFIG.profiles[profileKey];
  },

  getPlotRatePerMin: function (plotIndex, plot) {
    var profile = this.getProfile(plotIndex);
    var rate = profile.baseRatePerMin * Math.pow(profile.rateGrowthPerLevel, plot.level - 1);
    var bonus = 1;
    if (plot.fertile) bonus += FARM_PLOTS_CONFIG.bonusPerImprovement.fertile;
    if (plot.irrigated) bonus += FARM_PLOTS_CONFIG.bonusPerImprovement.irrigated;
    return rate * bonus;
  },

  getPlotCapacity: function (plotIndex, plot) {
    var profile = this.getProfile(plotIndex);
    return Math.floor(profile.baseCapacity * Math.pow(profile.capacityGrowthPerLevel, plot.level - 1));
  },

  isPlotMaxLevel: function (plot) {
    return plot.level >= FARM_PLOTS_CONFIG.plotMaxLevel;
  },

  /* Totaux agrégés, utilisés par ProductionManager pour exposer getStock("farm")/
     getCapacity("farm")/getRatePerMin("farm") à tout code externe (ex. la carte du haut,
     WorkshopUnlockManager). Ne compte que les parcelles ouvertes. */
  getTotalStock: function () {
    var total = 0;
    this.getPlots().forEach(function (p) { if (p.state === "open") total += p.stock; });
    return total;
  },

  getTotalCapacity: function () {
    var self = this;
    var total = 0;
    this.getPlots().forEach(function (p, i) { if (p.state === "open") total += self.getPlotCapacity(i, p); });
    return total;
  },

  getTotalRatePerMin: function () {
    var self = this;
    var total = 0;
    this.getPlots().forEach(function (p, i) { if (p.state === "open") total += self.getPlotRatePerMin(i, p); });
    return total;
  },

  getOpenPlotsCount: function () {
    return this.getPlots().filter(function (p) { return p.state === "open"; }).length;
  },

  /* Tick de production : chaque parcelle ouverte avance indépendamment vers SA propre
     capacité, à SON propre taux — une parcelle pleine ne bloque jamais les autres.
     Appelée depuis ProductionManager.tick() pour id === "farm" (voir production-system.js). */
  tick: function (dt) {
    var self = this;
    dt = Math.max(0, Number(dt || 0));
    if (dt <= 0) return;

    this.getPlots().forEach(function (plot, index) {
      if (plot.state !== "open") return;
      var capacity = self.getPlotCapacity(index, plot);
      if (plot.stock >= capacity) {
        plot.lastTick = Date.now();
        return;
      }
      var ratePerSec = self.getPlotRatePerMin(index, plot) / 60;
      plot.stock = Math.min(capacity, plot.stock + ratePerSec * dt);
      plot.lastTick = Date.now();
    });
  },

  /* Rattrapage hors-ligne, même principe que tick() mais basé sur lastTick individuel de
     chaque parcelle. Une seule passe : calcule l'écoulé AVANT d'écraser lastTick, donc pas
     besoin d'une seconde boucle. Appelée depuis ProductionManager.catchUpOffline() pour
     id === "farm". */
  catchUpOffline: function () {
    var self = this;
    var now = Date.now();

    this.getPlots().forEach(function (plot, index) {
      if (plot.state !== "open") return;
      var elapsedMs = now - Number(plot.lastTick || now);
      if (elapsedMs > 1000) {
        var capacity = self.getPlotCapacity(index, plot);
        if (plot.stock < capacity) {
          var ratePerSec = self.getPlotRatePerMin(index, plot) / 60;
          plot.stock = Math.min(capacity, plot.stock + ratePerSec * (elapsedMs / 1000));
        }
      }
      plot.lastTick = now;
    });
  },

  /* Récolte GLOBALE : additionne le stock de toutes les parcelles ouvertes, crédite
     l'Entrepôt en une fois, vide chaque parcelle à 0. Appelée depuis
     ProductionManager.harvest("farm"). */
  harvestAll: function () {
    var total = 0;
    this.getPlots().forEach(function (plot) {
      if (plot.state !== "open") return;
      total += Math.floor(plot.stock);
      plot.stock -= Math.floor(plot.stock);
    });
    return total;
  },

  /* Débloque la parcelle d'index `plotIndex` (locked -> open), en payant son coût
     (gratuit pour l'index 0, jamais appelable ici car déjà open dès ensurePlots()). */
  unlockPlot: function (plotIndex) {
    var plots = this.getPlots();
    var plot = plots[plotIndex];
    if (!plot || plot.state !== "locked") return { ok: false, reason: "Parcelle invalide" };

    var cost = getFarmPlotUnlockCost(plotIndex);
    if (!cost) return { ok: false, reason: "Parcelle invalide" };

    var canAfford = Object.keys(cost).every(function (key) {
      return WarehouseManager.getAmount(key) >= cost[key];
    });
    if (!canAfford) return { ok: false, reason: "Ressources insuffisantes" };

    Object.keys(cost).forEach(function (key) { WarehouseManager.removeResource(key, cost[key]); });
    plot.state = "open";
    plot.lastTick = Date.now();

    addLog("🌾 Champs : nouvelle parcelle défrichée (" + (plotIndex + 1) + ")", "event");
    if (typeof renderPanel === "function") renderPanel();
    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null };
  },

  /* Améliore la parcelle d'index `plotIndex` d'un niveau (level -> level+1). */
  upgradePlot: function (plotIndex) {
    var plots = this.getPlots();
    var plot = plots[plotIndex];
    if (!plot || plot.state !== "open") return { ok: false, reason: "Parcelle invalide" };
    if (this.isPlotMaxLevel(plot)) return { ok: false, reason: "Niveau maximum" };

    var cost = getFarmPlotUpgradeCost(plot.level);
    var canAfford = Object.keys(cost).every(function (key) {
      return WarehouseManager.getAmount(key) >= cost[key];
    });
    if (!canAfford) return { ok: false, reason: "Ressources insuffisantes" };

    Object.keys(cost).forEach(function (key) { WarehouseManager.removeResource(key, cost[key]); });
    plot.level += 1;

    addLog("🌾 Parcelle " + (plotIndex + 1) + " améliorée (niv. " + plot.level + ")", "event");
    if (typeof renderPanel === "function") renderPanel();
    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null };
  },

  /* Active l'amélioration fertile/irriguée sur la parcelle d'index `plotIndex` (payante,
     cumulable avec l'autre amélioration, non réversible — cohérent avec l'ancien système). */
  toggleImprovement: function (plotIndex, kind) {
    if (kind !== "fertile" && kind !== "irrigated") return { ok: false, reason: "Amélioration invalide" };
    var plots = this.getPlots();
    var plot = plots[plotIndex];
    if (!plot || plot.state !== "open") return { ok: false, reason: "Parcelle invalide" };
    if (plot[kind]) return { ok: false, reason: "Déjà appliquée" };

    var def = FARM_PLOTS_CONFIG.improvementCost[kind];
    var cost = def.cost;
    var canAfford = Object.keys(cost).every(function (key) {
      return WarehouseManager.getAmount(key) >= cost[key];
    });
    if (!canAfford) return { ok: false, reason: "Ressources insuffisantes" };

    Object.keys(cost).forEach(function (key) { WarehouseManager.removeResource(key, cost[key]); });
    plot[kind] = true;

    var label = kind === "fertile" ? "Terre fertile" : "Sillon irrigué";
    addLog("🌾 Parcelle " + (plotIndex + 1) + " : " + label, "event");
    if (typeof renderPanel === "function") renderPanel();
    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null };
  }
};

window.FarmPlotsSystem = FarmPlotsSystem;
