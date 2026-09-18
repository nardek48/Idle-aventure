"use strict";
/* systems/workshop-unlock-system.js — chaîne de déblocage de l'Atelier (data/workshop-unlock.js). Indépendant de QuestManager.
   Consulté via hooks optionnels depuis warehouse-system.js/construction-system.js, jamais l'inverse. Détail : COMMENTAIRES_ORIGINAUX.md */

var WorkshopUnlockManager = {
  ensure: function () {
    if (!game.workshopUnlock || typeof game.workshopUnlock !== "object") {
      game.workshopUnlock = { currentStep: 0, completed: false, planchesCrafted: 0 };
    }
    var wu = game.workshopUnlock;
    if (typeof wu.currentStep !== "number" || wu.currentStep < 0) wu.currentStep = 0;
    if (typeof wu.completed !== "boolean") wu.completed = false;
    if (typeof wu.planchesCrafted !== "number" || wu.planchesCrafted < 0) wu.planchesCrafted = 0;
  },

  notifyPlanchesCrafted: function (amount) {
    this.ensure();
    amount = Math.floor(Number(amount || 0));
    if (amount <= 0) return;
    game.workshopUnlock.planchesCrafted += amount;
    this.checkCurrentStep();
  },

  checkCurrentStep: function (silent) {
    this.ensure();
    var wu = game.workshopUnlock;
    if (wu.completed) return false;

    var advanced = this._advanceOneStepIfReady(silent);

    if (advanced) {
      if (typeof renderPanel === "function") renderPanel();
      if (typeof renderHud === "function") renderHud();
      saveGame();
    }

    return advanced;
  },

  _advanceOneStepIfReady: function (silent) {
    var wu = game.workshopUnlock;
    if (wu.completed) return false;
    if (wu.currentStep >= WORKSHOP_UNLOCK_STEPS.length) return false;

    var step = WORKSHOP_UNLOCK_STEPS[wu.currentStep];
    if (!step.check(game)) return false;

    wu.currentStep += 1;

    if (!silent) {
      addLog("Objectif complété : " + step.label, "event");
      if (typeof showToast === "function") showToast("✅ " + step.label, 1600);
    }

    if (wu.currentStep >= WORKSHOP_UNLOCK_STEPS.length) {
      wu.completed = true;
      if (!silent) {
        addLog("L'Atelier de Construction est maintenant débloqué en permanence.", "event");
      }
    }

    if (!silent && typeof showWorkshopStepCompletionPopup === "function") {
      var nextStep = wu.completed ? null : WORKSHOP_UNLOCK_STEPS[wu.currentStep];
      showWorkshopStepCompletionPopup(step, nextStep);
    }

    return true;
  },

  runRetroactiveCheck: function () {
    this.ensure();
    if (game.workshopUnlock.completed) return;

    var before = game.workshopUnlock.currentStep;
    while (this._advanceOneStepIfReady(true)) {
    }
    var after = game.workshopUnlock.currentStep;

    if (after === before) return;

    if (game.workshopUnlock.completed) {
      addLog("L'Atelier de Construction est débloqué (progression déjà acquise).", "event");
    } else {
      var nextStep = WORKSHOP_UNLOCK_STEPS[after];
      if (nextStep) {
        addLog("Progression retrouvée — prochain objectif : " + nextStep.label, "event");
      }
    }

    saveGame();
  },

  isWorkshopVisible: function () {
    this.ensure();
    return game.workshopUnlock.completed || game.workshopUnlock.currentStep >= 2;
  },

  isWorkshopQuestPending: function () {
    this.ensure();
    return !game.workshopUnlock.completed && game.workshopUnlock.currentStep >= 2;
  },

  getBannerText: function () {
    this.ensure();
    var wu = game.workshopUnlock;
    if (wu.completed) return null;

    var step = WORKSHOP_UNLOCK_STEPS[wu.currentStep];
    if (!step) return null;

    return "Objectif : " + step.label + " (" + step.progress(game) + ")";
  }
};

window.WorkshopUnlockManager = WorkshopUnlockManager;
