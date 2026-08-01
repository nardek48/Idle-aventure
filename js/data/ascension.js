"use strict";
/* ============================================================
QUEST IDLE — data/ascension.js
Configuration d'ascension (le "prestige" du jeu : le joueur réinitialise
sa progression classique contre de l'Aether, une monnaie permanente).
============================================================ */

var ASCENSION_CONFIG = {
  minWorldToAscend: 0,     // désormais sans effet, gardé pour compat (voir minKillsToAscend)
  minKillsToAscend: 50,    // nombre de kills minimum dans la run en cours avant de pouvoir ascensionner

  /* Calcule combien d'Aether l'ascension rapporterait maintenant.
     Formule : 1 Aether tous les 50 kills, + 1 par monde déjà atteint.
     Utilisée à la fois pour l'aperçu (AscensionManager.previewGain)
     et pour le gain réel au moment d'ascensionner. */
  computeGain: function () {
    var kills = Number(game.totalKills || 0);
    var worlds = Number((window.WorldManager && WorldManager.worldIndex) || 0);
    var base = Math.floor(kills / 50) + worlds;
    return Math.max(0, base);
  }
};