"use strict";
/* ui/workshop-quest-modal.js — 2 popups chaîne de déblocage Atelier : 1) objectif (non-bloquant, clic sur bandeau HUD)
   2) complétion (bloquant, déclenché en temps réel par WorkshopUnlockManager._advanceOneStepIfReady()). Détail : COMMENTAIRES_ORIGINAUX.md */

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
