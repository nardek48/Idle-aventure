"use strict";
/* systems/caravan-system.js — v3.419.0 (lot E-2, R3 décision Seb du 01/10/2026) : CaravanManager.

   La caravane de la Halle marchande emporte le SURPLUS de matières brutes et le
   vend au loin. Deuxième débouché de la Production, à côté des contrats de la
   Taverne. Atelier validé : version C1 « Surplus auto » (atelier-caravane.html).

   RÈGLES (décisions Seb) :
     - trois trajets : Court 1 h · 150 unités · 60 % de la valeur
                       Moyen 4 h · 400 unités · 80 %
                       Long  8 h · 800 unités · 100 %, 25 % de chance d'un
                             matériau rare du monde, 10 % d'un objet d'équipement ;
     - Court et Moyen dès la Halle niveau 1, Long au niveau 3 ;
     - +10 % de capacité par niveau de Halle au-delà du premier (×1,9 au niveau 10) ;
     - v3.421.0 (vérification de campagne, décision Seb « B ») : valeurs baissées
       (80/100/120 → 60/80/100 %), et ni Bois ni Fer (v3.480.0 : de nouveau acceptés, refonte de
       l'économie RE-3 : en fin de monde, ils n'avaient plus aucun débouché que la Taverne) ;
     - chargement automatique (C1) : seules les matières brutes partent, et seulement
       ce qui dépasse la MOITIÉ du plafond et la réserve protégée de l'Entrepôt.
       Les ressources au plafond passent d'abord, à parts égales ;
     - elle continue hors ligne (horodatage) ;
     - v3.457.0 (décision Seb « A ») : 1 caravane + 1 tous les 3 niveaux de Halle,
       une seule par marché. Chacune emporte le surplus qui reste à son départ.

   ÉTAT EN SAUVEGARDE (dans game.village, persisté tel quel par save-system) :
     game.village.caravans = [ {   // v3.457.0 ; l'ancien game.village.caravan est repris par ensure()
       world,                     // index du monde du marché : une caravane par marché
       trip, startedAt, endsAt,   // horodatages en ms
       cargo: { ressource: quantité },
       gold,                      // or au retour, calculé au départ
       rare: null | { key, n },   // tiré au départ : rien à relancer en rechargeant
       item: null | objet d'équipement
     } ]

   Toute écriture de ressource passe par WarehouseManager. */

var CARAVAN_TRIPS = {
  court: { id: "court", name: "Court", seconds: 3600,      units: 150, valuePct: 0.60, rareChance: 0,    itemChance: 0,    minHall: 1 },
  moyen: { id: "moyen", name: "Moyen", seconds: 4 * 3600,  units: 400, valuePct: 0.80, rareChance: 0,    itemChance: 0,    minHall: 1 },
  long:  { id: "long",  name: "Long",  seconds: 8 * 3600,  units: 800, valuePct: 1.00, rareChance: 0.25, itemChance: 0.10, minHall: 3 }
};
var CARAVAN_TRIP_ORDER = ["court", "moyen", "long"];
/* v3.421.0 : matières brutes que la caravane n'emporte jamais (planches, lingots, blocs en dépendent). */
var CARAVAN_EXCLUDED = []; // v3.480.0 (refonte de l'économie RE-3) : le Bois et le Fer partent aussi ; la moitié du plafond reste au village
var CARAVAN_CAPACITY_PER_LEVEL = 0.10;   // +10 % par niveau de Halle au-delà du premier
var CARAVAN_KEEP_SHARE = 0.5;            // la moitié basse du plafond ne part jamais
/* Matériau rare rapporté par le trajet Long : celui du monde où l'on se trouve au départ. */
var CARAVAN_RARE_BY_WORLD = { 0: "seve_aeswyn", 1: "verre_des_dunes", 2: "pierre_errante", 3: "cire_sepulcre" }; // v3.452.0 : la Crypte
/* v3.428.0 (Ruines, étape ruines_04) : marchés SANS carte vivante. Les Ruines n'ont pas encore
   de carte (lot U-5) : leur marché s'ouvre par l'Histoire. mapId sert d'identifiant de marché. */
var CARAVAN_WORLD_MARKETS = { ruins: { requiresStoryStep: "ruines_04" }, crypt: { requiresStoryStep: "crypte_04" } }; // v3.452.0 : Marché de la Crypte (crypte_04)
var CARAVAN_RARE_QTY = [2, 3];
var CARAVAN_HALL_PER_EXTRA = 3;          // v3.457.0 : une caravane de plus tous les 3 niveaux de Halle

var CaravanManager = {

  /* Horloge isolée : le harnais la remplace pour simuler un trajet sans attendre. */
  _now: function () { return Date.now(); },

  ensure: function () {
    if (!game.village || typeof game.village !== "object") game.village = {};
    var v = game.village;
    if (!Array.isArray(v.caravans)) v.caravans = [];
    // v3.457.0 : sauvegarde à une seule caravane -> la liste ; sans monde noté, celui où l'on est
    if (v.caravan && typeof v.caravan === "object") {
      if (typeof v.caravan.world !== "number") v.caravan.world = window.WorldManager ? Number(WorldManager.worldIndex || 0) : 0;
      v.caravans.push(v.caravan);
    }
    if ("caravan" in v) delete v.caravan;
    var seen = {};
    // état corrompu ou second départ vers un même marché : on l'oublie plutôt que de bloquer la Halle
    v.caravans = v.caravans.filter(function (c) {
      var ok = c && typeof c === "object" && CARAVAN_TRIPS[c.trip] && typeof c.endsAt === "number" && typeof c.world === "number" && !seen[c.world];
      if (ok) seen[c.world] = true;
      return !!ok;
    });
  },

  getHallLevel: function () {
    return (window.VillageBuildingManager && typeof VillageBuildingManager.getLevel === "function")
      ? VillageBuildingManager.getLevel("hall") : 0;
  },

  isAvailable: function () { return this.getHallLevel() > 0; },

  /* v3.457.0 : caravanes en même temps — 1, puis 2 à la Halle 3, 3 à la Halle 6… */
  getMaxCaravans: function (level) {
    var lvl = (typeof level === "number") ? level : this.getHallLevel();
    return lvl > 0 ? 1 + Math.floor(lvl / CARAVAN_HALL_PER_EXTRA) : 0;
  },
  /* Niveau de Halle qui ajoute la prochaine caravane (null au-delà du niveau max). */
  getNextCaravanLevel: function () {
    var lvl = this.getHallLevel(), next = (Math.floor(lvl / CARAVAN_HALL_PER_EXTRA) + 1) * CARAVAN_HALL_PER_EXTRA;
    var max = (window.VILLAGE_BUILDINGS && VILLAGE_BUILDINGS.hall) ? VILLAGE_BUILDINGS.hall.maxLevel : 10;
    return next <= max ? next : null;
  },
  hasFreeSlot: function () { return this.list().length < this.getMaxCaravans(); },

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

  /* Ressources que la caravane peut emporter : les matières brutes plafonnées (hors CARAVAN_EXCLUDED). */
  getEligibleKeys: function () {
    return Object.keys(WAREHOUSE_RESOURCES).filter(function (k) {
      var d = WAREHOUSE_RESOURCES[k];
      return (d.tier || "raw") === "raw" && CARAVAN_EXCLUDED.indexOf(k) === -1 && Number(d.sellPrice || 0) > 0 && WarehouseManager.getCap(k) !== Infinity;
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

  /* v3.426.0 : worldIndex = le monde du MARCHÉ choisi (par défaut, celui où l'on se trouve). */
  getRareKey: function (worldIndex) {
    var w = (typeof worldIndex === "number") ? worldIndex : ((window.WorldManager) ? Number(WorldManager.worldIndex || 0) : 0);
    var key = CARAVAN_RARE_BY_WORLD[w];
    if (!key) { // monde sans matériau déclaré : le dernier connu en dessous
      for (var i = w; i >= 0 && !key; i--) key = CARAVAN_RARE_BY_WORLD[i];
    }
    return (key && WAREHOUSE_RESOURCES[key]) ? key : null;
  },

  /* v3.457.0 : toutes les caravanes, la première rentrée d'abord (tri par heure de retour). */
  list: function () {
    this.ensure();
    return game.village.caravans.slice().sort(function (a, b) { return a.endsAt - b.endsAt; });
  },
  /* La caravane d'un marché (index du monde) ; sans argument, celle qui rentre la première. */
  get: function (world) {
    var l = this.list();
    if (typeof world === "number") return l.filter(function (c) { return c.world === world; })[0] || null;
    return l[0] || null;
  },

  /* v3.426.0 (chantier Expéditions, décision Seb) : les marchés où partir, sans changer de monde.
     Un par carte vivante qui a un marché, atteinte (un secteur libéré) ou du monde courant.
     -> [{ mapId, world (index dans WORLDS), name }] */
  getMarkets: function () {
    if (!window.LIVING_MAPS || !window.WORLDS) return [];
    var cur = window.WorldManager ? Number(WorldManager.worldIndex || 0) : 0, out = [];
    Object.keys(LIVING_MAPS).forEach(function (m) {
      var map = LIVING_MAPS[m];
      if (!map.caravanMarket) return;
      var wi = -1;
      WORLDS.forEach(function (w, i) { if (w.id === map.worldId) wi = i; });
      if (wi < 0) return;
      var reached = wi === cur || (window.LivingMapManager && map.sectors.some(function (s) { return LivingMapManager.isLiberated(m, s.id); }));
      if (reached) out.push({ mapId: m, world: wi, name: WORLDS[wi].name });
    });
    // v3.428.0 : marchés ouverts par l'Histoire, sans carte vivante (le Marché des Ruines)
    Object.keys(CARAVAN_WORLD_MARKETS).forEach(function (worldId) {
      if (out.some(function (o) { return o.mapId === worldId; })) return;
      var wi = -1;
      WORLDS.forEach(function (w, i) { if (w.id === worldId) wi = i; });
      var req = CARAVAN_WORLD_MARKETS[worldId].requiresStoryStep;
      var open = wi >= 0 && !!(game.worldsEverReached && game.worldsEverReached[wi])
        && (!req || (window.StoryQuestManager && StoryQuestManager.isStepReached(req)));
      if (open) out.push({ mapId: worldId, world: wi, name: WORLDS[wi].name });
    });
    return out;
  },

  /* v3.420.0 (E-3) : la carte vivante où roule la caravane (celle du monde de départ). */
  getMapId: function (c) {
    c = c || this.get();
    if (!c || !window.WORLDS || !window.LIVING_MAPS) return null;
    var w = WORLDS[c.world];
    if (!w) return null;
    var id = null;
    Object.keys(LIVING_MAPS).forEach(function (k) { if (LIVING_MAPS[k].worldId === w.id && LIVING_MAPS[k].caravanMarket) id = k; });
    return id;
  },
  /* v3.457.0 : la caravane qui roule sur cette carte (une par marché, donc une au plus). */
  getForMap: function (mapId) {
    var self = this;
    return this.list().filter(function (c) { return self.getMapId(c) === mapId; })[0] || null;
  },

  /* Position sur la carte, en % : aller vers le marché la première moitié du trajet, retour
     la seconde ; au village une fois rentrée. */
  getMapPosition: function (mapId) {
    var map = window.LIVING_MAPS && LIVING_MAPS[mapId], c = this.getForMap(mapId);
    if (!map || !map.caravanMarket || !c) return null;
    var v = map.village, m = map.caravanMarket, p = this.getProgressPct(c.world) / 100;
    var t = p < 0.5 ? p * 2 : (1 - p) * 2;
    return { x: v.x + (m.x - v.x) * t, y: v.y + (m.y - v.y) * t, back: this.isBack(c.world), outbound: p < 0.5, world: c.world };
  },
  /* Sans monde : « au moins une » caravane en route / rentrée. */
  isTraveling: function (world) {
    var now = this._now();
    return this.list().some(function (c) { return (typeof world !== "number" || c.world === world) && now < c.endsAt; });
  },
  isBack: function (world) {
    var now = this._now();
    return this.list().some(function (c) { return (typeof world !== "number" || c.world === world) && now >= c.endsAt; });
  },

  getSecondsLeft: function (world) {
    var c = this.get(world);
    return c ? Math.max(0, (c.endsAt - this._now()) / 1000) : 0;
  },

  getProgressPct: function (world) {
    var c = this.get(world);
    if (!c) return 0;
    var total = Math.max(1, c.endsAt - c.startedAt);
    return Math.max(0, Math.min(100, (this._now() - c.startedAt) / total * 100));
  },

  /* Raison d'un refus, ou "" si le départ est possible. */
  getBlockReason: function (tripId, world) {
    if (!this.isAvailable()) return _t("Construis la Halle marchande");
    var max = this.getMaxCaravans();
    if (this.list().length >= max) return max > 1 ? _t("Toutes les caravanes sont parties") : _t("La caravane est déjà partie");
    if (typeof world === "number" && this.get(world)) return _t("Une caravane est déjà sur ce marché");
    var t = CARAVAN_TRIPS[tripId];
    if (!t) return _t("Trajet inconnu");
    if (!this.isTripOpen(tripId)) return _t("Halle niveau {n}", { n: t.minHall });
    if (this.getLoadUnits(this.computeLoad(tripId)) <= 0) return _t("Rien à charger");
    return "";
  },

  /* worldIndex (v3.426.0) : le monde du marché choisi ; par défaut, le monde courant. */
  depart: function (tripId, worldIndex) {
    var world = (typeof worldIndex === "number" && window.WORLDS && WORLDS[worldIndex]) ? worldIndex : (window.WorldManager ? Number(WorldManager.worldIndex || 0) : 0);
    if (this.getBlockReason(tripId, world)) return false;
    var t = CARAVAN_TRIPS[tripId];
    var load = this.computeLoad(tripId);
    Object.keys(load).forEach(function (k) {
      if (!WarehouseManager.removeResource(k, load[k])) delete load[k];
    });
    if (this.getLoadUnits(load) <= 0) return false;

    var rare = null, item = null;
    if (t.rareChance > 0 && Math.random() < t.rareChance) {
      var rk = this.getRareKey(world);
      if (rk) rare = { key: rk, n: CARAVAN_RARE_QTY[0] + Math.floor(Math.random() * (CARAVAN_RARE_QTY[1] - CARAVAN_RARE_QTY[0] + 1)) };
    }
    if (t.itemChance > 0 && Math.random() < t.itemChance && window.LootSystem && typeof LootSystem.rollWorldDrop === "function") {
      item = LootSystem.rollWorldDrop() || null;
    }

    var now = this._now();
    game.village.caravans.push({
      trip: tripId, startedAt: now, endsAt: now + t.seconds * 1000,
      world: world, // v3.420.0 : la carte où elle roule ; v3.426.0 : celle du marché choisi
      cargo: load, gold: this.getLoadGold(load, tripId), rare: rare, item: item, notified: false
    });
    if (typeof addLog === "function") {
      addLog("🐪 " + _t("La caravane part : {n} unités, retour dans {d}", { n: formatNumber(this.getLoadUnits(load)), d: formatTime(t.seconds) }), "event");
    }
    if (typeof saveGame === "function") saveGame();
    return true;
  },

  /* Appelé chaque seconde (ProductionManager.updateDOM → refreshProductionSheetDOM) :
     annonce le retour une seule fois. Renvoie true au moment où elle arrive. */
  checkArrival: function () {
    var now = this._now(), arrived = false;
    this.list().forEach(function (c) {
      if (c.notified || now < c.endsAt) return;
      c.notified = true; arrived = true;
    });
    if (arrived && typeof showToast === "function") showToast("🐪 " + _t("La caravane est rentrée : décharge-la dans Campement › Expéditions"), 2500);
    return arrived;
  },

  /* Décharger la caravane d'un marché ; sans monde, toutes celles qui sont rentrées
     (butin cumulé : or et unités additionnés, le premier matériau rare et le premier objet). */
  unload: function (world) {
    var self = this, now = this._now();
    var back = this.list().filter(function (c) { return (typeof world !== "number" || c.world === world) && now >= c.endsAt; });
    if (!back.length) return null;
    var loots = back.map(function (c) { return self._unloadOne(c); });
    if (typeof saveGame === "function") saveGame();
    if (loots.length === 1) return loots[0];
    return loots.reduce(function (a, l) {
      a.gold += l.gold; a.units += l.units;
      if (!a.rare && l.rare) a.rare = l.rare;
      if (!a.item && l.item) a.item = l.item;
      return a;
    }, { trip: loots[0].trip, gold: 0, units: 0, rare: null, item: null, count: loots.length });
  },

  _unloadOne: function (c) {
    var gold = Math.max(0, Math.floor(Number(c.gold || 0)));
    game.gold = Number(game.gold || 0) + gold;
    if (c.rare && WAREHOUSE_RESOURCES[c.rare.key]) WarehouseManager.addResource(c.rare.key, c.rare.n, true);
    if (c.item && typeof addLootToInventory === "function") addLootToInventory(c.item); // sac plein : l'objet est offert
    var loot = { trip: c.trip, world: c.world, gold: gold, rare: c.rare, item: c.item, units: this.getLoadUnits(c.cargo) };
    // v3.428.0 (ruines_04) : une caravane revenue du Marché des Ruines
    if (Number(c.world) === 2) {
      if (!game.explorationProgression || typeof game.explorationProgression !== "object") game.explorationProgression = {};
      game.explorationProgression.ruinsMarketDone = true;
    }
    // v3.452.0 (crypte_04) : une caravane revenue du Marché de la Crypte
    if (Number(c.world) === 3) {
      if (!game.explorationProgression || typeof game.explorationProgression !== "object") game.explorationProgression = {};
      game.explorationProgression.cryptMarketDone = true;
    }
    game.village.caravans = game.village.caravans.filter(function (x) { return x !== c; });
    if (typeof addLog === "function") {
      addLog("🐪 " + _t("Caravane déchargée : +{n} or", { n: formatNumber(gold) })
        + (loot.rare ? " · " + _td(WAREHOUSE_RESOURCES[loot.rare.key].name) + " ×" + loot.rare.n : "")
        + (loot.item ? " · " + _td(loot.item.name) : ""), "event");
    }
    return loot;
  }
};

window.CaravanManager = CaravanManager;
window.CARAVAN_TRIPS = CARAVAN_TRIPS;
window.CARAVAN_WORLD_MARKETS = CARAVAN_WORLD_MARKETS;
window.CARAVAN_TRIP_ORDER = CARAVAN_TRIP_ORDER;
