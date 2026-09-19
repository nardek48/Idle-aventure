"use strict";
/* systems/forge-system.js — v3.221.0 (lot V-8) : ForgeManager.

   RÈGLE CENTRALE, figée avec Seb le 11/09/2026 :
   **30 niveaux de forge valent exactement un cran de rareté**, calculé sur les
   fourchettes réelles de CHAQUE emplacement. Pas un pourcentage fixe : l'échelle
   des raretés n'est pas la même d'un emplacement à l'autre (l'amulette gagne
   +55 % par cran, l'armure +24 %), et un pourcentage unique casserait la
   hiérarchie du loot sur certains slots tout en étant insignifiant sur d'autres.

   Conséquence voulue : une pièce commune forgée au maximum atteint le haut de la
   rareté suivante. Elle dépasse donc une inhabituelle de bas de fourchette, mais
   ne rattrape JAMAIS une inhabituelle elle-même forgée. La forge rattrape la
   malchance, elle ne remplace pas le loot.

   PLANCHER : certaines échelles sont plates en haut (arme épique → légendaire
   +17 %, bottes +12 %). Sans plancher, forger une arme légendaire — c'est-à-dire
   exactement le moment où le joueur a le plus de matériaux — ne servirait à
   rien. Le pas est donc borné à +35 % minimum.

   LE NIVEAU APPARTIENT À L'EMPLACEMENT, PAS À L'OBJET. C'est la décision qui
   évite le piège classique : sans elle, un joueur hésiterait à équiper un
   meilleur drop pour ne pas perdre son investissement. Ici, on forge « son
   arme », et changer d'arme conserve tout.

   ÉTAT EN SAUVEGARDE : game.forge = { levels: { weapon: 0, armor: 0, ... } } */

/* Pas minimal d'un cran, quand l'échelle de la pièce est trop plate. */
var FORGE_MIN_STEP = 1.35;

/* Niveaux de forge équivalant à un cran complet de rareté. */
var FORGE_LEVELS_PER_RARITY_STEP = 30;

/* Niveaux d'objet ouverts par niveau de bâtiment.
   v3.289.0 (D12) : 5 -> 2. À 5, le plafond ne mordait jamais (l'Acier freinait avant) :
   il n'y avait rien à équilibrer. La puissance d'un niveau de reforge ne change pas
   (FORGE_LEVELS_PER_RARITY_STEP reste 30) : seul le plafond se resserre. */
var FORGE_LEVELS_PER_BUILDING_LEVEL = 2;

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

  /* Plafond de niveau d'objet, donné par le bâtiment. */
  getMaxLevel: function () {
    return this.getBuildingLevel() * FORGE_LEVELS_PER_BUILDING_LEVEL;
  },

  getLevel: function (slot) {
    this.ensure();
    return Number(game.forge.levels[slot] || 0);
  },

  /* Rapport entre le haut de la rareté d'une pièce et celui de la rareté
     suivante — le « cran ». Pour une légendaire, il n'y a pas de suivante :
     on reprend le dernier pas connu, faute de mieux, et le plancher s'applique
     de toute façon. */
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

  /* Bonus multiplicatif appliqué à la valeur d'une pièce, linéaire en niveau. */
  getMultiplier: function (item) {
    if (!item || !item.slot) return 1;
    var level = this.getLevel(item.slot);
    if (level <= 0) return 1;

    var step = this.getRarityStep(item.slot, item.rarity);
    return 1 + (step - 1) * (level / FORGE_LEVELS_PER_RARITY_STEP);
  },

  /* Valeur effective d'une pièce, forge comprise. Lue par StatsSystem via
     EquipmentManager.getForgedValue(). L'arrondi suit les décimales de
     l'emplacement, pour que l'affichage et le calcul disent la même chose. */
  getForgedValue: function (item) {
    if (!item) return 0;
    var base = Number(item.value || 0);
    var mult = this.getMultiplier(item);
    if (mult === 1) return base;

    var config = EQUIPMENT_SLOT_CONFIG[item.slot];
    var decimals = (config && config.decimals) || 0;
    var factor = Math.pow(10, decimals);
    return Math.round(base * mult * factor) / factor;
  },

  /* --- Coût d'une reforge ------------------------------------------------
     Or + matériau, le matériau dépendant du palier : acier sur les niveaux du
     premier niveau de bâtiment, acier + résine ensuite. Le coût monte avec le niveau
     visé, pas avec la rareté de la pièce : c'est l'emplacement qu'on forge. */
  getCost: function (slot) {
    var level = this.getLevel(slot);
    var target = level + 1;
    if (target > this.getMaxLevel()) return null;

    var cost = {
      gold: Math.floor(400 * Math.pow(1.35, level)),
      acier: Math.max(2, Math.floor(2 + level * 1.5))
    };
    // v3.289.0 : la Résine arrive avec le 2e niveau de bâtiment, comme avant (seuil suivi)
    var seuil = FORGE_LEVELS_PER_BUILDING_LEVEL;
    if (target > seuil) cost.resine_durcie = Math.max(1, Math.floor((target - seuil) / 2) + 1);
    return cost;
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
    if (this.getBuildingLevel() <= 0) return "Forge non construite";
    if (window.heroLockReason && heroLockReason()) return "Héros en expédition"; // v3.307.0 : la Forge travaille l'équipement porté
    if (this.getLevel(slot) >= this.getMaxLevel()) return "Améliore la Forge";
    if (!this.canAfford(slot)) return "Matériaux manquants";
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
    this._forging = true;

    Object.keys(cost).forEach(function (key) {
      if (key === "gold") game.gold -= cost[key];
      else WarehouseManager.removeResource(key, cost[key]);
    });

    if (window.QuestManager && typeof QuestManager.track === "function" && cost.gold) {
      QuestManager.track("goldSpent", cost.gold);
    }

    game.forge.levels[slot] = this.getLevel(slot) + 1;

    var label = (EQUIPMENT_SLOT_CONFIG[slot] && EQUIPMENT_SLOT_CONFIG[slot].label) || slot;
    addLog("⚒️ " + label + " reforgé — niveau " + game.forge.levels[slot] + ".", "event");
    showToast("⚒️ Niveau " + game.forge.levels[slot], 1300);

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
window.ForgeManager = ForgeManager;
