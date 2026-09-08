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

var productionViewTab = "prod";        // "prod" | "shops" — vue active du tableau de bord
var productionDetailBuildingId = null; // buildingId ouvert en détail (zones), null = tableau de bord
var selectedProductionPlotIndex = {};  // { [buildingId]: number|null } — zone sélectionnée, par bâtiment

function setProductionViewTab(tab) {
  productionViewTab = (tab === "shops") ? "shops" : "prod";
  productionDetailBuildingId = null; // changer de vue ferme toujours un éventuel détail
  if (typeof renderPanel === "function") renderPanel();
}
window.setProductionViewTab = setProductionViewTab;

function openProductionBuildingDetail(buildingId) {
  if (!PRODUCTION_BUILDINGS[buildingId]) return;
  productionDetailBuildingId = buildingId;
  if (typeof renderPanel === "function") renderPanel();
}
window.openProductionBuildingDetail = openProductionBuildingDetail;

function closeProductionBuildingDetail() {
  productionDetailBuildingId = null;
  if (typeof renderPanel === "function") renderPanel();
}
window.closeProductionBuildingDetail = closeProductionBuildingDetail;

/* v3.191.0 : carte compacte du tableau de bord (2 colonnes) — remplace les anciennes
   cartes horizontales à panneaux dépliables. Ids prod-bar-/prod-stock-label-/prod-status-
   CONSERVÉS : ProductionManager.updateDOM() continue de les rafraîchir en direct sans
   rien savoir de la refonte. Les drapeaux PLEIN/AMÉLIORABLE sont recalculés au render
   seulement (léger décalage assumé, la jauge et le libellé restent temps réel).
   Toute la carte est tapable -> détail du bâtiment (zones). */
function buildProductionDashCardHTML(id) {
  var def = PRODUCTION_BUILDINGS[id];
  if (!def) return "";
  var stock = ProductionManager.getStock(id);
  var capacity = ProductionManager.getCapacity(id);
  var ratePerMin = ProductionManager.getRatePerMin(id);
  var isFull = capacity > 0 && stock >= capacity;
  var pct = capacity > 0 ? Math.min(100, (stock / capacity) * 100) : 0;
  var resDef = WAREHOUSE_RESOURCES[def.resourceKey] || {};
  var openCount = window.ProductionPlotsSystem ? ProductionPlotsSystem.getOpenPlotsCount(id) : 0;
  var upgradable = hasAffordableZoneAction(id);

  var h = '<div class="production-dash-card' + (isFull ? ' is-full' : '') + '" onclick="openProductionBuildingDetail(\'' + id + '\')">';
  if (isFull) h += '<span class="production-dash-flag is-full-flag">PLEIN</span>';
  else if (upgradable) h += '<span class="production-dash-flag is-up-flag">⬆ AMÉLIORABLE</span>';

  h += '<div class="production-dash-card-top">';
  h += renderIconOrEmojiHTML(resDef.icon, "production-dash-ico", resDef.name);
  h += '<span class="production-dash-name">' + esc(def.name) + '</span>';
  h += '</div>';

  h += '<div class="production-dash-gauge kgauge kgauge-thin kgauge-xp">';
  h += '<div class="kgauge-track"><div class="kgauge-fill nb-entry-progress-fill' + (isFull ? ' done' : '') + '" id="prod-bar-' + id + '" style="width:' + pct + '%"></div></div>';
  h += '</div>';
  h += '<div class="production-dash-stock" id="prod-stock-label-' + id + '">' + formatNumber(Math.floor(stock)) + ' / ' + formatNumber(capacity) + ' ' + esc(resDef.name || '') + '</div>';

  h += '<div class="production-dash-meta">';
  h += '<span class="production-dash-rate">+' + formatNumber(ratePerMin) + '/min</span>';
  h += '<span class="production-dash-zones">' + openCount + '/' + PRODUCTION_PLOTS_SHARED.totalPlots + ' zones</span>';
  h += '</div>';
  h += '<div class="production-dash-status" id="prod-status-' + id + '">' + (isFull ? '✅ Stock plein' : (ratePerMin > 0 ? '⏳ Plein dans ' + esc(formatTime(((capacity - stock) / ratePerMin) * 60)) : '')) + '</div>';

  h += '</div>';
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
    if (plot.state === "locked") cost = getProductionPlotUnlockCost(buildingId, i);
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
    h += '⬆ Améliorer la − chère ' + buildProductionCostRowHTML(cost, afford);
    h += '</button>';
  }

  var firstLocked = null;
  var allPlots = ProductionPlotsSystem.getPlots(buildingId);
  for (var i = 0; i < allPlots.length; i++) {
    if (allPlots[i].state === "locked") { firstLocked = i; break; }
  }
  if (firstLocked !== null) {
    var unlockCost = getProductionPlotUnlockCost(buildingId, firstLocked);
    var uAfford = {};
    Object.keys(unlockCost).forEach(function (key) {
      uAfford[key] = WarehouseManager.getAmount(key) >= unlockCost[key];
    });
    h += '<button class="settings-btn production-group-btn" type="button" onclick="productionSelectFirstLocked(\'' + buildingId + '\')">';
    h += '🔓 Défricher une zone ' + buildProductionCostRowHTML(unlockCost, uAfford);
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
  else showToast("⬆ « " + getProductionZoneName(buildingId, index) + " » améliorée", 1200);
}
window.productionUpgradeCheapest = productionUpgradeCheapest;

function productionSelectFirstLocked(buildingId) {
  var plots = ProductionPlotsSystem.getPlots(buildingId);
  for (var i = 0; i < plots.length; i++) {
    if (plots[i].state === "locked") {
      selectedProductionPlotIndex[buildingId] = i;
      if (typeof renderPanel === "function") renderPanel();
      return;
    }
  }
}
window.productionSelectFirstLocked = productionSelectFirstLocked;

function buildBuildingDetailHTML(buildingId) {
  var def = PRODUCTION_BUILDINGS[buildingId];
  if (!def) return "";
  var resDef = WAREHOUSE_RESOURCES[def.resourceKey] || {};
  var stock = ProductionManager.getStock(buildingId);
  var capacity = ProductionManager.getCapacity(buildingId);
  var hasStock = Math.floor(stock) > 0;
  var pct = capacity > 0 ? Math.min(100, (stock / capacity) * 100) : 0;
  var openCount = ProductionPlotsSystem.getOpenPlotsCount(buildingId);
  var buildingCfg = PRODUCTION_PLOTS_BUILDINGS[buildingId];

  var h = '<div class="production-detail">';

  // v3.193.0 : le NOM du bâtiment vit désormais dans le bandeau figé du cadre
  // (kf-title, voir village-view/kframe-decorator) — l'en-tête de contenu se
  // réduit à UNE ligne : retour + jauge + récolte locale. Mêmes ids que la
  // carte du tableau de bord : un seul des deux existe à la fois dans le DOM,
  // ProductionManager.updateDOM() rafraîchit celui qui est présent.
  h += '<div class="production-detail-stockline">';
  h += '<button class="production-detail-back" type="button" onclick="closeProductionBuildingDetail()" aria-label="Retour"></button>';
  h += '<div class="kgauge kgauge-thin kgauge-xp production-detail-gauge">';
  h += '<div class="kgauge-track"><div class="kgauge-fill nb-entry-progress-fill" id="prod-bar-' + buildingId + '" style="width:' + pct + '%"></div></div>';
  h += '</div>';
  h += '<button class="production-action-btn production-harvest-btn production-detail-harvest' + (hasStock ? ' is-ready' : ' is-disabled') + '" id="prod-harvest-btn-' + buildingId + '" type="button" ' + (hasStock ? '' : 'disabled') + ' onclick="ProductionManager.harvest(\'' + buildingId + '\')">';
  h += '<img class="btn-buy-icon" src="images/Icons/gold_icon.png" alt="">Récolter' + (hasStock ? ' · ' + formatNumber(Math.floor(stock)) : '');
  h += '</button>';
  h += '</div>';
  h += '<div class="production-detail-stock-label" id="prod-stock-label-' + buildingId + '">' + formatNumber(Math.floor(stock)) + ' / ' + formatNumber(capacity) + ' ' + esc(resDef.name || '') + '</div>';

  h += '<div class="production-detail-sec-title">' + esc(buildingCfg ? buildingCfg.sectionLabel : "Zones") + ' <span class="production-detail-sec-count">' + openCount + ' / ' + PRODUCTION_PLOTS_SHARED.totalPlots + '</span></div>';
  h += buildPlotsPanelHTML(buildingId);
  // v3.191.1 (retour Seb — redondance) : les actions groupées ne s'affichent que
  // quand AUCUNE zone n'est sélectionnée. Zone sélectionnée -> son panneau d'actions
  // (Améliorer/Défricher/améliorations) est le seul espace d'action ; retap pour
  // désélectionner et retrouver les actions groupées. Évite le doublon
  // "Améliorer" (panneau) / "Améliorer la − chère" (groupé) quand la sélection EST
  // la moins chère.
  if (typeof selectedProductionPlotIndex[buildingId] !== "number") {
    h += buildZoneGroupActionsHTML(buildingId);
  }

  h += '<div class="production-detail-shops-hint">⚙️ Les ateliers de ce bâtiment se pilotent depuis la vue Ateliers</div>';

  h += '</div>';
  return h;
}

/* ============================================================
   Section "⚙️ Production" — ateliers de craft locaux au bâtiment
   (voir WorkshopsSystem, data/workshops.js). Toggle dépliable au même
   niveau que "🌾 Parcelles" etc., état indépendant par bâtiment.
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
   (1) ♻️ actif sur la recette affichée -> la ligne de craft manuel
       disparaît (couper le toggle pour forcer un lot à la main) ;
   (2) quantité par lot auto = mini-stepper inline à côté du toggle
       (mêmes handlers v3.98.15/16, saisie directe conservée) ;
   (3) file = cases visuelles + entrée courante (temps + barre fine),
       ✕ sur les lots suivants — remplace la liste verticale. Ids
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
  h += '<span class="wk-emoji">' + workshop.icon + '</span>';
  h += '<span class="wk-name">' + esc(workshop.name) + '</span>';
  if (tagDef) h += '<span class="workshop-building-tag">' + renderIconOrEmojiHTML(tagRes.icon, "workshop-building-tag-ico", tagDef.name) + esc(tagDef.name) + '</span>';
  h += '<span class="kbadge kbadge-shield wk-shield"><span>' + level + '</span></span>';
  h += buildWorkshopUpgradeCompactHTML(workshop.id);
  h += '</div>';

  // --- pilules de recettes (ateliers multi-recettes) — la pilule active porte ♻️
  //     si le chaînage est sur elle ---
  if (recipes.length > 1) {
    h += '<div class="wk-pills">';
    recipes.forEach(function (r) {
      var out = WAREHOUSE_RESOURCES[r.outputs[0].resourceId];
      var cls = "wk-pill" + (r.id === recipe.id ? " is-active" : "") + (activeAutoId === r.id ? " is-auto" : "");
      h += '<button type="button" class="' + cls + '" onclick="selectWorkshopRecipe(\'' + workshop.id + '\', \'' + esc(r.id) + '\')">' + esc(out ? out.name : r.id) + '</button>';
    });
    h += '</div>';
  }

  // --- recette en icônes + temps effectif ---
  h += '<div class="wk-recipe">';
  recipe.inputs.forEach(function (input, i) {
    var d = WAREHOUSE_RESOURCES[input.resourceId] || {};
    if (i) h += ' + ';
    h += formatNumber(input.quantity) + ' ' + renderIconOrEmojiHTML(d.icon, "wk-recipe-ico", d.name);
  });
  h += ' → ' + formatNumber(recipe.outputs[0].quantity) + ' ' + renderIconOrEmojiHTML(outputDef.icon, "wk-recipe-ico", outputDef.name);
  h += '<span class="wk-time">· ' + formatCraftDuration(effectiveCraftTimeMs) + '/lot</span>';
  h += '</div>';

  // --- file : cases + entrée courante ---
  h += buildWorkshopQueueHTML(workshop.id);

  // --- pied : toggle ♻️ + (quantité auto inline) OU (stepper manuel + Fabriquer) ---
  h += '<div class="wk-foot">';
  h += '<span class="wk-cont' + (isAutoHere ? " is-on" : "") + '" onclick="setWorkshopAutoRecipe(\'' + workshop.id + '\', \'' + esc(recipe.id) + '\')">';
  h += '<span class="wk-cont-sw"></span>♻️ Continue</span>';

  if (isAutoHere) {
    var maxAutoNow = WorkshopsSystem.getMaxAutoCraftTimes(workshop.id, recipe.id);
    var autoQty = Math.max(1, Math.min(maxAutoNow || 1, workshopAutoQty[workshop.id] || 1));
    workshopAutoQty[workshop.id] = autoQty;
    h += '<span class="wk-auto-qty">lot ×';
    h += '<span class="warehouse-qty-stepper workshop-qty-stepper-compact">';
    h += '<button class="warehouse-qty-btn" type="button" onclick="adjustWorkshopAutoQty(\'' + workshop.id + '\', -1)"' + (autoQty <= 1 ? ' disabled' : '') + '>−</button>';
    h += '<input class="warehouse-qty-value" type="number" min="1" max="' + (maxAutoNow || 1) + '" step="1" value="' + autoQty + '" onchange="setWorkshopAutoQty(\'' + workshop.id + '\', this.value)">';
    h += '<button class="warehouse-qty-btn" type="button" onclick="adjustWorkshopAutoQty(\'' + workshop.id + '\', 1)"' + (autoQty >= maxAutoNow ? ' disabled' : '') + '>+</button>';
    h += '<button class="warehouse-qty-max-btn" type="button" onclick="adjustWorkshopAutoQty(\'' + workshop.id + '\', \'max\')"' + (autoQty >= maxAutoNow ? ' disabled' : '') + '>Max</button>';
    h += '</span></span>';
  } else if (maxCrafts > 0) {
    var qty = Math.max(1, Math.min(maxCrafts, workshopCraftQty[workshop.id] || 1));
    workshopCraftQty[workshop.id] = qty;
    h += '<span class="wk-manual">';
    h += '<span class="warehouse-qty-stepper workshop-qty-stepper-compact">';
    h += '<button class="warehouse-qty-btn" type="button" onclick="adjustWorkshopCraftQty(\'' + workshop.id + '\', -1)"' + (qty <= 1 ? ' disabled' : '') + '>−</button>';
    h += '<input class="warehouse-qty-value" type="number" min="1" max="' + maxCrafts + '" step="1" value="' + qty + '" onchange="setWorkshopCraftQty(\'' + workshop.id + '\', this.value)">';
    h += '<button class="warehouse-qty-btn" type="button" onclick="adjustWorkshopCraftQty(\'' + workshop.id + '\', 1)"' + (qty >= maxCrafts ? ' disabled' : '') + '>+</button>';
    h += '<button class="warehouse-qty-max-btn" type="button" onclick="adjustWorkshopCraftQty(\'' + workshop.id + '\', \'max\')"' + (qty >= maxCrafts ? ' disabled' : '') + '>Max</button>';
    h += '</span>';
    h += '<button class="wk-craft-btn" type="button" onclick="confirmCraftWorkshop(\'' + workshop.id + '\')">Fabriquer ×' + formatNumber(qty) + '</button>';
    h += '</span>';
  }
  h += '</div>';

  // --- alertes (une seule à la fois, la plus utile) ---
  if (otherAuto) {
    var otherRecipe = WorkshopsSystem.getRecipe(workshop.id, activeAutoId);
    var otherDef = otherRecipe ? WAREHOUSE_RESOURCES[otherRecipe.outputs[0].resourceId] : null;
    h += '<div class="wk-alert is-hint">♻️ déjà active sur ' + esc(otherDef ? otherDef.name : activeAutoId) + ' — l\'activer ici la remplacera.</div>';
  } else if (isAutoHere && !queue.length && WorkshopsSystem.getMaxAutoCraftTimes(workshop.id, recipe.id) <= 0) {
    if (maxCrafts > 0) {
      // stock brut suffisant mais pas la version "moins réserve" -> c'est la réserve (v3.98.17)
      h += '<div class="wk-alert is-reserve">⏸ En attente : la réserve protégée empêche un nouveau lot — ajustable dans l\'Entrepôt.</div>';
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
  return '<div class="wk-alert is-warn">⚠ ' + esc(d.name || missing.resourceId) + ' insuffisant (' + formatNumber(WarehouseManager.getAmount(missing.resourceId)) + '/' + formatNumber(missing.quantity) + ')</div>';
}

/* Décision (4) : coût seul sur le bouton d'amélioration, en tête de carte —
   l'effet du niveau est confirmé au toast (voir upgradeWorkshop). */
function buildWorkshopUpgradeCompactHTML(workshopId) {
  if (WorkshopsSystem.isMaxLevel(workshopId)) {
    return '<span class="wk-up is-max">MAX</span>';
  }
  var cost = WorkshopsSystem.getUpgradeCost(workshopId);
  var afford = WorkshopsSystem.getUpgradeAffordability(workshopId);
  var h = '<button class="wk-up' + (afford.all ? '' : ' is-disabled') + '" type="button" ' + (afford.all ? '' : 'disabled') + ' onclick="upgradeWorkshop(\'' + workshopId + '\')">';
  h += '⬆ ' + buildProductionCostRowHTML(cost, afford);
  h += '</button>';
  return h;
}

/* v3.192.0 : file en CASES (taille = niveau d'atelier) + entrée courante (nom ×N,
   temps restant, barre fine) + ✕ d'annulation sur les lots suivants. Conteneur
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
      h += renderIconOrEmojiHTML(d.icon, "wk-slot-ico", d.name);
      if (q > 0) h += '<span class="wk-slot-x" onclick="cancelWorkshopCraft(\'' + workshopId + '\', \'' + esc(entry.id) + '\')" role="button" aria-label="Annuler">✕</span>';
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
    h += '<span class="wk-current-label"><span>' + esc(curDef ? curDef.name : "?") + ' ×' + formatNumber(cur.times) + '</span>';
    h += '<span id="prod-workshop-time-' + workshopId + '">' + formatCraftDuration(cur.msRemaining) + '</span></span>';
    h += '<span class="wk-current-bar"><span class="wk-current-bar-fill" id="prod-workshop-bar-' + workshopId + '" style="width:' + pct + '%"></span></span>';
    h += '</span>';
  } else {
    h += '<span class="wk-queue-empty">file vide · ' + maxLen + ' emplacement' + (maxLen > 1 ? 's' : '') + '</span>';
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
  showToast("⬆ " + (def ? def.name : "") + " niv " + lvl + (eff ? " : " + eff + "/lot" : "") + " · file " + WorkshopsSystem.getMaxQueueLength(workshopId), 1600);
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

/* Double bouton Production | Ateliers — sous-onglets du kit (mêmes classes que la
   barre du bas du Village), en TÊTE du contenu. Décision Seb : un interrupteur à 2
   positions dans l'écran, pas de 4e sous-onglet Village. */
function buildProductionSwitchHTML() {
  var h = '<div class="pc-subtab-bar production-switch">';
  h += '<button type="button" class="pc-subtab-btn' + (productionViewTab === "prod" ? ' is-active' : '') + '" onclick="setProductionViewTab(\'prod\')">🏠<span>Production</span></button>';
  h += '<button type="button" class="pc-subtab-btn' + (productionViewTab === "shops" ? ' is-active' : '') + '" onclick="setProductionViewTab(\'shops\')">⚒️<span>Ateliers</span></button>';
  h += '</div>';
  return h;
}

/* Barre d'action de la vue Production : "Tout récolter" en bouton primaire du kit
   (id prod-harvest-all-btn conservé — ProductionManager.updateDOM() le tient à jour)
   + indice du nombre de bâtiments améliorables. Le bouton "Files" a migré en tête de
   la vue Ateliers (buildShopsViewHTML), sa place naturelle. */
function buildProdActionBarHTML() {
  var totalStock = 0;
  var upCount = 0;
  Object.keys(PRODUCTION_BUILDINGS).forEach(function (id) {
    if (!ProductionManager.isBuildingUnlocked(id)) return;
    totalStock += Math.floor(ProductionManager.getStock(id));
    if (hasAffordableZoneAction(id)) upCount++;
  });
  var hasAnyStock = totalStock > 0;

  var h = '<button class="settings-btn primary production-harvest-all-kbtn' + (hasAnyStock ? '' : ' is-locked') + '" id="prod-harvest-all-btn" type="button" ' + (hasAnyStock ? '' : 'disabled') + ' onclick="ProductionManager.harvestAll()">';
  h += '🧺 Tout récolter';
  h += '</button>';
  if (upCount > 0) h += '<p class="production-dash-hint">' + upCount + ' bâtiment' + (upCount > 1 ? 's ont' : ' a') + ' une amélioration abordable · touche un bâtiment pour gérer ses zones</p>';
  else h += '<p class="production-dash-hint">Touche un bâtiment pour gérer ses zones</p>';
  return h;
}

function buildProdDashboardHTML() {
  var h = buildProdActionBarHTML();
  h += '<div class="production-dash-grid">';
  Object.keys(PRODUCTION_BUILDINGS).forEach(function (id) {
    if (!ProductionManager.isBuildingUnlocked(id)) return; // v3.92.0 : Carrière verrouillée -> invisible
    h += buildProductionDashCardHTML(id);
  });
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
  var stalled = countStalledWorkshops();
  var h = '';
  if (stalled > 0) {
    h += '<div class="production-status-banner is-warn">⚠ ' + stalled + (stalled > 1 ? ' ateliers' : ' atelier') + ' à l\'arrêt — intrants ou réserve</div>';
  } else {
    h += '<div class="production-status-banner is-ok">✅ Tous les ateliers suivis tournent</div>';
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
  h += '📋 Files';
  if (activeQueueCount > 0) h += '<span class="production-queues-badge">' + activeQueueCount + '</span>';
  if (activeAutoCount > 0) h += '<span class="production-queues-badge production-auto-badge">🔁 ' + activeAutoCount + '</span>';
  h += '</button>';
  h += '</div>';

  h += '<div class="workshop-list">';
  var lockedNames = [];
  Object.keys(WORKSHOPS_CONFIG).forEach(function (workshopId) {
    var def = WORKSHOPS_CONFIG[workshopId];
    if (!ProductionManager.isBuildingUnlocked(def.buildingId)) return;
    if (!def.active) { lockedNames.push(def.name); return; }
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
    h += '<div class="production-shops-locked">🔒 ' + lockedNames.length + ' ateliers à venir : ' + esc(lockedNames.join(" · ")) + '</div>';
  }
  return h;
}

function buildProductionHTML() {
  ProductionManager.ensure();

  if (productionDetailBuildingId && PRODUCTION_BUILDINGS[productionDetailBuildingId]) {
    return buildBuildingDetailHTML(productionDetailBuildingId);
  }

  var h = buildProductionSwitchHTML();
  h += (productionViewTab === "shops") ? buildShopsViewHTML() : buildProdDashboardHTML();
  return h;
}

window.buildProductionHTML = buildProductionHTML;
