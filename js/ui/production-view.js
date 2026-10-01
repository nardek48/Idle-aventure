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
var selectedProductionPlotIndex = {};  // { [buildingId]: number|null } — zone sélectionnée, par bâtiment

function setProductionViewTab(tab) {
  productionViewTab = (tab === "shops") ? "shops" : "prod";
  if (typeof setVillageSubTab === "function") setVillageSubTab(productionViewTab === "shops" ? "shops" : "production");
  else if (typeof renderPanel === "function") renderPanel();
}
window.setProductionViewTab = setProductionViewTab;

function openProductionBuildingDetail(buildingId) {
  if (!PRODUCTION_BUILDINGS[buildingId]) return;
  if (productionDetailBuildingId !== buildingId) productionSheetTab = "shops";
  productionDetailBuildingId = buildingId;
  if (typeof openVillageBuildingId !== "undefined") openVillageBuildingId = null; // un seul habitant pour #village-modal-root
  renderProductionSheet(false);
}
window.openProductionBuildingDetail = openProductionBuildingDetail;

/* silent : fermeture de service (changement d'onglet), sans rendu du panneau. */
function closeProductionSheet(silent) {
  var wasOpen = !!productionDetailBuildingId;
  productionDetailBuildingId = null;
  if (typeof document === "undefined") return;
  var host = document.getElementById("village-modal-root");
  if (wasOpen && host && host.querySelector(".prod-sheet")) host.innerHTML = "";
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
  if (!productionDetailBuildingId || typeof document === "undefined") return;
  var host = document.getElementById("village-modal-root");
  if (host && host.querySelector(".prod-sheet")) renderProductionSheet(true);
}
window.refreshProductionSheet = refreshProductionSheet;

/* Tick de ProductionManager.updateDOM() : jauge et libellé de la feuille (ids propres à la
   feuille, la vignette du tableau de bord garde les siens). */
function refreshProductionSheetDOM() {
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

function buildPlotsPanelHTML(buildingId) {
  var plots = ProductionPlotsSystem.getPlots(buildingId);
  var selectedIndex = typeof selectedProductionPlotIndex[buildingId] === "number" ? selectedProductionPlotIndex[buildingId] : null;
  // v3.191.0 : la zone la moins chère à améliorer est signalée sur la grille (liseré +
  // drapeau), en écho au bouton groupé "Améliorer la − chère" (voir
  // getCheapestUpgradablePlot). null si aucune zone ouverte améliorable.
  var cheapestIndex = getCheapestUpgradablePlot(buildingId);

  var h = '<div class="farm-plots-panel">';
  h += '<div class="farm-plots-grid">';
  plots.forEach(function (plot, index) {
    h += buildPlotCardHTML(buildingId, plot, index, selectedIndex, cheapestIndex);
  });
  h += '</div>';

  if (selectedIndex !== null && selectedIndex < plots.length) {
    h += buildPlotActionsHTML(buildingId, plots[selectedIndex], selectedIndex);
  }

  h += '</div>';
  return h;
}

/* Mini-carte de zone allégée : niveau (au-dessus du nom), jauge, icônes d'améliorations
   (propres à chaque bâtiment) en état visuel seul. Toute la carte est cliquable pour
   SÉLECTIONNER la zone ; les actions et leurs coûts s'affichent dans une zone commune
   sous la grille (voir buildPlotActionsHTML).
   v3.98.19 : nom de lieu dédié par zone (getProductionZoneName, ex. "Bois d'Aeswyn")
   remplace l'ancien "Préfixe + numéro" générique (ex. "Territoire 7") — retour Seb. */
function buildPlotCardHTML(buildingId, plot, index, selectedIndex, cheapestIndex) {
  var buildingCfg = PRODUCTION_PLOTS_BUILDINGS[buildingId];
  var zoneName = getProductionZoneName(buildingId, index);
  var isSelected = selectedIndex === index;
  var classNames = "farm-plot-card" + (isSelected ? " is-selected" : "") + (cheapestIndex === index ? " is-cheapest" : "");

  if (plot.state === "locked") {
    classNames += " is-locked";
    var rowOpen = ProductionPlotsSystem.isPlotRowOpen(index);
    var h0 = '<div class="' + classNames + '" onclick="selectProductionPlot(\'' + buildingId + '\', ' + index + ')">';
    h0 += '<div class="farm-plot-card-lock-icon"><img class=ico-inline src=images/Icons/system/lock_closed.png></div>';
    h0 += '<div class="farm-plot-card-name">' + esc(zoneName) + '</div>';
    // v3.289.0 : une ligne par monde — la zone dit quel monde l'ouvre
    if (!rowOpen) h0 += '<div class="farm-plot-card-profile">' + esc(_td((WORLDS[Math.floor(index / 3)] || {}).name || '')) + '</div>';
    h0 += '</div>';
    return h0;
  }

  classNames += " is-open";
  var profile = ProductionPlotsSystem.getProfile(index);
  var capacity = ProductionPlotsSystem.getPlotCapacity(index, plot);
  var pct = capacity > 0 ? Math.min(100, (plot.stock / capacity) * 100) : 0;

  var h = '<div class="' + classNames + '" onclick="selectProductionPlot(\'' + buildingId + '\', ' + index + ')">';
  h += '<div class="farm-plot-card-top">';
  h += '<span class="farm-plot-card-level-badge">' + _t("Niv. {n}", { n: plot.level }) + '</span>';
  h += '</div>';
  h += '<div class="farm-plot-card-name">' + esc(zoneName) + '</div>';
  h += '<div class="farm-plot-card-profile">' + esc(_td(profile.label)) + '</div>';

  h += '<div class="farm-plot-card-bar kgauge kgauge-thin kgauge-xp">';
  h += '<div class="kgauge-track"><div class="kgauge-fill nb-entry-progress-fill" id="prod-plot-bar-' + buildingId + '-' + index + '" style="width:' + pct + '%"></div></div>';
  h += '</div>';
  h += '<div class="farm-plot-card-stock-label" id="prod-plot-stock-' + buildingId + '-' + index + '">' + formatNumber(Math.floor(plot.stock)) + '/' + formatNumber(capacity) + '</div>';

  h += '<div class="farm-plot-card-improvements">';
  h += buildPlotImprovementIconHTML(buildingCfg, plot, "fertile");
  h += buildPlotImprovementIconHTML(buildingCfg, plot, "irrigated");
  h += '</div>';

  h += '</div>';
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

/* Zone commune d'actions pour la zone sélectionnée : un seul bouton Défricher si
   verrouillée, ou jusqu'à 3 boutons (Améliorer + 2 améliorations) si ouverte, chacun avec
   son coût ET une courte description de l'effet. Coûts/libellés/icônes/descriptions lus
   depuis PRODUCTION_PLOTS_BUILDINGS[buildingId] — propres à chaque bâtiment (v3.97.1 :
   noms et icônes thématiques par bâtiment, remplace "Fertile"/"Irriguée" génériques). */
function buildPlotActionsHTML(buildingId, plot, index) {
  var buildingCfg = PRODUCTION_PLOTS_BUILDINGS[buildingId];
  var zoneName = getProductionZoneName(buildingId, index);
  var resDef = WAREHOUSE_RESOURCES[(PRODUCTION_BUILDINGS[buildingId] || {}).resourceKey] || {};
  var resName = _td(resDef.name || "");

  var h = '<div class="farm-plot-actions">';
  h += '<div class="farm-plot-actions-title">' + esc(zoneName) + '</div>';

  if (plot.state === "locked" && !ProductionPlotsSystem.isPlotRowOpen(index)) {
    // v3.289.0 : ligne d'un monde pas encore atteint
    h += '<div class="farm-plot-action-btn is-disabled"><span class="farm-plot-action-label">'
       + esc(_t("S'ouvre {lieu}", { lieu: ProductionPlotsSystem.getPlotRowOpening(index) })) + '</span></div>';
    h += '</div>';
    return h;
  }

  if (plot.state === "locked") {
    var unlockCost = getProductionPlotUnlockCost(buildingId, index);
    var canAffordUnlock = unlockCost && Object.keys(unlockCost).every(function (key) {
      return WarehouseManager.getAmount(key) >= unlockCost[key];
    });
    h += buildPlotActionButtonHTML({
      onclick: "productionPlotUnlock('" + buildingId + "', " + index + ")",
      label: _t("Défricher"),
      desc: _t("Rend cette zone exploitable."),
      cost: unlockCost,
      canAfford: canAffordUnlock
    });
    h += '</div>';
    return h;
  }

  var isMaxLevel = ProductionPlotsSystem.isPlotMaxLevel(plot);
  if (isMaxLevel) {
    // v3.289.0 : le plafond du monde n'est pas le niveau max de la zone
    // v3.336.0 (F-2) : le plafond du monde se touche et dit où s'ouvre le niveau suivant
    if (ProductionPlotsSystem.isPlotLevelWorldCapped(plot)) {
      h += '<div class="farm-plot-action-btn is-disabled is-capped" role="button" onclick="productionZoneCapHowTo(' + plot.level + ')">'
         + '<span class="farm-plot-action-label">' + _t("Plafond de ce monde (niv. {n})", { n: plot.level }) + ' · ?</span></div>';
    } else {
      h += '<div class="farm-plot-action-btn is-disabled"><span class="farm-plot-action-label">' + _t("Niveau max") + '</span></div>';
    }
  } else {
    var upgradeCost = getProductionPlotUpgradeCost(buildingId, plot.level, index);
    var canAffordUpgrade = Object.keys(upgradeCost).every(function (key) {
      return WarehouseManager.getAmount(key) >= upgradeCost[key];
    });
    var rateNow = ProductionPlotsSystem.getPlotRatePerMin(index, plot);
    var rateNext = ProductionPlotsSystem.getPlotRatePerMin(index, { level: plot.level + 1, fertile: plot.fertile, irrigated: plot.irrigated });
    h += buildPlotActionButtonHTML({
      onclick: "productionPlotUpgrade('" + buildingId + "', " + index + ")",
      label: _t("Améliorer"),
      desc: _t("{x}/min : {a} → {b} (niv. {n})", { x: resName, a: formatNumber(rateNow), b: formatNumber(rateNext), n: plot.level + 1 }),
      cost: upgradeCost,
      canAfford: canAffordUpgrade
    });
  }

  if (!plot.fertile && buildingCfg) {
    var fertileDef = buildingCfg.improvementCost.fertile;
    var canAffordFertile = Object.keys(fertileDef.cost).every(function (key) {
      return WarehouseManager.getAmount(key) >= fertileDef.cost[key];
    });
    h += buildPlotActionButtonHTML({
      onclick: "productionPlotToggleImprovement('" + buildingId + "', " + index + ", 'fertile')",
      iconHTML: renderIconOrEmojiHTML(fertileDef.icon, "plot-act-ico", ""),
      label: _td(fertileDef.label),
      desc: _t("+{p}% {x}, permanent.", { p: Math.round(PRODUCTION_PLOTS_SHARED.bonusPerImprovement.fertile * 100), x: resName }) + " " + _td(fertileDef.desc),
      cost: fertileDef.cost,
      canAfford: canAffordFertile
    });
  }

  if (!plot.irrigated && buildingCfg) {
    var irrigatedDef = buildingCfg.improvementCost.irrigated;
    var canAffordIrrigated = Object.keys(irrigatedDef.cost).every(function (key) {
      return WarehouseManager.getAmount(key) >= irrigatedDef.cost[key];
    });
    h += buildPlotActionButtonHTML({
      onclick: "productionPlotToggleImprovement('" + buildingId + "', " + index + ", 'irrigated')",
      iconHTML: renderIconOrEmojiHTML(irrigatedDef.icon, "plot-act-ico", ""),
      label: _td(irrigatedDef.label),
      desc: _t("+{p}% {x}, permanent.", { p: Math.round(PRODUCTION_PLOTS_SHARED.bonusPerImprovement.irrigated * 100), x: resName }) + " " + _td(irrigatedDef.desc),
      cost: irrigatedDef.cost,
      canAfford: canAffordIrrigated
    });
  }

  h += '</div>';
  return h;
}

/* Bouton d'action générique de la zone .farm-plot-actions : libellé + courte description
   d'effet sur une ligne dédiée + coût. Factorisé car les 4 actions (Défricher/Améliorer/
   Fertile/Irriguée) partagent exactement cette structure. */
/* v3.371.0 (i18n) : le message traduit n'est plus écrit dans l'onclick (apostrophes). */
function productionZoneCapHowTo(level) {
  if (typeof showHowToToast === "function") showHowToToast(_t("Plafond de ce monde (niv. {n})", { n: level }), "zoneCap", { level: level });
}
window.productionZoneCapHowTo = productionZoneCapHowTo;

function buildPlotActionButtonHTML(opts) {
  var h = '<button class="farm-plot-action-btn' + (opts.canAfford ? '' : ' is-disabled') + '" type="button" ' + (opts.canAfford ? '' : 'disabled') + ' onclick="' + opts.onclick + '">';
  h += '<span class="farm-plot-action-btn-text">';
  h += '<span class="farm-plot-action-label">' + (opts.iconHTML || "") + esc(_td(opts.label)) + '</span>';
  h += '<span class="farm-plot-action-desc">' + esc(_td(opts.desc)) + '</span>';
  h += '</span>';
  h += buildPlotCostRowHTML(opts.cost);
  h += '</button>';
  return h;
}

function selectProductionPlot(buildingId, index) {
  // retap sur la même zone = désélectionne ; la sélection est propre à CE bâtiment
  selectedProductionPlotIndex[buildingId] = (selectedProductionPlotIndex[buildingId] === index) ? null : index;
  if (typeof renderPanel === "function") renderPanel();
}
window.selectProductionPlot = selectProductionPlot;

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

/* Actions groupées sous la grille : "Améliorer la − chère" (agit directement sur la
   zone signalée) et "Défricher une zone" (SÉLECTIONNE la première zone verrouillée —
   décision maquette : on ouvre son panneau Défricher plutôt que de défricher à
   l'aveugle, les 9 zones ont des noms et le joueur choisit). Le coût de défrichage ne
   dépend pas de la zone choisie (même montant, voir getProductionPlotUnlockCost). */
function buildZoneGroupActionsHTML(buildingId) {
  var h = '<div class="production-group-actions">';

  var cheapest = getCheapestUpgradablePlot(buildingId);
  if (cheapest !== null) {
    var plots = ProductionPlotsSystem.getPlots(buildingId);
    var cost = getProductionPlotUpgradeCost(buildingId, plots[cheapest].level, cheapest);
    var afford = {};
    var all = true;
    Object.keys(cost).forEach(function (key) {
      afford[key] = WarehouseManager.getAmount(key) >= cost[key];
      if (!afford[key]) all = false;
    });
    h += '<button class="settings-btn primary production-group-btn' + (all ? '' : ' is-locked') + '" type="button" ' + (all ? '' : 'disabled') + ' onclick="productionUpgradeCheapest(\'' + buildingId + '\')">';
    h += '<img class=ico-inline src=images/Icons/system/upgrade.png> ' + _t("Améliorer la − chère") + ' ' + buildProductionCostRowHTML(cost, afford);
    h += '</button>';
  }

  var firstLocked = null;
  var allPlots = ProductionPlotsSystem.getPlots(buildingId);
  for (var i = 0; i < allPlots.length; i++) {
    if (allPlots[i].state === "locked" && ProductionPlotsSystem.isPlotRowOpen(i)) { firstLocked = i; break; }
  }
  if (firstLocked !== null) {
    var unlockCost = getProductionPlotUnlockCost(buildingId, firstLocked);
    var uAfford = {};
    Object.keys(unlockCost).forEach(function (key) {
      uAfford[key] = WarehouseManager.getAmount(key) >= unlockCost[key];
    });
    h += '<button class="settings-btn production-group-btn" type="button" onclick="productionSelectFirstLocked(\'' + buildingId + '\')">';
    h += '<img class=ico-inline src=images/Icons/system/lock_open.png> ' + _t("Défricher une zone") + ' ' + buildProductionCostRowHTML(unlockCost, uAfford);
    h += '</button>';
  }

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

function productionSelectFirstLocked(buildingId) {
  var plots = ProductionPlotsSystem.getPlots(buildingId);
  for (var i = 0; i < plots.length; i++) {
    if (plots[i].state === "locked" && ProductionPlotsSystem.isPlotRowOpen(i)) {
      selectedProductionPlotIndex[buildingId] = i;
      if (typeof renderPanel === "function") renderPanel();
      return;
    }
  }
}
window.productionSelectFirstLocked = productionSelectFirstLocked;

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
    h += '<div class="workshop-list">';
    shops.forEach(function (w) { h += buildWorkshopCardHTML(w); });
    h += '</div>';
  } else {
    h += buildPlotsPanelHTML(buildingId);
    // v3.191.1 : actions groupées seulement quand aucune zone n'est sélectionnée
    if (typeof selectedProductionPlotIndex[buildingId] !== "number") h += buildZoneGroupActionsHTML(buildingId);
  }

  h += '</div></div></div>';
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

/* ============================================================
   v3.192.0 : carte atelier COMPACTE (maquette atelier-ecrans.html v4
   validée par Seb) — ~moitié de la hauteur des anciennes cartes, tout le
   fonctionnel conservé. 4 décisions actées :
   (1) <img class=ico-inline src=images/Icons/system/auto_repeat.png> actif sur la recette affichée -> la ligne de craft manuel
       disparaît (couper le toggle pour forcer un lot à la main) ;
   (2) quantité par lot auto = mini-stepper inline à côté du toggle
       (mêmes handlers v3.98.15/16, saisie directe conservée) ;
   (3) file = cases visuelles + entrée courante (temps + barre fine),
       <img class=ico-inline src=images/Icons/system/close.png> sur les lots suivants — remplace la liste verticale. Ids
       prod-workshop-time-/bar- et conteneur workshop-queue-{id}
       CONSERVÉS : updateDOM() et refreshWorkshopQueueDOM() inchangés.
       Le badge "File : X/Y" (prod-workshop-queue-badge-) disparaît —
       les cases portent l'info, setElementText() ignore l'id absent ;
   (4) amélioration = bouton coût seul en haut à droite, l'effet
       (vitesse, file) est confirmé au toast après l'achat.
   Anciennes classes warehouse-craft-queue et warehouse-craft-recipe-tab
   abandonnées ici (plus aucun usage ailleurs) — règles CSS à balayer plus tard.
   ============================================================ */
function buildWorkshopCardHTML(workshop) {
  if (!workshop.active) {
    var h0 = '<div class="workshop-card is-inactive">';
    h0 += '<div class="workshop-card-icon">' + renderIconOrEmojiHTML(workshop.icon, "workshop-card-icon-img", _td(workshop.name)) + '</div>';
    h0 += '<div class="workshop-card-name">' + esc(_td(workshop.name)) + '</div>';
    h0 += '<div class="workshop-card-soon">' + _t("Bientôt") + '</div>';
    h0 += '</div>';
    return h0;
  }

  var level = WorkshopsSystem.getLevel(workshop.id);
  var recipes = workshop.recipes;
  var selectedRecipeId = selectedWorkshopRecipe[workshop.id] || recipes[0].id;
  var recipe = recipes.find(function (r) { return r.id === selectedRecipeId; }) || recipes[0];
  var outputDef = WAREHOUSE_RESOURCES[recipe.outputs[0].resourceId];
  var effectiveCraftTimeMs = WorkshopsSystem.getEffectiveCraftTimeMs(workshop.id, recipe);

  var activeAutoId = WorkshopsSystem.getAutoRecipeId(workshop.id);
  var isAutoHere = activeAutoId === recipe.id;
  var otherAuto = activeAutoId && !isAutoHere;

  var queue = WorkshopsSystem.getQueue(workshop.id);
  var maxCrafts = WorkshopsSystem.getMaxCraftTimes(workshop.id, recipe.id);

  var tagDef = PRODUCTION_BUILDINGS[workshop.buildingId];
  var tagRes = tagDef ? (WAREHOUSE_RESOURCES[tagDef.resourceKey] || {}) : {};

  var h = '<div class="workshop-card is-active">';

  // --- en-tête : icône, nom, tag bâtiment, écu, amélioration compacte ---
  h += '<div class="wk-head">';
  h += '<span class="wk-emoji">' + renderIconOrEmojiHTML(workshop.icon, "wk-emoji-img", _td(workshop.name)) + '</span>';
  h += '<span class="wk-name">' + esc(_td(workshop.name)) + '</span>';
  if (tagDef) h += '<span class="workshop-building-tag">' + renderIconOrEmojiHTML(tagRes.icon, "workshop-building-tag-ico", _td(tagDef.name)) + esc(_td(tagDef.name)) + '</span>';
  h += '<span class="kbadge kbadge-shield wk-shield"><span>' + level + '</span></span>';
  h += buildWorkshopUpgradeCompactHTML(workshop.id);
  h += '</div>';

  // --- pilules de recettes (ateliers multi-recettes) — la pilule active porte <img class=ico-inline src=images/Icons/system/auto_repeat.png>
  //     si le chaînage est sur elle ---
  if (recipes.length > 1) {
    h += '<div class="wk-pills">';
    recipes.forEach(function (r) {
      var out = WAREHOUSE_RESOURCES[r.outputs[0].resourceId];
      var cls = "wk-pill" + (r.id === recipe.id ? " is-active" : "") + (activeAutoId === r.id ? " is-auto" : "");
      h += '<button type="button" class="' + cls + '" onclick="selectWorkshopRecipe(\'' + workshop.id + '\', \'' + esc(r.id) + '\')">' + esc(out ? _td(out.name) : r.id) + '</button>';
    });
    h += '</div>';
  }

  // --- recette en icônes + temps effectif ---
  h += '<div class="wk-recipe">';
  recipe.inputs.forEach(function (input, i) {
    var d = WAREHOUSE_RESOURCES[input.resourceId] || {};
    if (i) h += ' + ';
    h += formatNumber(input.quantity) + ' ' + renderIconOrEmojiHTML(d.icon, "wk-recipe-ico", _td(d.name));
  });
  h += ' → ' + formatNumber(recipe.outputs[0].quantity) + ' ' + renderIconOrEmojiHTML(outputDef.icon, "wk-recipe-ico", _td(outputDef.name));
  h += '<span class="wk-time">· ' + _t("{d}/lot", { d: formatCraftDuration(effectiveCraftTimeMs) }) + '</span>';
  h += '</div>';

  // --- file : cases + entrée courante ---
  h += buildWorkshopQueueHTML(workshop.id);

  // --- pied : toggle <img class=ico-inline src=images/Icons/system/auto_repeat.png> + (quantité auto inline) OU (stepper manuel + Fabriquer) ---
  h += '<div class="wk-foot">';
  h += '<span class="wk-cont' + (isAutoHere ? " is-on" : "") + '" onclick="setWorkshopAutoRecipe(\'' + workshop.id + '\', \'' + esc(recipe.id) + '\')">';
  h += '<span class="wk-cont-sw"></span><img class="ico-sys" src="images/Icons/system/auto_repeat.png" alt=""> ' + _t("Continue") + '</span>';

  if (isAutoHere) {
    var maxAutoNow = WorkshopsSystem.getMaxAutoCraftTimes(workshop.id, recipe.id);
    var autoQty = Math.max(1, Math.min(maxAutoNow || 1, workshopAutoQty[workshop.id] || 1));
    workshopAutoQty[workshop.id] = autoQty;
    h += '<span class="wk-auto-qty">' + _t("lot ×");
    h += '<span class="warehouse-qty-stepper workshop-qty-stepper-compact">';
    h += '<button class="warehouse-qty-btn" type="button" onclick="adjustWorkshopAutoQty(\'' + workshop.id + '\', -1)"' + (autoQty <= 1 ? ' disabled' : '') + '>−</button>';
    h += '<input class="warehouse-qty-value" type="number" min="1" max="' + (maxAutoNow || 1) + '" step="1" value="' + autoQty + '" onchange="setWorkshopAutoQty(\'' + workshop.id + '\', this.value)">';
    h += '<button class="warehouse-qty-btn" type="button" onclick="adjustWorkshopAutoQty(\'' + workshop.id + '\', 1)"' + (autoQty >= maxAutoNow ? ' disabled' : '') + '>+</button>';
    h += '<button class="warehouse-qty-max-btn" type="button" onclick="adjustWorkshopAutoQty(\'' + workshop.id + '\', \'max\')"' + (autoQty >= maxAutoNow ? ' disabled' : '') + '>' + _t("Max") + '</button>';
    h += '</span></span>';
  } else if (maxCrafts > 0) {
    var qty = Math.max(1, Math.min(maxCrafts, workshopCraftQty[workshop.id] || 1));
    workshopCraftQty[workshop.id] = qty;
    h += '<span class="wk-manual">';
    h += '<span class="warehouse-qty-stepper workshop-qty-stepper-compact">';
    h += '<button class="warehouse-qty-btn" type="button" onclick="adjustWorkshopCraftQty(\'' + workshop.id + '\', -1)"' + (qty <= 1 ? ' disabled' : '') + '>−</button>';
    h += '<input class="warehouse-qty-value" type="number" min="1" max="' + maxCrafts + '" step="1" value="' + qty + '" onchange="setWorkshopCraftQty(\'' + workshop.id + '\', this.value)">';
    h += '<button class="warehouse-qty-btn" type="button" onclick="adjustWorkshopCraftQty(\'' + workshop.id + '\', 1)"' + (qty >= maxCrafts ? ' disabled' : '') + '>+</button>';
    h += '<button class="warehouse-qty-max-btn" type="button" onclick="adjustWorkshopCraftQty(\'' + workshop.id + '\', \'max\')"' + (qty >= maxCrafts ? ' disabled' : '') + '>' + _t("Max") + '</button>';
    h += '</span>';
    h += '<button class="wk-craft-btn" type="button" onclick="confirmCraftWorkshop(\'' + workshop.id + '\')">' + _t("Fabriquer ×{n}", { n: formatNumber(qty) }) + '</button>';
    h += '</span>';
  }
  h += '</div>';

  // --- alertes (une seule à la fois, la plus utile) ---
  if (otherAuto) {
    var otherRecipe = WorkshopsSystem.getRecipe(workshop.id, activeAutoId);
    var otherDef = otherRecipe ? WAREHOUSE_RESOURCES[otherRecipe.outputs[0].resourceId] : null;
    h += '<div class="wk-alert is-hint"><img class=ico-inline src=images/Icons/system/auto_repeat.png> ' + esc(_t("déjà active sur {x} — l'activer ici la remplacera.", { x: otherDef ? _td(otherDef.name) : activeAutoId })) + '</div>';
  } else if (isAutoHere && !queue.length && WorkshopsSystem.getMaxAutoCraftTimes(workshop.id, recipe.id) <= 0) {
    if (maxCrafts > 0) {
      // stock brut suffisant mais pas la version "moins réserve" -> c'est la réserve (v3.98.17)
      h += '<div class="wk-alert is-reserve"><img class=ico-inline src=images/Icons/system/pause_stop.png> ' + _t("En attente : la réserve protégée empêche un nouveau lot — ajustable dans l'Entrepôt.") + '</div>';
    } else {
      h += buildWorkshopMissingInputHTML(recipe);
    }
  } else if (!isAutoHere && maxCrafts <= 0) {
    h += buildWorkshopMissingInputHTML(recipe);
  }

  h += '</div>';
  return h;
}

/* Alerte intrant manquant façon maquette : "Nom insuffisant (possédé/requis)" —
   plus informatif que l'ancien "Pas assez de X pour fabriquer." */
function buildWorkshopMissingInputHTML(recipe) {
  var missing = recipe.inputs.find(function (input) {
    return WarehouseManager.getAmount(input.resourceId) < input.quantity;
  });
  if (!missing) return "";
  var d = WAREHOUSE_RESOURCES[missing.resourceId] || {};
  return '<div class="wk-alert is-warn"><img class=ico-inline src=images/Icons/system/warning.png> ' + esc(_t("{x} insuffisant ({a}/{b})", { x: d.name ? _td(d.name) : missing.resourceId, a: formatNumber(WarehouseManager.getAmount(missing.resourceId)), b: formatNumber(missing.quantity) })) + '</div>';
}

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

function adjustWorkshopCraftQty(workshopId, delta) {
  var recipeId = selectedWorkshopRecipe[workshopId];
  var maxCrafts = WorkshopsSystem.getMaxCraftTimes(workshopId, recipeId);
  if (maxCrafts <= 0) return;

  var current = workshopCraftQty[workshopId] || 1;
  if (delta === "max") {
    workshopCraftQty[workshopId] = maxCrafts;
  } else {
    workshopCraftQty[workshopId] = Math.max(1, Math.min(maxCrafts, current + Number(delta || 0)));
  }
  if (typeof renderPanel === "function") renderPanel();
}
window.adjustWorkshopCraftQty = adjustWorkshopCraftQty;

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

/* v3.98.15 : stepper DÉDIÉ à la quantité du chaînage auto, séparé du stepper manuel
   (retour Seb — les deux se confondaient auparavant). Borné par
   WorkshopsSystem.getMaxAutoCraftTimes (respecte la réserve protégée), pas par le stock
   brut. `max` ici recalcule le max ACTUEL (pas figé) mais reste une valeur numérique
   normale ensuite — contrairement à l'ancien système, il n'y a plus de mode "Max
   dynamique" à part : le joueur ajuste ce chiffre comme il veut, tout simplement. */
function adjustWorkshopAutoQty(workshopId, delta) {
  var recipeId = WorkshopsSystem.getAutoRecipeId(workshopId);
  if (!recipeId) return;
  var maxAuto = WorkshopsSystem.getMaxAutoCraftTimes(workshopId, recipeId);
  if (maxAuto <= 0) maxAuto = 1; // permet quand même d'ajuster le réglage même si rien n'est dispo là maintenant

  var current = workshopAutoQty[workshopId] || 1;
  if (delta === "max") {
    workshopAutoQty[workshopId] = maxAuto;
  } else {
    workshopAutoQty[workshopId] = Math.max(1, Math.min(maxAuto, current + Number(delta || 0)));
  }
  if (typeof renderPanel === "function") renderPanel();
}
window.adjustWorkshopAutoQty = adjustWorkshopAutoQty;

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

/* Vue Ateliers agrégée : bandeau d'état + bouton Files (badges file/auto conservés de
   v3.98.8/17) + toutes les cartes atelier ACTIVES de tous les bâtiments débloqués
   (cartes inchangées : recettes, file, auto, amélioration — déjà "dans la carte"),
   dans l'ordre de WORKSHOPS_CONFIG (groupé par bâtiment par construction). Les ateliers
   "Bientôt" sont regroupés en pied compact au lieu de 6 grandes cartes vides. */
function buildShopsViewHTML() {
  productionViewTab = "shops";
  var stalled = countStalledWorkshops();
  var h = '';
  if (stalled > 0) {
    h += '<div class="production-status-banner is-warn"><img class=ico-inline src=images/Icons/system/warning.png> ' + _tn(stalled, "{n} atelier à l'arrêt — intrants ou réserve", "{n} ateliers à l'arrêt — intrants ou réserve") + '</div>';
  } else {
    h += '<div class="production-status-banner is-ok"><img class="ico-sys" src="images/Icons/system/check_valid.png" alt=""> ' + _t("Tous les ateliers suivis tournent") + '</div>';
  }

  var activeQueueCount = Object.keys(WORKSHOPS_CONFIG).filter(function (workshopId) {
    var def = WORKSHOPS_CONFIG[workshopId];
    return def.active && ProductionManager.isBuildingUnlocked(def.buildingId) && WorkshopsSystem.getQueue(workshopId).length > 0;
  }).length;
  var activeAutoCount = Object.keys(WORKSHOPS_CONFIG).filter(function (workshopId) {
    var def = WORKSHOPS_CONFIG[workshopId];
    return def.active && ProductionManager.isBuildingUnlocked(def.buildingId) && !!WorkshopsSystem.getAutoRecipeId(workshopId);
  }).length;
  h += '<div class="production-harvest-all-row">';
  h += '<button class="production-action-btn production-harvest-btn production-queues-btn" id="prod-queues-btn" type="button" onclick="openWorkshopSummaryModal()">';
  h += '<img class="ico-btn" src="images/Icons/quests/quest_list.png" alt=""> ' + _t("Files");
  if (activeQueueCount > 0) h += '<span class="production-queues-badge">' + activeQueueCount + '</span>';
  if (activeAutoCount > 0) h += '<span class="production-queues-badge production-auto-badge"><img class=ico-inline src=images/Icons/system/auto_repeat.png> ' + activeAutoCount + '</span>';
  h += '</button>';
  h += '</div>';

  h += '<div class="workshop-list">';
  var lockedNames = [];
  Object.keys(WORKSHOPS_CONFIG).forEach(function (workshopId) {
    var def = WORKSHOPS_CONFIG[workshopId];
    if (!ProductionManager.isBuildingUnlocked(def.buildingId)) return;
    if (!def.active) { lockedNames.push(_td(def.name)); return; }
    // v3.191.1 : ENRICHIR avec l'id, comme getWorkshopsForBuilding() — les entrées de
    // WORKSHOPS_CONFIG n'ont PAS de champ id (il est la clé), et buildWorkshopCardHTML
    // repose sur workshop.id partout. Passer la config brute donnait id=undefined ->
    // getMaxCraftTimes()=0 -> "Pas assez de ressources" à tort et contrôles morts
    // (bug signalé par Seb sur build réel, invisible du harnais v3.191.0 qui ne
    // testait que la présence des classes).
    h += buildWorkshopCardHTML(Object.assign({ id: workshopId }, def));
  });
  h += '</div>';
  if (lockedNames.length) {
    h += '<div class="production-shops-locked"><img class=ico-inline src=images/Icons/system/lock_closed.png> ' + esc(_t("{n} ateliers à venir : {x}", { n: lockedNames.length, x: lockedNames.join(" · ") })) + '</div>';
  }
  return h;
}

function buildProductionHTML() {
  ProductionManager.ensure();
  productionViewTab = "prod";
  return buildProdDashboardHTML();
}

window.buildProductionHTML = buildProductionHTML;
