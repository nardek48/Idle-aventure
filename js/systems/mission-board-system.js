"use strict";
/* systems/mission-board-system.js — v3.103.0 (P4) : MissionBoard, façade commune au-dessus des moteurs de quêtes existants
   (story-quest, world-quest, adventure-quest, hunt-quest, dungeon, exploration-engine/mining/well). Ne remplace AUCUN de ces
   moteurs (protégés ou non) : elle les LIT et normalise leur état en objets « mission » de forme unique pour l'UI (LIGNE_DIRECTRICE
   §3). Aucune mutation de jeu ici — accept/launch/claim/abandon délèguent au manager d'origine. Détail des champs : voir Mission ci-dessous.

   Mission normalisée :
   { id, sourceKind, title, blurb, type, place, objectiveLabel, progressLabel, rewardSummary,
     badge, status, isMain, worldId,
     accept, launch, claim, abandon (fonctions présentes seulement si l'action a un sens pour ce statut) } */

var MISSION_TYPE_ICON = { combat: "⚔️", expedition: "🧭", chasse: "🐗", donjon: "🏰" };
var MISSION_STATUS_LABEL = {
  locked: "Verrouillée", available: "Disponible", accepted: "Acceptée",
  running: "En cours", ready: "Objectif atteint", claimable: "Prête à réclamer"
};

function missionRewardSummary(reward) {
  if (!reward) return "";
  var parts = [];
  if (reward.gold) parts.push(formatNumber(reward.gold) + " or");
  if (reward.essence) parts.push(formatNumber(reward.essence) + " essence");
  if (reward.aether) parts.push(formatNumber(reward.aether) + " Aether");
  if (reward.equipmentRarity && reward.equipmentCount) {
    var label = (window.RARITY_LABELS && RARITY_LABELS[reward.equipmentRarity]) || reward.equipmentRarity;
    parts.push(reward.equipmentCount + " objet " + label);
  }
  if (reward.healingPotion) parts.push("1 potion de soin");
  if (reward.resources && typeof reward.resources === "object") {
    Object.keys(reward.resources).forEach(function (k) {
      var def = (window.WAREHOUSE_RESOURCES || {})[k];
      parts.push(formatNumber(reward.resources[k]) + " " + (def ? def.name : k));
    });
  }
  return parts.join(" · ");
}

function missionWorldName(worldId) {
  var w = (window.WORLDS || []).find(function (x) { return x.id === worldId; });
  return w ? w.name : null;
}

var MissionBoard = {
  /* ---------- Histoire (colonne vertébrale, toujours en tête) ---------- */
  _storyMissions: function () {
    if (!window.StoryQuestManager || !window.STORY_QUESTS) return [];
    var out = [];
    Object.keys(STORY_QUESTS).forEach(function (chapterId) {
      var step = StoryQuestManager.getCurrentStep(chapterId);
      if (!step) return;
      var accepted = StoryQuestManager.isCurrentStepAccepted(chapterId);
      var ready = StoryQuestManager.isCurrentStepReady(chapterId);
      var status = !accepted ? "available" : (ready ? "claimable" : "accepted");
      var m = {
        id: "story_" + chapterId, sourceKind: "story", worldId: chapterId,
        title: step.title, blurb: (step.narrative && step.narrative.objective) || "",
        type: "combat", place: missionWorldName(chapterId) || step.act || "",
        objectiveLabel: step.objectiveLabel || "", progressLabel: accepted ? (step.progress ? step.progress(game) : "") : "",
        rewardSummary: missionRewardSummary(step.reward), badge: "story", status: status, isMain: true
      };
      if (status === "available") m.accept = function () { return StoryQuestManager.acceptStep(chapterId); };
      if (status === "claimable") m.claim = function () { return StoryQuestManager.claimStep(chapterId); };
      if (status === "accepted" && step.linkTo) m.launch = function () { StoryQuestManager.goToLink(chapterId); };
      out.push(m);
    });
    return out;
  },

  /* ---------- Questline de déblocage de monde (Désert et au-delà) ---------- */
  _worldExpeditionMissions: function () {
    if (!window.WorldQuestManager || typeof getNextLockedWorldIndex !== "function") return [];
    var idx = getNextLockedWorldIndex();
    if (idx === -1) return [];
    var quest = WorldQuestManager.getQuestForWorldIndex(idx);
    if (!quest) return [];
    var self = this;
    var stepsDone = quest.steps.filter(function (s) { return WorldQuestManager.isStepComplete(quest, s); }).length;
    var ready = WorldQuestManager.isReadyToClaim(quest);
    var m = {
      id: "worldexp_" + quest.id, sourceKind: "worldExpedition", worldId: quest.worldId,
      title: quest.name, blurb: quest.steps[0] && quest.steps[0].text || "",
      type: "combat", place: missionWorldName(quest.worldId) || "",
      objectiveLabel: stepsDone + "/" + quest.steps.length + " étapes", progressLabel: "",
      rewardSummary: missionRewardSummary(quest.reward), badge: "contract", status: ready ? "claimable" : "running", isMain: quest.category === "main"
    };
    if (ready) m.claim = function () { return WorldQuestManager.claim(idx); };
    return [m];
  },

  /* ---------- Quêtes d'aventure (kill/transition scopées à une aventure) ---------- */
  _adventureMissions: function () {
    if (!window.AdventureQuestManager) return [];
    var quests = AdventureQuestManager.getAllQuests();
    var running = AdventureQuestManager.getRunningQuest();
    var out = [];
    quests.forEach(function (quest) {
      if (game.adventureQuestsCompleted[quest.id]) return;
      var isRunning = !!(running && running.id === quest.id);
      var stepsDone = quest.steps.filter(function (s) { return AdventureQuestManager.isStepComplete(quest, s); }).length;
      var status = isRunning ? "running" : (running ? "locked" : "available");
      var m = {
        id: "adv_" + quest.id, sourceKind: "adventure", worldId: quest.worldId,
        title: quest.name, blurb: quest.story || "",
        type: "combat", place: missionWorldName(quest.worldId) || "",
        objectiveLabel: stepsDone + "/" + quest.steps.length + " objectifs", progressLabel: "",
        rewardSummary: missionRewardSummary(quest.reward), badge: "contract", status: status, isMain: quest.category === "main"
      };
      if (status === "available") m.accept = function () { if (typeof openAdventureQuestIntro === "function") openAdventureQuestIntro(quest.id); };
      if (status === "running") {
        m.launch = function () { if (typeof switchTab === "function") switchTab("combat"); };
        m.abandon = function () { return AdventureQuestManager.forfeit(); };
      }
      out.push(m);
    });
    return out;
  },

  /* ---------- Chasse (lots répétables) ---------- */
  _huntMissions: function () {
    if (!window.HuntQuestManager) return [];
    var quests = HuntQuestManager.getAllQuests();
    var running = HuntQuestManager.getRunningQuest();
    var out = [];
    quests.forEach(function (quest) {
      if (quest.id === "hq_forest_boar" && !(game.explorationProgression && game.explorationProgression.huntBuildingUnlocked)) return;
      var isRunning = !!(running && running.id === quest.id);
      var status = isRunning ? "running" : (running ? "locked" : "available");
      var inLot = isRunning ? Number((game.huntRun && game.huntRun.killsInLot) || 0) : 0;
      var m = {
        id: "hunt_" + quest.id, sourceKind: "hunt", worldId: quest.worldId,
        title: quest.name, blurb: quest.story || "",
        type: "chasse", place: missionWorldName(quest.worldId) || "",
        objectiveLabel: "Lot de " + quest.lotSize, progressLabel: isRunning ? (inLot + "/" + quest.lotSize) : "",
        rewardSummary: quest.dropChancePct + " % par kill", badge: "contract", status: status, isMain: false
      };
      if (status === "available") m.accept = function () { if (typeof openHuntQuestIntro === "function") openHuntQuestIntro(quest.id); };
      if (status === "running") {
        m.launch = function () { if (typeof switchTab === "function") switchTab("combat"); };
        m.abandon = function () { return HuntQuestManager.stop(); };
      }
      out.push(m);
    });
    return out;
  },

  /* ---------- Donjon (paliers à ticket) ---------- */
  _dungeonMissions: function () {
    if (!window.DungeonManager || !window.DUNGEONS) return [];
    var out = [];
    var isRunning = !!(game.dungeonRun && game.dungeonRun.active);
    DungeonManager.checkTicketReset();
    (DUNGEONS || []).forEach(function (dungeon) {
      if (dungeon.locked) return;
      (dungeon.tierIds || []).forEach(function (tierId) {
        var tier = DungeonManager.getTierById(tierId);
        if (!tier) return;
        var unlocked = DungeonManager.isTierUnlocked(tierId);
        if (!unlocked) return; // paliers verrouillés : pas encore une mission proposable
        var cleared = !!(game.dungeonTierCleared && game.dungeonTierCleared[tierId]);
        if (cleared) return; // -> considéré terminé, hors tableau (repasse par l'écran Donjon si Seb veut le refaire)
        var runningHere = isRunning && game.dungeonRun.tierId === tierId;
        var status = runningHere ? "running" : (isRunning ? "locked" : "available");
        var m = {
          id: "dungeon_" + dungeon.id + "_" + tierId, sourceKind: "dungeon", worldId: null,
          title: dungeon.name + " — " + tier.name, blurb: tier.story || "",
          type: "donjon", place: dungeon.name,
          objectiveLabel: "Vague " + (runningHere ? (game.dungeonRun.wave || 1) : 1) + "/" + DUNGEON_CONFIG.waveCount, progressLabel: "",
          rewardSummary: (game.dungeonTickets > 0 ? game.dungeonTickets + " ticket(s)" : "Aucun ticket"),
          badge: "contract", status: status, isMain: false
        };
        if (status === "available" && game.dungeonTickets > 0) m.accept = function () { return DungeonManager.start(tierId); };
        if (status === "running") {
          m.launch = function () { if (typeof switchTab === "function") switchTab("combat"); };
          m.abandon = function () { return DungeonManager.forfeit(); };
        }
        out.push(m);
      });
    });
    return out;
  },

  /* ---------- Expéditions à mini-jeu (Sentier Obstrué, Veine Instable, Source Claire) ---------- */
  _explorationMissions: function () {
    var out = [];
    if (window.ExplorationManager && window.EXPLORATION_QUESTS) {
      Object.keys(EXPLORATION_QUESTS).forEach(function (key) {
        var quest = EXPLORATION_QUESTS[key];
        if (quest.id === "unstableVein" || quest.id === "driedSpring") return; // routées ci-dessous (MiningManager/WellManager)
        if (ExplorationManager.isQuestCompleted(quest.id)) return;
        var run = ExplorationManager.getRun();
        var isRunning = !!(run && run.questId === quest.id && run.status !== "completed");
        var m = {
          id: "exploration_" + quest.id, sourceKind: "exploration", worldId: null,
          title: quest.title, blurb: "",
          type: "expedition", place: "", objectiveLabel: "", progressLabel: isRunning ? "En cours" : "",
          rewardSummary: "", badge: "contract", status: isRunning ? "running" : "available", isMain: false
        };
        m.launch = function () { if (typeof openQuestsAt === "function") openQuestsAt(quest.section || "expedition", "exploration_" + quest.id); };
        out.push(m);
      });
    }
    if (window.MiningManager && window.EXPLORATION_QUESTS && EXPLORATION_QUESTS.unstableVein && MiningManager.isQuarryUnlocked && MiningManager.isQuarryUnlocked() && !MiningManager.isQuestCompleted()) {
      var veinQuest = EXPLORATION_QUESTS.unstableVein;
      var veinSession = MiningManager.getActiveSession();
      var veinRunning = !!(veinSession && veinSession.source === "quest" && veinSession.status !== "completed");
      out.push({
        id: "exploration_" + veinQuest.id, sourceKind: "exploration", worldId: null,
        title: veinQuest.title, blurb: "", type: "expedition", place: "", objectiveLabel: "", progressLabel: veinRunning ? "En cours" : "",
        rewardSummary: "", badge: "contract", status: veinRunning ? "running" : "available", isMain: false,
        launch: function () { if (typeof openQuestsAt === "function") openQuestsAt("expedition", "exploration_" + veinQuest.id); }
      });
    }
    if (window.WellManager && window.EXPLORATION_QUESTS && EXPLORATION_QUESTS.driedSpring && WellManager.isWellUnlocked && WellManager.isWellUnlocked() && !WellManager.isQuestCompleted()) {
      var springQuest = EXPLORATION_QUESTS.driedSpring;
      var springSession = WellManager.getActiveSession();
      var springRunning = !!(springSession && springSession.source === "quest" && springSession.status !== "completed");
      out.push({
        id: "exploration_" + springQuest.id, sourceKind: "exploration", worldId: null,
        title: springQuest.title, blurb: "", type: "expedition", place: "", objectiveLabel: "", progressLabel: springRunning ? "En cours" : "",
        rewardSummary: "", badge: "contract", status: springRunning ? "running" : "available", isMain: false,
        launch: function () { if (typeof openQuestsAt === "function") openQuestsAt("expedition", "exploration_" + springQuest.id); }
      });
    }
    return out;
  },

  /* ---------- Contrat du jour (journalières -> 1 tirage, décision §10 n°7) ---------- */
  _contractMissions: function () {
    if (!window.QuestManager || !Array.isArray(game.quests) || !game.quests.length) return [];
    var quest = game.quests[0]; // v3.103.0 : un seul contrat actif (voir 3.103.2 pour réduire generateDaily à 1 tirage)
    var progress = QuestManager.getProgress(quest);
    var ready = !quest.claimed && QuestManager.isComplete(quest);
    var m = {
      id: "contract_" + quest.id, sourceKind: "contract", worldId: null,
      title: quest.name, blurb: quest.desc || "",
      type: "combat", place: "", objectiveLabel: quest.desc || "", progressLabel: Math.min(progress, quest.target) + "/" + quest.target,
      rewardSummary: missionRewardSummary({ gold: quest.rewardGold, essence: quest.rewardEssence }),
      badge: "contract", status: quest.claimed ? "claimable_done" : (ready ? "claimable" : "running"), isMain: false
    };
    if (quest.claimed) return [];
    if (ready) m.claim = function () { return QuestManager.claim(quest.id); };
    return [m];
  },

  /* ---------- Agrégation ---------- */
  /* Toutes les missions actives/proposables, Histoire en tête, triées par priorité (isMain, puis claimable > running > available). */
  list: function () {
    var self = this;
    var groups = [this._storyMissions(), this._worldExpeditionMissions(), this._contractMissions(),
      this._adventureMissions(), this._huntMissions(), this._dungeonMissions(), this._explorationMissions()];
    var all = [].concat.apply([], groups);
    var rank = { story: 0 }; // l'Histoire garde toujours le rang 0 (colonne vertébrale, LIGNE_DIRECTRICE §3)
    var statusRank = { claimable: 0, ready: 0, running: 1, accepted: 1, available: 2, locked: 3 };
    all.sort(function (a, b) {
      var ra = a.sourceKind === "story" ? 0 : 1, rb = b.sourceKind === "story" ? 0 : 1;
      if (ra !== rb) return ra - rb;
      var sa = statusRank[a.status] != null ? statusRank[a.status] : 4, sb = statusRank[b.status] != null ? statusRank[b.status] : 4;
      if (sa !== sb) return sa - sb;
      if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
      return 0;
    });
    return all;
  },

  /* Les N premières missions (Campement, aperçu). */
  top: function (n) {
    return this.list().slice(0, n || 3);
  },

  getById: function (id) {
    return this.list().find(function (m) { return m.id === id; }) || null;
  },

  statusLabel: function (status) { return MISSION_STATUS_LABEL[status] || status; },
  typeIcon: function (type) { return MISSION_TYPE_ICON[type] || "📜"; }
};

window.MissionBoard = MissionBoard;
window.missionRewardSummary = missionRewardSummary;
