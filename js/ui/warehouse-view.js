"use strict";
/* ============================================================
Aethervale — ui/warehouse-view.js
v3.30 : sous-onglet "Entrepôt" de l'écran Village (voir
buildVillageSubTabBarHTML en village-view.js). Affiche les ressources
de game.resources (voir WAREHOUSE_RESOURCES, data/hunt-quests.js).

v3.32 : grille + panneau détail sélectionnable — même pattern EXACT
que l'inventaire équipement unifié (.eq-bag-flex/.eq-bag-inv-grid +
panneau détail, voir buildUnifiedTileHTML/buildUnifiedDetailPanelHTML
en ui/equipment-view.js), réutilisé tel quel plutôt que d'inventer un
nouveau mécanisme d'ouverture de panneau. Le panneau ajoute un stepper
de quantité (-1/+1/Max) et un bouton Vendre (WarehouseManager.sellResource()).

v3.35 : artisanat tier 1 (voir data/recipes.js) — rangée de filtre
Bruts/Tier 1, même pattern EXACT que .inv-filter-row/.inv-filter-btn
(inventoryFilter, ui/equipment-view.js). Le panneau détail affiche un
bloc "Fabriquer" AU-DESSUS du bloc Vendre existant quand la ressource
sélectionnée a une recette qui la consomme (RECIPE_BY_INPUT).
============================================================ */

/* Ressource actuellement sélectionnée dans la grille Entrepôt — même
   principe que selectedInventoryKey (equipment-view.js), état
   volatile, jamais sauvegardé. */
var selectedWarehouseKey = null;

/* Quantité choisie pour la vente en cours, remise à 1 à chaque
   nouvelle sélection (voir selectWarehouseKey ci-dessous) — évite de
   garder une quantité obsolète (ex. "Max" d'une ressource à 40 unités)
   quand on sélectionne une autre ressource avec moins de stock. */
var warehouseSellQty = 1;

/* v3.35 : filtre actif de la grille — "raw" | "crafted", voir
   WAREHOUSE_RESOURCES[key].tier (data/hunt-quests.js). Volatile,
   jamais sauvegardé, comme selectedWarehouseKey. */
var warehouseFilter = "raw";

/* v3.35 : quantité de craft choisie dans le bloc Fabriquer — même
   principe que warehouseSellQty, remise à 1 à chaque sélection. */
var warehouseCraftQty = 1;

function setWarehouseFilter(tier) {
  warehouseFilter = (tier === "crafted") ? "crafted" : "raw";
  // La sélection courante peut ne plus appartenir au tier affiché —
  // on la vide plutôt que de garder un panneau détail incohérent
  // avec la grille visible (comportement homogène avec setInventoryFilter).
  selectedWarehouseKey = null;
  if (typeof renderPanel === "function") renderPanel();
}
window.setWarehouseFilter = setWarehouseFilter;

function selectWarehouseKey(key) {
  selectedWarehouseKey = key;
  warehouseSellQty = 1;
  warehouseCraftQty = 1;
  if (typeof renderPanel === "function") renderPanel();
}
window.selectWarehouseKey = selectWarehouseKey;

/* delta : +1/-1 ou "max" — borné à [1, nombre de crafts possibles
   avec le stock actuel de l'input]. Sans recette ou stock nul pour
   l'input, ne fait rien (le bloc Fabriquer n'est de toute façon pas
   affiché dans ce cas, voir buildWarehouseCraftBlockHTML). */
function adjustWarehouseCraftQty(delta) {
  if (!selectedWarehouseKey) return;
  var recipe = (typeof RECIPE_BY_INPUT !== "undefined") ? RECIPE_BY_INPUT[selectedWarehouseKey] : null;
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

/* Nombre maximum de crafts réalisables avec le stock actuel de
   l'unique input de la recette (pas de recette croisée en V1, donc un
   seul input à considérer — voir data/recipes.js). */
function getMaxCraftTimes(recipe) {
  var input = recipe.inputs[0];
  var available = WarehouseManager.getAmount(input.resourceId);
  return Math.floor(available / input.quantity);
}

function confirmCraftWarehouseResource() {
  if (!selectedWarehouseKey) return;
  var recipe = (typeof RECIPE_BY_INPUT !== "undefined") ? RECIPE_BY_INPUT[selectedWarehouseKey] : null;
  if (!recipe) return;
  WarehouseManager.craft(recipe, warehouseCraftQty);
  warehouseCraftQty = 1; // repart à 1 après craft (le stock restant a changé)
}
window.confirmCraftWarehouseResource = confirmCraftWarehouseResource;

/* delta : +1/-1 (boutons du stepper) ou la chaîne "max". Toujours
   borné à [1, stock actuel] — jamais 0 (rien à vendre) ni au-delà du
   stock réellement disponible. */
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

/* v3.35 : bloc Fabriquer — affiché UNIQUEMENT si la ressource
   sélectionnée est l'input d'une recette (RECIPE_BY_INPUT). Placé
   au-dessus du bloc Vendre dans le panneau détail. */
function buildWarehouseCraftBlockHTML(inputKey) {
  var recipe = (typeof RECIPE_BY_INPUT !== "undefined") ? RECIPE_BY_INPUT[inputKey] : null;
  if (!recipe) return "";

  var input = recipe.inputs[0];
  var inputDef = WAREHOUSE_RESOURCES[input.resourceId];
  var outputDef = WAREHOUSE_RESOURCES[recipe.outputs[0].resourceId];
  var maxCrafts = getMaxCraftTimes(recipe);

  // Le stock a pu changer depuis la dernière sélection — reborne pour
  // ne jamais proposer de fabriquer plus que le stock ne le permet.
  warehouseCraftQty = Math.max(1, Math.min(maxCrafts || 1, warehouseCraftQty));

  var h = '<div class="warehouse-craft-block">';
  h += '<div class="warehouse-craft-title">' + renderIconOrEmojiHTML(outputDef.icon, "warehouse-craft-title-icon", outputDef.name) + esc(outputDef.name) + '</div>';
  h += '<div class="warehouse-craft-recipe">' + formatNumber(input.quantity) + ' ' + esc(inputDef.name) + ' → ' + formatNumber(recipe.outputs[0].quantity) + ' ' + esc(outputDef.name) + '</div>';

  if (maxCrafts <= 0) {
    h += '<div class="warehouse-empty-hint">Pas assez de ' + esc(inputDef.name) + ' pour fabriquer.</div>';
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

function buildWarehouseDetailPanelHTML() {
  var h = '<div class="eq-detail-panel">';

  var def = selectedWarehouseKey ? WAREHOUSE_RESOURCES[selectedWarehouseKey] : null;
  var stock = def ? Math.floor(WarehouseManager.getAmount(selectedWarehouseKey)) : 0;

  if (!def) {
    h += '<div class="eq-detail-icon eq-detail-icon-empty">📦</div>';
    h += '<div class="eq-detail-name">Aucune ressource sélectionnée</div>';
    h += '<div class="eq-detail-hint">Touche une ressource dans l\'Entrepôt pour voir son détail ici.</div>';
    h += '</div>';
    return h;
  }

  // Le stock a pu changer depuis la dernière sélection (production
  // continue en fond) — reborne la quantité affichée pour ne jamais
  // proposer de vendre plus que ce qui est réellement disponible.
  warehouseSellQty = Math.max(1, Math.min(stock || 1, warehouseSellQty));

  h += '<div class="eq-detail-icon">' + renderIconOrEmojiHTML(def.icon, "eq-detail-icon-img", def.name) + '</div>';
  h += '<div class="eq-detail-name">' + esc(def.name) + '</div>';
  h += '<div class="eq-detail-hint">' + esc(def.desc || "") + '</div>';
  h += '<div class="eq-detail-hint">🎒 Stock : ' + formatNumber(stock) + '</div>';

  // v3.35 : bloc Fabriquer, au-dessus du bloc Vendre (demande explicite).
  h += buildWarehouseCraftBlockHTML(selectedWarehouseKey);

  // v3.35 : les ressources fabriquées ont sellPrice: 0 (pas encore de
  // débouché de revente définie) — pas de bloc Vendre dans ce cas,
  // plutôt qu'un bouton qui rapporterait toujours 0 or.
  var canSell = Number(def.sellPrice || 0) > 0;

  if (!canSell) {
    // Pas de prix de vente : si en plus la ressource n'a pas de
    // recette qui la consomme (donc aucun bloc Fabriquer affiché
    // au-dessus), rien à proposer du tout — le dit explicitement
    // plutôt que de laisser le panneau silencieusement vide.
    if (!RECIPE_BY_INPUT[selectedWarehouseKey]) {
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

/* v3.35 : rangée de filtre Bruts/Tier 1 — même pattern EXACT que
   buildInventoryFilterRowHTML (ui/equipment-view.js). */
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

  return h;
}

window.buildWarehouseHTML = buildWarehouseHTML;
