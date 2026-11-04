"use strict";
/* systems/grand-ouvrage-system.js — v3.561.0 (retour Seb du 29/10, point 9, option E) : LE GRAND OUVRAGE.
   Le débouché sans fin du surplus : on y verse toute ressource de l'Entrepôt, chaque palier
   atteint donne +1 % d'or (combats via StatsSystem, Taverne, caravanes). Ouvert aux Ruines.

   VALEUR d'une ressource (points) : une matière brute vaut 1, un matériau de monde 25, un produit
   la somme de ses ingrédients (recette des ateliers), calculée une fois. Palier n : 2 000 × 1,12^(n−1).
   « Verser le surplus » ne prend que les matières brutes, au-dessus de la moitié du plafond et de
   la réserve protégée (même règle que la caravane). Le reste se verse à la main.

   v3.609.0 (chantier surproduction, option C) : versement AUTOMATIQUE des matières brutes au-delà d'un seuil
   du plafond (70-95 %, 80 % par défaut), à chaque entrée dans l'Entrepôt ; paliers à +18 % ; ouvert au Désert.
   ÉTAT : game.village.grandOuvrage = { points, v, auto, seuil } (game.village est sauvegardé tel quel). */

var GRAND_OUVRAGE = {
  base: 2000,          // coût du premier palier, en points
  growth: 1.18,        // v3.609.0 : 12 → 18 % de plus par palier (le versement automatique accélère tout)
  oldGrowth: 1.12,     // pour convertir les points des parties d'avant (même palier gardé)
  goldPerTier: 0.01,   // +1 % d'or par palier
  milestoneEvery: 5,   // un haut fait tous les 5 paliers
  opensAtWorld: 1,     // v3.609.0 : le Désert (il déborde déjà, banc des débouchés)
  autoDefault: 0.8,    // seuil par défaut du versement automatique
  autoMin: 0.7,        // aucun achat ne demande plus de 62 % du plafond d'une matière brute (banc 01/11)
  autoMax: 0.95,
  autoStep: 0.05,
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
    if (s.v !== 2) { s.points = this._convertPoints(s.points); s.v = 2; } // v3.609.0 : même palier, nouvelle courbe
    if (typeof s.auto !== "boolean") s.auto = true;
    var t = Number(s.seuil);
    s.seuil = isFinite(t) && t > 0 ? Math.min(GRAND_OUVRAGE.autoMax, Math.max(GRAND_OUVRAGE.autoMin, Math.round(t * 100) / 100)) : GRAND_OUVRAGE.autoDefault;
    return s;
  },

  /* Points de l'ancienne courbe (×1,12) -> points de la nouvelle donnant le même palier et la même avancée. */
  _convertPoints: function (pts) {
    if (!(pts > 0)) return 0;
    var G = GRAND_OUVRAGE, n = 0, left = pts, cost = function (g, k) { return Math.round(G.base * Math.pow(g, k - 1)); };
    while (left >= cost(G.oldGrowth, n + 1)) { left -= cost(G.oldGrowth, n + 1); n++; }
    var out = 0; for (var k = 1; k <= n; k++) out += cost(G.growth, k);
    return Math.floor(out + left / cost(G.oldGrowth, n + 1) * cost(G.growth, n + 1));
  },

  /* ---------- v3.609.0 : versement automatique ---------- */
  isAuto: function () { return this.isOpen() && this._state().auto; },
  getSeuil: function () { return this._state().seuil; },
  setAuto: function (on) { this._state().auto = !!on; if (on) this.autoPourAll(); },
  stepSeuil: function (dir) { var s = this._state(); s.seuil = Math.min(GRAND_OUVRAGE.autoMax, Math.max(GRAND_OUVRAGE.autoMin, Math.round((s.seuil + dir * GRAND_OUVRAGE.autoStep) * 100) / 100)); this.autoPourAll(); return s.seuil; },

  /* Ce que le seuil garde d'une matière brute (Infinity si le versement auto ne la concerne pas). */
  autoKeep: function (key) {
    var d = (window.WAREHOUSE_RESOURCES || {})[key];
    if (!d || (d.tier || "raw") !== "raw" || !this.isAuto() || !window.WarehouseManager) return Infinity;
    var cap = WarehouseManager.getCap(key);
    if (!(cap > 0) || cap === Infinity) return Infinity;
    var reserve = (window.ResourceReserveManager && typeof ResourceReserveManager.getReserve === "function") ? Number(ResourceReserveManager.getReserve(key) || 0) : 0;
    return Math.min(cap, Math.max(Math.floor(cap * this.getSeuil()), reserve)); // ECON-6 : une réserve au-dessus du plafond ne fait plus perdre la récolte
  },

  /* Appelé par WarehouseManager.addResource : `total` = stock + arrivée ; rend ce qui reste au stock.
     Le reste part en points, sans journal (seul un palier franchi s'annonce). */
  autoAbsorb: function (key, total) {
    var keep = this.autoKeep(key);
    if (keep === Infinity || total <= keep) return total;
    this._gain(Math.floor(total - keep) * this.getValue(key));
    return keep;
  },

  /* Remet chaque matière brute sous le seuil (activation, seuil baissé). */
  autoPourAll: function () {
    var self = this;
    Object.keys(window.WAREHOUSE_RESOURCES || {}).forEach(function (k) {
      var keep = self.autoKeep(k), have = Number(game.resources[k] || 0);
      if (keep !== Infinity && have > keep) game.resources[k] = self.autoAbsorb(k, have);
    });
  },

  _gain: function (pts) {
    if (!(pts > 0)) return;
    var before = this.getTier();
    this._state().points += pts;
    var tier = this.getTier();
    if (tier > before) {
      if (typeof addLog === "function") addLog("🏛 " + _t("Grand Ouvrage : palier {t} atteint, +{p} % d'or", { t: tier, p: Math.round(tier * GRAND_OUVRAGE.goldPerTier * 100) }), "event");
      if (window.EquipmentManager && typeof EquipmentManager.recalcStats === "function") EquipmentManager.recalcStats();
      if (window.AchievementManager && typeof AchievementManager.refresh === "function") AchievementManager.refresh();
    }
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
