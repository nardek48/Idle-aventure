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

  // v3.599.0 : étape de l'Histoire réclamée (ou chapitre fini, ou passé) : la conversation vient après elle
  stepDone: function (stepId) {
    if (!window.StoryQuestManager || typeof STORY_QUESTS === "undefined") return false;
    var ids = Object.keys(STORY_QUESTS);
    for (var i = 0; i < ids.length; i++) {
      if (!STORY_QUESTS[ids[i]].steps.some(function (s) { return s.id === stepId; })) continue;
      var st = StoryQuestManager.getState(ids[i]);
      return !!(st.skipped || StoryQuestManager.isChapterCompleted(ids[i]) || (st.claimedSteps && st.claimedSteps[stepId]));
    }
    return false;
  },

  isAvailable: function (t) {
    if (!t || !window.CompanionManager) return false;
    var st = CompanionManager.state(t.companion);
    if (!st || !st.unlocked || this.isDone(t.id)) return false;
    if (CompanionManager.hasDeparted && CompanionManager.hasDeparted(t.companion)) return false; // v3.598.1 : Ysolt recouchée
    if (t.step && !this.stepDone(t.step)) return false;
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

  /* ---------- v3.601.0 : les sujets libres (data/companion-topics.js), menu M1 ----------
     Écoutés : gardés dans talks sous « s_toi_forest », « s_monde_ruins » (pas de nouvel état à sauvegarder). */
  _worldIdx: function (worldId) { return window.WORLDS ? WORLDS.findIndex(function (w) { return w.id === worldId; }) : -1; },
  heard: function (companionId, key) { var s = this.talksOf(companionId); return !!(s && typeof s[key] === "string"); },
  markHeard: function (companionId, key) {
    var s = this.talksOf(companionId);
    if (!s || typeof s[key] === "string") return;
    s[key] = "-";
    if (typeof saveGame === "function") saveGame();
  },
  // « Parle-moi de toi » : le plus ancien souvenir pas encore écouté parmi les mondes atteints, sinon le dernier.
  topicToi: function (companionId) {
    var D = (typeof companionTopicsData === "function" ? companionTopicsData() : {})[companionId], self = this;
    if (!D || !D.toi) return null;
    var best = window.DungeonManager ? DungeonManager.getHighestWorldReached() : Number((window.WorldManager && WorldManager.worldIndex) || 0);
    var ws = Object.keys(D.toi).filter(function (w) { var i = self._worldIdx(w); return i >= 0 && i <= best; })
      .sort(function (a, b) { return self._worldIdx(a) - self._worldIdx(b); });
    if (!ws.length) return null;
    var w = ws.filter(function (x) { return !self.heard(companionId, "s_toi_" + x); })[0] || ws[ws.length - 1];
    return { key: "s_toi_" + w, world: w, lines: D.toi[w] };
  },
  // « Et ce monde-ci ? » : le monde où vit le héros, si le compagnon en a quelque chose à dire.
  topicMonde: function (companionId) {
    var D = (typeof companionTopicsData === "function" ? companionTopicsData() : {})[companionId];
    var w = window.WORLDS && window.WorldManager ? (WORLDS[Number(WorldManager.worldIndex || 0)] || {}).id : null;
    if (!D || !D.monde || !w || !D.monde[w]) return null;
    return { key: "s_monde_" + w, world: w, lines: D.monde[w] };
  },
  // Un sujet nouveau (pastille) : conversation de l'histoire, ou souvenir / monde pas encore écouté.
  hasNewTopic: function (companionId) {
    var t = this.topicToi(companionId), m = this.topicMonde(companionId);
    return !!(this.availableFor(companionId) || (t && !this.heard(companionId, t.key)) || (m && !this.heard(companionId, m.key)));
  },

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
