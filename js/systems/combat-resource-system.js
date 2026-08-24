"use strict";
/* systems/combat-resource-system.js — ressource de classe (Rage/Concentration/Mana), module PUR (aucun accès game.* ni DOM, pas de mutation).
   État = { classId, resourceId, current, max }. Règles de gain lues depuis resource.generation. Détail complet : COMMENTAIRES_ORIGINAUX.md */

function createCombatResourceState(classId) {
  var resourceDef = (typeof getClassResource === "function") ? getClassResource(classId) : null;
  if (!resourceDef) return null;

  return {
    classId: classId,
    resourceId: resourceDef.id,
    current: resourceDef.initial,
    max: resourceDef.max
  };
}

function canAfford(state, amount) {
  if (!state || typeof state.current !== "number") return false;
  var cost = (typeof amount === "number" && amount > 0) ? amount : 0;
  return state.current >= cost;
}

function spendResource(state, amount) {
  if (!state) return state;
  var cost = (typeof amount === "number" && amount > 0) ? amount : 0;
  if (!canAfford(state, cost)) {
    return Object.assign({}, state);
  }
  return Object.assign({}, state, {
    current: Math.max(0, state.current - cost)
  });
}

function applyResourceGain(state, gainRule, context) {
  if (!state) return state;
  if (!gainRule || typeof gainRule.type !== "string") {
    return Object.assign({}, state);
  }
  var ctx = context || {};
  var gain = 0;

  switch (gainRule.type) {
    case "damageDealtPercent": {
      var damageDealt = (typeof ctx.damageDealt === "number" && ctx.damageDealt > 0) ? ctx.damageDealt : 0;
      gain = damageDealt * (gainRule.value || 0);
      if (typeof gainRule.maxGainPerHit === "number" && gainRule.maxGainPerHit > 0) {
        gain = Math.min(gain, gainRule.maxGainPerHit);
      }
      break;
    }
    case "successfulBasicAttack": {
      gain = gainRule.value || 0;
      if (ctx.isCritical) gain += (gainRule.criticalBonus || 0);
      break;
    }
    case "passiveAndBasicAttack": {
      if (ctx.isBasicAttack) gain = gainRule.basicAttackGain || 0;
      break;
    }
    default:
      gain = 0;
  }

  if (gain <= 0) return Object.assign({}, state);

  return Object.assign({}, state, {
    current: Math.min(state.max, state.current + gain)
  });
}

function tickResourceRegen(state, gainRule, elapsedMs) {
  if (!state) return state;
  var elapsed = (typeof elapsedMs === "number" && elapsedMs > 0) ? elapsedMs : 0;
  if (elapsed <= 0 || !gainRule || gainRule.type !== "passiveAndBasicAttack") {
    return Object.assign({}, state);
  }
  var perSecond = gainRule.passivePerSecond || 0;
  var gain = perSecond * (elapsed / 1000);
  if (gain <= 0) return Object.assign({}, state);

  return Object.assign({}, state, {
    current: Math.min(state.max, state.current + gain)
  });
}

function restoreResourcePercent(state, percent) {
  if (!state) return state;
  var pct = (typeof percent === "number" && percent > 0) ? Math.min(100, percent) : 0;
  if (pct <= 0) return Object.assign({}, state);

  var gain = state.max * (pct / 100);
  return Object.assign({}, state, {
    current: Math.min(state.max, state.current + gain)
  });
}

window.createCombatResourceState = createCombatResourceState;
window.canAfford = canAfford;
window.spendResource = spendResource;
window.applyResourceGain = applyResourceGain;
window.tickResourceRegen = tickResourceRegen;
window.restoreResourcePercent = restoreResourcePercent;
