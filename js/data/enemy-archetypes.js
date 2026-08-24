"use strict";
/* data/enemy-archetypes.js — états permanents d'ennemi (Enragé/Corrupteur/Vampirique/Blindé = boss ; Silencieux = normal).
   Donnée + logique pure, aucun accès à game.*. Détail complet : COMMENTAIRES_ORIGINAUX.md */

var ENRAGED_MIN_WORLD_INDEX = 3;
var CORRUPTED_MIN_WORLD_INDEX = 3;
var ENRAGED_SPAWN_CHANCE_PCT = 25;
var ENRAGED_DAMAGE_BONUS_PER_10PCT_LOST = 0.08;
var ENRAGED_DAMAGE_BONUS_CAP = 0.50;
var ENRAGED_FREEZE_DURATION_MS = 4000;
var ENRAGED_SUPPRESSION_REDUCTION_PCT = 0.20;
var CORRUPTED_DAMAGE_REDUCTION_PER_STACK = 0.05;
var CORRUPTED_MAX_STACKS = 5;
var VAMPIRIC_MIN_WORLD_INDEX = 3;
var VAMPIRIC_LIFESTEAL_PCT = 0.15;
var VAMPIRIC_SUPPRESSION_DURATION_MS = 4000;
var ARMORED_MIN_WORLD_INDEX = 3;
var ARMORED_DAMAGE_REDUCTION_PCT = 0.10;
var ARMORED_SUPPRESSION_REDUCTION_PCT = 0.05;
var ARMORED_SUPPRESSION_DURATION_MS = 4000;
var SILENCED_MIN_WORLD_INDEX = 1;
var SILENCED_VS_CHARGE_CHANCE_PCT = 50;
var SILENCE_DURATION_MS = 4000;

function decideNormalEnemyArchetype(worldIndex, isBoss, silenceRoll) {
  if (isBoss) return null;
  if (typeof worldIndex !== "number" || worldIndex < SILENCED_MIN_WORLD_INDEX) return null;
  if (typeof silenceRoll !== "number" || silenceRoll > SILENCED_VS_CHARGE_CHANCE_PCT) return null;
  return "silenced";
}

function decideEnemyArchetype(worldIndex, isBoss, spawnRoll, archetypeRoll) {
  if (!isBoss) return null;
  if (typeof worldIndex !== "number") return null;
  if (typeof spawnRoll !== "number" || spawnRoll > ENRAGED_SPAWN_CHANCE_PCT) return null;
  if (typeof archetypeRoll !== "number") return null;

  if (archetypeRoll > 75) {
    if (worldIndex < ARMORED_MIN_WORLD_INDEX) return null;
    return "armored";
  }
  if (archetypeRoll > 50) {
    if (worldIndex < VAMPIRIC_MIN_WORLD_INDEX) return null;
    return "vampiric";
  }
  if (archetypeRoll > 25) {
    if (worldIndex < CORRUPTED_MIN_WORLD_INDEX) return null;
    return "corrupted";
  }
  if (worldIndex < ENRAGED_MIN_WORLD_INDEX) return null;
  return "enraged";
}

function getArmoredEffectiveDamageReduction(enemy) {
  if (!enemy || enemy.archetype !== "armored") return 0;

  if (enemy.armorSuppressedUntil && Date.now() < enemy.armorSuppressedUntil) {
    return Math.max(0, Number(enemy.armorSuppressedReduction || 0));
  }
  return ARMORED_DAMAGE_REDUCTION_PCT;
}

function getVampiricLifestealAmount(damageDealt) {
  var dmg = (typeof damageDealt === "number" && damageDealt > 0) ? damageDealt : 0;
  return Math.max(0, Math.floor(dmg * VAMPIRIC_LIFESTEAL_PCT));
}

function getEnragedDamageMultiplier(pctHpLost) {
  var pct = (typeof pctHpLost === "number" && pctHpLost > 0) ? Math.min(1, pctHpLost) : 0;
  var tier = Math.floor(pct * 10);
  var bonus = Math.min(ENRAGED_DAMAGE_BONUS_CAP, tier * ENRAGED_DAMAGE_BONUS_PER_10PCT_LOST);
  return 1 + bonus;
}

function getCorruptedDamageMultiplier(stackCount) {
  var stacks = (typeof stackCount === "number" && stackCount > 0) ? Math.min(CORRUPTED_MAX_STACKS, Math.floor(stackCount)) : 0;
  return Math.max(0, 1 - stacks * CORRUPTED_DAMAGE_REDUCTION_PER_STACK);
}

window.ENRAGED_MIN_WORLD_INDEX = ENRAGED_MIN_WORLD_INDEX;
window.CORRUPTED_MIN_WORLD_INDEX = CORRUPTED_MIN_WORLD_INDEX;
window.ENRAGED_SPAWN_CHANCE_PCT = ENRAGED_SPAWN_CHANCE_PCT;
window.ENRAGED_DAMAGE_BONUS_PER_10PCT_LOST = ENRAGED_DAMAGE_BONUS_PER_10PCT_LOST;
window.ENRAGED_DAMAGE_BONUS_CAP = ENRAGED_DAMAGE_BONUS_CAP;
window.ENRAGED_FREEZE_DURATION_MS = ENRAGED_FREEZE_DURATION_MS;
window.ENRAGED_SUPPRESSION_REDUCTION_PCT = ENRAGED_SUPPRESSION_REDUCTION_PCT;
window.CORRUPTED_DAMAGE_REDUCTION_PER_STACK = CORRUPTED_DAMAGE_REDUCTION_PER_STACK;
window.CORRUPTED_MAX_STACKS = CORRUPTED_MAX_STACKS;
window.VAMPIRIC_MIN_WORLD_INDEX = VAMPIRIC_MIN_WORLD_INDEX;
window.VAMPIRIC_LIFESTEAL_PCT = VAMPIRIC_LIFESTEAL_PCT;
window.VAMPIRIC_SUPPRESSION_DURATION_MS = VAMPIRIC_SUPPRESSION_DURATION_MS;
window.ARMORED_MIN_WORLD_INDEX = ARMORED_MIN_WORLD_INDEX;
window.ARMORED_DAMAGE_REDUCTION_PCT = ARMORED_DAMAGE_REDUCTION_PCT;
window.ARMORED_SUPPRESSION_REDUCTION_PCT = ARMORED_SUPPRESSION_REDUCTION_PCT;
window.ARMORED_SUPPRESSION_DURATION_MS = ARMORED_SUPPRESSION_DURATION_MS;
window.SILENCED_MIN_WORLD_INDEX = SILENCED_MIN_WORLD_INDEX;
window.SILENCED_VS_CHARGE_CHANCE_PCT = SILENCED_VS_CHARGE_CHANCE_PCT;
window.SILENCE_DURATION_MS = SILENCE_DURATION_MS;
window.decideEnemyArchetype = decideEnemyArchetype;
window.decideNormalEnemyArchetype = decideNormalEnemyArchetype;
window.getEnragedDamageMultiplier = getEnragedDamageMultiplier;
window.getCorruptedDamageMultiplier = getCorruptedDamageMultiplier;
window.getVampiricLifestealAmount = getVampiricLifestealAmount;
window.getArmoredEffectiveDamageReduction = getArmoredEffectiveDamageReduction;
