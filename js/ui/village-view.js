"use strict";
/* ui/village-view.js — écran Village : sous-onglets Village/Entrepôt/Production.
   v3.113.0 : les 6 bâtiments hors-ligne (Mine d'Or, Hutte, Caserne, Tour, Hôtel de Ville,
   Forgeron) sont SUPPRIMÉS avec leur mécanique (voir offline-system.js). Le sous-onglet
   Village est conservé comme emplacement d'avenir : cartes teaser grisées (Marchand,
   Forge, Taverne...) en attendant le futur contenu lié à l'aventure (échoppes, sinks
   d'or). Ancien code (grille 6 cartes + popup d'amélioration) : COMMENTAIRES_ORIGINAUX.md */

/* Cartes teaser du futur bourg — purement décoratives, aucune interaction. */
var VILLAGE_TEASERS = [
  { icon: "🛒", label: "Marchand", desc: "Étals et bonnes affaires" },
  { icon: "⚒️", label: "Forge", desc: "Le métal attend son maître" },
  { icon: "🍺", label: "Taverne", desc: "Rumeurs et contrats" },
  { icon: "❔", label: "???", desc: "Un emplacement se libère" }
];

var activeVillageSubTab = "village"; // "village" | "entrepot" | "production"

function setVillageSubTab(tab) {
  activeVillageSubTab = (tab === "entrepot") ? "entrepot" : (tab === "production") ? "production" : "village";
  if (typeof renderPanel === "function") renderPanel();
}
window.setVillageSubTab = setVillageSubTab;

function isProductionScreenVisible() {
  return game.activeTab === "village" && activeVillageSubTab === "production";
}
window.isProductionScreenVisible = isProductionScreenVisible;

function buildVillageSubTabBarHTML() {
  var h = '<div class="pc-subtab-bar">';
  h += '<button type="button" class="pc-subtab-btn' + (activeVillageSubTab === "village" ? ' is-active' : '') + '" onclick="setVillageSubTab(\'village\')">🏘️<span>Village</span></button>';
  h += '<button type="button" class="pc-subtab-btn' + (activeVillageSubTab === "entrepot" ? ' is-active' : '') + '" onclick="setVillageSubTab(\'entrepot\')">📦<span>Entrepôt</span></button>';
  h += '<button type="button" class="pc-subtab-btn' + (activeVillageSubTab === "production" ? ' is-active' : '') + '" onclick="setVillageSubTab(\'production\')">🌾<span>Production</span></button>';
  h += '</div>';
  return h;
}

/* Sous-onglet Village : intro narrative + cartes teaser grisées (v3.113.0). */
function buildVillageMainSubTabHTML() {
  var h = '<div class="village-teaser-intro">Le bourg d\'Aeswyn prend forme. Des artisans et marchands viendront s\'y installer au fil de tes aventures...</div>';

  h += '<div class="village-teaser-grid">';
  VILLAGE_TEASERS.forEach(function (t) {
    h += '<div class="village-teaser-card">';
    h += '<div class="village-teaser-icon">' + t.icon + '</div>';
    h += '<div class="village-teaser-label">' + esc(t.label) + '</div>';
    h += '<div class="village-teaser-desc">' + esc(t.desc) + '</div>';
    h += '<div class="village-teaser-badge">Bientôt</div>';
    h += '</div>';
  });
  h += '</div>';
  return h;
}

function buildVillageHTML() {
  var h = '<div class="subtab-page">';
  h += '<div class="subtab-page-content">';
  h += '<div class="nb-page-frame village-page-frame">';

  if (activeVillageSubTab === "entrepot") {
    h += buildWarehouseHTML();
  } else if (activeVillageSubTab === "production") {
    h += buildProductionHTML();
  } else {
    h += buildVillageMainSubTabHTML();
  }

  h += '</div>'; // fin .nb-page-frame
  h += '</div>'; // fin .subtab-page-content

  h += '<div class="subtab-bar-wrapper">';
  h += buildVillageSubTabBarHTML();
  h += '</div>';

  h += '</div>'; // fin .subtab-page
  return h;
}

window.buildVillageHTML = buildVillageHTML;
