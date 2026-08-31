"use strict";
/* ui/camp-view.js — écran Campement (page d'accueil, v3.7) : feu de camp (repos long/court), résumé des 3 systèmes de quêtes, accès rapides. Détail : COMMENTAIRES_ORIGINAUX.md */

function buildCampQuestSummaryHTML() {
  var h = "";

  // v3.100.0 : étape Histoire courante en premier, avec accès direct (StoryQuestManager)
  if (window.StoryQuestManager && window.STORY_QUESTS) {
    Object.keys(STORY_QUESTS).forEach(function (chapterId) {
      var step = StoryQuestManager.getCurrentStep(chapterId);
      if (!step) return;
      var status = !StoryQuestManager.isCurrentStepAccepted(chapterId) ? "À accepter"
        : StoryQuestManager.isCurrentStepReady(chapterId) ? "Prête à réclamer"
        : (step.progress(game) || "En cours");
      var highlight = status === "À accepter" || status === "Prête à réclamer";
      h += '<div class="camp-summary-row camp-summary-story" onclick="openQuestsAt(\'worldexpedition\')"><span>📖 ' + esc(step.title) + '</span><span' + (highlight ? ' class="camp-summary-highlight"' : '') + '>' + esc(status) + ' ›</span></div>';
    });
  }

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

  // v3.101.0 (P3-lite) : régénération lente + Repas, plus de repos à horloge.
  if (window.CampManager) CampManager.applyRegen(false);
  var maxHp = game.heroMaxHp || 1;
  var hp = game.heroHp != null ? game.heroHp : maxHp;
  var hpFull = hp >= maxHp;
  var regenPct = window.CampManager ? Math.round(CampManager.getRegenPctPerMin() * 100) : 5;
  var minutesToFull = window.CampManager ? CampManager.getMinutesToFull() : 0;
  var mealCost = window.CampManager ? CampManager.getMealCost() : { viande: 5, eau: 2 };
  var canEat = window.CampManager ? CampManager.canEat() : false;
  var viandeStock = window.WarehouseManager ? WarehouseManager.getAmount("viande") : 0;
  var eauStock = window.WarehouseManager ? WarehouseManager.getAmount("eau") : 0;

  var h = '<div class="nb-page-frame camp-page">';

  h += '<div class="camp-hero-title">🏕️ Campement</div>';
  h += '<div class="camp-hero-sub">Ton point de ralliement entre deux expéditions.</div>';

  if (game.justDied) {
    h += '<div class="camp-death-banner">💀 Tu es tombé au combat. Mange, ou laisse le feu faire son œuvre, avant de repartir.</div>';
    game.justDied = false;
  }

  h += '<div class="camp-fire-row">';

  h += '<div class="camp-card camp-fire-card">';
  h += '<div class="camp-fire-icon">🔥</div>';
  h += '<div class="camp-fire-title">Feu de camp</div>';
  h += '<div class="camp-fire-desc">+' + regenPct + ' % PV par minute hors combat.</div>';
  h += '<div class="camp-fire-hp" id="camp-fire-hp-value">' + formatNumber(Math.floor(hp)) + ' / ' + formatNumber(maxHp) + ' PV</div>';
  h += '<button class="settings-btn camp-fire-btn-cooldown" id="camp-fire-eta" type="button" disabled>' + (hpFull ? 'PV au maximum' : esc('Max dans ' + formatTime(Math.ceil(minutesToFull * 60)))) + '</button>';
  h += '</div>';

  h += '<div class="camp-card camp-fire-card">';
  h += '<div class="camp-fire-icon">🍖</div>';
  h += '<div class="camp-fire-title">Repas</div>';
  h += '<div class="camp-fire-desc">PV au maximum. ' + mealCost.viande + ' viande + ' + mealCost.eau + ' eau.</div>';
  h += '<div class="camp-fire-hp' + (canEat ? '' : ' is-short') + '">' + formatNumber(viandeStock) + ' viande · ' + formatNumber(eauStock) + ' eau</div>';
  if (hpFull) {
    h += '<button class="settings-btn camp-fire-btn-cooldown" type="button" disabled>Pas faim</button>';
  } else if (canEat) {
    h += '<button class="settings-btn primary" type="button" onclick="CampManager.eat();">Manger</button>';
  } else {
    h += '<button class="settings-btn camp-fire-btn-cooldown" type="button" disabled>Garde-manger vide</button>';
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
