"use strict";
/* ui/warehouse-view.js — sous-onglet Entrepôt (Village) : grille+panneau détail (v3.32), vente, artisanat tier 1 + file de craft (v3.35/v3.43), entrée vers modale Construction (v3.37.1). Détail : COMMENTAIRES_ORIGINAUX.md */

var selectedWarehouseKey = null;
var selectedWarehouseRecipeId = null;

var warehouseSellQty = 1;

var warehouseFilter = "raw";

var warehouseCraftQty = 1;

function setWarehouseFilter(tier) {
  warehouseFilter = (tier === "crafted") ? "crafted" : "raw";
  selectedWarehouseKey = null;
  selectedWarehouseRecipeId = null;
  if (typeof renderPanel === "function") renderPanel();
}
window.setWarehouseFilter = setWarehouseFilter;

function selectWarehouseKey(key) {
  selectedWarehouseKey = key;
  var recipes = (typeof RECIPES_BY_INPUT !== "undefined") ? (RECIPES_BY_INPUT[key] || []) : [];
  selectedWarehouseRecipeId = recipes.length ? recipes[0].id : null;
  warehouseSellQty = 1;
  warehouseCraftQty = 1;
  if (typeof renderPanel === "function") renderPanel();
}
window.selectWarehouseKey = selectWarehouseKey;

function selectWarehouseRecipe(recipeId) {
  if (!recipeId || (typeof RECIPES === "undefined") || !RECIPES[recipeId]) return;
  selectedWarehouseRecipeId = recipeId;
  warehouseCraftQty = 1;
  if (typeof renderPanel === "function") renderPanel();
}
window.selectWarehouseRecipe = selectWarehouseRecipe;

function getSelectedWarehouseRecipe() {
  if (selectedWarehouseRecipeId && typeof RECIPES !== "undefined" && RECIPES[selectedWarehouseRecipeId]) {
    return RECIPES[selectedWarehouseRecipeId];
  }
  // Fallback rétrocompatible si aucune sélection explicite (1ère recette disponible pour cette ressource).
  return (typeof RECIPE_BY_INPUT !== "undefined") ? (RECIPE_BY_INPUT[selectedWarehouseKey] || null) : null;
}

function adjustWarehouseCraftQty(delta) {
  if (!selectedWarehouseKey) return;
  var recipe = getSelectedWarehouseRecipe();
  if (!recipe) return;

  var maxCrafts = getMaxCraftTimes(recipe);
  if (maxCrafts <= 0) return;

  if (delta === "max") {
    warehouseCraftQty = maxCrafts;
  } else {
    warehouseCraftQty = Math.max(1, Math.min(maxCrafts, warehouseCraftQty + Number(delta || 0)));
  }
  if (typeof renderPanel === "function") renderPanel();
}
window.adjustWarehouseCraftQty = adjustWarehouseCraftQty;

function getMaxCraftTimes(recipe) {
  if (recipe.station) {
    var stationLevel = (game.construction && game.construction[recipe.station] && game.construction[recipe.station].level) || 0;
    if (stationLevel < 1) return 0;
  }
  return recipe.inputs.reduce(function (min, input) {
    var possible = Math.floor(WarehouseManager.getAmount(input.resourceId) / input.quantity);
    return Math.min(min, possible);
  }, Infinity);
}

function confirmCraftWarehouseResource() {
  if (!selectedWarehouseKey) return;
  var recipe = getSelectedWarehouseRecipe();
  if (!recipe) return;
  WarehouseManager.enqueueCraft(recipe, warehouseCraftQty);
  warehouseCraftQty = 1; // repart à 1 après mise en file (le stock restant a changé)
}
window.confirmCraftWarehouseResource = confirmCraftWarehouseResource;

function cancelWarehouseCraft(queueId) {
  if (window.WarehouseManager && typeof WarehouseManager.cancelCraft === "function") {
    WarehouseManager.cancelCraft(queueId);
  }
}
window.cancelWarehouseCraft = cancelWarehouseCraft;

function isWarehouseScreenVisible() {
  return game.activeTab === "village" && activeVillageSubTab === "entrepot";
}
window.isWarehouseScreenVisible = isWarehouseScreenVisible;

function adjustWarehouseSellQty(delta) {
  if (!selectedWarehouseKey) return;
  var stock = Math.floor(WarehouseManager.getAmount(selectedWarehouseKey));
  if (stock <= 0) return;

  if (delta === "max") {
    warehouseSellQty = stock;
  } else {
    warehouseSellQty = Math.max(1, Math.min(stock, warehouseSellQty + Number(delta || 0)));
  }
  if (typeof renderPanel === "function") renderPanel();
}
window.adjustWarehouseSellQty = adjustWarehouseSellQty;

function confirmSellWarehouseResource() {
  if (!selectedWarehouseKey) return;
  WarehouseManager.sellResource(selectedWarehouseKey, warehouseSellQty);
  warehouseSellQty = 1; // repart à 1 après vente (le stock restant a changé)
}
window.confirmSellWarehouseResource = confirmSellWarehouseResource;

function buildWarehouseTileHTML(key) {
  var def = WAREHOUSE_RESOURCES[key];
  var stock = Number((game.resources || {})[key] || 0);
  var isSelected = selectedWarehouseKey === key;

  var h = '<button class="eq-bag-tile warehouse-tile' + (isSelected ? ' is-selected' : '') + '" type="button" onclick="selectWarehouseKey(\'' + esc(key) + '\')" aria-label="' + esc(def.name) + '">';
  h += renderIconOrEmojiHTML(def.icon, "eq-bag-tile-icon", def.name);
  h += '<span class="eq-bag-tile-stock">' + formatNumber(stock) + '</span>';
  h += '</button>';
  return h;
}

function buildWarehouseCraftBlockHTML(inputKey) {
  var recipes = (typeof RECIPES_BY_INPUT !== "undefined") ? (RECIPES_BY_INPUT[inputKey] || []) : [];
  if (!recipes.length) return "";

  var recipe = getSelectedWarehouseRecipe() || recipes[0];

  var outputDef = WAREHOUSE_RESOURCES[recipe.outputs[0].resourceId];
  var maxCrafts = getMaxCraftTimes(recipe);

  var inputsText = recipe.inputs.map(function (input) {
    var d = WAREHOUSE_RESOURCES[input.resourceId];
    return formatNumber(input.quantity) + ' ' + esc(d ? d.name : input.resourceId);
  }).join(' + ');

  warehouseCraftQty = Math.max(1, Math.min(maxCrafts || 1, warehouseCraftQty));

  var h = '<div class="warehouse-craft-block">';

  if (recipes.length > 1) {
    h += '<div class="warehouse-craft-recipe-tabs">';
    recipes.forEach(function (r) {
      var out = WAREHOUSE_RESOURCES[r.outputs[0].resourceId];
      var isActive = r.id === recipe.id;
      h += '<button type="button" class="warehouse-craft-recipe-tab' + (isActive ? ' is-active' : '') + '" onclick="selectWarehouseRecipe(\'' + esc(r.id) + '\')">' + esc(out ? out.name : r.label) + '</button>';
    });
    h += '</div>';
  }

  h += '<div class="warehouse-craft-title">' + renderIconOrEmojiHTML(outputDef.icon, "warehouse-craft-title-icon", outputDef.name) + esc(outputDef.name) + '</div>';
  h += '<div class="warehouse-craft-recipe">' + inputsText + ' → ' + formatNumber(recipe.outputs[0].quantity) + ' ' + esc(outputDef.name) + '</div>';

  if (recipe.station && maxCrafts <= 0) {
    var stationLevel = (game.construction && game.construction[recipe.station] && game.construction[recipe.station].level) || 0;
    if (stationLevel < 1) {
      var stationDef = (typeof CONSTRUCTION_BUILDINGS !== "undefined") ? CONSTRUCTION_BUILDINGS[recipe.station] : null;
      h += '<div class="warehouse-empty-hint">Nécessite ' + esc(stationDef ? stationDef.name : recipe.station) + ' (niveau 1).</div>';
      h += '</div>';
      return h;
    }
  }

  if (maxCrafts <= 0) {
    var missing = recipe.inputs.find(function (input) {
      return WarehouseManager.getAmount(input.resourceId) < input.quantity;
    });
    var missingDef = missing ? WAREHOUSE_RESOURCES[missing.resourceId] : null;
    h += '<div class="warehouse-empty-hint">Pas assez de ' + esc(missingDef ? missingDef.name : "") + ' pour fabriquer.</div>';
  } else {
    h += '<div class="warehouse-qty-stepper">';
    h += '<button class="warehouse-qty-btn" type="button" onclick="adjustWarehouseCraftQty(-1)"' + (warehouseCraftQty <= 1 ? ' disabled' : '') + '>−</button>';
    h += '<span class="warehouse-qty-value">' + formatNumber(warehouseCraftQty) + '</span>';
    h += '<button class="warehouse-qty-btn" type="button" onclick="adjustWarehouseCraftQty(1)"' + (warehouseCraftQty >= maxCrafts ? ' disabled' : '') + '>+</button>';
    h += '<button class="warehouse-qty-max-btn" type="button" onclick="adjustWarehouseCraftQty(\'max\')"' + (warehouseCraftQty >= maxCrafts ? ' disabled' : '') + '>Max</button>';
    h += '</div>';

    h += '<button class="btn-buy eq-detail-action" type="button" onclick="confirmCraftWarehouseResource()">Fabriquer ×' + formatNumber(warehouseCraftQty) + '</button>';
  }

  h += '</div>';
  return h;
}

function buildWarehouseCraftQueueHTML() {
  var queue = Array.isArray(game.craftQueue) ? game.craftQueue : [];
  if (!queue.length) return "";

  var h = '<div class="warehouse-craft-queue">';
  h += '<div class="warehouse-craft-queue-title">File de fabrication</div>';

  queue.forEach(function (entry, index) {
    var recipe = (typeof RECIPES !== "undefined") ? RECIPES[entry.recipeId] : null;
    var outputDef = recipe ? WAREHOUSE_RESOURCES[recipe.outputs[0].resourceId] : null;
    var label = outputDef ? outputDef.name : (recipe ? recipe.label : "?");
    var isCurrent = index === 0;

    h += '<div class="warehouse-craft-queue-row' + (isCurrent ? ' is-current' : '') + '">';
    h += '<div class="warehouse-craft-queue-row-top">';
    h += '<span class="warehouse-craft-queue-label">' + esc(label) + ' ×' + formatNumber(entry.times) + '</span>';

    if (isCurrent) {
      var totalMs = Number(recipe ? recipe.craftTimeMs : 0) * entry.times;
      var remainingSec = Math.max(0, entry.msRemaining / 1000);
      h += '<span class="warehouse-craft-queue-time">' + remainingSec.toFixed(1) + ' s</span>';
    } else {
      h += '<button class="warehouse-craft-queue-cancel" type="button" onclick="cancelWarehouseCraft(\'' + esc(entry.id) + '\')" aria-label="Annuler">✕</button>';
    }
    h += '</div>';

    if (isCurrent) {
      var pct = totalMs > 0 ? Math.min(100, Math.max(0, Math.floor(100 - (entry.msRemaining / totalMs) * 100))) : 100;
      h += '<div class="map-quest-step-bar"><div class="map-quest-step-fill" style="width:' + pct + '%"></div></div>';
    }

    h += '</div>';
  });

  h += '</div>';
  return h;
}

function buildWarehouseDetailPanelHTML() {
  var h = '<div class="eq-detail-panel">';

  var def = selectedWarehouseKey ? WAREHOUSE_RESOURCES[selectedWarehouseKey] : null;
  var stock = def ? Math.floor(WarehouseManager.getAmount(selectedWarehouseKey)) : 0;

  if (!def) {
    h += '<div class="eq-detail-icon eq-detail-icon-empty">📦</div>';
    h += '<div class="eq-detail-name">Aucune ressource sélectionnée</div>';
    h += '<div class="eq-detail-hint">Touche une ressource dans l\'Entrepôt pour voir son détail ici.</div>';
    h += buildWarehouseCraftQueueHTML();
    h += '</div>';
    return h;
  }

  warehouseSellQty = Math.max(1, Math.min(stock || 1, warehouseSellQty));

  h += '<div class="eq-detail-icon">' + renderIconOrEmojiHTML(def.icon, "eq-detail-icon-img", def.name) + '</div>';
  h += '<div class="eq-detail-name">' + esc(def.name) + '</div>';
  h += '<div class="eq-detail-hint">' + esc(def.desc || "") + '</div>';
  h += '<div class="eq-detail-hint">🎒 Stock : ' + formatNumber(stock) + '</div>';

  h += buildWarehouseCraftBlockHTML(selectedWarehouseKey);

  h += buildWarehouseCraftQueueHTML();

  var canSell = Number(def.sellPrice || 0) > 0;

  if (!canSell) {
    if (!(RECIPES_BY_INPUT[selectedWarehouseKey] || []).length) {
      h += '<div class="warehouse-empty-hint">Rien à faire pour l\'instant.</div>';
    }
  } else if (stock <= 0) {
    h += '<div class="warehouse-empty-hint">Rien à vendre pour l\'instant.</div>';
  } else {
    h += '<div class="warehouse-qty-stepper">';
    h += '<button class="warehouse-qty-btn" type="button" onclick="adjustWarehouseSellQty(-1)"' + (warehouseSellQty <= 1 ? ' disabled' : '') + '>−</button>';
    h += '<span class="warehouse-qty-value">' + formatNumber(warehouseSellQty) + '</span>';
    h += '<button class="warehouse-qty-btn" type="button" onclick="adjustWarehouseSellQty(1)"' + (warehouseSellQty >= stock ? ' disabled' : '') + '>+</button>';
    h += '<button class="warehouse-qty-max-btn" type="button" onclick="adjustWarehouseSellQty(\'max\')"' + (warehouseSellQty >= stock ? ' disabled' : '') + '>Max</button>';
    h += '</div>';

    var totalGold = warehouseSellQty * Number(def.sellPrice || 0);
    h += '<button class="btn-buy eq-detail-action" type="button" onclick="confirmSellWarehouseResource()">';
    h += 'Vendre · <img class="btn-buy-icon" src="images/Icons/gold_icon.png" alt="">' + formatNumber(totalGold);
    h += '</button>';
  }

  h += '</div>';
  return h;
}

function buildWarehouseFilterRowHTML() {
  var h = '<div class="inv-filter-row">';
  h += '<button type="button" class="inv-filter-btn' + (warehouseFilter === "raw" ? ' is-active' : '') + '" onclick="setWarehouseFilter(\'raw\')">Bruts</button>';
  h += '<button type="button" class="inv-filter-btn' + (warehouseFilter === "crafted" ? ' is-active' : '') + '" onclick="setWarehouseFilter(\'crafted\')">🔨 Tier 1</button>';
  h += '</div>';
  return h;
}

function buildWarehouseHTML() {
  if (typeof HuntQuestManager !== "undefined") HuntQuestManager.ensureDefaults();
  if (typeof WarehouseManager !== "undefined") WarehouseManager.ensure();

  var allKeys = Object.keys(WAREHOUSE_RESOURCES);
  if (!allKeys.length) {
    return '<div class="eq-empty">Entrepôt vide pour l\'instant.</div>';
  }

  var keys = allKeys.filter(function (key) {
    return (WAREHOUSE_RESOURCES[key].tier || "raw") === warehouseFilter;
  });

  if (!selectedWarehouseKey || !WAREHOUSE_RESOURCES[selectedWarehouseKey] || keys.indexOf(selectedWarehouseKey) === -1) {
    selectedWarehouseKey = keys.length ? keys[0] : null;
  }

  var h = buildWarehouseFilterRowHTML();
  h += '<div class="eq-bag-flex">';
  h += '<div class="eq-bag-inv-grid warehouse-grid">';
  if (!keys.length) {
    h += '<div class="eq-empty">Rien ici pour l\'instant.</div>';
  } else {
    keys.forEach(function (key) {
      h += buildWarehouseTileHTML(key);
    });
  }
  h += '</div>';
  h += buildWarehouseDetailPanelHTML();
  h += '</div>';

  if (typeof ConstructionManager !== "undefined") {
    ConstructionManager.ensure();
    if (typeof WorkshopUnlockManager !== "undefined") WorkshopUnlockManager.ensure();
    h += buildConstructionEntryCardHTML();
  }

  return h;
}

function buildConstructionEntryCardHTML() {
  var id = "workshop";
  var def = CONSTRUCTION_BUILDINGS[id];
  if (!def) return "";

  if (window.WorkshopUnlockManager && typeof WorkshopUnlockManager.isWorkshopVisible === "function") {
    if (!WorkshopUnlockManager.isWorkshopVisible()) return ""; // pas encore débloqué : totalement invisible
  }

  var questPending = window.WorkshopUnlockManager && typeof WorkshopUnlockManager.isWorkshopQuestPending === "function" && WorkshopUnlockManager.isWorkshopQuestPending();

  var level = ConstructionManager.getLevel(id);
  var maxed = ConstructionManager.isMaxLevel(id);

  var h = '<div class="construction-entry-card' + (questPending ? ' is-quest-pending' : '') + '" onclick="openConstructionModal(\'' + id + '\')">';
  h += '<div class="construction-entry-icon">' + renderIconOrEmojiHTML(def.icon || "🏗️", "construction-entry-icon-img", def.name) + '</div>';
  h += '<div class="construction-entry-info">';
  h += '<div class="construction-entry-name">' + esc(def.name) + (questPending ? ' <span class="construction-quest-badge">🎯 Quête</span>' : '') + '</div>';
  h += '<div class="construction-entry-level">' + (maxed ? 'Niveau maximum' : 'Niveau ' + level + ' / ' + def.maxLevel) + '</div>';
  h += '</div>';
  h += '<div class="construction-entry-arrow">›</div>';
  h += '</div>';
  return h;
}

window.buildWarehouseHTML = buildWarehouseHTML;
