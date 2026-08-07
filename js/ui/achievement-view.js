"use strict";
/* ============================================================
Quest Idle — ui/achievement-view.js
Écran "Hauts faits" : carte de détail en haut pour le haut fait
sélectionné (comme le Bestiaire), grille de toutes les cartes en
dessous, groupées par catégorie.
============================================================ */

function getAchievementSelectedId() {
  var ids = (ACHIEVEMENTS_DB || []).map(function (a) { return a.id; });
  if (!ids.length) return null;
  if (!game.achievementSelectedId || ids.indexOf(game.achievementSelectedId) === -1) {
    // Sélectionne par défaut le premier haut fait prêt à réclamer, sinon le premier tout court.
    var ready = ACHIEVEMENTS_DB.find(function (a) {
      return !AchievementManager.isClaimed(a.id) && AchievementManager.isComplete(a);
    });
    game.achievementSelectedId = ready ? ready.id : ids[0];
  }
  return game.achievementSelectedId;
}

function selectAchievement(id) {
  game.achievementSelectedId = id;
  if (typeof renderPanel === "function") renderPanel();
}

function formatAchievementRewardText(reward) {
  var parts = [];
  if (reward.tapMult) parts.push("+" + Math.round(reward.tapMult * 100) + "% dégâts");
  if (reward.goldMult) parts.push("+" + Math.round(reward.goldMult * 100) + "% or");
  if (reward.essenceGlobalMult) parts.push("+" + Math.round(reward.essenceGlobalMult * 100) + "% essence");
  return parts.join(" • ");
}

function buildAchievementDetailHTML(id) {
  var ach = AchievementManager.getById(id);
  if (!ach) return "";

  var progress = AchievementManager.getProgress(ach);
  var target = ach.target;
  var pct = Math.max(0, Math.min(100, Math.round((progress / target) * 100)));
  var complete = AchievementManager.isComplete(ach);
  var claimed = AchievementManager.isClaimed(id);

  var h = '<div class="achievement-detail' + (claimed ? ' is-claimed' : complete ? ' is-ready' : '') + '">';
  h += '<div class="achievement-detail-icon">' + esc(ach.icon) + '</div>';
  h += '<div class="achievement-detail-name">' + esc(ach.name) + '</div>';
  h += '<div class="achievement-detail-category">' + esc(ACHIEVEMENT_CATEGORY_LABELS[ach.category] || ach.category) + '</div>';
  h += '<div class="achievement-detail-desc">' + esc(ach.desc) + '</div>';

  h += '<div class="achievement-progress-bar"><div class="achievement-progress-fill" style="width:' + pct + '%"></div></div>';
  h += '<div class="achievement-progress-text">' + formatNumber(Math.min(progress, target)) + ' / ' + formatNumber(target) + '</div>';

  h += '<div class="achievement-reward-text">🎁 ' + esc(formatAchievementRewardText(ach.reward)) + '</div>';

  if (claimed) {
    h += '<div class="achievement-claimed-badge">✔ Réclamé</div>';
  } else if (complete) {
    h += '<button class="settings-btn primary" type="button" onclick="AchievementManager.claim(\'' + esc(id) + '\')">Réclamer</button>';
  } else {
    h += '<div class="achievement-locked-text">En cours...</div>';
  }

  h += '</div>';
  return h;
}

function buildAchievementGridHTML(selectedId) {
  var h = '';
  var categories = ["combat", "ascension", "bestiary", "equipment", "dungeon"];

  categories.forEach(function (cat) {
    var items = (ACHIEVEMENTS_DB || []).filter(function (a) { return a.category === cat; });
    if (!items.length) return;

    h += '<div class="achievement-category-label">' + esc(ACHIEVEMENT_CATEGORY_LABELS[cat] || cat) + '</div>';
    h += '<div class="achievement-grid">';

    items.forEach(function (ach) {
      var claimed = AchievementManager.isClaimed(ach.id);
      var complete = AchievementManager.isComplete(ach);
      var isSelected = ach.id === selectedId;

      var classes = ["achievement-grid-item"];
      if (claimed) classes.push("is-claimed");
      else if (complete) classes.push("is-ready");
      if (isSelected) classes.push("is-selected");

      h += '<button class="' + classes.join(" ") + '" type="button" onclick="selectAchievement(\'' + esc(ach.id) + '\')" title="' + esc(ach.name) + '">';
      h += '<span class="achievement-grid-icon">' + esc(ach.icon) + '</span>';
      if (claimed) h += '<span class="achievement-grid-check">✔</span>';
      h += '</button>';
    });

    h += '</div>';
  });

  return h;
}

function buildAchievementsHTML() {
  var selectedId = getAchievementSelectedId();
  var claimedCount = AchievementManager.getClaimedCount();
  var total = (ACHIEVEMENTS_DB || []).length;

  var h = '<div class="achievement-summary">' + claimedCount + ' / ' + total + ' réclamés</div>';

  if (selectedId) h += buildAchievementDetailHTML(selectedId);
  h += buildAchievementGridHTML(selectedId);

  return h;
}

window.buildAchievementsHTML = buildAchievementsHTML;
window.selectAchievement = selectAchievement;
window.getAchievementSelectedId = getAchievementSelectedId;
