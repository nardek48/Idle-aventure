"use strict";
/* systems/exploration-check-system.js — module PUR de test de stat pour les Expéditions non-combat.
   Aucun accès à game, au DOM, à WarehouseManager ou à Math.random (randomValue injecté). Détail : COMMENTAIRES_ORIGINAUX.md */

var ExplorationCheckSystem = {
  /* clamp(value, min, max) -> nombre borné entre min et max. */
  clamp: function (value, min, max) {
    return Math.max(min, Math.min(max, value));
  },

  /* estimate(successChance) -> "low" | "medium" | "high", pour l'affichage qualitatif
     (Faible chance / Chance moyenne / Bonne chance) — jamais de pourcentage exact en UI. */
  estimate: function (successChance) {
    if (successChance < 40) return "low";
    if (successChance < 65) return "medium";
    return "high";
  },

  /* resolveCheck({statValue, difficulty, randomValue}) -> { estimate, successChance, result }
     result: "perfect" | "success" | "setback". randomValue doit être fourni par l'appelant (0-1).
     statBonus plafonné à 55 (et non 35) : avec base 35 et difficultyPenalty=0, un héros très
     fort atteint réellement la borne haute 90 du clamp (35+55=90) — ajusté suite à un premier
     calibrage où le plafond réel restait bloqué à ~70%, jamais atteignable avec difficulty>0. */
  resolveCheck: function (input) {
    var statValue = Number((input && input.statValue) || 0);
    var difficulty = Number((input && input.difficulty) || 0);
    var randomValue = Number((input && input.randomValue) || 0);

    var baseChance = 35;
    var statBonus = Math.min(55, statValue * 0.5);
    var difficultyPenalty = difficulty * 0.45;
    var successChance = this.clamp(baseChance + statBonus - difficultyPenalty, 15, 90);

    var perfectThreshold = this.clamp((successChance - 55) / 100, 0.05, 0.25);
    var successThreshold = successChance / 100;

    var result;
    if (randomValue < perfectThreshold) {
      result = "perfect";
    } else if (randomValue < successThreshold) {
      result = "success";
    } else {
      result = "setback";
    }

    return {
      estimate: this.estimate(successChance),
      successChance: successChance,
      result: result
    };
  }
};

window.ExplorationCheckSystem = ExplorationCheckSystem;
