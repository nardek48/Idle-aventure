"use strict";
/* systems/story-quest-system.js — chaîne Histoire (data/story-quests.js). Modèle : workshop-unlock-system.js généralisé.
   Cycle par étape : disponible → acceptée (onglets débloqués) → objectif atteint → réclamée. État : game.storyQuests[chapterId]. */

var STORY_CHECK_THROTTLE_MS = 1000;

var StoryQuestManager = {
  _lastCheckAt: 0,

  ensure: function () {
    if (!game.storyQuests || typeof game.storyQuests !== "object") game.storyQuests = {};
    var self = this;
    Object.keys(STORY_QUESTS).forEach(function (chapterId) { self._ensureChapter(chapterId); });
  },

  _ensureChapter: function (chapterId) {
    var st = game.storyQuests[chapterId];
    if (!st || typeof st !== "object") st = game.storyQuests[chapterId] = {};
    if (typeof st.currentStep !== "number" || st.currentStep < 0) st.currentStep = 0;
    if (typeof st.accepted !== "boolean") st.accepted = false;
    if (!st.claimedSteps || typeof st.claimedSteps !== "object") st.claimedSteps = {};
    if (!st.tutorialsSeen || typeof st.tutorialsSeen !== "object") st.tutorialsSeen = {}; // v3.107.7 : popups pédagogiques déjà vus
    if (typeof st.readyNotified !== "boolean") st.readyNotified = false;
    // skipped : chapitre court-circuité (save migrée déjà tout débloquée, ou bouton Paramètres).
    if (typeof st.skipped !== "boolean") st.skipped = false;
    // v3.100.1 : compteurs Histoire (victoires au Cœur) alimentés par _trackKills.
    if (!st.counters || typeof st.counters !== "object") st.counters = {};
    if (typeof st.counters.coeurKills !== "number") st.counters.coeurKills = 0;
    if (typeof st.counters.coeurBossKills !== "number") st.counters.coeurBossKills = 0;
    if (typeof st.lastSeenTotalKills !== "number") st.lastSeenTotalKills = Number(game.totalKills || 0);
    if (typeof st.lastSeenBossKills !== "number") st.lastSeenBossKills = Number((game.killCounts || {}).orcwarlord || 0); // v3.104.0 (P5) : ex-slimeking
    return st;
  },

  getChapter: function (chapterId) {
    return STORY_QUESTS[chapterId || "forest"] || null;
  },

  getState: function (chapterId) {
    this.ensure();
    return game.storyQuests[chapterId || "forest"];
  },

  /* Étape courante (null si chapitre terminé/court-circuité ou si la suite n'est pas encore livrée). */
  getCurrentStep: function (chapterId) {
    var chapter = this.getChapter(chapterId);
    var st = this.getState(chapterId);
    if (!chapter || st.skipped) return null;
    return chapter.steps[st.currentStep] || null;
  },

  isChapterCompleted: function (chapterId) {
    var chapter = this.getChapter(chapterId);
    var st = this.getState(chapterId);
    if (!chapter) return true;
    return st.skipped || st.currentStep >= chapter.steps.length;
  },

  isCurrentStepAccepted: function (chapterId) {
    return !!this.getCurrentStep(chapterId) && this.getState(chapterId).accepted;
  },

  isCurrentStepReady: function (chapterId) {
    var step = this.getCurrentStep(chapterId);
    if (!step || !this.getState(chapterId).accepted) return false;
    try { return !!step.check(game); } catch (e) { return false; }
  },

  /* Nombre d'étapes réclamables (badge Quêtes / Menu). */
  getClaimableCount: function () {
    var self = this;
    return Object.keys(STORY_QUESTS).filter(function (id) { return self.isCurrentStepReady(id); }).length;
  },

  /* Accepter l'étape courante : applique unlockTabs immédiatement (décision Seb, v3.100.0). */
  acceptStep: function (chapterId) {
    chapterId = chapterId || "forest";
    var step = this.getCurrentStep(chapterId);
    var st = this.getState(chapterId);
    if (!step || st.accepted) return false;

    st.accepted = true;
    st.readyNotified = false;
    this._applyUnlockTabs(step);

    addLog("📖 " + step.title + " — " + step.narrative.objective, "event");
    var unlocked = this._describeUnlocks(step);
    if (unlocked && typeof showToast === "function") showToast("🔓 Débloqué : " + unlocked, 2000);

    this._refreshAfterChange();
    return true;
  },

  _applyUnlockTabs: function (step) {
    if (!game.unlockedTabs || typeof game.unlockedTabs !== "object") game.unlockedTabs = {};
    (step.unlockTabs || []).forEach(function (tab) { game.unlockedTabs[tab] = true; });
  },

  _describeUnlocks: function (step) {
    var labels = window.STORY_TAB_LABELS || {};
    return (step.unlockTabs || []).map(function (t) { return labels[t] || t; }).join(", ");
  },

  /* Vérification opportuniste (renderPanel, throttlée) : signale une seule fois le passage à « réclamable ».
     Ne déclenche jamais de rendu (appelée depuis le rendu lui-même). */
  checkCurrentStep: function (silent) {
    this._trackKills();
    var now = Date.now();
    if (now - this._lastCheckAt < STORY_CHECK_THROTTLE_MS) return false;
    this._lastCheckAt = now;
    return this._checkNow(silent);
  },

  /* v3.100.1 : compte les victoires au Cœur de la forêt sans toucher combat-engine.js (protégé) :
     combat-engine appelle renderAll() après chaque kill, donc le delta de game.totalKills (et de
     killCounts.orcwarlord pour le boss, v3.104.0/P5 : nouveau boss du Cœur, ex-slimeking) entre deux
     appels = kills récents. Attribué au Cœur si worldIndex 0 / adventureIndex 1, hors runs de
     Chasse/Donjon. Limite connue : les kills de chasse ambiante (OfflineManager.tickAmbientHunting)
     au Cœur comptent aussi — accepté. */
  /* v3.107.4 : synchronise le pool d'ennemis du Cœur (Troll/Ronce dès l'Acte III) sur l'objet WORLDS
     réel (référence directe, mutable en place) — évite de toucher combat-engine.js/progression-system.js
     (protégés). Appelé à chaque round (comme _trackKills, non throttlé) : toujours frais avant le
     prochain generateEnemy(), y compris juste après le chargement d'une save. */
  _syncCoeurEnemyPool: function () {
    if (!window.WORLDS || !window.STORY_COEUR_BASE_POOL) return;
    var forestWorld = WORLDS.find(function (w) { return w.id === "forest"; });
    var coeur = forestWorld && forestWorld.adventures[1];
    if (!coeur) return;
    // v3.107.8 : comparaison par id d'étape (pas un index numérique en dur) — reste correct même
    // si la chaîne Histoire change de longueur (ex. forest_10 retirée, décision Seb).
    var chapter = STORY_QUESTS.forest;
    var currentIdx = (game.storyQuests && game.storyQuests.forest) ? game.storyQuests.forest.currentStep : 0;
    var targetIdx = chapter.steps.findIndex(function (s) { return s.id === (window.STORY_COEUR_ACT3_STEP_ID || "forest_11"); });
    var act3Reached = targetIdx !== -1 && currentIdx >= targetIdx;
    var wantedPool = act3Reached ? STORY_COEUR_ACT3_POOL : STORY_COEUR_BASE_POOL;
    coeur.enemyPool = wantedPool;
  },

  _trackKills: function () {
    this.ensure();
    this._syncCoeurEnemyPool();
    var st = game.storyQuests.forest;
    if (!st) return;
    var total = Number(game.totalKills || 0);
    var bossTotal = Number((game.killCounts || {}).orcwarlord || 0);
    var delta = total - st.lastSeenTotalKills;
    var bossDelta = bossTotal - st.lastSeenBossKills;
    st.lastSeenTotalKills = total;
    st.lastSeenBossKills = bossTotal;
    if (delta <= 0 && bossDelta <= 0) return; // reset/ascension : on resynchronise sans compter
    if (game.huntRun && game.huntRun.active) return;
    if (game.dungeonRun && game.dungeonRun.active) return;
    var wm = window.WorldManager;
    if (!wm || Number(wm.worldIndex || 0) !== 0 || Number(wm.adventureIndex || 0) !== 1) return;
    if (delta > 0) st.counters.coeurKills += delta;
    if (bossDelta > 0) st.counters.coeurBossKills += bossDelta;
  },

  _checkNow: function (silent) {
    var self = this;
    var anyNew = false;
    Object.keys(STORY_QUESTS).forEach(function (chapterId) {
      var st = self.getState(chapterId);
      if (!self.isCurrentStepReady(chapterId) || st.readyNotified) return;
      st.readyNotified = true;
      anyNew = true;
      var step = self.getCurrentStep(chapterId);
      if (!silent) {
        addLog("✅ Objectif atteint : " + step.title + " — réclame ta récompense dans Quêtes.", "event");
        if (typeof showToast === "function") showToast("✅ " + step.title + " — récompense prête", 2000);
      }
      // v3.107.1 : killTarget.autoReturn — dès l'objectif atteint (ex. forest_02 « Premier sang »), retour
      // au Campement pour que le joueur voie tout de suite qu'il peut réclamer, sans continuer à farmer inutilement.
      if (step && step.killTarget && step.killTarget.autoReturn && game.activeTab === "combat") {
        if (typeof switchTab === "function") switchTab("campement");
      }
    });
    if (anyNew && typeof updateQuestBadge === "function") updateQuestBadge();
    return anyNew;
  },

  claimStep: function (chapterId) {
    chapterId = chapterId || "forest";
    var step = this.getCurrentStep(chapterId);
    var st = this.getState(chapterId);
    if (!step || !st.accepted) return false;
    if (!this.isCurrentStepReady(chapterId)) {
      if (typeof showToast === "function") showToast("Objectif non atteint", 1200);
      return false;
    }

    var rewardRows = this._grantReward(step.reward || {});
    st.claimedSteps[step.id] = true;
    st.currentStep += 1;
    st.accepted = false;
    st.readyNotified = false;

    addLog("📖 Étape terminée : " + step.title, "event");
    if (typeof openQuestCompletePopup === "function") {
      openQuestCompletePopup({
        icon: "🔥",
        title: step.title,
        text: step.narrative.completion,
        rewardRows: rewardRows,
        closeLabel: "Continuer",
        suggestNextQuest: false // v3.100.4 : pas de « Quête suivante » sur les étapes Histoire
      });
    }

    this._refreshAfterChange();
    return true;
  },

  /* Or/essence en direct (même pratique que adventure-quest-system), potion de soin via healingPotionsOwned,
     équipement via LootSystem.rollDropAtRarity (pattern world-quest-system). */
  _grantReward: function (reward) {
    var rows = [];
    // v3.103.3 (P4, décision §10 n°6) : chaque étape réclamée donne 15 XP, indépendamment du contenu de `reward`.
    if (typeof grantHeroXp === "function") grantHeroXp(15, "story");
    if (reward.gold) {
      game.gold += Number(reward.gold);
      rows.push({ label: "Or", value: formatNumber(reward.gold) });
    }
    if (reward.essence) {
      game.essence += Number(reward.essence);
      rows.push({ label: "Essence", value: formatNumber(reward.essence) });
    }
    if (reward.healingPotion && reward.healingPotion.id) {
      if (window.PotionManager && typeof PotionManager.ensureHealing === "function") PotionManager.ensureHealing();
      if (!game.healingPotionsOwned || typeof game.healingPotionsOwned !== "object") game.healingPotionsOwned = {};
      var count = Number(reward.healingPotion.count || 1);
      game.healingPotionsOwned[reward.healingPotion.id] = Number(game.healingPotionsOwned[reward.healingPotion.id] || 0) + count;
      var potion = (window.PotionManager && typeof PotionManager.getHealingPotion === "function") ? PotionManager.getHealingPotion(reward.healingPotion.id) : null;
      rows.push({ label: potion ? potion.name : "Potion", value: "×" + count });
    }
    if (reward.resources && typeof reward.resources === "object" && window.WarehouseManager) {
      Object.keys(reward.resources).forEach(function (key) {
        var applied = WarehouseManager.addResource(key, reward.resources[key], true);
        var def = (window.WAREHOUSE_RESOURCES || {})[key];
        if (applied > 0) rows.push({ label: def ? def.name : key, value: "+" + formatNumber(applied) });
      });
    }
    if (reward.equipmentRarity && reward.equipmentCount) {
      var granted = 0;
      for (var i = 0; i < reward.equipmentCount; i++) {
        var item = (window.LootSystem && typeof LootSystem.rollDropAtRarity === "function") ? LootSystem.rollDropAtRarity(reward.equipmentRarity) : null;
        if (item && typeof addLootToInventory === "function" && addLootToInventory(item)) {
          granted += 1;
          addLog("🎁 Récompense d'histoire : " + item.name, "event");
        }
      }
      if (granted) rows.push({ label: "Objet", value: granted + " (" + ((window.RARITY_LABELS || {})[reward.equipmentRarity] || reward.equipmentRarity) + ")" });
    }
    return rows;
  },

  _refreshAfterChange: function () {
    if (typeof refreshTabBarVisibility === "function") refreshTabBarVisibility();
    if (typeof renderAll === "function") renderAll();
    saveGame();
  },

  /* Court-circuite le chapitre (bouton Paramètres « Débloquer tous les onglets »). */
  skipAll: function () {
    this.ensure();
    Object.keys(STORY_QUESTS).forEach(function (id) { game.storyQuests[id].skipped = true; });
  },

  /* Boot : garantit l'état et rattrape un objectif déjà atteint hors ligne (sans toast, le log suffit). */
  runRetroactiveCheck: function () {
    this.ensure();
    this._syncCoeurEnemyPool();
    // Resynchronise le repère de kills au boot : les kills hors ligne (OfflineManager) ne sont pas
    // localisables, ils ne comptent pas comme victoires au Cœur.
    game.storyQuests.forest.lastSeenTotalKills = Number(game.totalKills || 0);
    game.storyQuests.forest.lastSeenBossKills = Number((game.killCounts || {}).orcwarlord || 0);
    this._checkNow(true);
  },

  /* Navigation « Aller à la quête » : onglet direct, ou section/carte de l'écran Quêtes. */
  goToLink: function (chapterId) {
    var step = this.getCurrentStep(chapterId);
    if (!step || !step.linkTo) return;
    if (step.linkTo.tab) {
      if (typeof switchTab === "function") switchTab(step.linkTo.tab);
      // v3.107.1 : sous-onglet optionnel (ex. forest_03 -> Menu > Amélioration directement, décision Seb).
      if (step.linkTo.subTab && typeof setHerosSubTab === "function") setHerosSubTab(step.linkTo.subTab);
      return;
    }
    // v3.107.6 : les 3 expéditions à mini-jeu (Sentier Obstrué, Veine Instable, Source Tarie)
    // ont un vrai point d'entrée dédié — openQuestsAt() seul ne fait que changer d'onglet
    // sans rien déclencher (bug remonté par Seb : bouton « Aller à la quête » inerte).
    var cardId = step.linkTo.cardId || "";
    if (cardId === "exploration_driedSpring" && typeof openDriedSpringQuest === "function") { openDriedSpringQuest(); return; }
    if (cardId === "exploration_unstableVein" && typeof openUnstableVeinQuest === "function") { openUnstableVeinQuest(); return; }
    if (cardId.indexOf("exploration_") === 0 && typeof openExplorationPrep === "function") { openExplorationPrep(cardId.replace("exploration_", "")); return; }
    if (typeof openQuestsAt === "function") openQuestsAt(step.linkTo.section, step.linkTo.cardId);
  }
};

window.StoryQuestManager = StoryQuestManager;
