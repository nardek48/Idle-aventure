"use strict";
/* systems/world-quest-system.js — suivi/réclamation des questlines de déblocage des mondes (data/world-quests.js).
   Progression/complétion PERMANENTES (survivent à l'ascension). Détail complet : COMMENTAIRES_ORIGINAUX.md */

var WorldQuestManager = {
  ensureDefaults: function () {
    if (!game.worldQuestProgress || typeof game.worldQuestProgress !== "object") {
      game.worldQuestProgress = {};
    }
    if (!game.worldQuestsCompleted || typeof game.worldQuestsCompleted !== "object") {
      game.worldQuestsCompleted = {};
    }

    Object.keys(WORLD_QUESTS).forEach(function (key) {
      var quest = WORLD_QUESTS[key];
      if (!game.worldQuestProgress[quest.id]) game.worldQuestProgress[quest.id] = {};
      quest.steps.forEach(function (step) {
        if (typeof game.worldQuestProgress[quest.id][step.id] !== "number") {
          game.worldQuestProgress[quest.id][step.id] = 0;
        }
      });
      if (typeof game.worldQuestsCompleted[quest.id] !== "boolean") {
        game.worldQuestsCompleted[quest.id] = false;
      }
    });
  },

  migrate: function () {
    this.ensureDefaults();
    Object.keys(WORLD_QUESTS).forEach(function (key) {
      var quest = WORLD_QUESTS[key];
      var alreadyReached = !!(game.worldsEverReached && game.worldsEverReached[quest.worldIndex]);
      if (alreadyReached && !game.worldQuestsCompleted[quest.id]) {
        game.worldQuestsCompleted[quest.id] = true;
        quest.steps.forEach(function (step) {
          game.worldQuestProgress[quest.id][step.id] = step.target;
        });
      }
    });
  },

  getQuestForWorldIndex: function (index) {
    return WORLD_QUESTS_BY_INDEX[index] || null;
  },

  isWorldUnlocked: function (index) {
    var quest = this.getQuestForWorldIndex(index);
    if (!quest) return true;
    return !!(game.worldQuestsCompleted && game.worldQuestsCompleted[quest.id]);
  },

  getStepProgress: function (quest, step) {
    this.ensureDefaults();
    return Math.min(step.target, Number((game.worldQuestProgress[quest.id] || {})[step.id] || 0));
  },

  isStepComplete: function (quest, step) {
    return this.getStepProgress(quest, step) >= step.target;
  },

  isReadyToClaim: function (quest) {
    if (!quest) return false;
    if (game.worldQuestsCompleted[quest.id]) return false;
    var self = this;
    return quest.steps.every(function (step) { return self.isStepComplete(quest, step); });
  },

  trackKill: function (worldId) {
    if (!worldId) return;
    this.ensureDefaults();
    var self = this;
    Object.keys(WORLD_QUESTS).forEach(function (key) {
      var quest = WORLD_QUESTS[key];
      if (game.worldQuestsCompleted[quest.id]) return;
      quest.steps.forEach(function (step) {
        if (step.type === "kill" && step.worldId === worldId) {
          var progress = game.worldQuestProgress[quest.id];
          if (progress[step.id] < step.target) progress[step.id] += 1;
        }
      });
    });
  },

  trackBossKill: function (bossId) {
    if (!bossId) return;
    this.ensureDefaults();
    Object.keys(WORLD_QUESTS).forEach(function (key) {
      var quest = WORLD_QUESTS[key];
      if (game.worldQuestsCompleted[quest.id]) return;
      quest.steps.forEach(function (step) {
        if (step.type === "bossKill" && step.bossId === bossId) {
          var progress = game.worldQuestProgress[quest.id];
          if (progress[step.id] < step.target) progress[step.id] += 1;
        }
      });
    });
  },

  trackLoot: function (rarity) {
    if (!rarity) return;
    this.ensureDefaults();
    var rank = RARITY_ORDER.indexOf(rarity);
    if (rank === -1) return;

    Object.keys(WORLD_QUESTS).forEach(function (key) {
      var quest = WORLD_QUESTS[key];
      if (game.worldQuestsCompleted[quest.id]) return;
      quest.steps.forEach(function (step) {
        if (step.type !== "loot") return;
        var minRank = RARITY_ORDER.indexOf(step.minRarity);
        if (rank < minRank) return;
        var progress = game.worldQuestProgress[quest.id];
        if (progress[step.id] < step.target) progress[step.id] += 1;
      });
    });
  },

  claim: function (worldIndex) {
    var quest = this.getQuestForWorldIndex(worldIndex);
    if (!quest) return false;
    if (!this.isReadyToClaim(quest)) {
      showToast("Questline pas encore terminée", 1500);
      return false;
    }

    var reward = quest.reward || {};
    game.gold += Number(reward.gold || 0);
    game.essence += Number(reward.essence || 0);
    if (reward.aether) game.aether = Number(game.aether || 0) + Number(reward.aether || 0);

    var grantedItems = [];
    if (reward.equipmentRarity && reward.equipmentCount) {
      for (var i = 0; i < reward.equipmentCount; i++) {
        var item = window.LootSystem && typeof LootSystem.rollDropAtRarity === "function"
          ? LootSystem.rollDropAtRarity(reward.equipmentRarity)
          : null;
        if (item && typeof addLootToInventory === "function" && addLootToInventory(item)) {
          grantedItems.push(item);
        }
      }
    }

    game.worldQuestsCompleted[quest.id] = true;

    addLog("🗺️ Questline terminée : " + quest.name + " — " + quest.worldId + " débloqué !", "event");
    showToast("🗺️ " + quest.name + " terminée !", 2200);
    grantedItems.forEach(function (item) {
      addLog("🎁 Récompense de questline : " + item.name + " (" + item.rarity + ")", "event");
    });

    if (typeof renderAll === "function") renderAll();
    if (typeof saveGame === "function") saveGame();
    return true;
  }
};

window.WorldQuestManager = WorldQuestManager;
