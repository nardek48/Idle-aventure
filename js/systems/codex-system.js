"use strict";
/* ============================================================
Quest Idle — systems/codex-system.js
Suivi du déblocage et de la lecture des entrées du Codex (voir
data/codex.js pour le contenu). Même principe que les hauts faits :
une entrée "débloquée" quand sa condition est remplie, et un badge
de notification tant qu'elle n'a pas été ouverte au moins une fois.
============================================================ */

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

  /* Marque une entrée comme lue (appelée à l'ouverture de son détail
     dans l'écran Codex). */
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

  /* Nombre d'entrées débloquées mais pas encore lues — sert au badge
     de notification (menu). */
  getUnreadCount: function () {
    var self = this;
    return this.getUnlockedEntries().filter(function (e) { return !self.isRead(e.id); }).length;
  }
};

window.CodexManager = CodexManager;
