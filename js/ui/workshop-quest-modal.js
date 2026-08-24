"use strict";
/* ui/workshop-quest-modal.js — 2 popups chaîne de déblocage Atelier : 1) objectif (non-bloquant, clic sur bandeau HUD)
   2) complétion (bloquant, déclenché en temps réel par WorkshopUnlockManager._advanceOneStepIfReady()). Détail : COMMENTAIRES_ORIGINAUX.md */

function buildWorkshopStepPopupHTML() {
  WorkshopUnlockManager.ensure();
  var wu = game.workshopUnlock;

  var h = '<div class="full-menu-overlay" onclick="if(event.target===this)closeWorkshopStepPopup()">';
  h += '  <div class="full-menu workshop-step-popup-card">';

  if (wu.completed) {
    h += '    <div class="workshop-step-popup-title">Chaîne terminée</div>';
    h += '    <div class="workshop-step-popup-text">L\'Atelier de Construction est débloqué en permanence.</div>';
  } else {
    var step = WORKSHOP_UNLOCK_STEPS[wu.currentStep];
    h += '    <div class="workshop-step-popup-title">' + esc(step.label) + '</div>';
    h += '    <div class="workshop-step-popup-text">' + esc(step.narrative.objective) + '</div>';
    h += '    <div class="workshop-step-popup-condition">' + esc(formatWorkshopStepCondition(step)) + '</div>';
  }

  h += '    <div class="workshop-step-popup-actions">';
  h += '      <button class="settings-btn primary" type="button" onclick="closeWorkshopStepPopup()">Fermer</button>';
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
    harvest_wood: "Bois",
    craft_planks: "Planches fabriquées",
    harvest_stone: "Pierre",
    build_workshop: "Niveau de l'Atelier"
  };
  var label = labels[step.id] || step.label;

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

  if (titleEl) titleEl.textContent = "Étape terminée";
  if (textEl) textEl.textContent = completedStep.narrative.completion;

  if (nextEl) {
    if (nextStep) {
      nextEl.textContent = "Prochain objectif : " + nextStep.label;
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
