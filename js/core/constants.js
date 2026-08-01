"use strict";
/* ============================================================
Quest Idle — core/constants.js
Petites constantes globales chargées tout au début du jeu,
avant tous les autres fichiers data/systems/ui.
============================================================ */

/* Valeurs de progression de quête par défaut (utilisées pour
   initialiser game.questProgress). 
   ATTENTION : js/data/quests.js déclare aussi une variable
   DEFAULT_QUEST_PROGRESS qui se charge après celle-ci et qui
   l'écrase (comportement normal de `var` en JS). C'est donc la
   version de quests.js qui fait foi en pratique. Les deux sont
   maintenues synchronisées à la main, donc si tu ajoutes un champ
   de progression de quête ici, ajoute-le aussi dans quests.js. */
var DEFAULT_QUEST_PROGRESS = {
  kills: 0,
  treasures: 0,
  bossKills: 0,
  goldEarned: 0,
  goldSpent: 0,
  crits: 0,
  swordKills: 0,   // kills réalisés avec une épée/hache (maîtrise d'arme)
  bowKills: 0,     // kills réalisés à l'arc
  magicKills: 0,   // kills réalisés au bâton
  combatTime: 0,
  forestChaptersDone: 0,
  ruinsChaptersDone: 0
};

window.DEFAULT_QUEST_PROGRESS = DEFAULT_QUEST_PROGRESS;