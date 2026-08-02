"use strict";
/* ============================================================
Quest Idle — systems/achievement-system.js
Progression, réclamation et bonus cumulés des hauts faits (voir
data/achievements.js pour le catalogue). Les bonus réclamés sont
appliqués dans StatsSystem.recalcStats(), sur le même principe que
le bonus de bestiaire.
============================================================ */

var AchievementManager = {
  ensure: function () {
    if (!game.achievementsClaimed || typeof game.achievementsClaimed !== "object") {
      game.achievementsClaimed = {};
    }
  },

  getById: function (id) {
    return (ACHIEVEMENTS_DB || []).find(function (a) { return a.id === id; }) || null;
  },

  getProgress: function (ach) {
    try {
      return Number(ach.track()) || 0;
    } catch (e) {
      return 0;
    }
  },

  isComplete: function (ach) {
    return this.getProgress(ach) >= ach.target;
  },

  isClaimed: function (id) {
    this.ensure();
    return !!game.achievementsClaimed[id];
  },

  /* Réclame la récompense d'un haut fait terminé (une seule fois). */
  claim: function (id) {
    this.ensure();
    var ach = this.getById(id);
    if (!ach || this.isClaimed(id) || !this.isComplete(ach)) return;

    game.achievementsClaimed[id] = true;

    if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") {
      StatsSystem.recalcStats();
    }

    addLog("🏆 Haut fait débloqué : " + ach.name, "event");
    showToast("🏆 " + ach.name, 1800);
    if (typeof renderAll === "function") renderAll();
    saveGame();
  },

  getClaimedCount: function () {
    this.ensure();
    return Object.keys(game.achievementsClaimed).filter(function (k) { return game.achievementsClaimed[k]; }).length;
  },

  /* Nombre de hauts faits terminés mais pas encore réclamés — sert au
     badge de notification (menu + carte Hauts faits). */
  getAvailableToClaimCount: function () {
    var self = this;
    return (ACHIEVEMENTS_DB || []).filter(function (a) {
      return !self.isClaimed(a.id) && self.isComplete(a);
    }).length;
  },

  /* Agrège les bonus de TOUS les hauts faits réclamés, par clé de
     stat (goldMult/tapMult/essenceGlobalMult). */
  getTotalBonus: function () {
    this.ensure();
    var bonus = {};
    (ACHIEVEMENTS_DB || []).forEach(function (a) {
      if (!game.achievementsClaimed[a.id]) return;
      Object.keys(a.reward || {}).forEach(function (key) {
        bonus[key] = (bonus[key] || 0) + a.reward[key];
      });
    });
    return bonus;
  }
};

window.AchievementManager = AchievementManager;
