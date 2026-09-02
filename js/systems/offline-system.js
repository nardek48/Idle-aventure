"use strict";
/* systems/offline-system.js — v3.113.0 : REFONTE. L'ancien Village hors-ligne (6 bâtiments,
   or/essence/kills simulés, plancher 1 or/sec, tick ambiant continu) est supprimé — l'or
   devient une ressource 100 % active (combats, missions, donjon), la Production couvre
   seule le hors-ligne (rattrapage par zone/atelier, ProductionManager.catchUpOffline()).
   Ne subsiste qu'OfflineManager : résumé de retour d'absence basé sur la Production.
   Boot (main/boot.js) : snapshot() AVANT catchUpOffline(), summarize() APRÈS, show() si
   absence > OFFLINE_SUMMARY_MIN_MS et gains non nuls. Ancien code : COMMENTAIRES_ORIGINAUX.md */

var OFFLINE_SUMMARY_MIN_MS = 5 * 60 * 1000;

var OfflineManager = {
  _before: null,

  /* Photographie l'état AVANT le rattrapage : durée d'absence, stocks de zones par
     ressource, compteurs Entrepôt (les ateliers créditent l'Entrepôt directement). */
  snapshot: function () {
    this._before = {
      ms: game.lastOnline ? Math.max(0, Date.now() - game.lastOnline) : 0,
      plots: this._collectPlotTotals(),
      warehouse: this._collectWarehouseCounts()
    };
  },

  /* Somme des stocks de zones ouvertes (arrondi PAR ZONE, cohérent avec la récolte) par
     resourceKey. Lecture directe de game.production — JAMAIS via getPlots()/ensurePlots(),
     qui créeraient un bucket pour un bâtiment verrouillé et fausseraient la migration
     "déjà en jeu = acquis" de production-system.js (_migrateLegacyUnlocks). */
  _collectPlotTotals: function () {
    var totals = {};
    if (!window.PRODUCTION_PLOTS_BUILDINGS || !window.PRODUCTION_BUILDINGS) return totals;
    if (!game.production || typeof game.production !== "object") return totals;

    Object.keys(PRODUCTION_PLOTS_BUILDINGS).forEach(function (id) {
      var def = PRODUCTION_BUILDINGS[id];
      var bucket = game.production[id];
      if (!def || !bucket || !Array.isArray(bucket.plots)) return;
      var key = def.resourceKey;
      bucket.plots.forEach(function (plot) {
        if (!plot || plot.state !== "open") return;
        totals[key] = (totals[key] || 0) + Math.floor(Number(plot.stock || 0));
      });
    });
    return totals;
  },

  _collectWarehouseCounts: function () {
    var counts = {};
    if (typeof WAREHOUSE_RESOURCES === "undefined" || !game.resources) return counts;
    Object.keys(WAREHOUSE_RESOURCES).forEach(function (key) {
      counts[key] = Math.floor(Number(game.resources[key] || 0));
    });
    return counts;
  },

  /* Zones pleines / ouvertes (stock >= capacité), pour la ligne d'état de la modale.
     Même règle de lecture directe que _collectPlotTotals (pas d'ensurePlots). */
  _countFullPlots: function () {
    var full = 0, open = 0;
    if (!window.ProductionPlotsSystem || !window.PRODUCTION_PLOTS_BUILDINGS) return { full: 0, open: 0 };
    if (!game.production || typeof game.production !== "object") return { full: 0, open: 0 };

    Object.keys(PRODUCTION_PLOTS_BUILDINGS).forEach(function (id) {
      var bucket = game.production[id];
      if (!bucket || !Array.isArray(bucket.plots)) return;
      bucket.plots.forEach(function (plot, index) {
        if (!plot || plot.state !== "open") return;
        open++;
        var capacity = ProductionPlotsSystem.getPlotCapacity(index, plot);
        if (Number(plot.stock || 0) >= capacity - 0.001) full++;
      });
    });
    return { full: full, open: open };
  },

  /* Diff APRÈS catchUpOffline() : gains de zones (à récolter) + gains d'Entrepôt
     (crafts d'ateliers terminés hors ligne). null si absence courte ou aucun gain. */
  summarize: function () {
    var before = this._before;
    this._before = null;
    if (!before || before.ms < OFFLINE_SUMMARY_MIN_MS) return null;

    var plotsAfter = this._collectPlotTotals();
    var whAfter = this._collectWarehouseCounts();

    var produced = {};
    Object.keys(plotsAfter).forEach(function (key) {
      var delta = plotsAfter[key] - (before.plots[key] || 0);
      if (delta > 0) produced[key] = delta;
    });

    var crafted = {};
    Object.keys(whAfter).forEach(function (key) {
      var delta = whAfter[key] - (before.warehouse[key] || 0);
      if (delta > 0) crafted[key] = delta;
    });

    if (!Object.keys(produced).length && !Object.keys(crafted).length) return null;

    var fullInfo = this._countFullPlots();
    return { ms: before.ms, produced: produced, crafted: crafted, fullPlots: fullInfo.full, openPlots: fullInfo.open };
  },

  /* Journal + modale de retour. Le libellé d'une ressource vient de WAREHOUSE_RESOURCES. */
  show: function (summary) {
    if (!summary) return;

    var parts = [];
    Object.keys(summary.produced).forEach(function (key) {
      var def = typeof WAREHOUSE_RESOURCES !== "undefined" ? WAREHOUSE_RESOURCES[key] : null;
      parts.push("+" + formatNumber(summary.produced[key]) + " " + (def ? def.name : key));
    });
    Object.keys(summary.crafted).forEach(function (key) {
      var def = typeof WAREHOUSE_RESOURCES !== "undefined" ? WAREHOUSE_RESOURCES[key] : null;
      parts.push("+" + formatNumber(summary.crafted[key]) + " " + (def ? def.name : key) + " (atelier)");
    });

    addLog("Pendant ton absence, le village a produit : " + parts.join(", ") + ".", "event");

    if (typeof showOfflineModal === "function") {
      showOfflineModal(summary);
    } else {
      showToast("Production hors-ligne : " + parts.join(", "), 2200);
    }
  }
};

window.OfflineManager = OfflineManager;
