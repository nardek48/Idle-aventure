"use strict";
/* systems/companion-talk-system.js — v3.597.0 : les conversations au feu (data/companion-talks.js).
   Une conversation s'ouvre quand son étape de l'Histoire est atteinte et la précédente faite ;
   la réponse choisie est gardée dans game.companions[id].talks (companion-system.js la sauvegarde). */

var CompanionTalkManager = {
  all: function () { return typeof companionTalksData === "function" ? companionTalksData() : []; },
  get: function (id) { return this.all().filter(function (t) { return t.id === id; })[0] || null; },

  talksOf: function (companionId) {
    var st = window.CompanionManager ? CompanionManager.state(companionId) : null;
    if (!st) return null;
    if (!st.talks || typeof st.talks !== "object") st.talks = {};
    return st.talks;
  },
  isDone: function (id) {
    var t = this.get(id), s = t ? this.talksOf(t.companion) : null;
    return !!(s && typeof s[id] === "string");
  },
  choiceOf: function (id) {
    var t = this.get(id), s = t ? this.talksOf(t.companion) : null;
    return s && typeof s[id] === "string" ? s[id] : null;
  },

  isAvailable: function (t) {
    if (!t || !window.CompanionManager) return false;
    var st = CompanionManager.state(t.companion);
    if (!st || !st.unlocked || this.isDone(t.id)) return false;
    if (CompanionManager.hasDeparted && CompanionManager.hasDeparted(t.companion)) return false; // v3.598.1 : Ysolt recouchée
    if (t.step && !(window.StoryQuestManager && StoryQuestManager.isStepReached(t.step))) return false;
    if (t.afterQuest && !(window.CompanionQuestManager && CompanionQuestManager.isDone(t.afterQuest))) return false; // v3.598.1 : quête du compagnon finie avant
    return !t.after || this.isDone(t.after);
  },
  // Une seule conversation proposée par compagnon : la première de sa liste qui est prête.
  available: function () {
    var seen = {}, self = this;
    return this.all().filter(function (t) {
      if (seen[t.companion] || !self.isAvailable(t)) return false;
      seen[t.companion] = true;
      return true;
    });
  },
  availableFor: function (companionId) { return this.available().filter(function (t) { return t.companion === companionId; })[0] || null; },

  // Fin de conversation : la réponse choisie (« a », « b », plusieurs lettres, ou « - » sans choix).
  finish: function (id, choices) {
    var t = this.get(id);
    if (!t || !this.isAvailable(t)) return false;
    this.talksOf(t.companion)[id] = String(choices || "-").slice(0, 16) || "-";
    if (t.unlocks && t.unlocks.quest && window.CompanionQuestManager) CompanionQuestManager.unlock(t.unlocks.quest); // v3.598.0
    if (typeof saveGame === "function") saveGame();
    return true;
  }
};

window.CompanionTalkManager = CompanionTalkManager;
