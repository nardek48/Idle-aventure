"use strict";
/* systems/production-plots-system.js — v3.97.0 : ProductionPlotsSystem, généralise
   FarmPlotsSystem (v3.96.0-3.96.4) aux 6 bâtiments de Production. Chaque fonction prend
   désormais `buildingId` en premier paramètre plutôt que d'être câblée sur "farm" en dur.
   Persistance dans game.production[buildingId].plots (tableau de 9 objets), même structure
   que Champs. ProductionManager continue d'exposer getStock/getCapacity/getRatePerMin/
   harvest par id, et délègue à ce système pour TOUS les bâtiments listés dans
   PRODUCTION_PLOTS_BUILDINGS (voir production-system.js) — plus seulement "farm".
   v3.97.0 casse la compatibilité de sauvegarde des 5 bâtiments nouvellement concernés
   (Chasse/Scierie/Mine/Carrière/Puits n'avaient pas de structure plots avant cette
   version) — décision validée avec Seb, cohérente avec le traitement déjà appliqué à
   Champs en v3.96.0 : toute progression de niveau de bâtiment existante sur ces 5
   bâtiments est réinitialisée (zone 0 rouverte niveau 1, les 8 autres verrouillées), pas
   de conversion de bonus. Remplace systems/farm-plots-system.js (supprimé).
   Détail : COMMENTAIRES_ORIGINAUX.md */

var ProductionPlotsSystem = {
  /* Liste des bâtiments gérés par ce système — source de vérité unique, dérivée de
     PRODUCTION_PLOTS_BUILDINGS (data/production-plots.js) plutôt que redéclarée ici. */
  getManagedBuildingIds: function () {
    return Object.keys(PRODUCTION_PLOTS_BUILDINGS);
  },

  isManaged: function (buildingId) {
    return !!PRODUCTION_PLOTS_BUILDINGS[buildingId];
  },

  ensurePlots: function (buildingId) {
    if (!game.production || typeof game.production !== "object") game.production = {};
    if (!game.production[buildingId] || typeof game.production[buildingId] !== "object") {
      game.production[buildingId] = {};
    }
    var bucket = game.production[buildingId];

    var needsReset = !Array.isArray(bucket.plots)
      || bucket.plots.length !== PRODUCTION_PLOTS_SHARED.totalPlots
      || typeof bucket.plots[0].level !== "number"; // détecte un ancien format (niveau de bâtiment simple -> reset)

    if (needsReset) {
      bucket.plots = [];
      for (var i = 0; i < PRODUCTION_PLOTS_SHARED.totalPlots; i++) {
        bucket.plots.push({
          state: i === 0 ? "open" : "locked", // seule la zone 0 démarre ouverte (gratuite)
          level: 1,
          fertile: false,
          irrigated: false,
          stock: 0,
          lastTick: Date.now()
        });
      }
    }

    // nettoie tout champ résiduel de l'ancien système à niveau de bâtiment unique
    if (typeof bucket.level !== "undefined") delete bucket.level;
    if (typeof bucket.pendingUpgradeChoice !== "undefined") delete bucket.pendingUpgradeChoice;
    if (typeof bucket.choicesConsumed !== "undefined") delete bucket.choicesConsumed;
  },

  getPlots: function (buildingId) {
    this.ensurePlots(buildingId);
    return game.production[buildingId].plots;
  },

  getProfile: function (plotIndex) {
    var profileKey = PRODUCTION_PLOTS_SHARED.profilePattern[plotIndex] || "equilibree";
    return PRODUCTION_PLOTS_SHARED.profiles[profileKey];
  },

  getPlotRatePerMin: function (plotIndex, plot) {
    var profile = this.getProfile(plotIndex);
    var rate = profile.baseRatePerMin * Math.pow(profile.rateGrowthPerLevel, plot.level - 1);
    var bonus = 1;
    if (plot.fertile) bonus += PRODUCTION_PLOTS_SHARED.bonusPerImprovement.fertile;
    if (plot.irrigated) bonus += PRODUCTION_PLOTS_SHARED.bonusPerImprovement.irrigated;
    return rate * bonus;
  },

  getPlotCapacity: function (plotIndex, plot) {
    var profile = this.getProfile(plotIndex);
    return Math.floor(profile.baseCapacity * Math.pow(profile.capacityGrowthPerLevel, plot.level - 1));
  },

  isPlotMaxLevel: function (plot) {
    return plot.level >= PRODUCTION_PLOTS_SHARED.plotMaxLevel;
  },

  /* Totaux agrégés, utilisés par ProductionManager. getTotalStock() somme
     Math.floor(p.stock) PAR ZONE avant d'additionner (pas l'arrondi du total brut) —
     cohérence avec l'affichage par zone, correctif appliqué à Champs en v3.96.4,
     généralisé ici dès l'origine pour les 5 autres bâtiments. */
  getTotalStock: function (buildingId) {
    var total = 0;
    this.getPlots(buildingId).forEach(function (p) { if (p.state === "open") total += Math.floor(p.stock); });
    return total;
  },

  getTotalCapacity: function (buildingId) {
    var self = this;
    var total = 0;
    this.getPlots(buildingId).forEach(function (p, i) { if (p.state === "open") total += self.getPlotCapacity(i, p); });
    return total;
  },

  getTotalRatePerMin: function (buildingId) {
    var self = this;
    var total = 0;
    this.getPlots(buildingId).forEach(function (p, i) { if (p.state === "open") total += self.getPlotRatePerMin(i, p); });
    return total;
  },

  getOpenPlotsCount: function (buildingId) {
    return this.getPlots(buildingId).filter(function (p) { return p.state === "open"; }).length;
  },

  /* Tick de production : chaque zone ouverte avance indépendamment vers SA propre
     capacité, à SON propre taux. Appelée depuis ProductionManager.tick() pour chaque
     buildingId de PRODUCTION_PLOTS_BUILDINGS. */
  tick: function (buildingId, dt) {
    var self = this;
    dt = Math.max(0, Number(dt || 0));
    if (dt <= 0) return;

    this.getPlots(buildingId).forEach(function (plot, index) {
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

  /* Rattrapage hors-ligne, une seule passe (calcule l'écoulé avant d'écraser lastTick). */
  catchUpOffline: function (buildingId) {
    var self = this;
    var now = Date.now();

    this.getPlots(buildingId).forEach(function (plot, index) {
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

  /* Récolte GLOBALE : additionne le stock (arrondi par zone) de toutes les zones
     ouvertes, crédite l'Entrepôt en une fois, vide chaque zone. */
  harvestAll: function (buildingId) {
    var total = 0;
    this.getPlots(buildingId).forEach(function (plot) {
      if (plot.state !== "open") return;
      total += Math.floor(plot.stock);
      plot.stock -= Math.floor(plot.stock);
    });
    return total;
  },

  /* Débloque la zone d'index `plotIndex` (locked -> open) du bâtiment `buildingId`. */
  unlockPlot: function (buildingId, plotIndex) {
    var plots = this.getPlots(buildingId);
    var plot = plots[plotIndex];
    if (!plot || plot.state !== "locked") return { ok: false, reason: "Zone invalide" };

    var cost = getProductionPlotUnlockCost(buildingId, plotIndex);
    if (!cost) return { ok: false, reason: "Zone invalide" };

    var canAfford = Object.keys(cost).every(function (key) {
      return WarehouseManager.getAmount(key) >= cost[key];
    });
    if (!canAfford) return { ok: false, reason: "Ressources insuffisantes" };

    Object.keys(cost).forEach(function (key) { WarehouseManager.removeResource(key, cost[key]); });
    plot.state = "open";
    plot.lastTick = Date.now();

    var buildingDef = PRODUCTION_BUILDINGS[buildingId];
    addLog("🗺️ " + (buildingDef ? buildingDef.name : buildingId) + " : nouvelle zone défrichée (" + (plotIndex + 1) + ")", "event");
    if (typeof renderPanel === "function") renderPanel();
    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null };
  },

  /* Améliore la zone d'index `plotIndex` d'un niveau, pour le bâtiment `buildingId`. */
  upgradePlot: function (buildingId, plotIndex) {
    var plots = this.getPlots(buildingId);
    var plot = plots[plotIndex];
    if (!plot || plot.state !== "open") return { ok: false, reason: "Zone invalide" };
    if (this.isPlotMaxLevel(plot)) return { ok: false, reason: "Niveau maximum" };

    var cost = getProductionPlotUpgradeCost(buildingId, plot.level, plotIndex);
    var canAfford = Object.keys(cost).every(function (key) {
      return WarehouseManager.getAmount(key) >= cost[key];
    });
    if (!canAfford) return { ok: false, reason: "Ressources insuffisantes" };

    Object.keys(cost).forEach(function (key) { WarehouseManager.removeResource(key, cost[key]); });
    plot.level += 1;

    var buildingDef = PRODUCTION_BUILDINGS[buildingId];
    addLog("🗺️ Zone " + (plotIndex + 1) + " améliorée (niv. " + plot.level + ") — " + (buildingDef ? buildingDef.name : buildingId), "event");
    if (typeof renderPanel === "function") renderPanel();
    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null };
  },

  /* Active l'amélioration fertile/irriguée sur la zone d'index `plotIndex`, pour le
     bâtiment `buildingId` (payante, cumulable, non réversible). */
  toggleImprovement: function (buildingId, plotIndex, kind) {
    if (kind !== "fertile" && kind !== "irrigated") return { ok: false, reason: "Amélioration invalide" };
    var plots = this.getPlots(buildingId);
    var plot = plots[plotIndex];
    if (!plot || plot.state !== "open") return { ok: false, reason: "Zone invalide" };
    if (plot[kind]) return { ok: false, reason: "Déjà appliquée" };

    var buildingCfg = PRODUCTION_PLOTS_BUILDINGS[buildingId];
    if (!buildingCfg) return { ok: false, reason: "Bâtiment invalide" };
    var def = buildingCfg.improvementCost[kind];
    var cost = def.cost;
    var canAfford = Object.keys(cost).every(function (key) {
      return WarehouseManager.getAmount(key) >= cost[key];
    });
    if (!canAfford) return { ok: false, reason: "Ressources insuffisantes" };

    Object.keys(cost).forEach(function (key) { WarehouseManager.removeResource(key, cost[key]); });
    plot[kind] = true;

    var label = kind === "fertile" ? "Terre fertile" : "Sillon irrigué";
    var buildingDef = PRODUCTION_BUILDINGS[buildingId];
    addLog("🗺️ Zone " + (plotIndex + 1) + " : " + label + " — " + (buildingDef ? buildingDef.name : buildingId), "event");
    if (typeof renderPanel === "function") renderPanel();
    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null };
  }
};

window.ProductionPlotsSystem = ProductionPlotsSystem;
