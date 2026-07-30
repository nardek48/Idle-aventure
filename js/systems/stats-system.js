"use strict";
/* ============================================================
Quest Idle — systems/stats-system.js
Stats, set bonus, equipment stat recompute, Aether helpers
============================================================ */

function getAetherUpgradeLevel(id) {
  return Number((game.aetherUpgrades && game.aetherUpgrades[id]) || 0);
}

function getAetherBonuses() {
  if (typeof ensureGameStateDefaults === "function") ensureGameStateDefaults();

  var levels = game.aetherUpgrades || {};
  return {
    tapBonus: (levels.a_tap || 0) * 0.10,
    goldBonus: (levels.a_gold || 0) * 0.10,
    lootBonus: (levels.a_loot || 0) * 3,
    essenceBonus: Math.floor((levels.a_essence || 0) / 2)
  };
}

function getAetherMult() {
  var bonus = getAetherBonuses();
  return {
    tap: 1 + (bonus.tapBonus || 0),
    gold: 1 + (bonus.goldBonus || 0),
    loot: bonus.lootBonus || 0,
    essence: bonus.essenceBonus || 0
  };
}

function getAetherUpgradeCost(upgrade) {
  var level = getAetherUpgradeLevel(upgrade.id);
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMult || 1.4, level));
}

function formatSetBonusEffect(effect) {
  if (!effect) return "";

  var parts = [];

  if (effect.tapDamage != null) parts.push("+" + formatNumber(effect.tapDamage) + " dégâts/tap");
  if (effect.tapMult != null) parts.push("+" + Math.round(effect.tapMult * 100) + "% dégâts");
  if (effect.goldMult != null) parts.push("+" + Math.round(effect.goldMult * 100) + "% or");
  if (effect.critChance != null) parts.push("+" + formatNumber(effect.critChance) + "% critique");
  if (effect.critMult != null) parts.push("+" + formatNumber(effect.critMult) + "x dégâts crit");
  if (effect.autoDps != null) parts.push("+" + formatNumber(effect.autoDps) + " auto DPS");

  return parts.join(" • ");
}

var StatsSystem = {
  recalcStats: function () {
    game.tapDamage = 1;
    game.tapMult = 1;
    game.autoDps = 0;
    game.critChance = 5;
    game.critMult = 2;
    game.goldMult = 1;

    game.essenceRegen = 0;
    game.bossEssenceMult = 1;
    game.essenceGlobalMult = 1;

    (UPGRADES || []).forEach(function (u) {
      if (u && typeof u.apply === "function") {
        u.apply(game.upgrades[u.id] || 0);
      }
    });

    var equipped = game.equipped || {};
    [equipped.weapon, equipped.armor, equipped.amulet].forEach(function (item) {
      if (!item) return;
      if (item.stat === "tapDmg") game.tapDamage += item.value;
      else if (item.stat === "tapMult") game.tapMult += item.value;
      else if (item.stat === "goldMult") game.goldMult += item.value;
      else if (item.stat === "critChance") game.critChance += item.value;
      else if (item.stat === "critMult") game.critMult += item.value;
      else if (item.stat === "autoDps") game.autoDps += item.value;
    });

    var setBonus = this.getSetBonus();
    if (setBonus && setBonus.config && typeof setBonus.config.apply === "function") {
      var bonus = setBonus.config.apply() || {};
      if (bonus.tapMult != null) game.tapMult += bonus.tapMult;
      if (bonus.goldMult != null) game.goldMult += bonus.goldMult;
      if (bonus.critChance != null) game.critChance += bonus.critChance;
      if (bonus.critMult != null) game.critMult += bonus.critMult;
      if (bonus.autoDps != null) game.autoDps += bonus.autoDps;
      if (bonus.tapDamage != null) game.tapDamage += bonus.tapDamage;
    }

    if (game.talents.t_sharpened_blades) game.tapMult += 0.05;

    if (game.talents.t_scavenger) game.goldMult += 0.08;
    if (game.talents.t_golden_touch) game.goldMult += 0.12;

    if (game.talents.t_bloodlust) {
      game.tapMult += Math.min((game.ascensionCount || 0) * 0.03, 0.15);
    }

    if (game.ascensionCount > 0) {
      game.tapMult += game.ascensionCount * 0.15;
      game.goldMult += game.ascensionCount * 0.12;
    }

    if (game.talents.t_cycle_master) {
      game.tapMult += Math.min((game.cycleCount || 0) * 0.10, 0.30);
      game.goldMult += Math.min((game.cycleCount || 0) * 0.10, 0.30);
    }

    var aether = getAetherBonuses();
    game.tapMult += aether.tapBonus || 0;
    game.goldMult *= 1 + (aether.goldBonus || 0);
  },

  effectiveTapDamage: function () {
    return Math.max(1, Math.floor(game.tapDamage * game.tapMult));
  },

  effectiveAutoDps: function () {
    return Math.max(0, game.autoDps);
  },

  effectiveCritChance: function () {
    return Math.max(0, game.critChance);
  },

  effectiveCritMult: function () {
    return Math.max(1, game.critMult);
  },

  effectiveGoldMult: function () {
    return Math.max(1, game.goldMult);
  },

  getSetBonus: function () {
    var equipped = [
      game.equipped.weapon,
      game.equipped.armor,
      game.equipped.amulet
    ].filter(Boolean);

    var required = (SET_BONUS_CONFIG && SET_BONUS_CONFIG.sameRarityCount) || 3;

    if (equipped.length < required) {
      return { rarity: null, config: null };
    }

    var rarity = equipped[0].rarity;
    var same = equipped.every(function (item) {
      return item.rarity === rarity;
    });

    if (!same) {
      return { rarity: null, config: null };
    }

    var baseConfig = (SET_BONUS_CONFIG.bonuses && SET_BONUS_CONFIG.bonuses[rarity]) || null;
    if (!baseConfig) {
      return { rarity: null, config: null };
    }

    var effect = typeof baseConfig.apply === "function" ? (baseConfig.apply() || {}) : {};
    var config = {
      name: baseConfig.name || ("Panoplie " + rarity),
      apply: baseConfig.apply,
      effect: effect,
      text: formatSetBonusEffect(effect),
      pieces: equipped.length,
      maxPieces: required
    };

    return {
      rarity: rarity,
      config: config
    };
  }
};

window.StatsSystem = StatsSystem;
window.getAetherUpgradeLevel = getAetherUpgradeLevel;
window.getAetherUpgradeCost = getAetherUpgradeCost;
window.getAetherBonuses = getAetherBonuses;
window.getAetherMult = getAetherMult;