"use strict";
/* ui/village-view.js — écran Village : rail Bâtiments · Production · Ateliers · Entrepôt (v3.414.0).
   v3.113.0 : les 6 bâtiments hors-ligne (Mine d'Or, Hutte, Caserne, Tour, Hôtel de Ville,
   Forgeron) ont été SUPPRIMÉS avec leur mécanique (voir offline-system.js) ; le sous-onglet
   Village est alors devenu une vitrine de cartes teaser en attendant du vrai contenu.
   v3.213.0 (lot V-1) : les teaser laissent place à la GRILLE DE CONSTRUCTION — les 8
   bâtiments du rapport de conception du 11/09/2026, chacun dans un des cinq états gérés
   par VillageBuildingManager.getCardState(). Un bâtiment n'est jamais invisible : un
   bâtiment verrouillé affiche ce qu'il faut faire pour l'ouvrir (le mur n'est jamais
   silencieux). Ancien code (teaser, et avant lui grille 6 cartes + popup) :
   COMMENTAIRES_ORIGINAUX.md */

/* v3.414.0 (lot VUI-1, atelier village du 01/10/2026) : quatre onglets en rail EN HAUT
   (Bâtiments · Production · Ateliers · Entrepôt) remplacent les trois boutons du bas et le
   double bouton Production | Ateliers. L'onglet Village s'ouvre toujours sur Production
   (décision Seb : c'est là qu'on récolte). « village » reste accepté comme ancien nom. */
var activeVillageSubTab = "production"; // "buildings" | "production" | "shops" | "entrepot"
var VILLAGE_SUBTABS = ["buildings", "production", "shops", "entrepot"];

/* v3.222.0 (retour Seb) : changer d'onglet ramène TOUJOURS l'écran à sa page d'accueil
   (feuille de bâtiment fermée, ressource désélectionnée). */
function resetVillageSubScreenState() {
  if (typeof closeProductionSheet === "function") closeProductionSheet(true);
  if (typeof closeWarehouseSheet === "function") closeWarehouseSheet(); // v3.416.0 : feuille d'une ressource ou « Ma sélection »
  if (typeof warehouseMenuOpen !== "undefined") warehouseMenuOpen = false;
  if (typeof closeWorkshopSummaryModal === "function") closeWorkshopSummaryModal();
}
window.resetVillageSubScreenState = resetVillageSubScreenState;

function normalizeVillageSubTab(tab) {
  if (tab === "village") return "buildings";
  return VILLAGE_SUBTABS.indexOf(tab) !== -1 ? tab : "production";
}

function setVillageSubTab(tab) {
  activeVillageSubTab = normalizeVillageSubTab(tab);
  resetVillageSubScreenState();
  if (typeof renderPanel === "function") renderPanel();
}
window.setVillageSubTab = setVillageSubTab;

/* Entrée dans l'onglet Village depuis la barre du bas : toujours Production. Appelée par
   switchTab() quand on ARRIVE sur le Village (pas à chaque rendu). */
function onVillageTabEnter() {
  activeVillageSubTab = "production";
  resetVillageSubScreenState();
}
window.onVillageTabEnter = onVillageTabEnter;

function isProductionScreenVisible() {
  return game.activeTab === "village" && (activeVillageSubTab === "production" || activeVillageSubTab === "shops");
}
window.isProductionScreenVisible = isProductionScreenVisible;

/* v3.213.1 (lot V-2) : depuis une caractéristique plafonnée (Personnage →
   Stats), on arrive directement sur la fiche du Terrain — le joueur n'a pas à
   deviner où aller. */
function goToTrainingGround() {
  if (typeof switchTab === "function") switchTab("village");
  setVillageSubTab("buildings");
  if (typeof openVillageBuildingSheet === "function") openVillageBuildingSheet("training");
}
window.goToTrainingGround = goToTrainingGround;

/* Pastilles du rail : ce qui attend le joueur dans chaque onglet (0 = pas de pastille). */
function getVillageSubTabBadges() {
  var b = { buildings: 0, production: 0, shops: 0, entrepot: 0 };
  if (window.VillageBuildingManager) {
    (window.VILLAGE_BUILDING_ORDER || []).forEach(function (id) {
      var st = VillageBuildingManager.getCardState(id);
      if (id === "workshop" && window.WorkshopUnlockManager && typeof WorkshopUnlockManager.isWorkshopVisible === "function" && !WorkshopUnlockManager.isWorkshopVisible()) return;
      if (st === "ready" || (st === "built" && VillageBuildingManager.getAffordability(id).all)) b.buildings++;
    });
    if (VillageBuildingManager.getSite()) b.buildings = 0; // un seul chantier à la fois : rien à lancer
    if (window.CaravanManager && CaravanManager.isBack()) b.buildings++; // v3.419.0 : caravane à décharger
  }
  if (window.ProductionManager) {
    Object.keys(PRODUCTION_BUILDINGS).forEach(function (id) {
      if (!ProductionManager.isBuildingUnlocked(id)) return;
      var cap = ProductionManager.getCapacity(id);
      if (cap > 0 && ProductionManager.getStock(id) >= cap) b.production++;
    });
  }
  if (typeof countStalledWorkshops === "function") b.shops = countStalledWorkshops();
  if (window.WarehouseManager && window.WAREHOUSE_RESOURCES) {
    Object.keys(WAREHOUSE_RESOURCES).forEach(function (k) {
      if ((WAREHOUSE_RESOURCES[k].tier || "raw") === "raw" && WarehouseManager.getCap(k) !== Infinity && WarehouseManager.getFreeSpace(k) <= 0) b.entrepot++;
    });
  }
  return b;
}
window.getVillageSubTabBadges = getVillageSubTabBadges;

/* Rail du kit (.kseg.is-stack), en tête de page, comme la Bibliothèque. */
function buildVillageSubTabBarHTML() {
  var badges = getVillageSubTabBadges();
  var tabs = [
    ["buildings", "images/Icons/construction_icon.png", _t("Bâtiments")],
    ["production", "images/Icons/subtabs/production.png", _t("Production")],
    ["shops", "images/Icons/subtabs/workshops.png", _t("Ateliers")],
    ["entrepot", "images/Icons/system/warehouse_supplies.png", _t("Entrepôt")]
  ];
  var h = '<div class="kseg is-stack village-tabs">';
  tabs.forEach(function (t) {
    h += '<button type="button" class="village-tab' + (activeVillageSubTab === t[0] ? ' is-on' : '') + '" onclick="setVillageSubTab(\'' + t[0] + '\')">';
    h += '<img src="' + t[1] + '" alt=""><span>' + esc(t[2]) + '</span>';
    if (badges[t[0]] > 0) h += '<span class="kseg-dot">' + badges[t[0]] + '</span>';
    h += '</button>';
  });
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
      + '<div class="vb-site-banner-icon"><img class="ico-lg" src="images/Icons/plots/reinforced_gallery.png" alt=""></div>'
      + '<div class="vb-site-banner-body">'
      + '<div class="vb-site-banner-title">' + _t("Aucun chantier en cours") + '</div>'
      + '<div class="vb-site-banner-sub">' + _t("Un seul chantier à la fois dans le village.") + '</div>'
      + '</div></div>';
  }

  var def = VILLAGE_BUILDINGS[site.id];
  var left = VillageBuildingManager.getSiteSecondsLeft();
  var pct = VillageBuildingManager.getSiteProgressPct();

  var h = '<div class="vb-site-banner">';
  h += buildVillageBuildingIconHTML(def, "vb-site-banner-icon");
  h += '<div class="vb-site-banner-body">';
  h += '<div class="vb-site-banner-title">' + esc(_t("{x} — niveau {n}", { x: _td(def.name), n: site.targetLevel })) + '</div>';
  h += '<div class="vb-site-banner-sub" id="vb-site-left">' + esc(_t("Fin dans {d}", { d: formatTime(left) })) + '</div>';
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
      ? (WorkshopUnlockManager.getBannerStepText || WorkshopUnlockManager.getBannerText).call(WorkshopUnlockManager) : null;
    return step ? step.replace(/^Objectif\s*:\s*/, "") : _t("Bientôt");
  }
  if (!def.implemented) return _t("Bientôt");
  // v3.289.0 : fermé dans ce monde -> le monde qui l'ouvre, avant tout rang
  if (VillageBuildingManager.getLevel(def.id) === 0 && VillageBuildingManager.getMaxLevel(def.id) === 0) {
    return VillageBuildingManager.getWorldCapLabel(def.id);
  }
  if (def.rank > 0 && VillageBuildingManager.getRank() < def.rank) {
    return _t("Atelier niveau {n}", { n: VILLAGE_RANK_THRESHOLDS[def.rank - 1] });
  }
  return def.lockLabel ? _td(def.lockLabel) : _t("Atelier niveau {n}", { n: VILLAGE_RANK_THRESHOLDS[def.rank - 1] });
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

  // v3.414.0 (VUI-1) : grande vignette — niveau en pastille, ruban d'état, illustration centrée
  var carBack = id === "hall" && state !== "site" && !!window.CaravanManager && CaravanManager.isBack(); // v3.419.0
  var h = '<button type="button" class="vb-card is-' + state + (carBack ? ' is-caravan-back' : '') + '"'
    + (locked ? ' disabled' : ' onclick="openVillageBuildingSheet(\'' + id + '\')"') + '>';

  if (level > 0) h += '<span class="vb-card-lvl">' + level + '/' + VillageBuildingManager.getMaxLevel(id) + '</span>';
  if (state === "ready") h += '<span class="vb-card-flag">' + _t("Construire") + '</span>';
  else if (state === "site") h += '<span class="vb-card-flag">' + _t("Chantier") + '</span>';
  // v3.419.0 (E-2) : la caravane rentrée attend sur la tuile de la Halle
  else if (carBack) h += '<span class="vb-card-flag is-good"><img class="vb-flag-ico" src="images/Icons/village_buildings/caravan.png" alt=""> ' + _t("De retour") + '</span>';

  h += '<div class="vb-card-top">';
  h += buildVillageBuildingIconHTML(def, "vb-card-icon");
  h += '<div class="vb-card-name">' + esc(_td(def.name)) + '</div>';
  h += '</div>';

  if (locked) {
    h += '<div class="vb-card-lock"><span class="vb-card-lock-icon"><img class="ico-sys" src="images/Icons/system/lock_closed.png" alt=""></span>'
       + '<span>' + esc(getVillageLockLabel(def)) + '</span></div>';

  } else if (state === "site") {
    var site = VillageBuildingManager.getSite();
    var pct = VillageBuildingManager.getSiteProgressPct();
    h += '<div class="vb-card-level">' + _t("Niveau {a} → {b}", { a: level, b: site.targetLevel }) + '</div>';
    h += '<div class="kgauge kgauge-thin kgauge-xp"><div class="kgauge-track">'
       + '<div class="kgauge-fill" id="vb-card-bar" style="width:' + pct.toFixed(1) + '%"></div>'
       + '</div></div>';
    h += '<div class="vb-card-status" id="vb-card-left">'
       + esc(formatTime(VillageBuildingManager.getSiteSecondsLeft())) + '</div>';

  } else if (state === "maxed") {
    // v3.289.0 : plafond du monde -> on dit où se trouve la suite
    h += '<div class="vb-card-status">' + esc(VillageBuildingManager.isWorldCapped(id)
      ? VillageBuildingManager.getWorldCapLabel(id) : _t("Niveau maximum")) + '</div>';

  } else if (state === "built") {
    var afford = VillageBuildingManager.getAffordability(id);
    h += '<div class="vb-card-status">' + (afford.all ? '<img class=ico-inline src=images/Icons/system/upgrade.png> ' + _t("Améliorable") : _t("Matériaux manquants")) + '</div>';

  } else { /* ready */
    h += '<div class="vb-card-status">' + (level > 0 ? _t("Chantier possible") : _t("Non construit · chantier possible")) + '</div>';
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
  activeVillageSubTab = normalizeVillageSubTab(activeVillageSubTab);
  var h = '<div class="nb-page-frame nb-page-frame-fill village-page-frame kframe-page" data-kf-title="' + esc("images/Icons/menu_icons/village_menu.png|" + _t("Village")) + '">';
  h += buildVillageSubTabBarHTML();

  if (activeVillageSubTab === "entrepot") h += buildWarehouseHTML();
  else if (activeVillageSubTab === "shops") h += buildShopsViewHTML();
  else if (activeVillageSubTab === "buildings") h += buildVillageMainSubTabHTML();
  else h += buildProductionHTML();

  h += '</div>';
  // La feuille d'un bâtiment de production vit hors du panneau : on la rafraîchit avec lui.
  if (typeof refreshProductionSheet === "function") refreshProductionSheet();
  return h;
}

window.buildVillageHTML = buildVillageHTML;
