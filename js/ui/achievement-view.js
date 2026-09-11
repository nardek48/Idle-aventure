"use strict";
/* ui/achievement-view.js — écran Hauts faits, liste par catégories en accordéon (repliées par défaut). Détail complet : COMMENTAIRES_ORIGINAUX.md */

var expandedAchievementCategory = null;

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

/* v3.202.1 : bandeau de bilan, repris du sous-onglet Personnage > Stats où il
   n'avait rien à faire (il cohabitait avec les capacités de classe). Sa place
   est ici : ces compteurs alimentent directement des hauts faits — totalKills
   en porte trois, ascensionCount trois autres (data/achievements.js). Le joueur
   voit désormais son total juste au-dessus des hauts faits qui en dépendent.
   Grille plutôt que la liste de <br> d'origine, qui était du texte brut étranger
   au kit or/bronze. */
function buildAchievementTotalsHTML() {
  var rows = [
    ["\u23f1\ufe0f", "Temps de jeu", (typeof formatTime === "function") ? formatTime(game.playTime || 0) : String(Math.floor(game.playTime || 0)) + "s"],
    ["\u2694\ufe0f", "Ennemis vaincus", formatNumber(game.totalKills || 0)],
    ["\ud83d\udcb0", "Or gagné", formatNumber(game.totalGoldEarned || 0)],
    ["\ud83d\udca5", "Dégâts", formatNumber(game.totalDamageDealt || 0)], // libellé court : "Dégâts infligés" était tronqué en 2 colonnes sur 366 px
    ["\ud83d\uddfa\ufe0f", "Monde", (WorldManager.worldIndex + 1) + " / " + WORLDS.length],
    ["\ud83d\udd01", "Cycles", formatNumber(game.cycleCount || 0)],
    ["\u2728", "Ascensions", formatNumber(game.ascensionCount || 0)]
  ];

  var h = '<div class="achievement-totals">';
  rows.forEach(function (r) {
    h += '<div class="achievement-total">';
    h += '<span class="achievement-total-ico">' + r[0] + '</span>';
    h += '<span class="achievement-total-lbl">' + esc(r[1]) + '</span>';
    h += '<span class="achievement-total-val">' + esc(r[2]) + '</span>';
    h += '</div>';
  });
  h += '</div>';
  return h;
}

function buildAchievementsHTML() {
  var claimedCount = AchievementManager.getClaimedCount();
  var total = (ACHIEVEMENTS_DB || []).length;

  var h = '<div class="achievement-summary">' + claimedCount + ' / ' + total + ' réclamés</div>';
  h += buildAchievementTotalsHTML();
  h += buildAchievementListHTML();

  return '<div class="nb-page-frame kframe-page" data-kf-title="\ud83c\udfc6 Hauts faits">' + h + '</div>';
}

window.buildAchievementsHTML = buildAchievementsHTML;
window.buildAchievementTotalsHTML = buildAchievementTotalsHTML;
