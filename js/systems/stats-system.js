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

/* v1.8.5 : Bonus de bestiaire — meilleur palier atteint pour une créature donnée,
   selon le nombre de kills enregistrés dans game.killCounts. */
function getBestiaryBonus(id) {
  var tiers = (typeof BESTIARY_BONUS_CONFIG !== "undefined" && BESTIARY_BONUS_CONFIG[id]) || [];
  var kills = (game.killCounts && game.killCounts[id]) || 0;
  var result = { goldBonus: 0, essenceBonus: 0, lootBonus: 0 };

  tiers.forEach(function (tier) {
    if (kills >= (tier.kills || 0)) {
      result.goldBonus = Math.max(result.goldBonus, tier.goldBonus || 0);
      result.essenceBonus = Math.max(result.essenceBonus, tier.essenceBonus || 0);
      result.lootBonus = Math.max(result.lootBonus, tier.lootBonus || 0);
    }
  });

  return result;
}

/* v1.8.5 : Somme des bonus or/essence de toutes les créatures déjà rencontrées
   (bonus passif global qui grandit avec la maîtrise du bestiaire). */
function getTotalBestiaryBonus() {
  var config = (typeof BESTIARY_BONUS_CONFIG !== "undefined") ? BESTIARY_BONUS_CONFIG : {};
  var total = { goldBonus: 0, essenceBonus: 0 };

  Object.keys(config).forEach(function (id) {
    var bonus = getBestiaryBonus(id);
    total.goldBonus += bonus.goldBonus;
    total.essenceBonus += bonus.essenceBonus;
  });

  return total;
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

    // NOUVEAU v1.8 : Force (power) -> dégâts de tap
    var FORCE_TAP_COEF = 0.2;
    var hero = typeof getHeroByGameId === "function" ? getHeroByGameId(game.heroId) : null;
    var basePower = (hero && hero.stats) ? Number(hero.stats.power) || 0 : 0;
    var trainedPower = (game.trainedStats && game.trainedStats.power) || 0;
    var totalPower = basePower + trainedPower;
    game.tapDamage += totalPower * FORCE_TAP_COEF;

    // NOUVEAU v1.8 : Célérité -> auto DPS
    var CELERITY_DPS_COEF = 0.03;
    var baseCelerity = (hero && hero.stats) ? Number(hero.stats.celerity) || 0 : 0;
    var trainedCelerity = (game.trainedStats && game.trainedStats.celerity) || 0;
    game.autoDps += (baseCelerity + trainedCelerity) * CELERITY_DPS_COEF;

    // NOUVEAU v1.8 : Précision -> chance de critique
    var PRECISION_CRIT_COEF = 0.06;
    var basePrecision = (hero && hero.stats) ? Number(hero.stats.precision) || 0 : 0;
    var trainedPrecision = (game.trainedStats && game.trainedStats.precision) || 0;
    game.critChance += (basePrecision + trainedPrecision) * PRECISION_CRIT_COEF;

    // NOUVEAU v1.8 : Volonté -> dégâts critiques
    var WILL_CRIT_MULT_COEF = 0.01;
    var baseWill = (hero && hero.stats) ? Number(hero.stats.will) || 0 : 0;
    var trainedWill = (game.trainedStats && game.trainedStats.will) || 0;
    game.critMult += (baseWill + trainedWill) * WILL_CRIT_MULT_COEF;

     // NOUVEAU v1.8 : Endurance -> PV du héros
    var ENDURANCE_HP_COEF = 2;
    var baseEndurance = (hero && hero.stats) ? Number(hero.stats.endurance) || 0 : 0;
    var trainedEndurance = (game.trainedStats && game.trainedStats.endurance) || 0;
    var totalEndurance = baseEndurance + trainedEndurance;
    game.heroMaxHp = Math.max(1, Math.floor(totalEndurance * ENDURANCE_HP_COEF));
    if (!game.heroHp || game.heroHp > game.heroMaxHp) game.heroHp = game.heroMaxHp;

    // NOUVEAU v1.8.5 : Endurance -> réduction des dégâts de riposte ennemie
    var HERO_DEFENSE_COEF = 0.002;
    var HERO_DEFENSE_CAP = 0.6;
    game.heroDefensePct = Math.min(HERO_DEFENSE_CAP, totalEndurance * HERO_DEFENSE_COEF);

    // NOUVEAU v1.8.5 : bonus passif de bestiaire (or/essence), cumulé sur toutes les créatures rencontrées
    var bestiaryTotal = getTotalBestiaryBonus();
    game.goldMult += bestiaryTotal.goldBonus || 0;
    game.essenceGlobalMult += bestiaryTotal.essenceBonus || 0;

    // NOUVEAU v1.8.5 : maîtrise d'arme -> petit bonus de dégâts selon les kills réalisés
    // avec le type d'arme actuellement équipée (compteurs déjà suivis dans questProgress)
    var WEAPON_MASTERY_COEF = 0.0005;
    var WEAPON_MASTERY_CAP = 0.25;
    var masteryType = typeof getPlayerDamageType === "function" ? getPlayerDamageType() : null;
    var masteryProgress = game.questProgress || {};
    var masteryKillsById = {
      sword: masteryProgress.swordKills,
      bow: masteryProgress.bowKills,
      magic: masteryProgress.magicKills
    };
    var masteryKills = masteryType ? Number(masteryKillsById[masteryType] || 0) : 0;
    game.tapMult += Math.min(WEAPON_MASTERY_CAP, masteryKills * WEAPON_MASTERY_COEF);

    var equipped = game.equipped;
    [equipped.weapon, equipped.armor, equipped.amulet].forEach(function(item) {
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
    if (game.talents.t_precise_strike) game.critChance += 6;

    if (game.talents.t_scavenger) game.goldMult += 0.08;
    if (game.talents.t_golden_touch) game.goldMult += 0.12;
    if (game.talents.t_sovereign_treasure) game.goldMult += 0.20;

    if (game.talents.t_bloodlust) {
      game.tapMult += Math.min((game.ascensionCount || 0) * 0.03, 0.15);
    }

    if (game.ascensionCount > 0) {
      game.tapMult += game.ascensionCount * 0.15;
      game.goldMult += game.ascensionCount * 0.12;
    }

    if (game.talents.t_essence_bloom) game.essenceGlobalMult += 0.15;
    if (game.talents.t_immutable_guardian) game.essenceGlobalMult += 0.20;

    var aether = getAetherBonuses();
    game.tapMult += aether.tapBonus || 0;
    game.goldMult *= 1 + (aether.goldBonus || 0);

    // Bonus passif : Aether cumulé à vie -> dégâts + or globaux (ne diminue jamais, même dépensé)
    var AETHER_LIFETIME_MULT_COEF = 0.005;
    var totalAether = Number(game.totalAetherEarned || 0);
    game.tapMult += totalAether * AETHER_LIFETIME_MULT_COEF;
    game.goldMult += totalAether * AETHER_LIFETIME_MULT_COEF;
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
window.getBestiaryBonus = getBestiaryBonus;
window.getTotalBestiaryBonus = getTotalBestiaryBonus;