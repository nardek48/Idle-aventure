"use strict";
/* systems/codex-system.js — suivi déblocage/lecture des entrées Codex (data/codex.js). Même principe que les hauts faits. Détail : COMMENTAIRES_ORIGINAUX.md */

var CodexManager = {
  ensure: function () {
    if (!game.codexRead || typeof game.codexRead !== "object") game.codexRead = {};
    if (!game.worldsEverReached || typeof game.worldsEverReached !== "object") game.worldsEverReached = {};
    if (!game.dungeonTiersEntered || typeof game.dungeonTiersEntered !== "object") game.dungeonTiersEntered = {};
    if (typeof game.codexChaosSeen !== "boolean") game.codexChaosSeen = false;
  },

  getById: function (id) {
    return (CODEX_ENTRIES || []).find(function (e) { return e.id === id; }) || null;
  },

  isUnlocked: function (entry) {
    try {
      return !!entry.isUnlocked();
    } catch (e) {
      return false;
    }
  },

  isRead: function (id) {
    this.ensure();
    return !!game.codexRead[id];
  },

  markRead: function (id) {
    this.ensure();
    if (game.codexRead[id]) return;
    game.codexRead[id] = true;
    saveGame();
  },

  getUnlockedEntries: function () {
    var self = this;
    return (CODEX_ENTRIES || []).filter(function (e) { return self.isUnlocked(e); });
  },

  getUnreadCount: function () {
    var self = this;
    return this.getUnlockedEntries().filter(function (e) { return !self.isRead(e.id); }).length;
  }
};

window.CodexManager = CodexManager;
