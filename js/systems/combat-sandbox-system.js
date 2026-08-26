"use strict";
/* systems/combat-sandbox-system.js — logique de SIMULATION du bac à sable de combat (le plus gros fichier du projet).
   ISOLÉ : jamais game.*, jamais killEnemy()/combat-engine.js, données sources clonées (structuredClone).
   3 modes : combat unique (createSandboxCombatState) / Run (file d'ennemis, applySandboxRunAction) / Infini (boucle sur tout ENEMY_DB).
   NOTE : contenait un doublon de commentaire (createSandboxCombatState documentée intégralement 2×). Détail complet : COMMENTAIRES_ORIGINAUX.md */
var SANDBOX_HERO_BASE_COEFS = {
  FORCE_TAP_COEF: 0.2,
  PRECISION_CRIT_COEF: 0.06,
  WILL_CRIT_MULT_COEF: 0.01,
  ENDURANCE_HP_EXP: 0.75,
  ENDURANCE_HP_COEF: 17.716,
  HERO_DEFENSE_COEF: 0.002,
  CELERITY_DPS_COEF: 0.03,
  BASE_TAP_DAMAGE: 1,
  BASE_CRIT_CHANCE: 5,
  BASE_CRIT_MULT: 2
};

var SANDBOX_ENEMY_COEFS = {
  ENDURANCE_HP_COEF: 4.0,
  BOSS_ENDURANCE_HP_COEF: 6.7,
  PV_WORLD_EXP: 1.45,
  POWER_SCALE_EXP: 0.3,
  POWER_DMG_COEF: 0.5,
  ATTACK_BASE_INTERVAL_S: 3,
  RESIST_DMG_MULT: 0.7,
  WEAK_DMG_MULT: 1.3,
  NO_WEAPON_MULT: 0.8,
  WORLD_INDEX: 0,
  ADVENTURE_INDEX: 0,
  CYCLE_COUNT: 0
};

var SANDBOX_DEFAULT_BASE_COOLDOWN_MS = 1000;

var SANDBOX_WILL_COOLDOWN_MIN_RATIO = 0.5;

function getSandboxHeroBaseStats(heroId) {
  if (typeof HEROES_DB === "undefined" || !HEROES_DB || !heroId || !HEROES_DB[heroId]) return null;
  return structuredClone(HEROES_DB[heroId].stats || {});
}

// tapMultBonus (optionnel, défaut 0) : somme ADDITIVE des bonus de tapMult hors équipement
// (maîtrise d'arme + talents + ascension + Aether cumulé), au même format que les composantes
// internes de tapMult déjà sommées par recalcStats() — PAS un multiplicateur prêt à l'emploi
// (0.36 pour +36%, jamais 1.36), sous peine de compter deux fois l'équipement une fois combiné
// avec le tapMult calculé plus bas par applySandboxEquipmentBonus().
// perfectExecutionLevel (optionnel, défaut 0) : niveau du talent t_perfect_execution (0-3),
// répercuté à l'identique dans computeSandboxActionDamage() et applySandboxAutoDpsTick().
// survivalBonus (optionnel, objet {ascensionCount, hpMultBonus, defenseBonus, aetherVitalityLevel})
// : reproduit EXACTEMENT la chaîne multiplicative de recalcStats() (stats-system.js) sur les PV
// — base -> ×(1+ascension×0.04) -> ×(1+talents de survie) -> ×(1+Aether vitalité×0.10), chaque
// étape avec son propre Math.floor(), pour ne pas diverger d'un arrondi cumulé différent.
// defenseBonus est additif, même formule que recalcStats() (t_second_wind/t_vital_anchor/
// t_immutable_guardian).
function buildSandboxHeroStats(heroId, overrideStats, tapMultBonus, perfectExecutionLevel, survivalBonus) {
  if (typeof HEROES_DB === "undefined" || !HEROES_DB || !heroId || !HEROES_DB[heroId]) return null;
  var hero = structuredClone(HEROES_DB[heroId]);
  var baseStats = hero.stats || {};
  var override = (overrideStats && typeof overrideStats === "object") ? structuredClone(overrideStats) : null;
  var s = override ? Object.assign({}, baseStats, override) : baseStats;
  var c = SANDBOX_HERO_BASE_COEFS;
  var sv = (survivalBonus && typeof survivalBonus === "object") ? survivalBonus : {};

  var tapDamage = c.BASE_TAP_DAMAGE + (s.power || 0) * c.FORCE_TAP_COEF;
  var critChancePercent = c.BASE_CRIT_CHANCE + (s.precision || 0) * c.PRECISION_CRIT_COEF;
  var critChance = Math.min(1, Math.max(0, critChancePercent / 100));
  var critMult = c.BASE_CRIT_MULT + (s.will || 0) * c.WILL_CRIT_MULT_COEF;
  var autoDps = Math.max(0, (s.celerity || 0) * c.CELERITY_DPS_COEF);

  var maxHp = Math.max(1, Math.floor(Math.pow(Math.max(0, s.endurance || 0), c.ENDURANCE_HP_EXP) * c.ENDURANCE_HP_COEF));
  var ascCount = Math.max(0, Math.floor(Number(sv.ascensionCount) || 0));
  if (ascCount > 0) {
    maxHp = Math.max(1, Math.floor(maxHp * (1 + ascCount * 0.04)));
  }
  var hpMultBonus = Math.max(0, Number(sv.hpMultBonus) || 0);
  if (hpMultBonus) {
    maxHp = Math.max(1, Math.floor(maxHp * (1 + hpMultBonus)));
  }
  var aVitLevel = Math.max(0, Math.floor(Number(sv.aetherVitalityLevel) || 0));
  if (aVitLevel) {
    maxHp = Math.max(1, Math.floor(maxHp * (1 + aVitLevel * 0.10)));
  }

  var defensePct = (s.endurance || 0) * c.HERO_DEFENSE_COEF + Math.max(0, Number(sv.defenseBonus) || 0);

  return {
    heroId: heroId,
    name: hero.name,
    weaponType: hero.weaponType,
    stats: s,
    tapDamage: tapDamage,
    celerity: s.celerity || 0,
    critChance: critChance,
    critMult: critMult,
    maxHp: maxHp,
    hp: maxHp,
    defensePct: defensePct,
    autoDps: autoDps,
    nonEquipmentTapMultBonus: Math.max(0, Number(tapMultBonus) || 0),
    perfectExecutionLevel: Math.max(0, Math.min(3, Number(perfectExecutionLevel) || 0))
  };
}

// IMPORTANT : cette fonction doit etre appelee MEME sans equipement, sinon le
// nonEquipmentTapMultBonus (talents/ascension/Aether/maitrise) serait silencieusement perdu —
// il n'est consomme qu'ici. Avec rarity nulle, les totaux d'equipement restent a zero et seul
// le bonus hors equipement s'applique. La multiplication reste UNIQUE (1 + equip + horsEquip),
// comme recalcStats() qui somme toutes les sources avant de multiplier une seule fois.
function applySandboxEquipmentBonus(heroStats, rarity) {
  if (!heroStats) return heroStats;

  var hasRarity = !!(rarity && typeof rarity === "string")
    && typeof EQUIPMENT_SLOTS !== "undefined" && typeof EQUIPMENT_SLOT_CONFIG !== "undefined";

  if (!hasRarity) {
    var baseTapMult = 1 + (heroStats.nonEquipmentTapMultBonus || 0);
    return Object.assign({}, heroStats, {
      tapDamage: heroStats.tapDamage * baseTapMult,
      defensePct: Math.min(0.60, heroStats.defensePct),
      equipmentAutoDpsRef: 0,
      equipmentGoldMultRef: 1,
      equipmentRarity: null
    });
  }

  var totals = { tapDmg: 0, tapMult: 0, goldMult: 0, critChance: 0, critMult: 0, autoDps: 0, defense: 0 };

  EQUIPMENT_SLOTS.forEach(function (slot) {
    var config = EQUIPMENT_SLOT_CONFIG[slot];
    if (!config || !config.ranges || !config.ranges[rarity]) return;
    var range = config.ranges[rarity];
    var avgValue = (Number(range[0]) + Number(range[1])) / 2;
    if (totals.hasOwnProperty(config.stat)) totals[config.stat] += avgValue;
  });

  if (typeof SET_BONUS_CONFIG !== "undefined" && SET_BONUS_CONFIG.tiers) {
    SET_BONUS_CONFIG.tiers.forEach(function (tier) {
      var tierBonus = tier.bonuses && tier.bonuses[rarity];
      if (!tierBonus || typeof tierBonus.apply !== "function") return;
      var effect = tierBonus.apply() || {};
      if (effect.tapDamage != null) totals.tapDmg += effect.tapDamage;
      if (effect.tapMult != null) totals.tapMult += effect.tapMult;
      if (effect.goldMult != null) totals.goldMult += effect.goldMult;
      if (effect.critChance != null) totals.critChance += effect.critChance;
      if (effect.critMult != null) totals.critMult += effect.critMult;
      if (effect.autoDps != null) totals.autoDps += effect.autoDps;
    });
  }

  var tapMultTotal = 1 + totals.tapMult + (heroStats.nonEquipmentTapMultBonus || 0);
  var newTapDamage = heroStats.tapDamage * tapMultTotal + totals.tapDmg;

  var newCritChance = Math.min(1, Math.max(0, heroStats.critChance + totals.critChance / 100));
  var newCritMult = heroStats.critMult + totals.critMult;
  var newDefensePct = Math.min(0.60, heroStats.defensePct + totals.defense);
  var newAutoDps = Math.max(0, (heroStats.autoDps || 0) + totals.autoDps);

  return Object.assign({}, heroStats, {
    tapDamage: newTapDamage,
    critChance: newCritChance,
    critMult: newCritMult,
    defensePct: newDefensePct,
    autoDps: newAutoDps,
    equipmentAutoDpsRef: totals.autoDps,
    equipmentGoldMultRef: 1 + totals.goldMult,
    equipmentRarity: rarity
  });
}

function buildSandboxEnemyStats(enemyId, overrideCoefs, archetypeOverride) {
  if (!enemyId) return null;
  var isBoss = false;
  var source = null;

  if (typeof ENEMY_DB !== "undefined" && ENEMY_DB && ENEMY_DB[enemyId]) {
    source = ENEMY_DB[enemyId];
  } else if (typeof BOSS_DB !== "undefined" && BOSS_DB && BOSS_DB[enemyId]) {
    source = BOSS_DB[enemyId];
    isBoss = true;
  }
  if (!source) return null;

  var enemy = structuredClone(source);
  var s = enemy.stats || {};
  var c = Object.assign({}, SANDBOX_ENEMY_COEFS, overrideCoefs || {});

  var worldIndex = Number(c.WORLD_INDEX || 0);
  var adventureIndex = Number(c.ADVENTURE_INDEX || 0);
  var cycleCount = Number(c.CYCLE_COUNT || 0);
  var worldExp = (typeof c.PV_WORLD_EXP === "number") ? c.PV_WORLD_EXP : 1;

  var scale, hpCoef;
  if (isBoss) {
    var bossWorldComponent = Math.pow(1 + worldIndex * 1.3, worldExp);
    scale = bossWorldComponent + adventureIndex * 0.4 + cycleCount * 0.7;
    hpCoef = c.BOSS_ENDURANCE_HP_COEF;
  } else {
    var worldComponent = Math.pow(1 + worldIndex * 0.90, worldExp);
    scale = worldComponent + adventureIndex * 0.30 + cycleCount * 0.45;
    hpCoef = c.ENDURANCE_HP_COEF;
  }

  var maxHp = Math.max(1, Math.floor((s.endurance || 0) * hpCoef * scale));

  var powerExp = (typeof c.POWER_SCALE_EXP === "number") ? c.POWER_SCALE_EXP : 0;
  var scaledPower = (s.power || 0) * Math.pow(scale, powerExp);

  var attackIntervalS = c.ATTACK_BASE_INTERVAL_S / (1 + (s.celerity || 0) / 40);

  var archetype = resolveSandboxEnemyArchetype(isBoss, worldIndex, archetypeOverride);

  return {
    enemyId: enemyId,
    name: enemy.name,
    asset: enemy.asset,
    isBoss: isBoss,
    archetype: archetype,
    corruptedStacks: 0,
    resists: enemy.resists || [],
    weak: enemy.weak || [],
    stats: s,
    power: scaledPower,
    maxHp: maxHp,
    hp: maxHp,
    attackIntervalS: attackIntervalS
  };
}

var SANDBOX_ARCHETYPE_CHOICES = ["none", "random", "enraged", "corrupted", "vampiric", "armored", "silenced"];
var SANDBOX_BOSS_ONLY_ARCHETYPES = ["enraged", "corrupted", "vampiric", "armored"];

// "random" reproduit le tirage réel (decideEnemyArchetype/decideNormalEnemyArchetype).
// Une valeur forcée respecte la même contrainte boss/normal que le vrai jeu (sinon null).
function resolveSandboxEnemyArchetype(isBoss, worldIndex, archetypeOverride) {
  if (archetypeOverride === "none") return null;

  if (archetypeOverride && SANDBOX_ARCHETYPE_CHOICES.indexOf(archetypeOverride) !== -1 && archetypeOverride !== "random") {
    var isBossOnly = SANDBOX_BOSS_ONLY_ARCHETYPES.indexOf(archetypeOverride) !== -1;
    if (isBossOnly && !isBoss) return null;
    if (!isBossOnly && isBoss) return null; // silenced = ennemi normal uniquement
    return archetypeOverride;
  }

  if (isBoss && typeof decideEnemyArchetype === "function") {
    return decideEnemyArchetype(worldIndex, true, Math.floor(Math.random() * 100) + 1, Math.floor(Math.random() * 100) + 1);
  }
  if (!isBoss && typeof decideNormalEnemyArchetype === "function") {
    return decideNormalEnemyArchetype(worldIndex, false, Math.floor(Math.random() * 100) + 1);
  }
  return null;
}

function listSandboxEnemies() {
  var list = [];
  if (typeof ENEMY_DB !== "undefined" && ENEMY_DB) {
    Object.keys(ENEMY_DB).forEach(function (id) {
      list.push({ id: id, name: ENEMY_DB[id].name, isBoss: false });
    });
  }
  if (typeof BOSS_DB !== "undefined" && BOSS_DB) {
    Object.keys(BOSS_DB).forEach(function (id) {
      list.push({ id: id, name: BOSS_DB[id].name, isBoss: true });
    });
  }
  return list.sort(function (a, b) { return a.name.localeCompare(b.name, "fr"); });
}

function listSandboxAllEnemiesInOrder() {
  if (typeof ENEMY_DB === "undefined" || !ENEMY_DB) return [];
  var ordered = [];
  var seen = {};

  if (typeof WORLDS !== "undefined" && WORLDS) {
    WORLDS.forEach(function (world) {
      (world.adventures || []).forEach(function (adv) {
        (adv.enemyPool || []).forEach(function (id) {
          if (!seen[id] && ENEMY_DB[id]) {
            seen[id] = true;
            ordered.push(id);
          }
        });
      });
    });
  }

  Object.keys(ENEMY_DB).forEach(function (id) {
    if (!seen[id]) {
      seen[id] = true;
      ordered.push(id);
    }
  });

  return ordered;
}

function listSandboxZones() {
  if (typeof WORLDS === "undefined" || !WORLDS) return [];
  var zones = [];
  WORLDS.forEach(function (world) {
    (world.adventures || []).forEach(function (adv) {
      zones.push({
        worldId: world.id,
        worldName: world.name,
        adventureId: adv.id,
        adventureName: adv.name,
        enemyPool: (adv.enemyPool || []).slice(),
        boss: adv.boss || null
      });
    });
  });
  return zones;
}

function buildSandboxQueueFromZone(worldId, adventureId) {
  var zones = listSandboxZones();
  var zone = zones.filter(function (z) { return z.worldId === worldId && z.adventureId === adventureId; })[0];
  if (!zone) return [];

  var queue = zone.enemyPool.filter(function (id) {
    return typeof ENEMY_DB !== "undefined" && ENEMY_DB && !!ENEMY_DB[id];
  });
  if (zone.boss && typeof BOSS_DB !== "undefined" && BOSS_DB && BOSS_DB[zone.boss]) {
    queue.push(zone.boss);
  }
  return queue;
}

function getDamageAffinityMult(weaponType, resists, weak, overrideCoefs) {
  var c = Object.assign({}, SANDBOX_ENEMY_COEFS, overrideCoefs || {});
  if (!weaponType) return c.NO_WEAPON_MULT;
  if ((resists || []).indexOf(weaponType) !== -1) return c.RESIST_DMG_MULT;
  if ((weak || []).indexOf(weaponType) !== -1) return c.WEAK_DMG_MULT;
  return 1;
}

function createSandboxCombatState(classId, heroId, enemyId, overrideStats, baseCooldownMs, overrideEnemyCoefs, equipmentRarity, archetypeOverride, tapMultBonus, perfectExecutionLevel, survivalBonus) {
  if (typeof getClassByHeroId !== "function" || typeof getClassSkills !== "function") return null;
  if (typeof createCombatResourceState !== "function" || typeof createCooldownState !== "function") return null;

  var cls = getClassByHeroId(heroId);
  if (!cls || cls.id !== classId) return null;

  var kit = getClassSkills(classId);
  if (!kit) return null;

  var heroStats = buildSandboxHeroStats(heroId, overrideStats, tapMultBonus, perfectExecutionLevel, survivalBonus);
  if (heroStats) heroStats = applySandboxEquipmentBonus(heroStats, equipmentRarity);
  var enemyStats = buildSandboxEnemyStats(enemyId, overrideEnemyCoefs, archetypeOverride);
  if (!heroStats || !enemyStats) return null;

  var resourceState = createCombatResourceState(classId);
  if (!resourceState) return null;

  var effectiveBaseCooldownMs = (typeof baseCooldownMs === "number" && baseCooldownMs >= 0)
    ? baseCooldownMs
    : SANDBOX_DEFAULT_BASE_COOLDOWN_MS;

  return {
    classId: classId,
    heroId: heroId,
    enemyId: enemyId,
    hero: heroStats,
    enemy: enemyStats,
    enemyCoefs: (overrideEnemyCoefs && typeof overrideEnemyCoefs === "object") ? structuredClone(overrideEnemyCoefs) : null,
    resourceState: resourceState,
    cooldownState: createCooldownState(),
    baseCooldownMs: effectiveBaseCooldownMs,
    enemyAttackTimerMs: enemyStats.attackIntervalS * 1000,
    activeDefense: null,
    heroSilencedUntilMs: 0,
    totalDamageAvoided: 0,
    archetypeImpact: {
      enragedBonusDamageTaken: 0,
      vampiricHealStolen: 0,
      corruptedDamageLost: 0,
      armoredDamageLost: 0
    },
    status: "ongoing",
    elapsedMs: 0,
    actionsUsed: 0,
    log: []
  };
}

function appendSandboxLog(state, message) {
  if (!state) return state;
  var entry = { atMs: state.elapsedMs, text: String(message == null ? "" : message) };
  return Object.assign({}, state, { log: state.log.concat([entry]) });
}

function computeSandboxActionDamage(state, action) {
  if (!state || !action || action.type !== "damage" || typeof action.damageMultiplier !== "number") {
    return { totalDamage: 0, anyCritical: false, hitsDamage: [], lastHitDmg: 0, archetypeImpact: {} };
  }
  var hero = state.hero;
  var enemy = state.enemy;
  var affinityMult = action.ignoreAffinity ? 1 : getDamageAffinityMult(hero.weaponType, enemy.resists, enemy.weak, state.enemyCoefs);
  var hits = Math.max(1, action.hits || 1);
  var hitsDamage = [];
  var anyCritical = false;
  var corruptedLost = 0;
  var armoredLost = 0;
  var lastHitDmg = 0;

  // Pénalité de critique du héros liée à la Volonté ennemie — WILL_CRIT_RESIST_COEF,
  // identique à getEnemyWillCritPenalty() du vrai moteur (combat-engine.js).
  var willCritResistCoef = (typeof WILL_CRIT_RESIST_COEF === "number") ? WILL_CRIT_RESIST_COEF : 0.05;
  var enemyWillCritPenaltyPct = Number((enemy.stats && enemy.stats.will) || 0) * willCritResistCoef;
  var effectiveCritChancePct = Math.max(0, (hero.critChance * 100) - enemyWillCritPenaltyPct);

  for (var i = 0; i < hits; i++) {
    var isCritical = (typeof chance === "function") ? chance(effectiveCritChancePct) : Math.random() < hero.critChance;
    if (isCritical) anyCritical = true;
    var base = hero.tapDamage * action.damageMultiplier * affinityMult;
    var dmg = Math.max(1, Math.floor(isCritical ? base * hero.critMult : base));

    if (enemy.vulnerableUntilMs && state.elapsedMs < enemy.vulnerableUntilMs) {
      dmg = Math.max(1, Math.floor(dmg * (1 + Number(enemy.vulnerableMult || 0))));
    }

    if (enemy.isBoss && enemy.shieldActiveUntilMs && state.elapsedMs < enemy.shieldActiveUntilMs && typeof BOSS_SHIELD_REDUCTION === "number") {
      dmg = Math.max(1, Math.floor(dmg * (1 - BOSS_SHIELD_REDUCTION)));
    }

    if (enemy.archetype === "corrupted" && typeof getCorruptedDamageMultiplier === "function") {
      var preCorrupted = dmg;
      dmg = Math.max(1, Math.floor(dmg * getCorruptedDamageMultiplier(enemy.corruptedStacks || 0)));
      corruptedLost += preCorrupted - dmg;
    }
    if (enemy.archetype === "armored") {
      var preArmored = dmg;
      dmg = Math.max(1, Math.floor(dmg * (1 - getSandboxArmoredEffectiveDamageReduction(enemy, state.elapsedMs))));
      armoredLost += preArmored - dmg;
    }

    if (hero.perfectExecutionLevel > 0 && enemy.isBoss && enemy.maxHp > 0 && (enemy.hp / enemy.maxHp) < 0.2) {
      dmg = Math.max(1, Math.floor(dmg * (1 + 0.15 * hero.perfectExecutionLevel)));
    }

    hitsDamage.push(dmg);
    lastHitDmg = dmg;
  }

  var totalDamage = hitsDamage.reduce(function (sum, d) { return sum + d; }, 0);
  return {
    totalDamage: totalDamage,
    anyCritical: anyCritical,
    hitsDamage: hitsDamage,
    lastHitDmg: lastHitDmg,
    archetypeImpact: { corruptedDamageLost: corruptedLost, armoredDamageLost: armoredLost }
  };
}

// Cap de défense du héros : 60% normalement, 85% avec une défense active en cours
// (identique à defenseCapNow du vrai moteur, combat-engine.js/enemyStrike).
var SANDBOX_HERO_DEFENSE_CAP_BASE = 0.6;
var SANDBOX_HERO_DEFENSE_CAP_WITH_ACTIVE_DEFENSE = 0.85;

function resolveSandboxEnemyStrike(state, dmgMult) {
  if (!state) return { damage: 0, avoided: 0, enragedBonusDamageTaken: 0 };
  var c = Object.assign({}, SANDBOX_ENEMY_COEFS, state.enemyCoefs || {});
  var raw = state.enemy.power * c.POWER_DMG_COEF * (typeof dmgMult === "number" ? dmgMult : 1);

  var enragedBonus = 0;
  if (state.enemy.archetype === "enraged" && typeof getEnragedDamageMultiplier === "function" && state.enemy.maxHp > 0) {
    var isRageFrozen = !!(state.enemy.rageFreezeUntilMs && state.elapsedMs < state.enemy.rageFreezeUntilMs);
    var pctHpLost = isRageFrozen ? Number(state.enemy.rageFrozenPct || 0) : (1 - (state.enemy.hp / state.enemy.maxHp));
    var enragedMult = getEnragedDamageMultiplier(pctHpLost);
    if (enragedMult !== 1) {
      var preEnraged = raw;
      raw = raw * enragedMult;
      enragedBonus = raw - preEnraged;
    }
  }

  // Critique de l'ennemi (Précision, plafonné à 40%, multiplicateur fixe) — identique
  // au vrai moteur, absent du sandbox jusqu'ici.
  var precisionCritCoef = (typeof ENEMY_PRECISION_CRIT_COEF === "number") ? ENEMY_PRECISION_CRIT_COEF : 0.3;
  var enemyCritMult = (typeof ENEMY_CRIT_MULT === "number") ? ENEMY_CRIT_MULT : 1.5;
  var enemyCritChancePct = Math.min(40, Number((state.enemy.stats && state.enemy.stats.precision) || 0) * precisionCritCoef);
  var isEnemyCrit = (typeof chance === "function") ? chance(enemyCritChancePct) : false;
  if (isEnemyCrit) raw = raw * enemyCritMult;

  var activeDefense = state.activeDefense;
  var isDefenseActive = !!(activeDefense && state.elapsedMs < activeDefense.expiresAtMs);
  var defenseCap = isDefenseActive ? SANDBOX_HERO_DEFENSE_CAP_WITH_ACTIVE_DEFENSE : SANDBOX_HERO_DEFENSE_CAP_BASE;
  var effectiveDefensePct = Math.min(defenseCap, state.hero.defensePct);
  var afterDefensePct = Math.max(1, Math.floor(raw * (1 - effectiveDefensePct)));

  var damageWithoutActiveDefense = afterDefensePct;
  var damage = afterDefensePct;
  var avoided = 0;

  if (isDefenseActive) {
    if (activeDefense.effectType === "damageReduction" || activeDefense.effectType === "damageAbsorption") {
      damage = Math.max(0, Math.floor(afterDefensePct * (1 - activeDefense.value)));
      avoided = Math.max(0, damageWithoutActiveDefense - damage);
    } else if (activeDefense.effectType === "evasion") {
      if ((typeof chance === "function") ? chance(activeDefense.value * 100) : false) {
        damage = 0;
        avoided = damageWithoutActiveDefense;
      }
    }
  }
  damage = Math.max(damage > 0 ? 1 : 0, damage);

  return { damage: damage, avoided: avoided, enragedBonusDamageTaken: Math.max(0, Math.floor(enragedBonus * (1 - effectiveDefensePct))) };
}

function triggerSandboxEnemyStrike(state, dmgMult) {
  var strike = resolveSandboxEnemyStrike(state, dmgMult);
  var nextEnemy = Object.assign({}, state.enemy);

  var isVampiricSuppressed = !!(nextEnemy.vampiricSuppressedUntilMs && state.elapsedMs < nextEnemy.vampiricSuppressedUntilMs);
  if (nextEnemy.archetype === "vampiric" && !isVampiricSuppressed && strike.damage > 0 && typeof getVampiricLifestealAmount === "function") {
    var healed = getVampiricLifestealAmount(strike.damage);
    if (healed > 0) nextEnemy.hp = Math.min(nextEnemy.maxHp, nextEnemy.hp + healed);
    strike.vampiricHealStolen = healed;
  }

  if (nextEnemy.archetype === "corrupted") {
    var maxStacks = (typeof CORRUPTED_MAX_STACKS === "number") ? CORRUPTED_MAX_STACKS : 5;
    nextEnemy.corruptedStacks = Math.min(maxStacks, (nextEnemy.corruptedStacks || 0) + 1);
  }

  var next = Object.assign({}, state, {
    hero: Object.assign({}, state.hero, {
      hp: Math.max(0, state.hero.hp - strike.damage)
    }),
    enemy: nextEnemy,
    totalDamageAvoided: (state.totalDamageAvoided || 0) + strike.avoided,
    archetypeImpact: {
      enragedBonusDamageTaken: (state.archetypeImpact ? state.archetypeImpact.enragedBonusDamageTaken : 0) + (strike.enragedBonusDamageTaken || 0),
      vampiricHealStolen: (state.archetypeImpact ? state.archetypeImpact.vampiricHealStolen : 0) + (strike.vampiricHealStolen || 0),
      corruptedDamageLost: (state.archetypeImpact ? state.archetypeImpact.corruptedDamageLost : 0),
      armoredDamageLost: (state.archetypeImpact ? state.archetypeImpact.armoredDamageLost : 0)
    }
  });
  var logLine = next.enemy.name + " attaque → " + strike.damage + " dégâts au héros de test.";
  if (strike.avoided > 0) {
    logLine += " (" + strike.avoided + " dégâts évités grâce à " + state.activeDefense.sourceLabel + ")";
  }
  if (strike.vampiricHealStolen > 0) {
    logLine += " (🧛 " + strike.vampiricHealStolen + " PV volés)";
  }
  next = appendSandboxLog(next, logLine);

  if (window.SandboxReportManager) {
    if (strike.enragedBonusDamageTaken > 0) next = SandboxReportManager.logArchetypeImpact(next, "enragedBonusDamageTaken", strike.enragedBonusDamageTaken);
    if (strike.vampiricHealStolen > 0) next = SandboxReportManager.logArchetypeImpact(next, "vampiricHealStolen", strike.vampiricHealStolen);
  }

  if (next.hero.hp <= 0) {
    next.status = "defeat";
    next = appendSandboxLog(next, "💀 Défaite — le héros de test tombe.");
    return finalizeSandboxCombat(next);
  }
  return next;
}

// Équivalent pur de ClassCombatManager.getGrimoireCombatContext() (combat-engine.js/
// class-combat-system.js), construit depuis le state sandbox au lieu de game.*.
function buildSandboxCombatContext(state) {
  var enemy = state.enemy || {};
  var heroMaxHp = Number(state.hero.maxHp || 0);

  return {
    enemyHp: enemy.hp,
    enemyMaxHp: enemy.maxHp,
    isSilenced: !!(state.heroSilencedUntilMs && state.elapsedMs < state.heroSilencedUntilMs),
    chargeIncoming: !!(enemy.chargeTelegraphUntilMs && state.elapsedMs < enemy.chargeTelegraphUntilMs),
    shieldIncoming: !!(enemy.shieldTelegraphUntilMs && state.elapsedMs < enemy.shieldTelegraphUntilMs),
    healIncoming: !!(enemy.healTelegraphUntilMs && state.elapsedMs < enemy.healTelegraphUntilMs),
    enemySilenceIncoming: !!(enemy.silenceTelegraphUntilMs && state.elapsedMs < enemy.silenceTelegraphUntilMs),
    heroHpPercent: heroMaxHp > 0 ? Number(state.hero.hp || 0) / heroMaxHp : null,
    secondsUntilEnemyAttack: (typeof state.enemyAttackTimerMs === "number") ? Math.max(0, state.enemyAttackTimerMs / 1000) : null,
    enemyArchetype: enemy.archetype || null
  };
}

function applySandboxAction(state, actionSlot, matchedConditionId) {
  if (!state) return state;
  if (state.status !== "ongoing") {
    return appendSandboxLog(state, "Combat déjà terminé — relance un combat pour continuer.");
  }

  var kit = getClassSkills(state.classId);
  var action = kit ? kit.actions[actionSlot] : null;
  if (!action) {
    return appendSandboxLog(state, "Action inconnue (" + actionSlot + ").");
  }

  var combatContext = buildSandboxCombatContext(state);

  if (!canUseAction(state.resourceState, state.cooldownState, action, combatContext)) {
    var reason = "indisponible";
    if (!canAfford(state.resourceState, action.resourceCost)) reason = "ressource insuffisante";
    else if (!isCooldownReady(state.cooldownState, action.id)) reason = "en recharge";
    else if (combatContext.isSilenced && action.slot !== "defense") reason = "héros silencié";
    else if (!checkActionConditions(action.conditions, combatContext)) reason = "condition non remplie";
    return appendSandboxLog(state, action.label + " refusé (" + reason + ").");
  }

  var next = Object.assign({}, state);
  next.actionsUsed = state.actionsUsed + 1;

  var useResult = useAction(state.resourceState, state.cooldownState, action, combatContext);
  next.resourceState = useResult.resourceState;
  next.cooldownState = useResult.cooldownState;

  if (actionSlot === "basic" && typeof computeEffectiveCooldownMs === "function") {
    var effectiveBasicCooldownMs = computeEffectiveCooldownMs(state.baseCooldownMs, next.hero.celerity);
    next.cooldownState = startCooldown(next.cooldownState, action.id, effectiveBasicCooldownMs);
  }

  if (actionSlot !== "basic" && action.cooldownMs > 0 && typeof computeEffectiveCooldownMs === "function") {
    var reducedSkillCooldownMs = computeEffectiveCooldownMs(action.cooldownMs, next.hero.stats.will, { minRatio: SANDBOX_WILL_COOLDOWN_MIN_RATIO });
    next.cooldownState = startCooldown(next.cooldownState, action.id, reducedSkillCooldownMs);
  }

  var logLine = action.label;
  var isCritical = false;
  var damageDealt = 0;

  if (window.SandboxReportManager) next = SandboxReportManager.logUsage(next, actionSlot);
  next = applySandboxGrimoireCounterIfApplicable(next, action, matchedConditionId, actionSlot);

  if (action.type === "damage") {
    var dmgResult = computeSandboxActionDamage(next, action);
    isCritical = dmgResult.anyCritical;
    damageDealt = dmgResult.totalDamage;
    next.enemy = Object.assign({}, next.enemy, {
      hp: Math.max(0, next.enemy.hp - damageDealt)
    });
    next.archetypeImpact = {
      enragedBonusDamageTaken: next.archetypeImpact ? next.archetypeImpact.enragedBonusDamageTaken : 0,
      vampiricHealStolen: next.archetypeImpact ? next.archetypeImpact.vampiricHealStolen : 0,
      corruptedDamageLost: (next.archetypeImpact ? next.archetypeImpact.corruptedDamageLost : 0) + dmgResult.archetypeImpact.corruptedDamageLost,
      armoredDamageLost: (next.archetypeImpact ? next.archetypeImpact.armoredDamageLost : 0) + dmgResult.archetypeImpact.armoredDamageLost
    };
    if (window.SandboxReportManager) {
      next = SandboxReportManager.logDamageDealt(next, damageDealt);
      if (dmgResult.archetypeImpact.corruptedDamageLost > 0) next = SandboxReportManager.logArchetypeImpact(next, "corruptedDamageLost", dmgResult.archetypeImpact.corruptedDamageLost);
      if (dmgResult.archetypeImpact.armoredDamageLost > 0) next = SandboxReportManager.logArchetypeImpact(next, "armoredDamageLost", dmgResult.archetypeImpact.armoredDamageLost);
    }
    logLine += " → " + damageDealt + " dégâts" + (isCritical ? " (critique)" : "");
    next = applySandboxActionEffects(next, action, dmgResult.lastHitDmg, matchedConditionId);
  } else if (action.type === "defense") {
    var defenseEffect = (action.effects && action.effects[0]) || null;
    if (defenseEffect && defenseEffect.durationMs) {
      next.activeDefense = {
        effectType: defenseEffect.type, // "damageReduction" | "evasion" | "damageAbsorption"
        value: Math.min(1, Number(defenseEffect.value || 0)),
        expiresAtMs: next.elapsedMs + Number(defenseEffect.durationMs || 0),
        sourceLabel: action.label,
        sourceSlot: actionSlot
      };
      logLine += " → posture défensive activée (" + Math.round(defenseEffect.value * 100) + "% " + (defenseEffect.type === "evasion" ? "de chance d'esquive totale" : "de réduction") + ", " + (defenseEffect.durationMs / 1000) + "s)";
    } else {
      logLine += " → posture défensive activée";
    }
    next = applySandboxActionEffects(next, action, 0, matchedConditionId);
  }

  var resourceDef = getClassResource(state.classId);
  if (resourceDef && resourceDef.generation) {
    var gainContext = {
      damageDealt: damageDealt,
      isCritical: isCritical,
      isBasicAttack: actionSlot === "basic"
    };
    var beforeGain = next.resourceState.current;
    next.resourceState = applyResourceGain(next.resourceState, resourceDef.generation, gainContext);
    var gained = next.resourceState.current - beforeGain;
    if (gained > 0) {
      logLine += " (+" + (Math.round(gained * 100) / 100) + " " + resourceDef.label + ")";
    }
  }

  next = appendSandboxLog(next, logLine);

  if (next.enemy.hp <= 0) {
    next.status = "victory";
    next = appendSandboxLog(next, "🏆 Victoire — l'ennemi de test est vaincu.");
    return finalizeSandboxCombat(next);
  }

  return next;
}

function finalizeSandboxCombat(state) {
  if (!state || state.status === "ongoing") return state;
  var resourceDef = getClassResource(state.classId);
  var wasted = Math.round((state.resourceState.current || 0) * 100) / 100;
  var summary = "Résumé — " + state.actionsUsed + " action(s) utilisée(s), " +
    wasted + " " + (resourceDef ? resourceDef.label : "ressource") + " restante(s) inutilisée(s).";
  return appendSandboxLog(state, summary);
}

// Équivalent de CombatEngine.autoAttack() + dealDamage() (systems/combat-engine.js) : dégâts
// continus proportionnels au temps écoulé, MÊME chemin de modificateurs et MÊME ordre que
// dealDamage() — affinité d'arme, réduction de Corruption, vulnérabilité, bouclier de boss,
// armure, puis talent Exécution parfaite. Peut tuer l'ennemi, comme un dégât normal.
function applySandboxAutoDpsTick(state, elapsedMs) {
  if (!state.enemy || !state.hero) return state;
  var dps = Number(state.hero.autoDps || 0);
  if (dps <= 0) return state;

  var dmg = dps * (elapsedMs / 1000);
  if (dmg <= 0) return state;

  dmg *= getDamageAffinityMult(state.hero.weaponType, state.enemy.resists, state.enemy.weak, state.enemyCoefs);

  var corruptedLost = 0;
  if (state.enemy.archetype === "corrupted" && typeof getCorruptedDamageMultiplier === "function") {
    var preCorrupted = dmg;
    dmg *= getCorruptedDamageMultiplier(state.enemy.corruptedStacks || 0);
    corruptedLost = preCorrupted - dmg;
  }

  if (state.enemy.vulnerableUntilMs && state.elapsedMs < state.enemy.vulnerableUntilMs) {
    dmg *= (1 + Number(state.enemy.vulnerableMult || 0));
  }

  if (state.enemy.isBoss && state.enemy.shieldActiveUntilMs && state.elapsedMs < state.enemy.shieldActiveUntilMs && typeof BOSS_SHIELD_REDUCTION === "number") {
    dmg *= (1 - BOSS_SHIELD_REDUCTION);
  }

  var armoredLost = 0;
  if (state.enemy.archetype === "armored") {
    var preArmored = dmg;
    dmg *= (1 - getSandboxArmoredEffectiveDamageReduction(state.enemy, state.elapsedMs));
    armoredLost = preArmored - dmg;
  }

  if (state.hero.perfectExecutionLevel > 0 && state.enemy.isBoss && state.enemy.maxHp > 0 && (state.enemy.hp / state.enemy.maxHp) < 0.2) {
    dmg *= (1 + 0.15 * state.hero.perfectExecutionLevel);
  }

  dmg = Math.max(0, Math.floor(dmg));
  if (dmg <= 0) return state;

  var next = Object.assign({}, state, {
    enemy: Object.assign({}, state.enemy, { hp: Math.max(0, state.enemy.hp - dmg) })
  });
  next.archetypeImpact = {
    enragedBonusDamageTaken: next.archetypeImpact ? next.archetypeImpact.enragedBonusDamageTaken : 0,
    vampiricHealStolen: next.archetypeImpact ? next.archetypeImpact.vampiricHealStolen : 0,
    corruptedDamageLost: (next.archetypeImpact ? next.archetypeImpact.corruptedDamageLost : 0) + corruptedLost,
    armoredDamageLost: (next.archetypeImpact ? next.archetypeImpact.armoredDamageLost : 0) + armoredLost
  };
  if (window.SandboxReportManager) {
    next = SandboxReportManager.logDamageDealt(next, dmg);
    if (corruptedLost > 0) next = SandboxReportManager.logArchetypeImpact(next, "corruptedDamageLost", corruptedLost);
    if (armoredLost > 0) next = SandboxReportManager.logArchetypeImpact(next, "armoredDamageLost", armoredLost);
  }

  if (next.enemy.hp <= 0) {
    next.status = "victory";
    next = appendSandboxLog(next, "🏆 Victoire — l'ennemi de test succombe à l'auto-DPS.");
    return finalizeSandboxCombat(next);
  }
  return next;
}

function tickSandboxTime(state, elapsedMs) {
  if (!state || state.status !== "ongoing") return state;
  var elapsed = (typeof elapsedMs === "number" && elapsedMs > 0) ? elapsedMs : 0;
  if (elapsed <= 0) return Object.assign({}, state);

  var resourceDef = getClassResource(state.classId);
  var next = Object.assign({}, state);
  next.elapsedMs = state.elapsedMs + elapsed;
  next.cooldownState = tickCooldowns(state.cooldownState, elapsed);
  if (resourceDef && resourceDef.generation) {
    next.resourceState = tickResourceRegen(state.resourceState, resourceDef.generation, elapsed);
  }

  if (next.activeDefense && next.elapsedMs >= next.activeDefense.expiresAtMs) {
    next.activeDefense = null;
  }

  next = applySandboxAutoDpsTick(next, elapsed);
  if (next.status !== "ongoing") return next;

  next = tickSandboxDoT(next, elapsed);
  if (next.status !== "ongoing") return next;

  next = tickSandboxEnemyPatterns(next, elapsed);
  if (next.status !== "ongoing") return next;

  var remaining = (typeof next.enemyAttackTimerMs === "number") ? next.enemyAttackTimerMs - elapsed : -1;
  var fullIntervalMs = next.enemy.attackIntervalS * 1000;
  var guard = 0;
  while (remaining <= 0 && next.status === "ongoing" && guard < 1000) {
    next = triggerSandboxEnemyStrike(next);
    remaining += fullIntervalMs > 0 ? fullIntervalMs : 1;
    guard++;
  }
  if (next.status === "ongoing") {
    next.enemyAttackTimerMs = remaining;
  }

  return next;
}

// Équivalent de ClassCombatManager.tickDoT() — tick toutes les 1000ms accumulées
// (pas à chaque frame), peut tuer l'ennemi comme un dégât normal (dealDamage réel).
function tickSandboxDoT(state, elapsedMs) {
  if (!state.enemy || !state.enemy.dot) return state;

  var dot = Object.assign({}, state.enemy.dot);
  dot.accumMs = Number(dot.accumMs || 0) + elapsedMs;
  dot.remainingMs = Number(dot.remainingMs || 0) - elapsedMs;

  var next = Object.assign({}, state, { enemy: Object.assign({}, state.enemy, { dot: dot }) });
  var guard = 0;
  while (dot.accumMs >= 1000 && guard < 10 && next.status === "ongoing") {
    dot.accumMs -= 1000;
    guard++;
    var dmg = Math.max(0, Math.floor(dot.perTickDamage));
    if (dmg > 0) {
      next = Object.assign({}, next, { enemy: Object.assign({}, next.enemy, { hp: Math.max(0, next.enemy.hp - dmg) }) });
      if (window.SandboxReportManager) next = SandboxReportManager.logDamageDealt(next, dmg);
      next = appendSandboxLog(next, "🔥 Brûlure sur " + next.enemy.name + " → " + dmg + " dégâts.");
    }
    if (next.enemy.hp <= 0) {
      next.status = "victory";
      next = appendSandboxLog(next, "🏆 Victoire — l'ennemi de test succombe à la brûlure.");
      return finalizeSandboxCombat(next);
    }
  }

  if (dot.remainingMs <= 0) {
    next = Object.assign({}, next, { enemy: Object.assign({}, next.enemy) });
    delete next.enemy.dot;
  } else {
    next = Object.assign({}, next, { enemy: Object.assign({}, next.enemy, { dot: dot }) });
  }

  return next;
}

// Réplique des 4 patterns télégraphés du vrai moteur (Charge/Bouclier/Soin/Silence,
// combat-engine.js), adaptés au temps simulé (state.elapsedMs) plutôt qu'à Date.now().
// Charge = ennemi normal, Bouclier+Soin = boss, Silence = ennemi normal Silencié.
function tickSandboxEnemyPatterns(state, elapsedS) {
  var next = state;
  if (!next.enemy) return next;

  if (!next.enemy.isBoss && next.enemy.archetype !== "silenced") {
    next = tickSandboxChargePattern(next, elapsedS);
  }
  if (!next.enemy.isBoss && next.enemy.archetype === "silenced") {
    next = tickSandboxSilencePattern(next, elapsedS);
  }
  if (next.enemy.isBoss) {
    next = tickSandboxShieldPattern(next, elapsedS);
    if (next.status === "ongoing") next = tickSandboxHealPattern(next, elapsedS);
  }
  return next;
}

function tickSandboxChargePattern(state, elapsedS) {
  var enemy = Object.assign({}, state.enemy);
  var next = Object.assign({}, state, { enemy: enemy });

  if (enemy.chargeTelegraphUntilMs) {
    if (next.elapsedMs >= enemy.chargeTelegraphUntilMs) {
      enemy.chargeTelegraphUntilMs = 0;
      enemy._chargeNextAt = randSandboxFloat(ENEMY_CHARGE_MIN_INTERVAL_S, ENEMY_CHARGE_MAX_INTERVAL_S);
      enemy._chargeTimer = 0;
      if (window.SandboxReportManager) next = SandboxReportManager.logCounterExpired(next, "chargeIncoming");
      return triggerSandboxEnemyStrike(next, ENEMY_CHARGE_DMG_MULT);
    }
    return next;
  }

  if (!enemy._chargeNextAt) enemy._chargeNextAt = randSandboxFloat(ENEMY_CHARGE_MIN_INTERVAL_S, ENEMY_CHARGE_MAX_INTERVAL_S);
  enemy._chargeTimer = Number(enemy._chargeTimer || 0) + elapsedS / 1000;

  if (enemy._chargeTimer >= enemy._chargeNextAt) {
    enemy._chargeTimer = 0;
    enemy._chargeNextAt = 0;
    enemy.chargeTelegraphUntilMs = next.elapsedMs + ENEMY_CHARGE_TELEGRAPH_MS;
    next = appendSandboxLog(next, "⚠️ " + enemy.name + " prépare une charge !");
    if (window.SandboxReportManager) next = SandboxReportManager.logTelegraphSeen(next, "chargeIncoming");
  }
  return next;
}

function tickSandboxSilencePattern(state, elapsedS) {
  var enemy = Object.assign({}, state.enemy);
  var next = Object.assign({}, state, { enemy: enemy });

  if (enemy.silenceTelegraphUntilMs) {
    if (next.elapsedMs >= enemy.silenceTelegraphUntilMs) {
      enemy.silenceTelegraphUntilMs = 0;
      enemy._silenceNextAt = randSandboxFloat(ENEMY_CHARGE_MIN_INTERVAL_S, ENEMY_CHARGE_MAX_INTERVAL_S);
      next.heroSilencedUntilMs = next.elapsedMs + (typeof SILENCE_DURATION_MS === "number" ? SILENCE_DURATION_MS : 4000);
      next = appendSandboxLog(next, "🔇 Le héros de test est réduit au silence !");
      if (window.SandboxReportManager) next = SandboxReportManager.logCounterExpired(next, "enemySilenceIncoming");
    }
    return next;
  }

  if (!enemy._silenceNextAt) enemy._silenceNextAt = randSandboxFloat(ENEMY_CHARGE_MIN_INTERVAL_S, ENEMY_CHARGE_MAX_INTERVAL_S);
  enemy._silenceTimer = Number(enemy._silenceTimer || 0) + elapsedS / 1000;

  if (enemy._silenceTimer >= enemy._silenceNextAt) {
    enemy._silenceTimer = 0;
    enemy._silenceNextAt = 0;
    enemy.silenceTelegraphUntilMs = next.elapsedMs + ENEMY_CHARGE_TELEGRAPH_MS;
    next = appendSandboxLog(next, "🔇 " + enemy.name + " se prépare à réduire le héros de test au silence !");
    if (window.SandboxReportManager) next = SandboxReportManager.logTelegraphSeen(next, "enemySilenceIncoming");
  }
  return next;
}

function tickSandboxShieldPattern(state, elapsedS) {
  var enemy = Object.assign({}, state.enemy);
  var next = Object.assign({}, state, { enemy: enemy });

  if (enemy.shieldTelegraphUntilMs) {
    if (next.elapsedMs >= enemy.shieldTelegraphUntilMs) {
      enemy.shieldTelegraphUntilMs = 0;
      enemy._shieldNextAt = randSandboxFloat(BOSS_SHIELD_MIN_INTERVAL_S, BOSS_SHIELD_MAX_INTERVAL_S);
      enemy.shieldActiveUntilMs = next.elapsedMs + BOSS_SHIELD_DURATION_MS;
      next = appendSandboxLog(next, "🛡️ Le bouclier de " + enemy.name + " se referme !");
      if (window.SandboxReportManager) next = SandboxReportManager.logCounterExpired(next, "shieldIncoming");
    }
    return next;
  }

  if (!enemy._shieldNextAt) enemy._shieldNextAt = randSandboxFloat(BOSS_SHIELD_MIN_INTERVAL_S, BOSS_SHIELD_MAX_INTERVAL_S);
  enemy._shieldTimer = Number(enemy._shieldTimer || 0) + elapsedS / 1000;

  if (enemy._shieldTimer >= enemy._shieldNextAt) {
    enemy._shieldTimer = 0;
    enemy._shieldNextAt = 0;
    enemy.shieldTelegraphUntilMs = next.elapsedMs + BOSS_SHIELD_TELEGRAPH_MS;
    next = appendSandboxLog(next, "🛡️ " + enemy.name + " invoque un bouclier !");
    if (window.SandboxReportManager) next = SandboxReportManager.logTelegraphSeen(next, "shieldIncoming");
  }
  return next;
}

function tickSandboxHealPattern(state, elapsedS) {
  var enemy = Object.assign({}, state.enemy);
  var next = Object.assign({}, state, { enemy: enemy });

  if (enemy.healTelegraphUntilMs) {
    if (next.elapsedMs >= enemy.healTelegraphUntilMs) {
      enemy.healTelegraphUntilMs = 0;
      enemy._healNextAt = randSandboxFloat(BOSS_HEAL_MIN_INTERVAL_S, BOSS_HEAL_MAX_INTERVAL_S);
      var healAmount = Math.max(1, Math.floor(Number(enemy.hp || 0) * BOSS_HEAL_PERCENT));
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + healAmount);
      next = appendSandboxLog(next, "💚 " + enemy.name + " récupère " + healAmount + " PV !");
      if (window.SandboxReportManager) next = SandboxReportManager.logCounterExpired(next, "healIncoming");
    }
    return next;
  }

  if (!enemy._healNextAt) enemy._healNextAt = randSandboxFloat(BOSS_HEAL_MIN_INTERVAL_S, BOSS_HEAL_MAX_INTERVAL_S);
  enemy._healTimer = Number(enemy._healTimer || 0) + elapsedS / 1000;

  if (enemy._healTimer >= enemy._healNextAt) {
    enemy._healTimer = 0;
    enemy._healNextAt = 0;
    enemy.healTelegraphUntilMs = next.elapsedMs + BOSS_HEAL_TELEGRAPH_MS;
    next = appendSandboxLog(next, "💚 " + enemy.name + " se prépare à se soigner !");
    if (window.SandboxReportManager) next = SandboxReportManager.logTelegraphSeen(next, "healIncoming");
  }
  return next;
}

function randSandboxFloat(min, max) {
  return min + Math.random() * (max - min);
}

// Équivalent de ClassCombatManager.applyActionEffects() — vulnérabilité, DoT, et les
// 4 suppressions d'archétype (uniquement si matchedConditionId correspond exactement
// à l'archétype visé, comme en jeu réel : ce sont des conditions Grimoire sur l'état
// permanent de l'ennemi, pas les patterns télégraphés).
function applySandboxActionEffects(state, action, lastHitDmg, matchedConditionId) {
  var effects = action.effects || [];
  if (!effects.length || !state.enemy) return state;

  var next = state;
  effects.forEach(function (effect) {
    if (!effect || !next.enemy) return;

    if (effect.type === "enemyVulnerability") {
      next = Object.assign({}, next, {
        enemy: Object.assign({}, next.enemy, {
          vulnerableUntilMs: next.elapsedMs + Number(effect.durationMs || 0),
          vulnerableMult: Number(effect.value || 0)
        })
      });
    } else if (effect.type === "damageOverTime") {
      var perTick = Math.max(0, Number(lastHitDmg || 0) * Number(effect.percentPerSecond || 0));
      next = Object.assign({}, next, {
        enemy: Object.assign({}, next.enemy, {
          dot: { perTickDamage: perTick, remainingMs: Number(effect.durationMs || 0), accumMs: 0 }
        })
      });
    } else if (effect.type === "enemyRageSuppression" && matchedConditionId === "enemyEnraged") {
      next = applySandboxRageSuppression(next);
    } else if (effect.type === "enemyCorruptionPurge" && matchedConditionId === "enemyCorrupted") {
      next = Object.assign({}, next, { enemy: Object.assign({}, next.enemy, { corruptedStacks: 0 }) });
    } else if (effect.type === "enemyLifestealSuppression" && matchedConditionId === "enemyVampiric") {
      next = Object.assign({}, next, {
        enemy: Object.assign({}, next.enemy, { vampiricSuppressedUntilMs: next.elapsedMs + (typeof VAMPIRIC_SUPPRESSION_DURATION_MS === "number" ? VAMPIRIC_SUPPRESSION_DURATION_MS : 4000) })
      });
    } else if (effect.type === "enemyArmorSuppression" && matchedConditionId === "enemyArmored") {
      next = Object.assign({}, next, {
        enemy: Object.assign({}, next.enemy, {
          armorSuppressedUntilMs: next.elapsedMs + (typeof ARMORED_SUPPRESSION_DURATION_MS === "number" ? ARMORED_SUPPRESSION_DURATION_MS : 4000),
          armorSuppressedReduction: (typeof ARMORED_SUPPRESSION_REDUCTION_PCT === "number") ? ARMORED_SUPPRESSION_REDUCTION_PCT : 0.05
        })
      });
    }
  });
  return next;
}

// Variante temps-simulé de getArmoredEffectiveDamageReduction (data/enemy-archetypes.js),
// qui compare à Date.now() — ici on compare à state.elapsedMs comme le reste du fichier.
function getSandboxArmoredEffectiveDamageReduction(enemy, elapsedMs) {
  if (!enemy || enemy.archetype !== "armored") return 0;
  if (enemy.armorSuppressedUntilMs && elapsedMs < enemy.armorSuppressedUntilMs) {
    return Math.max(0, Number(enemy.armorSuppressedReduction || 0));
  }
  return (typeof ARMORED_DAMAGE_REDUCTION_PCT === "number") ? ARMORED_DAMAGE_REDUCTION_PCT : 0.10;
}

function applySandboxRageSuppression(state) {
  if (!state.enemy || state.enemy.archetype !== "enraged" || !(state.enemy.maxHp > 0)) return state;
  var currentPct = 1 - (Number(state.enemy.hp || 0) / Number(state.enemy.maxHp || 1));
  var reduction = (typeof ENRAGED_SUPPRESSION_REDUCTION_PCT === "number") ? ENRAGED_SUPPRESSION_REDUCTION_PCT : 0.20;
  var reducedPct = Math.max(0, currentPct - reduction);
  var freezeDurationMs = (typeof ENRAGED_FREEZE_DURATION_MS === "number") ? ENRAGED_FREEZE_DURATION_MS : 4000;
  return Object.assign({}, state, {
    enemy: Object.assign({}, state.enemy, {
      rageFrozenPct: reducedPct,
      rageFreezeUntilMs: state.elapsedMs + freezeDurationMs
    })
  });
}

// Équivalent de CombatEngine.estimateCounterValue() — estimation affichée en rapport,
// pas un montant réellement appliqué (le pattern est juste annulé, pas simulé puis défait).
function estimateSandboxCounterValue(state, conditionId) {
  if (!state.enemy) return 0;
  var c = Object.assign({}, SANDBOX_ENEMY_COEFS, state.enemyCoefs || {});
  var power = Number(state.enemy.power || 0);

  if (conditionId === "chargeIncoming") {
    return Math.max(1, Math.floor(power * c.POWER_DMG_COEF * ENEMY_CHARGE_DMG_MULT));
  }
  if (conditionId === "shieldIncoming") {
    return Math.max(1, Math.floor(power * c.POWER_DMG_COEF));
  }
  if (conditionId === "healIncoming") {
    return Math.max(1, Math.floor(Number(state.enemy.hp || 0) * BOSS_HEAL_PERCENT));
  }
  if (conditionId === "enemySilenceIncoming") {
    return (typeof SILENCE_DURATION_MS === "number") ? SILENCE_DURATION_MS : 4000;
  }
  return 0;
}

// Équivalent de ClassCombatManager.applyGrimoireCounterIfApplicable() — n'agit que si le
// slot utilisé est bien configuré en contre (action.counters) pour la condition qui l'a
// déclenché, et que le télégraphe correspondant est encore actif au moment de l'action.
function applySandboxGrimoireCounterIfApplicable(state, action, matchedConditionId, slot) {
  if (!matchedConditionId || !state.enemy) return state;
  if (!Array.isArray(action.counters) || action.counters.indexOf(matchedConditionId) === -1) return state;

  var enemy = Object.assign({}, state.enemy);
  var countered = false;

  if (matchedConditionId === "chargeIncoming" && enemy.chargeTelegraphUntilMs) {
    enemy.chargeTelegraphUntilMs = 0;
    countered = true;
  } else if (matchedConditionId === "shieldIncoming" && enemy.shieldTelegraphUntilMs) {
    enemy.shieldTelegraphUntilMs = 0;
    countered = true;
  } else if (matchedConditionId === "healIncoming" && enemy.healTelegraphUntilMs) {
    enemy.healTelegraphUntilMs = 0;
    countered = true;
  } else if (matchedConditionId === "enemySilenceIncoming" && enemy.silenceTelegraphUntilMs) {
    enemy.silenceTelegraphUntilMs = 0;
    countered = true;
  }

  if (!countered) return state;

  var next = Object.assign({}, state, { enemy: enemy });
  next = appendSandboxLog(next, "⚡ Contre réussi : " + (action.label || "l'action") + " annule l'attaque adverse !");
  if (window.SandboxReportManager) {
    var estimatedValue = estimateSandboxCounterValue(next, matchedConditionId);
    next = SandboxReportManager.logCounterSuccess(next, slot, matchedConditionId, estimatedValue);
  }
  return next;
}

// Équivalent du CombatReportManager réel (combat-report-system.js), mais en style
// PUR (retourne l'objet combatReport mis à jour, ne mute jamais game.* ni le state)
// pour rester cohérent avec le reste de ce fichier. Porté par state.combatReport,
// jamais persisté (comme game.combatReport), reset uniquement via createSandboxCombatReport().
var SandboxReportManager = {
  createEmptyReport: function () {
    return {
      startedAt: 0,
      perSlot: {
        skill1: this.createEmptySlotStats(),
        skill2: this.createEmptySlotStats(),
        skill3: this.createEmptySlotStats(),
        defense: this.createEmptySlotStats()
      },
      damageAvoidedTotal: 0,
      healPreventedTotal: 0,
      shieldsRemovedCount: 0,
      silencesAvoidedCount: 0,
      totalDamageDealt: 0,
      archetypeImpact: {
        enragedBonusDamageTaken: 0,
        corruptedDamageLost: 0,
        vampiricHealStolen: 0,
        armoredDamageLost: 0
      }
    };
  },

  createEmptySlotStats: function () {
    return { uses: 0, telegraphsSeen: 0, countersSucceeded: 0, countersExpired: 0 };
  },

  isTrackedSlot: function (slot) {
    return slot === "skill1" || slot === "skill2" || slot === "skill3" || slot === "defense";
  },

  cloneReport: function (report) {
    return {
      startedAt: report.startedAt,
      perSlot: {
        skill1: Object.assign({}, report.perSlot.skill1),
        skill2: Object.assign({}, report.perSlot.skill2),
        skill3: Object.assign({}, report.perSlot.skill3),
        defense: Object.assign({}, report.perSlot.defense)
      },
      damageAvoidedTotal: report.damageAvoidedTotal,
      healPreventedTotal: report.healPreventedTotal,
      shieldsRemovedCount: report.shieldsRemovedCount,
      silencesAvoidedCount: report.silencesAvoidedCount,
      totalDamageDealt: report.totalDamageDealt,
      archetypeImpact: Object.assign({}, report.archetypeImpact)
    };
  },

  // logX(state, ...) retourne un NOUVEAU state avec combatReport mis à jour —
  // ne mute jamais l'argument reçu, à réassigner par l'appelant (next = SandboxReportManager.logX(next, ...)).
  logUsage: function (state, slot) {
    if (!state.combatReport || !this.isTrackedSlot(slot)) return state;
    var report = this.cloneReport(state.combatReport);
    report.perSlot[slot].uses++;
    return Object.assign({}, state, { combatReport: report });
  },

  logTelegraphSeen: function (state, conditionId) {
    if (!state.combatReport) return state;
    var report = this.cloneReport(state.combatReport);
    this.getConfiguredSlotsForCondition(state, conditionId).forEach(function (slot) {
      if (report.perSlot[slot]) report.perSlot[slot].telegraphsSeen++;
    });
    return Object.assign({}, state, { combatReport: report });
  },

  logCounterExpired: function (state, conditionId) {
    if (!state.combatReport) return state;
    var report = this.cloneReport(state.combatReport);
    this.getConfiguredSlotsForCondition(state, conditionId).forEach(function (slot) {
      if (report.perSlot[slot]) report.perSlot[slot].countersExpired++;
    });
    return Object.assign({}, state, { combatReport: report });
  },

  logCounterSuccess: function (state, slot, conditionId, estimatedValue) {
    if (!state.combatReport) return state;
    var report = this.cloneReport(state.combatReport);
    if (this.isTrackedSlot(slot) && report.perSlot[slot]) report.perSlot[slot].countersSucceeded++;
    var value = Math.max(0, Number(estimatedValue || 0));
    if (conditionId === "chargeIncoming") {
      report.damageAvoidedTotal += value;
    } else if (conditionId === "shieldIncoming") {
      report.damageAvoidedTotal += value;
      report.shieldsRemovedCount++;
    } else if (conditionId === "healIncoming") {
      report.healPreventedTotal += value;
    } else if (conditionId === "enemySilenceIncoming") {
      report.silencesAvoidedCount++;
    }
    return Object.assign({}, state, { combatReport: report });
  },

  logDamageDealt: function (state, amount) {
    if (!state.combatReport) return state;
    var report = this.cloneReport(state.combatReport);
    report.totalDamageDealt += Math.max(0, Number(amount || 0));
    return Object.assign({}, state, { combatReport: report });
  },

  logArchetypeImpact: function (state, key, amount) {
    if (!state.combatReport || !state.combatReport.archetypeImpact.hasOwnProperty(key)) return state;
    var report = this.cloneReport(state.combatReport);
    report.archetypeImpact[key] += Math.max(0, Number(amount || 0));
    return Object.assign({}, state, { combatReport: report });
  },

  // Slots du Grimoire (state.grimoireRules) configurés sur cette condition — utilisé
  // pour savoir quel(s) slot(s) créditer d'un "télégraphe vu"/"contre expiré".
  getConfiguredSlotsForCondition: function (state, conditionId) {
    var rules = Array.isArray(state.grimoireRules) ? state.grimoireRules : [];
    var seen = {};
    var slots = [];
    rules.forEach(function (rule) {
      if (rule && rule.conditionId === conditionId && rule.actionSlot && !seen[rule.actionSlot]) {
        seen[rule.actionSlot] = true;
        slots.push(rule.actionSlot);
      }
    });
    return slots;
  },

  getAverageDps: function (state, totalElapsedMs) {
    if (!state.combatReport) return 0;
    var effectiveElapsedMs = (typeof totalElapsedMs === "number") ? totalElapsedMs : state.elapsedMs;
    var elapsedS = (effectiveElapsedMs - state.combatReport.startedAt) / 1000;
    if (elapsedS < 1) return 0;
    return state.combatReport.totalDamageDealt / elapsedS;
  }
};
window.SandboxReportManager = SandboxReportManager;

function createDefaultSandboxPersistence() {
  return {
    hpMode: "keep",
    hpPercent: 50,
    resourceMode: "keep",
    resourcePercent: 50,
    cooldownMode: "reset"
  };
}

function createSandboxRunState(classId, heroId, queue, persistence, overrideStats, baseCooldownMs, overrideEnemyCoefs, equipmentRarity, archetypeOverride, tapMultBonus, perfectExecutionLevel, survivalBonus) {
  if (!Array.isArray(queue) || queue.length === 0) return null;
  var firstCombat = createSandboxCombatState(classId, heroId, queue[0], overrideStats, baseCooldownMs, overrideEnemyCoefs, equipmentRarity, archetypeOverride, tapMultBonus, perfectExecutionLevel, survivalBonus);
  if (!firstCombat) return null;

  var pers = persistence || createDefaultSandboxPersistence();

  return {
    classId: classId,
    heroId: heroId,
    overrideStats: overrideStats || null,
    baseCooldownMs: firstCombat.baseCooldownMs,
    overrideEnemyCoefs: overrideEnemyCoefs || null,
    equipmentRarity: equipmentRarity || null,
    archetypeOverride: archetypeOverride || null,
    tapMultBonus: tapMultBonus || 0,
    perfectExecutionLevel: perfectExecutionLevel || 0,
    survivalBonus: survivalBonus || null,
    queue: queue.slice(),
    currentIndex: 0,
    currentCombat: firstCombat,
    persistence: pers,
    status: "ongoing",
    victories: 0,
    totalDamageDealt: 0,
    totalDamageTaken: 0,
    totalDamageAvoided: 0,
    actionCounts: {},
    elapsedMs: 0,
    deathAt: null,
    log: [appendRunLogEntry(0, "--- Début du combat contre " + firstCombat.enemy.name + (firstCombat.enemy.isBoss ? " (BOSS)" : "") + " (1/" + queue.length + ") ---")]
  };
}

function appendRunLogEntry(atMs, text) {
  return { atMs: atMs, text: text };
}

function diffSandboxHp(prevCombat, nextCombat) {
  var dealt = Math.max(0, prevCombat.enemy.hp - nextCombat.enemy.hp);
  var taken = Math.max(0, prevCombat.hero.hp - nextCombat.hero.hp);
  return { dealt: dealt, taken: taken };
}

function applySandboxPersistence(combat, persistence) {
  var next = Object.assign({}, combat);

  if (persistence.hpMode === "full") {
    next.hero = Object.assign({}, next.hero, { hp: next.hero.maxHp });
  } else if (persistence.hpMode === "percent") {
    var hpGain = next.hero.maxHp * (Math.max(0, Math.min(100, persistence.hpPercent || 0)) / 100);
    next.hero = Object.assign({}, next.hero, { hp: Math.min(next.hero.maxHp, next.hero.hp + hpGain) });
  }

  if (persistence.resourceMode === "full") {
    next.resourceState = Object.assign({}, next.resourceState, { current: next.resourceState.max });
  } else if (persistence.resourceMode === "percent") {
    next.resourceState = restoreResourcePercent(next.resourceState, persistence.resourcePercent || 0);
  }

  if (persistence.cooldownMode === "reset") {
    next.cooldownState = createCooldownState();
  }

  return next;
}

// Factorisé (comme handleSandboxInfiniteVictory) : gestion d'une victoire en mode Run —
// déclenchable par une action ou par un tick de temps (DoT).
function handleSandboxRunVictory(runState, next, nextCombat) {
  next.victories = runState.victories + 1;
  next.log = next.log.concat([appendRunLogEntry(next.elapsedMs, "--- Fin du combat contre " + nextCombat.enemy.name + ", victoire (" + next.victories + "/" + runState.queue.length + ") ---")]);

  var isLast = runState.currentIndex >= runState.queue.length - 1;
  if (isLast) {
    next.status = "victory";
    next.log = next.log.concat([appendRunLogEntry(next.elapsedMs, "🏆 Run terminé — tous les combats remportés.")]);
    return finalizeSandboxRun(next);
  }

  var nextIndex = runState.currentIndex + 1;
  var nextEnemyId = runState.queue[nextIndex];
  var freshCombat = createSandboxCombatState(runState.classId, runState.heroId, nextEnemyId, runState.overrideStats, runState.baseCooldownMs, runState.overrideEnemyCoefs, runState.equipmentRarity, runState.archetypeOverride, runState.tapMultBonus, runState.perfectExecutionLevel, runState.survivalBonus);
  if (!freshCombat) {
    next.status = "stopped";
    next.log = next.log.concat([appendRunLogEntry(next.elapsedMs, "--- Run arrêté : ennemi suivant invalide (" + nextEnemyId + ") ---")]);
    return next;
  }
  var carried = applySandboxPersistence(Object.assign({}, freshCombat, {
    hero: Object.assign({}, freshCombat.hero, { hp: nextCombat.hero.hp }),
    resourceState: nextCombat.resourceState,
    cooldownState: nextCombat.cooldownState
  }), runState.persistence);

  next.currentIndex = nextIndex;
  next.currentCombat = carried;
  next.log = next.log.concat([appendRunLogEntry(next.elapsedMs, "--- Début du combat contre " + carried.enemy.name + (carried.enemy.isBoss ? " (BOSS)" : "") + " (" + (nextIndex + 1) + "/" + runState.queue.length + ") ---")]);

  return next;
}

function applySandboxRunAction(runState, actionSlot) {
  if (!runState) return runState;
  if (runState.status !== "ongoing") return runState;

  var prevCombat = runState.currentCombat;
  var nextCombat = applySandboxAction(prevCombat, actionSlot);

  var next = Object.assign({}, runState);
  next.currentCombat = nextCombat;
  next.elapsedMs = runState.elapsedMs + (nextCombat.elapsedMs - prevCombat.elapsedMs);

  if (nextCombat.actionsUsed > prevCombat.actionsUsed) {
    var kit = getClassSkills(runState.classId);
    var action = kit ? kit.actions[actionSlot] : null;
    if (action) {
      next.actionCounts = Object.assign({}, runState.actionCounts);
      next.actionCounts[action.id] = (next.actionCounts[action.id] || 0) + 1;
    }
    var diff = diffSandboxHp(prevCombat, nextCombat);
    next.totalDamageDealt = runState.totalDamageDealt + diff.dealt;
    next.totalDamageTaken = runState.totalDamageTaken + diff.taken;
    next.totalDamageAvoided = (runState.totalDamageAvoided || 0) + ((nextCombat.totalDamageAvoided || 0) - (prevCombat.totalDamageAvoided || 0));
  }

  var newLines = nextCombat.log.slice(prevCombat.log.length);
  next.log = runState.log.concat(newLines.map(function (entry) {
    return appendRunLogEntry(runState.elapsedMs + entry.atMs, entry.text);
  }));

  if (nextCombat.status === "defeat") {
    next.status = "defeat";
    next.deathAt = { index: runState.currentIndex, enemyId: runState.queue[runState.currentIndex] };
    next.log = next.log.concat([appendRunLogEntry(next.elapsedMs, "--- Run interrompu : défaite au combat " + (runState.currentIndex + 1) + "/" + runState.queue.length + " contre " + nextCombat.enemy.name + " ---")]);
    return finalizeSandboxRun(next);
  }

  if (nextCombat.status === "victory") {
    next = handleSandboxRunVictory(runState, next, nextCombat);
  }

  return next;
}

function tickSandboxRunTime(runState, elapsedMs) {
  if (!runState || runState.status !== "ongoing") return runState;
  var prevCombat = runState.currentCombat;
  var nextCombat = tickSandboxTime(prevCombat, elapsedMs);
  var elapsed = (typeof elapsedMs === "number" && elapsedMs > 0) ? elapsedMs : 0;

  var next = Object.assign({}, runState);
  next.currentCombat = nextCombat;
  next.elapsedMs = runState.elapsedMs + elapsed;

  var diff = diffSandboxHp(prevCombat, nextCombat);
  next.totalDamageDealt = runState.totalDamageDealt + diff.dealt;
  next.totalDamageTaken = runState.totalDamageTaken + diff.taken;
  next.totalDamageAvoided = (runState.totalDamageAvoided || 0) + ((nextCombat.totalDamageAvoided || 0) - (prevCombat.totalDamageAvoided || 0));

  var newLines = nextCombat.log.slice(prevCombat.log.length);
  next.log = runState.log.concat(newLines.map(function (entry) {
    return appendRunLogEntry(runState.elapsedMs + entry.atMs, entry.text);
  }));

  if (nextCombat.status === "defeat") {
    next.status = "defeat";
    next.deathAt = { index: runState.currentIndex, enemyId: runState.queue[runState.currentIndex] };
    next.log = next.log.concat([appendRunLogEntry(next.elapsedMs, "--- Run interrompu : défaite au combat " + (runState.currentIndex + 1) + "/" + runState.queue.length + " contre " + nextCombat.enemy.name + " ---")]);
    return finalizeSandboxRun(next);
  }

  // v3.81.0 : voir la note équivalente dans tickSandboxInfiniteTime.
  if (nextCombat.status === "victory") {
    next = handleSandboxRunVictory(runState, next, nextCombat);
  }

  return next;
}

function stopSandboxRun(runState) {
  if (!runState || runState.status !== "ongoing") return runState;
  var next = Object.assign({}, runState, { status: "stopped" });
  next.log = runState.log.concat([appendRunLogEntry(runState.elapsedMs, "--- Run arrêté manuellement (combat " + (runState.currentIndex + 1) + "/" + runState.queue.length + ") ---")]);
  return finalizeSandboxRun(next);
}

function finalizeSandboxRun(runState) {
  if (!runState || runState.status === "ongoing") return runState;

  var mostUsedId = null;
  var mostUsedCount = 0;
  Object.keys(runState.actionCounts).forEach(function (id) {
    if (runState.actionCounts[id] > mostUsedCount) {
      mostUsedCount = runState.actionCounts[id];
      mostUsedId = id;
    }
  });

  var lines = [];
  lines.push("📊 Résumé du run — " + runState.victories + "/" + runState.queue.length + " combat(s) remporté(s).");
  lines.push("Dégâts totaux infligés : " + Math.round(runState.totalDamageDealt) + " — reçus : " + Math.round(runState.totalDamageTaken) + ".");
  lines.push("Temps total : " + (Math.round(runState.elapsedMs / 100) / 10) + "s.");
  lines.push("PV restants : " + Math.max(0, Math.floor(runState.currentCombat.hero.hp)) + " / " + runState.currentCombat.hero.maxHp + ".");
  lines.push("Ressource restante : " + (Math.round(runState.currentCombat.resourceState.current * 100) / 100) + " / " + runState.currentCombat.resourceState.max + ".");
  lines.push(mostUsedId ? ("Action la plus utilisée : " + mostUsedId + " (" + mostUsedCount + " fois).") : "Aucune action utilisée.");
  if (runState.deathAt) {
    lines.push("💀 Mort au combat " + (runState.deathAt.index + 1) + "/" + runState.queue.length + " contre " + runState.deathAt.enemyId + ".");
  }

  return Object.assign({}, runState, {
    log: runState.log.concat(lines.map(function (text) { return appendRunLogEntry(runState.elapsedMs, text); }))
  });
}

function createSandboxInfiniteState(classId, heroId, persistence, overrideStats, baseCooldownMs, overrideEnemyCoefs, equipmentRarity, archetypeOverride, bossEveryNKills, tapMultBonus, perfectExecutionLevel, survivalBonus) {
  var enemyOrder = listSandboxAllEnemiesInOrder();
  if (!enemyOrder.length) return null;

  var firstCombat = createSandboxCombatState(classId, heroId, enemyOrder[0], overrideStats, baseCooldownMs, overrideEnemyCoefs, equipmentRarity, archetypeOverride, tapMultBonus, perfectExecutionLevel, survivalBonus);
  if (!firstCombat) return null;

  var pers = persistence || createDefaultSandboxPersistence();

  return {
    classId: classId,
    heroId: heroId,
    overrideStats: overrideStats || null,
    baseCooldownMs: firstCombat.baseCooldownMs,
    overrideEnemyCoefs: overrideEnemyCoefs || null,
    equipmentRarity: equipmentRarity || null,
    archetypeOverride: archetypeOverride || null,
    tapMultBonus: tapMultBonus || 0,
    perfectExecutionLevel: perfectExecutionLevel || 0,
    survivalBonus: survivalBonus || null,
    bossEveryNKills: (typeof bossEveryNKills === "number" && bossEveryNKills > 0) ? Math.floor(bossEveryNKills) : 0,
    persistence: pers,
    enemyOrder: enemyOrder,
    currentPosition: 0,
    loopCount: 1,
    currentCombat: firstCombat,
    status: "ongoing",
    defeatedCount: 0,
    bossEncounteredCount: 0,
    archetypeImpact: {
      enragedBonusDamageTaken: 0,
      vampiricHealStolen: 0,
      corruptedDamageLost: 0,
      armoredDamageLost: 0
    },
    archetypeEncounters: {},
    totalDamageDealt: 0,
    totalDamageTaken: 0,
    totalDamageAvoided: 0,
    actionCounts: {},
    elapsedMs: 0,
    deathAt: null,
    log: [appendRunLogEntry(0, "--- Début du combat contre " + firstCombat.enemy.name + " (Ennemi 1/" + enemyOrder.length + ", Boucle 1) ---")]
  };
}

// Boss de la 1ère aventure du monde simulé (WORLD_INDEX des coefs actifs) — insertion
// périodique en Simulation auto (bossEveryNKills), indépendante de la file d'ennemis normaux.
function getSandboxBossIdForWorldIndex(worldIndex) {
  if (typeof WORLDS === "undefined" || !WORLDS || !WORLDS[worldIndex]) return null;
  var adventures = WORLDS[worldIndex].adventures || [];
  var withBoss = adventures.filter(function (a) { return !!a.boss; })[0];
  return withBoss ? withBoss.boss : null;
}

function advanceSandboxInfiniteToNextEnemy(infiniteState, nextCombatFromCurrent) {
  var nextPosition = infiniteState.currentPosition + 1;
  var loopCount = infiniteState.loopCount;
  var loopedThisStep = false;
  if (nextPosition >= infiniteState.enemyOrder.length) {
    nextPosition = 0;
    loopCount = infiniteState.loopCount + 1;
    loopedThisStep = true;
  }

  var forceBoss = infiniteState.bossEveryNKills > 0
    && infiniteState.defeatedCount > 0
    && infiniteState.defeatedCount % infiniteState.bossEveryNKills === 0;

  var worldIndex = Number((infiniteState.overrideEnemyCoefs && infiniteState.overrideEnemyCoefs.WORLD_INDEX) || 0);
  var bossId = forceBoss ? getSandboxBossIdForWorldIndex(worldIndex) : null;
  var nextEnemyId = bossId || infiniteState.enemyOrder[nextPosition];

  var freshCombat = createSandboxCombatState(infiniteState.classId, infiniteState.heroId, nextEnemyId, infiniteState.overrideStats, infiniteState.baseCooldownMs, infiniteState.overrideEnemyCoefs, infiniteState.equipmentRarity, infiniteState.archetypeOverride, infiniteState.tapMultBonus, infiniteState.perfectExecutionLevel, infiniteState.survivalBonus);
  if (!freshCombat) return { status: "invalid" };

  var carried = applySandboxPersistence(Object.assign({}, freshCombat, {
    hero: Object.assign({}, freshCombat.hero, { hp: nextCombatFromCurrent.hero.hp }),
    resourceState: nextCombatFromCurrent.resourceState,
    cooldownState: nextCombatFromCurrent.cooldownState,
    combatReport: nextCombatFromCurrent.combatReport || freshCombat.combatReport,
    grimoireRules: nextCombatFromCurrent.grimoireRules,
    heroSilencedUntilMs: 0
  }), infiniteState.persistence);

  return { status: "ok", position: bossId ? infiniteState.currentPosition : nextPosition, loopCount: loopCount, loopedThisStep: bossId ? false : loopedThisStep, combat: carried, wasBoss: !!bossId };
}

// Factorisé : gestion d'une victoire (compta archétypes, avance vers l'ennemi suivant,
// gestion boss) — déclenchable soit par une action du joueur (applySandboxInfiniteAction),
// soit par un DoT qui tue l'ennemi pendant un simple tick de temps (tickSandboxInfiniteTime).
function handleSandboxInfiniteVictory(infiniteState, next, nextCombat) {
  next.defeatedCount = infiniteState.defeatedCount + 1;
  next.archetypeImpact = {
    enragedBonusDamageTaken: (infiniteState.archetypeImpact ? infiniteState.archetypeImpact.enragedBonusDamageTaken : 0) + (nextCombat.archetypeImpact ? nextCombat.archetypeImpact.enragedBonusDamageTaken : 0),
    vampiricHealStolen: (infiniteState.archetypeImpact ? infiniteState.archetypeImpact.vampiricHealStolen : 0) + (nextCombat.archetypeImpact ? nextCombat.archetypeImpact.vampiricHealStolen : 0),
    corruptedDamageLost: (infiniteState.archetypeImpact ? infiniteState.archetypeImpact.corruptedDamageLost : 0) + (nextCombat.archetypeImpact ? nextCombat.archetypeImpact.corruptedDamageLost : 0),
    armoredDamageLost: (infiniteState.archetypeImpact ? infiniteState.archetypeImpact.armoredDamageLost : 0) + (nextCombat.archetypeImpact ? nextCombat.archetypeImpact.armoredDamageLost : 0)
  };
  next.archetypeEncounters = Object.assign({}, infiniteState.archetypeEncounters);
  if (nextCombat.enemy.archetype) {
    next.archetypeEncounters[nextCombat.enemy.archetype] = (next.archetypeEncounters[nextCombat.enemy.archetype] || 0) + 1;
  }
  next.log = next.log.concat([appendRunLogEntry(next.elapsedMs, "--- Fin du combat contre " + nextCombat.enemy.name + ", victoire (" + next.defeatedCount + " vaincu(s) au total) ---")]);

  var advance = advanceSandboxInfiniteToNextEnemy(Object.assign({}, infiniteState, { defeatedCount: next.defeatedCount }), nextCombat);
  if (advance.status === "invalid") {
    next.status = "stopped";
    next.log = next.log.concat([appendRunLogEntry(next.elapsedMs, "--- Mode infini arrêté : ennemi suivant invalide ---")]);
    return next;
  }

  next.currentPosition = advance.position;
  next.loopCount = advance.loopCount;
  next.currentCombat = advance.combat;
  if (advance.wasBoss) {
    next.bossEncounteredCount = (infiniteState.bossEncounteredCount || 0) + 1;
  }
  if (advance.loopedThisStep) {
    next.log = next.log.concat([appendRunLogEntry(next.elapsedMs, "🔁 Liste complète parcourue — Boucle " + advance.loopCount + " commence.")]);
  }
  next.log = next.log.concat([appendRunLogEntry(next.elapsedMs, "--- Début du combat contre " + advance.combat.enemy.name + (advance.wasBoss ? " (BOSS)" : "") + " (Ennemi " + (advance.position + 1) + "/" + infiniteState.enemyOrder.length + ", Boucle " + advance.loopCount + ") ---")]);

  return next;
}

function applySandboxInfiniteAction(infiniteState, actionSlot, matchedConditionId) {
  if (!infiniteState) return infiniteState;
  if (infiniteState.status !== "ongoing") return infiniteState;

  var prevCombat = infiniteState.currentCombat;
  var nextCombat = applySandboxAction(prevCombat, actionSlot, matchedConditionId);

  var next = Object.assign({}, infiniteState);
  next.currentCombat = nextCombat;
  next.elapsedMs = infiniteState.elapsedMs + (nextCombat.elapsedMs - prevCombat.elapsedMs);

  if (nextCombat.actionsUsed > prevCombat.actionsUsed) {
    var kit = getClassSkills(infiniteState.classId);
    var action = kit ? kit.actions[actionSlot] : null;
    if (action) {
      next.actionCounts = Object.assign({}, infiniteState.actionCounts);
      next.actionCounts[action.id] = (next.actionCounts[action.id] || 0) + 1;
    }
    var diff = diffSandboxHp(prevCombat, nextCombat);
    next.totalDamageDealt = infiniteState.totalDamageDealt + diff.dealt;
    next.totalDamageTaken = infiniteState.totalDamageTaken + diff.taken;
    next.totalDamageAvoided = (infiniteState.totalDamageAvoided || 0) + ((nextCombat.totalDamageAvoided || 0) - (prevCombat.totalDamageAvoided || 0));
  }

  var newLines = nextCombat.log.slice(prevCombat.log.length);
  next.log = infiniteState.log.concat(newLines.map(function (entry) {
    return appendRunLogEntry(infiniteState.elapsedMs + entry.atMs, entry.text);
  }));

  if (nextCombat.status === "defeat") {
    next.status = "defeat";
    next.deathAt = { enemyId: infiniteState.enemyOrder[infiniteState.currentPosition], position: infiniteState.currentPosition, loopCount: infiniteState.loopCount };
    next.log = next.log.concat([appendRunLogEntry(next.elapsedMs, "--- Mode infini interrompu : défaite contre " + nextCombat.enemy.name + " (Ennemi " + (infiniteState.currentPosition + 1) + "/" + infiniteState.enemyOrder.length + ", Boucle " + infiniteState.loopCount + ") ---")]);
    return finalizeSandboxInfinite(next);
  }

  if (nextCombat.status === "victory") {
    next = handleSandboxInfiniteVictory(infiniteState, next, nextCombat);
  }

  return next;
}

function tickSandboxInfiniteTime(infiniteState, elapsedMs) {
  if (!infiniteState || infiniteState.status !== "ongoing") return infiniteState;
  var prevCombat = infiniteState.currentCombat;
  var nextCombat = tickSandboxTime(prevCombat, elapsedMs);
  var elapsed = (typeof elapsedMs === "number" && elapsedMs > 0) ? elapsedMs : 0;

  var next = Object.assign({}, infiniteState);
  next.currentCombat = nextCombat;
  next.elapsedMs = infiniteState.elapsedMs + elapsed;

  var diff = diffSandboxHp(prevCombat, nextCombat);
  next.totalDamageDealt = infiniteState.totalDamageDealt + diff.dealt;
  next.totalDamageTaken = infiniteState.totalDamageTaken + diff.taken;
  next.totalDamageAvoided = (infiniteState.totalDamageAvoided || 0) + ((nextCombat.totalDamageAvoided || 0) - (prevCombat.totalDamageAvoided || 0));

  var newLines = nextCombat.log.slice(prevCombat.log.length);
  next.log = infiniteState.log.concat(newLines.map(function (entry) {
    return appendRunLogEntry(infiniteState.elapsedMs + entry.atMs, entry.text);
  }));

  if (nextCombat.status === "defeat") {
    next.status = "defeat";
    next.deathAt = { enemyId: infiniteState.enemyOrder[infiniteState.currentPosition], position: infiniteState.currentPosition, loopCount: infiniteState.loopCount };
    next.log = next.log.concat([appendRunLogEntry(next.elapsedMs, "--- Mode infini interrompu : défaite contre " + nextCombat.enemy.name + " (Ennemi " + (infiniteState.currentPosition + 1) + "/" + infiniteState.enemyOrder.length + ", Boucle " + infiniteState.loopCount + ") ---")]);
    return finalizeSandboxInfinite(next);
  }

  // v3.81.0 : une victoire peut désormais survenir pendant un simple tick de temps
  // (DoT qui achève l'ennemi), pas seulement suite à une action du joueur — sans cette
  // gestion, le combat restait bloqué sur un ennemi déjà à 0 PV indéfiniment.
  if (nextCombat.status === "victory") {
    next = handleSandboxInfiniteVictory(infiniteState, next, nextCombat);
  }

  return next;
}

function stopSandboxInfinite(infiniteState) {
  if (!infiniteState || infiniteState.status !== "ongoing") return infiniteState;
  var next = Object.assign({}, infiniteState, { status: "stopped" });
  next.log = infiniteState.log.concat([appendRunLogEntry(infiniteState.elapsedMs, "--- Mode infini arrêté manuellement (Ennemi " + (infiniteState.currentPosition + 1) + "/" + infiniteState.enemyOrder.length + ", Boucle " + infiniteState.loopCount + ") ---")]);
  return finalizeSandboxInfinite(next);
}

function finalizeSandboxInfinite(infiniteState) {
  if (!infiniteState || infiniteState.status === "ongoing") return infiniteState;

  var mostUsedId = null;
  var mostUsedCount = 0;
  Object.keys(infiniteState.actionCounts).forEach(function (id) {
    if (infiniteState.actionCounts[id] > mostUsedCount) {
      mostUsedCount = infiniteState.actionCounts[id];
      mostUsedId = id;
    }
  });

  var lines = [];
  var isVoluntaryStop = infiniteState.status === "stopped";
  lines.push(isVoluntaryStop
    ? "📊 Résumé (arrêt volontaire) — " + infiniteState.defeatedCount + " ennemi(s) vaincu(s) au total."
    : "📊 Résumé (défaite) — " + infiniteState.defeatedCount + " ennemi(s) vaincu(s) avant la mort.");
  lines.push("Dégâts totaux infligés : " + Math.round(infiniteState.totalDamageDealt) + " — reçus : " + Math.round(infiniteState.totalDamageTaken) + ".");
  lines.push("Temps total : " + (Math.round(infiniteState.elapsedMs / 100) / 10) + "s.");
  lines.push("PV restants : " + Math.max(0, Math.floor(infiniteState.currentCombat.hero.hp)) + " / " + infiniteState.currentCombat.hero.maxHp + ".");
  lines.push("Ressource restante : " + (Math.round(infiniteState.currentCombat.resourceState.current * 100) / 100) + " / " + infiniteState.currentCombat.resourceState.max + ".");
  lines.push(mostUsedId ? ("Action la plus utilisée : " + mostUsedId + " (" + mostUsedCount + " fois).") : "Aucune action utilisée.");
  if (infiniteState.deathAt) {
    lines.push("💀 Mort contre " + infiniteState.deathAt.enemyId + " (Ennemi " + (infiniteState.deathAt.position + 1) + "/" + infiniteState.enemyOrder.length + ", Boucle " + infiniteState.deathAt.loopCount + ").");
  }

  return Object.assign({}, infiniteState, {
    log: infiniteState.log.concat(lines.map(function (text) { return appendRunLogEntry(infiniteState.elapsedMs, text); }))
  });
}

window.SANDBOX_HERO_BASE_COEFS = SANDBOX_HERO_BASE_COEFS;
window.SANDBOX_ENEMY_COEFS = SANDBOX_ENEMY_COEFS;
window.buildSandboxHeroStats = buildSandboxHeroStats;
window.getSandboxHeroBaseStats = getSandboxHeroBaseStats;
window.applySandboxEquipmentBonus = applySandboxEquipmentBonus;
window.SANDBOX_DEFAULT_BASE_COOLDOWN_MS = SANDBOX_DEFAULT_BASE_COOLDOWN_MS;
window.buildSandboxEnemyStats = buildSandboxEnemyStats;
window.listSandboxEnemies = listSandboxEnemies;
window.listSandboxZones = listSandboxZones;
window.buildSandboxQueueFromZone = buildSandboxQueueFromZone;
window.getDamageAffinityMult = getDamageAffinityMult;
window.createSandboxCombatState = createSandboxCombatState;
window.applySandboxAction = applySandboxAction;
window.tickSandboxTime = tickSandboxTime;
window.computeSandboxActionDamage = computeSandboxActionDamage;
window.resolveSandboxEnemyStrike = resolveSandboxEnemyStrike;
window.createDefaultSandboxPersistence = createDefaultSandboxPersistence;
window.createSandboxRunState = createSandboxRunState;
window.applySandboxPersistence = applySandboxPersistence;
window.applySandboxRunAction = applySandboxRunAction;
window.tickSandboxRunTime = tickSandboxRunTime;
window.stopSandboxRun = stopSandboxRun;
window.finalizeSandboxRun = finalizeSandboxRun;
window.listSandboxAllEnemiesInOrder = listSandboxAllEnemiesInOrder;
window.createSandboxInfiniteState = createSandboxInfiniteState;
window.applySandboxInfiniteAction = applySandboxInfiniteAction;
window.tickSandboxInfiniteTime = tickSandboxInfiniteTime;
window.stopSandboxInfinite = stopSandboxInfinite;
window.finalizeSandboxInfinite = finalizeSandboxInfinite;

// Équivalent de ClassCombatManager.tickAutoSkills() (sans le throttle par décision
// toutes les 300ms — la boucle batch décide déjà à chaque tick) : Grimoire d'abord
// (chooseGrimoireAction, module pur réutilisé tel quel), repli sur la priorité par
// défaut sinon, en excluant les slots réservés à un contre pour ne pas les gâcher.
function chooseSandboxAutoOrGrimoireAction(state, priorityList, grimoireRules, kit) {
  if (!kit || !state.enemy) return { slot: null, matchedConditionId: null };

  var combatContext = buildSandboxCombatContext(state);
  var activeRules = (Array.isArray(grimoireRules) && grimoireRules.length) ? grimoireRules : null;

  if (activeRules && typeof chooseGrimoireAction === "function") {
    var grimoireResult = chooseGrimoireAction(activeRules, kit, state.resourceState, state.cooldownState, combatContext);
    if (grimoireResult) {
      return { slot: grimoireResult.actionSlot, matchedConditionId: grimoireResult.matchedConditionId };
    }
  }

  var priorityRule = (activeRules && typeof getPrioritaryCounterRule === "function")
    ? getPrioritaryCounterRule(activeRules, kit, state.enemy)
    : null;
  var priorityListForFallback = priorityRule
    ? priorityList.filter(function (s) { return s !== priorityRule.actionSlot; })
    : priorityList;

  var slot = (typeof chooseAutoAction === "function")
    ? chooseAutoAction(priorityListForFallback, kit, state.resourceState, state.cooldownState, combatContext)
    : null;

  return { slot: slot, matchedConditionId: null }; // jamais de contre depuis le repli par défaut
}
window.chooseSandboxAutoOrGrimoireAction = chooseSandboxAutoOrGrimoireAction;
