"use strict";
/* systems/combat-auto-policy-system.js — moteur PUR de décision auto (bac à sable + combat auto) : priorité par défaut,
   Grimoire de tactiques (règles/réserve/exclusion/fenêtre d'anticipation), diagnostic Mode Expert. Aucun accès à game.* ni au DOM.
   Détail complet (historique de calibrage v3.50-v3.67) : COMMENTAIRES_ORIGINAUX.md */
function chooseAutoAction(priorityList, kit, resourceState, cooldownState, combatContext) {
  if (!priorityList || !Array.isArray(priorityList) || !kit || !kit.actions) return null;
  if (typeof canUseAction !== "function") return null;

  for (var i = 0; i < priorityList.length; i++) {
    var slot = priorityList[i];
    if (typeof slot !== "string") continue;
    var action = kit.actions[slot];
    if (!action) continue;
    if (canUseAction(resourceState, cooldownState, action, combatContext)) {
      return slot;
    }
  }
  return null;
}

function sanitizeAutoPolicyList(rawList, kit) {
  if (!rawList || !Array.isArray(rawList) || !kit || !kit.actions) return [];
  var seen = {};
  var cleaned = [];
  for (var i = 0; i < rawList.length; i++) {
    var slot = rawList[i];
    if (typeof slot !== "string" || seen[slot] || !kit.actions[slot]) continue;
    seen[slot] = true;
    cleaned.push(slot);
  }
  return cleaned;
}

window.chooseAutoAction = chooseAutoAction;
window.sanitizeAutoPolicyList = sanitizeAutoPolicyList;

var HERO_LOW_HP_THRESHOLD_PCT = 0.40;

var ENEMY_ATTACK_ANTICIPATION_THRESHOLD_S = 0.5;

function evaluateGrimoireCondition(conditionId, combatContext) {
  var ctx = combatContext || {};

  switch (conditionId) {
    case "chargeIncoming":
      return !!ctx.chargeIncoming;
    case "shieldIncoming":
      return !!ctx.shieldIncoming;
    case "healIncoming":
      return !!ctx.healIncoming;
    case "heroLowHp":
      return typeof ctx.heroHpPercent === "number" && ctx.heroHpPercent <= HERO_LOW_HP_THRESHOLD_PCT;
    case "enemyAttackIncoming":
      return typeof ctx.secondsUntilEnemyAttack === "number" && ctx.secondsUntilEnemyAttack <= ENEMY_ATTACK_ANTICIPATION_THRESHOLD_S;
    case "enemyEnraged":
      return ctx.enemyArchetype === "enraged";
    case "enemyCorrupted":
      return ctx.enemyArchetype === "corrupted";
    case "enemySilenceIncoming":
      return !!ctx.enemySilenceIncoming;
    case "enemyVampiric":
      return ctx.enemyArchetype === "vampiric";
    case "enemyArmored":
      return ctx.enemyArchetype === "armored";
    default:
      return false;
  }
}

window.HERO_LOW_HP_THRESHOLD_PCT = HERO_LOW_HP_THRESHOLD_PCT;
window.ENEMY_ATTACK_ANTICIPATION_THRESHOLD_S = ENEMY_ATTACK_ANTICIPATION_THRESHOLD_S;
window.evaluateGrimoireCondition = evaluateGrimoireCondition;

function explainGrimoireRuleStatus(rule, kit, resourceState, cooldownState, combatContext, secondsUntilTrigger) {
  var base = {
    code: "no_condition",
    conditionMet: false,
    resourceOk: false,
    cooldownOk: false,
    actionConditionsOk: false,
    resourceCurrent: null,
    resourceCost: null,
    cooldownRemainingMs: null,
    secondsUntilTrigger: (typeof secondsUntilTrigger === "number") ? secondsUntilTrigger : null
  };

  if (!rule || typeof rule.conditionId !== "string") return base;
  if (typeof rule.actionSlot !== "string") { base.code = "no_action"; return base; }

  var action = (kit && kit.actions) ? kit.actions[rule.actionSlot] : null;
  if (!action) { base.code = "unknown_action"; return base; }

  base.conditionMet = evaluateGrimoireCondition(rule.conditionId, combatContext);
  base.resourceCost = (typeof action.resourceCost === "number") ? action.resourceCost : 0;
  base.resourceCurrent = (resourceState && typeof resourceState.current === "number") ? resourceState.current : null;
  base.resourceOk = (typeof canAfford === "function") ? canAfford(resourceState, action.resourceCost) : true;

  var remaining = (cooldownState && typeof cooldownState[action.id] === "number") ? cooldownState[action.id] : 0;
  base.cooldownRemainingMs = remaining > 0 ? remaining : 0;
  base.cooldownOk = (typeof isCooldownReady === "function") ? isCooldownReady(cooldownState, action.id) : (remaining <= 0);

  base.actionConditionsOk = (typeof checkActionConditions === "function") ? checkActionConditions(action.conditions, combatContext) : true;

  if (!base.conditionMet) { base.code = "condition_false"; return base; }
  if (!base.resourceOk) { base.code = "resource_insufficient"; return base; }
  if (!base.cooldownOk) { base.code = "on_cooldown"; return base; }
  if (!base.actionConditionsOk) { base.code = "action_condition_unmet"; return base; }

  base.code = "ready";
  return base;
}

window.explainGrimoireRuleStatus = explainGrimoireRuleStatus;

function chooseGrimoireAction(rules, kit, resourceState, cooldownState, combatContext) {
  if (!rules || !Array.isArray(rules) || !kit || !kit.actions) return null;
  if (typeof canUseAction !== "function") return null;

  for (var i = 0; i < rules.length; i++) {
    var rule = rules[i];
    if (!rule || typeof rule !== "object") continue;
    if (typeof rule.conditionId !== "string" || typeof rule.actionSlot !== "string") continue;
    if (rule.actionSlot === "basic") continue;

    if (!evaluateGrimoireCondition(rule.conditionId, combatContext)) continue;

    var action = kit.actions[rule.actionSlot];
    if (!action) continue;

    if (canUseAction(resourceState, cooldownState, action, combatContext)) {
      return { actionSlot: rule.actionSlot, matchedConditionId: rule.conditionId };
    }
  }
  return null;
}

window.chooseGrimoireAction = chooseGrimoireAction;

var GRIMOIRE_ASSIGNABLE_SLOTS = ["skill1", "skill2", "skill3", "defense"];

function sanitizeGrimoireRules(rawRules, kit) {
  if (!rawRules || !Array.isArray(rawRules)) return [];

  return rawRules.map(function (rule) {
    if (!rule || typeof rule !== "object") return { conditionId: null, actionSlot: null };

    var conditionId = (typeof rule.conditionId === "string" && typeof GRIMOIRE_CONDITIONS !== "undefined" && GRIMOIRE_CONDITIONS[rule.conditionId])
      ? rule.conditionId
      : null;

    var actionSlot = null;
    if (typeof rule.actionSlot === "string"
      && GRIMOIRE_ASSIGNABLE_SLOTS.indexOf(rule.actionSlot) !== -1
      && (!kit || !kit.actions || kit.actions[rule.actionSlot])) {
      actionSlot = rule.actionSlot;
    }

    return { conditionId: conditionId, actionSlot: actionSlot };
  });
}

window.GRIMOIRE_ASSIGNABLE_SLOTS = GRIMOIRE_ASSIGNABLE_SLOTS;
window.sanitizeGrimoireRules = sanitizeGrimoireRules;

var GRIMOIRE_BASE_SLOT_COUNT = 2;

var GRIMOIRE_UNLOCK_WORLD_INDEXES = [2, 3, 4, 5];

function getGrimoireSlotCount(worldsEverReached) {
  var reached = (worldsEverReached && typeof worldsEverReached === "object") ? worldsEverReached : {};
  var extra = 0;
  for (var i = 0; i < GRIMOIRE_UNLOCK_WORLD_INDEXES.length; i++) {
    if (reached[GRIMOIRE_UNLOCK_WORLD_INDEXES[i]]) extra++;
  }
  return GRIMOIRE_BASE_SLOT_COUNT + extra;
}

function isGrimoireWorldUnlockMilestone(worldIndex) {
  return GRIMOIRE_UNLOCK_WORLD_INDEXES.indexOf(worldIndex) !== -1;
}

window.GRIMOIRE_BASE_SLOT_COUNT = GRIMOIRE_BASE_SLOT_COUNT;
window.GRIMOIRE_UNLOCK_WORLD_INDEXES = GRIMOIRE_UNLOCK_WORLD_INDEXES;
window.getGrimoireSlotCount = getGrimoireSlotCount;
window.isGrimoireWorldUnlockMilestone = isGrimoireWorldUnlockMilestone;

function isConditionPossibleForEnemy(conditionId, enemy) {
  if (conditionId === "heroLowHp") return true;
  if (!enemy) return false;

  if (conditionId === "chargeIncoming") return !enemy.isBoss;
  if (conditionId === "shieldIncoming" || conditionId === "healIncoming") return !!enemy.isBoss;
  if (conditionId === "enemyAttackIncoming") return true;
  if (conditionId === "enemyEnraged") return enemy.archetype === "enraged";
  if (conditionId === "enemyCorrupted") return enemy.archetype === "corrupted";
  if (conditionId === "enemySilenceIncoming") return !enemy.isBoss && enemy.archetype === "silenced";
  if (conditionId === "enemyVampiric") return enemy.archetype === "vampiric";
  if (conditionId === "enemyArmored") return enemy.archetype === "armored";

  return false;
}

window.isConditionPossibleForEnemy = isConditionPossibleForEnemy;

function getPrioritaryCounterRule(rules, kit, enemy) {
  if (!rules || !Array.isArray(rules) || !kit || !kit.actions) return null;

  for (var i = 0; i < rules.length; i++) {
    var rule = rules[i];
    if (!rule || typeof rule !== "object" || typeof rule.actionSlot !== "string") continue;

    var action = kit.actions[rule.actionSlot];
    if (!action || !Array.isArray(action.counters) || !action.counters.length) continue;

    if (enemy !== undefined && !isConditionPossibleForEnemy(rule.conditionId, enemy)) continue;

    return rule;
  }
  return null;
}

function getGrimoireCounterReserveAmount(rules, kit, enemy) {
  var rule = getPrioritaryCounterRule(rules, kit, enemy);
  if (!rule) return 0;

  var action = kit.actions[rule.actionSlot];
  return (typeof action.resourceCost === "number" && action.resourceCost > 0) ? action.resourceCost : 0;
}

window.getPrioritaryCounterRule = getPrioritaryCounterRule;
window.getGrimoireCounterReserveAmount = getGrimoireCounterReserveAmount;

function getAllCounterActionSlots(rules, kit, enemy) {
  if (!rules || !Array.isArray(rules) || !kit || !kit.actions) return [];

  var seen = {};
  var slots = [];
  for (var i = 0; i < rules.length; i++) {
    var rule = rules[i];
    if (!rule || typeof rule !== "object" || typeof rule.actionSlot !== "string") continue;

    var action = kit.actions[rule.actionSlot];
    if (!action || !Array.isArray(action.counters) || !action.counters.length) continue;

    if (enemy !== undefined && !isConditionPossibleForEnemy(rule.conditionId, enemy)) continue;

    if (!seen[rule.actionSlot]) {
      seen[rule.actionSlot] = true;
      slots.push(rule.actionSlot);
    }
  }
  return slots;
}

window.getAllCounterActionSlots = getAllCounterActionSlots;

var GRIMOIRE_APPROACH_WINDOW_FACTOR_S_PER_COST = 0.10;
var GRIMOIRE_APPROACH_WINDOW_MIN_S = 3;

var GRIMOIRE_APPROACH_WINDOW_FIXED_S = 10;

function getGrimoireApproachWindowSeconds(actionResourceCost) {
  return GRIMOIRE_APPROACH_WINDOW_FIXED_S;
}

function estimateResourceGainOverWindow(resourceDef, windowSeconds, effectiveBasicCooldownMs, basicDamageEstimate) {
  if (!resourceDef || !resourceDef.generation || typeof resourceDef.generation.type !== "string") return 0;
  var window = (typeof windowSeconds === "number" && windowSeconds > 0) ? windowSeconds : 0;
  if (window <= 0) return 0;

  var cooldownMs = (typeof effectiveBasicCooldownMs === "number" && effectiveBasicCooldownMs > 0) ? effectiveBasicCooldownMs : 0;
  var estimatedHits = cooldownMs > 0 ? Math.floor((window * 1000) / cooldownMs) : 0;

  var gen = resourceDef.generation;
  switch (gen.type) {
    case "passiveAndBasicAttack": {
      var passiveGain = (gen.passivePerSecond || 0) * window;
      var basicGain = estimatedHits * (gen.basicAttackGain || 0);
      return passiveGain + basicGain;
    }
    case "successfulBasicAttack": {
      return estimatedHits * (gen.value || 0);
    }
    case "damageDealtPercent": {
      var dmg = (typeof basicDamageEstimate === "number" && basicDamageEstimate > 0) ? basicDamageEstimate : 0;
      var perHit = dmg * (gen.value || 0);
      if (typeof gen.maxGainPerHit === "number" && gen.maxGainPerHit > 0) {
        perHit = Math.min(perHit, gen.maxGainPerHit);
      }
      return estimatedHits * perHit;
    }
    default:
      return 0;
  }
}

window.GRIMOIRE_APPROACH_WINDOW_FACTOR_S_PER_COST = GRIMOIRE_APPROACH_WINDOW_FACTOR_S_PER_COST;
window.GRIMOIRE_APPROACH_WINDOW_MIN_S = GRIMOIRE_APPROACH_WINDOW_MIN_S;
window.GRIMOIRE_APPROACH_WINDOW_FIXED_S = GRIMOIRE_APPROACH_WINDOW_FIXED_S;
window.getGrimoireApproachWindowSeconds = getGrimoireApproachWindowSeconds;
window.estimateResourceGainOverWindow = estimateResourceGainOverWindow;

// Affinité d'arme en version pure (getDamageAffinity réel dépend de game.equipped/
// game.heroId) — mêmes constantes globales que combat-engine.js, aucune dupliquée.
function getPureDamageAffinityMult(weaponType, enemyResists, enemyWeak) {
  if (!weaponType) return (typeof NO_WEAPON_MULT === "number") ? NO_WEAPON_MULT : 0.8;
  var resists = enemyResists || [];
  var weak = enemyWeak || [];
  if (resists.indexOf(weaponType) !== -1) return (typeof RESIST_DMG_MULT === "number") ? RESIST_DMG_MULT : 0.7;
  if (weak.indexOf(weaponType) !== -1) return (typeof WEAK_DMG_MULT === "number") ? WEAK_DMG_MULT : 1.3;
  return 1;
}

// Jumelle pure de estimateResourceGainOverWindow : estimation optimiste du temps
// restant avant la mort de l'ennemi, à partir des stats ACTUELLES du héros (pas
// d'historique de dégâts réels) — tap + auto-DPS, affinité d'arme, crit moyen.
// heroStats.critChance attendu en fraction 0-1 (pas en pourcentage).
function estimateTimeToKillMs(heroStats, enemyStats) {
  if (!heroStats || !enemyStats) return Infinity;
  var enemyHp = Number(enemyStats.hp || 0);
  if (enemyHp <= 0) return 0;

  var affinityMult = getPureDamageAffinityMult(heroStats.weaponType, enemyStats.resists, enemyStats.weak);
  var critChance = Math.max(0, Math.min(1, Number(heroStats.critChance || 0)));
  var critMult = Number(heroStats.critMult || 1);
  var avgCritFactor = 1 + critChance * (critMult - 1);

  var effectiveCooldownMs = Number(heroStats.effectiveBasicCooldownMs || 0);
  var tapDamage = Number(heroStats.tapDamage || 0);
  var tapDps = effectiveCooldownMs > 0 ? (tapDamage * avgCritFactor * affinityMult) / (effectiveCooldownMs / 1000) : 0;

  var autoDps = Number(heroStats.autoDps || 0) * affinityMult;

  var totalDps = tapDps + autoDps;
  if (totalDps <= 0) return Infinity;

  return (enemyHp / totalDps) * 1000;
}

window.getPureDamageAffinityMult = getPureDamageAffinityMult;
window.estimateTimeToKillMs = estimateTimeToKillMs;
