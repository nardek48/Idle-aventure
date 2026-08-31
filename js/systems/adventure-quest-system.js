"use strict";
/* systems/adventure-quest-system.js — quêtes scopées {worldId, adventureIndex} (data/adventure-quests.js), run dédié type Donjon.
   Indépendant de world-quest-system.js. Progression PERMANENTE, run éphémère (ne survit pas à l'ascension). Détail : COMMENTAIRES_ORIGINAUX.md */

var AdventureQuestManager = {
  ensureDefaults: function () {
    if (!game.adventureQuestProgress || typeof game.adventureQuestProgress !== "object") {
      game.adventureQuestProgress = {};
    }
    if (!game.adventureQuestsCompleted || typeof game.adventureQuestsCompleted !== "object") {
      game.adventureQuestsCompleted = {};
    }

    Object.keys(ADVENTURE_QUESTS).forEach(function (key) {
      var quest = ADVENTURE_QUESTS[key];
      if (!game.adventureQuestProgress[quest.id]) game.adventureQuestProgress[quest.id] = {};
      quest.steps.forEach(function (step) {
        if (typeof game.adventureQuestProgress[quest.id][step.id] !== "number") {
          game.adventureQuestProgress[quest.id][step.id] = 0;
        }
      });
      if (typeof game.adventureQuestsCompleted[quest.id] !== "boolean") {
        game.adventureQuestsCompleted[quest.id] = false;
      }
    });

    this.ensureRun();
  },

  ensureRun: function () {
    if (!game.adventureQuestRun || typeof game.adventureQuestRun !== "object") {
      game.adventureQuestRun = { active: false, questId: null };
    }
  },

  getAllQuests: function () {
    return Object.keys(ADVENTURE_QUESTS).map(function (k) { return ADVENTURE_QUESTS[k]; });
  },

  getRunningQuest: function () {
    this.ensureRun();
    if (!game.adventureQuestRun.active) return null;
    return ADVENTURE_QUESTS[game.adventureQuestRun.questId] || null;
  },

  getStepProgress: function (quest, step) {
    this.ensureDefaults();
    return Math.min(step.target, Number((game.adventureQuestProgress[quest.id] || {})[step.id] || 0));
  },

  isStepComplete: function (quest, step) {
    return this.getStepProgress(quest, step) >= step.target;
  },

  isReadyToClaim: function (quest) {
    if (!quest) return false;
    if (game.adventureQuestsCompleted[quest.id]) return false;
    var self = this;
    return quest.steps.every(function (step) { return self.isStepComplete(quest, step); });
  },

  isTransitionUnlocked: function (worldId, fromAdventureIndex) {
    this.ensureDefaults();
    var targetIndex = fromAdventureIndex + 1;
    var gateQuest = null;
    Object.keys(ADVENTURE_QUESTS).some(function (key) {
      var quest = ADVENTURE_QUESTS[key];
      if (quest.type === "transition" && quest.worldId === worldId && quest.gatesTransitionTo === targetIndex) {
        gateQuest = quest;
        return true;
      }
      return false;
    });
    if (!gateQuest) return true;
    return !!game.adventureQuestsCompleted[gateQuest.id];
  },

  isWorldTransitionUnlocked: function (worldId) {
    this.ensureDefaults();
    var gateQuest = null;
    Object.keys(ADVENTURE_QUESTS).some(function (key) {
      var quest = ADVENTURE_QUESTS[key];
      if (quest.worldId === worldId && quest.gatesNextWorld === true) {
        gateQuest = quest;
        return true;
      }
      return false;
    });
    if (!gateQuest) return true;
    return !!game.adventureQuestsCompleted[gateQuest.id];
  },

  applyQuestTheme: function (quest) {
    var root = document.documentElement;
    if (!root) return;
    var world = (WORLDS || []).find(function (w) { return w.id === quest.worldId; });
    if (world && world.combatMap) {
      root.style.setProperty("--world-combat-map", 'url("' + world.combatMap + '")');
    }
  },

  buildQuestEnemy: function (quest, forceBoss) {
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
    WorldManager.enemyIndex = forceBoss ? Math.max(0, enemyCount - 1) : 0;

    var enemy = WorldManager.generateEnemy();

    WorldManager.worldIndex = savedWorldIndex;
    WorldManager.adventureIndex = savedAdventureIndex;
    WorldManager.enemyIndex = savedEnemyIndex;

    return enemy;
  },

  nextSpawnIsBoss: function (quest) {
    var self = this;
    var pendingBossStep = quest.steps.find(function (s) { return s.type === "bossKill" && !self.isStepComplete(quest, s); });
    if (!pendingBossStep) return false;
    return quest.steps.every(function (s) {
      return s.type === "bossKill" || self.isStepComplete(quest, s);
    });
  },

  spawnRunEnemy: function (quest) {
    var forceBoss = this.nextSpawnIsBoss(quest);
    var enemy = this.buildQuestEnemy(quest, forceBoss);
    if (!enemy) {
      this.forfeit();
      return;
    }

    game.enemy = enemy;
    if (window.CombatEngine && typeof CombatEngine.prepareEnemy === "function") CombatEngine.prepareEnemy(enemy);
    this.applyQuestTheme(quest);
    if (typeof renderEnemy === "function") renderEnemy();
    if (typeof renderHud === "function") renderHud();
  },

  start: function (questId) {
    this.ensureDefaults();

    var quest = ADVENTURE_QUESTS[questId];
    if (!quest) return showToast("Quête introuvable", 1200);
    if (game.adventureQuestsCompleted[questId]) return showToast("Quête déjà terminée", 1200);
    if (game.adventureQuestRun.active) return showToast("Une quête est déjà en cours", 1200);
    if (window.DungeonManager && game.dungeonRun && game.dungeonRun.active) {
      return showToast("Termine ou abandonne ton donjon avant de lancer une quête", 1600);
    }
    if (window.HuntQuestManager && game.huntRun && game.huntRun.active) {
      return showToast("Termine ou arrête ta chasse en cours avant de lancer une quête", 1600);
    }

    game.adventureQuestRun = { active: true, questId: questId };
    if (window.SortieManager) { SortieManager.end("return"); SortieManager.start("adventure"); } // v3.102.1 : la quête est une sortie
    addLog("📜 Départ en quête : " + quest.name, "event");
    this.spawnRunEnemy(quest);
    if (typeof switchTab === "function") switchTab("combat");
    saveGame();
  },

  onEnemyKilled: function (enemy) {
    this.ensureRun();
    var quest = ADVENTURE_QUESTS[game.adventureQuestRun.questId];
    if (!quest) {
      this.forfeit();
      return;
    }

    var progress = game.adventureQuestProgress[quest.id];

    quest.steps.forEach(function (step) {
      if (step.type === "kill" && !enemy.isBoss) {
        if (progress[step.id] < step.target) progress[step.id] += 1;
      } else if (step.type === "bossKill" && enemy.isBoss && step.bossId === enemy.id) {
        if (progress[step.id] < step.target) progress[step.id] += 1;
      }
    });

    if (this.isReadyToClaim(quest)) {
      this.finish(quest, true);
      return;
    }

    this.spawnRunEnemy(quest);
  },

  finish: function (quest, success) {
    this.ensureRun();
    game.adventureQuestRun = { active: false, questId: null };
    if (success && window.SortieManager) SortieManager.end("success"); // v3.102.1 : mission réussie = butin banqué

    if (success && quest) {
      game.adventureQuestsCompleted[quest.id] = true;

      var reward = quest.reward || {};
      game.gold += Number(reward.gold || 0);
      game.essence += Number(reward.essence || 0);
      game.totalGoldEarned += Number(reward.gold || 0);

      addLog("📜 Quête terminée : " + quest.name + " (+" + formatNumber(reward.gold || 0) + " or, +" + formatNumber(reward.essence || 0) + " essence)", "event");
      showToast("📜 " + quest.name + " terminée !", 2200);

      if (typeof openQuestCompletePopup === "function") {
        var rewardRows = [];
        if (reward.gold) rewardRows.push({ label: "Or", value: formatNumber(reward.gold) });
        if (reward.essence) rewardRows.push({ label: "Essence", value: formatNumber(reward.essence) });
        openQuestCompletePopup({
          icon: quest.icon || "📜",
          title: "Quête terminée !",
          text: quest.name,
          rewardRows: rewardRows,
          closeLabel: "Fermer"
        });
      }
    }

    if (window.CombatEngine && typeof CombatEngine.spawnEnemy === "function") {
      CombatEngine.spawnEnemy();
    }

    // v3.100.3 : quête réussie -> retour au Campement (décision Seb). Échec/abandon : on reste en combat.
    if (success && typeof switchTab === "function") switchTab("campement");

    if (typeof renderAll === "function") renderAll();
    saveGame();
  },

  onDefeat: function () {
    this.ensureRun();
    var quest = ADVENTURE_QUESTS[game.adventureQuestRun.questId];
    // v3.102.0 (P2) : mort en quête = même règle qu'ailleurs (PV 0, Sang-froid, retour Campement) — plus de soin complet gratuit
    var keptPct = (game.talents && game.talents.t_essence_bloom) ? game.talents.t_essence_bloom * 0.10 : 0;
    game.heroHp = Math.floor((game.heroMaxHp || 1) * keptPct);
    addLog("💀 Quête interrompue" + (quest ? " : " + quest.name : "") + " — progression conservée. Retour au Campement.", "event");
    vibrate([80, 40, 80]);
    this.finish(quest, false);
    game.justDied = true;
    if (typeof switchTab === "function") switchTab("campement");
  },

  forfeit: function () {
    this.ensureRun();
    if (!game.adventureQuestRun.active) return;
    var quest = ADVENTURE_QUESTS[game.adventureQuestRun.questId];
    if (window.SortieManager) SortieManager.end("flee"); // v3.102.1 : abandon = fuite, 50 % du butin
    addLog("🏳️ Quête abandonnée" + (quest ? " : " + quest.name : "") + " — progression conservée.", "event");
    this.finish(quest, false);
  }
};

window.AdventureQuestManager = AdventureQuestManager;
