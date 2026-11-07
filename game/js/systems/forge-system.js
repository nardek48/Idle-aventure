"use strict";
/* systems/forge-system.js — v3.221.0 (lot V-8) : ForgeManager. Forge des mondes (Seb 07/11) : une reforge renforce le héros
   (+0,5 % de la stat du monde de sa bande ⌈L/4⌉), plus la pièce. État : game.forge.levels, le niveau reste à l'emplacement. */

/* Ancienne règle (avant la Forge des mondes) : 30 niveaux = un cran de rareté, pas plancher ×1,35.
   Gardée pour chiffrer ce que la pièce perd dans la fenêtre « La Forge a changé ». */
var FORGE_MIN_STEP = 1.35;
var FORGE_LEVELS_PER_RARITY_STEP = 30;

/* Niveaux de reforge ouverts par niveau de bâtiment (v3.289.0, D12). */
var FORGE_LEVELS_PER_BUILDING_LEVEL = 2;

// Forge des mondes : +0,5 % par reforge, 4 reforges par emplacement et par monde (bande ⌈L/4⌉)
var FORGE_WORLD_BONUS_PER_REFORGE = 0.005;
var FORGE_REFORGES_PER_WORLD = 4;
/* Une bande par monde (Désert = bande 1) : la stat du héros qu'elle renforce (StatsSystem.recalcStats),
   relative partout ; les dégâts multiplient l'ATK finale (arme comprise). */
var FORGE_WORLD_BONUSES = [
  { stat: "hpPct", world: _t("Désert"), label: _t("PV max"), short: _t("PV"), icon: "images/Icons/combat_stats/stat_health.webp" },
  { stat: "defPct", world: _t("Ruines"), label: _t("Défense"), short: _t("Défense"), icon: "images/Icons/combat_stats/stat_defense.webp" },
  { stat: "critPct", world: _t("Crypte"), label: _t("chance de critique"), short: _t("Critique"), icon: "images/Icons/combat_stats/stat_critical.webp" },
  { stat: "dmgPct", world: _t("Montagne"), label: _t("dégâts"), short: _t("Dégâts"), icon: "images/Icons/combat_stats/stat_attack.webp" },
  { stat: "critMultPct", world: _t("Tour"), label: _t("dégâts critiques"), short: _t("Dégâts crit."), icon: "images/Icons/combat_stats/stat_crit_damage.webp" }
];
// Matériau de chaque bande (le Désert a sa propre règle : Résine et Chitine)
var FORGE_BAND_MATERIALS = [null, "cle_de_voute", "cire_consacree", "obsidienne_taillee", "verre_faille"];
var FORGE_BAND_PREV_MATERIALS = [null, "verre_trempe", "cle_de_voute", "cire_consacree", "obsidienne_taillee"];

var FORGE_RARITY_ORDER = ["common", "green", "rare", "epic", "legendary"];

var ForgeManager = {

  ensure: function () {
    if (!game.forge || typeof game.forge !== "object") game.forge = {};
    if (!game.forge.levels || typeof game.forge.levels !== "object") game.forge.levels = {};
    EQUIPMENT_SLOTS.forEach(function (slot) {
      var lvl = game.forge.levels[slot];
      if (typeof lvl !== "number" || lvl < 0) game.forge.levels[slot] = 0;
    });
  },

  getBuildingLevel: function () {
    return (window.VillageBuildingManager && typeof VillageBuildingManager.getLevel === "function")
      ? VillageBuildingManager.getLevel("forge")
      : 0;
  },

  /* Plafond de niveau d'emplacement, donné par le bâtiment. */
  getMaxLevel: function () {
    return this.getBuildingLevel() * FORGE_LEVELS_PER_BUILDING_LEVEL;
  },

  getLevel: function (slot) {
    this.ensure();
    return Number(game.forge.levels[slot] || 0);
  },

  /* --- Forge des mondes : bandes et bonus du héros ------------------------ */
  /* Bande (1 = Désert … 5 = Tour) de la reforge n ; 0 si n ≤ 0. */
  getBand: function (n) {
    n = Number(n) || 0;
    if (n <= 0) return 0;
    return Math.min(FORGE_WORLD_BONUSES.length, Math.ceil(n / FORGE_REFORGES_PER_WORLD));
  },

  getBandDef: function (band) {
    return FORGE_WORLD_BONUSES[band - 1] || null;
  },

  /* Reforges faites dans la bande `band`, tous emplacements confondus (0 à 28). */
  getBandCount: function (band) {
    var self = this, per = FORGE_REFORGES_PER_WORLD, lo = per * (band - 1);
    return EQUIPMENT_SLOTS.reduce(function (acc, slot) {
      return acc + Math.max(0, Math.min(per, self.getLevel(slot) - lo));
    }, 0);
  },

  getBandMaxCount: function () {
    return FORGE_REFORGES_PER_WORLD * EQUIPMENT_SLOTS.length;
  },

  /* Bonus d'une bande, en fraction (0,14 au complet). */
  getWorldBonus: function (band) {
    return this.getBandCount(band) * FORGE_WORLD_BONUS_PER_REFORGE;
  },

  /* Les bonus du héros, lus une fois par StatsSystem.recalcStats (fractions, 0 si rien). */
  getHeroBonuses: function () {
    var out = {}, self = this;
    FORGE_WORLD_BONUSES.forEach(function (def, i) { out[def.stat] = self.getWorldBonus(i + 1); });
    return out;
  },

  /* « 3 % » ou « 0,5 % », à la française. */
  formatPct: function (frac) {
    return fmtPct(fmtDec(Math.round(Number(frac || 0) * 1000) / 10));
  },

  /* Ce que donne la prochaine reforge d'un emplacement : « +0,5 % de PV max ». null au plafond absolu. */
  getNextGainLabel: function (slot) {
    var def = this.getBandDef(this.getBand(this.getLevel(slot) + 1));
    if (!def) return null;
    return _t("+{p} de {s}", { p: this.formatPct(FORGE_WORLD_BONUS_PER_REFORGE), s: def.label });
  },

  /* Gain court, pour un bouton : « +0,5 % PV ». */
  getNextGainShort: function (slot) {
    var def = this.getBandDef(this.getBand(this.getLevel(slot) + 1));
    return def ? _t("+{p} {s}", { p: this.formatPct(FORGE_WORLD_BONUS_PER_REFORGE), s: def.short }) : null;
  },

  /* Résumé des bonus gagnés : « +14 % de PV max · +3 % de Défense » (vide si aucun). */
  getBonusSummary: function () {
    var self = this, parts = [];
    FORGE_WORLD_BONUSES.forEach(function (def, i) {
      var b = self.getWorldBonus(i + 1);
      if (b > 0) parts.push(_t("+{p} de {s}", { p: self.formatPct(b), s: def.label }));
    });
    return parts.join(" · ");
  },

  /* --- Ancienne règle, pour la fenêtre de migration seulement -------------- */
  getRarityStep: function (slot, rarity) {
    var config = EQUIPMENT_SLOT_CONFIG[slot];
    if (!config || !config.ranges) return FORGE_MIN_STEP;
    var idx = FORGE_RARITY_ORDER.indexOf(rarity);
    if (idx === -1) idx = 0;
    var step;
    if (idx < FORGE_RARITY_ORDER.length - 1) {
      var here = config.ranges[FORGE_RARITY_ORDER[idx]];
      var next = config.ranges[FORGE_RARITY_ORDER[idx + 1]];
      step = (here && next && here[1] > 0) ? next[1] / here[1] : FORGE_MIN_STEP;
    } else {
      var avant = config.ranges[FORGE_RARITY_ORDER[idx - 1]];
      var last = config.ranges[FORGE_RARITY_ORDER[idx]];
      step = (avant && last && avant[1] > 0) ? last[1] / avant[1] : FORGE_MIN_STEP;
    }
    return Math.max(FORGE_MIN_STEP, step);
  },

  /* Valeur qu'avait la pièce avec l'ancienne Forge (niveau de son emplacement). */
  getLegacyForgedValue: function (item) {
    if (!item || !item.slot) return 0;
    var base = Number(item.value || 0), level = this.getLevel(item.slot);
    if (level <= 0) return base;
    var mult = 1 + (this.getRarityStep(item.slot, item.rarity) - 1) * (level / FORGE_LEVELS_PER_RARITY_STEP);
    var config = EQUIPMENT_SLOT_CONFIG[item.slot];
    var factor = Math.pow(10, (config && config.decimals) || 0);
    return Math.round(base * mult * factor) / factor;
  },

  /* La reforge ne touche plus la pièce : neutres, gardés pour leurs lecteurs. */
  getMultiplier: function () { return 1; },
  getForgedValue: function (item) {
    return item ? Number(item.value || 0) : 0;
  },

  /* Coût : or 400 × 1,35^niveau et Acier comme avant ; matériau du monde de la bande 1/1/2/2, 1 du monde d'avant
     aux crans 3-4 (Désert : Résine aux reforges 3-4, Chitine à la 4). */
  getCost: function (slot) {
    var level = this.getLevel(slot);
    var target = level + 1;
    if (target > this.getMaxLevel()) return null;

    var cost = {
      // v3.322.0 : Main du forgeron (Mémoire niveau 8) — reforges −25 % d'or
      gold: Math.floor(400 * Math.pow(1.35, level) * ((window.MemoryManager && MemoryManager.has("main_forgeron")) ? 0.75 : 1)),
      acier: Math.max(2, Math.floor(2 + level * 1.5))
    };
    var per = FORGE_REFORGES_PER_WORLD, band = this.getBand(target), cran = target - per * (band - 1);
    if (band === 1) {
      if (cran >= 3) cost.resine_durcie = cran - 2;
      if (cran === 4) cost.chitine_profondeurs = 1;
    } else {
      var mat = FORGE_BAND_MATERIALS[band - 1], prev = FORGE_BAND_PREV_MATERIALS[band - 1];
      if (mat) cost[mat] = cran <= 2 ? 1 : 2;
      if (prev && cran >= 3) cost[prev] = (cost[prev] || 0) + 1;
    }
    // v3.433.0 (choix « plan » = tomber) : la clé du Cœur, une Clé de voûte de moins
    if (cost.cle_de_voute && window.StoryQuestManager && StoryQuestManager.getChoice("plan") === "tomber") {
      cost.cle_de_voute -= (typeof VILLAGE_COEUR_KEY_DISCOUNT === "number" ? VILLAGE_COEUR_KEY_DISCOUNT : 1);
      if (cost.cle_de_voute <= 0) delete cost.cle_de_voute;
    }
    if (cost.cle_de_voute > 1 && window.MemoryManager && MemoryManager.has("cle_econome")) cost.cle_de_voute -= 1; // v3.453.0 : Clé économe (Mémoire 12), jamais moins d'une
    // v3.330.0 (E2) : reforges de l'arme exigées par l'Histoire -> or et matériaux du monde seulement
    if (this.isStoryReforge(slot, target) && typeof stripStoryMaterials === "function") cost = stripStoryMaterials(cost).cost;
    return cost;
  },

  isStoryReforge: function (slot, target) {
    var max = (typeof STORY_WEAPON_REFORGE_LEVELS === "number") ? STORY_WEAPON_REFORGE_LEVELS : 4;
    return slot === "weapon" && target <= max;
  },

  canAfford: function (slot) {
    var cost = this.getCost(slot);
    if (!cost) return false;
    return Object.keys(cost).every(function (key) {
      return (key === "gold")
        ? Number(game.gold || 0) >= cost[key]
        : WarehouseManager.getAmount(key) >= cost[key];
    });
  },

  /* Raison de blocage, jamais un simple faux : l'écran doit pouvoir dire quoi
     faire. */
  getBlockReason: function (slot) {
    if (this.getBuildingLevel() <= 0) return _t("Forge non construite");
    if (window.heroLockReason && heroLockReason()) return _t("Héros en expédition"); // v3.307.0 : la Forge travaille l'équipement porté
    if (this.getLevel(slot) >= this.getMaxLevel()) return _t("Améliore la Forge");
    if (!this.canAfford(slot)) return _t("Matériaux manquants");
    return null;
  },

  _forging: false,

  reforge: function (slot) {
    if (this._forging) return false;
    if (EQUIPMENT_SLOTS.indexOf(slot) === -1) return false;

    this.ensure();

    var reason = this.getBlockReason(slot);
    if (reason) {
      showToast(reason, 1400);
      return false;
    }

    var cost = this.getCost(slot);
    var gain = this.getNextGainLabel(slot), def = this.getBandDef(this.getBand(this.getLevel(slot) + 1));
    this._forging = true;

    Object.keys(cost).forEach(function (key) {
      if (key === "gold") game.gold -= cost[key];
      else WarehouseManager.removeResource(key, cost[key]);
    });

    game.forge.levels[slot] = this.getLevel(slot) + 1;

    var label = (typeof EQUIPMENT_SLOT_LABELS !== "undefined" && EQUIPMENT_SLOT_LABELS[slot]) ? _td(EQUIPMENT_SLOT_LABELS[slot]) : slot;
    var n = game.forge.levels[slot], w = def ? def.world : "";
    addLog("⚒️ " + _t("{x} : reforge {n}, {g} pour ton héros ({w}).", { x: label, n: n, g: gain, w: w }), "event");
    showToast("⚒️ " + _t("{g} ({w})", { g: gain, w: w }), 1600);

    if (typeof StatsSystem !== "undefined") StatsSystem.recalcStats();
    if (typeof renderAll === "function") renderAll();
    saveGame();

    this._forging = false;
    return true;
  }
};

window.FORGE_MIN_STEP = FORGE_MIN_STEP;
window.FORGE_LEVELS_PER_RARITY_STEP = FORGE_LEVELS_PER_RARITY_STEP;
window.FORGE_LEVELS_PER_BUILDING_LEVEL = FORGE_LEVELS_PER_BUILDING_LEVEL;
window.FORGE_WORLD_BONUS_PER_REFORGE = FORGE_WORLD_BONUS_PER_REFORGE;
window.FORGE_REFORGES_PER_WORLD = FORGE_REFORGES_PER_WORLD;
window.FORGE_WORLD_BONUSES = FORGE_WORLD_BONUSES;
window.ForgeManager = ForgeManager;
