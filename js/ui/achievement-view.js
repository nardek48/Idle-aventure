"use strict";
/* ============================================================
Quest Idle — ui/achievement-view.js
Écran "Hauts faits".

v2.82 : passage d'une grille d'icônes + un seul détail affiché en
dessous à une liste complète (une carte par haut fait, toutes les
infos visibles directement), même principe que Quêtes/Bestiaire —
voir css/00-components.css pour le composant partagé ".nb-entry-card".

v2.83.36 : les catégories (Combat/Ascension/Bestiaire/Équipement/
Donjon — déjà présentes dans les données via ACHIEVEMENTS_DB[].category
et ACHIEVEMENT_CATEGORY_LABELS) passent en accordéon, repliées par
défaut, avec un compteur "X/Y réclamés" par section — même principe
que la liste de donjons (voir ui/dungeon-view.js). Rien n'est inventé
côté données, juste un nouvel affichage sur ce qui existait déjà.
============================================================ */

var expandedAchievementCategory = null; // repliées par défaut

function toggleAchievementCategory(cat) {
  expandedAchievementCategory = (expandedAchievementCategory === cat) ? null : cat;
  if (typeof renderPanel === "function") renderPanel();
}
window.toggleAchievementCategory = toggleAchievementCategory;

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

/* En-tête cliquable d'une section (accordéon) — nom de catégorie +
   compteur "X/Y réclamés", chevron d'état. */
function buildAchievementCategoryHeaderHTML(cat, items, isExpanded) {
  var claimedInCat = items.filter(function (a) { return AchievementManager.isClaimed(a.id); }).length;
  var h = '<button type="button" class="nb-accordion-head' + (isExpanded ? ' is-expanded' : '') + '" onclick="toggleAchievementCategory(\'' + esc(cat) + '\')">';
  h += '<span class="nb-accordion-name">' + esc(ACHIEVEMENT_CATEGORY_LABELS[cat] || cat) + '</span>';
  h += '<span class="nb-accordion-count">' + claimedInCat + ' / ' + items.length + '</span>';
  h += '<span class="nb-accordion-chevron">' + (isExpanded ? "▲" : "▼") + '</span>';
  h += '</button>';
  return h;
}

function buildAchievementListHTML() {
  var h = '';
  var categories = ["combat", "ascension", "bestiary", "equipment", "dungeon"];

  categories.forEach(function (cat) {
    var items = (ACHIEVEMENTS_DB || []).filter(function (a) { return a.category === cat; });
    if (!items.length) return;

    var isExpanded = expandedAchievementCategory === cat;

    h += '<div class="nb-accordion-section' + (isExpanded ? ' is-expanded' : '') + '">';
    h += buildAchievementCategoryHeaderHTML(cat, items, isExpanded);
    if (isExpanded) {
      h += '<div class="nb-accordion-body">';
      items.forEach(function (ach) {
        h += buildAchievementCardHTML(ach);
      });
      h += '</div>';
    }
    h += '</div>';
  });

  return h;
}

function buildAchievementsHTML() {
  var claimedCount = AchievementManager.getClaimedCount();
  var total = (ACHIEVEMENTS_DB || []).length;

  var h = '<div class="achievement-summary">' + claimedCount + ' / ' + total + ' réclamés</div>';
  h += buildAchievementListHTML();

  return '<div class="nb-page-frame">' + h + '</div>'; // v2.83.28
}

window.buildAchievementsHTML = buildAchievementsHTML;
