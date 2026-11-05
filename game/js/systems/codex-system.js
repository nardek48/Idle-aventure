"use strict";
/* systems/codex-system.js — suivi déblocage/lecture des entrées Codex (data/codex.js). Même principe que les hauts faits. */

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
      // v3.621.0 (choix de Seb) : une fiche déjà lue reste lisible, même si sa condition se resserre
      if (entry && game.codexRead && game.codexRead[entry.id]) return true;
      return !!entry.isUnlocked();
    } catch (e) {
      noteErreur("codex-system.isUnlocked", e); // audit 04/11 (ARCH-14)
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

};

window.CodexManager = CodexManager;
