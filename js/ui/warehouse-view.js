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

/* Nombre maximum de crafts réalisables avec le stock actuel — le
   MINIMUM sur TOUS les intrants de la recette (v3.45 : généralisé
   pour les recettes croisées type Pain/Ration, qui ont plusieurs
   intrants différents ; les recettes single-input restent correctes,
   Math.min sur un seul élément = cet élément).
   v3.43 : renvoie 0 si recipe.station est défini et non construit
   (même condition que WarehouseManager.canCraft()) — masque le bloc
   Fabriquer plutôt que d'afficher un stepper inutilisable. Sans effet
   sur les 3 recettes single-input existantes (station: null). */
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
  var recipe = (typeof RECIPE_BY_INPUT !== "undefined") ? RECIPE_BY_INPUT[selectedWarehouseKey] : null;
  if (!recipe) return;
  WarehouseManager.enqueueCraft(recipe, warehouseCraftQty);
  warehouseCraftQty = 1; // repart à 1 après mise en file (le stock restant a changé)
}
window.confirmCraftWarehouseResource = confirmCraftWarehouseResource;

/* v3.43 : annule une commande en attente (bouton ✕ dans le bloc file
   d'attente ci-dessous) — pas de confirmation supplémentaire, le
   remboursement est intégral et immédiat (voir
   WarehouseManager.cancelCraft()). */
function cancelWarehouseCraft(queueId) {
  if (window.WarehouseManager && typeof WarehouseManager.cancelCraft === "function") {
    WarehouseManager.cancelCraft(queueId);
  }
}
window.cancelWarehouseCraft = cancelWarehouseCraft;

/* v3.43 : même principe EXACT que isProductionScreenVisible()
   (ui/village-view.js) — throttle du re-rendu pendant que le tick de
   la file de craft tourne, voir WarehouseManager._maybeRenderWarehouse(). */
function isWarehouseScreenVisible() {
  return game.activeTab === "village" && activeVillageSubTab === "entrepot";
}
window.isWarehouseScreenVisible = isWarehouseScreenVisible;

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
   au-dessus du bloc Vendre dans le panneau détail.
   v3.45 : généralisé pour afficher TOUS les intrants (recettes
   croisées type Pain/Ration), pas juste inputs[0] — le texte de
   recette devient "5 Eau + 3 Farine → 1 Pain" au lieu de tronquer aux
   Eau uniquement. Les 3 recettes single-input restent affichées à
   l'identique (un seul terme avant la flèche). */
function buildWarehouseCraftBlockHTML(inputKey) {
  var recipe = (typeof RECIPE_BY_INPUT !== "undefined") ? RECIPE_BY_INPUT[inputKey] : null;
  if (!recipe) return "";

  var outputDef = WAREHOUSE_RESOURCES[recipe.outputs[0].resourceId];
  var maxCrafts = getMaxCraftTimes(recipe);

  var inputsText = recipe.inputs.map(function (input) {
    var d = WAREHOUSE_RESOURCES[input.resourceId];
    return formatNumber(input.quantity) + ' ' + esc(d ? d.name : input.resourceId);
  }).join(' + ');

  // Le stock a pu changer depuis la dernière sélection — reborne pour
  // ne jamais proposer de fabriquer plus que le stock ne le permet.
  warehouseCraftQty = Math.max(1, Math.min(maxCrafts || 1, warehouseCraftQty));

  var h = '<div class="warehouse-craft-block">';
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
    // v3.45 : identifie le PREMIER intrant manquant pour un message
    // ciblé, même principe que ConstructionManager.buy() (message sur
    // la première ressource insuffisante) plutôt qu'un message générique.
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

/* v3.43 : file d'attente de craft (game.craftQueue) — GLOBALE, pas
   filtrée par ressource sélectionnée (une file peut mélanger
   plusieurs recettes). Commande en tête = en cours (barre de
   progression + temps restant, pas annulable) ; les suivantes
   attendent (bouton ✕ = remboursement intégral, voir
   WarehouseManager.cancelCraft()). Réutilise .map-quest-step-bar/
   .map-quest-step-fill (ui/quests-view.js) plutôt qu'inventer un
   nouveau style de barre de progression. */
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
    // v3.43 : la file de craft est globale (pas liée à la sélection)
    // — reste visible même sans ressource sélectionnée.
    h += buildWarehouseCraftQueueHTML();
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

  // v3.43 : file d'attente, globale — affichée que la ressource
  // sélectionnée ait une recette ou non (ex. le joueur regarde le
  // stock de Fer pendant qu'une Planche est en cours de fabrication).
  h += buildWarehouseCraftQueueHTML();

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

  // v3.37.1 : point d'entrée vers la modale de Construction (voir
  // ui/construction-view.js), déplacé depuis ui/production-view.js —
  // Construction consomme et modifie exclusivement des mécaniques de
  // l'Entrepôt (WarehouseManager.removeResource()/sellResource()),
  // donc son point d'accès vit maintenant ici pour rester cohérent
  // avec CE que le système touche réellement, pas avec l'écran où il
  // se trouvait avant. Carte distincte des tuiles de ressources — pas
  // de sélection, pas de panneau détail, juste un clic vers la modale.
  // Purement un déplacement de couche UI : ConstructionManager,
  // WarehouseManager et les 4 emplacements de sauvegarde sont
  // INCHANGÉS (voir CHANGELOG_v3.37.1.md).
  if (typeof ConstructionManager !== "undefined") {
    ConstructionManager.ensure();
    if (typeof WorkshopUnlockManager !== "undefined") WorkshopUnlockManager.ensure();
    h += buildConstructionEntryCardHTML();
  }

  return h;
}

/* Carte d'accès (pas une tuile de ressource : pas de sélection, pas
   de panneau détail — juste un résumé + un clic vers la modale, voir
   ui/construction-view.js).
   v3.38 : gatée par WorkshopUnlockManager (voir
   systems/workshop-unlock-system.js) — invisible avant l'étape 3
   ("Récolter 15 Pierre") validée, affichée avec un badge "Quête"
   entre l'étape 3 et l'étape 4, identique à l'état actuel une fois
   la chaîne terminée (déblocage permanent, jamais de re-verrouillage :
   isWorkshopVisible()/isWorkshopQuestPending() renvoient toujours true/
   false respectivement une fois completed=true). */
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
