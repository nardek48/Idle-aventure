"use strict";
/* ============================================================
Aethervale — ui/workshop-quest-modal.js
v3.39 : deux popups pour la chaîne de déblocage de l'Atelier (voir
data/workshop-unlock.js, systems/workshop-unlock-system.js) :

1. Popup d'OBJECTIF (non-bloquant) — ouvert au clic sur le bandeau
   HUD (#workshop-unlock-banner, voir ui/hud-view.js). Purement
   informatif : titre + narratif + condition précise + bouton Fermer.
   Pattern #workshop-step-modal-root (overlay .full-menu-overlay,
   même principe que #village-modal-root/#construction-modal-root —
   injection dynamique, fermable en cliquant à côté ou sur Fermer).

2. Popup de COMPLÉTION (bloquant) — déclenché automatiquement par
   WorkshopUnlockManager._advanceOneStepIfReady() UNIQUEMENT en temps
   réel (jamais lors de la validation rétroactive du boot, silent
   toujours true dans ce cas). Pattern #workshop-completion-modal
   (HTML STATIQUE dans index.html + classe .show, même principe que
   #offline-modal/#confirm-modal — fond plein écran opaque, aucun
   clic possible en dehors, doit être fermé explicitement via
   "Continuer").
============================================================ */

/* ============================================================
   1. Popup d'objectif — non-bloquant.
============================================================ */

function buildWorkshopStepPopupHTML() {
  WorkshopUnlockManager.ensure();
  var wu = game.workshopUnlock;

  var h = '<div class="full-menu-overlay" onclick="if(event.target===this)closeWorkshopStepPopup()">';
  h += '  <div class="full-menu workshop-step-popup-card">';

  if (wu.completed) {
    // Ne devrait normalement pas être atteignable (le bandeau
    // disparaît définitivement une fois completed, voir
    // renderWorkshopUnlockBanner() en ui/hud-view.js) — filet de
    // sécurité si jamais appelé directement.
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

/* Texte de condition précise, ex. "10 / 10 Bois" — dérivé de
   step.progress(game) (déjà au format "x/y") plutôt que dupliqué,
   juste reformaté avec le nom de la ressource/action concernée pour
   rester lisible en phrase complète. */
function formatWorkshopStepCondition(step) {
  var progress = step.progress(game); // ex. "7/10"
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
  if (game.workshopUnlock.completed) return; // bandeau déjà masqué dans ce cas, filet de sécurité

  var host = document.getElementById("workshop-step-modal-root");
  if (host) host.innerHTML = buildWorkshopStepPopupHTML();
}
window.openWorkshopStepPopup = openWorkshopStepPopup;

function closeWorkshopStepPopup() {
  var host = document.getElementById("workshop-step-modal-root");
  if (host) host.innerHTML = "";
}
window.closeWorkshopStepPopup = closeWorkshopStepPopup;

/* ============================================================
   2. Popup de complétion — bloquant.
============================================================ */

/* Appelée par WorkshopUnlockManager._advanceOneStepIfReady() juste
   après avoir fait avancer currentStep, UNIQUEMENT en temps réel.
   `completedStep` = l'étape QUI VIENT d'être validée (déjà dépassée
   dans currentStep au moment de l'appel). `nextStep` = la suivante,
   ou null si complétée (dernière étape, texte de clôture sans
   aperçu). */
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
      // Dernière étape : pas d'aperçu de suite, comme demandé.
      nextEl.textContent = "";
      nextEl.style.display = "none";
    }
  }

  modal.classList.add("show");
}
window.showWorkshopStepCompletionPopup = showWorkshopStepCompletionPopup;

/* Ferme le popup de complétion — c'est SEULEMENT à ce moment que le
   bandeau HUD doit refléter le nouvel objectif (renderHud() a déjà
   tourné pendant que le popup était ouvert, via checkCurrentStep(),
   mais le bandeau était masqué derrière l'overlay plein écran ; rien
   de spécial à faire ici au-delà de fermer la modale, le texte est
   déjà à jour dessous). */
function closeWorkshopCompletionPopup() {
  var modal = document.getElementById("workshop-completion-modal");
  if (modal) modal.classList.remove("show");
}
window.closeWorkshopCompletionPopup = closeWorkshopCompletionPopup;
