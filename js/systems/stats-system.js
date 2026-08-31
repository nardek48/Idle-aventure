"use strict";
/* systems/stats-system.js — StatsSystem.recalcStats() recompose ENTIÈREMENT les stats du joueur à chaque appel (jamais en continu).
   Ordre : upgrades -> stats RPG héros -> équipement -> sets -> talents -> ascension -> Aether -> bestiaire -> potions -> afflictions.
   Détail complet (constantes de balance, historique des bugs de clamp v3.19/v3.29) : COMMENTAIRES_ORIGINAUX.md */
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
    essenceBonus: Math.floor((levels.a_essence || 0) / 2),
    vitalityBonus: (levels.a_vitality || 0) * 0.10
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

  if (effect.tapDamage != null) parts.push("+" + formatNumber(effect.tapDamage) + " dégâts d'Attaque");
  if (effect.tapMult != null) parts.push("+" + Math.round(effect.tapMult * 100) + "% dégâts");
  if (effect.goldMult != null) parts.push("+" + Math.round(effect.goldMult * 100) + "% or");
  if (effect.critChance != null) parts.push("+" + formatNumber(effect.critChance) + "% critique");
  if (effect.critMult != null) parts.push("+" + formatNumber(effect.critMult) + "x dégâts crit");
  if (effect.autoDps != null) parts.push("+" + formatNumber(effect.autoDps) + " célérité");

  return parts.join(" • ");
}

var StatsSystem = {
    recalcStats: function () {
    game.tapDamage = 1;
    game.tapMult = 1;
    game.autoDps = 0; // v3.102.0 (P2) : plus d'auto-DPS ; champ conservé (save) mais toujours 0
    game.bonusCelerity = 0; // v3.102.0 : célérité d'équipement (ex-stat autoDps) → jauge de célérité (CombatEngine.getTotalCelerity)
    game.celerityMult = 1;  // v3.102.0 : potion de célérité
    game.critChance = 5;
    game.critMult = 2;
    game.goldMult = 1;

    game.equipFlatTapBonus = 0;

    game.equipDefensePct = 0;

    game.bossGoldBonusPct = 0;

    game.essenceRegen = 0;
    game.bossEssenceMult = 1;
    game.essenceGlobalMult = 1;

    (UPGRADES || []).forEach(function (u) {
      if (u && typeof u.apply === "function") {
        u.apply(game.upgrades[u.id] || 0);
      }
    });

    var FORCE_TAP_COEF = 0.2;
    var hero = typeof getHeroByGameId === "function" ? getHeroByGameId(game.heroId) : null;
    var basePower = (hero && hero.stats) ? Number(hero.stats.power) || 0 : 0;
    var trainedPower = (game.trainedStats && game.trainedStats.power) || 0;
    var totalPower = basePower + trainedPower;
    game.tapDamage += totalPower * FORCE_TAP_COEF;
    // v3.90.0 : Puissance brute finale exposée pour le moteur d'Expéditions non-combat
    // (exploration-engine.js) — source de vérité unique, jamais recalculée ailleurs.
    game.heroPowerRaw = totalPower;


    var PRECISION_CRIT_COEF = 0.06;
    var basePrecision = (hero && hero.stats) ? Number(hero.stats.precision) || 0 : 0;
    var trainedPrecision = (game.trainedStats && game.trainedStats.precision) || 0;
    game.critChance += (basePrecision + trainedPrecision) * PRECISION_CRIT_COEF;
    // v3.90.0 : Précision brute finale exposée, même raison que heroPowerRaw ci-dessus.
    game.heroPrecisionRaw = basePrecision + trainedPrecision;

    var WILL_CRIT_MULT_COEF = 0.01;
    var baseWill = (hero && hero.stats) ? Number(hero.stats.will) || 0 : 0;
    var trainedWill = (game.trainedStats && game.trainedStats.will) || 0;
    game.critMult += (baseWill + trainedWill) * WILL_CRIT_MULT_COEF;

    var ENDURANCE_HP_EXP = 0.75;
    var ENDURANCE_HP_COEF = 17.716;
    var baseEndurance = (hero && hero.stats) ? Number(hero.stats.endurance) || 0 : 0;
    var trainedEndurance = (game.trainedStats && game.trainedStats.endurance) || 0;
    var totalEndurance = baseEndurance + trainedEndurance;
    var effectiveEndurance = Math.pow(Math.max(0, totalEndurance), ENDURANCE_HP_EXP);
    game.heroMaxHp = Math.max(1, Math.floor(effectiveEndurance * ENDURANCE_HP_COEF));
    // v3.94.0 : Endurance brute finale exposée pour le moteur du minijeu "Puits"
    // (systems/well-system.js) — même raison que heroPowerRaw/heroPrecisionRaw (v3.90.0) :
    // source de vérité unique, jamais recalculée ailleurs.
    game.heroEnduranceRaw = totalEndurance;

    var HERO_DEFENSE_COEF = 0.002;
    var HERO_DEFENSE_CAP = 0.6;

    var bestiaryTotal = getTotalBestiaryBonus();
    game.goldMult += bestiaryTotal.goldBonus || 0;
    game.essenceGlobalMult += bestiaryTotal.essenceBonus || 0;

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
    (typeof EQUIPMENT_SLOTS !== "undefined" ? EQUIPMENT_SLOTS : ["weapon", "armor", "amulet"])
      .map(function (slot) { return equipped[slot]; })
      .forEach(function(item) {
      if (!item) return;
      if (item.stat === "tapDmg") game.equipFlatTapBonus += item.value;
      else if (item.stat === "tapMult") game.tapMult += item.value;
      else if (item.stat === "goldMult") game.goldMult += item.value;
      else if (item.stat === "critChance") game.critChance += item.value;
      else if (item.stat === "critMult") game.critMult += item.value;
      else if (item.stat === "autoDps") game.bonusCelerity += item.value; // v3.102.0 : bottes = célérité
      else if (item.stat === "defense") game.equipDefensePct += item.value;
    });

    // Facteur validé session équilibrage "scie" (×0.35) : évite la saturation du plafond 60% dès le monde 4.
    var SURVIVAL_DEFENSE_FACTOR = 0.35;
    var survivalDefenseBonus = (
      (game.talents.t_second_wind || 0) * 0.02 +
      (game.talents.t_vital_anchor || 0) * 0.05 +
      (game.talents.t_immutable_guardian || 0) * 0.05
    ) * SURVIVAL_DEFENSE_FACTOR;
    game.heroDefensePct = Math.min(HERO_DEFENSE_CAP, totalEndurance * HERO_DEFENSE_COEF + (game.equipDefensePct || 0) + survivalDefenseBonus);

    if (game.ascensionCount > 0) {
      game.heroMaxHp = Math.max(1, Math.floor(game.heroMaxHp * (1 + game.ascensionCount * 0.04)));
    }

    var survivalHpMult =
      (game.talents.t_regenerate || 0) * 0.05 +
      (game.talents.t_tenacious_will || 0) * 0.08 +
      (game.talents.t_vital_anchor || 0) * 0.05 +
      (game.talents.t_immutable_guardian || 0) * 0.10;
    if (survivalHpMult) {
      game.heroMaxHp = Math.max(1, Math.floor(game.heroMaxHp * (1 + survivalHpMult)));
    }

    var activeSetBonuses = this.getActiveSetBonuses();
    activeSetBonuses.forEach(function (entry) {
      if (!entry.config || typeof entry.config.apply !== "function") return;
      var bonus = entry.config.apply() || {};
      if (bonus.tapMult != null) game.tapMult += bonus.tapMult;
      if (bonus.goldMult != null) game.goldMult += bonus.goldMult;
      if (bonus.critChance != null) game.critChance += bonus.critChance;
      if (bonus.critMult != null) game.critMult += bonus.critMult;
      if (bonus.autoDps != null) game.bonusCelerity += bonus.autoDps;
      if (bonus.tapDamage != null) game.equipFlatTapBonus += bonus.tapDamage;
    });

    game.tapMult += (game.talents.t_sharpened_blades || 0) * 0.05;
    game.critChance += (game.talents.t_precise_strike || 0) * 6;

    game.goldMult += (game.talents.t_scavenger || 0) * 0.08;
    game.goldMult += (game.talents.t_golden_touch || 0) * 0.12;
    game.goldMult += (game.talents.t_sovereign_treasure || 0) * 0.20;

    if (game.talents.t_bloodlust) {
      var bloodlustLevel = game.talents.t_bloodlust;
      game.tapMult += Math.min((game.ascensionCount || 0) * 0.03 * bloodlustLevel, 0.15 * bloodlustLevel);
    }

    if (game.ascensionCount > 0) {
      game.tapMult += game.ascensionCount * 0.06;
      game.goldMult += game.ascensionCount * 0.05;
    }

    var aether = getAetherBonuses();
    game.tapMult += aether.tapBonus || 0;
    game.goldMult *= 1 + (aether.goldBonus || 0);
    if (aether.vitalityBonus) {
      game.heroMaxHp = Math.max(1, Math.floor(game.heroMaxHp * (1 + aether.vitalityBonus)));
    }

    var potionEffects = (window.PotionManager && typeof PotionManager.getActiveEffects === "function")
      ? PotionManager.getActiveEffects()
      : {};
    if (potionEffects.power) game.tapDamage *= (1 + potionEffects.power);
    if (potionEffects.celerity) game.celerityMult *= (1 + potionEffects.celerity);
    if (potionEffects.critChance) game.critChance += potionEffects.critChance;
    if (potionEffects.gold) game.goldMult *= (1 + potionEffects.gold);
    if (potionEffects.endurance) {
      game.heroMaxHp = Math.max(1, Math.floor(game.heroMaxHp * (1 + potionEffects.endurance)));
      game.heroDefensePct = Math.min(0.6, game.heroDefensePct + potionEffects.endurance * 0.1);
    }

    if (window.AfflictionManager && typeof AfflictionManager.getCombinedModifiers === "function") {
      var afflictionMods = AfflictionManager.getCombinedModifiers();
      var stackRewardMult = AfflictionManager.getStackRewardMult();
      if (afflictionMods.tapMult) game.tapMult += afflictionMods.tapMult;
      if (afflictionMods.heroMaxHpMult !== 1) {
        game.heroMaxHp = Math.max(1, Math.floor(game.heroMaxHp * afflictionMods.heroMaxHpMult));
      }
      if (afflictionMods.goldMult !== 1) game.goldMult *= afflictionMods.goldMult;
      if (stackRewardMult !== 1) {
        game.goldMult *= stackRewardMult;
        game.essenceGlobalMult *= stackRewardMult;
      }
      if (afflictionMods.bossGoldBonusPct) game.bossGoldBonusPct += afflictionMods.bossGoldBonusPct;
      if (afflictionMods.bossEssenceBonusPct) game.bossEssenceBonusPct = (game.bossEssenceBonusPct || 0) + afflictionMods.bossEssenceBonusPct;
    }

    if (game.heroHp == null || game.heroHp > game.heroMaxHp) game.heroHp = game.heroMaxHp;

    var achievementBonus = (window.AchievementManager && typeof AchievementManager.getTotalBonus === "function")
      ? AchievementManager.getTotalBonus()
      : {};
    if (achievementBonus.goldMult) game.goldMult += achievementBonus.goldMult;
    if (achievementBonus.tapMult) game.tapMult += achievementBonus.tapMult;
    if (achievementBonus.essenceGlobalMult) game.essenceGlobalMult += achievementBonus.essenceGlobalMult;

    var dungeonShopBonus = (window.DungeonManager && typeof DungeonManager.getShardShopBonuses === "function")
      ? DungeonManager.getShardShopBonuses()
      : {};
    if (dungeonShopBonus.power) game.tapMult += dungeonShopBonus.power;
    if (dungeonShopBonus.gold) game.goldMult += dungeonShopBonus.gold;
    if (dungeonShopBonus.essence) game.essenceGlobalMult += dungeonShopBonus.essence;
    if (dungeonShopBonus.defense) {
      game.heroDefensePct = Math.min(HERO_DEFENSE_CAP, game.heroDefensePct + dungeonShopBonus.defense);
    }

    var AETHER_LIFETIME_MULT_COEF = 0.005;
    var totalAether = Number(game.totalAetherEarned || 0);
    game.tapMult += totalAether * AETHER_LIFETIME_MULT_COEF;
    game.goldMult += totalAether * AETHER_LIFETIME_MULT_COEF;
  },

        effectiveTapDamage: function () {
    var multiplied = game.tapDamage * game.tapMult;
    return Math.max(1, Math.floor(multiplied) + Math.floor(game.equipFlatTapBonus || 0));
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

    getActiveSetBonuses: function () {
    var slots = (typeof EQUIPMENT_SLOTS !== "undefined") ? EQUIPMENT_SLOTS : ["weapon", "armor", "amulet"];
    var equipped = slots.map(function (slot) { return game.equipped[slot]; }).filter(Boolean);

    var countByRarity = {};
    equipped.forEach(function (item) {
      countByRarity[item.rarity] = (countByRarity[item.rarity] || 0) + 1;
    });

    var bestRarity = null;
    var bestCount = 0;
    RARITY_ORDER.forEach(function (r) {
      var count = countByRarity[r] || 0;
      if (count >= bestCount) {
        bestCount = count;
        bestRarity = r;
      }
    });

    if (!bestRarity) return [];

    var tiers = (SET_BONUS_CONFIG && SET_BONUS_CONFIG.tiers) || [];
    var results = [];

    tiers.forEach(function (tier) {
      if (bestCount < tier.count) return;
      var baseConfig = (tier.bonuses && tier.bonuses[bestRarity]) || null;
      if (!baseConfig) return;

      var effect = typeof baseConfig.apply === "function" ? (baseConfig.apply() || {}) : {};
      results.push({
        rarity: bestRarity,
        count: tier.count,
        config: {
          name: baseConfig.name || ("Panoplie " + bestRarity + " (" + tier.count + ")"),
          apply: baseConfig.apply,
          effect: effect,
          text: formatSetBonusEffect(effect),
          pieces: bestCount,
          maxPieces: tier.count
        }
      });
    });

    return results;
  },

    getSetBonus: function () {
    var active = this.getActiveSetBonuses();
    if (!active.length) return { rarity: null, config: null };
    var best = active[active.length - 1];
    return { rarity: best.rarity, config: best.config };
  }
};

window.StatsSystem = StatsSystem;
window.getAetherUpgradeLevel = getAetherUpgradeLevel;
window.getAetherUpgradeCost = getAetherUpgradeCost;
window.getAetherBonuses = getAetherBonuses;
window.getAetherMult = getAetherMult;
window.getBestiaryBonus = getBestiaryBonus;
window.getTotalBestiaryBonus = getTotalBestiaryBonus;