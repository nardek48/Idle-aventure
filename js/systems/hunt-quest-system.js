"use strict";
/* ============================================================
Aethervale — systems/hunt-quest-system.js
v3.30 : gestion des Chasses (data/hunt-quests.js) — même squelette de
run dédié qu'AdventureQuestManager (bascule sur Combat, un ennemi
généré à la fois via WorldManager.generateEnemy() sur un contexte
temporaire), mais SANS notion de complétion finale : au bout d'un lot
de `lotSize` kills, le lot suivant démarre automatiquement (voir
onEnemyKilled ci-dessous) tant que le joueur n'a pas appuyé sur
"Arrêter la chasse" (stop()) ou n'a pas été vaincu (onDefeat()).

game.huntRun = { active, questId, killsInLot } — killsInLot repart à 0
à chaque nouveau lot, NE survit PAS à l'ascension ni au reset complet
(même traitement que dungeonRun/adventureQuestRun). La viande
accumulée (game.resources.viande), elle, persiste comme mineraiRare.
============================================================ */

var HuntQuestManager = {
  ensureDefaults: function () {
    // v3.31 : l'initialisation de game.resources est désormais
    // centralisée dans WarehouseManager.ensure() (voir
    // systems/warehouse-system.js) — plus de duplication ici.
    if (window.WarehouseManager) WarehouseManager.ensure();
    if (!game.huntStats || typeof game.huntStats !== "object") game.huntStats = {};
    Object.keys(HUNT_QUESTS).forEach(function (key) {
      if (typeof game.huntStats[key] !== "number") game.huntStats[key] = 0; // total de lots complétés, purement informatif
    });
    this.ensureRun();
  },

  ensureRun: function () {
    if (!game.huntRun || typeof game.huntRun !== "object") {
      game.huntRun = { active: false, questId: null, killsInLot: 0 };
    }
  },

  getAllQuests: function () {
    return Object.keys(HUNT_QUESTS).map(function (k) { return HUNT_QUESTS[k]; });
  },

  getRunningQuest: function () {
    this.ensureRun();
    if (!game.huntRun.active) return null;
    return HUNT_QUESTS[game.huntRun.questId] || null;
  },

  /* Réutilise TEL QUEL le même mécanisme d'échange de contexte
     temporaire qu'AdventureQuestManager.buildQuestEnemy() — voir ce
     fichier pour le détail du principe (synchrone, sans risque). */
  buildQuestEnemy: function (quest) {
    if (!window.WorldManager) return null;
    var worldIdx = (WORLDS || []).findIndex(function (w) { return w.id === quest.worldId; });
    if (worldIdx === -1) return null;

    var savedWorldIndex = WorldManager.worldIndex;
    var savedAdventureIndex = WorldManager.adventureIndex;
    var savedEnemyIndex = WorldManager.enemyIndex;

    WorldManager.worldIndex = worldIdx;
    WorldManager.adventureIndex = quest.adventureIndex;
    var adventure = WorldManager.getAdventure();
    var enemyCount = (adventure && adventure.enemyCount) || 1;
    WorldManager.enemyIndex = 0; // jamais de boss forcé en Chasse, uniquement du gibier normal

    var enemy = WorldManager.generateEnemy();

    WorldManager.worldIndex = savedWorldIndex;
    WorldManager.adventureIndex = savedAdventureIndex;
    WorldManager.enemyIndex = savedEnemyIndex;

    return enemy;
  },

  applyQuestTheme: function (quest) {
    var root = document.documentElement;
    if (!root) return;
    var world = (WORLDS || []).find(function (w) { return w.id === quest.worldId; });
    if (world && world.combatMap) {
      root.style.setProperty("--world-combat-map", 'url("' + world.combatMap + '")');
    }
  },

  spawnRunEnemy: function (quest) {
    var enemy = this.buildQuestEnemy(quest);
    if (!enemy) {
      this.stop();
      return;
    }
    game.enemy = enemy;
    game._enemyAttackTimer = 0;
    this.applyQuestTheme(quest);
    if (typeof renderEnemy === "function") renderEnemy();
    if (typeof renderHud === "function") renderHud();
  },

  /* Lance (ou relance un lot de) la chasse — bouton "Chasser" de
     l'onglet Quêtes. Mêmes garde-fous que les autres runs dédiés
     (donjon/quête d'aventure) : un seul run actif à la fois. */
  start: function (questId) {
    this.ensureDefaults();

    var quest = HUNT_QUESTS[questId];
    if (!quest) return showToast("Chasse introuvable", 1200);
    if (game.huntRun.active) return showToast("Une chasse est déjà en cours", 1200);
    if (window.DungeonManager && game.dungeonRun && game.dungeonRun.active) {
      return showToast("Termine ou abandonne ton donjon avant de chasser", 1600);
    }
    if (window.AdventureQuestManager && game.adventureQuestRun && game.adventureQuestRun.active) {
      return showToast("Termine ou abandonne ta quête avant de chasser", 1600);
    }

    game.huntRun = { active: true, questId: questId, killsInLot: 0 };
    addLog("🏹 Départ en chasse : " + quest.name, "event");
    this.spawnRunEnemy(quest);
    if (typeof switchTab === "function") switchTab("combat");
    saveGame();
  },

  /* Appelée par CombatEngine.killEnemy() pendant un run de chasse
     actif. Chance de drop de viande à CHAQUE kill (jamais de boss en
     Chasse) ; au lotSize-ième kill du lot, celui-ci se conclut et un
     nouveau démarre immédiatement (pas d'écran intermédiaire — voir
     finishLot ci-dessous). */
  onEnemyKilled: function () {
    this.ensureRun();
    var quest = HUNT_QUESTS[game.huntRun.questId];
    if (!quest) {
      this.stop();
      return;
    }

    if (chance(quest.dropChancePct)) {
      // v3.31 : passe désormais par WarehouseManager.addResource() —
      // source de vérité unique pour créditer l'Entrepôt (voir
      // systems/warehouse-system.js), plus d'accès direct à
      // game.resources[key] ici.
      WarehouseManager.addResource(quest.resourceKey, 1);
    }

    game.huntRun.killsInLot += 1;

    if (game.huntRun.killsInLot >= quest.lotSize) {
      this.finishLot(quest);
      return;
    }

    this.spawnRunEnemy(quest);
  },

  /* Fin d'un lot RÉUSSI (lotSize kills atteints) : petit log/toast
     informatif, incrémente le compteur de lots (purement cosmétique,
     voir game.huntStats) puis relance IMMÉDIATEMENT un nouveau lot —
     c'est ça, la "boucle". Le joueur doit appeler stop() pour sortir. */
  finishLot: function (quest) {
    game.huntStats[quest.id] = Number(game.huntStats[quest.id] || 0) + 1;
    showToast("🏹 Lot de chasse terminé (" + quest.lotSize + "/" + quest.lotSize + ")", 1500);
    game.huntRun.killsInLot = 0;
    this.spawnRunEnemy(quest);
    saveGame();
  },

  /* Arrêt volontaire (bouton "Arrêter la chasse"). La viande déjà
     obtenue reste acquise (elle est ajoutée à game.resources kill par
     kill, jamais reprise à l'arrêt), seule la progression du lot EN
     COURS (killsInLot) est perdue — cohérent avec le fait qu'un lot
     inachevé n'a rien à "réclamer". */
  stop: function () {
    this.ensureRun();
    if (!game.huntRun.active) return;
    var quest = HUNT_QUESTS[game.huntRun.questId];
    addLog("🏹 Chasse arrêtée" + (quest ? " : " + quest.name : ""), "event");
    game.huntRun = { active: false, questId: null, killsInLot: 0 };

    if (window.CombatEngine && typeof CombatEngine.spawnEnemy === "function") {
      CombatEngine.spawnEnemy();
    }
    if (typeof renderAll === "function") renderAll();
    saveGame();
  },

  /* Défaite pendant une chasse : arrête le run (progression du lot en
     cours perdue, viande déjà stockée conservée), PV restaurés — même
     traitement que DungeonManager.onDefeat()/AdventureQuestManager.onDefeat(). */
  onDefeat: function () {
    this.ensureRun();
    var quest = HUNT_QUESTS[game.huntRun.questId];
    game.heroHp = game.heroMaxHp || 1;
    addLog("💀 Chasse interrompue" + (quest ? " : " + quest.name : "") + " — viande déjà obtenue conservée.", "event");
    vibrate([80, 40, 80]);
    this.stop();
  }
};

window.HuntQuestManager = HuntQuestManager;
