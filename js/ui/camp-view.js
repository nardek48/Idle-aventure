"use strict";
/* ============================================================
Aethervale — ui/camp-view.js
v3.7 : écran "Campement" — nouvelle page d'accueil du jeu (premier
bouton de la barre du bas, onglet actif par défaut à l'ouverture).
Point de ralliement entre deux sessions actives : feu de camp (soin
gratuit, voir systems/camp-system.js), résumé condensé des quêtes en
cours (les 3 systèmes de quêtes du jeu : questline de déblocage de
monde, quêtes d'aventure, quêtes journalières — le détail complet de
chacune reste dans l'onglet Quêtes, ce résumé ne fait que pointer
vers lui), et accès rapides à Personnage/Équipement/Quêtes.
============================================================ */

/* Condensé des 3 systèmes de quêtes — une ligne par système avec du
   contenu à signaler, rien s'il n'y a vraiment rien en cours. */
function buildCampQuestSummaryHTML() {
  var h = "";

  // 1) Questline de déblocage de monde (la toute prochaine, voir
  //    getNextLockedWorldIndex(), ui/quests-view.js).
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

  // 2) Quêtes d'aventure (run en cours en priorité, sinon combien de
  //    dispo).
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

  // 3) Quêtes journalières.
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

  // v3.14 : message affiché UNE SEULE fois juste après une mort (voir
  // game.justDied, mis à true par CombatEngine.onHeroDefeated() dans
  // sa branche normale — pas en donjon/run de quête, qui ont déjà
  // leur propre message dédié). Effacé immédiatement après lecture.
  // v3.15 : les PV sont réellement à 0 à ce stade (plus une simple
  // mise en scène) — le message reflète maintenant une vraie
  // nécessité, pas juste une ambiance.
  if (game.justDied) {
    h += '<div class="camp-death-banner">💀 Tu es tombé au combat, PV à 0. Repose-toi avant de repartir à l\'aventure.</div>';
    game.justDied = false;
  }

  // --- Feu de camp : long repos (30 min, 100% PV) vs repos court
  //     (15 min, 50% PV) — v3.14, deux cooldowns indépendants, voir
  //     systems/camp-system.js. ---
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

  // --- Résumé des quêtes ---
  h += '<div class="camp-card">';
  h += '<div class="camp-card-title">📜 Résumé des quêtes</div>';
  h += buildCampQuestSummaryHTML();
  h += '<button class="settings-btn" type="button" onclick="switchTab(\'quests\')">Voir toutes les quêtes</button>';
  h += '</div>';

  // --- Accès rapides ---
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
