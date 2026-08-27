"use strict";
/* systems/well-system.js — moteur du minijeu "maintenir puis relâcher" (jauge de remplissage).
   Miroir de mining-system.js mais indépendant (mécaniques différentes : timing de relâchement
   plutôt que position figée sur une jauge animée en continu). Utilisé par la quête
   "La Source Tarie" (source: "quest") ET l'activité bonus répétable du Puits
   (source: "well_bonus"). Ne charge JAMAIS CombatEngine, n'écrit jamais dans game.resources
   directement (uniquement via WarehouseManager). Détail : COMMENTAIRES_ORIGINAUX.md */

var WELL_BONUS_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes, activité bonus uniquement

var WellManager = {
  ensureDefaults: function () {
    if (typeof ensureGameStateDefaults === "function") ensureGameStateDefaults();
  },

  getQuest: function (questId) {
    return (typeof EXPLORATION_QUESTS !== "undefined" && EXPLORATION_QUESTS[questId]) || null;
  },

  getActiveSession: function () {
    this.ensureDefaults();
    return (game.gatheringActivity && game.gatheringActivity.well && game.gatheringActivity.well.activeSession) || null;
  },

  isSessionActive: function () {
    var session = this.getActiveSession();
    return !!(session && session.status === "active");
  },

  isQuestCompleted: function () {
    this.ensureDefaults();
    // Même raisonnement que MiningManager.isQuestCompleted() : une sauvegarde migrée
    // (Puits déjà débloqué nativement avant l'existence de cette quête) a wellUnlocked=true
    // mais driedSpringDiscoveryCompleted=false (jamais vraiment jouée) — dans les deux cas
    // le Puits est acquis, la carte doit être traitée comme terminée à l'affichage.
    return !!(game.explorationProgression && (
      game.explorationProgression.driedSpringDiscoveryCompleted ||
      game.explorationProgression.wellUnlocked
    ));
  },

  isWellUnlocked: function () {
    this.ensureDefaults();
    return !!(game.explorationProgression && game.explorationProgression.wellUnlocked);
  },

  getCooldownEndsAt: function () {
    this.ensureDefaults();
    return Number((game.gatheringActivity && game.gatheringActivity.well && game.gatheringActivity.well.cooldownEndsAt) || 0);
  },

  isCooldownActive: function () {
    return Date.now() < this.getCooldownEndsAt();
  },

  getCooldownRemainingMs: function () {
    return Math.max(0, this.getCooldownEndsAt() - Date.now());
  },

  /* Prérequis d'accès à la quête "La Source Tarie" (pas l'activité bonus). Aucun coût de
     ration (le Puits produit l'Eau, intrant de la petite ration elle-même — en demander
     une ici créerait un nouveau verrou circulaire, décision explicite). */
  checkQuestRequirements: function () {
    this.ensureDefaults();
    var quest = this.getQuest("driedSpring");
    if (!quest) return { ok: false, reason: "Expédition introuvable" };

    if (this.isQuestCompleted()) {
      return { ok: false, reason: "Expédition déjà terminée" };
    }
    if (this.isWellUnlocked()) {
      return { ok: false, reason: "Le Puits est déjà déverrouillé" };
    }
    if (quest.requirements.heroSelected && !game.heroId) {
      return { ok: false, reason: "Aucun héros sélectionné" };
    }
    return { ok: true, reason: null };
  },

  /* Prérequis d'accès à l'activité bonus répétable (Puits déjà débloqué uniquement). */
  checkWellBonusRequirements: function () {
    this.ensureDefaults();
    if (!this.isWellUnlocked()) {
      return { ok: false, reason: "Le Puits n'est pas encore déverrouillé" };
    }
    if (this.isSessionActive()) {
      return { ok: false, reason: "Une session de puisage est déjà en cours" };
    }
    if (this.isCooldownActive()) {
      return { ok: false, reason: "Puisage encore en recharge" };
    }
    return { ok: true, reason: null };
  },

  /* Snapshot de la SEULE Endurance nécessaire au moment du départ — jamais recalculé
     ensuite, jamais une seconde source permanente : lu depuis StatsSystem
     (game.heroEnduranceRaw), pas de duplication de logique de calcul ici. */
  buildHeroSnapshot: function () {
    if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") {
      StatsSystem.recalcStats();
    }
    return {
      heroId: game.heroId,
      endurance: Number(game.heroEnduranceRaw || 0)
    };
  },

  _createSession: function (source) {
    return {
      id: "well_" + Date.now() + "_" + Math.floor(Math.random() * 100000),
      source: source,
      questId: source === "quest" ? "driedSpring" : null,
      status: "active",

      heroSnapshot: this.buildHeroSnapshot(),

      minigame: {
        currentAttempt: 0,
        attempts: [],
        totalWater: 0,
        resolved: false
      },

      settlement: {
        rewardsGranted: false,
        cooldownApplied: false,
        finalizedAt: null
      }
    };
  },

  /* Démarre une session pour la quête "La Source Tarie". Aucun coût (voir
     checkQuestRequirements). Retourne { ok, reason, session }. */
  startQuestSession: function () {
    this.ensureDefaults();

    if (this.isSessionActive()) {
      return { ok: false, reason: "Une session de puisage est déjà en cours", session: null };
    }

    var req = this.checkQuestRequirements();
    if (!req.ok) return { ok: false, reason: req.reason, session: null };

    var session = this._createSession("quest");
    game.gatheringActivity.well.activeSession = session;
    if (typeof saveGame === "function") saveGame();

    return { ok: true, reason: null, session: session };
  },

  /* Démarre une session pour l'activité bonus répétable (gratuite, soumise au cooldown). */
  startWellBonusSession: function () {
    this.ensureDefaults();

    var req = this.checkWellBonusRequirements();
    if (!req.ok) return { ok: false, reason: req.reason, session: null };

    var session = this._createSession("well_bonus");
    game.gatheringActivity.well.activeSession = session;
    if (typeof saveGame === "function") saveGame();

    return { ok: true, reason: null, session: session };
  },

  /* Résout une tentative à partir du niveau de remplissage au moment du relâchement
     (0-100). Idempotent : refuse une tentative hors session active ou déjà résolue. */
  resolveRelease: function (fillPct) {
    var session = this.getActiveSession();
    if (!session) return { ok: false, reason: "Aucune session active" };
    if (session.status !== "active") return { ok: false, reason: "Toutes les tentatives ont déjà été jouées" };
    if (session.minigame.resolved) return { ok: false, reason: "Session déjà résolue" };

    var quest = session.questId ? this.getQuest(session.questId) : null;
    var attemptCount = quest ? quest.minigame.attemptCount : 3;
    var rewardsByResult = quest ? quest.minigame.rewardsByResult : {
      tooEarly: { water: 0 }, correct: { water: 1 }, perfect: { water: 3 }, tooLate: { water: 0 }
    };

    if (session.minigame.currentAttempt >= attemptCount) {
      return { ok: false, reason: "Toutes les tentatives ont déjà été jouées" }; // idempotence anti double-clic
    }

    var checkOutcome = WellCheckSystem.resolveRelease({
      endurance: session.heroSnapshot.endurance,
      fillPct: fillPct
    });

    var waterGain = Number((rewardsByResult[checkOutcome.result] || {}).water || 0);

    var attemptRecord = {
      result: checkOutcome.result,
      fillPct: fillPct,
      waterGain: waterGain
    };

    session.minigame.attempts.push(attemptRecord);
    session.minigame.currentAttempt += 1;
    session.minigame.totalWater += waterGain;

    var isLastAttempt = session.minigame.currentAttempt >= attemptCount;
    if (isLastAttempt) {
      session.minigame.resolved = true;
      session.status = "completed";
    }

    if (typeof saveGame === "function") saveGame();

    return { ok: true, reason: null, session: session, attempt: attemptRecord, isLastAttempt: isLastAttempt };
  },

  /* Finalise la session : crédite l'Eau (WarehouseManager uniquement), débloque le Puits
     si session de quête réussie (au moins 1 tentative non-ratée), applique le cooldown si
     activité bonus. Strictement idempotent (rewardsGranted/cooldownApplied). */
  settle: function () {
    var session = this.getActiveSession();
    if (!session) return { ok: false, reason: "Aucune session active" };
    if (!session.minigame.resolved) return { ok: false, reason: "La session n'est pas terminée" };

    this.ensureDefaults();

    var atLeastOneHit = session.minigame.attempts.some(function (a) {
      return a.result === "correct" || a.result === "perfect";
    });

    if (!session.settlement.rewardsGranted) {
      if (session.minigame.totalWater > 0 && window.WarehouseManager && typeof WarehouseManager.addResource === "function") {
        WarehouseManager.addResource("eau", session.minigame.totalWater);
      }

      if (session.source === "quest" && atLeastOneHit) {
        game.explorationProgression.driedSpringDiscoveryCompleted = true;
        game.explorationProgression.wellUnlocked = true;
        if (window.ProductionManager && typeof ProductionManager.unlockBuilding === "function") {
          ProductionManager.unlockBuilding("well");
        }
      }

      session.settlement.rewardsGranted = true;
    }

    if (session.source === "well_bonus" && !session.settlement.cooldownApplied) {
      game.gatheringActivity.well.cooldownEndsAt = Date.now() + WELL_BONUS_COOLDOWN_MS;
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
    game.gatheringActivity.well.activeSession = null;
    if (typeof saveGame === "function") saveGame();
  }
};

window.WELL_BONUS_COOLDOWN_MS = WELL_BONUS_COOLDOWN_MS;
window.WellManager = WellManager;
