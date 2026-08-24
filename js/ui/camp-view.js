"use strict";
/* ui/camp-view.js — écran Campement (page d'accueil, v3.7) : feu de camp (repos long/court), résumé des 3 systèmes de quêtes, accès rapides. Détail : COMMENTAIRES_ORIGINAUX.md */

function buildCampQuestSummaryHTML() {
  var h = "";

  if (window.WorldQuestManager && typeof getNextLockedWorldIndex === "function") {
    var idx = getNextLockedWorldIndex();
    if (idx !== -1) {
      var worldQuest = WorldQuestManager.getQuestForWorldIndex(idx);
      if (worldQuest) {
        var stepsDone = worldQuest.steps.filter(function (s) { return WorldQuestManager.isStepComplete(worldQuest, s); }).length;
        h += '<div class="camp-summary-row"><span>🗺️ ' + esc(worldQuest.name) + '</span><span>' + stepsDone + '/' + worldQuest.steps.length + ' étapes</span></div>';
      }
    }
  }

  if (window.AdventureQuestManager) {
    var runningQuest = AdventureQuestManager.getRunningQuest();
    if (runningQuest) {
      h += '<div class="camp-summary-row"><span>🧭 ' + esc(runningQuest.name) + '</span><span class="camp-summary-highlight">En cours</span></div>';
    } else {
      var allQuests = AdventureQuestManager.getAllQuests();
      var availableCount = allQuests.filter(function (q) { return !game.adventureQuestsCompleted[q.id]; }).length;
      if (availableCount > 0) {
        h += '<div class="camp-summary-row"><span>🧭 Quêtes d\'aventure</span><span>' + availableCount + ' disponible' + (availableCount > 1 ? "s" : "") + '</span></div>';
      }
    }
  }

  if (Array.isArray(game.quests) && window.QuestManager) {
    var readyToClaim = game.quests.filter(function (q) { return !q.claimed && QuestManager.isComplete(q); }).length;
    var stillActive = game.quests.filter(function (q) { return !q.claimed && !QuestManager.isComplete(q); }).length;
    if (readyToClaim > 0) {
      h += '<div class="camp-summary-row"><span>📋 Quêtes journalières</span><span class="camp-summary-highlight">' + readyToClaim + ' prête' + (readyToClaim > 1 ? "s" : "") + ' à réclamer</span></div>';
    } else if (stillActive > 0) {
      h += '<div class="camp-summary-row"><span>📋 Quêtes journalières</span><span>' + stillActive + ' en cours</span></div>';
    }
  }

  if (!h) h = '<div class="camp-summary-row camp-summary-empty">Rien à signaler pour l\'instant.</div>';

  return h;
}

function buildCampHTML() {
  if (window.CampManager) CampManager.ensureDefaults();

  var longReady = window.CampManager ? CampManager.isLongReady() : true;
  var longRemainingMs = window.CampManager ? CampManager.getLongRemainingMs() : 0;
  var shortReady = window.CampManager ? CampManager.isShortReady() : true;
  var shortRemainingMs = window.CampManager ? CampManager.getShortRemainingMs() : 0;

  var h = '<div class="nb-page-frame camp-page">';

  h += '<div class="camp-hero-title">🏕️ Campement</div>';
  h += '<div class="camp-hero-sub">Ton point de ralliement entre deux expéditions.</div>';

  if (game.justDied) {
    h += '<div class="camp-death-banner">💀 Tu es tombé au combat, PV à 0. Repose-toi avant de repartir à l\'aventure.</div>';
    game.justDied = false;
  }

  h += '<div class="camp-fire-row">';

  h += '<div class="camp-card camp-fire-card">';
  h += '<div class="camp-fire-icon">🔥</div>';
  h += '<div class="camp-fire-title">Long repos</div>';
  h += '<div class="camp-fire-desc">PV au maximum. Toutes les 30 min.</div>';
  if (longReady) {
    h += '<button class="settings-btn primary" type="button" onclick="CampManager.useLongRest(); if (typeof renderPanel === \'function\') renderPanel();">Se reposer</button>';
  } else {
    h += '<button class="settings-btn camp-fire-btn-cooldown" type="button" disabled>' + esc(formatTime(Math.ceil(longRemainingMs / 1000))) + '</button>';
  }
  h += '</div>';

  h += '<div class="camp-card camp-fire-card">';
  h += '<div class="camp-fire-icon">🪵</div>';
  h += '<div class="camp-fire-title">Repos court</div>';
  h += '<div class="camp-fire-desc">50% des PV max. Toutes les 15 min.</div>';
  if (shortReady) {
    h += '<button class="settings-btn primary" type="button" onclick="CampManager.useShortRest(); if (typeof renderPanel === \'function\') renderPanel();">Se reposer</button>';
  } else {
    h += '<button class="settings-btn camp-fire-btn-cooldown" type="button" disabled>' + esc(formatTime(Math.ceil(shortRemainingMs / 1000))) + '</button>';
  }
  h += '</div>';

  h += '</div>';

  h += '<div class="camp-card">';
  h += '<div class="camp-card-title">📜 Résumé des quêtes</div>';
  h += buildCampQuestSummaryHTML();
  h += '<button class="settings-btn" type="button" onclick="switchTab(\'quests\')">Voir toutes les quêtes</button>';
  h += '</div>';

  h += '<div class="camp-card">';
  h += '<div class="camp-card-title">Accès rapide</div>';
  h += '<div class="camp-quick-access">';
  h += '<button class="camp-quick-btn" type="button" onclick="switchTab(\'more\')"><img src="./images/Icons/menu_icons/heroes_menu.png" alt=""><span>Personnage</span></button>';
  h += '<button class="camp-quick-btn" type="button" onclick="switchTab(\'equip\')"><img src="./images/Icons/menu_icons/equip_menu.png" alt=""><span>Équipement</span></button>';
  h += '<button class="camp-quick-btn" type="button" onclick="switchTab(\'quests\')"><img src="./images/Icons/menu_icons/quests_menu.png" alt=""><span>Quêtes</span></button>';
  h += '</div>';
  h += '</div>';

  h += '</div>';
  return h;
}

window.buildCampHTML = buildCampHTML;
window.buildCampQuestSummaryHTML = buildCampQuestSummaryHTML;
