"use strict";
/* ui/exploration-view.js — popups du moteur d'Expéditions (préparation 2 étapes, événement du
   tronc, secours, fin). Ancrage partagé "adventure-quest-modal-root" (bloquant, déjà dans
   BLOCKING_MODAL_IDS du game-loop). Réutilise les patterns dungeon-story-card/settings-btn
   existants — aucun nouveau composant visuel générique créé. Détail : COMMENTAIRES_ORIGINAUX.md */

var explorationModalRootId = "adventure-quest-modal-root";

function getExplorationModalHost() {
  return document.getElementById(explorationModalRootId);
}

function closeExplorationModal() {
  var host = getExplorationModalHost();
  if (host) host.innerHTML = "";
}
window.closeExplorationModal = closeExplorationModal;

/* --- Préparation : popup à 2 étapes (Provisions puis Approche) + récapitulatif --- */

var pendingExplorationQuestId = null;
var explorationPrepStep = "provisions"; // "provisions" | "approach" | "summary"
var explorationPrepProvisionId = null;
var explorationPrepApproachId = null;
var explorationPrepBusy = false; // anti double-clic sur "Partir"

function openExplorationPrep(questId) {
  if (window.ExplorationManager && typeof ExplorationManager.isQuestCompleted === "function" && ExplorationManager.isQuestCompleted(questId)) {
    showToast("Expédition déjà terminée", 1400);
    return;
  }
  if (ExplorationManager.isRunActive()) {
    showToast("Une expédition est déjà en cours", 1400);
    return;
  }
  var req = ExplorationManager.checkRequirements(questId);
  if (!req.ok) {
    showToast(req.reason, 1600);
    return;
  }

  pendingExplorationQuestId = questId;
  explorationPrepStep = "provisions";
  explorationPrepProvisionId = null;
  explorationPrepApproachId = null;
  explorationPrepBusy = false;

  var host = getExplorationModalHost();
  if (host) host.innerHTML = buildExplorationPrepHTML();
}
window.openExplorationPrep = openExplorationPrep;

function closeExplorationPrep() {
  pendingExplorationQuestId = null;
  closeExplorationModal();
}
window.closeExplorationPrep = closeExplorationPrep;

function selectExplorationProvision(provisionId) {
  explorationPrepProvisionId = provisionId;
  explorationPrepStep = "approach";
  var host = getExplorationModalHost();
  if (host) host.innerHTML = buildExplorationPrepHTML();
}
window.selectExplorationProvision = selectExplorationProvision;

function selectExplorationApproach(approachId) {
  explorationPrepApproachId = approachId;
  explorationPrepStep = "summary";
  var host = getExplorationModalHost();
  if (host) host.innerHTML = buildExplorationPrepHTML();
}
window.selectExplorationApproach = selectExplorationApproach;

function backExplorationPrepStep() {
  if (explorationPrepStep === "approach") explorationPrepStep = "provisions";
  else if (explorationPrepStep === "summary") explorationPrepStep = "approach";
  var host = getExplorationModalHost();
  if (host) host.innerHTML = buildExplorationPrepHTML();
}
window.backExplorationPrepStep = backExplorationPrepStep;

function buildExplorationPrepHTML() {
  var quest = ExplorationManager.getQuest(pendingExplorationQuestId);
  if (!quest) return "";

  var h = '<div class="full-menu-overlay">';
  h += '  <div class="full-menu dungeon-story-card exploration-prep-card">';
  h += '    <div class="dungeon-story-icon">' + renderIconOrEmojiHTML(quest.icon || "🧭", "dungeon-story-icon-img", quest.title) + '</div>';
  h += '    <div class="dungeon-story-title">' + esc(quest.title) + '</div>';

  if (explorationPrepStep === "provisions") {
    h += '    <div class="dungeon-story-text">Choisis tes provisions pour le départ.</div>';
    h += '    <div class="exploration-option-list">';
    quest.provisionOptions.forEach(function (opt) {
      var available = (window.WarehouseManager && typeof WarehouseManager.getAmount === "function")
        ? WarehouseManager.getAmount("petite_ration") : 0;
      var canAfford = available >= opt.startingRations;
      h += '<button type="button" class="settings-btn exploration-option-btn' + (canAfford ? '' : ' disabled') + '"'
        + (canAfford ? ' onclick="selectExplorationProvision(\'' + esc(opt.id) + '\')"' : ' disabled')
        + '>';
      h += '<span class="exploration-option-label">' + esc(opt.label) + '</span>';
      h += '<span class="exploration-option-cost">' + opt.startingRations + ' petite ration' + (opt.startingRations > 1 ? 's' : '')
        + (opt.reserveRations > 0 ? ' (dont 1 en réserve)' : '') + '</span>';
      h += '</button>';
    });
    h += '    </div>';
    h += '    <div class="dungeon-story-actions">';
    h += '      <button class="settings-btn" type="button" onclick="closeExplorationPrep()">Annuler</button>';
    h += '    </div>';

  } else if (explorationPrepStep === "approach") {
    h += '    <div class="dungeon-story-text">Choisis ton approche.</div>';
    h += '    <div class="exploration-option-list">';
    quest.approachOptions.forEach(function (opt) {
      h += '<button type="button" class="settings-btn exploration-option-btn" onclick="selectExplorationApproach(\'' + esc(opt.id) + '\')">';
      h += '<span class="exploration-option-label">' + esc(opt.label) + '</span>';
      h += '</button>';
    });
    h += '    </div>';
    h += '    <div class="dungeon-story-actions">';
    h += '      <button class="settings-btn" type="button" onclick="backExplorationPrepStep()">‹ Retour</button>';
    h += '    </div>';

  } else {
    var provision = quest.provisionOptions.find(function (p) { return p.id === explorationPrepProvisionId; });
    var approach = quest.approachOptions.find(function (a) { return a.id === explorationPrepApproachId; });

    h += '    <div class="dungeon-summary-rewards">';
    h += '      <div class="dungeon-summary-row"><span>Expédition</span><span>' + esc(quest.title) + '</span></div>';
    h += '      <div class="dungeon-summary-row"><span>Petites rations utilisées</span><span>' + (provision ? provision.startingRations : 0) + '</span></div>';
    h += '      <div class="dungeon-summary-row"><span>Ration de réserve</span><span>' + (provision && provision.reserveRations > 0 ? 'Oui' : 'Aucune') + '</span></div>';
    h += '      <div class="dungeon-summary-row"><span>Approche</span><span>' + (approach ? esc(approach.label) : '') + '</span></div>';
    h += '    </div>';
    h += '    <div class="dungeon-story-text">La ration de réserve non utilisée sera récupérée à la fin de l\u2019expédition.</div>';

    h += '    <div class="dungeon-story-actions">';
    h += '      <button class="settings-btn" type="button" onclick="backExplorationPrepStep()"' + (explorationPrepBusy ? ' disabled' : '') + '>Annuler</button>';
    h += '      <button class="settings-btn primary" type="button" onclick="confirmExplorationDeparture()"' + (explorationPrepBusy ? ' disabled' : '') + '>Partir</button>';
    h += '    </div>';
  }

  h += '  </div>';
  h += '</div>';
  return h;
}

function confirmExplorationDeparture() {
  if (explorationPrepBusy) return; // anti double-clic
  explorationPrepBusy = true;

  // Re-rend immédiatement avec les boutons désactivés avant tout traitement.
  var host = getExplorationModalHost();
  if (host) host.innerHTML = buildExplorationPrepHTML();

  var result = ExplorationManager.startRun(pendingExplorationQuestId, explorationPrepProvisionId, explorationPrepApproachId);

  if (!result.ok) {
    explorationPrepBusy = false;
    showToast(result.reason, 1800);
    var host2 = getExplorationModalHost();
    if (host2) host2.innerHTML = buildExplorationPrepHTML();
    return;
  }

  pendingExplorationQuestId = null;
  explorationPrepBusy = false;

  ExplorationManager.advanceToEvent();
  openExplorationEvent();
  if (typeof renderPanel === "function") renderPanel();
}
window.confirmExplorationDeparture = confirmExplorationDeparture;

/* --- Événement du tronc --- */

function openExplorationEvent() {
  var host = getExplorationModalHost();
  if (host) host.innerHTML = buildExplorationEventHTML();
}
window.openExplorationEvent = openExplorationEvent;

function buildExplorationEventHTML() {
  var run = ExplorationManager.getRun();
  if (!run) return "";
  var quest = ExplorationManager.getQuest(run.questId);
  if (!quest) return "";
  var event = quest.event;

  var h = '<div class="full-menu-overlay">';
  h += '  <div class="full-menu dungeon-story-card">';
  h += '    <div class="dungeon-story-icon">🌳</div>';
  h += '    <div class="dungeon-story-title">' + esc(event.title) + '</div>';
  h += '    <div class="dungeon-story-text">' + esc(event.text) + '</div>';

  h += '    <div class="exploration-option-list">';

  ["power", "precision"].forEach(function (key) {
    var choice = event.choices[key];
    var statValue = (key === "precision") ? run.heroSnapshot.precision : run.heroSnapshot.power;
    var preview = ExplorationCheckSystem.resolveCheck({ statValue: statValue, difficulty: choice.difficulty, randomValue: 0 });
    h += '<button type="button" class="settings-btn exploration-option-btn" onclick="resolveExplorationEventChoice(\'' + key + '\')">';
    h += '<span class="exploration-option-label">' + esc(choice.label) + '</span>';
    h += '<span class="exploration-option-estimate">' + esc(explorationEstimateLabel(preview.estimate)) + '</span>';
    h += '</button>';
  });

  var bypass = event.choices.bypass;
  var canBypass = run.loadout.reserveRations > 0;
  h += '<button type="button" class="settings-btn exploration-option-btn' + (canBypass ? '' : ' disabled') + '"'
    + (canBypass ? ' onclick="resolveExplorationEventChoice(\'bypass\')"' : ' disabled')
    + '>';
  h += '<span class="exploration-option-label">' + esc(bypass.label) + '</span>';
  h += '<span class="exploration-option-estimate">' + (canBypass ? 'Réussite garantie' : 'Une ration de réserve est nécessaire') + '</span>';
  h += '</button>';

  h += '    </div>';
  h += '  </div>';
  h += '</div>';
  return h;
}

function explorationEstimateLabel(estimate) {
  if (estimate === "high") return "Bonne chance";
  if (estimate === "medium") return "Chance moyenne";
  return "Faible chance";
}

var explorationEventBusy = false; // anti double-clic sur un choix

function resolveExplorationEventChoice(choiceId) {
  if (explorationEventBusy) return;
  explorationEventBusy = true;

  var result = ExplorationManager.resolveEventChoice(choiceId);
  explorationEventBusy = false;

  if (!result.ok) {
    showToast(result.reason, 1600);
    var host = getExplorationModalHost();
    if (host) host.innerHTML = buildExplorationEventHTML();
    return;
  }

  if (result.outcome === "setback") {
    openExplorationFallback();
  } else {
    openExplorationComplete();
  }
}
window.resolveExplorationEventChoice = resolveExplorationEventChoice;

/* --- Popup de secours --- */

function openExplorationFallback() {
  var host = getExplorationModalHost();
  if (host) host.innerHTML = buildExplorationFallbackHTML();
}
window.openExplorationFallback = openExplorationFallback;

function buildExplorationFallbackHTML() {
  var run = ExplorationManager.getRun();
  if (!run) return "";
  var quest = ExplorationManager.getQuest(run.questId);
  if (!quest) return "";
  var fallback = quest.fallback;

  var h = '<div class="full-menu-overlay">';
  h += '  <div class="full-menu dungeon-story-card is-failure">';
  h += '    <div class="dungeon-story-icon">😓</div>';
  h += '    <div class="dungeon-story-title">' + esc(fallback.title) + '</div>';

  h += '    <div class="exploration-option-list">';

  var bypassChoice = fallback.choices.bypassWithReserve;
  var canBypass = run.loadout.reserveRations > 0;
  h += '<button type="button" class="settings-btn exploration-option-btn' + (canBypass ? '' : ' disabled') + '"'
    + (canBypass ? ' onclick="resolveExplorationFallbackChoice(\'bypassWithReserve\')"' : ' disabled')
    + '>';
  h += '<span class="exploration-option-label">' + esc(bypassChoice.label) + '</span>';
  if (!canBypass) h += '<span class="exploration-option-estimate">Une ration de réserve est nécessaire.</span>';
  h += '</button>';

  var retreatChoice = fallback.choices.retreat;
  h += '<button type="button" class="settings-btn exploration-option-btn" onclick="resolveExplorationFallbackChoice(\'retreat\')">';
  h += '<span class="exploration-option-label">' + esc(retreatChoice.label) + '</span>';
  h += '</button>';

  h += '    </div>';
  h += '  </div>';
  h += '</div>';
  return h;
}

var explorationFallbackBusy = false;

function resolveExplorationFallbackChoice(choiceId) {
  if (explorationFallbackBusy) return;
  explorationFallbackBusy = true;

  var result = ExplorationManager.resolveFallbackChoice(choiceId);
  explorationFallbackBusy = false;

  if (!result.ok) {
    showToast(result.reason, 1600);
    var host = getExplorationModalHost();
    if (host) host.innerHTML = buildExplorationFallbackHTML();
    return;
  }

  openExplorationComplete();
}
window.resolveExplorationFallbackChoice = resolveExplorationFallbackChoice;

/* --- Popup de fin --- */

function openExplorationComplete() {
  var result = ExplorationManager.settle();
  if (!result.ok) {
    showToast(result.reason, 1600);
    return;
  }

  var host = getExplorationModalHost();
  if (host) host.innerHTML = buildExplorationCompleteHTML(result.run);

  if (typeof renderPanel === "function") renderPanel();
}
window.openExplorationComplete = openExplorationComplete;

function buildExplorationCompleteHTML(run) {
  if (!run) return "";
  var quest = ExplorationManager.getQuest(run.questId);
  if (!quest) return "";

  var title;
  if (run.event.checkResult === "perfect") title = "Succès parfait !";
  else if (run.event.checkResult === "success" && run.event.choiceId === "bypass") title = "Contournement";
  else if (run.event.checkResult === "success") title = "Succès";
  else if (run.event.choiceId === "bypassWithReserve") title = "Contournement";
  else title = "Retour prudent";

  var isFailureVisual = !run.rewards.clearingUnlocked;

  var h = '<div class="full-menu-overlay">';
  h += '  <div class="full-menu dungeon-story-card' + (isFailureVisual ? '' : ' is-success') + '">';
  h += '    <div class="dungeon-story-icon">' + (run.rewards.clearingUnlocked ? '🌿' : '🏕️') + '</div>';
  h += '    <div class="dungeon-story-title">' + esc(title) + '</div>';

  h += '    <div class="dungeon-summary-rewards">';
  h += '      <div class="dungeon-summary-row"><span>🪵 Bois obtenu</span><span>+' + formatNumber(run.rewards.wood) + '</span></div>';
  h += '      <div class="dungeon-summary-row"><span>🌿 Clairière oubliée</span><span>' + (run.rewards.clearingUnlocked ? 'Débloquée' : 'Non débloquée') + '</span></div>';

  var reserveLabel;
  if (run.loadout.reserveRations > 0 && run.settlement.reserveRefunded) {
    reserveLabel = "Rendue";
  } else if (run.loadout.startingRations >= 2) {
    reserveLabel = "Utilisée";
  } else {
    reserveLabel = "Absente";
  }
  h += '      <div class="dungeon-summary-row"><span>🎒 Ration de réserve</span><span>' + reserveLabel + '</span></div>';
  h += '    </div>';

  if (!run.rewards.clearingUnlocked) {
    h += '    <div class="dungeon-story-text">L\u2019expédition reste inachevée — tu pourras la retenter plus tard.</div>';
  }

  h += '    <button class="settings-btn primary dungeon-story-close" type="button" onclick="closeExplorationComplete()">Retour aux quêtes</button>';
  h += '  </div>';
  h += '</div>';
  return h;
}

function closeExplorationComplete() {
  ExplorationManager.clearRun();
  closeExplorationModal();
  // Garantit un atterrissage sur l'écran Quêtes, même si le joueur arrive ici après un
  // rechargement de page où game.activeTab pointait ailleurs (resumeExplorationRun()).
  if (typeof switchTab === "function") switchTab("quests");
  else if (typeof renderPanel === "function") renderPanel();
}
window.closeExplorationComplete = closeExplorationComplete;

/* --- Reprise d'un run actif (ex. après rechargement de page) --- */

function resumeExplorationRun() {
  var run = ExplorationManager.getRun();
  if (!run) return;

  if (run.status === "intro") {
    openExplorationEvent(); // l'intro elle-même n'a pas de contenu séparé à réafficher, direct sur l'événement
  } else if (run.status === "event") {
    openExplorationEvent();
  } else if (run.status === "fallback") {
    openExplorationFallback();
  } else if (run.status === "completed_pending") {
    openExplorationComplete();
  } else if (run.status === "completed") {
    // Récompenses déjà créditées (settle() déjà appelé) mais le joueur n'a pas encore
    // cliqué "Retour aux quêtes" au moment du rechargement -> réafficher le même bilan
    // SANS rappeler settle() (idempotent de toute façon, mais on évite l'appel inutile).
    var host = getExplorationModalHost();
    if (host) host.innerHTML = buildExplorationCompleteHTML(run);
  }
}
window.resumeExplorationRun = resumeExplorationRun;
