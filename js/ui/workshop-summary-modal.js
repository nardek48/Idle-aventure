"use strict";
/* ui/workshop-summary-modal.js — v3.98.8 : popup "Voir les files" en tête de page
   Production (bouton à côté de "Tout récolter") — résumé de TOUTES les fabrications en
   cours, tous ateliers/bâtiments confondus, sans avoir à déplier chaque carte. Réutilise
   le host générique #full-menu-root et les classes .full-menu-overlay/.full-menu déjà
   posées par index.html/css/05-overlays.css (même pattern que menu-view.js,
   equipment-view.js, etc.) — aucune modification de ces fichiers.
   v3.98.8 : AFFICHAGE SEUL, pas de lancement de craft ici (décision validée avec Seb —
   choisir une recette + quantité demande déjà tout le bloc stepper+Fabriquer de la carte
   atelier, le dupliquer en popup n'apporterait rien). Seuls les ateliers ayant au moins 1
   entrée en file apparaissent (pas de liste exhaustive des ateliers vides). Un tap sur une
   ligne ferme la popup et déplie directement le panneau ateliers du bâtiment concerné
   (workshopsPanelExpanded, voir production-view.js) pour retrouver la carte.

   v3.98.10 : popup tenue à jour en direct (retour Seb) tant qu'elle est ouverte — le
   temps restant et la progression avançaient sinon jusqu'à la fermer/rouvrir. Le
   contenu (barre + ligne qui disparaît quand une file se vide) change de STRUCTURE, pas
   juste de valeurs, donc pas de mise à jour ciblée par id comme
   ProductionManager.updateDOM() : refreshWorkshopSummaryModal() régénère le bloc
   #workshop-summary-body à chaque tick où la popup est ouverte (appelé depuis
   ProductionManager.tick(), au même rythme ~1x/s que le reste de la page Production),
   sans reconstruire tout le wrapper overlay pour ne pas perdre la position de scroll.

   v3.98.17 : badge "🔁 auto" sur chaque ligne dont le lot EN COURS (entry.auto, posé par
   WorkshopsSystem.enqueueCraft) a été poussé par le chaînage automatique — vue
   d'ensemble demandée par Seb (jusque-là aucun moyen de savoir quels ateliers
   tournaient en auto sans ouvrir chaque carte une par une). */

var _workshopSummaryModalOpen = false;

function buildWorkshopSummaryBodyHTML() {
  var rows = [];

  Object.keys(WORKSHOPS_CONFIG).forEach(function (workshopId) {
    var def = WORKSHOPS_CONFIG[workshopId];
    if (!def.active) return;
    if (!ProductionManager.isBuildingUnlocked(def.buildingId)) return;

    var queue = WorkshopsSystem.getQueue(workshopId);
    if (!queue.length) return;

    var entry = queue[0];
    var recipe = WorkshopsSystem.getRecipe(workshopId, entry.recipeId);
    var outputDef = recipe ? WAREHOUSE_RESOURCES[recipe.outputs[0].resourceId] : null;
    var totalMs = recipe ? WorkshopsSystem.getEffectiveCraftTimeMs(workshopId, recipe) * entry.times : 0;
    var pct = totalMs > 0 ? Math.min(100, Math.max(0, Math.floor(100 - (entry.msRemaining / totalMs) * 100))) : 100;
    var waitingCount = queue.length - 1;

    var buildingDef = PRODUCTION_BUILDINGS[def.buildingId];

    var h = '<button type="button" class="workshop-summary-row" onclick="jumpToWorkshop(\'' + def.buildingId + '\')">';
    h += '<div class="workshop-summary-row-icon">' + renderIconOrEmojiHTML(def.icon, "workshop-sum-ico", "") + '</div>';
    h += '<div class="workshop-summary-row-body">';
    h += '<div class="workshop-summary-row-top">';
    h += '<span class="workshop-summary-row-name">' + esc(_td(def.name)) + '</span>';
    if (entry.auto) h += '<span class="workshop-summary-row-auto-badge"><img class=ico-inline src=images/Icons/system/auto_repeat.png> ' + _t("auto") + '</span>';
    h += '<span class="workshop-summary-row-building">' + esc(buildingDef ? _td(buildingDef.name) : def.buildingId) + '</span>';
    h += '</div>';
    h += '<div class="workshop-summary-row-recipe">' + esc(outputDef ? _td(outputDef.name) : (recipe ? recipe.id : "?")) + ' ×' + formatNumber(entry.times) + '</div>';
    h += '<div class="map-quest-step-bar workshop-summary-row-bar"><div class="map-quest-step-fill" style="width:' + pct + '%"></div></div>';
    h += '<div class="workshop-summary-row-bottom">';
    h += '<span>' + _t("{d} restantes", { d: formatCraftDuration(entry.msRemaining) }) + '</span>';
    if (waitingCount > 0) h += '<span>' + _t("+{n} en attente", { n: waitingCount }) + '</span>';
    h += '</div>';
    h += '</div>';
    h += '</button>';

    rows.push(h);
  });

  if (rows.length) return '<div class="workshop-summary-list">' + rows.join("") + '</div>';
  return '<div class="workshop-summary-empty">' + _t("Aucune fabrication en cours pour le moment.") + '</div>';
}

function buildWorkshopSummaryHTML() {
  var h = '<div class="full-menu-overlay" onclick="if (event.target === this) closeWorkshopSummaryModal();">';
  h += '  <div class="full-menu workshop-summary-card">';
  h += kSheetHeadHTML({ icon: '<img src="images/Icons/subtabs/workshops.png" alt="">', title: _t("Files en cours"), close: "closeWorkshopSummaryModal()" });
  h += '    <div class="ksheet-body" id="workshop-summary-body">' + buildWorkshopSummaryBodyHTML() + '</div>';
  h += '  </div>';
  h += '</div>';
  return h;
}

function openWorkshopSummaryModal() {
  var host = document.getElementById("full-menu-root");
  if (!host) return;
  host.innerHTML = buildWorkshopSummaryHTML();
  _workshopSummaryModalOpen = true;
}
window.openWorkshopSummaryModal = openWorkshopSummaryModal;

function closeWorkshopSummaryModal() {
  var host = document.getElementById("full-menu-root");
  if (host) host.innerHTML = "";
  _workshopSummaryModalOpen = false;
}
window.closeWorkshopSummaryModal = closeWorkshopSummaryModal;

function isWorkshopSummaryModalOpen() {
  return _workshopSummaryModalOpen;
}
window.isWorkshopSummaryModalOpen = isWorkshopSummaryModalOpen;

/* Régénère uniquement #workshop-summary-body (pas tout le wrapper overlay), pour
   garder la position de scroll de l'utilisateur si la liste dépasse l'écran. Appelé
   depuis ProductionManager.tick()/updateDOM() tant que la popup est ouverte. */
function refreshWorkshopSummaryModal() {
  var body = document.getElementById("workshop-summary-body");
  if (!body) { _workshopSummaryModalOpen = false; return; } // popup fermée entre-temps
  body.innerHTML = buildWorkshopSummaryBodyHTML();
}
window.refreshWorkshopSummaryModal = refreshWorkshopSummaryModal;

/* Ferme la popup et déplie le panneau ateliers du bâtiment concerné (même état que le
   toggle manuel de la carte, voir workshopsPanelExpanded dans production-view.js), pour
   retrouver directement la carte au lieu de devoir la chercher/déplier soi-même. */
function jumpToWorkshop(buildingId) {
  closeWorkshopSummaryModal();
  if (typeof workshopsPanelExpanded === "object") workshopsPanelExpanded[buildingId] = true;
  if (typeof renderPanel === "function") renderPanel();
}
window.jumpToWorkshop = jumpToWorkshop;
