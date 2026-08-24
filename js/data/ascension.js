"use strict";
/* data/ascension.js — configuration du prestige (réinitialisation contre Aether). Détail : COMMENTAIRES_ORIGINAUX.md */

var ASCENSION_CONFIG = {
  minWorldToAscend: 0,
  minKillsToAscend: 200,

  computeGain: function () {
    var kills = Number(game.totalKills || 0);
    var worlds = Number((window.WorldManager && WorldManager.worldIndex) || 0);
    var base = Math.floor(kills / 50) + worlds;
    return Math.max(0, base);
  }
};
