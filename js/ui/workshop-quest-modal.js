"use strict";
/* ui/workshop-quest-modal.js — 2 popups chaîne de déblocage Atelier : 1) objectif (non-bloquant, clic sur bandeau HUD)
   2) complétion (bloquant, déclenché en temps réel par WorkshopUnlockManager._advanceOneStepIfReady()). Détail : COMMENTAIRES_ORIGINAUX.md */

function buildWorkshopStepPopupHTML() {
  WorkshopUnlockManager.ensure();
  var wu = game.workshopUnlock;

  var h = '<div class="full-menu-overlay" onclick="if(event.target===this)closeWorkshopStepPopup()">';
  h += '  <div class="full-menu workshop-step-popup-card">';

  if (wu.completed) {
    h += '    <div class="workshop-step-popup-title">' + _t("Chaîne terminée") + '</div>';
    h += '    <div class="workshop-step-popup-text">' + _t("L'Atelier de Construction est débloqué en permanence.") + '</div>';
  } else {
    var step = WORKSHOP_UNLOCK_STEPS[wu.currentStep];
    h += '    <div class="workshop-step-popup-title">' + esc(_td(step.label)) + '</div>';
    h += '    <div class="workshop-step-popup-text">' + esc(_td(step.narrative.objective)) + '</div>';
    h += '    <div class="workshop-step-popup-condition">' + esc(formatWorkshopStepCondition(step)) + '</div>';
  }

  h += '    <div class="workshop-step-popup-actions">';
  h += '      <button class="settings-btn primary" type="button" onclick="closeWorkshopStepPopup()">' + _t("Fermer") + '</button>';
  h += '    </div>';
  h += '  </div>';
  h += '</div>';
  return h;
}

function formatWorkshopStepCondition(step) {
  var progress = step.progress(game);
  var parts = progress.split("/");
  var current = parts[0];
  var target = parts[1];

  var labels = {
    harvest_wood: _t("Bois"),
    craft_planks: _t("Planches fabriquées"),
    harvest_stone: _t("Pierre"),
    build_workshop: _t("Niveau de l'Atelier")
  };
  var label = labels[step.id] || _td(step.label);

  return current + " / " + target + " " + label;
}

function openWorkshopStepPopup() {
  if (typeof WorkshopUnlockManager === "undefined") return;
  WorkshopUnlockManager.ensure();
  if (game.workshopUnlock.completed) return;

  var host = document.getElementById("workshop-step-modal-root");
  if (host) host.innerHTML = buildWorkshopStepPopupHTML();
}
window.openWorkshopStepPopup = openWorkshopStepPopup;

function closeWorkshopStepPopup() {
  var host = document.getElementById("workshop-step-modal-root");
  if (host) host.innerHTML = "";
}
window.closeWorkshopStepPopup = closeWorkshopStepPopup;

function showWorkshopStepCompletionPopup(completedStep, nextStep) {
  var modal = document.getElementById("workshop-completion-modal");
  if (!modal || !completedStep) return;

  var titleEl = document.getElementById("workshop-completion-title");
  var textEl = document.getElementById("workshop-completion-text");
  var nextEl = document.getElementById("workshop-completion-next");

  if (titleEl) titleEl.textContent = _t("Étape terminée");
  if (textEl) textEl.textContent = _td(completedStep.narrative.completion);

  if (nextEl) {
    if (nextStep) {
      nextEl.textContent = _t("Prochain objectif : {x}", { x: _td(nextStep.label) });
      nextEl.style.display = "block";
    } else {
      nextEl.textContent = "";
      nextEl.style.display = "none";
    }
  }

  modal.classList.add("show");
}
window.showWorkshopStepCompletionPopup = showWorkshopStepCompletionPopup;

function closeWorkshopCompletionPopup() {
  var modal = document.getElementById("workshop-completion-modal");
  if (modal) modal.classList.remove("show");
}
window.closeWorkshopCompletionPopup = closeWorkshopCompletionPopup;
