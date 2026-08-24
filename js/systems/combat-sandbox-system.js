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

var SANDBOX_DEFENSE_EFFECTS = {
  knight_guard: { reductionPct: 0.50, durationMs: 2000 },
  archer_evasion: { reductionPct: 0.70, durationMs: 1000 },
  mage_arcane_barrier: { reductionPct: 0.40, durationMs: 3000 }
};

function getSandboxHeroBaseStats(heroId) {
  if (typeof HEROES_DB === "undefined" || !HEROES_DB || !heroId || !HEROES_DB[heroId]) return null;
  return structuredClone(HEROES_DB[heroId].stats || {});
}

function buildSandboxHeroStats(heroId, overrideStats) {
  if (typeof HEROES_DB === "undefined" || !HEROES_DB || !heroId || !HEROES_DB[heroId]) return null;
  var hero = structuredClone(HEROES_DB[heroId]);
  var baseStats = hero.stats || {};
  var override = (overrideStats && typeof overrideStats === "object") ? structuredClone(overrideStats) : null;
  var s = override ? Object.assign({}, baseStats, override) : baseStats;
  var c = SANDBOX_HERO_BASE_COEFS;

  var tapDamage = c.BASE_TAP_DAMAGE + (s.power || 0) * c.FORCE_TAP_COEF;
  var critChancePercent = c.BASE_CRIT_CHANCE + (s.precision || 0) * c.PRECISION_CRIT_COEF;
  var critChance = Math.min(1, Math.max(0, critChancePercent / 100));
  var critMult = c.BASE_CRIT_MULT + (s.will || 0) * c.WILL_CRIT_MULT_COEF;
  var maxHp = Math.max(1, Math.floor(Math.pow(Math.max(0, s.endurance || 0), c.ENDURANCE_HP_EXP) * c.ENDURANCE_HP_COEF));
  var defensePct = Math.min(0.60, (s.endurance || 0) * c.HERO_DEFENSE_COEF);

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
    defensePct: defensePct
  };
}

function applySandboxEquipmentBonus(heroStats, rarity) {
  if (!heroStats) return heroStats;
  if (!rarity || typeof rarity !== "string") return Object.assign({}, heroStats);
  if (typeof EQUIPMENT_SLOTS === "undefined" || typeof EQUIPMENT_SLOT_CONFIG === "undefined") return Object.assign({}, heroStats);

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

  var tapMultTotal = 1 + totals.tapMult;
  var newTapDamage = heroStats.tapDamage * tapMultTotal + totals.tapDmg;

  var newCritChance = Math.min(1, Math.max(0, heroStats.critChance + totals.critChance / 100));
  var newCritMult = heroStats.critMult + totals.critMult;
  var newDefensePct = Math.min(0.60, heroStats.defensePct + totals.defense);

  return Object.assign({}, heroStats, {
    tapDamage: newTapDamage,
    critChance: newCritChance,
    critMult: newCritMult,
    defensePct: newDefensePct,
    equipmentAutoDpsRef: totals.autoDps,
    equipmentGoldMultRef: 1 + totals.goldMult,
    equipmentRarity: rarity
  });
}

function buildSandboxEnemyStats(enemyId, overrideCoefs) {
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

  return {
    enemyId: enemyId,
    name: enemy.name,
    asset: enemy.asset,
    isBoss: isBoss,
    resists: enemy.resists || [],
    weak: enemy.weak || [],
    power: scaledPower,
    maxHp: maxHp,
    hp: maxHp,
    attackIntervalS: attackIntervalS
  };
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

function createSandboxCombatState(classId, heroId, enemyId, overrideStats, baseCooldownMs, overrideEnemyCoefs, equipmentRarity) {
  if (typeof getClassByHeroId !== "function" || typeof getClassSkills !== "function") return null;
  if (typeof createCombatResourceState !== "function" || typeof createCooldownState !== "function") return null;

  var cls = getClassByHeroId(heroId);
  if (!cls || cls.id !== classId) return null;

  var kit = getClassSkills(classId);
  if (!kit) return null;

  var heroStats = buildSandboxHeroStats(heroId, overrideStats);
  if (heroStats && equipmentRarity) heroStats = applySandboxEquipmentBonus(heroStats, equipmentRarity);
  var enemyStats = buildSandboxEnemyStats(enemyId, overrideEnemyCoefs);
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
    totalDamageAvoided: 0,
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
    return { totalDamage: 0, anyCritical: false, hitsDamage: [] };
  }
  var hero = state.hero;
  var enemy = state.enemy;
  var affinityMult = getDamageAffinityMult(hero.weaponType, enemy.resists, enemy.weak, state.enemyCoefs);
  var hits = Math.max(1, action.hits || 1);
  var hitsDamage = [];
  var anyCritical = false;

  for (var i = 0; i < hits; i++) {
    var isCritical = Math.random() < hero.critChance;
    if (isCritical) anyCritical = true;
    var base = hero.tapDamage * action.damageMultiplier * affinityMult;
    var dmg = Math.max(1, Math.floor(isCritical ? base * hero.critMult : base));
    hitsDamage.push(dmg);
  }

  var totalDamage = hitsDamage.reduce(function (sum, d) { return sum + d; }, 0);
  return { totalDamage: totalDamage, anyCritical: anyCritical, hitsDamage: hitsDamage };
}

function resolveSandboxEnemyStrike(state) {
  if (!state) return { damage: 0, avoided: 0 };
  var c = Object.assign({}, SANDBOX_ENEMY_COEFS, state.enemyCoefs || {});
  var raw = state.enemy.power * c.POWER_DMG_COEF;
  var afterDefensePct = raw * (1 - state.hero.defensePct);

  var activeDefense = state.activeDefense;
  var isDefenseActive = !!(activeDefense && state.elapsedMs < activeDefense.expiresAtMs);
  var mitigated = isDefenseActive ? afterDefensePct * (1 - activeDefense.reductionPct) : afterDefensePct;

  var damageWithoutActiveDefense = Math.max(1, Math.floor(afterDefensePct));
  var damage = Math.max(1, Math.floor(mitigated));
  var avoided = isDefenseActive ? Math.max(0, damageWithoutActiveDefense - damage) : 0;

  return { damage: damage, avoided: avoided };
}

function triggerSandboxEnemyStrike(state) {
  var strike = resolveSandboxEnemyStrike(state);
  var next = Object.assign({}, state, {
    hero: Object.assign({}, state.hero, {
      hp: Math.max(0, state.hero.hp - strike.damage)
    }),
    totalDamageAvoided: (state.totalDamageAvoided || 0) + strike.avoided
  });
  var logLine = next.enemy.name + " attaque → " + strike.damage + " dégâts au héros de test.";
  if (strike.avoided > 0) {
    logLine += " (" + strike.avoided + " dégâts évités grâce à " + state.activeDefense.sourceLabel + ")";
  }
  next = appendSandboxLog(next, logLine);

  if (next.hero.hp <= 0) {
    next.status = "defeat";
    next = appendSandboxLog(next, "💀 Défaite — le héros de test tombe.");
    return finalizeSandboxCombat(next);
  }
  return next;
}

function applySandboxAction(state, actionSlot) {
  if (!state) return state;
  if (state.status !== "ongoing") {
    return appendSandboxLog(state, "Combat déjà terminé — relance un combat pour continuer.");
  }

  var kit = getClassSkills(state.classId);
  var action = kit ? kit.actions[actionSlot] : null;
  if (!action) {
    return appendSandboxLog(state, "Action inconnue (" + actionSlot + ").");
  }

  var combatContext = {
    enemyHp: state.enemy.hp,
    enemyMaxHp: state.enemy.maxHp
  };

  if (!canUseAction(state.resourceState, state.cooldownState, action, combatContext)) {
    var reason = "indisponible";
    if (!canAfford(state.resourceState, action.resourceCost)) reason = "ressource insuffisante";
    else if (!isCooldownReady(state.cooldownState, action.id)) reason = "en recharge";
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

  if (action.type === "damage") {
    var dmgResult = computeSandboxActionDamage(next, action);
    isCritical = dmgResult.anyCritical;
    damageDealt = dmgResult.totalDamage;
    next.enemy = Object.assign({}, next.enemy, {
      hp: Math.max(0, next.enemy.hp - damageDealt)
    });
    logLine += " → " + damageDealt + " dégâts" + (isCritical ? " (critique)" : "");
  } else if (action.type === "defense") {
    var defenseEffect = SANDBOX_DEFENSE_EFFECTS[action.id];
    if (defenseEffect) {
      next.activeDefense = {
        reductionPct: defenseEffect.reductionPct,
        expiresAtMs: next.elapsedMs + defenseEffect.durationMs,
        sourceLabel: action.label
      };
      logLine += " → posture défensive activée (" + Math.round(defenseEffect.reductionPct * 100) + "% de réduction, " + (defenseEffect.durationMs / 1000) + "s)";
    } else {
      logLine += " → posture défensive activée";
    }
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

function createDefaultSandboxPersistence() {
  return {
    hpMode: "keep",
    hpPercent: 50,
    resourceMode: "keep",
    resourcePercent: 50,
    cooldownMode: "reset"
  };
}

function createSandboxRunState(classId, heroId, queue, persistence, overrideStats, baseCooldownMs, overrideEnemyCoefs, equipmentRarity) {
  if (!Array.isArray(queue) || queue.length === 0) return null;
  var firstCombat = createSandboxCombatState(classId, heroId, queue[0], overrideStats, baseCooldownMs, overrideEnemyCoefs, equipmentRarity);
  if (!firstCombat) return null;

  var pers = persistence || createDefaultSandboxPersistence();

  return {
    classId: classId,
    heroId: heroId,
    overrideStats: overrideStats || null,
    baseCooldownMs: firstCombat.baseCooldownMs,
    overrideEnemyCoefs: overrideEnemyCoefs || null,
    equipmentRarity: equipmentRarity || null,
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
    var freshCombat = createSandboxCombatState(runState.classId, runState.heroId, nextEnemyId, runState.overrideStats, runState.baseCooldownMs, runState.overrideEnemyCoefs, runState.equipmentRarity);
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

function createSandboxInfiniteState(classId, heroId, persistence, overrideStats, baseCooldownMs, overrideEnemyCoefs, equipmentRarity) {
  var enemyOrder = listSandboxAllEnemiesInOrder();
  if (!enemyOrder.length) return null;

  var firstCombat = createSandboxCombatState(classId, heroId, enemyOrder[0], overrideStats, baseCooldownMs, overrideEnemyCoefs, equipmentRarity);
  if (!firstCombat) return null;

  var pers = persistence || createDefaultSandboxPersistence();

  return {
    classId: classId,
    heroId: heroId,
    overrideStats: overrideStats || null,
    baseCooldownMs: firstCombat.baseCooldownMs,
    overrideEnemyCoefs: overrideEnemyCoefs || null,
    equipmentRarity: equipmentRarity || null,
    persistence: pers,
    enemyOrder: enemyOrder,
    currentPosition: 0,
    loopCount: 1,
    currentCombat: firstCombat,
    status: "ongoing",
    defeatedCount: 0,
    totalDamageDealt: 0,
    totalDamageTaken: 0,
    totalDamageAvoided: 0,
    actionCounts: {},
    elapsedMs: 0,
    deathAt: null,
    log: [appendRunLogEntry(0, "--- Début du combat contre " + firstCombat.enemy.name + " (Ennemi 1/" + enemyOrder.length + ", Boucle 1) ---")]
  };
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

  var nextEnemyId = infiniteState.enemyOrder[nextPosition];
  var freshCombat = createSandboxCombatState(infiniteState.classId, infiniteState.heroId, nextEnemyId, infiniteState.overrideStats, infiniteState.baseCooldownMs, infiniteState.overrideEnemyCoefs, infiniteState.equipmentRarity);
  if (!freshCombat) return { status: "invalid" };

  var carried = applySandboxPersistence(Object.assign({}, freshCombat, {
    hero: Object.assign({}, freshCombat.hero, { hp: nextCombatFromCurrent.hero.hp }),
    resourceState: nextCombatFromCurrent.resourceState,
    cooldownState: nextCombatFromCurrent.cooldownState
  }), infiniteState.persistence);

  return { status: "ok", position: nextPosition, loopCount: loopCount, loopedThisStep: loopedThisStep, combat: carried };
}

function applySandboxInfiniteAction(infiniteState, actionSlot) {
  if (!infiniteState) return infiniteState;
  if (infiniteState.status !== "ongoing") return infiniteState;

  var prevCombat = infiniteState.currentCombat;
  var nextCombat = applySandboxAction(prevCombat, actionSlot);

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
    next.defeatedCount = infiniteState.defeatedCount + 1;
    next.log = next.log.concat([appendRunLogEntry(next.elapsedMs, "--- Fin du combat contre " + nextCombat.enemy.name + ", victoire (" + next.defeatedCount + " vaincu(s) au total) ---")]);

    var advance = advanceSandboxInfiniteToNextEnemy(infiniteState, nextCombat);
    if (advance.status === "invalid") {
      next.status = "stopped";
      next.log = next.log.concat([appendRunLogEntry(next.elapsedMs, "--- Mode infini arrêté : ennemi suivant invalide ---")]);
      return next;
    }

    next.currentPosition = advance.position;
    next.loopCount = advance.loopCount;
    next.currentCombat = advance.combat;
    if (advance.loopedThisStep) {
      next.log = next.log.concat([appendRunLogEntry(next.elapsedMs, "🔁 Liste complète parcourue — Boucle " + advance.loopCount + " commence.")]);
    }
    next.log = next.log.concat([appendRunLogEntry(next.elapsedMs, "--- Début du combat contre " + advance.combat.enemy.name + " (Ennemi " + (advance.position + 1) + "/" + infiniteState.enemyOrder.length + ", Boucle " + advance.loopCount + ") ---")]);
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
