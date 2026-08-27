"use strict";
/* ui/production-view.js — sous-onglet Production du Village. Carte horizontale (portrait+infos+actions), logique dans ProductionManager.
   v3.95.0 : coût d'amélioration multi-ressources (voir ProductionManager.getNextCost/getAffordability)
   + panneau dépliable "Parcelles et améliorations" pour les Champs uniquement (voir
   systems/farm-plots-system.js), inspiré du prototype fourni par Seb. Détail : COMMENTAIRES_ORIGINAUX.md */

var farmPlotsPanelExpanded = false; // état d'affichage local à cet écran, pas mêlé aux cartes de quête
var pendingFarmUpgradeAction = null; // action choisie (open/fertile/irrigated), en attente de sélection de parcelle
var selectedFarmPlotIndex = null; // parcelle sélectionnée pour cette action, en attente de VALIDATION explicite

function buildProductionCardHTML(id) {
  var def = PRODUCTION_BUILDINGS[id];
  if (!def) return "";

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

  if (id === "farm" && window.FarmPlotsSystem) {
    h += '<div class="production-card-full-row">';
    h += buildFarmPlotsToggleHTML();
    h += '</div>';
  }

  h += '</div>';

  return h;
}

/* v3.95.0 : coût multi-ressources compact (or + jusqu'à 2 ressources), une icône+montant
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

function toggleFarmPlotsPanel() {
  farmPlotsPanelExpanded = !farmPlotsPanelExpanded;
  if (typeof renderPanel === "function") renderPanel();
}
window.toggleFarmPlotsPanel = toggleFarmPlotsPanel;

/* v3.95.0 : bouton dépliable sous la carte Champs (pattern repris des cartes de quête
   repliables), + le panneau lui-même quand ouvert : grille 3×3 des parcelles, effet
   cumulé actuel, et popup de choix si un palier vient d'être atteint. */
function buildFarmPlotsToggleHTML() {
  // v3.95.2 : le badge affiche le nombre TOTAL de choix dus (getOutstandingChoicesCount()
  // compte déjà celui actuellement affiché s'il y en a un — pas d'addition en double).
  var outstandingCount = FarmPlotsSystem.getOutstandingChoicesCount();

  var h = '<button class="farm-plots-toggle" type="button" onclick="toggleFarmPlotsPanel()">';
  h += '<span>🌾 Parcelles et améliorations</span>';
  if (outstandingCount > 0) h += '<span class="farm-plots-badge">' + outstandingCount + '</span>';
  h += '<span class="farm-plots-chevron">' + (farmPlotsPanelExpanded ? '▴' : '▾') + '</span>';
  h += '</button>';

  if (farmPlotsPanelExpanded) {
    h += buildFarmPlotsPanelHTML();
  }

  return h;
}

function buildFarmPlotsPanelHTML() {
  var plots = FarmPlotsSystem.getPlots();
  var openCount = FarmPlotsSystem.getOpenPlotsCount();
  var bonusPct = Math.round(FarmPlotsSystem.getBonusPct() * 100);
  var hasPending = FarmPlotsSystem.hasPendingChoice();

  var h = '<div class="farm-plots-panel">';

  h += '<div class="farm-plots-top">';
  h += '<h3>Domaine agricole</h3>';
  h += '<small>' + openCount + ' / ' + FARM_PLOTS_CONFIG.totalPlots + ' parcelles actives</small>';
  h += '</div>';

  h += '<div class="farm-plots-grid">';
  plots.forEach(function (plot, index) {
    h += buildFarmPlotCellHTML(plot, index);
  });
  h += '</div>';
  h += '<div class="farm-plots-bottom">';
  h += '<span>Effet actuel : <strong>+' + bonusPct + '% Blé</strong></span>';
  h += '</div>';

  if (hasPending) {
    h += buildFarmUpgradeChoiceHTML();
  }

  h += '</div>';
  return h;
}

function buildFarmPlotCellHTML(plot, index) {
  var icon = "🔒";
  var label = "À développer";
  var classNames = "farm-plot locked-plot";

  if (plot.state === "open") {
    var hasFertile = plot.improvements.indexOf("fertile") !== -1;
    var hasIrrigated = plot.improvements.indexOf("irrigated") !== -1;

    if (hasFertile && hasIrrigated) {
      icon = "🌿💧"; label = "Fertile & irriguée"; classNames = "farm-plot fertile irrigated";
    } else if (hasFertile) {
      icon = "🌿"; label = "Terre fertile"; classNames = "farm-plot fertile";
    } else if (hasIrrigated) {
      icon = "💧"; label = "Sillon irrigué"; classNames = "farm-plot irrigated";
    } else {
      icon = "🌱"; label = "Cultivé"; classNames = "farm-plot normal";
    }
  }

  // v3.95.4 : si une action est en cours de sélection (pendingFarmUpgradeAction), les
  // parcelles éligibles se surlignent et deviennent cliquables — le clic ne fait
  // désormais qu'une SÉLECTION (selectFarmPlot), pas d'application immédiate. La case
  // sélectionnée reçoit sa propre classe .is-selected, distincte de .is-eligible.
  var onclickAttr = "";
  if (pendingFarmUpgradeAction) {
    var eligible = FarmPlotsSystem.getEligiblePlotIndexes(pendingFarmUpgradeAction);
    if (eligible.indexOf(index) !== -1) {
      classNames += " is-eligible";
      if (selectedFarmPlotIndex === index) {
        classNames += " is-selected";
      } else {
        onclickAttr = ' onclick="selectFarmPlot(' + index + ')"';
      }
    }
  }

  return '<div class="' + classNames + '"' + onclickAttr + '><span>' + icon + '</span><small>' + esc(label) + '</small></div>';
}

/* v3.95.0 : popup de choix (bouton d'action, puis sélection directe de la parcelle sur
   la grille — pas de second popup). pendingFarmUpgradeAction mémorise l'action choisie
   en attendant que le joueur tape une case éligible. */
function buildFarmUpgradeChoiceHTML() {
  var available = FarmPlotsSystem.getAvailableChoices();

  var h = '<div class="farm-upgrade-area">';
  h += '<p class="farm-upgrade-title">Évolution disponible — choisissez une amélioration permanente</p>';

  if (pendingFarmUpgradeAction && available.indexOf(pendingFarmUpgradeAction) !== -1) {
    var choiceDef = FARM_UPGRADE_CHOICES[pendingFarmUpgradeAction];

    if (selectedFarmPlotIndex !== null) {
      // v3.95.4 : parcelle sélectionnée mais PAS encore appliquée — le joueur doit
      // explicitement valider, ou peut changer d'avis sans conséquence.
      h += '<p class="farm-upgrade-hint">' + esc(choiceDef.icon) + ' Parcelle ' + (selectedFarmPlotIndex + 1) + ' sélectionnée pour « ' + esc(choiceDef.label) + ' ».</p>';
      h += '<div class="farm-upgrade-confirm-actions">';
      h += '<button type="button" class="farm-upgrade-cancel" onclick="deselectFarmPlot()">Choisir une autre parcelle</button>';
      h += '<button type="button" class="settings-btn primary farm-upgrade-validate-btn" onclick="validateFarmUpgradeChoice()">✔ Valider</button>';
      h += '</div>';
    } else {
      h += '<p class="farm-upgrade-hint">' + esc(choiceDef.icon) + ' Sélectionnez une parcelle éligible (en surbrillance) ci-dessus, ou <button type="button" class="farm-upgrade-cancel" onclick="cancelFarmUpgradeChoice()">annuler</button>.</p>';
    }
  } else {
    available.forEach(function (action) {
      var actionChoiceDef = FARM_UPGRADE_CHOICES[action];
      if (!actionChoiceDef) return;
      h += '<button class="farm-upgrade-button" type="button" onclick="selectFarmUpgradeAction(\'' + action + '\')">';
      h += '<span class="farm-upgrade-icon">' + esc(actionChoiceDef.icon) + '</span>';
      h += '<span><strong>' + esc(actionChoiceDef.label) + '</strong><small>' + esc(actionChoiceDef.desc) + '</small></span>';
      h += '</button>';
    });
  }

  h += '</div>';
  return h;
}

function selectFarmUpgradeAction(action) {
  pendingFarmUpgradeAction = action;
  selectedFarmPlotIndex = null;
  if (typeof renderPanel === "function") renderPanel();
}
window.selectFarmUpgradeAction = selectFarmUpgradeAction;

function cancelFarmUpgradeChoice() {
  pendingFarmUpgradeAction = null;
  selectedFarmPlotIndex = null;
  if (typeof renderPanel === "function") renderPanel();
}
window.cancelFarmUpgradeChoice = cancelFarmUpgradeChoice;

/* v3.95.4 : clic sur une case éligible = SÉLECTION uniquement, rien n'est encore
   appliqué ni sauvegardé — l'application réelle attend validateFarmUpgradeChoice(). */
function selectFarmPlot(plotIndex) {
  if (!pendingFarmUpgradeAction) return;
  selectedFarmPlotIndex = plotIndex;
  if (typeof renderPanel === "function") renderPanel();
}
window.selectFarmPlot = selectFarmPlot;

/* Revient à l'étape "sélectionnez une parcelle" sans perdre l'action choisie — permet de
   changer de parcelle sans tout recommencer depuis le choix d'action. */
function deselectFarmPlot() {
  selectedFarmPlotIndex = null;
  if (typeof renderPanel === "function") renderPanel();
}
window.deselectFarmPlot = deselectFarmPlot;

/* Application réelle et définitive du choix — seule fonction qui appelle
   FarmPlotsSystem.applyChoice() (donc la seule qui sauvegarde et consomme le palier). */
function validateFarmUpgradeChoice() {
  if (!pendingFarmUpgradeAction || selectedFarmPlotIndex === null) return;
  var action = pendingFarmUpgradeAction;
  var plotIndex = selectedFarmPlotIndex;

  // v3.95.5 : réinitialisé AVANT l'appel — applyChoice() déclenche son propre
  // renderPanel() en interne (synchrone), qui reconstruit le HTML en lisant ces 2
  // variables. Les remettre à null après coup laissait ce rendu intermédiaire afficher
  // encore l'ancien popup de validation (déjà appliqué), sans qu'aucun second rendu ne
  // vienne jamais le corriger — l'écran restait figé, bloqué sur "Valider".
  pendingFarmUpgradeAction = null;
  selectedFarmPlotIndex = null;

  var result = FarmPlotsSystem.applyChoice(action, plotIndex);
  if (!result.ok) {
    showToast(result.reason, 1400);
    if (typeof renderPanel === "function") renderPanel(); // retire le surlignage même en cas d'échec
  }
  // En cas de succès, FarmPlotsSystem.applyChoice() a déjà appelé renderPanel()/saveGame(),
  // avec les 2 variables déjà à null -> le HTML régénéré est correct du premier coup.
}
window.validateFarmUpgradeChoice = validateFarmUpgradeChoice;

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
