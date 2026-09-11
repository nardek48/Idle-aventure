"use strict";
/* ui/village-view.js — écran Village : sous-onglets Village/Entrepôt/Production.
   v3.113.0 : les 6 bâtiments hors-ligne (Mine d'Or, Hutte, Caserne, Tour, Hôtel de Ville,
   Forgeron) ont été SUPPRIMÉS avec leur mécanique (voir offline-system.js) ; le sous-onglet
   Village est alors devenu une vitrine de cartes teaser en attendant du vrai contenu.
   v3.213.0 (lot V-1) : les teaser laissent place à la GRILLE DE CONSTRUCTION — les 8
   bâtiments du rapport de conception du 11/09/2026, chacun dans un des cinq états gérés
   par VillageBuildingManager.getCardState(). Un bâtiment n'est jamais invisible : un
   bâtiment verrouillé affiche ce qu'il faut faire pour l'ouvrir (le mur n'est jamais
   silencieux). Ancien code (teaser, et avant lui grille 6 cartes + popup) :
   COMMENTAIRES_ORIGINAUX.md */

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

/* v3.213.1 (lot V-2) : depuis une caractéristique plafonnée (Personnage →
   Stats), on arrive directement sur la fiche du Terrain — le joueur n'a pas à
   deviner où aller. */
function goToTrainingGround() {
  if (typeof switchTab === "function") switchTab("village");
  setVillageSubTab("village");
  if (typeof openVillageBuildingSheet === "function") openVillageBuildingSheet("training");
}
window.goToTrainingGround = goToTrainingGround;

function buildVillageSubTabBarHTML() {
  var h = '<div class="pc-subtab-bar">';
  h += '<button type="button" class="pc-subtab-btn' + (activeVillageSubTab === "village" ? ' is-active' : '') + '" onclick="setVillageSubTab(\'village\')">🏘️<span>Village</span></button>';
  h += '<button type="button" class="pc-subtab-btn' + (activeVillageSubTab === "entrepot" ? ' is-active' : '') + '" onclick="setVillageSubTab(\'entrepot\')">📦<span>Entrepôt</span></button>';
  h += '<button type="button" class="pc-subtab-btn' + (activeVillageSubTab === "production" ? ' is-active' : '') + '" onclick="setVillageSubTab(\'production\')">🌾<span>Production</span></button>';
  h += '</div>';
  return h;
}

/* Bandeau d'état du chantier, en tête de grille. Le village n'a qu'UN
   chantier à la fois : ce bandeau est donc la réponse à « où en est-on ? »
   sans avoir à ouvrir une fiche. */
function buildVillageSiteBannerHTML() {
  var site = VillageBuildingManager.getSite();

  if (!site) {
    return '<div class="vb-site-banner is-idle">'
      + '<div class="vb-site-banner-icon">🧱</div>'
      + '<div class="vb-site-banner-body">'
      + '<div class="vb-site-banner-title">Aucun chantier en cours</div>'
      + '<div class="vb-site-banner-sub">Un seul chantier à la fois dans le village.</div>'
      + '</div></div>';
  }

  var def = VILLAGE_BUILDINGS[site.id];
  var left = VillageBuildingManager.getSiteSecondsLeft();
  var pct = VillageBuildingManager.getSiteProgressPct();

  var h = '<div class="vb-site-banner">';
  h += buildVillageBuildingIconHTML(def, "vb-site-banner-icon");
  h += '<div class="vb-site-banner-body">';
  h += '<div class="vb-site-banner-title">' + esc(def.name) + ' — niveau ' + site.targetLevel + '</div>';
  h += '<div class="vb-site-banner-sub" id="vb-site-left">Fin dans ' + esc(formatTime(left)) + '</div>';
  h += '<div class="kgauge kgauge-thin kgauge-xp"><div class="kgauge-track">'
     + '<div class="kgauge-fill" id="vb-site-bar" style="width:' + pct.toFixed(1) + '%"></div>'
     + '</div></div>';
  h += '</div></div>';
  return h;
}

/* Ce qu'il manque pour ouvrir un bâtiment verrouillé. Un bâtiment dont le
   lot n'est pas livré porte son propre libellé (« Bientôt »), pas un rang
   qui serait mensonger. */
function getVillageLockLabel(def) {
  if (def.id === "workshop") {
    var step = (window.WorkshopUnlockManager && typeof WorkshopUnlockManager.getBannerText === "function")
      ? WorkshopUnlockManager.getBannerText() : null;
    return step ? step.replace(/^Objectif\s*:\s*/, "") : "Bientôt";
  }
  if (!def.implemented) return "Bientôt";
  return def.lockLabel || ("Atelier niveau " + VILLAGE_RANK_THRESHOLDS[def.rank - 1]);
}

function buildVillageBuildingCardHTML(id) {
  var def = VILLAGE_BUILDINGS[id];
  if (!def) return "";

  var state = VillageBuildingManager.getCardState(id);
  var level = VillageBuildingManager.getLevel(id);

  /* L'Atelier reste verrouillé tant que la chaîne de déblocage n'a pas
     atteint son étape de construction : les deux premières étapes (bois,
     planches) se jouent ailleurs, et sa carte affiche alors l'objectif en
     cours plutôt qu'un bouton qui ne mènerait à rien. */
  if (id === "workshop" && state === "ready" && window.WorkshopUnlockManager
      && typeof WorkshopUnlockManager.isWorkshopVisible === "function"
      && !WorkshopUnlockManager.isWorkshopVisible()) {
    state = "locked";
  }

  var locked = (state === "locked");

  var h = '<button type="button" class="vb-card is-' + state + '"'
    + (locked ? ' disabled' : ' onclick="openVillageBuildingSheet(\'' + id + '\')"') + '>';

  if (state === "ready") h += '<span class="vb-card-flag">Disponible</span>';
  else if (state === "site") h += '<span class="vb-card-flag">Chantier</span>';

  h += '<div class="vb-card-top">';
  h += buildVillageBuildingIconHTML(def, "vb-card-icon");
  h += '<div class="vb-card-name">' + esc(def.name) + '</div>';
  h += '</div>';

  if (locked) {
    h += '<div class="vb-card-lock"><span class="vb-card-lock-icon">🔒</span>'
       + '<span>' + esc(getVillageLockLabel(def)) + '</span></div>';

  } else if (state === "site") {
    var site = VillageBuildingManager.getSite();
    var pct = VillageBuildingManager.getSiteProgressPct();
    h += '<div class="vb-card-level">Niveau ' + level + ' → ' + site.targetLevel + '</div>';
    h += '<div class="kgauge kgauge-thin kgauge-xp"><div class="kgauge-track">'
       + '<div class="kgauge-fill" id="vb-card-bar" style="width:' + pct.toFixed(1) + '%"></div>'
       + '</div></div>';
    h += '<div class="vb-card-status" id="vb-card-left">'
       + esc(formatTime(VillageBuildingManager.getSiteSecondsLeft())) + '</div>';

  } else if (state === "maxed") {
    h += '<div class="vb-card-level">Niveau ' + level + ' / ' + def.maxLevel + '</div>';
    h += '<div class="vb-card-status">Niveau maximum</div>';

  } else if (state === "built") {
    var afford = VillageBuildingManager.getAffordability(id);
    h += '<div class="vb-card-level">Niveau ' + level + ' / ' + def.maxLevel + '</div>';
    h += '<div class="vb-card-status">' + (afford.all ? '⬆ Améliorable' : 'Matériaux manquants') + '</div>';

  } else { /* ready */
    h += '<div class="vb-card-level">Non construit</div>';
    h += '<div class="vb-card-status">Chantier possible</div>';
  }

  h += '</button>';
  return h;
}

/* Sous-onglet Village : bandeau de chantier + grille des huit bâtiments
   (v3.213.0). Les huit sont TOUJOURS affichés, y compris ceux dont le lot
   n'est pas livré : la grille montre où va le village, et chaque carte
   verrouillée porte sa condition. */
function buildVillageMainSubTabHTML() {
  VillageBuildingManager.ensure();

  var h = buildVillageSiteBannerHTML();

  /* Objectif en cours de la chaîne de déblocage de l'Atelier, tant qu'elle
     tourne (data/workshop-unlock.js). C'est la porte d'entrée du village. */
  var banner = (window.WorkshopUnlockManager && typeof WorkshopUnlockManager.getBannerText === "function")
    ? WorkshopUnlockManager.getBannerText() : null;
  if (banner) h += '<div class="vb-chain-banner">' + esc(banner) + '</div>';

  h += '<div class="vb-grid">';
  VILLAGE_BUILDING_ORDER.forEach(function (id) {
    h += buildVillageBuildingCardHTML(id);
  });
  h += '</div>';

  return h;
}

function buildVillageHTML() {
  var h = '<div class="subtab-page">';
  h += '<div class="subtab-page-content">';
  // v3.193.0 : titre du bandeau figé selon le sous-onglet actif — et, en
  // détail bâtiment de Production, le NOM du bâtiment (le bandeau devient
  // l'en-tête permanent de la fiche).
  var kfTitle = "🏘️ Village";
  if (activeVillageSubTab === "entrepot") {
    kfTitle = "📦 Entrepôt";
  } else if (activeVillageSubTab === "production") {
    if (window.productionDetailBuildingId && PRODUCTION_BUILDINGS[productionDetailBuildingId]) {
      kfTitle = PRODUCTION_BUILDINGS[productionDetailBuildingId].name;
    } else {
      kfTitle = (window.productionViewTab === "shops") ? "⚒️ Ateliers" : "🌾 Production";
    }
  }
  h += '<div class="nb-page-frame village-page-frame kframe-page" data-kf-title="' + esc(kfTitle) + '">';

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
