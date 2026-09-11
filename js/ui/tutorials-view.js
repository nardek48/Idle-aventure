"use strict";
/* ui/tutorials-view.js — v3.208.0 : écran Tutoriels (accordéon par section + lecture plein
   écran), calqué sur ui/codex-view.js. Consultation seule : rien ici ne marque un tutoriel
   comme vu, c'est le popup (ui/tutorial-view.js) qui le fait à sa première apparition.
   Le rendu d'une fiche réutilise .tutorial-points/.tutorial-point du popup — même vocabulaire
   visuel des deux côtés, une seule feuille de style à maintenir. */

/* État d'écran volontairement NON persisté (pas de nouveau champ dans save-system.js) :
   quel accordéon est ouvert et quelle fiche est lue n'a aucun intérêt d'une session à l'autre. */
var expandedTutorialSection = null;
var selectedTutorialId = null;

function toggleTutorialSection(sectionId) {
  expandedTutorialSection = (expandedTutorialSection === sectionId) ? null : sectionId;
  if (typeof renderPanel === "function") renderPanel();
}
window.toggleTutorialSection = toggleTutorialSection;

function selectTutorialEntry(id) {
  var entry = TutorialCatalogManager.getById(id);
  if (!entry || !TutorialCatalogManager.isUnlocked(entry)) return showToast("Pas encore rencontré", 1200);

  selectedTutorialId = id;
  if (typeof renderPanel === "function") renderPanel();
}
window.selectTutorialEntry = selectTutorialEntry;

function closeTutorialReading() {
  selectedTutorialId = null;
  if (typeof renderPanel === "function") renderPanel();
}
window.closeTutorialReading = closeTutorialReading;

function buildTutorialReadingHTML(id) {
  var entry = TutorialCatalogManager.getById(id);
  if (!entry) return "";
  var tut = entry.tutorial;

  var h = '<button class="codex-back-btn" type="button" onclick="closeTutorialReading()">← Retour aux Tutoriels</button>';
  h += '<div class="codex-reading-card">';
  h += '<div class="codex-reading-icon">' + renderIconOrEmojiHTML(tut.icon || "📖", "codex-reading-icon-img", tut.title || "") + '</div>';
  h += '<div class="codex-reading-title">' + esc(tut.title || "") + '</div>';

  h += '<div class="tutorial-points tutorial-points-read">';
  (tut.points || []).forEach(function (p) {
    h += '<div class="tutorial-point">';
    h += '<span class="tutorial-point-icon">' + esc(p.icon || "") + '</span>';
    h += '<span class="tutorial-point-text">' + esc(p.text || "");
    // Aperçu de badge réel (ex. télégraphe de charge) : même helper que le popup.
    if (p.preview && typeof buildTutorialPreviewHTML === "function") h += ' ' + buildTutorialPreviewHTML(p.preview);
    h += '</span>';
    h += '</div>';
  });
  h += '</div>';

  h += '</div>';
  return h;
}

function buildTutorialListItemHTML(entry) {
  var unlocked = TutorialCatalogManager.isUnlocked(entry);
  var tut = entry.tutorial;
  var pointCount = (tut.points || []).length;

  var h = '<button type="button" class="nb-entry-card' + (!unlocked ? ' is-locked' : '') + '" onclick="selectTutorialEntry(\'' + esc(entry.id) + '\')">';
  h += '<div class="nb-entry-icon-col"><div class="nb-entry-icon-frame"><span class="nb-entry-icon-emoji">'
    + (unlocked ? renderIconOrEmojiHTML(tut.icon || "📖", "nb-entry-icon-img", tut.title || "") : '🔒')
    + '</span></div></div>';
  h += '<div class="nb-entry-info-col">';
  h += '<div class="nb-entry-name">' + (unlocked ? esc(tut.title || "") : '???') + '</div>';
  h += '<div class="nb-entry-desc">'
    + (unlocked ? (pointCount + ' point' + (pointCount > 1 ? 's' : '') + ' à revoir') : 'Pas encore rencontré.')
    + '</div>';
  h += '</div>';
  h += '</button>';
  return h;
}

function buildTutorialSectionHeaderHTML(section, items, isExpanded) {
  var unlockedInSection = items.filter(function (e) { return TutorialCatalogManager.isUnlocked(e); }).length;
  var h = '<button type="button" class="nb-accordion-head' + (isExpanded ? ' is-expanded' : '') + '" onclick="toggleTutorialSection(\'' + esc(section.id) + '\')">';
  h += '<span class="nb-accordion-name">' + esc(section.label) + '</span>';
  h += '<span class="nb-accordion-count">' + unlockedInSection + ' / ' + items.length + '</span>';
  h += '<span class="nb-accordion-chevron">' + (isExpanded ? "▲" : "▼") + '</span>';
  h += '</button>';
  return h;
}

function buildTutorialListHTML() {
  var h = '';

  TUTORIAL_CATALOG_SECTIONS.forEach(function (section) {
    var items = TutorialCatalogManager.getBySection(section.id);
    if (!items.length) return;

    var isExpanded = expandedTutorialSection === section.id;

    h += '<div class="nb-accordion-section' + (isExpanded ? ' is-expanded' : '') + '">';
    h += buildTutorialSectionHeaderHTML(section, items, isExpanded);
    if (isExpanded) {
      h += '<div class="nb-accordion-body">';
      items.forEach(function (entry) { h += buildTutorialListItemHTML(entry); });
      h += '</div>';
    }
    h += '</div>';
  });

  return h;
}

function buildTutorialsHTML() {
  var unlockedCount = TutorialCatalogManager.getUnlockedCount();
  var total = TutorialCatalogManager.getAll().length;

  var h = '<div class="codex-summary">' + unlockedCount + ' / ' + total + ' rencontrés</div>';
  h += '<p class="panel-sub tutorials-intro">Chaque explication déjà rencontrée en jeu reste consultable ici.</p>';

  // Une fiche ouverte remplace la liste (même navigation que le Codex : un seul niveau de retour).
  if (selectedTutorialId) {
    h += buildTutorialReadingHTML(selectedTutorialId);
  } else {
    h += buildTutorialListHTML();
  }

  return '<div class="nb-page-frame kframe-page" data-kf-title="\ud83d\udcda Tutoriels">' + h + '</div>';
}
window.buildTutorialsHTML = buildTutorialsHTML;
