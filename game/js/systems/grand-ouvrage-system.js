"use strict";
/* systems/grand-ouvrage-system.js — v3.561.0 (retour Seb du 29/10, point 9, option E) : LE GRAND OUVRAGE.
   Le débouché sans fin du surplus : on y verse toute ressource de l'Entrepôt, chaque palier
   atteint donne +1 % d'or (combats via StatsSystem, Taverne, caravanes). Ouvert aux Ruines.

   VALEUR d'une ressource (points) : une matière brute vaut 1, un matériau de monde 25, un produit
   la somme de ses ingrédients (recette des ateliers), calculée une fois. Palier n : 2 000 × 1,12^(n−1).
   « Verser le surplus » ne prend que les matières brutes, au-dessus de la moitié du plafond et de
   la réserve protégée (même règle que la caravane). Le reste se verse à la main.

   ÉTAT : game.village.grandOuvrage = { points } (game.village est sauvegardé tel quel). */

var GRAND_OUVRAGE = {
  base: 2000,          // coût du premier palier, en points
  growth: 1.12,        // chaque palier coûte 12 % de plus que le précédent
  goldPerTier: 0.01,   // +1 % d'or par palier
  milestoneEvery: 5,   // un haut fait tous les 5 paliers
  opensAtWorld: 2,     // les Ruines : là où le surplus commence (banc des débouchés)
  rareValue: 25,       // un matériau de monde (Sève, Verre des dunes, Pierre errante, Cire, Cendre)
  keepShare: 0.5       // « Verser le surplus » laisse la moitié du plafond
};

var GrandOuvrage = {
  _values: null,

  isOpen: function () {
    return !!(game.worldsEverReached && game.worldsEverReached[GRAND_OUVRAGE.opensAtWorld]);
  },

  _state: function () {
    if (!game.village || typeof game.village !== "object") game.village = {};
    var s = game.village.grandOuvrage;
    if (!s || typeof s !== "object") s = game.village.grandOuvrage = { points: 0 };
    s.points = Math.max(0, Math.floor(Number(s.points) || 0));
    return s;
  },

  getPoints: function () { return this._state().points; },

  /* Coût du palier n (1 = le premier). */
  getTierCost: function (n) { return Math.round(GRAND_OUVRAGE.base * Math.pow(GRAND_OUVRAGE.growth, Math.max(0, n - 1))); },

  /* { tier, into, cost } : paliers atteints, points déjà versés dans le suivant, coût du suivant. */
  getProgress: function (points) {
    var left = (typeof points === "number") ? points : this.getPoints(), n = 0;
    while (left >= this.getTierCost(n + 1)) { left -= this.getTierCost(n + 1); n++; }
    return { tier: n, into: left, cost: this.getTierCost(n + 1) };
  },

  getTier: function () { return this.getProgress().tier; },

  /* Bonus d'or (0,03 = +3 %). Lu par StatsSystem (or des combats), la Taverne et la caravane. */
  getGoldBonus: function () { return this.getTier() * GRAND_OUVRAGE.goldPerTier; },
  /* Or d'une source hors combat (Taverne, caravane), bonus compris. */
  applyGold: function (gold) { return Math.floor(Number(gold || 0) * (1 + this.getGoldBonus())); },

  /* Valeur d'une ressource, en points (voir l'en-tête). */
  getValue: function (key) {
    if (!this._values) this._values = this._computeValues();
    return Number(this._values[key] || 0);
  },

  _computeValues: function () {
    var R = window.WAREHOUSE_RESOURCES || {}, v = {}, recettes = {};
    Object.keys(R).forEach(function (k) {
      var t = R[k].tier || "raw";
      if (t === "raw") v[k] = 1;
      else if (t === "special") v[k] = GRAND_OUVRAGE.rareValue;
    });
    var W = window.WORKSHOPS_CONFIG || {};
    Object.keys(W).forEach(function (w) {
      (W[w].recipes || []).forEach(function (r) { (r.outputs || []).forEach(function (o) { if (!recettes[o.resourceId]) recettes[o.resourceId] = r; }); });
    });
    var valeur = function (k, pile) {
      if (v[k] != null) return v[k];
      var r = recettes[k];
      if (!r || pile.indexOf(k) >= 0) return (v[k] = 1); // sans recette connue : comme une matière brute
      var out = (r.outputs || []).filter(function (o) { return o.resourceId === k; })[0], q = Math.max(1, Number(out && out.quantity || 1));
      var s = (r.inputs || []).reduce(function (a, i) { return a + valeur(i.resourceId, pile.concat(k)) * Number(i.quantity || 0); }, 0);
      return (v[k] = Math.max(1, Math.round(s / q)));
    };
    Object.keys(R).forEach(function (k) { valeur(k, []); });
    return v;
  },

  /* Ce que « Verser le surplus » prend d'une matière brute (0 pour le reste). */
  getSurplus: function (key) {
    var R = window.WAREHOUSE_RESOURCES || {}, d = R[key];
    if (!d || (d.tier || "raw") !== "raw" || !window.WarehouseManager) return 0;
    var cap = WarehouseManager.getCap(key);
    if (!(cap > 0) || cap === Infinity) return 0;
    var reserve = (window.ResourceReserveManager && typeof ResourceReserveManager.getReserve === "function") ? Number(ResourceReserveManager.getReserve(key) || 0) : 0;
    var keep = Math.max(Math.ceil(cap * GRAND_OUVRAGE.keepShare), reserve);
    return Math.max(0, Math.floor(WarehouseManager.getAmount(key) - keep));
  },

  /* Le surplus de toutes les matières brutes : { key: quantité }, et ce qu'il vaut. */
  getSurplusLoad: function () {
    var self = this, load = {}, points = 0;
    Object.keys(window.WAREHOUSE_RESOURCES || {}).forEach(function (k) {
      var q = self.getSurplus(k);
      if (q > 0) { load[k] = q; points += q * self.getValue(k); }
    });
    return { load: load, points: points };
  },

  /* Verse { key: quantité } ; renvoie { points, tiersGained, tier } ou null si rien n'est parti. */
  pour: function (load) {
    if (!this.isOpen() || !window.WarehouseManager) return null;
    var self = this, gained = 0, before = this.getTier();
    Object.keys(load || {}).forEach(function (k) {
      var q = Math.min(Math.floor(Number(load[k]) || 0), Math.floor(WarehouseManager.getAmount(k)));
      var val = self.getValue(k);
      if (q <= 0 || val <= 0) return;
      if (WarehouseManager.removeResource(k, q)) gained += q * val;
    });
    if (gained <= 0) return null;
    this._state().points += gained;
    var tier = this.getTier(), up = tier - before;
    if (typeof addLog === "function") addLog("🏛 " + _t("Grand Ouvrage : +{n} points", { n: formatNumber(gained) })
      + (up > 0 ? " · " + _t("palier {t} atteint, +{p} % d'or", { t: tier, p: Math.round(tier * GRAND_OUVRAGE.goldPerTier * 100) }) : ""), "event");
    if (up > 0 && window.EquipmentManager && typeof EquipmentManager.recalcStats === "function") EquipmentManager.recalcStats(); // l'or des combats suit
    if (typeof saveGame === "function") saveGame();
    return { points: gained, tiersGained: up, tier: tier };
  },

  pourSurplus: function () { return this.pour(this.getSurplusLoad().load); }
};

window.GRAND_OUVRAGE = GRAND_OUVRAGE;
window.GrandOuvrage = GrandOuvrage;
