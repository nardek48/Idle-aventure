"use strict";
/* ui/production-view.js — sous-onglet Production du Village. Carte horizontale (portrait+infos+actions), logique dans ProductionManager.
   v3.97.0 : généralise la refonte "carte + grille de zones indépendantes" de Champs
   (v3.96.0-3.96.4) aux 5 autres bâtiments de Production (Chasse, Scierie, Mine, Carrière,
   Puits) — les anciennes fonctions buildFarm... et farmPlot... deviennent buildPlots... et
   productionPlot..., paramétrées par buildingId au lieu d'être câblées sur "farm" en dur.
   Chaque bâtiment garde son nom de section personnalisé (voir
   PRODUCTION_PLOTS_BUILDINGS.sectionLabel). Panneau/sélection dépliés INDÉPENDAMMENT par
   bâtiment (état local par id, pas un seul état partagé) — ouvrir Champs n'affecte pas
   l'état de Mine. Détail : COMMENTAIRES_ORIGINAUX.md */

/* v3.191.0 — TABLEAU DE BORD (maquette atelier-ecrans.html validée par Seb, 08/09/2026) :
   l'écran Production devient un routeur à 3 sous-vues :
   - "prod"  : tableau de bord — barre "Tout récolter" + 6 cartes bâtiment compactes
               (2 colonnes). La ROUTINE (récolter, surveiller) vit ici, en 1 tap.
   - "shops" : vue Ateliers AGRÉGÉE — les 12 ateliers de tous les bâtiments sur un seul
               écran (les chaînes de craft traversent les bâtiments : la Boulangerie mange
               la Farine du Moulin et l'Eau du Puits). Bandeau d'état en tête, amélioration
               DANS la carte (décision Seb), chaînage auto existant (v3.98.13) inchangé.
   - détail  : zones SEULES d'un bâtiment (les ateliers sont partis dans la vue agrégée) +
               actions groupées ("Améliorer la − chère" signalée sur la grille, "Défricher
               une zone").
   Bascule prod/shops par DOUBLE BOUTON (.pc-subtab-bar du kit) en tête — décision Seb :
   pas de 4e sous-onglet Village. État de navigation en variables module, NON sauvegardé
   (retour sur l'onglet = tableau de bord Production, volontaire).
   Les anciens panneaux dépliables par bâtiment (plots/workshops toggles) et les cartes
   horizontales sont RETIRÉS — reconstruction plutôt que patch, comme pour le kit UI. */

/* v3.414.0 (lot VUI-1) : Production et Ateliers sont deux onglets du rail du Village
   (ui/village-view.js). Le détail d'un bâtiment n'est plus une sous-page : c'est une FEUILLE
   (#village-modal-root, hors du panneau) avec la récolte, ses ateliers et ses zones.
   productionViewTab / productionDetailBuildingId restent lisibles par les anciens appelants. */
var productionViewTab = "prod";        // reflet de l'onglet du rail : "prod" | "shops"
var productionDetailBuildingId = null; // bâtiment dont la feuille est ouverte, null sinon
var productionSheetTab = "shops";      // onglet de la feuille : "shops" (ateliers) | "zones"
var productionZoneWin = null;          // v3.417.0 : zone dont la fenêtre d'actions est ouverte { b: buildingId, i: index }

function setProductionViewTab(tab) {
  productionViewTab = (tab === "shops") ? "shops" : "prod";
  if (typeof setVillageSubTab === "function") setVillageSubTab(productionViewTab === "shops" ? "shops" : "production");
  else if (typeof renderPanel === "function") renderPanel();
}
window.setProductionViewTab = setProductionViewTab;

function openProductionBuildingDetail(buildingId) {
  if (!PRODUCTION_BUILDINGS[buildingId]) return;
  if (productionDetailBuildingId !== buildingId) { productionSheetTab = "shops"; productionZoneWin = null; }
  productionDetailBuildingId = buildingId;
  openWorkshopId = null; workshopSheetBackId = null;
  if (typeof openVillageBuildingId !== "undefined") openVillageBuildingId = null; // un seul habitant pour #village-modal-root
  renderProductionSheet(false);
}
window.openProductionBuildingDetail = openProductionBuildingDetail;

/* silent : fermeture de service (changement d'onglet), sans rendu du panneau. */
function closeProductionSheet(silent) {
  var wasOpen = !!productionDetailBuildingId || !!openWorkshopId;
  productionDetailBuildingId = null;
  productionZoneWin = null;
  openWorkshopId = null; workshopSheetBackId = null; // v3.415.0 : la feuille d'atelier part avec
  if (typeof document === "undefined") return;
  var host = document.getElementById("village-modal-root");
  if (wasOpen && host && (host.querySelector(".prod-sheet") || host.querySelector(".wk-sheet"))) host.innerHTML = "";
  if (!silent && wasOpen && typeof renderPanel === "function") renderPanel();
}
window.closeProductionSheet = closeProductionSheet;
function closeProductionBuildingDetail() { closeProductionSheet(false); }
window.closeProductionBuildingDetail = closeProductionBuildingDetail;

function closeProductionSheetFromBackdrop(e) {
  if (e && e.target && e.target.classList && e.target.classList.contains("full-menu-overlay")) closeProductionSheet(false);
}
window.closeProductionSheetFromBackdrop = closeProductionSheetFromBackdrop;

function setProductionSheetTab(tab) {
  productionSheetTab = (tab === "zones") ? "zones" : "shops";
  productionZoneWin = null;
  renderProductionSheet(false);
}
window.setProductionSheetTab = setProductionSheetTab;

/* (Re)dessine la feuille ouverte. keepScroll : appelée à chaque renderPanel() du Village,
   elle garde la position de défilement du corps de feuille. */
function renderProductionSheet(keepScroll) {
  if (typeof document === "undefined") return;
  var host = document.getElementById("village-modal-root");
  if (!host) return;
  var id = productionDetailBuildingId;
  if (!id || !PRODUCTION_BUILDINGS[id]) return;
  var body = host.querySelector(".prod-sheet .ksheet-body");
  var top = (keepScroll && body) ? body.scrollTop : 0;
  host.innerHTML = buildProductionSheetHTML(id);
  var nb = host.querySelector(".prod-sheet .ksheet-body");
  if (nb && top) nb.scrollTop = top;
}
function refreshProductionSheet() {
  if (typeof document === "undefined") return;
  if (typeof refreshWarehouseSheets === "function" && refreshWarehouseSheets()) return; // v3.416.0 : feuille de l'Entrepôt
  if (openWorkshopId) { renderWorkshopSheet(true); return; } // v3.415.0 : la feuille d'atelier, si elle est ouverte
  if (!productionDetailBuildingId) return;
  var host = document.getElementById("village-modal-root");
  if (host && host.querySelector(".prod-sheet")) renderProductionSheet(true);
}
window.refreshProductionSheet = refreshProductionSheet;

/* Tick de ProductionManager.updateDOM() : jauge et libellé de la feuille (ids propres à la
   feuille, la vignette du tableau de bord garde les siens). */
function refreshProductionSheetDOM() {
  if (typeof refreshWorkshopTilesDOM === "function") refreshWorkshopTilesDOM(); // v3.415.0 : vignettes d'atelier
  if (typeof refreshCaravanDOM === "function") refreshCaravanDOM(); // v3.419.0 (E-2) : retour et compte à rebours de la caravane
  var id = productionDetailBuildingId;
  if (!id || typeof document === "undefined") return;
  var stock = ProductionManager.getStock(id), capacity = ProductionManager.getCapacity(id);
  var bar = document.getElementById("prod-sheet-bar-" + id);
  if (bar) bar.style.width = (capacity > 0 ? Math.min(100, (stock / capacity) * 100) : 0) + "%";
  var lab = document.getElementById("prod-sheet-stock-" + id);
  if (lab) lab.textContent = formatNumber(Math.floor(stock)) + " / " + formatNumber(capacity);
}
window.refreshProductionSheetDOM = refreshProductionSheetDOM;

/* v3.414.0 (VUI-1) : VIGNETTE d'un bâtiment de production (atelier village A2) — grande
   illustration, ruban d'état, jauge du stock local, ligne Entrepôt + zones. Toute la vignette
   ouvre la feuille du bâtiment. Ids prod-bar-/prod-stock-label- conservés : le tick
   ProductionManager.updateDOM() les tient à jour. Ruban : « Plein » (rouge) quand le stock
   local ET l'Entrepôt sont pleins, « Récolter » quand le stock local attend, sinon « ↑ zone ». */
function buildProductionDashCardHTML(id) {
  var def = PRODUCTION_BUILDINGS[id];
  if (!def) return "";
  var stock = ProductionManager.getStock(id);
  var capacity = ProductionManager.getCapacity(id);
  var isFull = capacity > 0 && stock >= capacity;
  var pct = capacity > 0 ? Math.min(100, (stock / capacity) * 100) : 0;
  var resKey = def.resourceKey;
  var resDef = WAREHOUSE_RESOURCES[resKey] || {};
  var storeFull = WarehouseManager.getFreeSpace(resKey) <= 0;
  var openCount = window.ProductionPlotsSystem ? ProductionPlotsSystem.getOpenPlotsCount(id) : 0;
  var upgradable = hasAffordableZoneAction(id);
  var cap = WarehouseManager.getCap(resKey);

  var flag = "";
  if (isFull && storeFull) flag = '<span class="prod-tile-rib is-full">' + _t("Plein") + '</span>';
  else if (isFull) flag = '<span class="prod-tile-rib is-ready">' + _t("Récolter") + '</span>';
  else if (upgradable) flag = '<span class="prod-tile-rib is-up"><img class="ico-sys" src="images/Icons/system/upgrade.png" alt="">' + _t("zone") + '</span>';

  var h = '<button type="button" class="production-dash-card prod-tile' + (isFull && storeFull ? ' is-full' : '') + '" onclick="openProductionBuildingDetail(\'' + id + '\')">';
  h += flag;
  h += renderIconOrEmojiHTML(def.buildingImage || resDef.icon, "prod-tile-img", _td(def.name));
  h += '<span class="production-dash-name">' + esc(_td(def.name)) + '</span>';
  h += '<span class="kgauge kgauge-thin kgauge-xp prod-tile-gauge"><span class="kgauge-track"><span class="kgauge-fill nb-entry-progress-fill' + (isFull ? ' done' : '') + '" id="prod-bar-' + id + '" style="width:' + pct + '%"></span></span>'
    + '<span class="kgauge-text" id="prod-stock-label-' + id + '">' + formatNumber(Math.floor(stock)) + ' / ' + formatNumber(capacity) + '</span></span>';
  h += '<span class="prod-tile-meta' + (storeFull ? ' is-store-full' : '') + '">' + renderIconOrEmojiHTML(resDef.icon, "ico-inline", _td(resDef.name))
    + formatNumber(Math.floor(WarehouseManager.getAmount(resKey))) + (cap !== Infinity ? ' / ' + formatNumber(cap) : '')
    + ' · ' + _t("{a}/{b} zones", { a: openCount, b: PRODUCTION_PLOTS_SHARED.totalPlots }) + '</span>';
  h += '</button>';
  return h;
}

/* Drapeau "AMÉLIORABLE" du tableau de bord : au moins UNE action de zone abordable dans
   ce bâtiment — améliorer une zone ouverte non-max, OU défricher une zone verrouillée.
   Balayage court (9 zones), recalculé à chaque render seulement. */
function hasAffordableZoneAction(buildingId) {
  if (!window.ProductionPlotsSystem || !ProductionPlotsSystem.isManaged(buildingId)) return false;
  var plots = ProductionPlotsSystem.getPlots(buildingId);
  for (var i = 0; i < plots.length; i++) {
    var plot = plots[i];
    var cost = null;
    if (plot.state === "locked") cost = ProductionPlotsSystem.isPlotRowOpen(i) ? getProductionPlotUnlockCost(buildingId, i) : null;
    else if (!ProductionPlotsSystem.isPlotMaxLevel(plot)) cost = getProductionPlotUpgradeCost(buildingId, plot.level, i);
    if (cost && Object.keys(cost).every(function (key) { return WarehouseManager.getAmount(key) >= cost[key]; })) return true;
  }
  return false;
}

/* Coût multi-ressources compact (or + jusqu'à 2 ressources), une icône+montant par
   ressource, chacune en rouge si le joueur n'a pas assez de cette ressource précise. */
function buildProductionCostRowHTML(cost, afford) {
  if (!cost) return "";
  var h = '<span class="production-cost-row">';
  Object.keys(cost).forEach(function (key) {
    var iconSrc = key === "gold" ? "images/Icons/gold_icon.png" : (WAREHOUSE_RESOURCES[key] ? WAREHOUSE_RESOURCES[key].icon : "");
    var canAffordThis = afford[key] !== false;
    h += '<span class="production-cost-item' + (canAffordThis ? '' : ' is-missing') + '">';
    h += '<img class="btn-buy-icon" src="' + esc(iconSrc) + '" alt="">' + formatNumber(cost[key]);
    h += '</span>';
  });
  h += '</span>';
  return h;
}

/* v3.417.0 (atelier zones Z2, choix Seb) : la grille 3×3 reste, sans sélection. Toucher une zone
   ouvre une FENÊTRE centrée avec ses actions ; sous la grille, un seul bouton fixe
   « ↑ La moins chère ». La prochaine zone à défricher est signalée sur la grille. */
function getNextUnlockablePlot(buildingId) {
  var plots = ProductionPlotsSystem.getPlots(buildingId);
  for (var i = 0; i < plots.length; i++) {
    if (plots[i].state === "locked" && ProductionPlotsSystem.isPlotRowOpen(i)) return i;
  }
  return null;
}

function buildPlotsPanelHTML(buildingId) {
  var plots = ProductionPlotsSystem.getPlots(buildingId);
  var cheapestIndex = getCheapestUpgradablePlot(buildingId);
  var nextIndex = getNextUnlockablePlot(buildingId);
  var h = '<div class="farm-plots-panel">';
  h += '<div class="farm-plots-grid">';
  plots.forEach(function (plot, index) {
    h += buildPlotCardHTML(buildingId, plot, index, nextIndex, cheapestIndex);
  });
  h += '</div>';
  h += '</div>';
  return h;
}

/* Mini-carte de zone : niveau, nom, profil, jauge, icônes d'amélioration (état seul).
   Toute la carte ouvre la fenêtre de la zone (v3.417.0). Les zones d'un monde pas encore
   atteint disent quel monde les ouvre et ne s'ouvrent pas. */
function buildPlotCardHTML(buildingId, plot, index, nextIndex, cheapestIndex) {
  var buildingCfg = PRODUCTION_PLOTS_BUILDINGS[buildingId];
  var zoneName = getProductionZoneName(buildingId, index);
  var classNames = "farm-plot-card" + (cheapestIndex === index ? " is-cheapest" : "");
  var open = ' onclick="openZoneWindow(\'' + buildingId + '\', ' + index + ')"';

  if (plot.state === "locked") {
    var rowOpen = ProductionPlotsSystem.isPlotRowOpen(index);
    classNames += " is-locked" + (index === nextIndex ? " is-next" : "");
    var h0 = '<button type="button" class="' + classNames + '"' + (rowOpen ? open : ' disabled') + '>';
    h0 += '<span class="farm-plot-card-lock-icon"><img class=ico-inline src=images/Icons/system/lock_closed.png></span>';
    h0 += '<span class="farm-plot-card-name">' + esc(zoneName) + '</span>';
    // v3.289.0 : une ligne par monde — la zone dit quel monde l'ouvre
    if (!rowOpen) h0 += '<span class="farm-plot-card-profile">' + esc(_td((WORLDS[Math.floor(index / 3)] || {}).name || '')) + '</span>';
    else if (index === nextIndex) h0 += '<span class="farm-plot-card-profile">' + _t("Défricher") + '</span>';
    h0 += '</button>';
    return h0;
  }

  classNames += " is-open";
  var profile = ProductionPlotsSystem.getProfile(index);
  var capacity = ProductionPlotsSystem.getPlotCapacity(index, plot);
  var pct = capacity > 0 ? Math.min(100, (plot.stock / capacity) * 100) : 0;

  var h = '<button type="button" class="' + classNames + '"' + open + '>';
  if (cheapestIndex === index) h += '<span class="farm-plot-card-cheap">' + _t("↑ la − chère") + '</span>';
  h += '<span class="farm-plot-card-level-badge">' + _t("Niv. {n}", { n: plot.level }) + '</span>';
  h += '<span class="farm-plot-card-name">' + esc(zoneName) + '</span>';
  h += '<span class="farm-plot-card-profile">' + esc(_td(profile.label)) + '</span>';
  h += '<span class="farm-plot-card-bar kgauge kgauge-thin kgauge-xp">';
  h += '<span class="kgauge-track"><span class="kgauge-fill nb-entry-progress-fill" id="prod-plot-bar-' + buildingId + '-' + index + '" style="width:' + pct + '%"></span></span>';
  h += '</span>';
  h += '<span class="farm-plot-card-stock-label" id="prod-plot-stock-' + buildingId + '-' + index + '">' + formatNumber(Math.floor(plot.stock)) + '/' + formatNumber(capacity) + '</span>';
  h += '<span class="farm-plot-card-improvements">';
  h += buildPlotImprovementIconHTML(buildingCfg, plot, "fertile");
  h += buildPlotImprovementIconHTML(buildingCfg, plot, "irrigated");
  h += '</span>';
  h += '</button>';
  return h;
}

/* Icône d'amélioration : état visuel seul (grisée/colorée), pas tapable directement —
   l'action se fait via la zone commune sous la grille, une fois la zone sélectionnée.
   Nom et icône propres à chaque bâtiment, lus depuis
   PRODUCTION_PLOTS_BUILDINGS[buildingId].improvementCost[kind] (voir data/production-plots.js) —
   plus de nom/icône générique en dur ici. */
function buildPlotImprovementIconHTML(buildingCfg, plot, kind) {
  var def = buildingCfg ? buildingCfg.improvementCost[kind] : null;
  if (!def) return "";
  var applied = !!plot[kind];
  var classNames = "farm-plot-improvement-icon" + (applied ? " is-applied" : "");
  return '<span class="' + classNames + '" title="' + esc(_td(def.label)) + '">' + renderIconOrEmojiHTML(def.icon, "farm-plot-improvement-img", _td(def.label)) + '</span>';
}

/* v3.417.0 : FENÊTRE d'une zone — une ligne par action, chacune avec son effet et son coût :
   Défricher (zone verrouillée), Niveau suivant (débit avant → après), puis les deux améliorations
   propres au bâtiment (installées : grisées, cochées). Coûts, libellés et icônes lus dans
   PRODUCTION_PLOTS_BUILDINGS. Rendue avec la feuille, elle survit à ses redessins. */
function openZoneWindow(buildingId, index) {
  productionZoneWin = { b: buildingId, i: index };
  renderProductionSheet(true);
}
window.openZoneWindow = openZoneWindow;

function closeZoneWindow() {
  productionZoneWin = null;
  renderProductionSheet(true);
}
window.closeZoneWindow = closeZoneWindow;

function buildZoneActionHTML(opts) {
  var h = '<button type="button" class="zone-act' + (opts.main ? ' is-main' : '') + (opts.done ? ' is-done' : '') + '"'
    + ((opts.done || !opts.canAfford) ? ' disabled' : '') + (opts.onclick ? ' onclick="' + opts.onclick + '"' : '') + '>';
  if (opts.iconHTML) h += opts.iconHTML;
  h += '<span class="zone-act-t"><b>' + esc(opts.label) + '</b><small>' + esc(opts.desc) + '</small></span>';
  h += opts.done ? '<span class="zone-act-ok">✓</span>' : buildPlotCostRowHTML(opts.cost);
  return h + '</button>';
}

/* v3.422.0 : un débit sous 1/min garde deux décimales (0,28 et 0,35 s'affichaient tous deux 0,3). */
function formatRatePerMin(v) {
  v = Number(v || 0);
  var two = Math.round(v * 100) / 100;
  if (two >= 1 || two === 0) return formatNumber(Math.round(v * 10) / 10);
  return String(two).replace(".", ",");
}
window.formatRatePerMin = formatRatePerMin;

function buildZoneWindowHTML(buildingId, index) {
  var plots = ProductionPlotsSystem.getPlots(buildingId);
  var plot = plots[index];
  if (!plot) return "";
  var buildingCfg = PRODUCTION_PLOTS_BUILDINGS[buildingId];
  var resDef = WAREHOUSE_RESOURCES[(PRODUCTION_BUILDINGS[buildingId] || {}).resourceKey] || {};
  var resName = _td(resDef.name || "");
  var zoneName = getProductionZoneName(buildingId, index);
  var affordable = function (cost) { return !!cost && Object.keys(cost).every(function (k) { return WarehouseManager.getAmount(k) >= cost[k]; }); };
  var locked = plot.state === "locked";
  var profile = ProductionPlotsSystem.getProfile(index);

  var h = '<div class="kwin-veil zone-win-veil" onclick="if (event.target === this) closeZoneWindow()"><div class="kwin zone-win" role="dialog">';
  h += kWinHeadHTML({ title: esc(zoneName), sub: esc(locked ? _t("Zone à défricher") : _t("{x} · niveau {n}", { x: _td(profile.label), n: plot.level })), close: "closeZoneWindow()" });
  h += '<div class="kwin-body">';

  if (locked && !ProductionPlotsSystem.isPlotRowOpen(index)) {
    h += '<p class="zone-win-txt">' + esc(_t("S'ouvre {lieu}", { lieu: ProductionPlotsSystem.getPlotRowOpening(index) })) + '</p>';
  } else if (locked) {
    var uc = getProductionPlotUnlockCost(buildingId, index);
    h += buildZoneActionHTML({ main: true, onclick: "productionPlotUnlock('" + buildingId + "', " + index + ")", iconHTML: '<img class="zone-act-ico" src="images/Icons/system/lock_open.png" alt="">',
      label: _t("Défricher"), desc: _t("Rend cette zone exploitable."), cost: uc, canAfford: affordable(uc) });
  } else {
    var capacity = ProductionPlotsSystem.getPlotCapacity(index, plot);
    // v3.422.0 : le débit de la zone, toujours visible (aussi au niveau max)
    h += '<div class="zone-win-rate"><span>' + esc(_t("Débit")) + '</span><b>' + esc(_t("{n} {x}/min", { n: formatRatePerMin(ProductionPlotsSystem.getPlotRatePerMin(index, plot, buildingId)), x: resName })) + '</b></div>';
    h += '<div class="kgauge kgauge-thin kgauge-xp zone-win-gauge"><div class="kgauge-track"><div class="kgauge-fill" style="width:' + (capacity > 0 ? Math.min(100, (plot.stock / capacity) * 100) : 0) + '%"></div></div>'
      + '<span class="kgauge-text">' + formatNumber(Math.floor(plot.stock)) + ' / ' + formatNumber(capacity) + '</span></div>';
    if (ProductionPlotsSystem.isPlotMaxLevel(plot)) {
      // v3.289.0 / v3.336.0 (F-2) : le plafond du monde dit où s'ouvre le niveau suivant
      h += ProductionPlotsSystem.isPlotLevelWorldCapped(plot)
        ? '<button type="button" class="zone-act is-info" onclick="productionZoneCapHowTo(' + plot.level + ')"><span class="zone-act-t"><b>' + esc(_t("Plafond de ce monde (niv. {n})", { n: plot.level })) + '</b><small>' + _t("Touche pour savoir où s'ouvre la suite.") + '</small></span><span class="zone-act-ok">?</span></button>'
        : '<div class="zone-act is-info is-done"><span class="zone-act-t"><b>' + _t("Niveau max") + '</b></span></div>';
    } else {
      var up = getProductionPlotUpgradeCost(buildingId, plot.level, index);
      var rateNow = ProductionPlotsSystem.getPlotRatePerMin(index, plot, buildingId);
      var rateNext = ProductionPlotsSystem.getPlotRatePerMin(index, { level: plot.level + 1, fertile: plot.fertile, irrigated: plot.irrigated }, buildingId);
      h += buildZoneActionHTML({ main: true, onclick: "productionPlotUpgrade('" + buildingId + "', " + index + ")", iconHTML: '<img class="zone-act-ico" src="images/Icons/system/upgrade.png" alt="">',
        label: _t("Niveau {n}", { n: plot.level + 1 }), desc: _t("{x}/min : {a} → {b}", { x: resName, a: formatRatePerMin(rateNow), b: formatRatePerMin(rateNext) }), cost: up, canAfford: affordable(up) });
    }
    ["fertile", "irrigated"].forEach(function (kind) {
      var d = buildingCfg ? buildingCfg.improvementCost[kind] : null;
      if (!d) return;
      var pctB = Math.round(PRODUCTION_PLOTS_SHARED.bonusPerImprovement[kind] * 100);
      h += buildZoneActionHTML({ done: !!plot[kind], onclick: "productionPlotToggleImprovement('" + buildingId + "', " + index + ", '" + kind + "')",
        iconHTML: renderIconOrEmojiHTML(d.icon, "zone-act-ico", _td(d.label)), label: _td(d.label),
        desc: plot[kind] ? _t("Installé") : _t("+{p}% {x}, permanent.", { p: pctB, x: resName }), cost: d.cost, canAfford: affordable(d.cost) });
    });
  }
  h += '</div></div></div>';
  return h;
}
window.buildZoneWindowHTML = buildZoneWindowHTML;

/* v3.371.0 (i18n) : le message traduit n'est plus écrit dans l'onclick (apostrophes). */
function productionZoneCapHowTo(level) {
  if (typeof showHowToToast === "function") showHowToToast(_t("Plafond de ce monde (niv. {n})", { n: level }), "zoneCap", { level: level });
}
window.productionZoneCapHowTo = productionZoneCapHowTo;

function buildPlotCostRowHTML(cost) {
  if (!cost) return "";
  var h = '<span class="production-cost-row">';
  Object.keys(cost).forEach(function (key) {
    var iconSrc = WAREHOUSE_RESOURCES[key] ? WAREHOUSE_RESOURCES[key].icon : "";
    var canAffordThis = WarehouseManager.getAmount(key) >= cost[key];
    h += '<span class="production-cost-item' + (canAffordThis ? '' : ' is-missing') + '">';
    h += '<img class="btn-buy-icon" src="' + esc(iconSrc) + '" alt="">' + formatNumber(cost[key]);
    h += '</span>';
  });
  h += '</span>';
  return h;
}

function productionPlotUnlock(buildingId, plotIndex) {
  var result = ProductionPlotsSystem.unlockPlot(buildingId, plotIndex);
  if (!result.ok) showToast(result.reason, 1200);
}
window.productionPlotUnlock = productionPlotUnlock;

function productionPlotUpgrade(buildingId, plotIndex) {
  var result = ProductionPlotsSystem.upgradePlot(buildingId, plotIndex);
  if (!result.ok) showToast(result.reason, 1200);
}
window.productionPlotUpgrade = productionPlotUpgrade;

function productionPlotToggleImprovement(buildingId, plotIndex, kind) {
  var result = ProductionPlotsSystem.toggleImprovement(buildingId, plotIndex, kind);
  if (!result.ok) showToast(result.reason, 1200);
}
window.productionPlotToggleImprovement = productionPlotToggleImprovement;


/* ============================================================
   v3.191.0 : détail bâtiment (zones SEULES) — sous-vue plein cadre.
   La grille 3×3 + la zone d'actions de la sélection sont réutilisées
   telles quelles (buildPlotsPanelHTML) ; s'ajoutent un en-tête (retour,
   nom, stock + récolte locale) et les ACTIONS GROUPÉES.
   ============================================================ */

/* "La − chère" : parmi les zones OUVERTES non-max, celle au coût d'amélioration
   total minimal. Heuristique du total = somme des 2 montants — comparables entre elles
   car un bâtiment n'utilise que 2 ressources de coût fixes (voir
   PRODUCTION_PLOTS_BUILDINGS.upgradeCost), jamais comparées entre bâtiments. */
function getCheapestUpgradablePlot(buildingId) {
  if (!window.ProductionPlotsSystem || !ProductionPlotsSystem.isManaged(buildingId)) return null;
  var plots = ProductionPlotsSystem.getPlots(buildingId);
  var best = null, bestTotal = Infinity;
  plots.forEach(function (plot, index) {
    if (plot.state !== "open" || ProductionPlotsSystem.isPlotMaxLevel(plot)) return;
    var cost = getProductionPlotUpgradeCost(buildingId, plot.level, index);
    var total = 0;
    Object.keys(cost).forEach(function (key) { total += cost[key]; });
    if (total < bestTotal) { bestTotal = total; best = index; }
  });
  return best;
}

/* v3.417.0 : sous la grille, un seul bouton fixe — « ↑ La moins chère » (la zone est signalée
   sur la grille) — et une ligne d'aide. Défricher passe par la zone signalée « Défricher ». */
function buildZoneGroupActionsHTML(buildingId) {
  var h = '<div class="production-group-actions">';
  var cheapest = getCheapestUpgradablePlot(buildingId);
  if (cheapest !== null) {
    var plots = ProductionPlotsSystem.getPlots(buildingId);
    var cost = getProductionPlotUpgradeCost(buildingId, plots[cheapest].level, cheapest);
    var afford = {}, all = true;
    Object.keys(cost).forEach(function (key) { afford[key] = WarehouseManager.getAmount(key) >= cost[key]; if (!afford[key]) all = false; });
    h += '<button class="kbtn primary production-group-btn" type="button" ' + (all ? '' : 'disabled') + ' onclick="productionUpgradeCheapest(\'' + buildingId + '\')">';
    h += _t("↑ La moins chère") + ' ' + buildProductionCostRowHTML(cost, afford);
    h += '</button>';
  }
  h += '<p class="production-group-hint">' + _t("Touche une zone pour ses actions.") + '</p>';
  h += '</div>';
  return h;
}

function productionUpgradeCheapest(buildingId) {
  var index = getCheapestUpgradablePlot(buildingId);
  if (index === null) return;
  var result = ProductionPlotsSystem.upgradePlot(buildingId, index);
  if (!result.ok) showToast(result.reason, 1200);
  else showToast(_t("« {x} » améliorée", { x: getProductionZoneName(buildingId, index) }), 1200);
}
window.productionUpgradeCheapest = productionUpgradeCheapest;


/* v3.414.0 (VUI-1) : FEUILLE d'un bâtiment de production — en-tête de pierre (illustration,
   nom), récolte locale, puis un rail Ateliers · Zones. Les zones reprennent la grille 3×3 et
   les actions groupées d'avant ; les ateliers, les cartes de la vue Ateliers (VUI-2 les
   passera en vignettes). Rendue dans #village-modal-root, hors du panneau. */
function buildProductionSheetHTML(buildingId) {
  var def = PRODUCTION_BUILDINGS[buildingId];
  if (!def) return "";
  var resKey = def.resourceKey;
  var resDef = WAREHOUSE_RESOURCES[resKey] || {};
  var stock = ProductionManager.getStock(buildingId);
  var capacity = ProductionManager.getCapacity(buildingId);
  var hasStock = Math.floor(stock) > 0;
  var pct = capacity > 0 ? Math.min(100, (stock / capacity) * 100) : 0;
  var openCount = ProductionPlotsSystem.getOpenPlotsCount(buildingId);
  var cap = WarehouseManager.getCap(resKey);
  var storeFull = WarehouseManager.getFreeSpace(resKey) <= 0;
  var shops = getWorkshopsOfBuilding(buildingId);

  var h = '<div class="full-menu-overlay" onclick="closeProductionSheetFromBackdrop(event)">';
  h += '<div class="full-menu vb-sheet-card prod-sheet" onclick="event.stopPropagation()">';
  h += kSheetHeadHTML({
    icon: renderIconOrEmojiHTML(def.buildingImage || resDef.icon, "vb-sheet-icon prod-sheet-icon", _td(def.name)),
    title: esc(_td(def.name)),
    sub: esc(_t("+{n}/min · {a}/{b} zones", { n: formatNumber(ProductionManager.getRatePerMin(buildingId)), a: openCount, b: PRODUCTION_PLOTS_SHARED.totalPlots })),
    close: "closeProductionBuildingDetail()"
  });
  h += '<div class="ksheet-body">';

  // Récolte : ressource, jauge du stock local, bouton (id prod-harvest-btn- tenu par updateDOM)
  h += '<div class="prod-sheet-harvest">';
  h += renderIconOrEmojiHTML(resDef.icon, "prod-sheet-res", _td(resDef.name));
  h += '<div class="prod-sheet-harvest-mid">';
  h += '<div class="kgauge kgauge-thin kgauge-xp"><div class="kgauge-track"><div class="kgauge-fill nb-entry-progress-fill" id="prod-sheet-bar-' + buildingId + '" style="width:' + pct + '%"></div></div>'
    + '<span class="kgauge-text" id="prod-sheet-stock-' + buildingId + '">' + formatNumber(Math.floor(stock)) + ' / ' + formatNumber(capacity) + '</span></div>';
  h += '<div class="prod-sheet-store">' + esc(_t("Entrepôt : {a}", { a: formatNumber(Math.floor(WarehouseManager.getAmount(resKey))) + (cap !== Infinity ? ' / ' + formatNumber(cap) : '') })) + '</div>';
  h += '</div>';
  h += '<button class="kbtn primary prod-sheet-harvest-btn' + (hasStock ? '' : ' is-disabled') + '" id="prod-harvest-btn-' + buildingId + '" type="button" ' + (hasStock ? '' : 'disabled') + ' onclick="ProductionManager.harvest(\'' + buildingId + '\')">';
  h += '<img class="btn-buy-icon" src="images/Icons/gold_icon.png" alt="">' + _t("Récolter") + (hasStock ? ' · ' + formatNumber(Math.floor(stock)) : '');
  h += '</button>';
  h += '</div>';
  if (storeFull) h += '<div class="prod-sheet-warn">' + esc(_t("L'Entrepôt est plein de {x} : la récolte attendra. Ses ateliers en consomment.", { x: _td(resDef.name || "") })) + '</div>';

  // Rail de la feuille : Ateliers · Zones
  var tab = shops.length ? productionSheetTab : "zones";
  // le nom de section porte un emoji en tête (données) : le rail a déjà son icône
  var label = PRODUCTION_PLOTS_BUILDINGS[buildingId] ? _td(PRODUCTION_PLOTS_BUILDINGS[buildingId].sectionLabel).replace(/^[^A-Za-zÀ-ÿ]+/, "") : _t("Zones");
  h += '<div class="kseg is-stack prod-sheet-tabs">';
  if (shops.length) h += '<button type="button" class="' + (tab === "shops" ? 'is-on' : '') + '" onclick="setProductionSheetTab(\'shops\')"><img src="images/Icons/subtabs/workshops.png" alt=""><span>' + esc(_t("Ateliers · {n}", { n: shops.length })) + '</span></button>';
  h += '<button type="button" class="' + (tab === "zones" ? 'is-on' : '') + '" onclick="setProductionSheetTab(\'zones\')"><img src="images/Icons/subtabs/production.png" alt=""><span>' + esc(label) + ' · ' + openCount + '/' + PRODUCTION_PLOTS_SHARED.totalPlots + '</span></button>';
  h += '</div>';

  if (tab === "shops") {
    h += '<div class="wk-grid">';
    shops.forEach(function (w) { h += buildWorkshopTileHTML(w, buildingId); });
    h += '</div>';
  } else {
    h += buildPlotsPanelHTML(buildingId);
    h += buildZoneGroupActionsHTML(buildingId);
  }

  h += '</div></div></div>';
  // v3.417.0 : fenêtre d'une zone, par-dessus la feuille
  if (productionZoneWin && productionZoneWin.b === buildingId && tab === "zones") h += buildZoneWindowHTML(buildingId, productionZoneWin.i);
  return h;
}
window.buildProductionSheetHTML = buildProductionSheetHTML;

/* Ateliers d'un bâtiment, enrichis de leur id (WORKSHOPS_CONFIG n'en porte pas, voir v3.191.1). */
function getWorkshopsOfBuilding(buildingId) {
  return Object.keys(WORKSHOPS_CONFIG).filter(function (wid) { return WORKSHOPS_CONFIG[wid].buildingId === buildingId; })
    .map(function (wid) { return Object.assign({ id: wid }, WORKSHOPS_CONFIG[wid]); });
}
window.getWorkshopsOfBuilding = getWorkshopsOfBuilding;

/* ============================================================
   Section "<img class=ico-inline src=images/Icons/system/settings.png> Production" — ateliers de craft locaux au bâtiment
   (voir WorkshopsSystem, data/workshops.js). Toggle dépliable au même
   niveau que "<img class=ico-inline src=images/Icons/scene/scene_harvest.png> Parcelles" etc., état indépendant par bâtiment.
   ============================================================ */

var selectedWorkshopRecipe = {}; // { [workshopId]: recipeId } — mémorise le choix de recette par atelier
var workshopCraftQty = {};       // { [workshopId]: number } — quantité du CRAFT MANUEL (bouton Fabriquer)
var workshopAutoQty = {};        // { [workshopId]: number } — v3.98.15 : quantité du CHAÎNAGE AUTO, un
                                  // champ dédié et SÉPARÉ du stepper manuel (retour Seb : les deux champs
                                  // se confondaient auparavant). Démarre à 1 à chaque activation de l'auto
                                  // sur une recette, ajustable ensuite indépendamment du stepper manuel.
                                  // Une seule recette auto par atelier -> clé par workshopId suffit.

/* Décision (4) : coût seul sur le bouton d'amélioration, en tête de carte —
   l'effet du niveau est confirmé au toast (voir upgradeWorkshop). */
function buildWorkshopUpgradeCompactHTML(workshopId) {
  if (WorkshopsSystem.isMaxLevel(workshopId)) {
    // v3.289.0 : plafond du monde, la suite viendra au monde suivant
    return WorkshopsSystem.isWorldCapped(workshopId)
      ? '<span class="wk-up is-max" title="' + esc(_t("Plafond de ce monde")) + '">' + _t("MAX {n}", { n: WorkshopsSystem.getLevel(workshopId) }) + '</span>'
      : '<span class="wk-up is-max">' + _t("MAX") + '</span>';
  }
  var cost = WorkshopsSystem.getUpgradeCost(workshopId);
  var afford = WorkshopsSystem.getUpgradeAffordability(workshopId);
  var h = '<button class="wk-up' + (afford.all ? '' : ' is-disabled') + '" type="button" ' + (afford.all ? '' : 'disabled') + ' onclick="upgradeWorkshop(\'' + workshopId + '\')">';
  h += '<img class=ico-inline src=images/Icons/system/upgrade.png> ' + buildProductionCostRowHTML(cost, afford);
  h += '</button>';
  return h;
}

/* v3.192.0 : file en CASES (taille = niveau d'atelier) + entrée courante (nom ×N,
   temps restant, barre fine) + <img class=ico-inline src=images/Icons/system/close.png> d'annulation sur les lots suivants. Conteneur
   workshop-queue-{id} et ids prod-workshop-time-/bar- CONSERVÉS : le tick
   (updateDOM) et refreshWorkshopQueueDOM ci-dessous fonctionnent sans changement.
   Le calcul de pct reprend celui d'updateDOM (craftTimeMs brut × times). */
function buildWorkshopQueueHTML(workshopId) {
  var queue = WorkshopsSystem.getQueue(workshopId);
  var maxLen = WorkshopsSystem.getMaxQueueLength(workshopId);

  var h = '<div class="wk-queue" id="workshop-queue-' + workshopId + '">';
  for (var q = 0; q < maxLen; q++) {
    var entry = q < queue.length ? queue[q] : null;
    h += '<span class="wk-slot' + (entry ? ' is-filled' : '') + '">';
    if (entry) {
      var r = WorkshopsSystem.getRecipe(workshopId, entry.recipeId);
      var d = r ? (WAREHOUSE_RESOURCES[r.outputs[0].resourceId] || {}) : {};
      h += renderIconOrEmojiHTML(d.icon, "wk-slot-ico", _td(d.name));
      if (q > 0) h += '<span class="wk-slot-x" onclick="cancelWorkshopCraft(\'' + workshopId + '\', \'' + esc(entry.id) + '\')" role="button" aria-label="' + esc(_t("Annuler")) + '"><img class=ico-inline src=images/Icons/system/close.png></span>';
    }
    h += '</span>';
  }

  if (queue.length) {
    var cur = queue[0];
    var curRecipe = WorkshopsSystem.getRecipe(workshopId, cur.recipeId);
    var curDef = curRecipe ? WAREHOUSE_RESOURCES[curRecipe.outputs[0].resourceId] : null;
    var totalMs = Number(curRecipe ? curRecipe.craftTimeMs : 0) * cur.times;
    var pct = totalMs > 0 ? Math.min(100, Math.max(0, Math.floor(100 - (cur.msRemaining / totalMs) * 100))) : 100;
    h += '<span class="wk-current">';
    h += '<span class="wk-current-label"><span>' + esc(curDef ? _td(curDef.name) : "?") + ' ×' + formatNumber(cur.times) + '</span>';
    h += '<span id="prod-workshop-time-' + workshopId + '">' + formatCraftDuration(cur.msRemaining) + '</span></span>';
    h += '<span class="wk-current-bar"><span class="wk-current-bar-fill" id="prod-workshop-bar-' + workshopId + '" style="width:' + pct + '%"></span></span>';
    h += '</span>';
  } else {
    h += '<span class="wk-queue-empty">' + _tn(maxLen, "file vide · {n} emplacement", "file vide · {n} emplacements") + '</span>';
  }

  h += '</div>';
  return h;
}

/* v3.98.21 : régénère UNIQUEMENT le bloc file d'un atelier (id ci-dessus), sans toucher
   au reste du DOM de la page — appelée à la place de renderPanel() par
   WorkshopsSystem.tickWorkshop()/_tryAutoEnqueue() lors d'une complétion/ajout auto de
   lot. Si l'élément n'existe pas (carte pas dépliée, ou pas sur cette page), ne fait
   rien : le prochain renderPanel() normal (déclenché par une vraie action du joueur, ou
   au retour sur cette page) affichera l'état à jour de toute façon. */
function refreshWorkshopQueueDOM(workshopId) {
  if (typeof document === "undefined") return; // garde défensive (harnais de test Node)
  // v3.415.0 : la vignette change d'état (En cours -> Libre) sans rendu complet
  var tile = document.getElementById("wk-tile-" + workshopId);
  if (tile && WORKSHOPS_CONFIG[workshopId]) {
    tile.outerHTML = buildWorkshopTileHTML(Object.assign({ id: workshopId }, WORKSHOPS_CONFIG[workshopId]), tile.closest && tile.closest(".prod-sheet") ? productionDetailBuildingId : null);
  }
  var container = document.getElementById("workshop-queue-" + workshopId);
  if (!container) return;
  container.outerHTML = buildWorkshopQueueHTML(workshopId);
}
window.refreshWorkshopQueueDOM = refreshWorkshopQueueDOM;

function selectWorkshopRecipe(workshopId, recipeId) {
  selectedWorkshopRecipe[workshopId] = recipeId;
  workshopCraftQty[workshopId] = 1;
  if (typeof renderPanel === "function") renderPanel();
}
window.selectWorkshopRecipe = selectWorkshopRecipe;


/* v3.98.16 : saisie directe dans le champ de quantité (retour Seb — un clic accidentel
   sur "Max" doit pouvoir se corriger en tapant le chiffre voulu, pas juste via -/+).
   Valeur hors limites (NaN, <1, >max) corrigée SILENCIEUSEMENT vers la borne valide la
   plus proche, décision validée avec Seb. */
function setWorkshopCraftQty(workshopId, rawValue) {
  var recipeId = selectedWorkshopRecipe[workshopId];
  var maxCrafts = WorkshopsSystem.getMaxCraftTimes(workshopId, recipeId);
  if (maxCrafts <= 0) return;

  var parsed = Math.floor(Number(rawValue));
  if (!isFinite(parsed)) parsed = 1;
  workshopCraftQty[workshopId] = Math.max(1, Math.min(maxCrafts, parsed));
  if (typeof renderPanel === "function") renderPanel();
}
window.setWorkshopCraftQty = setWorkshopCraftQty;

function confirmCraftWorkshop(workshopId) {
  var recipeId = selectedWorkshopRecipe[workshopId];
  var qty = workshopCraftQty[workshopId] || 1;
  WorkshopsSystem.enqueueCraft(workshopId, recipeId, qty);
  workshopCraftQty[workshopId] = 1;
}
window.confirmCraftWorkshop = confirmCraftWorkshop;


/* v3.98.16 : saisie directe pour le stepper auto — même logique de correction
   silencieuse que setWorkshopCraftQty. */
function setWorkshopAutoQty(workshopId, rawValue) {
  var recipeId = WorkshopsSystem.getAutoRecipeId(workshopId);
  if (!recipeId) return;
  var maxAuto = WorkshopsSystem.getMaxAutoCraftTimes(workshopId, recipeId);
  if (maxAuto <= 0) maxAuto = 1;

  var parsed = Math.floor(Number(rawValue));
  if (!isFinite(parsed)) parsed = 1;
  workshopAutoQty[workshopId] = Math.max(1, Math.min(maxAuto, parsed));
  if (typeof renderPanel === "function") renderPanel();
}
window.setWorkshopAutoQty = setWorkshopAutoQty;

/* Appelée par WorkshopsSystem._tryAutoEnqueue() pour déterminer la quantité voulue par
   le chaînage auto — le réglage dédié ci-dessus, borné par `maxAuto` (déjà limité par la
   réserve protégée côté appelant, peut avoir changé depuis le dernier réglage manuel). */
function resolveAutoCraftQty(workshopId, recipeId, maxAuto) {
  var qty = workshopAutoQty[workshopId] || 1;
  return Math.min(qty, maxAuto);
}
window.resolveAutoCraftQty = resolveAutoCraftQty;

/* v3.192.0 (décision 4 de la maquette v4) : le bouton compact n'affiche que le coût —
   l'effet du niveau (vitesse, taille de file) est confirmé ICI, au toast. */
function upgradeWorkshop(workshopId) {
  var def = WORKSHOPS_CONFIG[workshopId];
  var recipe = def && def.recipes ? def.recipes[0] : null;
  var result = WorkshopsSystem.upgradeWorkshop(workshopId);
  if (!result || !result.ok) {
    if (result && result.reason) showToast(result.reason, 1200);
    return;
  }
  var lvl = WorkshopsSystem.getLevel(workshopId);
  var eff = recipe ? formatCraftDuration(WorkshopsSystem.getEffectiveCraftTimeMs(workshopId, recipe)) : "";
  showToast(_t("{x} niv {n}", { x: def ? _td(def.name) : "", n: lvl }) + (eff ? " : " + _t("{d}/lot", { d: eff }) : "") + " · " + _t("file {n}", { n: WorkshopsSystem.getMaxQueueLength(workshopId) }), 1600);
}
window.upgradeWorkshop = upgradeWorkshop;

/* v3.98.15 : réinitialise le stepper auto dédié à 1 à chaque ACTIVATION (pas à la
   désactivation, ni au remplacement où on repart aussi à 1 — cohérent avec "valeur de
   base à 1" demandé, peu importe ce qui était réglé pour une éventuelle recette
   précédente sur ce même atelier). */
function setWorkshopAutoRecipe(workshopId, recipeId) {
  var wasActive = WorkshopsSystem.getAutoRecipeId(workshopId) === recipeId;
  WorkshopsSystem.setAutoRecipe(workshopId, recipeId);
  if (!wasActive) workshopAutoQty[workshopId] = 1; // vient d'être ACTIVÉE (ou remplacée)
}
window.setWorkshopAutoRecipe = setWorkshopAutoRecipe;

function cancelWorkshopCraft(workshopId, queueId) {
  WorkshopsSystem.cancelCraft(workshopId, queueId);
}
window.cancelWorkshopCraft = cancelWorkshopCraft;

/* ============================================================
   v3.191.0 : routeur du tableau de bord — remplace l'ancienne page
   unique à cartes dépliables (buildHarvestAllButtonHTML +
   buildProductionCardHTML/buildPlotsCardHTML retirés).
   ============================================================ */

/* Barre d'action de la vue Production : "Tout récolter" en bouton primaire du kit
   (id prod-harvest-all-btn conservé — ProductionManager.updateDOM() le tient à jour)
   + indice du nombre de bâtiments améliorables. Le bouton "Files" a migré en tête de
   la vue Ateliers (buildShopsViewHTML), sa place naturelle. */
function buildProdActionBarHTML() {
  var totalStock = 0;
  Object.keys(PRODUCTION_BUILDINGS).forEach(function (id) {
    if (!ProductionManager.isBuildingUnlocked(id)) return;
    totalStock += Math.floor(ProductionManager.getStock(id));
  });
  var hasAnyStock = totalStock > 0;

  var h = '<button class="settings-btn primary production-harvest-all-kbtn' + (hasAnyStock ? '' : ' is-locked') + '" id="prod-harvest-all-btn" type="button" ' + (hasAnyStock ? '' : 'disabled') + ' onclick="ProductionManager.harvestAll()">';
  h += '<img class="ico-btn" src="images/Icons/system/collect_all.png" alt=""> ' + _t("Tout récolter");
  h += '</button>';
  h += '<p class="production-dash-hint">' + _t("Touche un bâtiment pour ses ateliers et ses zones") + '</p>';
  return h;
}

/* v3.265.0 (retour Seb) — BÂTIMENTS MANQUANTS.
   Une fois les déblocages portés par l'Histoire terminés (Puits, Chasse, Carrière : fin de
   « La veine instable »), les bâtiments encore verrouillés s'affichent au tableau de bord.
   Toucher la carte mène à la quête qui les débloque (Scierie, Champs, Mine). Avant ce moment
   ils restent invisibles, comme depuis la v3.92.0 : l'Histoire guide seule. */
function getProductionUnlockQuestId(buildingId) {
  var found = null;
  Object.keys(window.SCENE_TEMPLATES || {}).some(function (tid) {
    var u = SCENE_TEMPLATES[tid].unlockOnSuccess;
    if (u && u.buildingId === buildingId) { found = tid; return true; }
    return false;
  });
  return found;
}
window.getProductionUnlockQuestId = getProductionUnlockQuestId;

function areStoryBuildingUnlocksDone() {
  var st = (game.storyQuests || {}).forest;
  return !!(st && (st.skipped || (st.claimedSteps || {}).forest_09));
}
window.areStoryBuildingUnlocksDone = areStoryBuildingUnlocksDone;

function buildProductionLockedCardHTML(id) {
  var def = PRODUCTION_BUILDINGS[id];
  var questId = getProductionUnlockQuestId(id);
  if (!def || !questId) return "";
  var resDef = WAREHOUSE_RESOURCES[def.resourceKey] || {};
  var tpl = SCENE_TEMPLATES[questId];
  var run = game.sceneRun;
  var running = !!(run && run.templateId === questId && run.status !== "completed");
  var accepted = running || !!((game.explorationProgression || {}).boardAccepted || {})[questId];
  var h = '<button type="button" class="production-dash-card prod-tile is-locked" onclick="goToProductionUnlockQuest(\'' + id + '\')">';
  h += '<span class="prod-tile-rib is-lock"><img class="ico-sys" src="images/Icons/system/lock_closed.png" alt="">' + _t("À débloquer") + '</span>';
  h += renderIconOrEmojiHTML(def.buildingImage || resDef.icon, "prod-tile-img", _td(def.name));
  h += '<span class="production-dash-name">' + esc(_td(def.name)) + '</span>';
  h += '<span class="production-dash-lock-quest">' + esc(tpl.title ? _td(tpl.title) : questId) + '</span>';
  h += '<span class="production-dash-status">' + (running ? _t("En cours") : accepted ? _t("Acceptée · touche pour partir") : _t("Touche pour voir la quête")) + ' ›</span>';
  h += '</button>';
  return h;
}

function goToProductionUnlockQuest(buildingId) {
  var questId = getProductionUnlockQuestId(buildingId);
  if (!questId) return;
  if (typeof highlightQuestCard === "function") highlightQuestCard("scene_" + questId);
  if (typeof openQuestsAt === "function") openQuestsAt("expedition", "scene_" + questId);
}
window.goToProductionUnlockQuest = goToProductionUnlockQuest;
window.buildProductionLockedCardHTML = buildProductionLockedCardHTML;

function buildProdDashboardHTML() {
  var h = buildProdActionBarHTML();
  h += '<div class="production-dash-grid">';
  Object.keys(PRODUCTION_BUILDINGS).forEach(function (id) {
    if (!ProductionManager.isBuildingUnlocked(id)) return; // v3.92.0 : Carrière verrouillée -> invisible
    h += buildProductionDashCardHTML(id);
  });
  if (areStoryBuildingUnlocksDone()) { // v3.265.0 : les bâtiments restants, en fin de grille
    Object.keys(PRODUCTION_BUILDINGS).forEach(function (id) {
      if (!ProductionManager.isBuildingUnlocked(id)) h += buildProductionLockedCardHTML(id);
    });
  }
  h += '</div>';
  return h;
}

/* "À l'arrêt" = atelier actif dont le chaînage auto est ACTIVÉ mais ne peut plus
   produire (file vide + aucun lot possible, intrants ou réserve) — c'est l'info de
   pilotage qu'on vient chercher sur cette vue. Un atelier sans auto n'est jamais
   compté "à l'arrêt" : ne rien produire est alors son état normal. */
function countStalledWorkshops() {
  return Object.keys(WORKSHOPS_CONFIG).filter(function (workshopId) {
    var def = WORKSHOPS_CONFIG[workshopId];
    if (!def.active || !ProductionManager.isBuildingUnlocked(def.buildingId)) return false;
    var autoId = WorkshopsSystem.getAutoRecipeId(workshopId);
    if (!autoId) return false;
    if (WorkshopsSystem.getQueue(workshopId).length > 0) return false;
    return WorkshopsSystem.getMaxAutoCraftTimes(workshopId, autoId) <= 0;
  }).length;
}

/* ============================================================
   v3.415.0 (lot VUI-2, atelier village A2 validé par Seb, 01/10/2026) :
   ATELIERS EN VIGNETTES + FEUILLE D'ATELIER.
   - Vignette : illustration, niveau, recette en icônes, ruban d'état (En cours + barre,
     ×N possible, Bloqué, À l'arrêt), groupées par bâtiment.
   - Feuille (#village-modal-root, comme la feuille de bâtiment) : recette en grand avec les
     stocks, choix de recette, file en cases, quantité ×1/×5/×10/Max, Fabriquer, Continu,
     amélioration. Ouverte depuis la feuille d'un bâtiment, elle porte un lien de retour.
   Les ids canoniques de file (workshop-queue-, prod-workshop-time-/bar-) ne vivent que
   dans la feuille ; la vignette a les siens (wk-tile-*), tenus par refreshWorkshopTilesDOM.
   ============================================================ */
var openWorkshopId = null;        // atelier dont la feuille est ouverte
var workshopSheetBackId = null;   // bâtiment de production d'où l'on vient (lien « ‹ retour »)

function getWorkshopTileState(w) {
  if (!w.active) return "soon";
  var recipe = w.recipes[0];
  var autoId = WorkshopsSystem.getAutoRecipeId(w.id);
  if (WorkshopsSystem.getQueue(w.id).length) return "run";
  if (autoId && WorkshopsSystem.getMaxAutoCraftTimes(w.id, autoId) <= 0) return "stalled";
  var best = 0;
  w.recipes.forEach(function (r) { best = Math.max(best, WorkshopsSystem.getMaxCraftTimes(w.id, r.id)); });
  return best > 0 ? "idle" : "block";
}
window.getWorkshopTileState = getWorkshopTileState;

/* Recette en icônes : « 5 [blé] → 1 [farine] », l'intrant manquant en rouge. */
function buildWorkshopRecipeIconsHTML(recipe) {
  var h = '<span class="wk-tile-recipe">';
  recipe.inputs.forEach(function (input, i) {
    var d = WAREHOUSE_RESOURCES[input.resourceId] || {};
    var miss = WarehouseManager.getAmount(input.resourceId) < input.quantity;
    if (i) h += '<span class="wk-tile-op">+</span>';
    h += '<span class="' + (miss ? 'is-miss' : '') + '">' + formatNumber(input.quantity) + renderIconOrEmojiHTML(d.icon, "wk-tile-ico", _td(d.name)) + '</span>';
  });
  var out = WAREHOUSE_RESOURCES[recipe.outputs[0].resourceId] || {};
  h += '<span class="wk-tile-op">→</span><span>' + formatNumber(recipe.outputs[0].quantity) + renderIconOrEmojiHTML(out.icon, "wk-tile-ico", _td(out.name)) + '</span>';
  return h + '</span>';
}

function getWorkshopMissingInput(recipe) {
  return recipe.inputs.filter(function (input) { return WarehouseManager.getAmount(input.resourceId) < input.quantity; })[0] || null;
}

function buildWorkshopTileHTML(w, backId) {
  var state = getWorkshopTileState(w);
  var level = w.active ? WorkshopsSystem.getLevel(w.id) : 0;
  var recipe = w.recipes && w.recipes[0];
  var h = '<button type="button" class="wk-tile is-' + state + '" id="wk-tile-' + w.id + '"'
    + (state === "soon" ? ' disabled' : ' onclick="openWorkshopSheet(\'' + w.id + '\'' + (backId ? ', \'' + backId + '\'' : '') + ')"') + '>';
  if (level) h += '<span class="wk-tile-lvl">' + level + '</span>';
  var rib = "";
  if (state === "run") rib = '<span class="wk-tile-rib is-run">' + _t("En cours") + '</span>';
  else if (state === "stalled") rib = '<span class="wk-tile-rib is-block">' + _t("À l'arrêt") + '</span>';
  else if (state === "block") rib = '<span class="wk-tile-rib is-block">' + _t("Bloqué") + '</span>';
  else if (state === "idle") {
    var n = 0;
    w.recipes.forEach(function (r) { n = Math.max(n, WorkshopsSystem.getMaxCraftTimes(w.id, r.id)); });
    rib = '<span class="wk-tile-rib is-idle">×' + formatNumber(n) + '</span>';
  }
  h += rib;
  if (w.active && WorkshopsSystem.getAutoRecipeId(w.id)) h += '<span class="wk-tile-auto"><img class="ico-sys" src="images/Icons/system/auto_repeat.png" alt=""></span>';
  h += renderIconOrEmojiHTML(w.icon, "wk-tile-img", _td(w.name));
  h += '<span class="wk-tile-name">' + esc(_td(w.name)) + '</span>';
  if (state === "soon") {
    h += '<span class="wk-tile-sub"><img class="ico-inline" src="images/Icons/system/lock_closed.png" alt=""> ' + _t("Bientôt") + '</span>';
  } else {
    h += buildWorkshopRecipeIconsHTML(recipe);
    if (state === "run") {
      var q = WorkshopsSystem.getQueue(w.id)[0];
      var r = WorkshopsSystem.getRecipe(w.id, q.recipeId);
      var totalMs = Number(r ? r.craftTimeMs : 0) * q.times;
      var pct = totalMs > 0 ? Math.min(100, Math.max(0, Math.floor(100 - (q.msRemaining / totalMs) * 100))) : 100;
      h += '<span class="wk-tile-bar"><span id="wk-tile-bar-' + w.id + '" style="width:' + pct + '%"></span></span>';
      h += '<span class="wk-tile-sub" id="wk-tile-time-' + w.id + '">' + formatCraftDuration(q.msRemaining) + '</span>';
    } else if (state === "block" || state === "stalled") {
      var miss = getWorkshopMissingInput(recipe);
      var md = miss ? (WAREHOUSE_RESOURCES[miss.resourceId] || {}) : null;
      h += '<span class="wk-tile-sub is-miss">' + (md ? esc(_t("manque {x}", { x: _td(md.name) })) : esc(_t("Réserve protégée"))) + '</span>';
    } else {
      h += '<span class="wk-tile-sub">' + _t("Libre") + '</span>';
    }
  }
  h += '</button>';
  return h;
}
window.buildWorkshopTileHTML = buildWorkshopTileHTML;

/* Onglet Ateliers : bandeau d'état, puis une grille de vignettes par bâtiment débloqué. */
function buildShopsViewHTML() {
  productionViewTab = "shops";
  var all = [];
  Object.keys(PRODUCTION_BUILDINGS).forEach(function (bid) {
    if (ProductionManager.isBuildingUnlocked(bid)) all = all.concat(getWorkshopsOfBuilding(bid));
  });
  var run = all.filter(function (w) { return getWorkshopTileState(w) === "run"; }).length;
  var free = all.filter(function (w) { return getWorkshopTileState(w) === "idle"; }).length;
  var stalled = countStalledWorkshops();

  var h = '<div class="wk-banner' + (stalled ? ' is-warn' : '') + '">';
  h += '<img class="wk-banner-ico" src="images/Icons/subtabs/workshops.png" alt="">';
  h += '<span class="wk-banner-txt"><b>' + esc(_t("{a} en cours · {b} libres", { a: run, b: free })) + '</b>';
  h += stalled ? esc(_tn(stalled, "{n} atelier à l'arrêt — intrants ou réserve", "{n} ateliers à l'arrêt — intrants ou réserve")) : esc(_t("Touche un atelier pour fabriquer."));
  h += '</span>';
  h += '<button class="kbtn wk-banner-btn" id="prod-queues-btn" type="button" onclick="openWorkshopSummaryModal()"><img src="images/Icons/quests/quest_list.png" alt="">' + _t("Files") + '</button>';
  h += '</div>';

  Object.keys(PRODUCTION_BUILDINGS).forEach(function (bid) {
    if (!ProductionManager.isBuildingUnlocked(bid)) return;
    var def = PRODUCTION_BUILDINGS[bid];
    var list = getWorkshopsOfBuilding(bid);
    if (!list.length) return;
    h += '<div class="wk-group"><img src="' + esc(def.buildingImage || "") + '" alt=""><span>' + esc(_td(def.name)) + '</span></div>';
    h += '<div class="wk-grid">';
    list.forEach(function (w) { h += buildWorkshopTileHTML(w); });
    h += '</div>';
  });
  return h;
}
window.buildShopsViewHTML = buildShopsViewHTML;

/* ----- Feuille d'un atelier ----- */
function openWorkshopSheet(workshopId, backId) {
  if (!WORKSHOPS_CONFIG[workshopId]) return;
  openWorkshopId = workshopId;
  workshopSheetBackId = backId || null;
  if (!selectedWorkshopRecipe[workshopId]) selectedWorkshopRecipe[workshopId] = WORKSHOPS_CONFIG[workshopId].recipes[0].id;
  if (typeof openVillageBuildingId !== "undefined") openVillageBuildingId = null;
  renderWorkshopSheet(false);
}
window.openWorkshopSheet = openWorkshopSheet;

function closeWorkshopSheet(silent) {
  var back = workshopSheetBackId;
  var wasOpen = !!openWorkshopId;
  openWorkshopId = null;
  workshopSheetBackId = null;
  if (typeof document === "undefined") return;
  var host = document.getElementById("village-modal-root");
  if (wasOpen && host && host.querySelector(".wk-sheet")) host.innerHTML = "";
  if (!silent && back && productionDetailBuildingId === back) { renderProductionSheet(false); return; }
  if (!silent) productionDetailBuildingId = null;
}
window.closeWorkshopSheet = closeWorkshopSheet;

/* Lien « ‹ Champs » : retour à la feuille du bâtiment, onglet Ateliers. */
function backToProductionSheet() {
  var back = workshopSheetBackId;
  openWorkshopId = null;
  workshopSheetBackId = null;
  if (back) { productionDetailBuildingId = back; productionSheetTab = "shops"; renderProductionSheet(false); }
}
window.backToProductionSheet = backToProductionSheet;

function closeWorkshopSheetFromBackdrop(e) {
  if (e && e.target && e.target.classList && e.target.classList.contains("full-menu-overlay")) { productionDetailBuildingId = null; closeWorkshopSheet(true); }
}
window.closeWorkshopSheetFromBackdrop = closeWorkshopSheetFromBackdrop;

function renderWorkshopSheet(keepScroll) {
  if (typeof document === "undefined" || !openWorkshopId) return;
  var host = document.getElementById("village-modal-root");
  if (!host) return;
  var body = host.querySelector(".wk-sheet .ksheet-body");
  var top = (keepScroll && body) ? body.scrollTop : 0;
  host.innerHTML = buildWorkshopSheetHTML(openWorkshopId);
  var nb = host.querySelector(".wk-sheet .ksheet-body");
  if (nb && top) nb.scrollTop = top;
}

/* Qui produit une ressource ? Un bâtiment (sa ressource brute) ou un atelier (sa recette). */
function findResourceProducer(resKey) {
  var b = Object.keys(PRODUCTION_BUILDINGS).filter(function (id) { return PRODUCTION_BUILDINGS[id].resourceKey === resKey; })[0];
  if (b) return { kind: "building", id: b, name: _td(PRODUCTION_BUILDINGS[b].name) };
  var w = Object.keys(WORKSHOPS_CONFIG).filter(function (id) {
    return (WORKSHOPS_CONFIG[id].recipes || []).some(function (r) { return r.outputs[0].resourceId === resKey; });
  })[0];
  return w ? { kind: "workshop", id: w, name: _td(WORKSHOPS_CONFIG[w].name) } : null;
}
window.findResourceProducer = findResourceProducer;

function goToResourceProducer(kind, id) {
  if (kind === "building") { openWorkshopId = null; openProductionBuildingDetail(id); }
  else openWorkshopSheet(id, workshopSheetBackId);
}
window.goToResourceProducer = goToResourceProducer;

/* Quantité en pastilles : ×1, ×5, ×10, Max. Une pastille au-delà du possible est grisée. */
function buildWorkshopQtyChipsHTML(workshopId, max, current, isAuto) {
  var h = '<div class="wk-qty">';
  [1, 5, 10, "max"].forEach(function (q) {
    var val = q === "max" ? max : q;
    var on = q === "max" ? (current === max && max > 10) : current === q;
    var dis = q !== "max" && q > max;
    var label = q === "max" ? _t("Max ({n})", { n: formatNumber(max) }) : "×" + q;
    h += '<button type="button" class="' + (on ? 'is-on' : '') + '"' + (dis ? ' disabled' : '')
      + ' onclick="' + (isAuto ? 'setWorkshopAutoQty' : 'setWorkshopCraftQty') + '(\'' + workshopId + '\', ' + val + ')">' + label + '</button>';
  });
  return h + '</div>';
}

function buildWorkshopSheetHTML(workshopId) {
  var w = Object.assign({ id: workshopId }, WORKSHOPS_CONFIG[workshopId]);
  var bdef = PRODUCTION_BUILDINGS[w.buildingId] || {};
  var level = WorkshopsSystem.getLevel(workshopId);
  var recipe = w.recipes.filter(function (r) { return r.id === selectedWorkshopRecipe[workshopId]; })[0] || w.recipes[0];
  var autoId = WorkshopsSystem.getAutoRecipeId(workshopId);
  var isAutoHere = autoId === recipe.id;
  var maxCrafts = WorkshopsSystem.getMaxCraftTimes(workshopId, recipe.id);
  var queue = WorkshopsSystem.getQueue(workshopId);

  var h = '<div class="full-menu-overlay" onclick="closeWorkshopSheetFromBackdrop(event)">';
  h += '<div class="full-menu vb-sheet-card wk-sheet" onclick="event.stopPropagation()">';
  h += kSheetHeadHTML({
    icon: renderIconOrEmojiHTML(w.icon, "vb-sheet-icon wk-sheet-icon", _td(w.name)),
    title: esc(_td(w.name)),
    sub: esc(_t("{x} · niveau {a} / {b}", { x: _td(bdef.name || ""), a: level, b: WorkshopsSystem.getMaxLevel() })),
    close: "productionDetailBuildingId = null; closeWorkshopSheet(true)"
  });
  h += '<div class="ksheet-body">';
  if (workshopSheetBackId && PRODUCTION_BUILDINGS[workshopSheetBackId]) {
    h += '<button type="button" class="wk-back" onclick="backToProductionSheet()">‹ ' + esc(_td(PRODUCTION_BUILDINGS[workshopSheetBackId].name)) + '</button>';
  }

  // Recettes (Cuisine de camp : trois)
  if (w.recipes.length > 1) {
    h += '<div class="kchips wk-recipes">';
    w.recipes.forEach(function (r) {
      var od = WAREHOUSE_RESOURCES[r.outputs[0].resourceId] || {};
      h += '<button type="button" class="' + (r.id === recipe.id ? 'is-on' : '') + '" onclick="selectWorkshopRecipe(\'' + workshopId + '\', \'' + esc(r.id) + '\')">'
        + renderIconOrEmojiHTML(od.icon, "", _td(od.name)) + esc(_td(od.name)) + (autoId === r.id ? ' <img class="ico-sys" src="images/Icons/system/auto_repeat.png" alt="">' : '') + '</button>';
    });
    h += '</div>';
  }

  // Recette en grand, avec les stocks
  h += '<div class="wk-bigrec">';
  recipe.inputs.forEach(function (input, i) {
    var d = WAREHOUSE_RESOURCES[input.resourceId] || {};
    var have = WarehouseManager.getAmount(input.resourceId);
    if (i) h += '<span class="wk-bigrec-op">+</span>';
    h += '<span class="wk-bigrec-ing' + (have < input.quantity ? ' is-miss' : '') + '">' + renderIconOrEmojiHTML(d.icon, "", _td(d.name))
      + '<b>' + formatNumber(input.quantity) + ' ' + esc(_td(d.name)) + '</b><small>' + esc(_t("stock {n}", { n: formatNumber(Math.floor(have)) })) + '</small></span>';
  });
  var out = WAREHOUSE_RESOURCES[recipe.outputs[0].resourceId] || {};
  h += '<span class="wk-bigrec-op">→</span><span class="wk-bigrec-ing">' + renderIconOrEmojiHTML(out.icon, "", _td(out.name))
    + '<b>' + formatNumber(recipe.outputs[0].quantity) + ' ' + esc(_td(out.name)) + '</b><small>' + esc(_t("{d}/lot", { d: formatCraftDuration(WorkshopsSystem.getEffectiveCraftTimeMs(workshopId, recipe)) })) + '</small></span>';
  h += '</div>';

  // File d'attente (cases ; ids canoniques conservés)
  h += '<div class="ksec"><span>' + _t("File d'attente") + '</span></div>';
  h += buildWorkshopQueueHTML(workshopId);

  // Action : Continu (chaînage) + quantité, puis Fabriquer ou le lot auto
  h += '<div class="wk-act">';
  h += '<div class="wk-act-row"><span class="wk-act-lbl">' + (isAutoHere ? _t("Lot automatique") : _t("Quantité")) + '</span>'
    + '<span class="wk-cont' + (isAutoHere ? ' is-on' : '') + '" role="button" onclick="setWorkshopAutoRecipe(\'' + workshopId + '\', \'' + esc(recipe.id) + '\')"><span class="wk-cont-sw"></span>' + _t("Continue") + '</span></div>';
  if (isAutoHere) {
    var maxAuto = Math.max(1, WorkshopsSystem.getMaxAutoCraftTimes(workshopId, recipe.id));
    var aq = Math.max(1, Math.min(maxAuto, workshopAutoQty[workshopId] || 1));
    workshopAutoQty[workshopId] = aq;
    h += buildWorkshopQtyChipsHTML(workshopId, maxAuto, aq, true);
    h += '<p class="wk-act-hint">' + esc(_t("L'atelier relance un lot de {n} dès qu'il a de quoi, sans entamer la réserve protégée.", { n: formatNumber(aq) })) + '</p>';
  } else if (maxCrafts > 0) {
    var qty = Math.max(1, Math.min(maxCrafts, workshopCraftQty[workshopId] || 1));
    workshopCraftQty[workshopId] = qty;
    h += buildWorkshopQtyChipsHTML(workshopId, maxCrafts, qty, false);
    h += '<button class="kbtn primary wk-craft" type="button" onclick="confirmCraftWorkshop(\'' + workshopId + '\')">' + _t("Fabriquer ×{n}", { n: formatNumber(qty) }) + '</button>';
  }
  h += '</div>';

  // Alerte : intrant manquant (avec le chemin), réserve, autre recette en Continu
  if (autoId && !isAutoHere) {
    var oR = WorkshopsSystem.getRecipe(workshopId, autoId);
    var oD = oR ? WAREHOUSE_RESOURCES[oR.outputs[0].resourceId] : null;
    h += '<div class="wk-alert is-hint">' + esc(_t("déjà active sur {x} — l'activer ici la remplacera.", { x: oD ? _td(oD.name) : autoId })) + '</div>';
  }
  var missing = getWorkshopMissingInput(recipe);
  if (isAutoHere && !queue.length && WorkshopsSystem.getMaxAutoCraftTimes(workshopId, recipe.id) <= 0 && !missing) {
    h += '<div class="wk-alert is-reserve">' + _t("En attente : la réserve protégée empêche un nouveau lot — ajustable dans l'Entrepôt.") + '</div>';
  } else if (missing && maxCrafts <= 0) {
    var md = WAREHOUSE_RESOURCES[missing.resourceId] || {};
    var prod = findResourceProducer(missing.resourceId);
    h += '<div class="wk-alert is-warn"><span>' + esc(_t("{x} insuffisant ({a}/{b})", { x: _td(md.name || missing.resourceId), a: formatNumber(Math.floor(WarehouseManager.getAmount(missing.resourceId))), b: formatNumber(missing.quantity) })) + '</span>';
    if (prod) h += '<button type="button" class="kbtn wk-goto" onclick="goToResourceProducer(\'' + prod.kind + '\', \'' + prod.id + '\')">' + esc(_t("Aller à : {x}", { x: prod.name })) + ' ›</button>';
    h += '</div>';
  }

  // Amélioration
  h += '<div class="wk-up-row"><span>' + esc(_t("Niveau {a} : file de {n}", { a: level, n: WorkshopsSystem.getMaxQueueLength(workshopId) })) + '</span>';
  h += buildWorkshopUpgradeCompactHTML(workshopId);
  h += '</div>';

  h += '</div></div></div>';
  return h;
}
window.buildWorkshopSheetHTML = buildWorkshopSheetHTML;

/* Tick (ProductionManager.updateDOM) : barre et temps des vignettes « En cours ». */
function refreshWorkshopTilesDOM() {
  if (typeof document === "undefined") return;
  Object.keys(WORKSHOPS_CONFIG).forEach(function (wid) {
    var bar = document.getElementById("wk-tile-bar-" + wid);
    if (!bar) return;
    var q = WorkshopsSystem.getQueue(wid)[0];
    if (!q) return;
    var r = WorkshopsSystem.getRecipe(wid, q.recipeId);
    var totalMs = Number(r ? r.craftTimeMs : 0) * q.times;
    bar.style.width = (totalMs > 0 ? Math.min(100, Math.max(0, Math.floor(100 - (q.msRemaining / totalMs) * 100))) : 100) + "%";
    var t = document.getElementById("wk-tile-time-" + wid);
    if (t) t.textContent = formatCraftDuration(q.msRemaining);
  });
}
window.refreshWorkshopTilesDOM = refreshWorkshopTilesDOM;

function buildProductionHTML() {
  ProductionManager.ensure();
  productionViewTab = "prod";
  return buildProdDashboardHTML();
}

window.buildProductionHTML = buildProductionHTML;
