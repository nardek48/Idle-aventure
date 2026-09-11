"use strict";
/* systems/loot-system.js — génération procédurale des drops (kill de boss uniquement). Détail complet : COMMENTAIRES_ORIGINAUX.md */

/* v3.225.0 — tirage des affixes d'un objet (tables : AFFIX_COUNT_BY_RARITY, AFFIX_POOLS,
   AFFIX_RANGES, data/equipment.js). Sans remise, jamais la stat de base ; les plats
   suivent l'échelle de monde comme la stat de base. Renvoie [] pour un Commun ou un
   emplacement inconnu — jamais null. */
function rollEquipmentAffixes(slot, baseStat, rarity, worldIndex) {
  var out = [];
  var counts = (typeof AFFIX_COUNT_BY_RARITY !== "undefined") ? AFFIX_COUNT_BY_RARITY[rarity] : null;
  var pools = (typeof AFFIX_POOLS !== "undefined") ? AFFIX_POOLS[slot] : null;
  if (!counts || !pools) return out;

  var world = Math.max(0, Number(worldIndex) || 0);
  ["primary", "secondary"].forEach(function (tier) {
    var pool = (pools[tier] || []).filter(function (st) { return st !== baseStat && AFFIX_RANGES[st]; });
    var n = Math.min(Number(counts[tier]) || 0, pool.length);
    for (var i = 0; i < n; i++) {
      var stat = pool.splice(randInt(0, pool.length - 1), 1)[0];
      var rule = AFFIX_RANGES[stat];
      var range = rule[rarity] || rule.green;
      var raw = randFloat(range[0], range[1]);
      if (rule.flat) raw = raw * getEquipWorldScale(world);
      var factor = Math.pow(10, rule.decimals || 0);
      out.push({ stat: stat, value: Math.round(raw * factor) / factor, tier: tier === "primary" ? "P" : "S" });
    }
  });
  return out;
}

function generateEquipmentItem(slot, rarity, worldIndex) {
  var config = EQUIPMENT_SLOT_CONFIG[slot];
  if (!config) return null;

  var range = config.ranges[rarity] || config.ranges.common;
  var raw = randFloat(range[0], range[1]);

  /* v3.220.0 : échelle de monde. L'objet est estampillé du monde où il tombe,
     et sa valeur est mise à l'échelle À LA GÉNÉRATION — pas à la lecture. Deux
     raisons : la valeur affichée est alors la vraie (aucun calcul caché), et un
     objet gardé ne change pas de puissance quand le joueur change de monde.
     Seules les stats plates suivent la courbe (voir EQUIP_WORLD_SCALE). */
  var world = (typeof worldIndex === "number")
    ? worldIndex
    : ((window.WorldManager && WorldManager.worldIndex) || 0);
  if (config.scalesWithWorld) raw = raw * getEquipWorldScale(world);

  var decimals = config.decimals || 0;
  var factor = Math.pow(10, decimals);
  var value = Math.round(raw * factor) / factor;

  // Arme : restreint l'icône aux types compatibles avec la classe du héros actif (un archer ne trouve pas de bâton).
  var iconPool = config.icons;
  if (slot === "weapon" && typeof getAllowedWeaponIconsForCurrentHero === "function") {
    var allowedIcons = getAllowedWeaponIconsForCurrentHero();
    if (Array.isArray(allowedIcons) && allowedIcons.length) iconPool = allowedIcons;
  }

  var icon = iconPool[randInt(0, iconPool.length - 1)];
  var namePool = (config.namesByIcon && config.namesByIcon[icon]) || config.names;
  var name = namePool[randInt(0, namePool.length - 1)];

  return {
    uid: "itm_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8),
    slot: slot,
    name: name,
    icon: icon,
    rarity: rarity,
    stat: config.stat,
    value: value,
    /* Monde d'origine : sert à l'affichage et aux futurs paliers de Forge.
       Un objet d'une sauvegarde antérieure n'en a pas — il est alors traité
       comme un objet de Forêt, ce qu'il est de fait. */
    worldIndex: world,
    affixes: rollEquipmentAffixes(slot, config.stat, rarity, world) // v3.225.0
  };
}

function getAllowedRarities() {
  var worldIndex = (window.WorldManager && WorldManager.worldIndex) || 0;
  var towerQuestDone = !!(window.WorldQuestManager && WorldQuestManager.isWorldUnlocked(5));
  var isCycling = (game.cycleCount || 0) > 0 && towerQuestDone;
  var maxTier = WORLD_RARITY_UNLOCKS.length - 1;
  var tierIndex = isCycling ? maxTier : Math.min(Math.max(0, worldIndex), maxTier);
  return WORLD_RARITY_UNLOCKS[tierIndex] || ["common"];
}

var LootSystem = {
  rollDrop: function () {
    var slot = EQUIPMENT_SLOTS[randInt(0, EQUIPMENT_SLOTS.length - 1)];

    var allowed = getAllowedRarities();
    var weights = allowed.map(function (r) { return RARITY_DROP_RATES[r] || 0; });
    var totalWeight = weights.reduce(function (a, b) { return a + b; }, 0);

    if (totalWeight <= 0) {
      allowed = ["common"];
      weights = [1];
      totalWeight = 1;
    }

    var roll = Math.random() * totalWeight;
    var rarity = allowed[allowed.length - 1];
    var acc = 0;
    for (var i = 0; i < allowed.length; i++) {
      acc += weights[i];
      if (roll < acc) {
        rarity = allowed[i];
        break;
      }
    }

    return generateEquipmentItem(slot, rarity);
  },

  rollDropAtRarity: function (rarity) {
    var slot = EQUIPMENT_SLOTS[randInt(0, EQUIPMENT_SLOTS.length - 1)];
    return generateEquipmentItem(slot, rarity);
  }
};

window.LootSystem = LootSystem;
window.generateEquipmentItem = generateEquipmentItem;
window.rollEquipmentAffixes = rollEquipmentAffixes;
window.getAllowedRarities = getAllowedRarities;
