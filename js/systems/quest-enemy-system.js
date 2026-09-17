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

    /* v3.269.0 (L-3) — GROUPES. quest.group = liste de membres, chacun un id d'ennemi ou
       { boss: true }. Absent : un seul ennemi, comportement d'avant à la ligne près.
       Les PV de chaque membre suivent groupHpMult (mesuré : ×0,50 à deux, ×0,35 à trois),
       son butin groupGoldMult — sans quoi une meute de trois rapporterait trois fois l'or
       pour les points de vie d'un ennemi seul. */
    if (!forceBoss && Array.isArray(quest.group) && quest.group.length > 1) {
      var groupe = this.buildGroup(quest, adventure);
      if (savedPool) adventure.enemyPool = savedPool;
      WorldManager.worldIndex = savedWorldIndex;
      WorldManager.adventureIndex = savedAdventureIndex;
      WorldManager.enemyIndex = savedEnemyIndex;
      return groupe;
    }

    var enemy = WorldManager.generateEnemy();

    /* v3.246.0 (retour Seb 15/09/2026) — enemyHpMult : PV de TOUS les ennemis de la quête
       (normaux et boss). « Prouver sa valeur » est la 4e étape de l'Histoire : elle doit se
       gagner avec l'équipement de départ, sans or à dépenser. Mesuré dans
       sim/lisiere-quest-bench.js, profil sortie de tutoriel : à 1,0 l'échec est de 100 %
       pour les trois classes ; à 0,4 (÷2,5) il tombe à 0 / 7 / 0 %. */
    /* v3.263.0 : bossHpMult (optionnel) règle le boss à part ; absent, le boss suit enemyHpMult. */
    var hpMult = Number(enemy && enemy.isBoss && quest.bossHpMult != null ? quest.bossHpMult : quest.enemyHpMult);
    if (enemy && isFinite(hpMult) && hpMult > 0 && hpMult !== 1) {
      enemy.hp = Math.max(1, Math.floor(enemy.maxHp * hpMult));
      enemy.maxHp = enemy.hp;
    }

    if (savedPool) adventure.enemyPool = savedPool;
    WorldManager.worldIndex = savedWorldIndex;
    WorldManager.adventureIndex = savedAdventureIndex;
    WorldManager.enemyIndex = savedEnemyIndex;

    return enemy;
  }
};

/* v3.246.0 — reprise d'un run après un rechargement de page (bug remonté par Seb : le Roi Slime
   apparaissait à 3/9). save-system.js et boot.js respawnaient la vague du DONJON mais retombaient
   sinon sur CombatEngine.spawnEnemy(), qui ignore adventureQuestRun/huntRun et tire un ennemi de
   FARM selon WorldManager.enemyIndex — donc le boss du monde si l'index y était resté.
   Renvoie true si un ennemi de run a été replacé, false pour laisser l'appelant faire son spawn
   normal. Vit ici plutôt que dans les fichiers protégés : ceux-ci n'appellent qu'une ligne. */
QuestEnemyManager.respawnActiveRunEnemy = function () {
  if (game.adventureQuestRun && game.adventureQuestRun.active && window.AdventureQuestManager) {
    var aq = (window.ADVENTURE_QUESTS || {})[game.adventureQuestRun.questId];
    if (aq) { AdventureQuestManager.spawnRunEnemy(aq); return true; }
  }
  if (game.huntRun && game.huntRun.active && window.HuntQuestManager) {
    var hq = (window.HUNT_QUESTS || {})[game.huntRun.questId];
    if (hq) { HuntQuestManager.spawnRunEnemy(hq); return true; }
  }
  // v3.256.0 (Cartes Vivantes, C-2) : combat d'élite de secteur en cours au rechargement.
  if (game.livingMaps && game.livingMaps.fight && window.LivingMapManager) {
    if (LivingMapManager.respawnFightEnemy()) return true;
  }
  return false;
};

/* Fabrique les membres d'un groupe. Chacun passe par le VRAI generateEnemy() : un membre
   de groupe est un ennemi ordinaire, seulement plus fragile et moins payant. */
QuestEnemyManager.buildGroup = function (quest, adventure) {
  var membres = quest.group.slice(0, (typeof COMBAT_MAX_ENEMIES === "number" ? COMBAT_MAX_ENEMIES : 3));
  var hpMult = Number(quest.groupHpMult);
  if (!isFinite(hpMult) || hpMult <= 0) hpMult = (membres.length >= 3) ? 0.35 : 0.50;
  var goldMult = Number(quest.groupGoldMult);
  if (!isFinite(goldMult) || goldMult <= 0) goldMult = hpMult;

  var enemyCount = (adventure && adventure.enemyCount) || 1;
  var poolAvant = adventure ? adventure.enemyPool : null;
  var out = [];

  for (var i = 0; i < membres.length; i++) {
    var m = membres[i];
    var estBoss = !!(m && m.boss);
    WorldManager.enemyIndex = estBoss ? Math.max(0, enemyCount - 1) : 0;
    if (!estBoss && adventure && typeof m === "string" && (!window.ENEMY_DB || ENEMY_DB[m])) {
      adventure.enemyPool = [m];
    } else if (adventure && poolAvant) {
      adventure.enemyPool = poolAvant;
    }

    var e = WorldManager.generateEnemy();
    if (!e) continue;
    if (!estBoss) {   // un boss garde ses PV et son butin : c'est lui l'enjeu
      e.hp = Math.max(1, Math.floor(e.maxHp * hpMult));
      e.maxHp = e.hp;
      e.goldReward = Math.max(1, Math.floor(Number(e.goldReward || 0) * goldMult));
      e.essenceReward = Number(e.essenceReward || 0) * goldMult;
    }
    out.push(e);
  }
  if (adventure && poolAvant) adventure.enemyPool = poolAvant;
  return out;
};

window.QuestEnemyManager = QuestEnemyManager;
