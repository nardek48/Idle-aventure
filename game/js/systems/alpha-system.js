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

  /* v3.815.0 : monde fermé par l'Alpha (après le Désert) — carte, donjons, renvois « s'ouvre aux… » */
  isWorldBeyond: function (index) {
    if (!isAlphaEdition()) return false;
    var last = this.lastWorldIndex();
    return last >= 0 && Number(index) > last;
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
    // v3.815.0 (audit Alpha, FONC-4 et CONT-2) : « s'ouvre aux Ruines anciennes » devient « s'ouvre au-delà de cette Alpha »
    if (window.WorldCaps && typeof WorldCaps.withPrep === "function") {
      var withPrep = WorldCaps.withPrep, atAct = WorldCaps.atAct;
      WorldCaps.withPrep = function (index) { return self.isWorldBeyond(index) ? _t("au-delà de cette Alpha") : withPrep.apply(this, arguments); };
      if (typeof atAct === "function") WorldCaps.atAct = function (act, index) { return self.isWorldBeyond(index) ? _t("au-delà de cette Alpha") : atAct.apply(this, arguments); };
    }
    // Boutique d'Éclats : le palier tient à l'Ossuaire (Crypte), fermé en Alpha
    if (window.DungeonManager && typeof DungeonManager.getShardShopLockText === "function") {
      var lockText = DungeonManager.getShardShopLockText;
      DungeonManager.getShardShopLockText = function (need) {
        var d = this.getById(DUNGEON_CONFIG.shopPalierDungeonId || 4);
        return d && self.isWorldBeyond(d.worldRequired) ? _t("Au-delà de cette Alpha") : lockText.apply(this, arguments);
      };
    }
  }
};

AlphaEdition.install();
window.AlphaEdition = AlphaEdition;
