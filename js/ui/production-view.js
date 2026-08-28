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

var productionPlotsPanelExpanded = {}; // { [buildingId]: bool } — panneau déplié, par bâtiment
var selectedProductionPlotIndex = {};  // { [buildingId]: number|null } — zone sélectionnée, par bâtiment

function buildProductionCardHTML(id) {
  var def = PRODUCTION_BUILDINGS[id];
  if (!def) return "";

  if (window.ProductionPlotsSystem && ProductionPlotsSystem.isManaged(id)) return buildPlotsCardHTML(id, def);

  var level = ProductionManager.getLevel(id);
  var stock = ProductionManager.getStock(id);
  var capacity = ProductionManager.getCapacity(id);
  var ratePerMin = ProductionManager.getRatePerMin(id);
  var isFull = ProductionManager.isStockFull(id);
  var secondsUntilFull = ProductionManager.getSecondsUntilFull(id);
  var hasStock = Math.floor(stock) > 0;
  var pct = capacity > 0 ? Math.min(100, (stock / capacity) * 100) : 0;
  var resDef = WAREHOUSE_RESOURCES[def.resourceKey] || {};

  var h = '<div class="production-card' + (isFull ? ' is-full' : '') + '">';

  h += '<div class="production-card-main-row">';

  h += '<div class="production-card-portrait">';
  h += '<img class="production-card-portrait-img" src="' + esc(def.buildingImage || def.icon) + '" alt="' + esc(def.name) + '">';
  h += '</div>';

  h += '<div class="production-card-info">';
  h += '<div class="production-card-title-row">';
  h += '<span class="production-card-name">' + esc(def.name) + '</span>';
  h += '<span class="production-card-level-badge">Niv. ' + level + '</span>';
  h += '</div>';

  h += '<div class="production-card-rate">' + renderIconOrEmojiHTML(resDef.icon, "production-rate-icon", resDef.name) + '<span>+' + formatNumber(ratePerMin) + ' ' + esc(resDef.name || def.name) + ' / min</span></div>';

  h += '<div class="nb-entry-progress-bar production-stock-bar">';
  h += '<div class="nb-entry-progress-fill' + (isFull ? ' done' : '') + '" style="width:' + pct + '%"></div>';
  h += '</div>';
  h += '<div class="production-card-stock-label">' + formatNumber(Math.floor(stock)) + ' / ' + formatNumber(capacity) + ' ' + esc(resDef.name || '') + '</div>';

  if (isFull) {
    h += '<div class="production-card-status is-full">✅ Stock plein</div>';
  } else {
    h += '<div class="production-card-status">⏳ Plein dans ' + esc(formatTime(secondsUntilFull)) + '</div>';
  }
  h += '</div>';

  h += '<div class="production-card-actions">';
  h += '<button class="production-action-btn production-harvest-btn' + (hasStock ? ' is-ready' : ' is-disabled') + '" type="button" ' + (hasStock ? '' : 'disabled') + ' onclick="ProductionManager.harvest(\'' + id + '\')">';
  h += '<img class="btn-buy-icon" src="images/Icons/gold_icon.png" alt="">Récolter' + (hasStock ? ' · ' + formatNumber(Math.floor(stock)) : '');
  h += '</button>';

  if (ProductionManager.isMaxLevel(id)) {
    h += '<button class="production-action-btn production-upgrade-btn is-disabled" type="button" disabled>Niveau max</button>';
  } else {
    var cost = ProductionManager.getNextCost(id);
    var afford = ProductionManager.getAffordability(id);
    h += '<button class="production-action-btn production-upgrade-btn' + (afford.all ? '' : ' is-disabled') + '" type="button" ' + (afford.all ? '' : 'disabled') + ' onclick="ProductionManager.buy(\'' + id + '\')">';
    h += 'Améliorer<br>';
    h += buildProductionCostRowHTML(cost, afford);
    h += '</button>';
  }
  h += '</div>';

  h += '</div>'; // .production-card-main-row

  h += '</div>';

  return h;
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

/* ============================================================
   Carte à zones indépendantes — résumé global (jauge + Récolter) et
   grille de 9 zones en panneau dépliable. Généralisée à tout bâtiment
   listé dans PRODUCTION_PLOTS_BUILDINGS (les 6 : Chasse, Champs,
   Scierie, Mine, Carrière, Puits).
   ============================================================ */

function buildPlotsCardHTML(buildingId, def) {
  var stock = ProductionManager.getStock(buildingId);
  var capacity = ProductionManager.getCapacity(buildingId);
  var ratePerMin = ProductionManager.getRatePerMin(buildingId);
  var isFull = capacity > 0 && stock >= capacity;
  var hasStock = Math.floor(stock) > 0;
  var pct = capacity > 0 ? Math.min(100, (stock / capacity) * 100) : 0;
  var resDef = WAREHOUSE_RESOURCES[def.resourceKey] || {};

  var h = '<div class="production-card' + (isFull ? ' is-full' : '') + '">';

  h += '<div class="production-card-main-row">';

  h += '<div class="production-card-portrait">';
  h += '<img class="production-card-portrait-img" src="' + esc(def.buildingImage || def.icon) + '" alt="' + esc(def.name) + '">';
  h += '</div>';

  h += '<div class="production-card-info">';
  h += '<div class="production-card-title-row">';
  h += '<span class="production-card-name">' + esc(def.name) + '</span>';
  h += '</div>';

  h += '<div class="production-card-rate">' + renderIconOrEmojiHTML(resDef.icon, "production-rate-icon", resDef.name) + '<span>+' + formatNumber(ratePerMin) + ' ' + esc(resDef.name || def.name) + ' / min</span></div>';

  h += '<div class="nb-entry-progress-bar production-stock-bar">';
  h += '<div class="nb-entry-progress-fill' + (isFull ? ' done' : '') + '" style="width:' + pct + '%"></div>';
  h += '</div>';
  h += '<div class="production-card-stock-label">' + formatNumber(Math.floor(stock)) + ' / ' + formatNumber(capacity) + ' ' + esc(resDef.name || '') + '</div>';

  if (isFull) {
    h += '<div class="production-card-status is-full">✅ Stock plein</div>';
  } else if (ratePerMin > 0) {
    var secondsUntilFull = ((capacity - stock) / ratePerMin) * 60;
    h += '<div class="production-card-status">⏳ Plein dans ' + esc(formatTime(secondsUntilFull)) + '</div>';
  }
  h += '</div>';

  // Plus de bouton "Améliorer" de bâtiment — juste la récolte globale, qui additionne
  // toutes les zones ouvertes (voir ProductionPlotsSystem.harvestAll()).
  h += '<div class="production-card-actions">';
  h += '<button class="production-action-btn production-harvest-btn full-width' + (hasStock ? ' is-ready' : ' is-disabled') + '" type="button" ' + (hasStock ? '' : 'disabled') + ' onclick="ProductionManager.harvest(\'' + buildingId + '\')">';
  h += '<img class="btn-buy-icon" src="images/Icons/gold_icon.png" alt="">Récolter' + (hasStock ? ' · ' + formatNumber(Math.floor(stock)) : '');
  h += '</button>';
  h += '</div>';

  h += '</div>'; // .production-card-main-row

  h += '<div class="production-card-full-row">';
  h += buildPlotsToggleHTML(buildingId);
  h += '</div>';

  h += '</div>';

  return h;
}

function toggleProductionPlotsPanel(buildingId) {
  productionPlotsPanelExpanded[buildingId] = !productionPlotsPanelExpanded[buildingId];
  if (typeof renderPanel === "function") renderPanel();
}
window.toggleProductionPlotsPanel = toggleProductionPlotsPanel;

function buildPlotsToggleHTML(buildingId) {
  var openCount = window.ProductionPlotsSystem ? ProductionPlotsSystem.getOpenPlotsCount(buildingId) : 0;
  var buildingCfg = PRODUCTION_PLOTS_BUILDINGS[buildingId];
  var sectionLabel = buildingCfg ? buildingCfg.sectionLabel : "Zones";
  var isExpanded = !!productionPlotsPanelExpanded[buildingId];

  var h = '<button class="farm-plots-toggle" type="button" onclick="toggleProductionPlotsPanel(\'' + buildingId + '\')">';
  h += '<span>' + esc(sectionLabel) + '</span>';
  h += '<span class="farm-plots-count">' + openCount + ' / ' + PRODUCTION_PLOTS_SHARED.totalPlots + '</span>';
  h += '<span class="farm-plots-chevron">' + (isExpanded ? '▴' : '▾') + '</span>';
  h += '</button>';

  if (isExpanded) {
    h += buildPlotsPanelHTML(buildingId);
  }

  return h;
}

function buildPlotsPanelHTML(buildingId) {
  var plots = ProductionPlotsSystem.getPlots(buildingId);
  var selectedIndex = typeof selectedProductionPlotIndex[buildingId] === "number" ? selectedProductionPlotIndex[buildingId] : null;

  var h = '<div class="farm-plots-panel">';
  h += '<div class="farm-plots-grid">';
  plots.forEach(function (plot, index) {
    h += buildPlotCardHTML(buildingId, plot, index, selectedIndex);
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
   sous la grille (voir buildPlotActionsHTML). Le libellé de zone utilise le préfixe propre
   au bâtiment (Parcelle/Territoire/Bosquet/Galerie/Filon/Point d'eau). */
function buildPlotCardHTML(buildingId, plot, index, selectedIndex) {
  var buildingCfg = PRODUCTION_PLOTS_BUILDINGS[buildingId];
  var zoneNamePrefix = buildingCfg ? buildingCfg.zoneNamePrefix : "Zone";
  var isSelected = selectedIndex === index;
  var classNames = "farm-plot-card" + (isSelected ? " is-selected" : "");

  if (plot.state === "locked") {
    classNames += " is-locked";
    var h0 = '<div class="' + classNames + '" onclick="selectProductionPlot(\'' + buildingId + '\', ' + index + ')">';
    h0 += '<div class="farm-plot-card-lock-icon">🔒</div>';
    h0 += '<div class="farm-plot-card-name">' + esc(zoneNamePrefix) + ' ' + (index + 1) + '</div>';
    h0 += '</div>';
    return h0;
  }

  classNames += " is-open";
  var profile = ProductionPlotsSystem.getProfile(index);
  var capacity = ProductionPlotsSystem.getPlotCapacity(index, plot);
  var pct = capacity > 0 ? Math.min(100, (plot.stock / capacity) * 100) : 0;

  var h = '<div class="' + classNames + '" onclick="selectProductionPlot(\'' + buildingId + '\', ' + index + ')">';
  h += '<div class="farm-plot-card-top">';
  h += '<span class="farm-plot-card-level-badge">Niv. ' + plot.level + '</span>';
  h += '</div>';
  h += '<div class="farm-plot-card-name">' + esc(zoneNamePrefix) + ' ' + (index + 1) + '</div>';
  h += '<div class="farm-plot-card-profile">' + esc(profile.label) + '</div>';

  h += '<div class="nb-entry-progress-bar farm-plot-card-bar">';
  h += '<div class="nb-entry-progress-fill" style="width:' + pct + '%"></div>';
  h += '</div>';
  h += '<div class="farm-plot-card-stock-label">' + formatNumber(Math.floor(plot.stock)) + '/' + formatNumber(capacity) + '</div>';

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
  return '<span class="' + classNames + '" title="' + esc(def.label) + '">' + def.icon + '</span>';
}

/* Zone commune d'actions pour la zone sélectionnée : un seul bouton Défricher si
   verrouillée, ou jusqu'à 3 boutons (Améliorer + 2 améliorations) si ouverte, chacun avec
   son coût ET une courte description de l'effet. Coûts/libellés/icônes/descriptions lus
   depuis PRODUCTION_PLOTS_BUILDINGS[buildingId] — propres à chaque bâtiment (v3.97.1 :
   noms et icônes thématiques par bâtiment, remplace "Fertile"/"Irriguée" génériques). */
function buildPlotActionsHTML(buildingId, plot, index) {
  var buildingCfg = PRODUCTION_PLOTS_BUILDINGS[buildingId];
  var zoneNamePrefix = buildingCfg ? buildingCfg.zoneNamePrefix : "Zone";
  var resDef = WAREHOUSE_RESOURCES[(PRODUCTION_BUILDINGS[buildingId] || {}).resourceKey] || {};
  var resName = resDef.name || "";

  var h = '<div class="farm-plot-actions">';
  h += '<div class="farm-plot-actions-title">' + esc(zoneNamePrefix) + ' ' + (index + 1) + '</div>';

  if (plot.state === "locked") {
    var unlockCost = getProductionPlotUnlockCost(buildingId, index);
    var canAffordUnlock = unlockCost && Object.keys(unlockCost).every(function (key) {
      return WarehouseManager.getAmount(key) >= unlockCost[key];
    });
    h += buildPlotActionButtonHTML({
      onclick: "productionPlotUnlock('" + buildingId + "', " + index + ")",
      label: "Défricher",
      desc: "Rend cette zone exploitable.",
      cost: unlockCost,
      canAfford: canAffordUnlock
    });
    h += '</div>';
    return h;
  }

  var isMaxLevel = ProductionPlotsSystem.isPlotMaxLevel(plot);
  if (isMaxLevel) {
    h += '<div class="farm-plot-action-btn is-disabled"><span class="farm-plot-action-label">Niveau max</span></div>';
  } else {
    var upgradeCost = getProductionPlotUpgradeCost(buildingId, plot.level);
    var canAffordUpgrade = Object.keys(upgradeCost).every(function (key) {
      return WarehouseManager.getAmount(key) >= upgradeCost[key];
    });
    var rateNow = ProductionPlotsSystem.getPlotRatePerMin(index, plot);
    var rateNext = ProductionPlotsSystem.getPlotRatePerMin(index, { level: plot.level + 1, fertile: plot.fertile, irrigated: plot.irrigated });
    h += buildPlotActionButtonHTML({
      onclick: "productionPlotUpgrade('" + buildingId + "', " + index + ")",
      label: "Améliorer",
      desc: esc(resName) + "/min : " + formatNumber(rateNow) + " → " + formatNumber(rateNext) + " (niv. " + (plot.level + 1) + ")",
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
      label: fertileDef.icon + " " + fertileDef.label,
      desc: "+" + Math.round(PRODUCTION_PLOTS_SHARED.bonusPerImprovement.fertile * 100) + "% " + resName + ", permanent. " + fertileDef.desc,
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
      label: irrigatedDef.icon + " " + irrigatedDef.label,
      desc: "+" + Math.round(PRODUCTION_PLOTS_SHARED.bonusPerImprovement.irrigated * 100) + "% " + resName + ", permanent. " + irrigatedDef.desc,
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
function buildPlotActionButtonHTML(opts) {
  var h = '<button class="farm-plot-action-btn' + (opts.canAfford ? '' : ' is-disabled') + '" type="button" ' + (opts.canAfford ? '' : 'disabled') + ' onclick="' + opts.onclick + '">';
  h += '<span class="farm-plot-action-btn-text">';
  h += '<span class="farm-plot-action-label">' + esc(opts.label) + '</span>';
  h += '<span class="farm-plot-action-desc">' + esc(opts.desc) + '</span>';
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

function buildProductionHTML() {
  ProductionManager.ensure();

  var h = '<div class="production-grid">';
  Object.keys(PRODUCTION_BUILDINGS).forEach(function (id) {
    if (!ProductionManager.isBuildingUnlocked(id)) return; // v3.92.0 : Carrière verrouillée -> invisible
    h += buildProductionCardHTML(id);
  });
  h += '</div>';
  return h;
}

window.buildProductionHTML = buildProductionHTML;
