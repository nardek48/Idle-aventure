"use strict";
/* ui/codex-view.js — écran Codex : liste par catégorie (accordéon) + mode lecture plein texte. Détail complet : COMMENTAIRES_ORIGINAUX.md */

var CODEX_CATEGORY_LABELS = {
  intro: "Prologue",
  world: "Les mondes",
  system: "Le Cycle"
};

var expandedCodexCategory = null;

function toggleCodexCategory(cat) {
  expandedCodexCategory = (expandedCodexCategory === cat) ? null : cat;
  if (typeof renderPanel === "function") renderPanel();
}
window.toggleCodexCategory = toggleCodexCategory;

function selectCodexEntry(id) {
  var entry = CodexManager.getById(id);
  if (!entry || !CodexManager.isUnlocked(entry)) return showToast("Pas encore découvert", 1200);

  game.codexSelectedId = id;
  CodexManager.markRead(id);
  if (typeof renderPanel === "function") renderPanel();
}

function closeCodexReading() {
  game.codexSelectedId = null;
  if (typeof renderPanel === "function") renderPanel();
}

function buildCodexReadingHTML(id) {
  var entry = CodexManager.getById(id);
  if (!entry) return "";

  var paragraphs = entry.text.split("\n\n");

  var h = '<button class="codex-back-btn" type="button" onclick="closeCodexReading()">← Retour au Codex</button>';
  h += '<div class="codex-reading-card">';
  h += '<div class="codex-reading-icon">' + renderIconOrEmojiHTML(entry.icon, "codex-reading-icon-img", entry.title) + '</div>';
  h += '<div class="codex-reading-title">' + esc(entry.title) + '</div>';
  paragraphs.forEach(function (para) {
    h += '<p class="codex-reading-para">' + esc(para) + '</p>';
  });
  h += '</div>';
  return h;
}

function buildCodexListItemHTML(entry) {
  var unlocked = CodexManager.isUnlocked(entry);
  var read = CodexManager.isRead(entry.id);

  var h = '<button type="button" class="nb-entry-card' + (!unlocked ? ' is-locked' : '') + '" onclick="selectCodexEntry(\'' + esc(entry.id) + '\')">';
  h += '<div class="nb-entry-icon-col"><div class="nb-entry-icon-frame"><span class="nb-entry-icon-emoji">' + (unlocked ? renderIconOrEmojiHTML(entry.icon, "nb-entry-icon-img", entry.title) : '🔒') + '</span></div></div>';
  h += '<div class="nb-entry-info-col">';
  h += '<div class="nb-entry-name">' + (unlocked ? esc(entry.title) : '???') + '</div>';
  h += '<div class="nb-entry-desc">' + (unlocked ? (read ? 'Déjà lu.' : 'Nouvelle entrée à découvrir.') : 'Pas encore découvert.') + '</div>';
  h += '</div>';
  h += '<div class="nb-entry-status-col">';
  if (unlocked && !read) {
    h += '<span class="nb-entry-status-label is-ready">Nouveau</span>';
  } else if (unlocked) {
    h += '<span class="nb-entry-status-label is-complete">Déchiffré</span>';
  } else {
    h += '<span class="nb-entry-status-label">Verrouillé</span>';
  }
  h += '</div>';
  h += '</button>';
  return h;
}

function buildCodexCategoryHeaderHTML(cat, items, isExpanded) {
  var unlockedInCat = items.filter(function (e) { return CodexManager.isUnlocked(e); }).length;
  var h = '<button type="button" class="nb-accordion-head' + (isExpanded ? ' is-expanded' : '') + '" onclick="toggleCodexCategory(\'' + esc(cat) + '\')">';
  h += '<span class="nb-accordion-name">' + esc(CODEX_CATEGORY_LABELS[cat] || cat) + '</span>';
  h += '<span class="nb-accordion-count">' + unlockedInCat + ' / ' + items.length + '</span>';
  h += '<span class="nb-accordion-chevron">' + (isExpanded ? "▲" : "▼") + '</span>';
  h += '</button>';
  return h;
}

function buildCodexListHTML() {
  var categories = ["intro", "world", "system"];
  var h = '';

  categories.forEach(function (cat) {
    var items = (CODEX_ENTRIES || []).filter(function (e) { return e.category === cat; });
    if (!items.length) return;

    var isExpanded = expandedCodexCategory === cat;

    h += '<div class="nb-accordion-section' + (isExpanded ? ' is-expanded' : '') + '">';
    h += buildCodexCategoryHeaderHTML(cat, items, isExpanded);
    if (isExpanded) {
      h += '<div class="nb-accordion-body">';
      items.forEach(function (entry) {
        h += buildCodexListItemHTML(entry);
      });
      h += '</div>';
    }
    h += '</div>';
  });

  return h;
}

function buildCodexHTML() {
  CodexManager.ensure();
  var unlockedCount = CodexManager.getUnlockedEntries().length;
  var total = (CODEX_ENTRIES || []).length;

  var h = '<div class="codex-summary">' + unlockedCount + ' / ' + total + ' découvertes</div>';

  if (game.codexSelectedId) {
    h += buildCodexReadingHTML(game.codexSelectedId);
  } else {
    h += buildCodexListHTML();
  }

  return h;
}

window.buildCodexHTML = buildCodexHTML;
window.selectCodexEntry = selectCodexEntry;
window.closeCodexReading = closeCodexReading;

function buildCodexExcerptHTML(codexId, cssClass) {
  if (typeof CodexManager === "undefined") return "";
  var entry = CodexManager.getById(codexId);
  if (!entry || !CodexManager.isUnlocked(entry)) return "";

  var firstSentence = entry.text.split(".")[0] + ".";
  return '<div class="' + (cssClass || "codex-excerpt") + '">📖 « ' + esc(firstSentence) + ' »</div>';
}

window.buildCodexExcerptHTML = buildCodexExcerptHTML;
