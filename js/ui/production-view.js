"use strict";
/* ui/production-view.js — sous-onglet Production du Village. Carte horizontale (portrait+infos+actions), logique dans ProductionManager.
   v3.96.0 : refonte de la carte Champs — plus de niveau/bouton "Améliorer" de bâtiment
   unique (9 parcelles désormais indépendantes, voir farm-plots-system.js). La carte
   principale garde juste le résumé global (jauge + bouton Récolter tout) ; le panneau
   dépliable devient une grille de 9 mini-cartes de parcelle, chacune avec son niveau,
   sa jauge, ses actions propres (Débloquer/Améliorer, tap sur icône fertile/irriguée).
   Détail : COMMENTAIRES_ORIGINAUX.md */

var farmPlotsPanelExpanded = false; // état d'affichage local à cet écran, pas mêlé aux cartes de quête

function buildProductionCardHTML(id) {
  var def = PRODUCTION_BUILDINGS[id];
  if (!def) return "";

  if (id === "farm") return buildFarmCardHTML(def);

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

/* v3.96.0 : coût multi-ressources compact (or + jusqu'à 2 ressources), une icône+montant
   par ressource, chacune en rouge si le joueur n'a pas assez de cette ressource précise. */
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
   Carte Champs — résumé global (jauge + Récolter tout) et grille
   de parcelles indépendantes en panneau dépliable.
   ============================================================ */

function buildFarmCardHTML(def) {
  var stock = ProductionManager.getStock("farm");
  var capacity = ProductionManager.getCapacity("farm");
  var ratePerMin = ProductionManager.getRatePerMin("farm");
  var isFull = capacity > 0 && stock >= capacity;
  var hasStock = Math.floor(stock) > 0;
  var pct = capacity > 0 ? Math.min(100, (stock / capacity) * 100) : 0;
  var resDef = WAREHOUSE_RESOURCES[def.resourceKey] || {};
  var openCount = window.FarmPlotsSystem ? FarmPlotsSystem.getOpenPlotsCount() : 0;

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

  // v3.96.0 : plus de bouton "Améliorer" de bâtiment — juste la récolte globale, qui
  // additionne toutes les parcelles ouvertes (voir FarmPlotsSystem.harvestAll()).
  h += '<div class="production-card-actions">';
  h += '<button class="production-action-btn production-harvest-btn full-width' + (hasStock ? ' is-ready' : ' is-disabled') + '" type="button" ' + (hasStock ? '' : 'disabled') + ' onclick="ProductionManager.harvest(\'farm\')">';
  h += '<img class="btn-buy-icon" src="images/Icons/gold_icon.png" alt="">Récolter' + (hasStock ? ' · ' + formatNumber(Math.floor(stock)) : '');
  h += '</button>';
  h += '</div>';

  h += '</div>'; // .production-card-main-row

  h += '<div class="production-card-full-row">';
  h += buildFarmPlotsToggleHTML();
  h += '</div>';

  h += '</div>';

  return h;
}

function toggleFarmPlotsPanel() {
  farmPlotsPanelExpanded = !farmPlotsPanelExpanded;
  if (typeof renderPanel === "function") renderPanel();
}
window.toggleFarmPlotsPanel = toggleFarmPlotsPanel;

function buildFarmPlotsToggleHTML() {
  var openCount = window.FarmPlotsSystem ? FarmPlotsSystem.getOpenPlotsCount() : 0;
  var h = '<button class="farm-plots-toggle" type="button" onclick="toggleFarmPlotsPanel()">';
  h += '<span>🌾 Parcelles</span>';
  h += '<span class="farm-plots-count">' + openCount + ' / ' + FARM_PLOTS_CONFIG.totalPlots + '</span>';
  h += '<span class="farm-plots-chevron">' + (farmPlotsPanelExpanded ? '▴' : '▾') + '</span>';
  h += '</button>';

  if (farmPlotsPanelExpanded) {
    h += buildFarmPlotsPanelHTML();
  }

  return h;
}

var selectedFarmPlotIndex = null; // parcelle actuellement sélectionnée (une seule à la fois)

function buildFarmPlotsPanelHTML() {
  var plots = FarmPlotsSystem.getPlots();

  var h = '<div class="farm-plots-panel">';
  h += '<div class="farm-plots-grid">';
  plots.forEach(function (plot, index) {
    h += buildFarmPlotCardHTML(plot, index);
  });
  h += '</div>';

  if (selectedFarmPlotIndex !== null && selectedFarmPlotIndex < plots.length) {
    h += buildFarmPlotActionsHTML(plots[selectedFarmPlotIndex], selectedFarmPlotIndex);
  }

  h += '</div>';
  return h;
}

/* v3.96.1 : mini-carte allégée (plus de bouton avec coût empilé dedans, cause du
   débordement hors cadre signalé) — juste niveau (au-dessus du nom), jauge, icônes
   fertile/irriguée en état visuel seul (plus tapables directement). Toute la carte
   devient cliquable pour SÉLECTIONNER la parcelle ; les actions et leurs coûts
   s'affichent dans une zone commune sous la grille (voir buildFarmPlotActionsHTML). */
function buildFarmPlotCardHTML(plot, index) {
  var isSelected = selectedFarmPlotIndex === index;
  var classNames = "farm-plot-card" + (isSelected ? " is-selected" : "");

  if (plot.state === "locked") {
    classNames += " is-locked";
    var h0 = '<div class="' + classNames + '" onclick="selectFarmPlot(' + index + ')">';
    h0 += '<div class="farm-plot-card-lock-icon">🔒</div>';
    h0 += '<div class="farm-plot-card-name">Parcelle ' + (index + 1) + '</div>';
    h0 += '</div>';
    return h0;
  }

  classNames += " is-open";
  var profile = FarmPlotsSystem.getProfile(index);
  var capacity = FarmPlotsSystem.getPlotCapacity(index, plot);
  var pct = capacity > 0 ? Math.min(100, (plot.stock / capacity) * 100) : 0;

  var h = '<div class="' + classNames + '" onclick="selectFarmPlot(' + index + ')">';
  h += '<div class="farm-plot-card-top">';
  h += '<span class="farm-plot-card-level-badge">Niv. ' + plot.level + '</span>';
  h += '</div>';
  h += '<div class="farm-plot-card-name">Parcelle ' + (index + 1) + '</div>';
  h += '<div class="farm-plot-card-profile">' + esc(profile.label) + '</div>';

  h += '<div class="nb-entry-progress-bar farm-plot-card-bar">';
  h += '<div class="nb-entry-progress-fill" style="width:' + pct + '%"></div>';
  h += '</div>';
  h += '<div class="farm-plot-card-stock-label">' + formatNumber(Math.floor(plot.stock)) + '/' + formatNumber(capacity) + '</div>';

  h += '<div class="farm-plot-card-improvements">';
  h += buildFarmImprovementIconHTML(plot, "fertile", "🌿");
  h += buildFarmImprovementIconHTML(plot, "irrigated", "💧");
  h += '</div>';

  h += '</div>';
  return h;
}

/* Icône fertile/irriguée : état visuel seul (grisée/colorée), plus tapable directement
   depuis v3.96.1 — l'action se fait désormais via la zone commune sous la grille, une
   fois la parcelle sélectionnée (voir buildFarmPlotActionsHTML). */
function buildFarmImprovementIconHTML(plot, kind, icon) {
  var applied = !!plot[kind];
  var label = kind === "fertile" ? "Terre fertile" : "Sillon irrigué";
  var classNames = "farm-plot-improvement-icon" + (applied ? " is-applied" : "");
  return '<span class="' + classNames + '" title="' + esc(label) + '">' + icon + '</span>';
}

/* Zone commune d'actions pour la parcelle sélectionnée : un seul bouton Défricher si
   verrouillée, ou jusqu'à 3 boutons (Améliorer/Fertile/Irriguée) si ouverte, chacun avec
   son coût affiché — remplace les boutons individuels par mini-carte de la v3.96.0. */
/* Zone commune d'actions pour la parcelle sélectionnée : un seul bouton Défricher si
   verrouillée, ou jusqu'à 3 boutons (Améliorer/Fertile/Irriguée) si ouverte, chacun avec
   son coût ET une courte description de l'effet — remplace les boutons individuels par
   mini-carte de la v3.96.0. v3.96.3 : ajout des descriptions (retour Seb : l'effet des
   améliorations n'était pas clair sans elles). */
function buildFarmPlotActionsHTML(plot, index) {
  var h = '<div class="farm-plot-actions">';
  h += '<div class="farm-plot-actions-title">Parcelle ' + (index + 1) + '</div>';

  if (plot.state === "locked") {
    var unlockCost = getFarmPlotUnlockCost(index);
    var canAffordUnlock = unlockCost && Object.keys(unlockCost).every(function (key) {
      return WarehouseManager.getAmount(key) >= unlockCost[key];
    });
    h += buildFarmActionButtonHTML({
      onclick: "farmPlotUnlock(" + index + ")",
      label: "Défricher",
      desc: "Rend cette parcelle cultivable.",
      cost: unlockCost,
      canAfford: canAffordUnlock
    });
    h += '</div>';
    return h;
  }

  var isMaxLevel = FarmPlotsSystem.isPlotMaxLevel(plot);
  if (isMaxLevel) {
    h += '<div class="farm-plot-action-btn is-disabled"><span class="farm-plot-action-label">Niveau max</span></div>';
  } else {
    var upgradeCost = getFarmPlotUpgradeCost(plot.level);
    var canAffordUpgrade = Object.keys(upgradeCost).every(function (key) {
      return WarehouseManager.getAmount(key) >= upgradeCost[key];
    });
    var rateNow = FarmPlotsSystem.getPlotRatePerMin(index, plot);
    var rateNext = FarmPlotsSystem.getPlotRatePerMin(index, { level: plot.level + 1, fertile: plot.fertile, irrigated: plot.irrigated });
    h += buildFarmActionButtonHTML({
      onclick: "farmPlotUpgrade(" + index + ")",
      label: "Améliorer",
      desc: "Blé/min : " + formatNumber(rateNow) + " → " + formatNumber(rateNext) + " (niv. " + (plot.level + 1) + ")",
      cost: upgradeCost,
      canAfford: canAffordUpgrade
    });
  }

  if (!plot.fertile) {
    var fertileDef = FARM_PLOTS_CONFIG.improvementCost.fertile;
    var canAffordFertile = Object.keys(fertileDef.cost).every(function (key) {
      return WarehouseManager.getAmount(key) >= fertileDef.cost[key];
    });
    h += buildFarmActionButtonHTML({
      onclick: "farmPlotToggleImprovement(" + index + ", 'fertile')",
      label: "🌿 Fertile",
      desc: "+" + Math.round(FARM_PLOTS_CONFIG.bonusPerImprovement.fertile * 100) + "% Blé, permanent. " + fertileDef.desc,
      cost: fertileDef.cost,
      canAfford: canAffordFertile
    });
  }

  if (!plot.irrigated) {
    var irrigatedDef = FARM_PLOTS_CONFIG.improvementCost.irrigated;
    var canAffordIrrigated = Object.keys(irrigatedDef.cost).every(function (key) {
      return WarehouseManager.getAmount(key) >= irrigatedDef.cost[key];
    });
    h += buildFarmActionButtonHTML({
      onclick: "farmPlotToggleImprovement(" + index + ", 'irrigated')",
      label: "💧 Irriguée",
      desc: "+" + Math.round(FARM_PLOTS_CONFIG.bonusPerImprovement.irrigated * 100) + "% Blé, permanent. " + irrigatedDef.desc,
      cost: irrigatedDef.cost,
      canAfford: canAffordIrrigated
    });
  }

  h += '</div>';
  return h;
}

/* Bouton d'action générique de la zone .farm-plot-actions : libellé + courte description
   d'effet sur une ligne dédiée + coût. Factorisé car les 4 actions (Défricher/Améliorer/
   Fertile/Irriguée) partagent exactement cette structure à 3 lignes. */
function buildFarmActionButtonHTML(opts) {
  var h = '<button class="farm-plot-action-btn' + (opts.canAfford ? '' : ' is-disabled') + '" type="button" ' + (opts.canAfford ? '' : 'disabled') + ' onclick="' + opts.onclick + '">';
  h += '<span class="farm-plot-action-btn-text">';
  h += '<span class="farm-plot-action-label">' + esc(opts.label) + '</span>';
  h += '<span class="farm-plot-action-desc">' + esc(opts.desc) + '</span>';
  h += '</span>';
  h += buildFarmPlotCostRowHTML(opts.cost);
  h += '</button>';
  return h;
}

function selectFarmPlot(index) {
  selectedFarmPlotIndex = (selectedFarmPlotIndex === index) ? null : index; // retap = désélectionne
  if (typeof renderPanel === "function") renderPanel();
}
window.selectFarmPlot = selectFarmPlot;

function buildFarmPlotCostRowHTML(cost) {
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

function farmPlotUnlock(plotIndex) {
  var result = FarmPlotsSystem.unlockPlot(plotIndex);
  if (!result.ok) showToast(result.reason, 1200);
}
window.farmPlotUnlock = farmPlotUnlock;

function farmPlotUpgrade(plotIndex) {
  var result = FarmPlotsSystem.upgradePlot(plotIndex);
  if (!result.ok) showToast(result.reason, 1200);
}
window.farmPlotUpgrade = farmPlotUpgrade;

function farmPlotToggleImprovement(plotIndex, kind) {
  var result = FarmPlotsSystem.toggleImprovement(plotIndex, kind);
  if (!result.ok) showToast(result.reason, 1200);
}
window.farmPlotToggleImprovement = farmPlotToggleImprovement;

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
