"use strict";
/* core/constants.js — constantes globales, chargé en premier.
   ATTENTION : DEFAULT_QUEST_PROGRESS est redéclaré (et écrasé) par data/quests.js qui charge après — c'est CETTE version-ci (quests.js) qui fait foi. Garder les deux synchronisés à la main. Détail : COMMENTAIRES_ORIGINAUX.md */

/* v3.233.0 : numéro de version affiché par l'écran titre. Il était codé en
   dur dans title-screen-view.js et figé à v3.151.0 depuis 81 livraisons.
   DOIT rester égal au CACHE_VERSION de sw.js — le harnais le vérifie et
   échoue si les deux divergent. */
var GAME_VERSION = "3.278.0";
window.GAME_VERSION = GAME_VERSION;

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
