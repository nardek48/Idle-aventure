"use strict";
/* systems/scene-check-system.js — module PUR de résolution des jets du scene-engine (moteur
   générique d'expéditions à choix). Aucun accès à game, au DOM, à WarehouseManager ou à
   Math.random (randomValue injecté). Formule reprise à l'identique d'exploration-check-system.js
   (v3.110.0) pour cohérence de calibrage entre les deux moteurs. Détail : DESIGN_Scene_Engine_v1.md */

var SceneCheckSystem = {
  clamp: function (value, min, max) {
    return Math.max(min, Math.min(max, value));
  },

  /* estimate(successChance) -> "low" | "medium" | "high". Convention du jeu (voir
     exploration-check-system.js) : jamais de pourcentage exact affiché au joueur. */
  estimate: function (successChance) {
    if (successChance < 40) return "low";
    if (successChance < 65) return "medium";
    return "high";
  },

  /* successChance({statValue, difficulty}) -> nombre 10-90. v3.121.0 (recalibrage Seb) :
     poids de la stat réduit et pénalité de profondeur fortement augmentée — décision explicite
     "la difficulté doit surtout venir de la profondeur, pas de la stat". Les héros ont des
     stats brutes réelles dans une fourchette ~30-80 (voir data/heroes.js, makeRpgStats), et
     grandissent encore avec l'entraînement (game.trainedStats) : un statBonus plafonné à 55
     comme avant écrasait quasiment toute pénalité de profondeur pour un héros déjà bien monté.
     Nouveau statBonus plafonné à 20 (stat*0.18, donc ~14 pour une stat 80) ; difficultyPenalty
     doublée (×0.9 au lieu de ×0.45) pour que depthDifficulty (voir plus bas, pente ×1.6/palier)
     domine réellement en profondeur, même pour un héros fort. */
  successChance: function (statValue, difficulty) {
    var baseChance = 35;
    var statBonus = Math.min(20, Number(statValue || 0) * 0.18);
    var difficultyPenalty = Number(difficulty || 0) * 0.9;
    return this.clamp(baseChance + statBonus - difficultyPenalty, 10, 90);
  },

  /* resolveCheck({statValue, difficulty, randomValue}) -> { estimate, successChance, result }
     result: "perfect" | "success" | "setback". randomValue doit être fourni par l'appelant (0-1). */
  resolveCheck: function (input) {
    var statValue = Number((input && input.statValue) || 0);
    var difficulty = Number((input && input.difficulty) || 0);
    var randomValue = Number((input && input.randomValue) || 0);

    var chance = this.successChance(statValue, difficulty);
    var perfectThreshold = this.clamp((chance - 55) / 100, 0.05, 0.25);
    var successThreshold = chance / 100;

    var result;
    if (randomValue < perfectThreshold) {
      result = "perfect";
    } else if (randomValue < successThreshold) {
      result = "success";
    } else {
      result = "setback";
    }

    return {
      estimate: this.estimate(chance),
      successChance: chance,
      result: result
    };
  },

  /* depthDifficulty(baseDifficulty, depth) -> difficulté ajustée par la profondeur courante
     (0-indexée). v3.121.0 (recalibrage Seb) : pente ×1.6/palier (au lieu de ×0.7) — avec la
     pénalité successChance ×0.9, ça porte la pénalité totale à environ 1.44 point de % par
     palier de profondeur ET par palier de baseDifficulty du gabarit, largement dominante sur
     le statBonus plafonné à 20. */
  depthDifficulty: function (baseDifficulty, depth) {
    return Number(baseDifficulty || 0) + Number(depth || 0) * 1.6;
  },

  /* depthLootMultiplier(depth) -> multiplicateur de gain (1 + depth*0.3), même règle. */
  depthLootMultiplier: function (depth) {
    return 1 + Number(depth || 0) * 0.3;
  }
};

window.SceneCheckSystem = SceneCheckSystem;
