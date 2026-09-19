"use strict";
/* systems/hunt-quest-system.js — Chasses (data/hunt-quests.js), run dédié par lots de kills, s'arrête à la fin du lot (popup, relance manuelle).
   Seules des ressources sont gagnées pendant une chasse (pas d'or/essence/XP/équipement) ; v3.260.0 : resourcePool. Détail complet : COMMENTAIRES_ORIGINAUX.md */

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
    // v3.107.0 : délègue au module partagé (systems/quest-enemy-system.js), qui gère aussi le
    // filtre d'ennemis optionnel de la quête (quest.enemyFilter). Les chasses n'ont pas de boss.
    return window.QuestEnemyManager ? QuestEnemyManager.spawnFor(quest, false) : null;
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

    if (window.heroLockToast && heroLockToast()) return; // v3.307.0 : héros en expédition
    game.huntRun = { active: true, questId: questId, killsInLot: 0 };
    if (window.SortieManager) { SortieManager.end("return"); SortieManager.start("hunt"); } // v3.102.1 : la chasse est une sortie
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

    // v3.207.0 : une battue (type "gold") ne fait tomber aucune ressource —
    // sa prime est versée en une fois à la fin du lot, voir finishLot().
    if (quest.resourceKey && chance(quest.dropChancePct)) {
      // v3.260.0 (accord Seb) : resourcePool -> une ressource tirée à parts égales, sinon resourceKey
      var pool = Array.isArray(quest.resourcePool) && quest.resourcePool.length ? quest.resourcePool : null;
      var dropKey = pool ? pool[Math.floor(Math.random() * pool.length)] : quest.resourceKey;
      // v3.102.1 : le butin est de sortie (banqué à la fin du lot, perdu à la mort, 50 % en arrêt manuel)
      if (window.SortieManager && SortieManager.isActive()) SortieManager.addResource(dropKey, 1);
      else WarehouseManager.addResource(dropKey, 1);
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

    // v3.207.0 : prime d'or d'une battue. Versée à la fin du lot seulement, donc
    // perdue si le joueur meurt ou s'arrête en route — même règle que le butin
    // de sortie, et c'est ce qui rend le lot de 20 engageant.
    if (quest.rewardGold) {
      game.gold += quest.rewardGold;
      addLog("🪙 Prime de battue : +" + formatNumber(quest.rewardGold) + " or", "event");
    }

    addLog("🏹 Chasse terminée : " + quest.name + " (" + quest.lotSize + "/" + quest.lotSize + ")", "event");
    game.huntRun = { active: false, questId: null, killsInLot: 0 };
    if (window.SortieManager) SortieManager.end("success");

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
    if (window.SortieManager) SortieManager.end("flee"); // v3.102.1 : arrêt volontaire = fuite (50 % de la viande) ; après une mort, déjà clos
    addLog("🏹 Chasse arrêtée" + (quest ? " : " + quest.name : ""), "event");
    game.huntRun = { active: false, questId: null, killsInLot: 0 };

    if (window.CombatEngine && typeof CombatEngine.spawnEnemy === "function") {
      CombatEngine.spawnEnemy();
    }
    // v3.293.0 : arrêt depuis l'écran Combat -> Campement (plus de farm libre derrière)
    if (game.activeTab === "combat" && typeof switchTab === "function") switchTab("campement");
    if (typeof renderAll === "function") renderAll();
    saveGame();
  },

  onDefeat: function () {
    this.ensureRun();
    var quest = HUNT_QUESTS[game.huntRun.questId];
    // v3.102.0 (P2) : même règle de mort qu'ailleurs (PV 0, Sang-froid, retour Campement)
    var keptPct = (game.talents && game.talents.t_essence_bloom) ? game.talents.t_essence_bloom * 0.10 : 0;
    game.heroHp = Math.floor((game.heroMaxHp || 1) * keptPct);
    addLog("💀 Chasse interrompue" + (quest ? " : " + quest.name : "") + " — le butin de la sortie est perdu. Retour au Campement.", "event");
    vibrate([80, 40, 80]);
    this.stop();
    game.justDied = true;
    if (typeof switchTab === "function") switchTab("campement");
  }
};

window.HuntQuestManager = HuntQuestManager;
