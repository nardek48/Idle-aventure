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

  /* successChance({statValue, difficulty}) -> nombre 5-95. v3.195.0 (recalibrage Seb, retour
     "aucune réelle difficulté / les choix n'ont pas d'impact") : le recalibrage v3.121.0 avait
     sur-corrigé — statBonus plafonné à 20 rendait la stat du héros quasi invisible face à la
     profondeur (un héros neuf et un héros très développé avaient une chance de réussite à peu
     près identique, voir simulation Monte-Carlo de session). Les héros ont des stats brutes
     ~30-80 de base (data/heroes.js) ET grandissent jusqu'à +150 par entraînement
     (data/upgrades.js, utrain_power/precision/endurance) — le plafond doit refléter cette vraie
     amplitude de progression, pas l'écraser. Nouveau statBonus plafonné à 55 (stat*0.40, donc
     ~55 dès une stat de 138) ; difficultyPenalty réduite (×0.8 au lieu de ×0.9) ; base relevée
     à 32 (au lieu de 35, compensé par le plafond de stat plus généreux) pour qu'un héros neuf
     reste viable sur le mode d'intensité le plus doux (voir SCENE_INTENSITY,
     data/scene-templates.js) sans dépendre d'un entraînement préalable. */
  successChance: function (statValue, difficulty) {
    var baseChance = 32;
    var statBonus = Math.min(55, Number(statValue || 0) * 0.40);
    var difficultyPenalty = Number(difficulty || 0) * 0.8;
    return this.clamp(baseChance + statBonus - difficultyPenalty, 5, 95);
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
     (0-indexée). v3.195.0 : pente adoucie à ×1.4/palier (au lieu de ×1.6) — le curseur
     d'intensité (SCENE_INTENSITY.diffMult, data/scene-templates.js) porte désormais une partie
     de la variation de dureté que la profondeur seule portait avant ; garder ×1.6 en plus du
     diffMult d'intensité et des diffMod par option (voir scene-nodes.js) aurait cumulé trois
     pénalités et rendu Périple injouable même pour un héros développé. */
  depthDifficulty: function (baseDifficulty, depth) {
    return Number(baseDifficulty || 0) + Number(depth || 0) * 1.4;
  },

  /* depthLootMultiplier(depth) -> multiplicateur de gain (1 + depth*0.3), même règle. */
  depthLootMultiplier: function (depth) {
    return 1 + Number(depth || 0) * 0.3;
  }
};

window.SceneCheckSystem = SceneCheckSystem;
