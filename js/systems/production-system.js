"use strict";
/* ============================================================
Aethervale — systems/production-system.js
v3.31 : ProductionManager — 4 bâtiments (voir data/production-buildings.js)
qui accumulent un STOCK LOCAL plafonné en continu, à récolter
manuellement vers l'Entrepôt (WarehouseManager.addResource(), voir
systems/warehouse-system.js — SEUL chemin d'écriture vers game.resources).

Distinct de VillageManager (offline-system.js) : le Village donne des
bonus passifs en %, sans aucun stock à gérer ; ici chaque bâtiment a
son propre stock local (game.production[id].stock), plafonné à
getCapacity(id), qui s'arrête de grossir une fois plein — le joueur
doit "Récolter" pour transférer ce stock vers l'Entrepôt et laisser la
production reprendre.

Deux mécanismes de calcul, même principe que Village/Offline :
  - tick(dt) : appelé à chaque frame par main/game-loop.js, tant que
    le jeu est ouvert (accumulateur fractionnaire par bâtiment).
  - catchUpOffline() : appelé une fois au boot (main/boot.js), calcule
    en un seul bloc la production accumulée pendant l'absence, à
    partir de game.production[id].lastTick (PAS game.lastOnline —
    indépendant du flux de la modale hors-ligne classique, qui ne
    concerne que Village/or/essence/Aether).
============================================================ */

var ProductionManager = {
  /* Comble les bâtiments manquants (sauvegarde ancienne ou tout
     premier lancement) — chaque bâtiment démarre au niveau 1, stock
     vide, lastTick = maintenant (pas de rattrapage rétroactif sur une
     création fraîche). */
  ensure: function () {
    if (!game.production || typeof game.production !== "object") game.production = {};
    Object.keys(PRODUCTION_BUILDINGS).forEach(function (id) {
      if (!game.production[id] || typeof game.production[id] !== "object") {
        game.production[id] = { level: 1, stock: 0, lastTick: Date.now() };
      }
      var b = game.production[id];
      if (typeof b.level !== "number" || b.level < 1) b.level = 1;
      if (typeof b.stock !== "number" || b.stock < 0) b.stock = 0;
      if (typeof b.lastTick !== "number") b.lastTick = Date.now();
    });
  },

  getLevel: function (id) {
    this.ensure();
    return Number((game.production[id] || {}).level || 1);
  },

  getStock: function (id) {
    this.ensure();
    return Number((game.production[id] || {}).stock || 0);
  },

  /* Rendement en unités/minute au niveau actuel. */
  getRatePerMin: function (id) {
    var level = this.getLevel(id);
    return PRODUCTION_CONFIG.baseRatePerMin * Math.pow(PRODUCTION_CONFIG.rateGrowthPerLevel, level - 1);
  },

  /* Capacité de stock local au niveau actuel. v3.31 : la capacité
     évolue AVEC le niveau du bâtiment (même amélioration que le
     rendement, décision validée avec Seb) — progression volontairement
     plus lente que le rendement (+10%/niveau additif simple, contre
     +25%/niveau composé pour le rendement) pour que le temps de
     remplissage reste proche de 20-30 min à tous les niveaux plutôt
     que de s'effondrer. Pas d'aménagement d'entrepôt séparé pour
     l'instant — si un jour on veut découpler capacité et niveau (ex.
     une extension achetée à part), remplacer cette formule par une
     lecture d'un futur game.production[id].capacityLevel séparé, le
     reste du système (tick/catchUpOffline/harvest) n'a pas besoin de
     changer, il ne fait que lire getCapacity(id). */
  getCapacity: function (id) {
    var level = this.getLevel(id);
    return Math.floor(PRODUCTION_CONFIG.baseCapacity * (1 + PRODUCTION_CONFIG.capacityGrowthPerLevel * (level - 1)));
  },

  isStockFull: function (id) {
    return this.getStock(id) >= this.getCapacity(id);
  },

  getCost: function (id) {
    var level = this.getLevel(id);
    return Math.floor(PRODUCTION_CONFIG.baseCost * Math.pow(PRODUCTION_CONFIG.costMult, level - 1));
  },

  isMaxLevel: function (id) {
    return this.getLevel(id) >= PRODUCTION_CONFIG.maxLevel;
  },

  /* Temps restant estimé avant stock plein, en secondes (Infinity si
     déjà plein ou si le rendement est nul). */
  getSecondsUntilFull: function (id) {
    var stock = this.getStock(id);
    var capacity = this.getCapacity(id);
    var ratePerMin = this.getRatePerMin(id);
    if (stock >= capacity || ratePerMin <= 0) return Infinity;
    return ((capacity - stock) / ratePerMin) * 60;
  },

  /* Avance la production de TOUS les bâtiments de dt secondes —
     appelée à chaque frame par main/game-loop.js, même principe que
     VillageManager.tickAmbientHunting() (accumulateur fractionnaire
     par bâtiment pour ne pas perdre de fraction d'unité entre deux
     frames). Tourne en continu quel que soit l'onglet ouvert (pas
     besoin d'être sur l'écran Production).

     v3.31.1 : le re-rendu de l'écran (renderPanel(), qui remplace TOUT
     le innerHTML du panel) est throttlé à ~1×/seconde au lieu d'à
     chaque frame — sinon, avec le stock qui change à quasi chaque frame
     tant qu'un bâtiment n'est pas plein, le panel se faisait détruire/
     recréer ~60×/seconde pendant que l'écran Production était ouvert,
     rendant les boutons (Récolter/Améliorer/sous-onglets) pratiquement
     impossibles à cliquer (le clic tombait sur un élément qui venait
     d'être remplacé sous le curseur). Bug remonté par Seb. */
  tick: function (dt) {
    this.ensure();
    dt = Math.max(0, Number(dt || 0));
    if (dt <= 0) return;

    var self = this;
    var changed = false;

    Object.keys(PRODUCTION_BUILDINGS).forEach(function (id) {
      var b = game.production[id];
      var capacity = self.getCapacity(id);
      if (b.stock >= capacity) {
        b.lastTick = Date.now();
        return; // stock plein : production à l'arrêt, pas d'accumulateur qui déborde en silence
      }

      var ratePerSec = self.getRatePerMin(id) / 60;
      var gained = ratePerSec * dt;
      var newStock = Math.min(capacity, b.stock + gained);
      if (newStock !== b.stock) {
        b.stock = newStock;
        changed = true;
      }
      b.lastTick = Date.now();
    });

    if (!changed) return;
    if (typeof isProductionScreenVisible !== "function" || !isProductionScreenVisible()) return;

    this._renderAccum = Number(this._renderAccum || 0) + dt;
    if (this._renderAccum < 1) return; // throttle : 1 re-rendu/seconde max
    this._renderAccum = 0;

    if (typeof renderPanel === "function") renderPanel();
  },

  /* Calcule ET applique en un seul bloc la production accumulée
     pendant l'absence — appelée une fois au boot (voir main/boot.js),
     AVANT le premier tick continu. Utilise game.production[id].lastTick
     (indépendant de game.lastOnline, qui ne sert qu'au flux
     or/essence/Aether de OfflineManager). Silencieuse (pas de toast) :
     le joueur découvre le stock rempli en ouvrant Production, pas
     besoin d'une modale dédiée pour un simple stock local plafonné. */
  catchUpOffline: function () {
    this.ensure();
    var now = Date.now();
    var self = this;

    Object.keys(PRODUCTION_BUILDINGS).forEach(function (id) {
      var b = game.production[id];
      var elapsedMs = now - Number(b.lastTick || now);
      if (elapsedMs <= 1000) {
        b.lastTick = now;
        return;
      }

      var capacity = self.getCapacity(id);
      if (b.stock < capacity) {
        var ratePerSec = self.getRatePerMin(id) / 60;
        var gained = ratePerSec * (elapsedMs / 1000);
        b.stock = Math.min(capacity, b.stock + gained);
      }
      b.lastTick = now;
    });
  },

  /* Transfère TOUT le stock local vers l'Entrepôt (WarehouseManager,
     seul point d'entrée — voir systems/warehouse-system.js) et vide
     le stock local du bâtiment, qui reprend aussitôt sa production. */
  harvest: function (id) {
    this.ensure();
    var b = game.production[id];
    var def = PRODUCTION_BUILDINGS[id];
    if (!b || !def) return;

    var amount = Math.floor(b.stock);
    if (amount <= 0) {
      showToast("Rien à récolter", 1000);
      return;
    }

    WarehouseManager.addResource(def.resourceKey, amount, true); // silent : on log un seul message groupé ci-dessous
    b.stock -= amount; // conserve la fraction éventuelle (production continue entre deux récoltes)
    b.lastTick = Date.now();

    var resDef = WAREHOUSE_RESOURCES[def.resourceKey];
    addLog("🌾 " + def.name + " récoltée : +" + formatNumber(amount) + " " + (resDef ? resDef.name : def.resourceKey), "event");
    showToast("+" + formatNumber(amount) + " " + (resDef ? resDef.name : ""), 1300);

    if (typeof renderPanel === "function") renderPanel();
    saveGame();
  },

  /* Améliore un bâtiment d'un niveau (coût en or, voir getCost()) —
     augmente le rendement ET la capacité (même amélioration, voir
     getCapacity()). */
  buy: function (id) {
    this.ensure();
    var b = game.production[id];
    var def = PRODUCTION_BUILDINGS[id];
    if (!b || !def) return;

    if (this.isMaxLevel(id)) {
      showToast("Niveau maximum", 1200);
      return;
    }

    var cost = this.getCost(id);
    if ((game.gold || 0) < cost) {
      showToast("Pas assez d'or", 1000);
      return;
    }

    game.gold -= cost;
    b.level += 1;

    if (window.QuestManager && typeof QuestManager.track === "function") {
      QuestManager.track("goldSpent", cost);
    }

    addLog(def.name + " amélioré (niv. " + b.level + ")", "event");
    showToast(def.name + " niv. " + b.level, 1200);

    if (typeof renderPanel === "function") renderPanel();
    saveGame();
  }
};

window.ProductionManager = ProductionManager;
