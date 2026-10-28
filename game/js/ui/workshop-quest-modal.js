"use strict";
/* ui/workshop-quest-modal.js — 2 popups chaîne de déblocage Atelier : 1) objectif (non-bloquant, clic sur bandeau HUD)
   2) complétion (bloquant, déclenché en temps réel par WorkshopUnlockManager._advanceOneStepIfReady()). Détail : COMMENTAIRES_ORIGINAUX.md */

/* v3.530.0 (audit TUT-12, option C) : une étape validée hors du Village (ex. les 60 Bois de la Meute) attend
   l'arrivée au Village et la fermeture des autres fenêtres. En mémoire seulement : le bandeau du Village garde l'objectif. */
var workshopPendingPopup = null, workshopPendingTimer = null;
function workshopOtherWindowOpen() {
  var roots = document.querySelectorAll('[id$="-modal-root"]');
  for (var i = 0; i < roots.length; i++) if (roots[i].innerHTML.replace(/\s+/g, "")) return true;
  return !!document.querySelector("#confirm-modal.show, #offline-modal.show");
}
function flushWorkshopPendingPopup() {
  if (!workshopPendingPopup) { if (workshopPendingTimer) { clearInterval(workshopPendingTimer); workshopPendingTimer = null; } return; }
  if (game.activeTab !== "village" || workshopOtherWindowOpen()) return;
  var p = workshopPendingPopup;
  workshopPendingPopup = null;
  if (workshopPendingTimer) { clearInterval(workshopPendingTimer); workshopPendingTimer = null; }
  showWorkshopStepCompletionPopup(p.step, p.next);
}
window.flushWorkshopPendingPopup = flushWorkshopPendingPopup;

function showWorkshopStepCompletionPopup(completedStep, nextStep) {
  var modal = document.getElementById("workshop-completion-modal");
  if (!modal || !completedStep) return;
  if (game.activeTab !== "village" || workshopOtherWindowOpen()) {
    workshopPendingPopup = { step: completedStep, next: nextStep }; // la dernière étape validée suffit
    if (!workshopPendingTimer && typeof setInterval === "function") workshopPendingTimer = setInterval(flushWorkshopPendingPopup, 700);
    return;
  }

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
