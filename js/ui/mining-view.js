"use strict";
/* ui/mining-view.js — popups du minijeu de minage : préparation/lancement (quête "La Veine
   Instable" ET activité bonus répétable de la Carrière), jauge horizontale animée en CSS
   (curseur aller-retour), bouton "Frapper" (clic/tap, Espace/Entrée en clavier), résultat par
   coup, bilan final. Ancrage partagé "adventure-quest-modal-root" (bloquant, déjà dans
   BLOCKING_MODAL_IDS du game-loop). Détail : COMMENTAIRES_ORIGINAUX.md */

var miningModalRootId = "adventure-quest-modal-root";

function getMiningModalHost() {
  return document.getElementById(miningModalRootId);
}

function closeMiningModal() {
  var host = getMiningModalHost();
  if (host) host.innerHTML = "";
}
window.closeMiningModal = closeMiningModal;

/* --- Point d'entrée : quête "La Veine Instable" (depuis la carte Expéditions) --- */

function openUnstableVeinQuest() {
  var req = MiningManager.checkQuestRequirements();
  if (!req.ok) {
    showToast(req.reason, 1600);
    return;
  }
  openMiningIntro("quest");
}
window.openUnstableVeinQuest = openUnstableVeinQuest;

/* --- Point d'entrée : activité bonus répétable (depuis le panneau Carrière) --- */

function openQuarryBonusMining() {
  var req = MiningManager.checkQuarryBonusRequirements();
  if (!req.ok) {
    showToast(req.reason, 1400);
    return;
  }
  openMiningIntro("quarry_bonus");
}
window.openQuarryBonusMining = openQuarryBonusMining;

/* --- Popup d'intro (bloquant), commun aux deux sources --- */

var pendingMiningSource = null;
var miningStartBusy = false; // anti double-clic sur "Partir"/"Miner"

function openMiningIntro(source) {
  pendingMiningSource = source;
  miningStartBusy = false;
  var host = getMiningModalHost();
  if (host) host.innerHTML = buildMiningIntroHTML(source);
}

function buildMiningIntroHTML(source) {
  var isQuest = source === "quest";
  var quest = isQuest ? MiningManager.getQuest("unstableVein") : null;
  var precisionPreview = (function () {
    if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") StatsSystem.recalcStats();
    return Number(game.heroPrecisionRaw || 0);
  })();

  var h = '<div class="full-menu-overlay">';
  h += '  <div class="full-menu dungeon-story-card">';
  h += '    <div class="dungeon-story-icon">⛏️</div>';
  h += '    <div class="dungeon-story-title">' + esc(isQuest ? quest.title : "Veine Instable") + '</div>';

  if (isQuest) {
    h += '    <div class="dungeon-story-text">' + esc(quest.description) + '</div>';
  } else {
    h += '    <div class="dungeon-story-text">Une courte session de récolte peut fournir un petit bonus de Pierre.</div>';
  }

  h += '    <div class="dungeon-story-meta">Précision du héros : <strong>' + formatNumber(precisionPreview) + '</strong></div>';
  h += '    <div class="dungeon-story-meta">Bonus : fenêtre parfaite élargie</div>';

  if (isQuest) {
    h += '    <div class="dungeon-story-meta">Coût : <strong>1 petite ration</strong></div>';
  }

  h += '    <div class="dungeon-story-actions">';
  h += '      <button class="settings-btn" type="button" onclick="closeMiningIntro()">Annuler</button>';
  h += '      <button class="settings-btn primary" type="button" onclick="confirmMiningStart()"' + (miningStartBusy ? ' disabled' : '') + '>' + (isQuest ? 'Partir explorer' : 'Miner la veine') + '</button>';
  h += '    </div>';
  h += '  </div>';
  h += '</div>';
  return h;
}

function closeMiningIntro() {
  pendingMiningSource = null;
  closeMiningModal();
}
window.closeMiningIntro = closeMiningIntro;

function confirmMiningStart() {
  if (miningStartBusy) return; // anti double-clic
  miningStartBusy = true;

  var host = getMiningModalHost();
  if (host) host.innerHTML = buildMiningIntroHTML(pendingMiningSource);

  var result = (pendingMiningSource === "quest")
    ? MiningManager.startQuestSession()
    : MiningManager.startQuarryBonusSession();

  if (!result.ok) {
    miningStartBusy = false;
    showToast(result.reason, 1800);
    closeMiningIntro();
    if (typeof renderPanel === "function") renderPanel();
    return;
  }

  pendingMiningSource = null;
  miningStartBusy = false;
  openMiningSession();
}
window.confirmMiningStart = confirmMiningStart;

/* --- Session active : jauge animée + bouton Frapper --- */

var miningHitBusy = false; // anti double-clic sur "Frapper"
var miningKeyListenerAttached = false;

function openMiningSession() {
  var host = getMiningModalHost();
  if (host) host.innerHTML = buildMiningSessionHTML();
  attachMiningKeyListener();
}
window.openMiningSession = openMiningSession;

function buildMiningSessionHTML() {
  var session = MiningManager.getActiveSession();
  if (!session) return "";

  var quest = session.questId ? MiningManager.getQuest(session.questId) : null;
  var hitCount = quest ? quest.minigame.hitCount : 3;
  var currentHit = session.minigame.currentHit;

  var h = '<div class="full-menu-overlay">';
  h += '  <div class="full-menu dungeon-story-card mining-session-card">';
  h += '    <div class="dungeon-story-title">Frappez au bon moment</div>';
  h += '    <div class="mining-session-progress">Coup ' + (currentHit + 1) + ' / ' + hitCount + '</div>';

  h += buildMiningGaugeHTML(session);

  h += '    <button class="settings-btn primary mining-strike-btn" type="button" id="mining-strike-btn" onclick="resolveMiningHit()"' + (miningHitBusy ? ' disabled' : '') + '>Frapper</button>';

  if (session.minigame.hits.length > 0) {
    h += buildMiningHitsHistoryHTML(session);
  }

  h += '  </div>';
  h += '</div>';
  return h;
}

function buildMiningGaugeHTML(session) {
  var zones = MiningCheckSystem.getZoneHalfWidths(session.heroSnapshot.precision);
  var perfectLeft = 50 - zones.perfectHalf;
  var perfectWidth = zones.perfectHalf * 2;
  var correctLeftOuter = 50 - zones.correctHalf;
  var correctWidth = zones.correctHalf * 2;

  var h = '<div class="mining-gauge-wrap">';
  h += '  <div class="mining-gauge" id="mining-gauge">';
  h += '    <div class="mining-gauge-zone mining-gauge-zone-miss"></div>';
  h += '    <div class="mining-gauge-zone mining-gauge-zone-correct" style="left:' + correctLeftOuter + '%;width:' + correctWidth + '%"></div>';
  h += '    <div class="mining-gauge-zone mining-gauge-zone-perfect" style="left:' + perfectLeft + '%;width:' + perfectWidth + '%"></div>';
  h += '    <div class="mining-gauge-cursor" id="mining-gauge-cursor"></div>';
  h += '  </div>';
  h += '</div>';
  return h;
}

function buildMiningHitsHistoryHTML(session) {
  var labels = { perfect: "Parfait", correct: "Correct", miss: "Manqué" };
  var h = '<div class="mining-hits-history">';
  session.minigame.hits.forEach(function (hit) {
    h += '<span class="mining-hit-badge mining-hit-badge-' + esc(hit.result) + '">' + esc(labels[hit.result] || hit.result);
    if (hit.stoneGain > 0) h += ' +' + hit.stoneGain + ' 🪨';
    if (hit.ironOreGain > 0) h += ' +' + hit.ironOreGain + ' ⚙️';
    h += '</span>';
  });
  h += '</div>';
  return h;
}

/* Lit la position actuelle du curseur CSS (0-100%) au moment du clic, via getBoundingClientRect
   sur l'élément animé — pas de calcul de timing dupliqué côté JS, la seule source de vérité de
   la position est le rendu visuel que le joueur voit réellement. */
function readMiningCursorPositionPct() {
  var gauge = document.getElementById("mining-gauge");
  var cursor = document.getElementById("mining-gauge-cursor");
  if (!gauge || !cursor) return 50;

  var gaugeRect = gauge.getBoundingClientRect();
  var cursorRect = cursor.getBoundingClientRect();
  if (gaugeRect.width <= 0) return 50;

  var cursorCenterX = cursorRect.left + cursorRect.width / 2;
  var pct = ((cursorCenterX - gaugeRect.left) / gaugeRect.width) * 100;
  return Math.max(0, Math.min(100, pct));
}

function resolveMiningHit() {
  if (miningHitBusy) return; // anti double-clic
  miningHitBusy = true;

  var hitPositionPct = readMiningCursorPositionPct();

  var strikeBtn = document.getElementById("mining-strike-btn");
  if (strikeBtn) strikeBtn.disabled = true;

  var result = MiningManager.resolveHit(hitPositionPct);
  miningHitBusy = false;

  if (!result.ok) {
    showToast(result.reason, 1400);
    if (strikeBtn) strikeBtn.disabled = false;
    return;
  }

  if (result.isLastHit) {
    detachMiningKeyListener();
    openMiningComplete();
  } else {
    openMiningSession(); // re-rend pour le coup suivant, relance l'animation de la jauge
  }
}
window.resolveMiningHit = resolveMiningHit;

function handleMiningKeyPress(e) {
  if (e.code === "Space" || e.code === "Enter") {
    e.preventDefault();
    resolveMiningHit();
  }
}

function attachMiningKeyListener() {
  if (miningKeyListenerAttached) return;
  document.addEventListener("keydown", handleMiningKeyPress);
  miningKeyListenerAttached = true;
}

function detachMiningKeyListener() {
  if (!miningKeyListenerAttached) return;
  document.removeEventListener("keydown", handleMiningKeyPress);
  miningKeyListenerAttached = false;
}

/* --- Bilan final --- */

function openMiningComplete() {
  var result = MiningManager.settle();
  if (!result.ok) {
    showToast(result.reason, 1600);
    return;
  }

  var host = getMiningModalHost();
  if (host) host.innerHTML = buildMiningCompleteHTML(result.session, result.questSucceeded);

  if (typeof renderPanel === "function") renderPanel();
}
window.openMiningComplete = openMiningComplete;

function buildMiningCompleteHTML(session, questSucceeded) {
  if (!session) return "";
  var isQuest = session.source === "quest";
  var quest = session.questId ? MiningManager.getQuest(session.questId) : null;
  var atLeastOneHit = session.minigame.hits.some(function (h) { return h.result !== "miss"; });

  var isFailureVisual = isQuest && !atLeastOneHit;

  var h = '<div class="full-menu-overlay">';
  h += '  <div class="full-menu dungeon-story-card' + (isFailureVisual ? '' : ' is-success') + '">';
  h += '    <div class="dungeon-story-icon">' + (isFailureVisual ? '🏕️' : (isQuest ? '🌿' : '🪨')) + '</div>';
  h += '    <div class="dungeon-story-title">' + (isFailureVisual ? "Veine refermée" : (isQuest ? "Carrière déverrouillée !" : "Récolte terminée")) + '</div>';

  if (isFailureVisual && quest) {
    h += '    <div class="dungeon-story-text">' + esc(quest.failureText) + '</div>';
  } else if (isQuest) {
    h += '    <div class="dungeon-story-text">Une Veine instable peut maintenant être exploitée depuis la Carrière.</div>';
  }

  h += '    <div class="dungeon-summary-rewards">';
  h += '      <div class="dungeon-summary-row"><span>🪨 Pierre obtenue</span><span>+' + formatNumber(session.minigame.totalStone) + '</span></div>';
  if (session.minigame.totalIronOre > 0) {
    h += '      <div class="dungeon-summary-row"><span>⚙️ Minerai de fer</span><span>+' + formatNumber(session.minigame.totalIronOre) + '</span></div>';
  }
  if (isQuest) {
    h += '      <div class="dungeon-summary-row"><span>🏛️ Carrière</span><span>' + (atLeastOneHit ? 'Déverrouillée' : 'Non déverrouillée') + '</span></div>';
  }
  h += '    </div>';

  h += '    <button class="settings-btn primary dungeon-story-close" type="button" onclick="closeMiningComplete()">Retour aux quêtes</button>';
  h += '  </div>';
  h += '</div>';
  return h;
}

function closeMiningComplete() {
  MiningManager.clearSession();
  closeMiningModal();

  // v3.92.1 : les deux sources (quête et activité bonus) vivent désormais dans l'écran
  // Quêtes > Ressources (retour Seb — plus dans Production) -> même redirection.
  if (typeof switchTab === "function") {
    switchTab("quests");
  } else if (typeof renderPanel === "function") {
    renderPanel();
  }
}
window.closeMiningComplete = closeMiningComplete;

/* --- Reprise d'une session active (ex. après rechargement de page) --- */

function resumeMiningSession() {
  var session = MiningManager.getActiveSession();
  if (!session) return;

  if (session.status === "active") {
    openMiningSession();
  } else if (session.status === "completed" && !session.settlement.rewardsGranted) {
    openMiningComplete(); // résolu mais settle() pas encore appelé (cas rare, synchrone en pratique)
  } else if (session.status === "completed") {
    // Récompenses déjà créditées mais le joueur n'a pas cliqué le bouton de sortie —
    // réaffiche le même bilan SANS rappeler settle() (idempotent de toute façon).
    var host = getMiningModalHost();
    var questSucceeded = session.source === "quest" && session.minigame.hits.some(function (h) { return h.result !== "miss"; });
    if (host) host.innerHTML = buildMiningCompleteHTML(session, questSucceeded);
  }
}
window.resumeMiningSession = resumeMiningSession;
