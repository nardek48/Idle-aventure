"use strict";
/* ============================================================
Quest Idle — ui/quests-view.js
Écran "Quêtes" + badge de notification unifié sur le bouton Menu
(pastille numérique, hors du panneau lui-même).

v2.14 : le badge (toujours nommé updateQuestBadge pour ne pas casser
tous ses appels existants) agrège maintenant 3 sources d'attention :
quêtes prêtes à réclamer + hauts faits prêts à réclamer + ticket de
donjon disponible et non utilisé — plutôt que les quêtes seules.
============================================================ */

/* Pastille numérique sur le bouton Menu, agrégeant tout ce qui mérite
   l'attention du joueur. Appelée après quasiment chaque action de jeu
   (achat, kill, ascension...). */
function updateQuestBadge() {
  var badge = document.getElementById("quest-badge");
  if (!badge) return;

  var questsReady = Array.isArray(game.quests)
    ? game.quests.filter(function (q) { return !q.claimed && QuestManager.isComplete(q); }).length
    : 0;

  var achievementsReady = (window.AchievementManager && typeof AchievementManager.getAvailableToClaimCount === "function")
    ? AchievementManager.getAvailableToClaimCount()
    : 0;

  var dungeonTicketReady = 0;
  if (window.DungeonManager && typeof DungeonManager.checkTicketReset === "function") {
    DungeonManager.checkTicketReset();
    if ((game.dungeonTickets || 0) > 0 && !(game.dungeonRun && game.dungeonRun.active)) {
      dungeonTicketReady = 1;
    }
  }

  var total = questsReady + achievementsReady + dungeonTicketReady;
  badge.textContent = total > 0 ? String(total) : "";
  badge.style.display = total > 0 ? "inline-flex" : "none";

  var reminder = document.getElementById("dungeon-reminder-banner");
  if (reminder) reminder.style.display = dungeonTicketReady > 0 ? "block" : "none";
}

function buildQuestsHTML() {
  var h = '<div class="panel-title">Quêtes journalières</div>';

  // NB : "Raid" n'a toujours pas de onclick (aucun mode de jeu associé) —
  // purement décoratif pour l'instant. "Donjon" navigue vers le nouvel
  // écran Donjon (voir ui/dungeon-view.js).
  h += '<div class="quest-top-actions">';
  h += '<button class="quest-mode-btn" type="button">Raid</button>';
  h += '<button class="quest-mode-btn" type="button" onclick="switchTab(\'dungeon\')">Donjon</button>';
  h += '</div>';

  h += '<div class="quest-timer">Reset dans ' + esc(QuestManager.timeUntilReset()) + '</div>';

  if (!game.quests || !game.quests.length) {
    h += '<div class="eq-empty">Aucune quête active.</div>';
    return h;
  }

  h += '<div class="quest-list">';
  game.quests.forEach(function (q) {
    var progress = QuestManager.getProgress(q);
    var done = QuestManager.isComplete(q);
    var claimed = !!q.claimed;
    var pct = Math.min(100, (progress / q.target) * 100);

    h += '<div class="quest-card ' + (claimed ? 'completed' : '') + '">';
    h += '<div class="quest-header"><span class="quest-icon">' + esc(q.icon) + '</span><span class="quest-name">' + esc(q.name) + '</span></div>';
    h += '<div class="quest-desc">' + esc(q.desc) + '</div>';
    h += '<div class="quest-progress-bar"><div class="quest-progress-fill ' + (done ? 'done' : '') + '" style="width:' + pct + '%"></div></div>';
    h += '<div class="quest-progress-text"><span>' + Math.min(progress, q.target) + ' / ' + q.target + '</span><span class="quest-reward">' + formatNumber(q.rewardGold || 0) + ' or · ' + formatNumber(q.rewardEssence || 0) + ' essence</span></div>';

    if (claimed) {
      h += '<button class="quest-claim-btn" disabled>Réclamée</button>';
    } else if (done) {
      h += '<button class="quest-claim-btn" onclick="QuestManager.claim(\'' + esc(q.id) + '\')">Réclamer</button>';
    } else {
      h += '<button class="quest-claim-btn" disabled>En cours</button>';
    }

    h += '</div>';
  });
  h += '</div>';

  return h;
}

window.updateQuestBadge = updateQuestBadge;
window.buildQuestsHTML = buildQuestsHTML;
