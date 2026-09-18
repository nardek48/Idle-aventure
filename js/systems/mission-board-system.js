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

var MISSION_TYPE_ICON = { combat: "images/Icons/quests/mission_combat.png", expedition: "images/Icons/quests/mission_exploration.png", chasse: "images/Icons/quests/mission_hunt.png", donjon: "images/Icons/quests/mission_dungeon.png", production: "images/Icons/quests/mission_construction.png" }; // v3.108.0 : production (Les fondations)
var MISSION_STATUS_LABEL = {
  locked: "Verrouillée", available: "Disponible", accepted: "Acceptée",
  running: "En cours", ready: "Objectif atteint", claimable: "Prête à réclamer"
};

/* v3.131.0 (retour Seb) : cap de 3 quêtes actives simultanées, toutes sources non-Histoire
   confondues (village/workshop/scene/adventure/hunt) — Donjon et Petite Aventure exclus
   (activités courtes à lancement direct, pas des quêtes qu'on "garde en attente"), worldExpedition
   exclue aussi (jamais d'étape d'acceptation, toujours active dès son apparition, comme l'Histoire). */
var ACTIVE_QUEST_CAP = 3;
var ACTIVE_QUEST_CAP_SOURCE_KINDS = ["village", "workshop", "scene", "adventure", "hunt"];

/* v3.107.1 : une quête secondaire (aventure/chasse) référencée par l'étape Histoire COURANTE et
   ACCEPTÉE (linkTo.section "adventure", cardId "adv_"+questId) est mise en évidence sur le tableau
   de missions — décision Seb : c'est la donnée (linkTo) qui pilote, pas une liste codée en dur. */
/* v3.205.0 (E5) : une quête élite n'apparaît qu'une fois l'étape d'Histoire
   requise ATTEINTE — « Le grimoire du veilleur » par défaut, c'est-à-dire le
   moment où le joueur possède le Grimoire, sans lequel l'archétype de l'élite
   n'a aucun contre. Comparaison par ID d'étape et jamais par index : la chaîne
   a déjà changé de longueur par le passé (même patron que _syncCoeurEnemyPool). */
function isEliteQuestUnlocked(quest) {
  if (!quest || quest.type !== "elite") return true;
  // v3.297.0 (W-1a) : l'étape requise peut être de n'importe quel chapitre
  if (!quest.requiresStoryStep || !window.StoryQuestManager) return true;
  return StoryQuestManager.isStepReached(quest.requiresStoryStep);
}

/* v3.297.0 (W-1a) : l'étape liée peut être celle de n'importe quel chapitre actif. */
function isStoryLinkedQuest(questId) {
  if (!window.StoryQuestManager || typeof StoryQuestManager.activeChapterIds !== "function") return false;
  return StoryQuestManager.activeChapterIds().some(function (chapterId) {
    var step = StoryQuestManager.getCurrentStep(chapterId);
    if (!step || !StoryQuestManager.isCurrentStepAccepted(chapterId)) return false;
    var link = step.linkTo;
    return !!(link && link.section === "adventure" && link.cardId === "adv_" + questId);
  });
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
  if (reward.seve) parts.push(reward.seve + " Sève d'Aeswyn"); // v3.205.0 (E5)
  // v3.289.0 : la quête qui ouvre un bâtiment de production annonce la dotation de l'intendant
  if (reward.unlockBuildingId && window.ProductionManager) parts.push(ProductionManager.getUnlockGiftSummary());
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

  /* ---------- Quêtes d'aventure (kill/transition scopées à une aventure) ---------- */
  _adventureMissions: function () {
    if (!window.AdventureQuestManager) return [];
    var self = this;
    var quests = AdventureQuestManager.getAllQuests();
    var running = AdventureQuestManager.getRunningQuest();
    var out = [];
    quests.forEach(function (quest) {
      if (game.adventureQuestsCompleted[quest.id]) return;
      var isRunning = !!(running && running.id === quest.id);
      // v3.107.4 : décision Seb — tutoriel, pas de surcharge. Une quête secondaire NON LIÉE à
      // l'étape Histoire courante est masquée tant qu'elle n'est pas encore lancée (available) ;
      // une fois en cours (running), elle reste toujours visible (le joueur doit pouvoir la finir).
      // v3.205.0 (E5) : une quête élite suit son propre gating (isEliteQuestUnlocked),
      // elle n'est donc pas masquée par la règle « non liée à l'étape Histoire courante ».
      if (quest.type === "elite") {
        if (!isRunning && !isEliteQuestUnlocked(quest)) return;
      } else if (!isRunning && quest.category !== "main" && !isStoryLinkedQuest(quest.id)) return;
      var stepsDone = quest.steps.filter(function (s) { return AdventureQuestManager.isStepComplete(quest, s); }).length;
      var status = isRunning ? "running" : (running ? "locked" : "available");
      var m = {
        id: "adv_" + quest.id, sourceKind: "adventure", questId: quest.id, worldId: quest.worldId, // v3.247.0 : questId pour le pronostic
        title: quest.name, blurb: quest.story || "",
        type: "combat", place: missionWorldName(quest.worldId) || "",
        objectiveLabel: stepsDone + "/" + quest.steps.length + " objectifs", progressLabel: "",
        rewardSummary: missionRewardSummary(quest.reward), badge: quest.type === "elite" ? "elite" : "contract",
        status: status, isMain: quest.category === "main" || isStoryLinkedQuest(quest.id),
        isElite: quest.type === "elite" // v3.205.0 (E5)
      };
      if (status === "available") {
        m.accept = function () {
          // v3.205.0 (E5) : les élites sont HORS du cap de 3 quêtes actives, comme
          // le Donjon et la Petite Aventure — activité courte à lancement direct.
          if (quest.type !== "elite" && self.isActiveQuestCapReached()) {
            self.showActiveQuestCapToast();
            return;
          }
          if (typeof openAdventureQuestIntro === "function") openAdventureQuestIntro(quest.id);
        };
      }
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
    var self = this;
    var quests = HuntQuestManager.getAllQuests();
    var running = HuntQuestManager.getRunningQuest();
    var out = [];
    quests.forEach(function (quest) {
      if (quest.id === "hq_forest_boar" && !(game.explorationProgression && game.explorationProgression.huntBuildingUnlocked)) return;
      /* v3.236.0 : « Ce que les bêtes ont bu » se déroule au Cœur de la forêt.
         Elle s'ouvre donc quand le Cœur s'ouvre, c'est-à-dire à la fin de
         « Prouver sa valeur » (aq_forest_expedition, gatesTransitionTo: 1) —
         le même événement qui autorise le joueur à y aller. */
      if (quest.id === "hq_forest_seve" && !(game.adventureQuestsCompleted && game.adventureQuestsCompleted.aq_forest_expedition)) return;
      var isRunning = !!(running && running.id === quest.id);
      /* v3.264.0 (décision Seb) : la Battue s'ouvre avec le Village (« La meute affamée ») —
         c'est Aldric qui paie, et le Roi des marais ne bloque plus personne (sim/roi-marais-bench.js).
         Une battue déjà lancée reste visible pour pouvoir la suivre. */
      if (quest.id === "hq_forest_battue" && !isRunning && !(game.unlockedTabs && game.unlockedTabs.village)) return;
      var status = isRunning ? "running" : (running ? "locked" : "available");
      var inLot = isRunning ? Number((game.huntRun && game.huntRun.killsInLot) || 0) : 0;
      var m = {
        id: "hunt_" + quest.id, sourceKind: "hunt", questId: quest.id, worldId: quest.worldId, // v3.247.0 : questId pour le pronostic
        title: quest.name, blurb: quest.story || "",
        type: "chasse", place: missionWorldName(quest.worldId) || "",
        objectiveLabel: "Lot de " + quest.lotSize, progressLabel: isRunning ? (inLot + "/" + quest.lotSize) : "",
        // v3.207.0 : une battue affiche sa prime, pas un taux de drop.
        // v3.236.0 : et un taux de drop nomme sa RESSOURCE — « 3 % par kill »
        // ne disait pas de quoi, maintenant qu'il y a deux chasses à ressource.
        rewardSummary: quest.rewardGold
          ? (formatNumber(quest.rewardGold) + " or par lot")
          : (quest.resourcePool && quest.resourcePool.length > 1
            // v3.260.0 : chasse à ressources multiples — le taux global et la famille, pas six noms
            ? (quest.dropChancePct + " % de ressource de base par kill")
            : (quest.dropChancePct + " % de "
               + (((window.WAREHOUSE_RESOURCES || {})[quest.resourceKey] || {}).name || "butin")
               + " par kill")),
        badge: "contract", status: status, isMain: false
      };
      if (status === "available") {
        m.accept = function () {
          if (self.isActiveQuestCapReached()) {
            self.showActiveQuestCapToast();
            return;
          }
          if (typeof openHuntQuestIntro === "function") openHuntQuestIntro(quest.id);
        };
      }
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
    /* v3.245.0 (refonte Donjons) : un donjon par monde, plus de paliers. Depuis le tableau, « Partir »
       lance le run NU (sans Marque) ; les Marques se choisissent sur l'écran Donjon (feuille de lancement). */
    (DUNGEONS || []).forEach(function (dungeon) {
      if (dungeon.locked) return;
      if (!DungeonManager.isUnlocked(dungeon.id)) return; // verrouillé : pas encore une mission proposable
      var cleared = !!(game.dungeonTierCleared && game.dungeonTierCleared[dungeon.id]);
      if (cleared) return; // -> considéré terminé, hors tableau (repasse par l'écran Donjon pour le refaire)
      var runningHere = isRunning && game.dungeonRun.dungeonId === dungeon.id;
      var status = runningHere ? "running" : (isRunning ? "locked" : "available");
      var m = {
        id: "dungeon_" + dungeon.id, sourceKind: "dungeon", worldId: dungeon.worldId || null,
        title: dungeon.name, blurb: dungeon.story || "",
        type: "donjon", place: dungeon.name,
        objectiveLabel: "Vague " + (runningHere ? (game.dungeonRun.wave || 1) : 1) + "/" + DUNGEON_CONFIG.waveCount, progressLabel: "",
        rewardSummary: (game.dungeonTickets > 0 ? game.dungeonTickets + " ticket(s)" : "Aucun ticket"),
        badge: "contract", status: status, isMain: false
      };
      if (status === "available" && game.dungeonTickets > 0) m.accept = function () { return DungeonManager.start(dungeon.id, []); };
      if (status === "running") {
        m.launch = function () { if (typeof switchTab === "function") switchTab("combat"); };
        m.abandon = function () { return DungeonManager.forfeit(); };
      }
      out.push(m);
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
    if (this.isActiveQuestCapReached()) {
      this.showActiveQuestCapToast();
      return;
    }
    if (!game.explorationProgression.boardAccepted || typeof game.explorationProgression.boardAccepted !== "object") {
      game.explorationProgression.boardAccepted = {};
    }
    game.explorationProgression.boardAccepted[questId] = true;
    if (typeof renderPanel === "function") renderPanel();
    if (typeof saveGame === "function") saveGame();
  },
  /* v3.131.0 : abandon générique pour les quêtes acceptées via boardAccepted (scene/village/
     workshop) — remet le flag à false, la quête redevient "available" et réapparaît au tableau
     pour être reprise plus tard. Ne touche à aucun état de run en cours (une quête "scene"
     acceptée mais pas encore lancée n'a pas de run actif ; si un run scene est en cours pour ce
     templateId, l'abandon de run se fait depuis l'écran d'expédition lui-même, pas ici). */
  abandonBoardQuest: function (questId) {
    if (!game.explorationProgression || !game.explorationProgression.boardAccepted) return;
    delete game.explorationProgression.boardAccepted[questId];
    if (typeof addLog === "function") addLog("🗂️ Quête abandonnée — elle reste disponible pour plus tard.", "event");
    if (typeof renderPanel === "function") renderPanel();
    if (typeof saveGame === "function") saveGame();
  },

  /* v3.131.0 : compte les quêtes actives (accepted/running/claimable — une quête prête à
     réclamer occupe toujours son slot tant qu'elle n'est pas réclamée) dans le périmètre du
     cap. Recalculé en direct à chaque appel (pas de compteur stocké, cohérent avec le reste
     du MissionBoard — aucune mutation ici). */
  getActiveQuestCount: function () {
    var activeStatus = { accepted: 1, running: 1, claimable: 1 };
    return this.list().filter(function (m) {
      return ACTIVE_QUEST_CAP_SOURCE_KINDS.indexOf(m.sourceKind) !== -1
        && m.id !== "petite_aventure_foret"
        && !m.isElite // v3.205.0 (E5)
        && activeStatus[m.status];
    }).length;
  },
  isActiveQuestCapReached: function () {
    return this.getActiveQuestCount() >= ACTIVE_QUEST_CAP;
  },

  /* v3.138.0 (retour Seb) : le refus muet ("⛔ 3 quêtes actives max — abandonnes-en une...") ne
     disait pas LESQUELLES sont actives — sur l'écran Quêtes le compteur (buildActiveQuestCapIndicatorHTML)
     est visible, mais pas depuis une carte "Chasse en Forêt" verrouillée par exemple. Réutilise le
     même filtre que getActiveQuestCount() (même périmètre, même exclusion Petite Aventure) pour
     lister les titres sans risque de divergence entre le compte et le détail. */
  getActiveQuestTitles: function () {
    var activeStatus = { accepted: 1, running: 1, claimable: 1 };
    return this.list().filter(function (m) {
      return ACTIVE_QUEST_CAP_SOURCE_KINDS.indexOf(m.sourceKind) !== -1
        && m.id !== "petite_aventure_foret"
        && !m.isElite // v3.205.0 (E5)
        && activeStatus[m.status];
    }).map(function (m) { return m.title; });
  },

  /* v3.138.0 : toast unique pour les 3 sites de refus (adventure/hunt inline, acceptBoardQuest) —
     message générique + jusqu'à 3 titres réels ("Chasse en Forêt, La Meute Affamée, Les fondations")
     plutôt qu'un renvoi vers l'écran Quêtes que le joueur devrait aller consulter lui-même. */
  showActiveQuestCapToast: function () {
    if (typeof showToast !== "function") return;
    var titles = this.getActiveQuestTitles();
    var detail = titles.length ? " (" + titles.join(", ") + ")" : "";
    showToast("⛔ 3 quêtes actives max" + detail + " — abandonnes-en une avant d'en accepter une nouvelle", 3200);
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
    // v3.131.0 (retour Seb : "pas très claire") : détail des 4 étapes pour la carte de quête
    // (voir buildQuestBoardCardHTML, qb-card-steps) — chaque étape avec son statut fait/en
    // cours/à venir et sa progression chiffrée pour l'étape en cours uniquement.
    var currentStep = Number(wu.currentStep || 0);
    var stepsDetail = (window.WORKSHOP_UNLOCK_STEPS || []).map(function (step, idx) {
      var isDone = ready || idx < currentStep;
      var isCurrent = !ready && idx === currentStep;
      return {
        label: step.label,
        done: isDone,
        current: isCurrent,
        progress: isCurrent ? step.progress(game) : ""
      };
    });
    var currentStepData = (window.WORKSHOP_UNLOCK_STEPS || [])[currentStep];
    // v3.131.3 (retour Seb : "juste ce qu'on doit faire, pas des 0/1") : progressLabel devient le
    // libellé concret de l'étape en cours (ex. "Récolter 15 Pierre (2/15)") au lieu du compteur
    // brut d'étapes "2/4" — plus lisible sur le résumé compact du Campement, qui n'a pas la place
    // pour le détail complet des 4 étapes (réservé à la carte de l'écran Quêtes, stepsDetail).
    var stepProgressLabel = ready ? "Prête à réclamer"
      : (currentStepData ? currentStepData.label + " (" + currentStepData.progress(game) + ")" : (done + "/" + total));
    var m = {
      id: "workshop_foundations", sourceKind: "workshop", worldId: null,
      title: "Les fondations", blurb: "Bois, planches, pierre. Assemble-les, et Aeswyn aura son premier mur.",
      type: "production", place: "", objectiveLabel: "Construire l'Atelier de Construction (chaîne de 4 objectifs)",
      progressLabel: stepProgressLabel,
      stepsDetail: stepsDetail,
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
    // v3.131.0 : abandon possible uniquement si accepté via le tableau ET aucune progression
    // réelle encore entamée (done === 0) — au-delà, la ressource/le bâtiment sont déjà acquis,
    // "abandonner" n'aurait aucun effet visible et serait trompeur.
    if (self._isBoardAccepted("workshop_foundations") && done === 0 && !ready) {
      m.abandon = function () { return self.abandonBoardQuest("workshop_foundations"); };
    }
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
    // v3.131.0 : abandon possible uniquement si accepté via le tableau ET aucune progression
    // réelle encore entamée (numérateur de progress() à 0) — même garde-fou que Les fondations,
    // pour ne jamais proposer un abandon qui n'annulerait rien de visible (ex. un plot déjà
    // ouvert avant même l'acceptation resterait acquis).
    var progressLabelRaw = (typeof quest.progress === "function") ? quest.progress() : "";
    var progressNumerator = parseInt(progressLabelRaw, 10) || 0;
    if (self._isBoardAccepted("village_" + quest.id) && progressNumerator === 0 && !ready) {
      m.abandon = function () { return self.abandonBoardQuest("village_" + quest.id); };
    }
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
        id: "scene_" + templateId, sourceKind: "scene", worldId: template.worldId || null, // v3.301.0 : monde du canevas
        title: template.title, blurb: EXPLORATION_BOARD_BLURBS[legacyId] || "",
        type: "expedition", place: "", objectiveLabel: "", progressLabel: isRunning ? "En cours" : "",
        rewardSummary: "", badge: "contract", status: isRunning ? "running" : (accepted ? "accepted" : "available"), isMain: false
      };
      // v3.289.0 : dotation de l'intendant affichée sur les quêtes qui ouvrent un bâtiment
      var unlockSpec = template.unlockOnSuccess;
      if (unlockSpec && unlockSpec.buildingId && window.ProductionManager) m.rewardSummary = ProductionManager.getUnlockGiftSummary();
      var launchFn = function () {
        if (typeof switchTab === "function") switchTab("scene");
        if (typeof openSceneQuestEntry === "function") openSceneQuestEntry(templateId);
      };
      if (accepted) m.launch = launchFn;
      else m.accept = function () { return self.acceptBoardQuest(templateId); };
      // v3.131.0 : abandon possible uniquement accepté-sans-run (pas de progression à perdre) —
      // un run déjà lancé se gère depuis l'écran d'expédition (abandon = perte de butin partiel).
      if (accepted && !isRunning) {
        m.abandon = function () { return self.abandonBoardQuest(templateId); };
      }
      out.push(m);
    });
    return out;
  },

  /* ---------- Petite Aventure (v3.125.0, Petites Aventures Lot PA1) ---------- */
  /* Distincte de _sceneMissions() : canevas répétable (mode generative + profileWeights),
     pas de unlockOnSuccess/isQuestCompleted — le seul gate est le cap journalier
     (SceneRunManager.canStartPetiteAventureToday). Pas de flux accept/launch classique non
     plus : lancement direct comme startSceneExpedition(), le tableau affiche juste le
     compteur restant du jour. */
  _petiteAventureMissions: function () {
    if (!window.SceneRunManager || !window.SCENE_TEMPLATES || !SCENE_TEMPLATES.petite_aventure_foret) return [];
    if (!(game.unlockedTabs && game.unlockedTabs.village)) return []; // même boardRequires que le template
    var template = SCENE_TEMPLATES.petite_aventure_foret;
    var activeRun = game.sceneRun;
    var isRunning = !!(activeRun && activeRun.templateId === "petite_aventure_foret" && activeRun.status !== "completed");
    var cap = SceneRunManager.getPetiteAventureCap(); // v3.298.0 : cap par monde
    var remaining = cap - SceneRunManager.petiteAventureCountToday();
    var canStart = SceneRunManager.canStartPetiteAventureToday();

    // v3.256.0 (Cartes Vivantes, C-2, décision 7) : la Petite Aventure se joue depuis la carte de la
    // Forêt — cette carte de mission l'ouvre au lieu de lancer un run. Une seule porte, pas une de plus.
    var hasMap = !!(window.LivingMapManager && LivingMapManager.getMapForWorld("forest") && typeof openLivingMap === "function");
    var blurb = hasMap ? "Choisis un secteur sur la carte de la Forêt : chaque expédition repousse la brume."
      : "Un parcours court, choisis ton style : rapide et risqué, ou lent et sûr.";
    if (!isRunning && !canStart) blurb += " Plus de tentative aujourd'hui, reviens demain.";
    var m = {
      id: "petite_aventure_foret", sourceKind: "scene", worldId: template.worldId || null, // v3.301.0 : Petite Aventure de la Forêt
      title: template.title, blurb: blurb,
      type: "expedition", place: "", objectiveLabel: "",
      // v3.125.0 : progressLabel n'est affiché par la vue que pour running/accepted — le
      // compteur "X/3 aujourd'hui" est donc porté par blurb quand indisponible (voir ci-dessus),
      // et ici seulement pour le cas running (cohérent avec le pattern des autres missions).
      progressLabel: isRunning ? "En cours" : "",
      rewardSummary: (canStart && !isRunning) ? (remaining + "/" + cap + " aujourd'hui") : "",
      badge: "contract",
      status: isRunning ? "running" : (canStart ? "available" : "unavailable"),
      isMain: false
    };
    var launchFn = function () {
      if (hasMap && !isRunning) { openLivingMap("forest"); return; } // v3.256.0 (C-2) : vers la carte
      if (typeof switchTab === "function") switchTab("scene");
      if (typeof openSceneQuestEntry === "function") openSceneQuestEntry("petite_aventure_foret");
    };
    if (isRunning) m.launch = launchFn;
    else if (canStart) m.accept = launchFn; // pas d'étape "accepter" séparée : accepter = lancer directement
    return [m];
  },

  /* ---------- Agrégation ---------- */
  /* Toutes les missions actives/proposables, Histoire en tête, triées par priorité (isMain, puis claimable > running > available). */
  /* v3.301.0 (W-2b) — LE TABLEAU MONTRE LE MONDE OÙ TU ES. Une quête d'un autre monde est
     masquée tant qu'elle n'est que proposée. Toujours visibles : l'Histoire, le village (Aeswyn
     est partagé), ce qui n'a pas de monde, et tout ce qui est engagé — acceptée, en cours ou
     prête à réclamer. hiddenByWorld() compte ce qui est masqué, pour le dire au joueur.
     list({ allWorlds: true }) rend tout (recherche par id, compteurs). */
  _WORLD_FREE_KINDS: { story: 1, village: 1, workshop: 1 },
  _ENGAGED_STATUS: { accepted: 1, running: 1, claimable: 1, ready: 1 },

  _currentWorldId: function () {
    var w = (window.WORLDS && window.WorldManager) ? WORLDS[Number(WorldManager.worldIndex || 0)] : null;
    return w ? w.id : null;
  },

  _isOtherWorld: function (m, here) {
    if (!m.worldId || !here || this._WORLD_FREE_KINDS[m.sourceKind] || this._ENGAGED_STATUS[m.status]) return false;
    return m.worldId !== here;
  },

  hiddenByWorld: function () {
    var here = this._currentWorldId(), self = this, out = {};
    this.list({ allWorlds: true }).forEach(function (m) {
      if (self._isOtherWorld(m, here)) out[m.worldId] = (out[m.worldId] || 0) + 1;
    });
    return out;
  },

  list: function (opts) {
    var self = this;
    var groups = [this._storyMissions(), // v3.299.0 (W-1c) : questlines de monde retirées
      this._adventureMissions(), this._huntMissions(), this._dungeonMissions(), this._sceneMissions(), this._workshopMissions(),
      this._villageMissions(), this._petiteAventureMissions()]; // v3.116.0 : _contractMissions (journalières) retirées
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
    if (opts && opts.allWorlds) return all;
    var here = this._currentWorldId();
    return all.filter(function (m) { return !self._isOtherWorld(m, here); });
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
    return this.list({ allWorlds: true }).find(function (m) { return m.id === id; }) || null;
  },

  statusLabel: function (status) { return MISSION_STATUS_LABEL[status] || status; },
  typeIcon: function (type) { return MISSION_TYPE_ICON[type] || "images/Icons/quests/quest_story.png"; }
};

window.MissionBoard = MissionBoard;
window.missionRewardSummary = missionRewardSummary;
