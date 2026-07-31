"use strict";
/* ============================================================
QUEST IDLE — data/ascension.js
Configuration d'ascension.
============================================================ */

var ASCENSION_CONFIG = {
  minWorldToAscend: 0,
  minKillsToAscend: 50,

  computeGain: function () {
    var kills = Number(game.totalKills || 0);
    var worlds = Number((window.WorldManager && WorldManager.worldIndex) || 0);
    var base = Math.floor(kills / 50) + worlds;
    return Math.max(0, base);
  }
};