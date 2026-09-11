"use strict";
/* systems/tutorial-catalog-system.js — v3.208.0 : catalogue consultable de TOUS les popups
   pédagogiques du jeu (demande Seb : « un onglet comme pour le codex pour tout le tutorial »).
   Aucune donnée nouvelle — agrège les trois sources existantes et n'expose que de la lecture.
   Le déclenchement des popups reste entièrement dans ui/tutorial-view.js, inchangé. */

/* Les trois sources, dans l'ordre d'apparition à l'écran. La clé `source` sert d'identifiant
   de catégorie ET de discriminant pour lire l'état « déjà vu » (chacune le stocke ailleurs). */
var TUTORIAL_CATALOG_SECTIONS = [
  { id: "story", label: "Le fil de l'histoire" },
  { id: "generic", label: "Les bases" },
  { id: "village", label: "Le village" }
];

var TutorialCatalogManager = {
  /* Entrées du chapitre Histoire : une par étape portant un `tutorial`. L'id d'entrée est
     l'id d'étape, qui est aussi la clé de st.tutorialsSeen (voir ui/tutorial-view.js). */
  _collectStory: function () {
    var entries = [];
    if (!window.STORY_QUESTS) return entries;

    Object.keys(STORY_QUESTS).forEach(function (chapterId) {
      var chapter = STORY_QUESTS[chapterId];
      if (!chapter || !Array.isArray(chapter.steps)) return;
      chapter.steps.forEach(function (step) {
        if (!step || !step.tutorial) return;
        entries.push({
          id: "story:" + chapterId + ":" + step.id,
          source: "story",
          chapterId: chapterId,
          stepId: step.id,
          tutorial: step.tutorial
        });
      });
    });
    return entries;
  },

  _collectGeneric: function () {
    var entries = [];
    if (!window.GENERIC_TUTORIALS) return entries;

    Object.keys(GENERIC_TUTORIALS).forEach(function (key) {
      entries.push({
        id: "generic:" + key,
        source: "generic",
        genericId: key,
        tutorial: GENERIC_TUTORIALS[key]
      });
    });
    return entries;
  },

  _collectVillage: function () {
    var entries = [];
    if (!window.VILLAGE_QUESTS) return entries;

    VILLAGE_QUESTS.forEach(function (quest) {
      if (!quest || !quest.tutorial) return;
      entries.push({
        id: "village:" + quest.id,
        source: "village",
        questId: quest.id,
        tutorial: quest.tutorial
      });
    });
    return entries;
  },

  /* Catalogue complet, recalculé à chaque appel — la liste est courte (une vingtaine
     d'entrées) et les sources sont des constantes : pas de cache à invalider. */
  getAll: function () {
    return this._collectStory().concat(this._collectGeneric(), this._collectVillage());
  },

  getBySection: function (sectionId) {
    return this.getAll().filter(function (entry) { return entry.source === sectionId; });
  },

  getById: function (id) {
    return this.getAll().find(function (entry) { return entry.id === id; }) || null;
  },

  /* Déverrouillé = le popup a déjà été affiché au joueur. Même règle que le Codex :
     on ne révèle jamais un contenu que la partie n'a pas encore atteint. L'état vit dans
     trois endroits distincts, on se contente de le lire. */
  isUnlocked: function (entry) {
    if (!entry) return false;

    if (entry.source === "story") {
      if (!window.StoryQuestManager) return false;
      var st = StoryQuestManager.getState(entry.chapterId);
      return !!(st && st.tutorialsSeen && st.tutorialsSeen[entry.stepId]);
    }

    if (entry.source === "generic") {
      return !!(game.genericTutorialsSeen && game.genericTutorialsSeen[entry.genericId]);
    }

    if (entry.source === "village") {
      return !!(window.VillageQuestManager && VillageQuestManager.isTutorialSeen(entry.questId));
    }

    return false;
  },

  getUnlockedCount: function (sectionId) {
    var self = this;
    var list = sectionId ? this.getBySection(sectionId) : this.getAll();
    return list.filter(function (entry) { return self.isUnlocked(entry); }).length;
  }
};

window.TUTORIAL_CATALOG_SECTIONS = TUTORIAL_CATALOG_SECTIONS;
window.TutorialCatalogManager = TutorialCatalogManager;
