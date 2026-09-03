"use strict";
/* systems/mission-board-system.js — v3.103.0 (P4) : MissionBoard, façade commune au-dessus des moteurs de quêtes existants
   (story-quest, world-quest, adventure-quest, hunt-quest, dungeon, exploration-engine/mining/well). Ne remplace AUCUN de ces
   moteurs (protégés ou non) : elle les LIT et normalise leur état en objets « mission » de forme unique pour l'UI (LIGNE_DIRECTRICE
   §3). Aucune mutation de jeu ici — accept/launch/claim/abandon délèguent au manager d'origine. Détail des champs : voir Mission ci-dessous.

   Mission normalisée :
   { id, sourceKind, title, blurb, type, place, objectiveLabel, progressLabel, rewardSummary,
     badge, status, isMain, worldId,
     accept, launch, claim, abandon (fonctions présentes seulement si l'action a un sens pour ce statut) } */

/* v3.118.0 (retour Seb) : sur le tableau de missions, ce qui manque avant d'accepter c'est "à quoi
   ça sert", pas le lore (déjà présent ailleurs, ex. popup de préparation). Texte orienté objectif,
   par questId — distinct de quest.description (narratif) utilisé lui dans le popup de préparation. */
var EXPLORATION_BOARD_BLURBS = {
  blockedPath: "Ouvre l'accès à la Clairière oubliée (mène à la Carrière).",
  unstableVein: "Débloque la Carrière (pierre).",
  ironLode: "Débloque la Mine (fer).",
  driedSpring: "Débloque le Puits (eau).",
  silentGrove: "Débloque la Scierie (planches).",
  fallowField: "Débloque les Champs (blé)."
};

var MISSION_TYPE_ICON = { combat: "⚔️", expedition: "🧭", chasse: "🐗", donjon: "🏰", production: "🔨" }; // v3.108.0 : production (Les fondations)
var MISSION_STATUS_LABEL = {
  locked: "Verrouillée", available: "Disponible", accepted: "Acceptée",
  running: "En cours", ready: "Objectif atteint", claimable: "Prête à réclamer"
};

/* v3.107.1 : une quête secondaire (aventure/chasse) référencée par l'étape Histoire COURANTE et
   ACCEPTÉE (linkTo.section "adventure", cardId "adv_"+questId) est mise en évidence sur le tableau
   de missions — décision Seb : c'est la donnée (linkTo) qui pilote, pas une liste codée en dur. */
function isStoryLinkedQuest(questId) {
  if (!window.StoryQuestManager) return false;
  var step = StoryQuestManager.getCurrentStep("forest");
  if (!step || !StoryQuestManager.isCurrentStepAccepted("forest")) return false;
  var link = step.linkTo;
  return !!(link && link.section === "adventure" && link.cardId === "adv_" + questId);
}

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
    // v3.107.4 : n'afficher la quête de déblocage QUE si le monde immédiatement précédent est
    // « terminé » (joueur dans sa DERNIÈRE aventure) — pas juste atteint. Sans ça, une quête de
    // monde 2+ pouvait apparaître alors que le joueur est encore tout au début du monde 0.
    if (idx > 0 && window.WorldManager && window.WORLDS) {
      var prevWorld = WORLDS[idx - 1];
      var lastAdvIndex = prevWorld && prevWorld.adventures ? prevWorld.adventures.length - 1 : 0;
      var reachedFinalAdventure = WorldManager.worldIndex === (idx - 1) && WorldManager.adventureIndex >= lastAdvIndex;
      if (!reachedFinalAdventure) return [];
    }
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
      // v3.107.4 : décision Seb — tutoriel, pas de surcharge. Une quête secondaire NON LIÉE à
      // l'étape Histoire courante est masquée tant qu'elle n'est pas encore lancée (available) ;
      // une fois en cours (running), elle reste toujours visible (le joueur doit pouvoir la finir).
      if (!isRunning && quest.category !== "main" && !isStoryLinkedQuest(quest.id)) return;
      var stepsDone = quest.steps.filter(function (s) { return AdventureQuestManager.isStepComplete(quest, s); }).length;
      var status = isRunning ? "running" : (running ? "locked" : "available");
      var m = {
        id: "adv_" + quest.id, sourceKind: "adventure", worldId: quest.worldId,
        title: quest.name, blurb: quest.story || "",
        type: "combat", place: missionWorldName(quest.worldId) || "",
        objectiveLabel: stepsDone + "/" + quest.steps.length + " objectifs", progressLabel: "",
        rewardSummary: missionRewardSummary(quest.reward), badge: "contract", status: status, isMain: quest.category === "main" || isStoryLinkedQuest(quest.id)
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
    // v3.118.0 (retour Seb) : le palier 1 est TOUJOURS "isTierUnlocked" en soi (mécanique de
    // donjon), mais narrativement le Donjon n'a de sens qu'après forest_14 (Acte III, avant-
    // dernière étape, unlockTabs: ["dungeon"]) — sans ce filtre, "Tanière du Basilic" apparaissait
    // dès le boot, bien avant que le joueur en ait la moindre idée.
    if (!(game.unlockedTabs && game.unlockedTabs.dungeon)) return [];
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

  /* ---------- Expéditions à mini-jeu (Sentier Obstrué, Veine Instable, Source Tarie,
     et v3.110.0 : Bosquet Silencieux, Éboulis Ferreux, Terre en Friche) ---------- */
  /* v3.110.0 : gating d'AFFICHAGE d'une expédition au tableau (quest.boardRequires) —
     distinct des requirements de lancement. Sans boardRequires, visible (historique). */
  _isExplorationQuestBoardVisible: function (quest) {
    var req = quest.boardRequires;
    if (!req) return true;
    if (req.tabUnlocked && !(game.unlockedTabs && game.unlockedTabs[req.tabUnlocked])) return false;
    if (req.progressFlag && !(game.explorationProgression && game.explorationProgression[req.progressFlag])) return false;
    // v3.119.0 (retour Seb) : plusieurs conditions cumulées (ex. Terre en Friche exige à la fois
    // le Puits ET la Cuisine de camp/petite ration) — progressFlags (pluriel), toutes requises.
    if (req.progressFlags && !req.progressFlags.every(function (flag) { return !!(game.explorationProgression && game.explorationProgression[flag]); })) return false;
    return true;
  },

  /* v3.117.0 : les expéditions à mini-jeu (Sentier Obstrué, Veine Instable, Éboulis Ferreux,
     Source Tarie) n'ont pas de notion d'acceptation dans leur moteur d'origine (juste un launch
     direct) — on l'ajoute ICI, côté façade uniquement, pour que le Campement (n'affichant que
     les missions acceptées, décision Seb) puisse les traiter comme les autres. */
  _isBoardAccepted: function (questId) {
    return !!(game.explorationProgression && game.explorationProgression.boardAccepted && game.explorationProgression.boardAccepted[questId]);
  },
  acceptBoardQuest: function (questId) {
    if (!game.explorationProgression) return;
    if (!game.explorationProgression.boardAccepted || typeof game.explorationProgression.boardAccepted !== "object") {
      game.explorationProgression.boardAccepted = {};
    }
    game.explorationProgression.boardAccepted[questId] = true;
    if (typeof renderPanel === "function") renderPanel();
    if (typeof saveGame === "function") saveGame();
  },

  /* v3.124.0 (retrait ancien moteur) : _explorationMissions() retirée — les 6 quêtes
     d'EXPLORATION_QUESTS étaient toutes déjà filtrées par cette fonction (migrées vers
     _sceneMissions(), voir Lots S2a/S2b), elle ne produisait plus jamais aucune mission. */

  /* ---------- Les fondations (v3.107.8, décision Seb) : sortie de la chaîne Histoire pour tourner
     en parallèle de « L'éveil des talents » (combat) — une piste production, une piste combat. */
  _workshopMissions: function () {
    if (!window.WorkshopUnlockSystem && typeof game.workshopUnlock === "undefined") return [];
    if (!(game.explorationProgression && (game.explorationProgression.unstableVeinDiscoveryCompleted || game.explorationProgression.quarryUnlocked))) return []; // dispo dès La veine instable terminée (v3.124.0 : lecture directe du flag, sans MiningManager)
    if (game.workshopFoundationsCompleted) return [];
    var self = this;
    var wu = game.workshopUnlock || {};
    var total = (window.WORKSHOP_UNLOCK_STEPS || []).length || 4;
    var done = wu.completed ? total : Math.min(total, Number(wu.currentStep || 0));
    var ready = !!wu.completed;
    // v3.117.0 (décision Seb) : même flux accept/launch que les expéditions à mini-jeu — le
    // Campement ne montre que l'engagé. Une chaîne déjà commencée (currentStep > 0) est
    // considérée acceptée d'office (le joueur a déjà agi, pas besoin de reconfirmer).
    var accepted = ready || done > 0 || self._isBoardAccepted("workshop_foundations");
    var launchFn = function () { if (typeof switchTab === "function") switchTab("village"); };
    var m = {
      id: "workshop_foundations", sourceKind: "workshop", worldId: null,
      title: "Les fondations", blurb: "Bois, planches, pierre. Assemble-les, et Aeswyn aura son premier mur.",
      type: "production", place: "", objectiveLabel: "Construire l'Atelier de Construction (chaîne de 4 objectifs)",
      progressLabel: done + "/" + total,
      rewardSummary: missionRewardSummary(STORY_REWARDS.forest_10), badge: "contract",
      status: ready ? "claimable" : (accepted ? "accepted" : "available"), isMain: false,
      claim: ready ? function () {
        if (!window.StoryQuestManager) return;
        StoryQuestManager._grantReward(STORY_REWARDS.forest_10); // même récompense qu'avant (500 or, 15 essence, +15 XP)
        game.workshopFoundationsCompleted = true;
        addLog("📖 Étape terminée : Les fondations", "event");
        if (typeof showToast === "function") showToast("🔓 Les fondations terminées", 2000);
      } : null
    };
    if (accepted) m.launch = launchFn;
    else m.accept = function () { return self.acceptBoardQuest("workshop_foundations"); };
    return [m];
  },

  /* ---------- Quêtes tutorielles du Village (v3.111.0, Lot B) : chaîne séquentielle
     ciblée Champs (data/village-quests.js) — une seule carte à la fois (quête courante),
     progression stateless lue en direct, réclamable au tableau comme « Les fondations ». */
  _villageMissions: function () {
    if (!window.VillageQuestManager) return [];
    var quest = VillageQuestManager.getCurrentQuest();
    if (!quest) return [];
    if (!VillageQuestManager.isQuestAvailable(quest)) return []; // v3.112.0 : chaîne en pause (prérequis)
    var self = this;
    var ready = VillageQuestManager.isQuestReady(quest);
    // v3.117.0 (décision Seb, cohérence totale) : même flux accept/launch que les autres missions
    // sans vraie étape d'acceptation dans leur système d'origine.
    var accepted = ready || self._isBoardAccepted("village_" + quest.id);
    var m = {
      id: "village_" + quest.id, sourceKind: "village", worldId: null,
      title: quest.title, blurb: (quest.narrative && quest.narrative.objective) || "",
      type: "production", place: "", objectiveLabel: quest.objectiveLabel || "",
      progressLabel: (typeof quest.progress === "function") ? quest.progress() : "",
      rewardSummary: missionRewardSummary(quest.reward || {}), badge: "contract",
      status: ready ? "claimable" : (accepted ? "accepted" : "available"), isMain: false,
      claim: ready ? function () { return VillageQuestManager.claim(quest.id); } : null
    };
    if (accepted) m.launch = function () { if (typeof switchTab === "function") switchTab("village"); };
    else m.accept = function () { return self.acceptBoardQuest("village_" + quest.id); };
    return [m];
  },

  /* ---------- Quêtes de déblocage sur le scene-engine (v3.122.0 Lot S2a, v3.123.0 Lot S2b) --- */
  /* Sentier Obstrué, Bosquet Silencieux, Terre en Friche (S2a) + Veine Instable, Éboulis
     Ferreux, Source Tarie (S2b) — toutes migrées vers SceneRunManager (mécanique paliers/
     push-your-luck, voir scene-run-system.js). Même pattern accept/launch (boardAccepted,
     EXPLORATION_BOARD_BLURBS réutilisés tels quels — mêmes clés questId que les anciennes
     quêtes, avant leur retrait). v3.124.0 (retrait ancien moteur) : boardRequires est
     désormais déclaré directement sur chaque SCENE_TEMPLATES[templateId] (rapatrié depuis
     exploration-quests.js, supprimé) — _isExplorationQuestBoardVisible() lit la même forme
     générique {boardRequires}, sans dépendance à un fichier de données externe. */
  _SCENE_QUEST_TEMPLATE_IDS: ["sentier_obstrue", "bosquet_silencieux", "terre_en_friche", "veine_instable", "eboulis_ferreux", "source_tarie"],
  _SCENE_QUEST_LEGACY_ID: {
    sentier_obstrue: "blockedPath", bosquet_silencieux: "silentGrove", terre_en_friche: "fallowField",
    veine_instable: "unstableVein", eboulis_ferreux: "ironLode", source_tarie: "driedSpring"
  },

  _sceneMissions: function () {
    if (!window.SceneRunManager || !window.SCENE_TEMPLATES) return [];
    var self = this;
    var out = [];
    var activeRun = game.sceneRun;

    this._SCENE_QUEST_TEMPLATE_IDS.forEach(function (templateId) {
      var template = SCENE_TEMPLATES[templateId];
      if (!template) return;
      // v3.124.0 (retrait ancien moteur) : boardRequires lu directement sur le template
      // (rapatrié depuis exploration-quests.js, supprimé) — même méthode générique
      // _isExplorationQuestBoardVisible(), qui ne lit que la forme {boardRequires}.
      if (!self._isExplorationQuestBoardVisible(template)) return;
      if (SceneRunManager.isQuestCompleted(templateId)) return;

      var legacyId = self._SCENE_QUEST_LEGACY_ID[templateId];
      var isRunning = !!(activeRun && activeRun.templateId === templateId && activeRun.status !== "completed");
      var accepted = isRunning || self._isBoardAccepted(templateId);
      var m = {
        id: "scene_" + templateId, sourceKind: "scene", worldId: null,
        title: template.title, blurb: EXPLORATION_BOARD_BLURBS[legacyId] || "",
        type: "expedition", place: "", objectiveLabel: "", progressLabel: isRunning ? "En cours" : "",
        rewardSummary: "", badge: "contract", status: isRunning ? "running" : (accepted ? "accepted" : "available"), isMain: false
      };
      var launchFn = function () {
        if (typeof switchTab === "function") switchTab("scene");
        if (typeof openSceneQuestEntry === "function") openSceneQuestEntry(templateId);
      };
      if (accepted) m.launch = launchFn;
      else m.accept = function () { return self.acceptBoardQuest(templateId); };
      out.push(m);
    });
    return out;
  },

  /* ---------- Agrégation ---------- */
  /* Toutes les missions actives/proposables, Histoire en tête, triées par priorité (isMain, puis claimable > running > available). */
  list: function () {
    var self = this;
    var groups = [this._storyMissions(), this._worldExpeditionMissions(),
      this._adventureMissions(), this._huntMissions(), this._dungeonMissions(), this._sceneMissions(), this._workshopMissions(),
      this._villageMissions()]; // v3.116.0 : _contractMissions (journalières) retirées
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

  /* Les N premières missions (Campement, aperçu). v3.117.0 (décision Seb) : le Campement est
     un résumé de ce qu'on FAIT, pas un catalogue de tout ce qu'on POURRAIT accepter — filtre
     aux missions déjà engagées (running/accepted/claimable). L'Histoire reste toujours visible
     même non acceptée (colonne vertébrale, ne doit jamais disparaître du Campement). Le tableau
     complet (écran Quêtes, onglets de catégorie) continue lui d'afficher aussi les "available". */
  top: function (n) {
    var engagedStatus = { running: 1, accepted: 1, claimable: 1 };
    var visible = this.list().filter(function (m) {
      return m.sourceKind === "story" || engagedStatus[m.status];
    });
    return visible.slice(0, n || 3);
  },

  getById: function (id) {
    return this.list().find(function (m) { return m.id === id; }) || null;
  },

  statusLabel: function (status) { return MISSION_STATUS_LABEL[status] || status; },
  typeIcon: function (type) { return MISSION_TYPE_ICON[type] || "📜"; }
};

window.MissionBoard = MissionBoard;
window.missionRewardSummary = missionRewardSummary;
