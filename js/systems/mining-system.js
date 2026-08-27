"use strict";
/* systems/mining-system.js — moteur du minijeu de minage (jauge/timing, 3 coups). Utilisé par
   la quête "La Veine Instable" (source: "quest") ET l'activité bonus répétable de la Carrière
   (source: "quarry_bonus"). Indépendant d'ExplorationManager (mécanique trop différente d'un
   test de stat à résultat unique). Ne charge JAMAIS CombatEngine, n'écrit jamais dans
   game.resources directement (uniquement via WarehouseManager). Détail : COMMENTAIRES_ORIGINAUX.md */

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

  isQuestCompleted: function () {
    this.ensureDefaults();
    // v3.92.2 : une sauvegarde migrée (Carrière déjà débloquée nativement avant l'existence
    // de cette quête, voir save-system.js) a quarryUnlocked=true mais
    // unstableVeinDiscoveryCompleted=false (elle n'a jamais "vraiment" joué/gagné la
    // quête). Dans les deux cas, la Carrière est acquise -> la carte doit être traitée
    // comme terminée à l'affichage, jamais laissée verrouillée dans la liste active.
    return !!(game.explorationProgression && (
      game.explorationProgression.unstableVeinDiscoveryCompleted ||
      game.explorationProgression.quarryUnlocked
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

  /* Prérequis d'accès à la quête "La Veine Instable" (pas l'activité bonus). */
  checkQuestRequirements: function () {
    this.ensureDefaults();
    var quest = this.getQuest("unstableVein");
    if (!quest) return { ok: false, reason: "Expédition introuvable" };

    if (this.isQuestCompleted()) {
      return { ok: false, reason: "Expédition déjà terminée" };
    }
    if (this.isQuarryUnlocked()) {
      return { ok: false, reason: "La Carrière est déjà déverrouillée" };
    }
    if (quest.requirements.heroSelected && !game.heroId) {
      return { ok: false, reason: "Aucun héros sélectionné" };
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

  _createSession: function (source) {
    return {
      id: "mining_" + Date.now() + "_" + Math.floor(Math.random() * 100000),
      source: source,
      questId: source === "quest" ? "unstableVein" : null,
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

  /* Démarre une session pour la quête "La Veine Instable". Retire 1 petite ration via
     WarehouseManager. Retourne { ok, reason, session }. */
  startQuestSession: function () {
    this.ensureDefaults();

    if (this.isSessionActive()) {
      return { ok: false, reason: "Une session de minage est déjà en cours", session: null };
    }

    var req = this.checkQuestRequirements();
    if (!req.ok) return { ok: false, reason: req.reason, session: null };

    var quest = this.getQuest("unstableVein");
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

    var session = this._createSession("quest");
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
    var perfectIronOreChancePct = quest ? quest.minigame.perfectIronOreChancePct : 20;

    if (session.minigame.currentHit >= hitCount) {
      return { ok: false, reason: "Tous les coups ont déjà été joués" }; // idempotence anti double-clic
    }

    var checkOutcome = MiningCheckSystem.resolveHit({
      precision: session.heroSnapshot.precision,
      hitPositionPct: hitPositionPct
    });

    var stoneGain = Number((rewardsByResult[checkOutcome.result] || {}).stone || 0);
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
      if (session.minigame.totalStone > 0 && window.WarehouseManager && typeof WarehouseManager.addResource === "function") {
        WarehouseManager.addResource("pierre", session.minigame.totalStone);
      }
      if (session.minigame.totalIronOre > 0 && window.WarehouseManager && typeof WarehouseManager.addResource === "function") {
        WarehouseManager.addResource("fer", session.minigame.totalIronOre);
      }

      if (session.source === "quest" && atLeastOneHit) {
        game.explorationProgression.unstableVeinDiscoveryCompleted = true;
        game.explorationProgression.quarryUnlocked = true;
        if (window.ProductionManager && typeof ProductionManager.unlockBuilding === "function") {
          ProductionManager.unlockBuilding("quarry");
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
