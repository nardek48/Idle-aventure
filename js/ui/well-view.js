"use strict";
/* ui/well-view.js — popups du minijeu "maintenir puis relâcher" : préparation/lancement (quête
   "La Source Tarie" ET activité bonus répétable du Puits), jauge de remplissage animée en CSS
   (montée continue tant que le bouton est maintenu), bouton "Puiser" (pointerdown/pointerup
   souris/tactile, Espace/Entrée en clavier), résultat par tentative, bilan final. Ancrage
   partagé "adventure-quest-modal-root" (bloquant, déjà dans BLOCKING_MODAL_IDS du game-loop).
   Détail : COMMENTAIRES_ORIGINAUX.md */

var wellModalRootId = "adventure-quest-modal-root";
var WELL_FILL_DURATION_MS = 2200; // durée pour remplir la jauge de 0 à 100%, montée linéaire

function getWellModalHost() {
  return document.getElementById(wellModalRootId);
}

function closeWellModal() {
  var host = getWellModalHost();
  if (host) host.innerHTML = "";
}
window.closeWellModal = closeWellModal;

/* --- Point d'entrée : quête "La Source Tarie" (depuis la carte Expéditions) --- */

function openDriedSpringQuest() {
  var req = WellManager.checkQuestRequirements();
  if (!req.ok) {
    showToast(req.reason, 1600);
    return;
  }
  openWellIntro("quest");
}
window.openDriedSpringQuest = openDriedSpringQuest;

/* --- Point d'entrée : activité bonus répétable (depuis Quêtes > Ressources) --- */

function openWellBonusMining() {
  var req = WellManager.checkWellBonusRequirements();
  if (!req.ok) {
    showToast(req.reason, 1400);
    return;
  }
  openWellIntro("well_bonus");
}
window.openWellBonusMining = openWellBonusMining;

/* --- Popup d'intro (bloquant), commun aux deux sources --- */

var pendingWellSource = null;
var wellStartBusy = false; // anti double-clic sur "Partir"/"Puiser"

function openWellIntro(source) {
  pendingWellSource = source;
  wellStartBusy = false;
  var host = getWellModalHost();
  if (host) host.innerHTML = buildWellIntroHTML(source);
}

function buildWellIntroHTML(source) {
  var isQuest = source === "quest";
  var quest = isQuest ? WellManager.getQuest("driedSpring") : null;
  var endurancePreview = (function () {
    if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") StatsSystem.recalcStats();
    return Number(game.heroEnduranceRaw || 0);
  })();

  var h = '<div class="full-menu-overlay">';
  h += '  <div class="full-menu dungeon-story-card">';
  h += '    <div class="dungeon-story-icon">💧</div>';
  h += '    <div class="dungeon-story-title">' + esc(isQuest ? quest.title : "Source Claire") + '</div>';

  if (isQuest) {
    h += '    <div class="dungeon-story-text">' + esc(quest.description) + '</div>';
  } else {
    h += '    <div class="dungeon-story-text">Une courte session de puisage peut fournir un petit bonus d\u2019Eau.</div>';
  }

  h += '    <div class="dungeon-story-meta">Endurance du héros : <strong>' + formatNumber(endurancePreview) + '</strong></div>';
  h += '    <div class="dungeon-story-meta">Bonus : remplissage plus stable</div>';

  h += '    <div class="dungeon-story-actions">';
  h += '      <button class="settings-btn" type="button" onclick="closeWellIntro()">Annuler</button>';
  h += '      <button class="settings-btn primary" type="button" onclick="confirmWellStart()"' + (wellStartBusy ? ' disabled' : '') + '>' + (isQuest ? 'Partir explorer' : 'Puiser l\u2019eau') + '</button>';
  h += '    </div>';
  h += '  </div>';
  h += '</div>';
  return h;
}

function closeWellIntro() {
  pendingWellSource = null;
  closeWellModal();
}
window.closeWellIntro = closeWellIntro;

function confirmWellStart() {
  if (wellStartBusy) return; // anti double-clic
  wellStartBusy = true;

  var host = getWellModalHost();
  if (host) host.innerHTML = buildWellIntroHTML(pendingWellSource);

  var result = (pendingWellSource === "quest")
    ? WellManager.startQuestSession()
    : WellManager.startWellBonusSession();

  if (!result.ok) {
    wellStartBusy = false;
    showToast(result.reason, 1800);
    closeWellIntro();
    if (typeof renderPanel === "function") renderPanel();
    return;
  }

  pendingWellSource = null;
  wellStartBusy = false;
  openWellSession();
}
window.confirmWellStart = confirmWellStart;

/* --- Session active : jauge de remplissage + bouton Puiser (maintenir/relâcher) --- */

var wellHoldActive = false; // true entre pointerdown et pointerup
var wellHoldStartedAt = 0;
var wellReleaseBusy = false; // anti double-résolution
var wellKeyListenerAttached = false;
var wellKeySpaceHeld = false; // évite le retrig continu tant que la touche reste enfoncée

function openWellSession() {
  var host = getWellModalHost();
  if (host) host.innerHTML = buildWellSessionHTML();
  attachWellKeyListener();
}
window.openWellSession = openWellSession;

function buildWellSessionHTML() {
  var session = WellManager.getActiveSession();
  if (!session) return "";

  var quest = session.questId ? WellManager.getQuest(session.questId) : null;
  var attemptCount = quest ? quest.minigame.attemptCount : 3;
  var currentAttempt = session.minigame.currentAttempt;

  var h = '<div class="full-menu-overlay">';
  h += '  <div class="full-menu dungeon-story-card well-session-card">';
  h += '    <div class="dungeon-story-title">Maintenez, puis relâchez</div>';
  h += '    <div class="well-session-progress">Tentative ' + (currentAttempt + 1) + ' / ' + attemptCount + '</div>';

  h += buildWellGaugeHTML(session);

  h += '    <button class="settings-btn primary well-draw-btn" type="button" id="well-draw-btn"'
    + ' onpointerdown="startWellHold()" onpointerup="releaseWellHold()" onpointerleave="cancelWellHold()"'
    + '>Puiser</button>';

  if (session.minigame.attempts.length > 0) {
    h += buildWellAttemptsHistoryHTML(session);
  }

  h += '  </div>';
  h += '</div>';
  return h;
}

function buildWellGaugeHTML(session) {
  var zones = WellCheckSystem.getZoneBounds(session.heroSnapshot.endurance);

  var h = '<div class="well-gauge-wrap">';
  h += '  <div class="well-gauge" id="well-gauge">';
  h += '    <div class="well-gauge-zone well-gauge-zone-tooearly" style="left:0%;width:' + zones.tooEarlyMax + '%"></div>';
  h += '    <div class="well-gauge-zone well-gauge-zone-correct" style="left:' + zones.tooEarlyMax + '%;width:' + (zones.perfectStart - zones.tooEarlyMax) + '%"></div>';
  h += '    <div class="well-gauge-zone well-gauge-zone-perfect" style="left:' + zones.perfectStart + '%;width:' + (zones.perfectEnd - zones.perfectStart) + '%"></div>';
  h += '    <div class="well-gauge-zone well-gauge-zone-correct" style="left:' + zones.perfectEnd + '%;width:' + (zones.tooLateMin - zones.perfectEnd) + '%"></div>';
  h += '    <div class="well-gauge-zone well-gauge-zone-toolate" style="left:' + zones.tooLateMin + '%;width:' + (100 - zones.tooLateMin) + '%"></div>';
  h += '    <div class="well-gauge-fill" id="well-gauge-fill"></div>';
  h += '  </div>';
  h += '</div>';
  return h;
}

function buildWellAttemptsHistoryHTML(session) {
  var labels = { tooEarly: "Trop tôt", correct: "Correct", perfect: "Parfait", tooLate: "Débordement" };
  var h = '<div class="well-attempts-history">';
  session.minigame.attempts.forEach(function (attempt) {
    h += '<span class="well-attempt-badge well-attempt-badge-' + esc(attempt.result) + '">' + esc(labels[attempt.result] || attempt.result);
    if (attempt.waterGain > 0) h += ' +' + attempt.waterGain + ' 💧';
    h += '</span>';
  });
  h += '</div>';
  return h;
}

/* Démarre le remplissage visuel (classe CSS déclenchant l'animation de largeur 0->100%
   sur WELL_FILL_DURATION_MS) au moment où le bouton est pressé (pointerdown). */
function startWellHold() {
  if (wellHoldActive) return;
  wellHoldActive = true;
  wellHoldStartedAt = Date.now();

  var fillEl = document.getElementById("well-gauge-fill");
  if (fillEl) {
    fillEl.style.transitionDuration = WELL_FILL_DURATION_MS + "ms";
    fillEl.classList.add("is-filling");
  }
}
window.startWellHold = startWellHold;

/* Lit le niveau de remplissage réel (0-100%) au moment du relâchement, via
   getBoundingClientRect sur l'élément animé — pas de calcul de timing dupliqué côté JS,
   la seule source de vérité est le rendu visuel que le joueur voit réellement. */
function readWellFillPct() {
  var gauge = document.getElementById("well-gauge");
  var fillEl = document.getElementById("well-gauge-fill");
  if (!gauge || !fillEl) return 0;

  var gaugeRect = gauge.getBoundingClientRect();
  var fillRect = fillEl.getBoundingClientRect();
  if (gaugeRect.width <= 0) return 0;

  var pct = (fillRect.width / gaugeRect.width) * 100;
  return Math.max(0, Math.min(100, pct));
}

function releaseWellHold() {
  if (!wellHoldActive || wellReleaseBusy) return;
  wellReleaseBusy = true;
  wellHoldActive = false;

  var fillPct = readWellFillPct();

  var fillEl = document.getElementById("well-gauge-fill");
  if (fillEl) {
    fillEl.style.transitionDuration = "0ms"; // fige immédiatement, pas de saut visuel
    fillEl.style.width = fillPct + "%";
    fillEl.classList.remove("is-filling");
  }

  var drawBtn = document.getElementById("well-draw-btn");
  if (drawBtn) drawBtn.disabled = true;

  var result = WellManager.resolveRelease(fillPct);
  wellReleaseBusy = false;

  if (!result.ok) {
    showToast(result.reason, 1400);
    if (drawBtn) drawBtn.disabled = false;
    return;
  }

  if (result.isLastAttempt) {
    detachWellKeyListener();
    openWellComplete();
  } else {
    openWellSession(); // re-rend pour la tentative suivante, jauge remise à zéro
  }
}
window.releaseWellHold = releaseWellHold;

/* Sécurité : si le pointeur quitte le bouton sans relâchement propre (ex. glissement hors
   du bouton sur tactile), on traite ça comme un relâchement au niveau atteint — évite de
   bloquer la session dans un état "maintenu" indéfiniment. */
function cancelWellHold() {
  if (!wellHoldActive) return;
  releaseWellHold();
}
window.cancelWellHold = cancelWellHold;

function handleWellKeyDown(e) {
  if ((e.code === "Space" || e.code === "Enter") && !wellKeySpaceHeld) {
    e.preventDefault();
    wellKeySpaceHeld = true;
    startWellHold();
  }
}

function handleWellKeyUp(e) {
  if (e.code === "Space" || e.code === "Enter") {
    e.preventDefault();
    wellKeySpaceHeld = false;
    releaseWellHold();
  }
}

function attachWellKeyListener() {
  if (wellKeyListenerAttached) return;
  document.addEventListener("keydown", handleWellKeyDown);
  document.addEventListener("keyup", handleWellKeyUp);
  wellKeyListenerAttached = true;
}

function detachWellKeyListener() {
  if (!wellKeyListenerAttached) return;
  document.removeEventListener("keydown", handleWellKeyDown);
  document.removeEventListener("keyup", handleWellKeyUp);
  wellKeyListenerAttached = false;
  wellKeySpaceHeld = false;
}

/* --- Bilan final --- */

function openWellComplete() {
  var result = WellManager.settle();
  if (!result.ok) {
    showToast(result.reason, 1600);
    return;
  }

  var host = getWellModalHost();
  if (host) host.innerHTML = buildWellCompleteHTML(result.session);

  if (typeof renderPanel === "function") renderPanel();
}
window.openWellComplete = openWellComplete;

function buildWellCompleteHTML(session) {
  if (!session) return "";
  var isQuest = session.source === "quest";
  var quest = session.questId ? WellManager.getQuest(session.questId) : null;
  var atLeastOneHit = session.minigame.attempts.some(function (a) {
    return a.result === "correct" || a.result === "perfect";
  });

  var isFailureVisual = isQuest && !atLeastOneHit;

  var h = '<div class="full-menu-overlay">';
  h += '  <div class="full-menu dungeon-story-card' + (isFailureVisual ? '' : ' is-success') + '">';
  h += '    <div class="dungeon-story-icon">' + (isFailureVisual ? '🏕️' : (isQuest ? '💧' : '🪣')) + '</div>';
  h += '    <div class="dungeon-story-title">' + (isFailureVisual ? "Source échappée" : (isQuest ? "Puits déverrouillé !" : "Puisage terminé")) + '</div>';

  if (isFailureVisual && quest) {
    h += '    <div class="dungeon-story-text">' + esc(quest.failureText) + '</div>';
  } else if (isQuest) {
    h += '    <div class="dungeon-story-text">Une Source claire peut maintenant être exploitée depuis le Puits.</div>';
  }

  h += '    <div class="dungeon-summary-rewards">';
  h += '      <div class="dungeon-summary-row"><span>💧 Eau obtenue</span><span>+' + formatNumber(session.minigame.totalWater) + '</span></div>';
  if (isQuest) {
    h += '      <div class="dungeon-summary-row"><span>🏛️ Puits</span><span>' + (atLeastOneHit ? 'Déverrouillé' : 'Non déverrouillé') + '</span></div>';
  }
  h += '    </div>';

  h += '    <button class="settings-btn primary dungeon-story-close" type="button" onclick="closeWellComplete()">Retour aux quêtes</button>';
  h += '  </div>';
  h += '</div>';
  return h;
}

function closeWellComplete() {
  WellManager.clearSession();
  closeWellModal();

  if (typeof switchTab === "function") {
    switchTab("quests");
  } else if (typeof renderPanel === "function") {
    renderPanel();
  }
}
window.closeWellComplete = closeWellComplete;

/* --- Reprise d'une session active (ex. après rechargement de page) --- */

function resumeWellSession() {
  var session = WellManager.getActiveSession();
  if (!session) return;

  if (session.status === "active") {
    openWellSession();
  } else if (session.status === "completed" && !session.settlement.rewardsGranted) {
    openWellComplete(); // résolu mais settle() pas encore appelé (cas rare, synchrone en pratique)
  } else if (session.status === "completed") {
    // Récompenses déjà créditées mais le joueur n'a pas cliqué le bouton de sortie —
    // réaffiche le même bilan SANS rappeler settle() (idempotent de toute façon).
    var host = getWellModalHost();
    if (host) host.innerHTML = buildWellCompleteHTML(session);
  }
}
window.resumeWellSession = resumeWellSession;
