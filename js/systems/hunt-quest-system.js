"use strict";
/* systems/hunt-quest-system.js — Chasses (data/hunt-quests.js), run dédié par lots de kills, s'arrête à la fin du lot (popup, relance manuelle).
   Seule la viande est gagnée pendant une chasse (pas d'or/essence/XP/équipement). Détail complet : COMMENTAIRES_ORIGINAUX.md */

var HuntQuestManager = {
  ensureDefaults: function () {
    if (window.WarehouseManager) WarehouseManager.ensure();
    if (!game.huntStats || typeof game.huntStats !== "object") game.huntStats = {};
    Object.keys(HUNT_QUESTS).forEach(function (key) {
      if (typeof game.huntStats[key] !== "number") game.huntStats[key] = 0;
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
    WorldManager.enemyIndex = 0;

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
    if (window.CombatEngine && typeof CombatEngine.prepareEnemy === "function") CombatEngine.prepareEnemy(game.enemy);
    this.applyQuestTheme(quest);
    if (typeof renderEnemy === "function") renderEnemy();
    if (typeof renderHud === "function") renderHud();
  },

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

  onEnemyKilled: function () {
    this.ensureRun();
    var quest = HUNT_QUESTS[game.huntRun.questId];
    if (!quest) {
      this.stop();
      return;
    }

    if (chance(quest.dropChancePct)) {
      WarehouseManager.addResource(quest.resourceKey, 1);
    }

    game.huntRun.killsInLot += 1;

    if (game.huntRun.killsInLot >= quest.lotSize) {
      this.finishLot(quest);
      return;
    }

    this.spawnRunEnemy(quest);
  },

  finishLot: function (quest) {
    game.huntStats[quest.id] = Number(game.huntStats[quest.id] || 0) + 1;
    addLog("🏹 Chasse terminée : " + quest.name + " (" + quest.lotSize + "/" + quest.lotSize + ")", "event");
    game.huntRun = { active: false, questId: null, killsInLot: 0 };

    if (window.CombatEngine && typeof CombatEngine.spawnEnemy === "function") {
      CombatEngine.spawnEnemy();
    }
    if (typeof renderAll === "function") renderAll();
    saveGame();

    if (typeof openHuntLotComplete === "function") openHuntLotComplete(quest);
  },

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

  onDefeat: function () {
    this.ensureRun();
    var quest = HUNT_QUESTS[game.huntRun.questId];
    // v3.102.0 (P2) : même règle de mort qu'ailleurs (PV 0, Sang-froid, retour Campement)
    var keptPct = (game.talents && game.talents.t_essence_bloom) ? game.talents.t_essence_bloom * 0.10 : 0;
    game.heroHp = Math.floor((game.heroMaxHp || 1) * keptPct);
    addLog("💀 Chasse interrompue" + (quest ? " : " + quest.name : "") + " — viande déjà obtenue conservée. Retour au Campement.", "event");
    vibrate([80, 40, 80]);
    this.stop();
    game.justDied = true;
    if (typeof switchTab === "function") switchTab("campement");
  }
};

window.HuntQuestManager = HuntQuestManager;
