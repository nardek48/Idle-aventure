"use strict";
/* systems/mining-system.js — moteur du minijeu de minage (jauge/timing, 3 coups). Utilisé par
   la quête "La Veine Instable" (source: "quest") ET l'activité bonus répétable de la Carrière
   (source: "quarry_bonus"). Indépendant d'ExplorationManager (mécanique trop différente d'un
   test de stat à résultat unique). Ne charge JAMAIS CombatEngine, n'écrit jamais dans
   game.resources directement (uniquement via WarehouseManager).
   v3.110.0 : généralisé à toute quête de minage déclarée dans EXPLORATION_QUESTS (questId en
   paramètre, défaut "unstableVein" pour tous les appelants historiques) — ressources
   principale/bonus par quête (minigame.primaryResourceId/bonusResourceId, défauts
   pierre/fer), déblocage lu depuis les données (unlockBuildingId/unlockFlag/completionFlag).
   Les champs de session totalStone/ironOre gardent leurs noms historiques (= ressource
   principale/bonus) pour ne pas casser une session active en cours de migration.
   1re nouvelle quête : "L'Éboulis Ferreux" (ironLode, Mine). Détail : COMMENTAIRES_ORIGINAUX.md */

var MINING_QUARRY_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes, activité bonus uniquement

var MiningManager = {
  ensureDefaults: function () {
    if (typeof ensureGameStateDefaults === "function") ensureGameStateDefaults();
  },

  getQuest: function (questId) {
    return (typeof EXPLORATION_QUESTS !== "undefined" && EXPLORATION_QUESTS[questId]) || null;
  },

  getActiveSession: function () {
    this.ensureDefaults();
    return (game.gatheringActivity && game.gatheringActivity.quarry && game.gatheringActivity.quarry.activeSession) || null;
  },

  isSessionActive: function () {
    var session = this.getActiveSession();
    return !!(session && session.status === "active");
  },

  isQuestCompleted: function (questId) {
    this.ensureDefaults();
    // v3.92.2 : une sauvegarde migrée (bâtiment déjà débloqué nativement avant l'existence
    // de sa quête) a le flag de bâtiment à true mais pas le completionFlag — dans les deux
    // cas le bâtiment est acquis -> la carte est traitée comme terminée à l'affichage.
    // v3.110.0 : générique par questId (défaut unstableVein pour les appelants historiques).
    var quest = this.getQuest(questId || "unstableVein");
    if (!quest) return false;
    return !!(game.explorationProgression && (
      game.explorationProgression[quest.completionFlag] ||
      (quest.unlockFlag && game.explorationProgression[quest.unlockFlag])
    ));
  },

  isQuarryUnlocked: function () {
    this.ensureDefaults();
    return !!(game.explorationProgression && game.explorationProgression.quarryUnlocked);
  },

  getCooldownEndsAt: function () {
    this.ensureDefaults();
    return Number((game.gatheringActivity && game.gatheringActivity.quarry && game.gatheringActivity.quarry.cooldownEndsAt) || 0);
  },

  isCooldownActive: function () {
    return Date.now() < this.getCooldownEndsAt();
  },

  getCooldownRemainingMs: function () {
    return Math.max(0, this.getCooldownEndsAt() - Date.now());
  },

  /* Prérequis d'accès à une quête de minage (pas l'activité bonus). v3.110.0 : questId
     en paramètre (défaut unstableVein), verrous lus dans les données de la quête. */
  checkQuestRequirements: function (questId) {
    this.ensureDefaults();
    questId = questId || "unstableVein";
    var quest = this.getQuest(questId);
    if (!quest) return { ok: false, reason: "Expédition introuvable" };

    if (this.isQuestCompleted(questId)) {
      return { ok: false, reason: "Expédition déjà terminée" };
    }
    if (quest.unlockFlag && game.explorationProgression && game.explorationProgression[quest.unlockFlag]) {
      return { ok: false, reason: "Ce bâtiment est déjà déverrouillé" };
    }
    if (quest.requirements.heroSelected && !game.heroId) {
      return { ok: false, reason: "Aucun héros sélectionné" };
    }
    // v3.110.0 : verrou générique sur un flag de progression (ironLode exige quarryUnlocked).
    var progressFlag = quest.requirements.requiresProgressFlag;
    if (progressFlag && !(game.explorationProgression && game.explorationProgression[progressFlag])) {
      return { ok: false, reason: quest.requirements.lockedReason || "Condition de progression non remplie" };
    }
    var requiredQuestId = quest.requirements.requiresQuestCompleted;
    if (requiredQuestId && window.ExplorationManager && !ExplorationManager.isQuestCompleted(requiredQuestId)) {
      return { ok: false, reason: "Termine Le Sentier Obstrué pour accéder à la Clairière oubliée" };
    }
    var requiredFlag = quest.requirements.requiresUnlockFlag;
    if (requiredFlag && !(game.explorationProgression && game.explorationProgression[requiredFlag])) {
      return { ok: false, reason: "Termine Le Sentier Obstrué pour accéder à la Clairière oubliée" };
    }
    var minRation = Number(quest.cost.petiteRation || 0);
    var available = (window.WarehouseManager && typeof WarehouseManager.getAmount === "function")
      ? WarehouseManager.getAmount("petite_ration")
      : 0;
    if (available < minRation) {
      return { ok: false, reason: "Au moins " + minRation + " petite ration nécessaire" };
    }
    return { ok: true, reason: null };
  },

  /* Prérequis d'accès à l'activité bonus répétable (Carrière déjà débloquée uniquement). */
  checkQuarryBonusRequirements: function () {
    this.ensureDefaults();
    if (!this.isQuarryUnlocked()) {
      return { ok: false, reason: "La Carrière n'est pas encore déverrouillée" };
    }
    if (this.isSessionActive()) {
      return { ok: false, reason: "Une session de minage est déjà en cours" };
    }
    if (this.isCooldownActive()) {
      return { ok: false, reason: "Récolte encore en recharge" };
    }
    return { ok: true, reason: null };
  },

  /* Snapshot de la SEULE Précision nécessaire au moment du départ — jamais recalculé
     ensuite, jamais une seconde source permanente : lu depuis StatsSystem
     (game.heroPrecisionRaw), pas de duplication de logique de calcul ici. */
  buildHeroSnapshot: function () {
    if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") {
      StatsSystem.recalcStats();
    }
    return {
      heroId: game.heroId,
      precision: Number(game.heroPrecisionRaw || 0)
    };
  },

  _createSession: function (source, questId) {
    return {
      id: "mining_" + Date.now() + "_" + Math.floor(Math.random() * 100000),
      source: source,
      questId: source === "quest" ? (questId || "unstableVein") : null,
      status: "active",

      heroSnapshot: this.buildHeroSnapshot(),

      minigame: {
        currentHit: 0,
        hits: [],
        totalStone: 0,
        totalIronOre: 0,
        resolved: false
      },

      settlement: {
        rewardsGranted: false,
        cooldownApplied: false,
        finalizedAt: null
      }
    };
  },

  /* Démarre une session pour une quête de minage (défaut : "La Veine Instable"). Retire
     le coût en petites rations via WarehouseManager. Retourne { ok, reason, session }. */
  startQuestSession: function (questId) {
    this.ensureDefaults();
    questId = questId || "unstableVein";

    if (this.isSessionActive()) {
      return { ok: false, reason: "Une session de minage est déjà en cours", session: null };
    }

    var req = this.checkQuestRequirements(questId);
    if (!req.ok) return { ok: false, reason: req.reason, session: null };

    var quest = this.getQuest(questId);
    var cost = Number(quest.cost.petiteRation || 0);

    if (!window.WarehouseManager || typeof WarehouseManager.removeResource !== "function") {
      return { ok: false, reason: "Entrepôt indisponible", session: null };
    }
    if (WarehouseManager.getAmount("petite_ration") < cost) {
      return { ok: false, reason: "Pas assez de petites rations", session: null };
    }
    var removed = WarehouseManager.removeResource("petite_ration", cost);
    if (!removed) {
      return { ok: false, reason: "Échec du retrait de la ration", session: null };
    }

    var session = this._createSession("quest", questId);
    game.gatheringActivity.quarry.activeSession = session;
    if (typeof saveGame === "function") saveGame();

    return { ok: true, reason: null, session: session };
  },

  /* Démarre une session pour l'activité bonus répétable (gratuite, soumise au cooldown). */
  startQuarryBonusSession: function () {
    this.ensureDefaults();

    var req = this.checkQuarryBonusRequirements();
    if (!req.ok) return { ok: false, reason: req.reason, session: null };

    var session = this._createSession("quarry_bonus");
    game.gatheringActivity.quarry.activeSession = session;
    if (typeof saveGame === "function") saveGame();

    return { ok: true, reason: null, session: session };
  },

  /* Résout un coup à partir de la position cliquée sur la jauge (0-100). Le tirage du bonus
     Minerai de fer est généré ICI, une seule fois par coup parfait, avant tout retour à
     l'UI — jamais de reroll après rechargement. Idempotent : refuse un 4e coup ou un coup
     sur une session déjà résolue. */
  resolveHit: function (hitPositionPct) {
    var session = this.getActiveSession();
    if (!session) return { ok: false, reason: "Aucune session active" };
    if (session.status !== "active") return { ok: false, reason: "Tous les coups ont déjà été joués" };
    if (session.minigame.resolved) return { ok: false, reason: "Session déjà résolue" };

    var quest = session.questId ? this.getQuest(session.questId) : null;
    var hitCount = quest ? quest.minigame.hitCount : 3;
    var rewardsByResult = quest ? quest.minigame.rewardsByResult : { miss: { stone: 0 }, correct: { stone: 1 }, perfect: { stone: 3 } };
    // v3.110.0 : chance de bonus sur coup parfait — nouveau nom générique perfectBonusChancePct,
    // repli sur l'historique perfectIronOreChancePct (unstableVein) puis 20.
    var perfectIronOreChancePct = quest
      ? Number(quest.minigame.perfectBonusChancePct !== undefined ? quest.minigame.perfectBonusChancePct : quest.minigame.perfectIronOreChancePct)
      : 20;

    if (session.minigame.currentHit >= hitCount) {
      return { ok: false, reason: "Tous les coups ont déjà été joués" }; // idempotence anti double-clic
    }

    var checkOutcome = MiningCheckSystem.resolveHit({
      precision: session.heroSnapshot.precision,
      hitPositionPct: hitPositionPct
    });

    // v3.110.0 : montant générique "amount", repli sur "stone" (données historiques d'unstableVein).
    var rewardEntry = rewardsByResult[checkOutcome.result] || {};
    var stoneGain = Number(rewardEntry.amount !== undefined ? rewardEntry.amount : (rewardEntry.stone || 0));
    var ironOreGain = 0;
    var ironOreRandomValue = null;

    if (checkOutcome.result === "perfect") {
      ironOreRandomValue = Math.random();
      if (ironOreRandomValue * 100 < perfectIronOreChancePct) {
        ironOreGain = 1;
      }
    }

    var hitRecord = {
      result: checkOutcome.result,
      hitPositionPct: hitPositionPct,
      stoneGain: stoneGain,
      ironOreGain: ironOreGain,
      ironOreRandomValue: ironOreRandomValue
    };

    session.minigame.hits.push(hitRecord);
    session.minigame.currentHit += 1;
    session.minigame.totalStone += stoneGain;
    session.minigame.totalIronOre += ironOreGain;

    var isLastHit = session.minigame.currentHit >= hitCount;
    if (isLastHit) {
      session.minigame.resolved = true;
      session.status = "completed";
    }

    if (typeof saveGame === "function") saveGame();

    return { ok: true, reason: null, session: session, hit: hitRecord, isLastHit: isLastHit };
  },

  /* Finalise la session : crédite Pierre/Minerai (WarehouseManager uniquement), débloque
     la Carrière si session de quête réussie (au moins 1 coup non-manqué), applique le
     cooldown si activité bonus. Strictement idempotent (rewardsGranted/cooldownApplied). */
  settle: function () {
    var session = this.getActiveSession();
    if (!session) return { ok: false, reason: "Aucune session active" };
    if (!session.minigame.resolved) return { ok: false, reason: "La session n'est pas terminée" };

    this.ensureDefaults();

    var atLeastOneHit = session.minigame.hits.some(function (h) { return h.result !== "miss"; });

    if (!session.settlement.rewardsGranted) {
      // v3.110.0 : ressources principale/bonus lues dans la quête (défauts pierre/fer =
      // comportement historique d'unstableVein et de l'activité bonus Carrière).
      var settleQuest = session.questId ? this.getQuest(session.questId) : null;
      var primaryResourceId = (settleQuest && settleQuest.minigame.primaryResourceId) || "pierre";
      var bonusResourceId = (settleQuest && settleQuest.minigame.bonusResourceId) || "fer";
      if (session.minigame.totalStone > 0 && window.WarehouseManager && typeof WarehouseManager.addResource === "function") {
        WarehouseManager.addResource(primaryResourceId, session.minigame.totalStone);
      }
      if (session.minigame.totalIronOre > 0 && window.WarehouseManager && typeof WarehouseManager.addResource === "function") {
        WarehouseManager.addResource(bonusResourceId, session.minigame.totalIronOre);
      }

      // v3.110.0 : déblocage lu dans les données (unstableVein -> Carrière inchangé,
      // ironLode -> Mine), plus de câblage en dur.
      if (session.source === "quest" && atLeastOneHit && settleQuest) {
        if (settleQuest.completionFlag) game.explorationProgression[settleQuest.completionFlag] = true;
        if (settleQuest.unlockFlag) game.explorationProgression[settleQuest.unlockFlag] = true;
        if (settleQuest.unlockBuildingId && window.ProductionManager && typeof ProductionManager.unlockBuilding === "function") {
          ProductionManager.unlockBuilding(settleQuest.unlockBuildingId);
        }
      }

      session.settlement.rewardsGranted = true;
    }

    if (session.source === "quarry_bonus" && !session.settlement.cooldownApplied) {
      game.gatheringActivity.quarry.cooldownEndsAt = Date.now() + MINING_QUARRY_COOLDOWN_MS;
      session.settlement.cooldownApplied = true;
    } else if (!session.settlement.cooldownApplied) {
      session.settlement.cooldownApplied = true; // n/a pour une session de quête, marqué quand même pour cohérence
    }

    session.settlement.finalizedAt = Date.now();

    if (typeof saveGame === "function") saveGame();

    return { ok: true, reason: null, session: session, questSucceeded: session.source === "quest" && atLeastOneHit };
  },

  /* Nettoie la session terminée (après affichage du bilan). */
  clearSession: function () {
    this.ensureDefaults();
    game.gatheringActivity.quarry.activeSession = null;
    if (typeof saveGame === "function") saveGame();
  }
};

window.MINING_QUARRY_COOLDOWN_MS = MINING_QUARRY_COOLDOWN_MS;
window.MiningManager = MiningManager;
