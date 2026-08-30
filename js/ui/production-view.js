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
  h += '<div class="nb-entry-progress-fill' + (isFull ? ' done' : '') + '" id="prod-bar-' + id + '" style="width:' + pct + '%"></div>';
  h += '</div>';
  h += '<div class="production-card-stock-label" id="prod-stock-label-' + id + '">' + formatNumber(Math.floor(stock)) + ' / ' + formatNumber(capacity) + ' ' + esc(resDef.name || '') + '</div>';

  if (isFull) {
    h += '<div class="production-card-status is-full" id="prod-status-' + id + '">✅ Stock plein</div>';
  } else {
    h += '<div class="production-card-status" id="prod-status-' + id + '">⏳ Plein dans ' + esc(formatTime(secondsUntilFull)) + '</div>';
  }
  h += '</div>';

  h += '<div class="production-card-actions">';
  h += '<button class="production-action-btn production-harvest-btn' + (hasStock ? ' is-ready' : ' is-disabled') + '" id="prod-harvest-btn-' + id + '" type="button" ' + (hasStock ? '' : 'disabled') + ' onclick="ProductionManager.harvest(\'' + id + '\')">';
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
  h += '<div class="nb-entry-progress-fill' + (isFull ? ' done' : '') + '" id="prod-bar-' + buildingId + '" style="width:' + pct + '%"></div>';
  h += '</div>';
  h += '<div class="production-card-stock-label" id="prod-stock-label-' + buildingId + '">' + formatNumber(Math.floor(stock)) + ' / ' + formatNumber(capacity) + ' ' + esc(resDef.name || '') + '</div>';

  if (isFull) {
    h += '<div class="production-card-status is-full" id="prod-status-' + buildingId + '">✅ Stock plein</div>';
  } else if (ratePerMin > 0) {
    var secondsUntilFull = ((capacity - stock) / ratePerMin) * 60;
    h += '<div class="production-card-status" id="prod-status-' + buildingId + '">⏳ Plein dans ' + esc(formatTime(secondsUntilFull)) + '</div>';
  } else {
    h += '<div class="production-card-status" id="prod-status-' + buildingId + '"></div>';
  }
  h += '</div>';

  // Plus de bouton "Améliorer" de bâtiment — juste la récolte globale, qui additionne
  // toutes les zones ouvertes (voir ProductionPlotsSystem.harvestAll()).
  h += '<div class="production-card-actions">';
  h += '<button class="production-action-btn production-harvest-btn full-width' + (hasStock ? ' is-ready' : ' is-disabled') + '" id="prod-harvest-btn-' + buildingId + '" type="button" ' + (hasStock ? '' : 'disabled') + ' onclick="ProductionManager.harvest(\'' + buildingId + '\')">';
  h += '<img class="btn-buy-icon" src="images/Icons/gold_icon.png" alt="">Récolter' + (hasStock ? ' · ' + formatNumber(Math.floor(stock)) : '');
  h += '</button>';
  h += '</div>';

  h += '</div>'; // .production-card-main-row

  h += '<div class="production-card-full-row">';
  h += buildPlotsToggleHTML(buildingId);
  h += buildWorkshopsToggleHTML(buildingId);
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
   sous la grille (voir buildPlotActionsHTML).
   v3.98.19 : nom de lieu dédié par zone (getProductionZoneName, ex. "Bois d'Aeswyn")
   remplace l'ancien "Préfixe + numéro" générique (ex. "Territoire 7") — retour Seb. */
function buildPlotCardHTML(buildingId, plot, index, selectedIndex) {
  var buildingCfg = PRODUCTION_PLOTS_BUILDINGS[buildingId];
  var zoneName = getProductionZoneName(buildingId, index);
  var isSelected = selectedIndex === index;
  var classNames = "farm-plot-card" + (isSelected ? " is-selected" : "");

  if (plot.state === "locked") {
    classNames += " is-locked";
    var h0 = '<div class="' + classNames + '" onclick="selectProductionPlot(\'' + buildingId + '\', ' + index + ')">';
    h0 += '<div class="farm-plot-card-lock-icon">🔒</div>';
    h0 += '<div class="farm-plot-card-name">' + esc(zoneName) + '</div>';
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
  h += '<div class="farm-plot-card-name">' + esc(zoneName) + '</div>';
  h += '<div class="farm-plot-card-profile">' + esc(profile.label) + '</div>';

  h += '<div class="nb-entry-progress-bar farm-plot-card-bar">';
  h += '<div class="nb-entry-progress-fill" id="prod-plot-bar-' + buildingId + '-' + index + '" style="width:' + pct + '%"></div>';
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
  return '<span class="' + classNames + '" title="' + esc(def.label) + '">' + def.icon + '</span>';
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
  var resName = resDef.name || "";

  var h = '<div class="farm-plot-actions">';
  h += '<div class="farm-plot-actions-title">' + esc(zoneName) + '</div>';

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
    var upgradeCost = getProductionPlotUpgradeCost(buildingId, plot.level, index);
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

/* ============================================================
   Section "⚙️ Production" — ateliers de craft locaux au bâtiment
   (voir WorkshopsSystem, data/workshops.js). Toggle dépliable au même
   niveau que "🌾 Parcelles" etc., état indépendant par bâtiment.
   ============================================================ */

var workshopsPanelExpanded = {}; // { [buildingId]: bool }
var selectedWorkshopRecipe = {}; // { [workshopId]: recipeId } — mémorise le choix de recette par atelier
var workshopCraftQty = {};       // { [workshopId]: number } — quantité du CRAFT MANUEL (bouton Fabriquer)
var workshopAutoQty = {};        // { [workshopId]: number } — v3.98.15 : quantité du CHAÎNAGE AUTO, un
                                  // champ dédié et SÉPARÉ du stepper manuel (retour Seb : les deux champs
                                  // se confondaient auparavant). Démarre à 1 à chaque activation de l'auto
                                  // sur une recette, ajustable ensuite indépendamment du stepper manuel.
                                  // Une seule recette auto par atelier -> clé par workshopId suffit.

function toggleWorkshopsPanel(buildingId) {
  workshopsPanelExpanded[buildingId] = !workshopsPanelExpanded[buildingId];
  if (typeof renderPanel === "function") renderPanel();
}
window.toggleWorkshopsPanel = toggleWorkshopsPanel;

function buildWorkshopsToggleHTML(buildingId) {
  var workshops = getWorkshopsForBuilding(buildingId);
  if (!workshops.length) return "";

  var activeCount = workshops.filter(function (w) { return w.active; }).length;
  var isExpanded = !!workshopsPanelExpanded[buildingId];

  var h = '<button class="farm-plots-toggle" type="button" onclick="toggleWorkshopsPanel(\'' + buildingId + '\')">';
  h += '<span>⚙️ Production</span>';
  h += '<span class="farm-plots-count">' + activeCount + ' / ' + workshops.length + '</span>';
  h += '<span class="farm-plots-chevron">' + (isExpanded ? '▴' : '▾') + '</span>';
  h += '</button>';

  if (isExpanded) {
    h += '<div class="farm-plots-panel">';
    h += '<div class="workshop-list">';
    workshops.forEach(function (w) {
      h += buildWorkshopCardHTML(w);
    });
    h += '</div>';
    h += '</div>';
  }

  return h;
}

/* Carte d'un atelier : verrouillée ("bientôt", aucune action) ou active (recette(s),
   file de craft, stepper de quantité, bouton Fabriquer, bouton Améliorer). Reprend le
   pattern déjà en place pour le craft de l'ancien Entrepôt (stepper -/+/Max), adapté à
   une recette locale.
   v3.98.6 : badge "Niv. X" à côté du nom (comme la maquette fournie par Seb), temps de
   craft affiché = temps EFFECTIF (réduit par le niveau, voir
   WorkshopsSystem.getEffectiveCraftTimeMs), bouton Améliorer fonctionnel remplaçant
   l'ancien bouton "Bientôt" désactivé. */
function buildWorkshopCardHTML(workshop) {
  if (!workshop.active) {
    var h0 = '<div class="workshop-card is-inactive">';
    h0 += '<div class="workshop-card-icon">' + workshop.icon + '</div>';
    h0 += '<div class="workshop-card-name">' + esc(workshop.name) + '</div>';
    h0 += '<div class="workshop-card-soon">Bientôt</div>';
    h0 += '</div>';
    return h0;
  }

  var level = WorkshopsSystem.getLevel(workshop.id);
  var recipes = workshop.recipes;
  var selectedRecipeId = selectedWorkshopRecipe[workshop.id] || recipes[0].id;
  var recipe = recipes.find(function (r) { return r.id === selectedRecipeId; }) || recipes[0];
  var outputDef = WAREHOUSE_RESOURCES[recipe.outputs[0].resourceId];
  var maxCrafts = WorkshopsSystem.getMaxCraftTimes(workshop.id, recipe.id);
  var qty = Math.max(1, Math.min(maxCrafts || 1, workshopCraftQty[workshop.id] || 1));
  workshopCraftQty[workshop.id] = qty;
  var effectiveCraftTimeMs = WorkshopsSystem.getEffectiveCraftTimeMs(workshop.id, recipe);

  var inputsText = recipe.inputs.map(function (input) {
    var d = WAREHOUSE_RESOURCES[input.resourceId];
    return formatNumber(input.quantity) + ' ' + esc(d ? d.name : input.resourceId);
  }).join(' + ');

  var h = '<div class="workshop-card is-active">';
  h += '<div class="workshop-card-top">';
  h += '<div class="workshop-card-icon">' + workshop.icon + '</div>';
  h += '<div class="workshop-card-name">' + esc(workshop.name) + '</div>';
  h += '<span class="workshop-card-level-badge">Niv. ' + level + '</span>';
  h += '<span class="workshop-card-queue-badge" id="prod-workshop-queue-badge-' + workshop.id + '">File : ' + WorkshopsSystem.getQueue(workshop.id).length + ' / ' + WorkshopsSystem.getMaxQueueLength(workshop.id) + '</span>';
  h += '</div>';

  if (recipes.length > 1) {
    h += '<div class="warehouse-craft-recipe-tabs">';
    recipes.forEach(function (r) {
      var out = WAREHOUSE_RESOURCES[r.outputs[0].resourceId];
      var isActiveTab = r.id === recipe.id;
      var isAutoOnThis = WorkshopsSystem.getAutoRecipeId(workshop.id) === r.id;
      h += '<button type="button" class="warehouse-craft-recipe-tab' + (isActiveTab ? ' is-active' : '') + (isAutoOnThis ? ' is-auto' : '') + '" onclick="selectWorkshopRecipe(\'' + workshop.id + '\', \'' + r.id + '\')">';
      if (isAutoOnThis) h += '🔁 ';
      h += esc(out ? out.name : r.id);
      h += '</button>';
    });
    h += '</div>';
  }

  h += '<div class="workshop-recipe-line">' + renderIconOrEmojiHTML(outputDef.icon, "workshop-recipe-icon", outputDef.name) + inputsText + ' → ' + formatNumber(recipe.outputs[0].quantity) + ' ' + esc(outputDef.name) + '</div>';
  h += '<div class="workshop-recipe-detail">' + formatCraftDuration(effectiveCraftTimeMs) + ' par lot</div>';

  h += buildWorkshopAutoToggleHTML(workshop.id, recipe.id, recipes.length > 1);

  h += buildWorkshopQueueHTML(workshop.id);

  if (maxCrafts <= 0) {
    var missing = recipe.inputs.find(function (input) {
      return WarehouseManager.getAmount(input.resourceId) < input.quantity;
    });
    var missingDef = missing ? WAREHOUSE_RESOURCES[missing.resourceId] : null;
    h += '<div class="warehouse-empty-hint">Pas assez de ' + esc(missingDef ? missingDef.name : "") + ' pour fabriquer.</div>';
  } else {
    // v3.98.4 : stepper + bouton Fabriquer sur UNE seule ligne (maquette fournie par
    // Seb) — conteneur dédié .workshop-craft-row, stepper compacté (boutons ronds plus
    // petits) à gauche, bouton Fabriquer à droite. Le bouton reprend le visuel de
    // .production-harvest-btn (fond image) au lieu de .btn-buy, comme demandé.
    h += '<div class="workshop-craft-row">';
    h += '<div class="warehouse-qty-stepper workshop-qty-stepper-compact">';
    h += '<button class="warehouse-qty-btn" type="button" onclick="adjustWorkshopCraftQty(\'' + workshop.id + '\', -1)"' + (qty <= 1 ? ' disabled' : '') + '>−</button>';
    h += '<input class="warehouse-qty-value" type="number" min="1" max="' + maxCrafts + '" step="1" value="' + qty + '" onchange="setWorkshopCraftQty(\'' + workshop.id + '\', this.value)">';
    h += '<button class="warehouse-qty-btn" type="button" onclick="adjustWorkshopCraftQty(\'' + workshop.id + '\', 1)"' + (qty >= maxCrafts ? ' disabled' : '') + '>+</button>';
    h += '<button class="warehouse-qty-max-btn" type="button" onclick="adjustWorkshopCraftQty(\'' + workshop.id + '\', \'max\')"' + (qty >= maxCrafts ? ' disabled' : '') + '>Max</button>';
    h += '</div>';
    h += '<button class="production-action-btn production-harvest-btn workshop-craft-btn" type="button" onclick="confirmCraftWorkshop(\'' + workshop.id + '\')">Fabriquer ×' + formatNumber(qty) + '</button>';
    h += '</div>';
  }

  h += buildWorkshopUpgradeButtonHTML(workshop.id, recipe);

  h += '</div>';
  return h;
}

/* v3.98.6 : bouton "Améliorer" pleine largeur sous Fabriquer — remplace l'ancien bouton
   désactivé "Bientôt". Coût affiché comme sur les zones (buildProductionCostRowHTML,
   icône+montant par ressource, rouge si insuffisant).
   v3.98.16 : ajout d'une ligne d'EFFET (retour Seb — le bouton ne disait jusque-là que
   le coût, jamais ce que le niveau suivant apporte), sur le modèle de celui des zones
   (buildPlotActionButtonHTML) : vitesse actuelle -> suivante ET file actuelle ->
   suivante, les 2 effets d'un niveau d'atelier (voir data/workshops.js). `recipe` = la
   recette actuellement affichée sur la carte, pour calculer le temps de craft effectif
   avant/après. */
function buildWorkshopUpgradeButtonHTML(workshopId, recipe) {
  if (WorkshopsSystem.isMaxLevel(workshopId)) {
    return '<button class="workshop-upgrade-btn is-disabled" type="button" disabled>Niveau maximum</button>';
  }
  var cost = WorkshopsSystem.getUpgradeCost(workshopId);
  var afford = WorkshopsSystem.getUpgradeAffordability(workshopId);
  var level = WorkshopsSystem.getLevel(workshopId);
  var maxQueueNow = WorkshopsSystem.getMaxQueueLength(workshopId);

  var h = '<button class="workshop-upgrade-btn' + (afford.all ? '' : ' is-disabled') + '" type="button" ' + (afford.all ? '' : 'disabled') + ' onclick="upgradeWorkshop(\'' + workshopId + '\')">';
  h += '<span class="workshop-upgrade-label">⬆️ Améliorer (niv. ' + (level + 1) + ')</span>';

  if (recipe) {
    var timeNow = WorkshopsSystem.getEffectiveCraftTimeMs(workshopId, recipe, level);
    var timeNext = WorkshopsSystem.getEffectiveCraftTimeMs(workshopId, recipe, level + 1);
    h += '<span class="workshop-upgrade-effect">' + formatCraftDuration(timeNow) + ' → ' + formatCraftDuration(timeNext) + ' · File ' + maxQueueNow + ' → ' + (maxQueueNow + 1) + '</span>';
  }

  h += buildProductionCostRowHTML(cost, afford);
  h += '</button>';
  return h;
}

/* v3.98.13 : toggle "Production automatique" pour LA recette actuellement affichée
   (recipeId). Une seule recette auto-active à la fois par atelier — si une AUTRE
   recette de ce même atelier a déjà l'auto activé, le bouton l'indique clairement au
   lieu de simplement proposer d'activer (ce qui la remplacerait silencieusement).
   v3.98.15 : stepper dédié à la quantité auto (workshop-auto-qty-row), affiché
   uniquement quand l'auto est actif SUR CETTE recette — séparé du stepper manuel
   (retour Seb : les deux se confondaient), démarre à 1 à chaque activation.
   v3.98.17 : indicateur "⏸️ En attente" quand la RÉSERVE PROTÉGÉE (pas un manque réel
   de stock) empêche le chaînage de continuer — jusque-là un blocage par réserve était
   silencieux, indiscernable d'un simple manque de ressources. */
function buildWorkshopAutoToggleHTML(workshopId, recipeId, hasMultipleRecipes) {
  var activeAutoId = WorkshopsSystem.getAutoRecipeId(workshopId);
  var isActiveHere = activeAutoId === recipeId;
  var otherActive = hasMultipleRecipes && activeAutoId && !isActiveHere;

  var h = '<button class="workshop-auto-toggle' + (isActiveHere ? ' is-active' : '') + '" type="button" onclick="setWorkshopAutoRecipe(\'' + workshopId + '\', \'' + esc(recipeId) + '\')">';
  h += '🔁 <span>' + (isActiveHere ? 'Production automatique activée' : 'Activer la production automatique') + '</span>';
  h += '</button>';

  if (otherActive) {
    var otherRecipe = WorkshopsSystem.getRecipe(workshopId, activeAutoId);
    var otherDef = otherRecipe ? WAREHOUSE_RESOURCES[otherRecipe.outputs[0].resourceId] : null;
    h += '<div class="workshop-auto-hint">Déjà activée sur ' + esc(otherDef ? otherDef.name : activeAutoId) + ' — l\'activer ici la remplacera.</div>';
  }

  if (isActiveHere) {
    var maxAutoNow = WorkshopsSystem.getMaxAutoCraftTimes(workshopId, recipeId);
    var autoQty = Math.max(1, Math.min(maxAutoNow || 1, workshopAutoQty[workshopId] || 1));
    workshopAutoQty[workshopId] = autoQty;

    // v3.98.17 : signale quand c'est la RÉSERVE PROTÉGÉE (pas un manque réel de
    // ressources) qui empêche le chaînage de continuer — jusque-là rien ne le
    // distinguait d'un silence normal, le joueur ne pouvait pas savoir pourquoi
    // l'auto s'était arrêté. Distingué en comparant au stock BRUT (getMaxCraftTimes,
    // qui ignore la réserve) : si le brut permettrait un lot mais pas la version
    // "moins réserve", c'est bien elle la cause.
    if (maxAutoNow <= 0 && WorkshopsSystem.getMaxCraftTimes(workshopId, recipeId) > 0) {
      var blockingRecipe = WorkshopsSystem.getRecipe(workshopId, recipeId);
      var blockingInput = blockingRecipe ? blockingRecipe.inputs.find(function (input) {
        return window.ResourceReserveManager && ResourceReserveManager.getAvailableForAutoCraft(input.resourceId) < input.quantity;
      }) : null;
      var blockingDef = blockingInput ? WAREHOUSE_RESOURCES[blockingInput.resourceId] : null;
      h += '<div class="workshop-auto-blocked-hint">⏸️ En attente : la réserve protégée' + (blockingDef ? ' de ' + esc(blockingDef.name) : '') + ' empêche un nouveau lot. Ajustable dans l\'Entrepôt.</div>';
    }

    h += '<div class="workshop-auto-qty-row">';
    h += '<span class="workshop-auto-qty-label">Quantité par lot auto</span>';
    h += '<div class="warehouse-qty-stepper workshop-qty-stepper-compact">';
    h += '<button class="warehouse-qty-btn" type="button" onclick="adjustWorkshopAutoQty(\'' + workshopId + '\', -1)"' + (autoQty <= 1 ? ' disabled' : '') + '>−</button>';
    h += '<input class="warehouse-qty-value" type="number" min="1" max="' + (maxAutoNow || 1) + '" step="1" value="' + autoQty + '" onchange="setWorkshopAutoQty(\'' + workshopId + '\', this.value)">';
    h += '<button class="warehouse-qty-btn" type="button" onclick="adjustWorkshopAutoQty(\'' + workshopId + '\', 1)"' + (autoQty >= maxAutoNow ? ' disabled' : '') + '>+</button>';
    h += '<button class="warehouse-qty-max-btn" type="button" onclick="adjustWorkshopAutoQty(\'' + workshopId + '\', \'max\')"' + (autoQty >= maxAutoNow ? ' disabled' : '') + '>Max</button>';
    h += '</div>';
    h += '</div>';
  }

  return h;
}

/* v3.98.21 : id "workshop-queue-{workshopId}" sur le conteneur — permet un
   rafraîchissement CIBLÉ de ce seul bloc (refreshWorkshopQueueDOM ci-dessous) sans
   renderPanel() complet à chaque complétion de lot, qui cassait le scroll de la page
   Production en cours d'auto-craft (retour Seb : "scroll qui bloque toutes les 2-3
   secondes"). La file change de STRUCTURE (nombre/ordre d'entrées) à chaque complétion
   ou ajout auto, donc un simple setElementText/Width ne suffit pas ici comme pour le
   reste de ProductionManager.updateDOM() — on régénère juste ce sous-bloc via
   innerHTML, portée bien plus petite qu'un renderPanel() de toute la page. */
function buildWorkshopQueueHTML(workshopId) {
  var queue = WorkshopsSystem.getQueue(workshopId);
  if (!queue.length) return '<div class="warehouse-craft-queue" id="workshop-queue-' + workshopId + '"></div>';

  var h = '<div class="warehouse-craft-queue" id="workshop-queue-' + workshopId + '">';
  h += '<div class="warehouse-craft-queue-title">File de fabrication</div>';

  queue.forEach(function (entry, index) {
    var recipe = WorkshopsSystem.getRecipe(workshopId, entry.recipeId);
    var outputDef = recipe ? WAREHOUSE_RESOURCES[recipe.outputs[0].resourceId] : null;
    var label = outputDef ? outputDef.name : (recipe ? recipe.id : "?");
    var isCurrent = index === 0;

    h += '<div class="warehouse-craft-queue-row' + (isCurrent ? ' is-current' : '') + '">';
    h += '<div class="warehouse-craft-queue-row-top">';
    h += '<span class="warehouse-craft-queue-label">' + esc(label) + ' ×' + formatNumber(entry.times) + '</span>';

    if (isCurrent) {
      var totalMs = Number(recipe ? recipe.craftTimeMs : 0) * entry.times;
      h += '<span class="warehouse-craft-queue-time" id="prod-workshop-time-' + workshopId + '">' + formatCraftDuration(entry.msRemaining) + '</span>';
    } else {
      h += '<button class="warehouse-craft-queue-cancel" type="button" onclick="cancelWorkshopCraft(\'' + workshopId + '\', \'' + esc(entry.id) + '\')" aria-label="Annuler">✕</button>';
    }
    h += '</div>';

    if (isCurrent) {
      var pct = totalMs > 0 ? Math.min(100, Math.max(0, Math.floor(100 - (entry.msRemaining / totalMs) * 100))) : 100;
      h += '<div class="map-quest-step-bar"><div class="map-quest-step-fill" id="prod-workshop-bar-' + workshopId + '" style="width:' + pct + '%"></div></div>';
    }

    h += '</div>';
  });

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

function upgradeWorkshop(workshopId) {
  WorkshopsSystem.upgradeWorkshop(workshopId);
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

/* v3.98.5 : bouton "Tout récolter" en tête de page — même visuel que le bouton
   Récolter individuel (.production-harvest-btn, fond image), taille naturelle alignée
   à droite plutôt que pleine largeur (retour Seb : trop imposant en .btn-buy).
   v3.98.8 : bouton "Voir les files" ajouté à côté, ouvre le résumé de toutes les
   fabrications en cours (voir ui/workshop-summary-modal.js) — badge = nombre
   d'ateliers ayant actuellement une file active.
   v3.98.17 : badge secondaire "X auto" (retour Seb — aucune vue d'ensemble du
   chaînage auto n'existait, il fallait ouvrir chaque carte une par une pour savoir
   quels ateliers tournaient en automatique). Compte les ateliers actifs/débloqués
   ayant une recette auto-active (WorkshopsSystem.getAutoRecipeId), indépendamment de
   l'état de leur file (un atelier peut avoir l'auto activé mais une file
   momentanément vide, ex. juste après avoir été bloqué par la réserve). */
function buildHarvestAllButtonHTML() {
  var hasAnyStock = Object.keys(PRODUCTION_BUILDINGS).some(function (id) {
    return ProductionManager.isBuildingUnlocked(id) && Math.floor(ProductionManager.getStock(id)) > 0;
  });

  var activeQueueCount = Object.keys(WORKSHOPS_CONFIG).filter(function (workshopId) {
    var def = WORKSHOPS_CONFIG[workshopId];
    return def.active && ProductionManager.isBuildingUnlocked(def.buildingId) && WorkshopsSystem.getQueue(workshopId).length > 0;
  }).length;

  var activeAutoCount = Object.keys(WORKSHOPS_CONFIG).filter(function (workshopId) {
    var def = WORKSHOPS_CONFIG[workshopId];
    return def.active && ProductionManager.isBuildingUnlocked(def.buildingId) && !!WorkshopsSystem.getAutoRecipeId(workshopId);
  }).length;

  var h = '<div class="production-harvest-all-row">';
  h += '<button class="production-action-btn production-harvest-btn production-queues-btn" id="prod-queues-btn" type="button" onclick="openWorkshopSummaryModal()">';
  h += '📋 Files';
  if (activeQueueCount > 0) h += '<span class="production-queues-badge">' + activeQueueCount + '</span>';
  if (activeAutoCount > 0) h += '<span class="production-queues-badge production-auto-badge">🔁 ' + activeAutoCount + '</span>';
  h += '</button>';
  h += '<button class="production-action-btn production-harvest-btn production-harvest-all-btn' + (hasAnyStock ? ' is-ready' : ' is-disabled') + '" id="prod-harvest-all-btn" type="button" ' + (hasAnyStock ? '' : 'disabled') + ' onclick="ProductionManager.harvestAll()">';
  h += '<img class="btn-buy-icon" src="images/Icons/gold_icon.png" alt="">Tout récolter';
  h += '</button>';
  h += '</div>';
  return h;
}

function buildProductionHTML() {
  ProductionManager.ensure();

  var h = buildHarvestAllButtonHTML();
  h += '<div class="production-grid">';
  Object.keys(PRODUCTION_BUILDINGS).forEach(function (id) {
    if (!ProductionManager.isBuildingUnlocked(id)) return; // v3.92.0 : Carrière verrouillée -> invisible
    h += buildProductionCardHTML(id);
  });
  h += '</div>';
  return h;
}

window.buildProductionHTML = buildProductionHTML;
