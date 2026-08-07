"use strict";
/* ============================================================
Quest Idle — ui/achievement-view.js
Écran "Hauts faits".

v2.82 : passage d'une grille d'icônes + un seul détail affiché en
dessous à une liste complète (une carte par haut fait, toutes les
infos visibles directement), même principe que Quêtes/Bestiaire —
voir css/00-components.css pour le composant partagé ".nb-entry-card".
============================================================ */

function formatAchievementRewardText(reward) {
  var parts = [];
  if (reward.tapMult) parts.push("+" + Math.round(reward.tapMult * 100) + "% dégâts");
  if (reward.goldMult) parts.push("+" + Math.round(reward.goldMult * 100) + "% or");
  if (reward.essenceGlobalMult) parts.push("+" + Math.round(reward.essenceGlobalMult * 100) + "% essence");
  return parts.join(" • ");
}

/* Une carte de haut fait : icône, nom, description, barre de
   progression, récompense, et un statut à droite (bouton "Réclamer"
   si complet, "✔ Réclamé" si déjà pris, "En cours" sinon). */
function buildAchievementCardHTML(ach) {
  var progress = AchievementManager.getProgress(ach);
  var target = ach.target;
  var pct = Math.max(0, Math.min(100, Math.round((progress / target) * 100)));
  var complete = AchievementManager.isComplete(ach);
  var claimed = AchievementManager.isClaimed(ach.id);

  var h = '<div class="nb-entry-card' + (claimed ? ' is-claimed' : complete ? ' is-complete' : '') + '">';
  h += '<div class="nb-entry-icon-col"><div class="nb-entry-icon-frame">' + renderIconOrEmojiHTML(ach.icon, "nb-entry-icon", ach.name) + '</div></div>';
  h += '<div class="nb-entry-info-col">';
  h += '<div class="nb-entry-name">' + esc(ach.name) + '</div>';
  h += '<div class="nb-entry-desc">' + esc(ach.desc) + '</div>';
  h += '<div class="nb-entry-progress-bar"><div class="nb-entry-progress-fill' + (complete ? ' done' : '') + '" style="width:' + pct + '%"></div><span class="nb-entry-progress-text">' + formatNumber(Math.min(progress, target)) + ' / ' + formatNumber(target) + '</span></div>';
  h += '<div class="nb-entry-meta">🎁 ' + esc(formatAchievementRewardText(ach.reward)) + '</div>';
  h += '</div>';

  h += '<div class="nb-entry-status-col">';
  if (claimed) {
    h += '<span class="nb-entry-status-label is-complete">✔ Réclamé</span>';
  } else if (complete) {
    h += '<button class="btn-buy" type="button" onclick="AchievementManager.claim(\'' + esc(ach.id) + '\')">Réclamer</button>';
  } else {
    h += '<span class="nb-entry-status-label">En cours</span>';
  }
  h += '</div>';

  h += '</div>';
  return h;
}

function buildAchievementListHTML() {
  var h = '';
  var categories = ["combat", "ascension", "bestiary", "equipment", "dungeon"];

  categories.forEach(function (cat) {
    var items = (ACHIEVEMENTS_DB || []).filter(function (a) { return a.category === cat; });
    if (!items.length) return;

    h += '<div class="nb-entry-category-label">' + esc(ACHIEVEMENT_CATEGORY_LABELS[cat] || cat) + '</div>';
    items.forEach(function (ach) {
      h += buildAchievementCardHTML(ach);
    });
  });

  return h;
}

function buildAchievementsHTML() {
  var claimedCount = AchievementManager.getClaimedCount();
  var total = (ACHIEVEMENTS_DB || []).length;

  var h = '<div class="achievement-summary">' + claimedCount + ' / ' + total + ' réclamés</div>';
  h += buildAchievementListHTML();

  return h;
}

window.buildAchievementsHTML = buildAchievementsHTML;
