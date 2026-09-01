"use strict";
/* systems/quest-enemy-system.js — génération d'ennemi PARTAGÉE pour les runs de quête à spawn dédié
   (aventure, chasse — pas les world quests, qui comptent sur le farm libre). Remplace le buildQuestEnemy
   dupliqué dans adventure-quest-system.js et hunt-quest-system.js. Point d'entrée unique pour le filtrage
   d'ennemis par quête (enemyFilter, décision Seb) : la donnée de quête pilote, le moteur exécute.

   Usage dans une quête (adventure-quests.js / hunt-quests.js) :
     enemyFilter: ["wolf"]  // seuls les loups sortent du tirage normal (le boss n'est jamais filtré)
   Absent ou vide = comportement inchangé (pool complet de l'aventure). */

var QuestEnemyManager = {
  /* Génère l'ennemi (ou le boss) d'une quête à run dédié, en respectant son enemyFilter éventuel.
     quest : objet de quête (worldId, adventureIndex, enemyFilter optionnel).
     forceBoss : true pour forcer la génération du boss (dernier cran de l'aventure). */
  spawnFor: function (quest, forceBoss) {
    if (!window.WorldManager || !window.WORLDS) return null;
    var worldIdx = WORLDS.findIndex(function (w) { return w.id === quest.worldId; });
    if (worldIdx === -1) return null;

    var savedWorldIndex = WorldManager.worldIndex;
    var savedAdventureIndex = WorldManager.adventureIndex;
    var savedEnemyIndex = WorldManager.enemyIndex;

    WorldManager.worldIndex = worldIdx;
    WorldManager.adventureIndex = quest.adventureIndex;
    var adventure = WorldManager.getAdventure();
    var enemyCount = (adventure && adventure.enemyCount) || 1;
    WorldManager.enemyIndex = forceBoss ? Math.max(0, enemyCount - 1) : 0;

    // Filtre d'ennemis (décision Seb) : échange temporaire du pool de l'aventure, jamais le boss.
    // v3.107.4 : enemyFilter définit DIRECTEMENT le pool cible (vérifié contre ENEMY_DB, pas contre
    // le pool actuel de l'aventure) — un ennemi comme le Loup peut être filtré pour sa quête dédiée
    // même s'il n'est plus dans le pool de base de la Lisière (réduit à slime/goblin/spider).
    var savedPool = null;
    if (!forceBoss && adventure && Array.isArray(quest.enemyFilter) && quest.enemyFilter.length) {
      var valid = quest.enemyFilter.filter(function (id) { return !window.ENEMY_DB || !!ENEMY_DB[id]; });
      if (valid.length) {
        savedPool = adventure.enemyPool;
        adventure.enemyPool = valid;
      }
      // valid vide (config incohérente, ex. faute de frappe/id inexistant) : on garde le pool complet plutôt que de planter.
    }

    var enemy = WorldManager.generateEnemy();

    if (savedPool) adventure.enemyPool = savedPool;
    WorldManager.worldIndex = savedWorldIndex;
    WorldManager.adventureIndex = savedAdventureIndex;
    WorldManager.enemyIndex = savedEnemyIndex;

    return enemy;
  }
};

window.QuestEnemyManager = QuestEnemyManager;
