"use strict";
/* data/enemy-archetypes.js — états permanents d'ennemi (Enragé/Corrupteur/Vampirique/Blindé = boss ; Silencieux = normal).
   Donnée + logique pure, aucun accès à game.*. v3.102.0 (P2) : durées en ROUNDS (ex 4 000 ms → 2 rounds). */

var ENRAGED_MIN_WORLD_INDEX = 3;
var CORRUPTED_MIN_WORLD_INDEX = 3;
var ENRAGED_SPAWN_CHANCE_PCT = 25;
var ENRAGED_DAMAGE_BONUS_PER_10PCT_LOST = 0.08;
var ENRAGED_DAMAGE_BONUS_CAP = 0.50;
var ENRAGED_FREEZE_DURATION_ROUNDS = 4;   // v3.204.0 (E3) : 2 -> 4, une suppression de 2 rounds sur un combat de 11 ne se voyait pas
var ENRAGED_SUPPRESSION_REDUCTION_PCT = 0.20;
var CORRUPTED_DAMAGE_REDUCTION_PER_STACK = 0.05;
var CORRUPTED_MAX_STACKS = 5;
var VAMPIRIC_MIN_WORLD_INDEX = 3;
var VAMPIRIC_LIFESTEAL_PCT = 0.15;
var VAMPIRIC_SUPPRESSION_DURATION_ROUNDS = 4;  // v3.204.0 (E3) : idem
var ARMORED_MIN_WORLD_INDEX = 3;
var ARMORED_DAMAGE_REDUCTION_PCT = 0.10;
var ARMORED_SUPPRESSION_REDUCTION_PCT = 0.05;
var ARMORED_SUPPRESSION_DURATION_ROUNDS = 4;   // v3.204.0 (E3) : idem
var SILENCED_MIN_WORLD_INDEX = 1;
var SILENCED_VS_CHARGE_CHANCE_PCT = 50;
var SILENCE_DURATION_ROUNDS = 2;

// v3.104.1 (P5) : identité FIXE par ennemi (LIGNE_DIRECTRICE §8, profils de round distincts). Prioritaire sur le
// tirage aléatoire ci-dessous. Le Troll des forêts encaisse (bouclier), la Ronce animée bloque (silence) — cohérent
// avec leurs stats (tanky/lent vs agressive/rapide, décision Seb) et disponible dès la Forêt (worldIndex 0), sans
// attendre SILENCED_MIN_WORLD_INDEX qui ne régit que le tirage aléatoire du reste du pool.
var FIXED_ENEMY_ARCHETYPES = {
  foresttroll: "shielded",
  bramble: "silenced"
};

// v3.105.0 : distance d'approche — rounds avant le contact face à un héros À DISTANCE (arc/magie). 0 = frappe
// immédiatement (l'ennemi attaque lui-même à distance) ; le Chevalier (épée) est toujours au contact direct.
var ENGAGE_DEFAULT_ROUNDS = 2;
var ENGAGE_BOSS_ROUNDS = 2;
var ENEMY_ENGAGE_ROUNDS = {
  spider: 0,      // cracheuse
  goblin: 0,      // frondeur
  bramble: 0,     // lianes-fouets
  foresttroll: 2  // lourd et lent
};

/* Rounds d'approche pour un ennemi donné (héros à distance uniquement — l'appelant gère le cas mêlée). */
function getEnemyEngageRounds(enemyId, isBoss) {
  if (isBoss) return ENGAGE_BOSS_ROUNDS;
  if (enemyId && ENEMY_ENGAGE_ROUNDS.hasOwnProperty(enemyId)) return ENEMY_ENGAGE_ROUNDS[enemyId];
  return ENGAGE_DEFAULT_ROUNDS;
}

function decideNormalEnemyArchetype(worldIndex, isBoss, silenceRoll, enemyId) {
  if (isBoss) return null;
  if (enemyId && FIXED_ENEMY_ARCHETYPES.hasOwnProperty(enemyId)) return FIXED_ENEMY_ARCHETYPES[enemyId];
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

/* v3.204.0 (E4) : intensité de l'archétype — doublée pendant l'exaltation d'une
   élite (enemy.surgeRounds > 0). Une suppression posée à temps reste
   prioritaire : contrer avant le pic annule bien son effet. */
function getArchetypeIntensityMult(enemy) {
  if (!enemy || !(Number(enemy.surgeRounds || 0) > 0)) return 1;
  return (typeof ELITE_SURGE_INTENSITY_MULT === "number") ? ELITE_SURGE_INTENSITY_MULT : 2;
}

function getArmoredEffectiveDamageReduction(enemy) {
  if (!enemy || enemy.archetype !== "armored") return 0;

  if (Number(enemy.armorSuppressedRounds || 0) > 0) {
    return Math.max(0, Number(enemy.armorSuppressedReduction || 0));
  }
  return Math.min(0.9, ARMORED_DAMAGE_REDUCTION_PCT * getArchetypeIntensityMult(enemy));
}

/* enemy est optionnel : sans lui, comportement d'origine (pas d'exaltation). */
function getVampiricLifestealAmount(damageDealt, enemy) {
  var dmg = (typeof damageDealt === "number" && damageDealt > 0) ? damageDealt : 0;
  return Math.max(0, Math.floor(dmg * VAMPIRIC_LIFESTEAL_PCT * getArchetypeIntensityMult(enemy)));
}

function getEnragedDamageMultiplier(pctHpLost, enemy) {
  var pct = (typeof pctHpLost === "number" && pctHpLost > 0) ? Math.min(1, pctHpLost) : 0;
  var tier = Math.floor(pct * 10);
  var mult = getArchetypeIntensityMult(enemy);
  var bonus = Math.min(ENRAGED_DAMAGE_BONUS_CAP * mult, tier * ENRAGED_DAMAGE_BONUS_PER_10PCT_LOST * mult);
  return 1 + bonus;
}

function getCorruptedDamageMultiplier(stackCount, enemy) {
  var stacks = (typeof stackCount === "number" && stackCount > 0) ? Math.min(CORRUPTED_MAX_STACKS, Math.floor(stackCount)) : 0;
  return Math.max(0, 1 - stacks * CORRUPTED_DAMAGE_REDUCTION_PER_STACK * getArchetypeIntensityMult(enemy));
}

window.ENRAGED_MIN_WORLD_INDEX = ENRAGED_MIN_WORLD_INDEX;
window.CORRUPTED_MIN_WORLD_INDEX = CORRUPTED_MIN_WORLD_INDEX;
window.ENRAGED_SPAWN_CHANCE_PCT = ENRAGED_SPAWN_CHANCE_PCT;
window.ENRAGED_DAMAGE_BONUS_PER_10PCT_LOST = ENRAGED_DAMAGE_BONUS_PER_10PCT_LOST;
window.ENRAGED_DAMAGE_BONUS_CAP = ENRAGED_DAMAGE_BONUS_CAP;
window.ENRAGED_FREEZE_DURATION_ROUNDS = ENRAGED_FREEZE_DURATION_ROUNDS;
window.ENRAGED_SUPPRESSION_REDUCTION_PCT = ENRAGED_SUPPRESSION_REDUCTION_PCT;
window.CORRUPTED_DAMAGE_REDUCTION_PER_STACK = CORRUPTED_DAMAGE_REDUCTION_PER_STACK;
window.CORRUPTED_MAX_STACKS = CORRUPTED_MAX_STACKS;
window.VAMPIRIC_MIN_WORLD_INDEX = VAMPIRIC_MIN_WORLD_INDEX;
window.VAMPIRIC_LIFESTEAL_PCT = VAMPIRIC_LIFESTEAL_PCT;
window.VAMPIRIC_SUPPRESSION_DURATION_ROUNDS = VAMPIRIC_SUPPRESSION_DURATION_ROUNDS;
window.ARMORED_MIN_WORLD_INDEX = ARMORED_MIN_WORLD_INDEX;
window.ARMORED_DAMAGE_REDUCTION_PCT = ARMORED_DAMAGE_REDUCTION_PCT;
window.ARMORED_SUPPRESSION_REDUCTION_PCT = ARMORED_SUPPRESSION_REDUCTION_PCT;
window.ARMORED_SUPPRESSION_DURATION_ROUNDS = ARMORED_SUPPRESSION_DURATION_ROUNDS;
window.SILENCED_MIN_WORLD_INDEX = SILENCED_MIN_WORLD_INDEX;
window.SILENCED_VS_CHARGE_CHANCE_PCT = SILENCED_VS_CHARGE_CHANCE_PCT;
window.SILENCE_DURATION_ROUNDS = SILENCE_DURATION_ROUNDS;
window.FIXED_ENEMY_ARCHETYPES = FIXED_ENEMY_ARCHETYPES;
window.ENGAGE_DEFAULT_ROUNDS = ENGAGE_DEFAULT_ROUNDS;
window.ENGAGE_BOSS_ROUNDS = ENGAGE_BOSS_ROUNDS;
window.ENEMY_ENGAGE_ROUNDS = ENEMY_ENGAGE_ROUNDS;
window.getEnemyEngageRounds = getEnemyEngageRounds;
window.decideEnemyArchetype = decideEnemyArchetype;
window.decideNormalEnemyArchetype = decideNormalEnemyArchetype;
window.getEnragedDamageMultiplier = getEnragedDamageMultiplier;
window.getCorruptedDamageMultiplier = getCorruptedDamageMultiplier;
window.getVampiricLifestealAmount = getVampiricLifestealAmount;
window.getArmoredEffectiveDamageReduction = getArmoredEffectiveDamageReduction;
window.getArchetypeIntensityMult = getArchetypeIntensityMult;
