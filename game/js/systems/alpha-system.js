"use strict";
/* systems/alpha-system.js — v3.752.0 : règles de l'édition Alpha (lien /alpha/). En édition « jeu », rien n'est touché.
   Enveloppes posées au chargement, comme le journal de test : aucun fichier protégé modifié. */

var AlphaEdition = {
  /* Chapitre fermé par l'Alpha : tout chapitre qui suit le dernier chapitre ouvert (ALPHA_LAST_CHAPTER). */
  isChapterBlocked: function (chapterId) {
    if (!isAlphaEdition()) return false;
    var ch = window.STORY_QUESTS && STORY_QUESTS[chapterId];
    return !!(ch && ch.requiresChapter && ch.requiresChapter === ALPHA_LAST_CHAPTER);
  },

  /* Plus haut monde de l'Alpha : celui du dernier chapitre ouvert (Désert = 1). */
  lastWorldIndex: function () {
    var ch = window.STORY_QUESTS && STORY_QUESTS[ALPHA_LAST_CHAPTER];
    var id = ch && ch.worldId ? ch.worldId : ALPHA_LAST_CHAPTER;
    return (window.WORLDS || []).findIndex(function (w) { return w.id === id; });
  },

  /* L'Alpha est finie : le dernier chapitre ouvert est terminé (desert_18). */
  isFinished: function () {
    return isAlphaEdition() && !!(window.StoryQuestManager && StoryQuestManager.isChapterCompleted(ALPHA_LAST_CHAPTER));
  },

  install: function () {
    if (!isAlphaEdition()) return;
    var self = this;
    // Les Ruines (requiresChapter « desert ») restent fermées : ni ruines_01, ni sa traversée
    if (window.StoryQuestManager && typeof StoryQuestManager.isChapterOpen === "function") {
      var isOpen = StoryQuestManager.isChapterOpen;
      StoryQuestManager.isChapterOpen = function (chapterId) {
        if (self.isChapterBlocked(chapterId)) return false;
        return isOpen.apply(this, arguments);
      };
    }
    // Filet : aucun voyage au-delà du dernier monde de l'Alpha, même par un chemin oublié
    if (window.WorldTravel && typeof WorldTravel.arrive === "function") {
      var arrive = WorldTravel.arrive;
      WorldTravel.arrive = function (worldId) {
        var last = self.lastWorldIndex();
        if (last >= 0 && this.indexOf(worldId) > last) return false;
        return arrive.apply(this, arguments);
      };
    }
  }
};

AlphaEdition.install();
window.AlphaEdition = AlphaEdition;
