"use strict";
/* core/constants.js — constantes globales, chargé en premier.
   ATTENTION : DEFAULT_QUEST_PROGRESS est redéclaré (et écrasé) par data/quests.js qui charge après — c'est CETTE version-ci (quests.js) qui fait foi. Garder les deux synchronisés à la main. Détail : COMMENTAIRES_ORIGINAUX.md */

var DEFAULT_QUEST_PROGRESS = {
  kills: 0,
  treasures: 0,
  bossKills: 0,
  goldEarned: 0,
  goldSpent: 0,
  crits: 0,
  swordKills: 0,
  bowKills: 0,
  magicKills: 0,
  combatTime: 0,
  forestChaptersDone: 0,
  ruinsChaptersDone: 0
};

window.DEFAULT_QUEST_PROGRESS = DEFAULT_QUEST_PROGRESS;
