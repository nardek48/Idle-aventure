"use strict";
/* systems/exploration-engine.js — moteur d'Expéditions non-combat. Ne charge JAMAIS CombatEngine, ne
   touche jamais le DOM, n'écrit jamais dans game.resources directement (uniquement via WarehouseManager).
   Consomme le module pur exploration-check-system.js. Détail : COMMENTAIRES_ORIGINAUX.md */

var ExplorationManager = {
  ensureDefaults: function () {
    if (typeof ensureGameStateDefaults === "function") ensureGameStateDefaults();
  },

  getQuest: function (questId) {
    return (typeof EXPLORATION_QUESTS !== "undefined" && EXPLORATION_QUESTS[questId]) || null;
  },

  getRun: function () {
    this.ensureDefaults();
    return game.explorationRun || null;
  },

  isRunActive: function () {
    var run = this.getRun();
    return !!(run && run.status !== "completed");
  },

  /* Vrai si la quête est déjà réussie de façon permanente (déblocage acquis, comme
     forgottenClearingUnlocked). Une quête réussie ne peut plus être relancée. */
  isQuestCompleted: function (questId) {
    this.ensureDefaults();
    var quest = this.getQuest(questId);
    if (!quest) return false;
    return !!(game.explorationProgression && game.explorationProgression[quest.completionFlag]);
  },

  /* Prérequis d'accès (avant même d'ouvrir le popup de préparation). */
  checkRequirements: function (questId) {
    this.ensureDefaults();
    var quest = this.getQuest(questId);
    if (!quest) return { ok: false, reason: "Expédition introuvable" };

    if (quest.requirements.heroSelected && !game.heroId) {
      return { ok: false, reason: "Aucun héros sélectionné" };
    }
    var minRation = Number(quest.requirements.minPetiteRation || 0);
    var available = (window.WarehouseManager && typeof WarehouseManager.getAmount === "function")
      ? WarehouseManager.getAmount("petite_ration")
      : 0;
    if (available < minRation) {
      return { ok: false, reason: "Au moins " + minRation + " petite ration nécessaire" };
    }
    return { ok: true, reason: null };
  },

  /* Snapshot des SEULES stats nécessaires au moment du départ — jamais recalculé ensuite,
     jamais une seconde source permanente : lu depuis StatsSystem (game.heroPowerRaw/
     game.heroPrecisionRaw), pas de duplication de logique de calcul ici. */
  buildHeroSnapshot: function () {
    if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") {
      StatsSystem.recalcStats();
    }
    return {
      heroId: game.heroId,
      power: Number(game.heroPowerRaw || 0),
      precision: Number(game.heroPrecisionRaw || 0)
    };
  },

  /* Crée et démarre un run. Retourne { ok, reason, run }. N'écrit dans game.resources que
     via WarehouseManager.removeResource() — jamais directement. Sauvegarde immédiatement. */
  startRun: function (questId, provisionOptionId, approachId) {
    this.ensureDefaults();

    if (this.isRunActive()) {
      return { ok: false, reason: "Une expédition est déjà en cours", run: null };
    }

    var quest = this.getQuest(questId);
    if (!quest) return { ok: false, reason: "Expédition introuvable", run: null };

    if (this.isQuestCompleted(questId)) {
      return { ok: false, reason: "Expédition déjà terminée", run: null };
    }

    var req = this.checkRequirements(questId);
    if (!req.ok) return { ok: false, reason: req.reason, run: null };

    var provisionOption = (quest.provisionOptions || []).find(function (p) { return p.id === provisionOptionId; });
    if (!provisionOption) return { ok: false, reason: "Provisions invalides", run: null };

    var approachOption = (quest.approachOptions || []).find(function (a) { return a.id === approachId; });
    if (!approachOption) return { ok: false, reason: "Approche invalide", run: null };

    var totalRationsNeeded = Number(provisionOption.startingRations || 0);
    if (!window.WarehouseManager || typeof WarehouseManager.removeResource !== "function") {
      return { ok: false, reason: "Entrepôt indisponible", run: null };
    }
    if (WarehouseManager.getAmount("petite_ration") < totalRationsNeeded) {
      return { ok: false, reason: "Pas assez de petites rations", run: null };
    }

    var removed = WarehouseManager.removeResource("petite_ration", totalRationsNeeded);
    if (!removed) {
      return { ok: false, reason: "Échec du retrait des rations", run: null };
    }

    var run = {
      id: "exploration_" + Date.now() + "_" + Math.floor(Math.random() * 100000),
      questId: questId,
      status: "intro",

      startedAt: Date.now(),

      heroSnapshot: this.buildHeroSnapshot(),

      loadout: {
        approachId: approachId,
        startingRations: provisionOption.startingRations,
        reserveRations: provisionOption.reserveRations
      },

      event: {
        id: quest.event.id,
        choiceId: null,
        checkResult: null,
        randomValue: null,
        successChance: null,
        estimate: null
      },

      rewards: {
        wood: 0,
        clearingUnlocked: false
      },

      settlement: {
        rewardsGranted: false,
        reserveRefunded: false,
        finalizedAt: null
      }
    };

    game.explorationRun = run;
    if (typeof saveGame === "function") saveGame();

    return { ok: true, reason: null, run: run };
  },

  /* Fait passer le run de "intro" à "event" (affichage du popup du tronc). */
  advanceToEvent: function () {
    var run = this.getRun();
    if (!run || run.status !== "intro") return false;
    run.status = "event";
    if (typeof saveGame === "function") saveGame();
    return true;
  },

  /* Résout un choix de l'événement principal (power / precision / bypass).
     Le randomValue est généré ICI, une seule fois, puis persisté avant tout affichage
     de résultat — un rechargement ultérieur ne doit jamais relancer le tirage. */
  resolveEventChoice: function (choiceId) {
    var run = this.getRun();
    if (!run || run.status !== "event") return { ok: false, reason: "Aucun événement à résoudre" };
    if (run.event.choiceId) return { ok: false, reason: "Choix déjà résolu" }; // idempotence anti double-clic

    var quest = this.getQuest(run.questId);
    if (!quest) return { ok: false, reason: "Expédition introuvable" };
    var choice = quest.event.choices[choiceId];
    if (!choice) return { ok: false, reason: "Choix invalide" };

    run.event.choiceId = choiceId;

    if (choice.guaranteed) {
      // Choix 3 (contournement) : pas de test de stat, réussite garantie, consomme la réserve.
      if (choice.requiresReserve && run.loadout.reserveRations <= 0) {
        run.event.choiceId = null; // annule la marque, le choix n'a pas pu être appliqué
        return { ok: false, reason: "Une ration de réserve est nécessaire" };
      }
      if (choice.requiresReserve) {
        run.loadout.reserveRations = 0;
      }
      run.event.checkResult = "success";
      run.event.successChance = 100;
      run.event.estimate = "high";
      run.status = "completed_pending"; // résolu, en attente de settle() côté UI
      this._applyRewards(run, choice.rewards.success);
      if (typeof saveGame === "function") saveGame();
      return { ok: true, reason: null, run: run, outcome: "success" };
    }

    // Choix 1/2 : test de stat via le module pur, randomValue généré une seule fois ici.
    var statValue = (choice.stat === "precision") ? run.heroSnapshot.precision : run.heroSnapshot.power;
    var randomValue = Math.random();
    var checkOutcome = ExplorationCheckSystem.resolveCheck({
      statValue: statValue,
      difficulty: choice.difficulty,
      randomValue: randomValue
    });

    run.event.randomValue = randomValue;
    run.event.checkResult = checkOutcome.result;
    run.event.successChance = checkOutcome.successChance;
    run.event.estimate = checkOutcome.estimate;

    if (checkOutcome.result === "setback") {
      run.status = "fallback";
      if (typeof saveGame === "function") saveGame();
      return { ok: true, reason: null, run: run, outcome: "setback" };
    }

    var rewardConfig = choice.rewards[checkOutcome.result];
    run.status = "completed_pending";
    this._applyRewards(run, rewardConfig);
    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null, run: run, outcome: checkOutcome.result };
  },

  /* Résout un choix du popup de secours (bypassWithReserve / retreat). */
  resolveFallbackChoice: function (choiceId) {
    var run = this.getRun();
    if (!run || run.status !== "fallback") return { ok: false, reason: "Aucun contretemps à résoudre" };

    var quest = this.getQuest(run.questId);
    if (!quest) return { ok: false, reason: "Expédition introuvable" };
    var choice = quest.fallback.choices[choiceId];
    if (!choice) return { ok: false, reason: "Choix invalide" };

    if (choice.requiresReserve && run.loadout.reserveRations <= 0) {
      return { ok: false, reason: "Une ration de réserve est nécessaire" };
    }
    if (choice.requiresReserve) {
      run.loadout.reserveRations = 0;
    }

    run.status = "completed_pending";
    this._applyRewards(run, choice.rewards);
    if (choice.rewards.questRemainsIncomplete) {
      run._questRemainsIncomplete = true; // lu par settle() pour ne pas marquer blockedPathCompleted
    }
    if (typeof saveGame === "function") saveGame();
    return { ok: true, reason: null, run: run, outcome: choiceId };
  },

  /* Applique les récompenses calculées dans run.rewards (mémoire uniquement, aucune
     écriture WarehouseManager ici — c'est settle() qui matérialise les gains). */
  _applyRewards: function (run, rewardConfig) {
    if (!rewardConfig) return;
    run.rewards.wood = Number(rewardConfig.wood || 0);
    run.rewards.clearingUnlocked = !!rewardConfig.unlockClearing;
  },

  /* Finalise le run : crédite le Bois (WarehouseManager uniquement), débloque la Clairière
     oubliée si acquise, rembourse la réserve non utilisée, marque les flags d'idempotence.
     Peut être appelée plusieurs fois sans effet de bord (rewardsGranted/reserveRefunded). */
  settle: function () {
    var run = this.getRun();
    if (!run) return { ok: false, reason: "Aucun run actif" };
    if (run.status !== "completed_pending" && run.status !== "completed") {
      return { ok: false, reason: "Le run n'est pas prêt à être finalisé" };
    }

    this.ensureDefaults();

    if (!run.settlement.rewardsGranted) {
      if (run.rewards.wood > 0 && window.WarehouseManager && typeof WarehouseManager.addResource === "function") {
        WarehouseManager.addResource("bois", run.rewards.wood);
      }

      var quest = this.getQuest(run.questId);
      if (run.rewards.clearingUnlocked && quest) {
        game.explorationProgression[quest.unlockFlag] = true;
        if (!run._questRemainsIncomplete) {
          game.explorationProgression[quest.completionFlag] = true;
        }
      }

      run.settlement.rewardsGranted = true;
    }

    if (!run.settlement.reserveRefunded) {
      if (run.loadout.reserveRations > 0 && window.WarehouseManager && typeof WarehouseManager.addResource === "function") {
        WarehouseManager.addResource("petite_ration", 1);
      }
      run.settlement.reserveRefunded = true;
    }

    run.status = "completed";
    run.settlement.finalizedAt = Date.now();

    if (typeof saveGame === "function") saveGame();

    return { ok: true, reason: null, run: run };
  },

  /* Nettoie le run terminé de game.explorationRun (après affichage du popup de fin et
     retour à l'écran Quêtes). Un run "completed" mais non clear reste consultable si besoin. */
  clearRun: function () {
    game.explorationRun = null;
    if (typeof saveGame === "function") saveGame();
  }
};

window.ExplorationManager = ExplorationManager;
