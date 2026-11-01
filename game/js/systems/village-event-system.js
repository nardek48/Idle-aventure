"use strict";
/* systems/village-event-system.js — v3.604.0 (événements du village, E1 ; données : data/village-events.js).
   Tirage à l'aube (WorldDays.nightfall), un événement à la fois pendant VILLAGE_EVENT_DAYS jours de jeu.
   État : game.explorationProgression.villageEvent = { id, sector, mapId, w, from, until, done, last } et
   .villageFete = { left } (déjà sauvegardé en entier, aucun changement de save-system.js). */

var VillageEvents = {
  all: function () { return typeof villageEventsData === "function" ? villageEventsData() : []; },
  get: function (id) { return this.all().filter(function (e) { return e.id === id; })[0] || null; },
  _ep: function () { return game.explorationProgression || (game.explorationProgression = {}); },
  state: function () { var v = this._ep().villageEvent; return v && typeof v === "object" ? v : null; },

  // L'événement en cours (encore dans ses jours de jeu), ou null.
  active: function () {
    var v = this.state(), day = window.WorldDays ? WorldDays.day() : 1;
    if (!v || !v.id || !this.get(v.id) || day >= v.until) return null;
    return v;
  },
  def: function () { var v = this.active(); return v ? this.get(v.id) : null; },
  daysLeft: function () { var v = this.active(); return v ? Math.max(1, v.until - (window.WorldDays ? WorldDays.day() : 1)) : 0; },
  isType: function (type) { var d = this.def(); return !!(d && d.type === type); },

  /* L'aube (appelé par WorldDays.nightfall) : l'événement fini s'efface, puis une chance d'en tirer un nouveau.
     Rend l'événement tiré, ou null. rng injectable (harnais). */
  onDawn: function (day, rng) {
    rng = rng || Math.random;
    var old = this.state(), wasMarket = !!(old && old.id && (this.get(old.id) || {}).type === "marche");
    if (old && old.id && day >= old.until) { this._ep().villageEvent = { last: old.id, lastType: (this.get(old.id) || {}).type || null }; if (wasMarket) this._repriceShop(); }
    if (this.active() || !(game.unlockedTabs && game.unlockedTabs.village)) return null;
    if (rng() >= VILLAGE_EVENT_CHANCE) return null;
    var prev = this.state() || {}, self = this;
    var pool = this.all().filter(function (e) { return e.type !== prev.lastType && self._possible(e); });
    if (!pool.length) return null;
    var e = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
    var v = { id: e.id, from: day, until: day + VILLAGE_EVENT_DAYS, w: this._world(), done: false, last: prev.last || null };
    if (e.type === "rumeur") { var sp = this._pickSector(rng); v.mapId = sp.mapId; v.sector = sp.sector; }
    this._ep().villageEvent = v;
    if (e.type === "marche") this._repriceShop();
    if (typeof addLog === "function") addLog("🏘️ " + _t("Ce matin à Aeswyn : {x}", { x: this.titleOf(e) }), "event");
    return v;
  },
  _world: function () { return Math.max(0, Math.min(VILLAGE_EVENT_SCALE.length - 1, Number((window.WorldManager && WorldManager.worldIndex) || 0))); },
  _possible: function (e) {
    if (e.type === "rumeur") return !!this._pickSector(function () { return 0; }).sector;
    if (e.type === "marche") return !!(window.EquipShopManager && window.VillageBuildingManager && VillageBuildingManager.getLevel("hall") > 0); // l'échoppe est à la Halle
    return true;
  },
  // La rumeur : un secteur d'expédition atteignable de la carte du monde où vit le héros.
  _pickSector: function (rng) {
    var LM = window.LivingMapManager, w = window.WORLDS ? WORLDS[this._world()] : null, map = LM && w ? LM.getMapForWorld(w.id) : null;
    if (!map) return { mapId: null, sector: null };
    var pool = map.sectors.filter(function (d) {
      var c = LM.getContentFor(map.id, d.id);
      return c && c.type === "expedition" && LM.isReachable(map.id, d.id) && !(d.requiresStoryStep && !LM.isStoryStepReached(d.requiresStoryStep));
    });
    if (!pool.length) return { mapId: map.id, sector: null };
    return { mapId: map.id, sector: pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))].id };
  },

  /* ---------- Textes ---------- */
  sectorName: function (v) {
    var LM = window.LivingMapManager, d = v && v.sector && LM ? LM.getSectorDef(v.mapId, v.sector) : null;
    return d ? _td(d.name) : "";
  },
  titleOf: function (e, v) { v = v || this.state(); return I18n.fill(_td(e.title), { lieu: this.sectorName(v) }); },
  textOf: function (e, v) { v = v || this.state(); return I18n.fill(_td(e.text), { lieu: this.sectorName(v) }); },

  /* ---------- Demande ---------- */
  needs: function () {
    var v = this.active(), e = this.def();
    if (!e || e.type !== "demande") return null;
    var k = VILLAGE_EVENT_SCALE[v.w] || 1, out = {};
    Object.keys(e.res).forEach(function (r) { out[r] = Math.round(e.res[r] * k / 10) * 10; });
    return out;
  },
  // Récompense : 1,5 fois ce que paierait un contrat de Taverne pour la même livraison, et le cadeau de l'ancien.
  rewardGold: function () {
    var n = this.needs();
    if (!n) return 0;
    return Object.keys(n).reduce(function (s, r) {
      var def = (window.WAREHOUSE_RESOURCES || {})[r];
      return s + Math.floor(Number((def && def.sellPrice) || 0) * n[r] * TAVERN_REWARD_MULT * VILLAGE_EVENT_DEMAND_MULT);
    }, 0);
  },
  rewardGifts: function () {
    var v = this.active(), e = this.def();
    if (!e || !e.gain) return {};
    var k = VILLAGE_EVENT_SCALE[v.w] || 1, out = {};
    Object.keys(e.gain).forEach(function (r) { out[r] = Math.max(1, Math.round(e.gain[r] * k)); });
    return out;
  },
  canDeliver: function () {
    var v = this.active(), n = this.needs();
    if (!n || v.done || !window.WarehouseManager) return false;
    return Object.keys(n).every(function (r) { return WarehouseManager.getAmount(r) >= n[r]; });
  },
  deliver: function () {
    if (!this.canDeliver()) return false;
    var n = this.needs(), gold = this.rewardGold(), gifts = this.rewardGifts(), v = this.active();
    Object.keys(n).forEach(function (r) { WarehouseManager.removeResource(r, n[r]); });
    game.gold = Number(game.gold || 0) + gold;
    Object.keys(gifts).forEach(function (r) { WarehouseManager.addResource(r, gifts[r], true); });
    v.done = true;
    if (typeof addLog === "function") addLog("🏘️ " + _t("Livré : +{n} or.", { n: formatNumber(gold) }), "event");
    if (typeof saveGame === "function") saveGame();
    return true;
  },

  /* ---------- Fête ---------- */
  feteCost: function () { var v = this.active(); return v ? Math.round(6 * (VILLAGE_EVENT_SCALE[v.w] || 1)) : 0; },
  canFete: function () {
    var v = this.active();
    return !!(v && !v.done && this.isType("fete") && window.WarehouseManager && WarehouseManager.getAmount("pain") >= this.feteCost());
  },
  startFete: function () {
    if (!this.canFete()) return false;
    var v = this.active();
    WarehouseManager.removeResource("pain", this.feteCost());
    game.heroHp = game.heroMaxHp; // le camp soigne tout le monde
    if (window.CompanionManager) CompanionManager.unlockedIds().forEach(function (id) { CompanionManager.state(id).hp = CompanionManager.maxHpOf(id); });
    this._ep().villageFete = { left: VILLAGE_EVENT_FETE.sorties };
    v.done = true;
    if (typeof addLog === "function") addLog("🎉 " + _t("La fête : tout le monde est soigné, et les {n} prochaines sorties rapportent plus d'or.", { n: VILLAGE_EVENT_FETE.sorties }), "event");
    if (typeof saveGame === "function") saveGame();
    return true;
  },
  feteLeft: function () { var f = this._ep().villageFete; return f && f.left > 0 ? f.left : 0; },
  // SortieManager.end : l'or gardé de la sortie, après la fête (hors farm libre).
  feteGoldMult: function (context) {
    if (context === "farm" || !this.feteLeft()) return 1;
    this._ep().villageFete.left -= 1;
    return VILLAGE_EVENT_FETE.goldMult;
  },

  /* ---------- Rumeur : la Petite Aventure du lieu (pa2-run.js) ---------- */
  rumorAt: function (mapId, sectorId) {
    var v = this.active();
    return !!(v && this.isType("rumeur") && v.mapId === mapId && v.sector === sectorId);
  },

  /* ---------- Marché : l'échoppe (equip-shop-system.js) ---------- */
  marketOn: function () { return this.isType("marche"); },
  /* v3.606.0 (D2) : pendant le marché, Sarkel rachète les ressources rares, par lots, dans la limite du marché. */
  buybackLotsLeft: function () { var v = this.active(); return this.marketOn() ? Math.max(0, VILLAGE_EVENT_BUYBACK.maxLots - Number(v.sold || 0)) : 0; },
  buybackList: function () {
    if (!this.marketOn() || !window.WarehouseManager) return [];
    var B = VILLAGE_EVENT_BUYBACK;
    return Object.keys(B.prices).filter(function (r) { return WarehouseManager.getAmount(r) >= B.lot; })
      .map(function (r) { return { res: r, price: B.prices[r], gold: B.prices[r] * B.lot }; });
  },
  sellLot: function (res) {
    var B = VILLAGE_EVENT_BUYBACK, v = this.active();
    if (!this.marketOn() || !B.prices[res] || this.buybackLotsLeft() <= 0 || !window.WarehouseManager || WarehouseManager.getAmount(res) < B.lot) return false;
    WarehouseManager.removeResource(res, B.lot);
    game.gold = Number(game.gold || 0) + B.prices[res] * B.lot;
    v.sold = Number(v.sold || 0) + 1;
    if (typeof saveGame === "function") saveGame();
    return true;
  },
  _repriceShop: function () {
    if (!window.EquipShopManager || !Array.isArray(game.equipShopStock)) return;
    game.equipShopStock.forEach(function (it) { if (it && it.slot && !it.bought) it.price = EquipShopManager.getPrice(it); });
  },

  // Pastille de l'onglet Village : une demande livrable ou une fête à lancer.
  hasAction: function () { return this.canDeliver() || this.canFete(); }
};

window.VillageEvents = VillageEvents;
