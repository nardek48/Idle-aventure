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

    // relevé 2 (27/10) : zones de l'ancien modèle (5 niveaux, ×1,78) converties une fois, production gardée
    if (bucket.model !== PRODUCTION_PLOTS_SHARED.model) {
      if (!needsReset) { var self = this; bucket.plots.forEach(function (p) { if (p && p.level > 1) p.level = self.migrateLevel(p.level); }); }
      bucket.model = PRODUCTION_PLOTS_SHARED.model;
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

  /* v3.418.0 (R4, décision Seb) : buildingId facultatif — applique le rateMult du bâtiment
     (nourriture et pierre −20 %, data/production-plots.js). */
  getPlotRatePerMin: function (plotIndex, plot, buildingId) {
    var profile = this.getProfile(plotIndex);
    var cfg = buildingId ? PRODUCTION_PLOTS_BUILDINGS[buildingId] : null;
    var rate = profile.baseRatePerMin * this.levelMult(plot.level) * ((cfg && cfg.rateMult) || 1); // relevé 2 : linéaire
    /* v3.422.0 : le bonus de carte vivante (Puits, Scierie +10 %) s'applique ICI, à la zone.
       Avant, seul l'affichage du total (ProductionManager.getRatePerMin) le comptait : depuis
       la v3.97.0, les 6 bâtiments passent par les zones et le bonus n'était jamais produit. */
    if (buildingId && window.ProductionManager && typeof ProductionManager.getLivingMapMult === "function") {
      rate *= ProductionManager.getLivingMapMult(buildingId);
    }
    var bonus = 1;
    if (plot.fertile) bonus += PRODUCTION_PLOTS_SHARED.bonusPerImprovement.fertile;
    if (plot.irrigated) bonus += PRODUCTION_PLOTS_SHARED.bonusPerImprovement.irrigated;
    return rate * bonus;
  },

  /* Relevé 2 (27/10) : multiplicateur du niveau, 1 + 0,7 × (niveau − 1). */
  levelMult: function (level) { return 1 + PRODUCTION_PLOTS_SHARED.linearPerLevel * (Math.max(1, Number(level) || 1) - 1); },

  /* Migration b (Seb, 27/10) : niveau du modèle 2 qui produit au moins autant que l'ancien niveau (×1,78 par niveau).
     Peut dépasser le plafond du monde : la production acquise est gardée. */
  migrateLevel: function (oldLevel) {
    var target = Math.pow(PRODUCTION_PLOTS_SHARED.profiles.rapide.rateGrowthPerLevel, Math.max(1, Number(oldLevel) || 1) - 1);
    var L = 1; while (L < PRODUCTION_PLOTS_SHARED.plotMaxLevel && this.levelMult(L) < target - 1e-9) L++;
    return L;
  },

  getPlotCapacity: function (plotIndex, plot) {
    var profile = this.getProfile(plotIndex);
    return Math.floor(profile.baseCapacity * this.levelMult(plot.level)); // relevé 2 : la réserve suit le débit
  },

  /* v3.289.0 : niveau max EFFECTIF d'une zone = min(max propre, plafond du monde
     atteint — data/world-caps.js). Une zone déjà plus haute garde son niveau. */
  getPlotLevelCap: function () {
    var cap = window.WorldCaps ? WorldCaps.getZoneLevel() : Infinity;
    return Math.min(PRODUCTION_PLOTS_SHARED.plotMaxLevel, cap);
  },

  isPlotMaxLevel: function (plot) {
    return plot.level >= this.getPlotLevelCap();
  },

  /* Vrai quand c'est le monde, pas la zone, qui arrête l'amélioration. */
  isPlotLevelWorldCapped: function (plot) {
    return this.isPlotMaxLevel(plot) && plot.level < PRODUCTION_PLOTS_SHARED.plotMaxLevel;
  },

  /* v3.289.0 : une ligne de la grille 3×3 par monde (Forêt / Désert / Ruines).
     Une zone déjà ouverte reste ouverte, quelle que soit sa ligne. */
  isPlotRowOpen: function (plotIndex) {
    var rows = window.WorldCaps ? WorldCaps.getZoneRows() : Infinity;
    return Math.floor(Number(plotIndex) / 3) < rows;
  },

  /* Monde qui ouvre la ligne de cette zone, avec sa préposition (« au Désert oublié »). */
  getPlotRowOpening: function (plotIndex) {
    var row = Math.floor(Number(plotIndex) / 3);
    return window.WorldCaps ? WorldCaps.withPrep(WorldCaps.getRowOpeningIndex(row)) : _t("dans un prochain monde"); // v3.437.2
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
    this.getPlots(buildingId).forEach(function (p, i) { if (p.state === "open") total += self.getPlotRatePerMin(i, p, buildingId); });
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
      var ratePerSec = self.getPlotRatePerMin(index, plot, buildingId) / 60;
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
          var ratePerSec = self.getPlotRatePerMin(index, plot, buildingId) / 60;
          plot.stock = Math.min(capacity, plot.stock + ratePerSec * (elapsedMs / 1000));
        }
      }
      plot.lastTick = now;
    });
  },

  /* Récolte GLOBALE : additionne le stock (arrondi par zone) de toutes les zones
     ouvertes, crédite l'Entrepôt en une fois, vide chaque zone. */
  harvestAll: function (buildingId, maxTake) {
    // v3.330.0 (E1) : maxTake = place libre à l'Entrepôt ; le reste attend dans les zones
    var total = 0;
    var left = (typeof maxTake === "number" && isFinite(maxTake)) ? Math.max(0, Math.floor(maxTake)) : Infinity;
    this.getPlots(buildingId).forEach(function (plot) {
      if (plot.state !== "open" || left <= 0) return;
      var n = Math.min(Math.floor(plot.stock), left);
      total += n;
      left -= n;
      plot.stock -= n;
    });
    return total;
  },

  /* Débloque la zone d'index `plotIndex` (locked -> open) du bâtiment `buildingId`. */
  unlockPlot: function (buildingId, plotIndex) {
    var plots = this.getPlots(buildingId);
    var plot = plots[plotIndex];
    if (!plot || plot.state !== "locked") return { ok: false, reason: _t("Zone invalide") };
    if (!this.isPlotRowOpen(plotIndex)) return { ok: false, reason: _t("S'ouvre {lieu}", { lieu: this.getPlotRowOpening(plotIndex) }) };

    var cost = getProductionPlotUnlockCost(buildingId, plotIndex);
    if (!cost) return { ok: false, reason: _t("Zone invalide") };

    var canAfford = Object.keys(cost).every(function (key) {
      return WarehouseManager.getAmount(key) >= cost[key];
    });
    if (!canAfford) return { ok: false, reason: _t("Ressources insuffisantes") };

    Object.keys(cost).forEach(function (key) { WarehouseManager.removeResource(key, cost[key]); });
    plot.state = "open";
    plot.lastTick = Date.now();

    var buildingDef = PRODUCTION_BUILDINGS[buildingId];
    addLog("🗺️ " + _t("{x} : nouvelle zone défrichée ({n})", { x: buildingDef ? _td(buildingDef.name) : buildingId, n: plotIndex + 1 }), "event");
    if (typeof renderPanel === "function") renderPanel();
    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null };
  },

  /* Améliore la zone d'index `plotIndex` d'un niveau, pour le bâtiment `buildingId`. */
  upgradePlot: function (buildingId, plotIndex) {
    var plots = this.getPlots(buildingId);
    var plot = plots[plotIndex];
    if (!plot || plot.state !== "open") return { ok: false, reason: _t("Zone invalide") };
    if (this.isPlotMaxLevel(plot)) return { ok: false, reason: this.isPlotLevelWorldCapped(plot) ? _t("Plafond de ce monde") : _t("Niveau maximum") };

    var cost = getProductionPlotUpgradeCost(buildingId, plot.level, plotIndex);
    var canAfford = Object.keys(cost).every(function (key) {
      return WarehouseManager.getAmount(key) >= cost[key];
    });
    if (!canAfford) return { ok: false, reason: _t("Ressources insuffisantes") };

    Object.keys(cost).forEach(function (key) { WarehouseManager.removeResource(key, cost[key]); });
    plot.level += 1;

    var buildingDef = PRODUCTION_BUILDINGS[buildingId];
    addLog("🗺️ " + _t("Zone {n} améliorée (niv. {l}) — {x}", { n: plotIndex + 1, l: plot.level, x: buildingDef ? _td(buildingDef.name) : buildingId }), "event");
    if (typeof renderPanel === "function") renderPanel();
    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null };
  },

  /* Active l'amélioration fertile/irriguée sur la zone d'index `plotIndex`, pour le
     bâtiment `buildingId` (payante, cumulable, non réversible). */
  /* v3.479.0 (refonte de l'économie RE-2, atelier zones-par-rangee.html) : actions par RANGÉE de la
     grille 3×3 (une rangée par monde). Le coût est la somme de celui des zones ; tout ou rien. */
  getRowState: function (buildingId, row) {
    var self = this, plots = this.getPlots(buildingId), cfg = PRODUCTION_PLOTS_BUILDINGS[buildingId];
    var idx = [row * 3, row * 3 + 1, row * 3 + 2];
    var st = { row: row, open: [], locked: [], upNow: [], minLevel: null, lvMin: 0, lvMax: 0, unlockCost: {}, upCost: {}, impCost: {}, impN: 0, rowOpen: this.isPlotRowOpen(row * 3) };
    function add(target, cost) { Object.keys(cost || {}).forEach(function (k) { target[k] = (target[k] || 0) + cost[k]; }); }
    idx.forEach(function (i) { (plots[i].state === "open" ? st.open : st.locked).push(i); });
    var up = st.open.filter(function (i) { return !self.isPlotMaxLevel(plots[i]); });
    if (up.length) st.minLevel = Math.min.apply(null, up.map(function (i) { return plots[i].level; }));
    st.upNow = up.filter(function (i) { return plots[i].level === st.minLevel; });
    if (st.open.length) {
      var lv = st.open.map(function (i) { return plots[i].level; });
      st.lvMin = Math.min.apply(null, lv); st.lvMax = Math.max.apply(null, lv);
    }
    st.locked.forEach(function (i) { add(st.unlockCost, getProductionPlotUnlockCost(buildingId, i)); });
    st.upNow.forEach(function (i) { add(st.upCost, getProductionPlotUpgradeCost(buildingId, plots[i].level, i)); });
    st.open.forEach(function (i) {
      ["fertile", "irrigated"].forEach(function (k) { if (!plots[i][k]) { add(st.impCost, cfg.improvementCost[k].cost); st.impN++; } });
    });
    return st;
  },
  _payAll: function (cost) {
    var ok = Object.keys(cost).every(function (k) { return WarehouseManager.getAmount(k) >= cost[k]; });
    if (ok) Object.keys(cost).forEach(function (k) { WarehouseManager.removeResource(k, cost[k]); });
    return ok;
  },
  _rowDone: function (text) {
    addLog("🗺️ " + text, "event");
    if (typeof renderPanel === "function") renderPanel();
    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null, text: text };
  },
  unlockRow: function (buildingId, row) {
    var st = this.getRowState(buildingId, row), plots = this.getPlots(buildingId);
    if (!st.rowOpen) return { ok: false, reason: _t("S'ouvre {lieu}", { lieu: this.getPlotRowOpening(row * 3) }) };
    if (!st.locked.length) return { ok: false, reason: _t("Rangée déjà défrichée") };
    if (!this._payAll(st.unlockCost)) return { ok: false, reason: _t("Ressources insuffisantes") };
    st.locked.forEach(function (i) { plots[i].state = "open"; plots[i].lastTick = Date.now(); });
    var def = PRODUCTION_BUILDINGS[buildingId];
    return this._rowDone(_tn(st.locked.length, "{x} : rangée {r}, {n} zone défrichée", "{x} : rangée {r}, {n} zones défrichées", { x: def ? _td(def.name) : buildingId, r: row + 1 }));
  },
  upgradeRow: function (buildingId, row) {
    var st = this.getRowState(buildingId, row), plots = this.getPlots(buildingId);
    if (!st.upNow.length) return { ok: false, reason: _t("Rangée au maximum de ce monde") };
    if (!this._payAll(st.upCost)) return { ok: false, reason: _t("Ressources insuffisantes") };
    st.upNow.forEach(function (i) { plots[i].level += 1; });
    var def = PRODUCTION_BUILDINGS[buildingId];
    return this._rowDone(_t("{x} : rangée {r} au niveau {l}", { x: def ? _td(def.name) : buildingId, r: row + 1, l: st.minLevel + 1 }));
  },
  improveRow: function (buildingId, row) {
    var st = this.getRowState(buildingId, row), plots = this.getPlots(buildingId);
    if (!st.impN) return { ok: false, reason: _t("Déjà appliquée") };
    if (!this._payAll(st.impCost)) return { ok: false, reason: _t("Ressources insuffisantes") };
    st.open.forEach(function (i) { plots[i].fertile = true; plots[i].irrigated = true; });
    var def = PRODUCTION_BUILDINGS[buildingId];
    return this._rowDone(_t("{x} : rangée {r} améliorée", { x: def ? _td(def.name) : buildingId, r: row + 1 }));
  },
  toggleImprovement: function (buildingId, plotIndex, kind) {
    if (kind !== "fertile" && kind !== "irrigated") return { ok: false, reason: _t("Amélioration invalide") };
    var plots = this.getPlots(buildingId);
    var plot = plots[plotIndex];
    if (!plot || plot.state !== "open") return { ok: false, reason: _t("Zone invalide") };
    if (plot[kind]) return { ok: false, reason: _t("Déjà appliquée") };

    var buildingCfg = PRODUCTION_PLOTS_BUILDINGS[buildingId];
    if (!buildingCfg) return { ok: false, reason: _t("Bâtiment invalide") };
    var def = buildingCfg.improvementCost[kind];
    var cost = def.cost;
    var canAfford = Object.keys(cost).every(function (key) {
      return WarehouseManager.getAmount(key) >= cost[key];
    });
    if (!canAfford) return { ok: false, reason: _t("Ressources insuffisantes") };

    Object.keys(cost).forEach(function (key) { WarehouseManager.removeResource(key, cost[key]); });
    plot[kind] = true;

    var label = kind === "fertile" ? _t("Terre fertile") : _t("Sillon irrigué");
    var buildingDef = PRODUCTION_BUILDINGS[buildingId];
    addLog("🗺️ " + _t("Zone {n} : {y} — {x}", { n: plotIndex + 1, y: label, x: buildingDef ? _td(buildingDef.name) : buildingId }), "event");
    if (typeof renderPanel === "function") renderPanel();
    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null };
  }
};

window.ProductionPlotsSystem = ProductionPlotsSystem;
