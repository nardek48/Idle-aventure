"use strict";
/* systems/caravan-system.js — v3.419.0 (lot E-2, R3 décision Seb du 01/10/2026) : CaravanManager.

   La caravane de la Halle marchande emporte le SURPLUS de matières brutes et le
   vend au loin. Deuxième débouché de la Production, à côté des contrats de la
   Taverne. Atelier validé : version C1 « Surplus auto » (atelier-caravane.html).

   RÈGLES (décisions Seb) :
     - trois trajets : Court 1 h · 150 unités · 80 % de la valeur
                       Moyen 4 h · 400 unités · 100 %
                       Long  8 h · 800 unités · 120 %, 25 % de chance d'un
                             matériau rare du monde, 10 % d'un objet d'équipement ;
     - Court et Moyen dès la Halle niveau 1, Long au niveau 3 ;
     - +10 % de capacité par niveau de Halle au-delà du premier (×1,9 au niveau 10) ;
     - chargement automatique (C1) : seules les matières brutes partent, et seulement
       ce qui dépasse la MOITIÉ du plafond et la réserve protégée de l'Entrepôt.
       Les ressources au plafond passent d'abord, à parts égales ;
     - une seule caravane à la fois ; elle continue hors ligne (horodatage).

   ÉTAT EN SAUVEGARDE (dans game.village, persisté tel quel par save-system) :
     game.village.caravan = null | {
       trip, startedAt, endsAt,   // horodatages en ms
       cargo: { ressource: quantité },
       gold,                      // or au retour, calculé au départ
       rare: null | { key, n },   // tiré au départ : rien à relancer en rechargeant
       item: null | objet d'équipement
     }

   Toute écriture de ressource passe par WarehouseManager. */

var CARAVAN_TRIPS = {
  court: { id: "court", name: "Court", seconds: 3600,      units: 150, valuePct: 0.80, rareChance: 0,    itemChance: 0,    minHall: 1 },
  moyen: { id: "moyen", name: "Moyen", seconds: 4 * 3600,  units: 400, valuePct: 1.00, rareChance: 0,    itemChance: 0,    minHall: 1 },
  long:  { id: "long",  name: "Long",  seconds: 8 * 3600,  units: 800, valuePct: 1.20, rareChance: 0.25, itemChance: 0.10, minHall: 3 }
};
var CARAVAN_TRIP_ORDER = ["court", "moyen", "long"];
var CARAVAN_CAPACITY_PER_LEVEL = 0.10;   // +10 % par niveau de Halle au-delà du premier
var CARAVAN_KEEP_SHARE = 0.5;            // la moitié basse du plafond ne part jamais
/* Matériau rare rapporté par le trajet Long : celui du monde où l'on se trouve au départ. */
var CARAVAN_RARE_BY_WORLD = { 0: "seve_aeswyn", 1: "verre_des_dunes" };
var CARAVAN_RARE_QTY = [2, 3];

var CaravanManager = {

  /* Horloge isolée : le harnais la remplace pour simuler un trajet sans attendre. */
  _now: function () { return Date.now(); },

  ensure: function () {
    if (!game.village || typeof game.village !== "object") game.village = {};
    var c = game.village.caravan;
    if (c && (typeof c !== "object" || !CARAVAN_TRIPS[c.trip] || typeof c.endsAt !== "number")) {
      game.village.caravan = null; // état corrompu : on l'oublie plutôt que de bloquer la Halle
    } else if (!c) {
      game.village.caravan = null;
    }
  },

  getHallLevel: function () {
    return (window.VillageBuildingManager && typeof VillageBuildingManager.getLevel === "function")
      ? VillageBuildingManager.getLevel("hall") : 0;
  },

  isAvailable: function () { return this.getHallLevel() > 0; },

  isTripOpen: function (tripId, level) {
    var t = CARAVAN_TRIPS[tripId];
    var lvl = (typeof level === "number") ? level : this.getHallLevel();
    return !!t && lvl >= t.minHall;
  },

  getCapacityMult: function (level) {
    var lvl = (typeof level === "number") ? level : this.getHallLevel();
    return 1 + CARAVAN_CAPACITY_PER_LEVEL * Math.max(0, lvl - 1);
  },

  getCapacity: function (tripId, level) {
    var t = CARAVAN_TRIPS[tripId];
    return t ? Math.floor(t.units * this.getCapacityMult(level) + 1e-9) : 0;
  },

  /* Ressources que la caravane peut emporter : les matières brutes plafonnées. */
  getEligibleKeys: function () {
    return Object.keys(WAREHOUSE_RESOURCES).filter(function (k) {
      var d = WAREHOUSE_RESOURCES[k];
      return (d.tier || "raw") === "raw" && Number(d.sellPrice || 0) > 0 && WarehouseManager.getCap(k) !== Infinity;
    });
  },

  /* Ce qui peut partir d'une ressource : au-dessus de la moitié du plafond ET de la réserve. */
  getSpare: function (key) {
    var cap = WarehouseManager.getCap(key);
    if (cap === Infinity) return 0;
    var reserve = (window.ResourceReserveManager && typeof ResourceReserveManager.getReserve === "function")
      ? Number(ResourceReserveManager.getReserve(key) || 0) : 0;
    var keep = Math.max(Math.ceil(cap * CARAVAN_KEEP_SHARE), reserve);
    return Math.max(0, Math.floor(WarehouseManager.getAmount(key) - keep));
  },

  /* Chargement C1 : d'abord les ressources au plafond, à parts égales, puis les autres
     par ordre de remplissage. Remplissage « en eau » : on répartit, ce qui n'a pas pu
     être pris par une ressource épuisée repart sur les suivantes. */
  computeLoad: function (tripId, level) {
    var self = this, left = this.getCapacity(tripId, level), load = {};
    var spare = {};
    this.getEligibleKeys().forEach(function (k) { var s = self.getSpare(k); if (s > 0) spare[k] = s; });

    function fill(keys) {
      var pool = keys.filter(function (k) { return spare[k] > 0; });
      while (left > 0 && pool.length) {
        var share = Math.max(1, Math.floor(left / pool.length));
        pool.forEach(function (k) {
          if (left <= 0) return;
          var q = Math.min(spare[k], share, left);
          load[k] = (load[k] || 0) + q;
          spare[k] -= q;
          left -= q;
        });
        pool = pool.filter(function (k) { return spare[k] > 0; });
      }
    }
    var keys = Object.keys(spare).sort(function (a, b) {
      return WarehouseManager.getAmount(b) / WarehouseManager.getCap(b) - WarehouseManager.getAmount(a) / WarehouseManager.getCap(a);
    });
    fill(keys.filter(function (k) { return WarehouseManager.getFreeSpace(k) <= 0; })); // au plafond
    fill(keys);
    return load;
  },

  getLoadUnits: function (load) {
    return Object.keys(load || {}).reduce(function (a, k) { return a + Number(load[k] || 0); }, 0);
  },

  getLoadGold: function (load, tripId) {
    var t = CARAVAN_TRIPS[tripId];
    if (!t) return 0;
    var v = 0;
    Object.keys(load || {}).forEach(function (k) {
      var d = WAREHOUSE_RESOURCES[k];
      v += Number(load[k] || 0) * (d ? Number(d.sellPrice || 0) : 0);
    });
    return Math.floor(v * t.valuePct);
  },

  getRareKey: function () {
    var w = (window.WorldManager) ? Number(WorldManager.worldIndex || 0) : 0;
    var key = CARAVAN_RARE_BY_WORLD[w];
    if (!key) { // monde sans matériau déclaré : le dernier connu en dessous
      for (var i = w; i >= 0 && !key; i--) key = CARAVAN_RARE_BY_WORLD[i];
    }
    return (key && WAREHOUSE_RESOURCES[key]) ? key : null;
  },

  get: function () { this.ensure(); return game.village.caravan; },
  isTraveling: function () { var c = this.get(); return !!c && this._now() < c.endsAt; },
  isBack: function () { var c = this.get(); return !!c && this._now() >= c.endsAt; },

  getSecondsLeft: function () {
    var c = this.get();
    return c ? Math.max(0, (c.endsAt - this._now()) / 1000) : 0;
  },

  getProgressPct: function () {
    var c = this.get();
    if (!c) return 0;
    var total = Math.max(1, c.endsAt - c.startedAt);
    return Math.max(0, Math.min(100, (this._now() - c.startedAt) / total * 100));
  },

  /* Raison d'un refus, ou "" si le départ est possible. */
  getBlockReason: function (tripId) {
    if (!this.isAvailable()) return _t("Construis la Halle marchande");
    if (this.get()) return _t("La caravane est déjà partie");
    var t = CARAVAN_TRIPS[tripId];
    if (!t) return _t("Trajet inconnu");
    if (!this.isTripOpen(tripId)) return _t("Halle niveau {n}", { n: t.minHall });
    if (this.getLoadUnits(this.computeLoad(tripId)) <= 0) return _t("Rien à charger");
    return "";
  },

  depart: function (tripId) {
    if (this.getBlockReason(tripId)) return false;
    var t = CARAVAN_TRIPS[tripId];
    var load = this.computeLoad(tripId);
    Object.keys(load).forEach(function (k) {
      if (!WarehouseManager.removeResource(k, load[k])) delete load[k];
    });
    if (this.getLoadUnits(load) <= 0) return false;

    var rare = null, item = null;
    if (t.rareChance > 0 && Math.random() < t.rareChance) {
      var rk = this.getRareKey();
      if (rk) rare = { key: rk, n: CARAVAN_RARE_QTY[0] + Math.floor(Math.random() * (CARAVAN_RARE_QTY[1] - CARAVAN_RARE_QTY[0] + 1)) };
    }
    if (t.itemChance > 0 && Math.random() < t.itemChance && window.LootSystem && typeof LootSystem.rollDrop === "function") {
      item = LootSystem.rollDrop() || null;
    }

    var now = this._now();
    game.village.caravan = {
      trip: tripId, startedAt: now, endsAt: now + t.seconds * 1000,
      cargo: load, gold: this.getLoadGold(load, tripId), rare: rare, item: item, notified: false
    };
    if (typeof addLog === "function") {
      addLog("🐪 " + _t("La caravane part : {n} unités, retour dans {d}", { n: formatNumber(this.getLoadUnits(load)), d: formatTime(t.seconds) }), "event");
    }
    if (typeof saveGame === "function") saveGame();
    return true;
  },

  /* Appelé chaque seconde (ProductionManager.updateDOM → refreshProductionSheetDOM) :
     annonce le retour une seule fois. Renvoie true au moment où elle arrive. */
  checkArrival: function () {
    var c = this.get();
    if (!c || c.notified || this._now() < c.endsAt) return false;
    c.notified = true;
    if (typeof showToast === "function") showToast("🐪 " + _t("La caravane est rentrée : décharge-la à la Halle marchande"), 2500);
    return true;
  },

  /* Décharger : or, matériau rare, objet. Renvoie le butin ou null. */
  unload: function () {
    if (!this.isBack()) return null;
    var c = game.village.caravan;
    var gold = Math.max(0, Math.floor(Number(c.gold || 0)));
    game.gold = Number(game.gold || 0) + gold;
    if (gold > 0 && window.QuestManager && typeof QuestManager.track === "function") QuestManager.track("goldEarned", gold);
    if (c.rare && WAREHOUSE_RESOURCES[c.rare.key]) WarehouseManager.addResource(c.rare.key, c.rare.n, true);
    if (c.item && typeof addLootToInventory === "function") addLootToInventory(c.item); // sac plein : l'objet est offert
    var loot = { trip: c.trip, gold: gold, rare: c.rare, item: c.item, units: this.getLoadUnits(c.cargo) };
    game.village.caravan = null;
    if (typeof addLog === "function") {
      addLog("🐪 " + _t("Caravane déchargée : +{n} or", { n: formatNumber(gold) })
        + (loot.rare ? " · " + _td(WAREHOUSE_RESOURCES[loot.rare.key].name) + " ×" + loot.rare.n : "")
        + (loot.item ? " · " + _td(loot.item.name) : ""), "event");
    }
    if (typeof saveGame === "function") saveGame();
    return loot;
  }
};

window.CaravanManager = CaravanManager;
window.CARAVAN_TRIPS = CARAVAN_TRIPS;
window.CARAVAN_TRIP_ORDER = CARAVAN_TRIP_ORDER;
