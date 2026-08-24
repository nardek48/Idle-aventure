"use strict";
/* systems/combat-cooldown-system.js — cooldowns d'action de classe + vérification conditions/coûts, module PUR (aucun accès game.* ni DOM, pas de mutation).
   cooldownState = { [actionId]: remainingMs }, absent = disponible. Détail complet : COMMENTAIRES_ORIGINAUX.md */

function createCooldownState() {
  return {};
}

function isCooldownReady(cooldownState, actionId) {
  if (!cooldownState || typeof cooldownState !== "object") return false;
  if (!actionId || typeof actionId !== "string") return false;
  var remaining = cooldownState[actionId];
  return !(typeof remaining === "number" && remaining > 0);
}

function startCooldown(cooldownState, actionId, durationMs) {
  var base = (cooldownState && typeof cooldownState === "object") ? cooldownState : {};
  if (!actionId || typeof actionId !== "string") return Object.assign({}, base);

  var duration = (typeof durationMs === "number" && durationMs > 0) ? durationMs : 0;
  var next = Object.assign({}, base);
  if (duration > 0) {
    next[actionId] = duration;
  } else {
    delete next[actionId];
  }
  return next;
}

function tickCooldowns(cooldownState, elapsedMs) {
  var base = (cooldownState && typeof cooldownState === "object") ? cooldownState : {};
  var elapsed = (typeof elapsedMs === "number" && elapsedMs > 0) ? elapsedMs : 0;
  if (elapsed <= 0) return Object.assign({}, base);

  var next = {};
  Object.keys(base).forEach(function (actionId) {
    var remaining = base[actionId] - elapsed;
    if (remaining > 0) next[actionId] = remaining;
  });
  return next;
}

function checkActionConditions(conditions, combatContext) {
  if (!conditions || typeof conditions !== "object") return true;
  var ctx = combatContext || {};

  if (typeof conditions.enemyHpPercentBelowOrEqual === "number") {
    var enemyHp = ctx.enemyHp;
    var enemyMaxHp = ctx.enemyMaxHp;
    if (typeof enemyHp !== "number" || typeof enemyMaxHp !== "number" || enemyMaxHp <= 0) {
      return false;
    }
    var enemyHpPercent = enemyHp / enemyMaxHp;
    if (enemyHpPercent > conditions.enemyHpPercentBelowOrEqual) return false;
  }

  return true;
}

function canUseAction(resourceState, cooldownState, action, combatContext) {
  if (!action || typeof action.id !== "string") return false;
  if (typeof canAfford === "function" && !canAfford(resourceState, action.resourceCost)) return false;
  if (!isCooldownReady(cooldownState, action.id)) return false;
  if (!checkActionConditions(action.conditions, combatContext)) return false;
  if (combatContext && combatContext.isSilenced && action.slot !== "defense") return false;
  return true;
}

function useAction(resourceState, cooldownState, action, combatContext) {
  if (!canUseAction(resourceState, cooldownState, action, combatContext)) {
    return {
      success: false,
      resourceState: resourceState,
      cooldownState: cooldownState
    };
  }

  var nextResourceState = (typeof spendResource === "function")
    ? spendResource(resourceState, action.resourceCost)
    : resourceState;

  if (typeof action.resourceGain === "number" && action.resourceGain > 0 && nextResourceState) {
    nextResourceState = Object.assign({}, nextResourceState, {
      current: Math.min(nextResourceState.max, nextResourceState.current + action.resourceGain)
    });
  }

  var nextCooldownState = startCooldown(cooldownState, action.id, action.cooldownMs);

  return {
    success: true,
    resourceState: nextResourceState,
    cooldownState: nextCooldownState
  };
}

function computeEffectiveCooldownMs(baseCooldownMs, celerity, options) {
  var base = (typeof baseCooldownMs === "number" && baseCooldownMs > 0) ? baseCooldownMs : 0;
  if (base <= 0) return 0;

  var cel = (typeof celerity === "number" && celerity > 0) ? celerity : 0;
  if (cel <= 0) return base;

  var opts = options || {};
  var minRatio = (typeof opts.minRatio === "number" && opts.minRatio > 0 && opts.minRatio <= 1) ? opts.minRatio : 0.5;

  var effective = base / (1 + cel / 100);
  var floor = base * minRatio;
  return Math.max(floor, effective);
}

window.createCooldownState = createCooldownState;
window.isCooldownReady = isCooldownReady;
window.startCooldown = startCooldown;
window.tickCooldowns = tickCooldowns;
window.checkActionConditions = checkActionConditions;
window.canUseAction = canUseAction;
window.useAction = useAction;
window.computeEffectiveCooldownMs = computeEffectiveCooldownMs;
