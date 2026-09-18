"use strict";
/* systems/achievement-system.js — progression/réclamation/bonus des hauts faits (data/achievements.js). Bonus appliqués dans StatsSystem.recalcStats(). Détail : COMMENTAIRES_ORIGINAUX.md */

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

  getAvailableToClaimCount: function () {
    var self = this;
    return (ACHIEVEMENTS_DB || []).filter(function (a) {
      return !self.isClaimed(a.id) && self.isComplete(a);
    }).length;
  },

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
