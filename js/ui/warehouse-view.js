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

function selectWarehouseKey(key) {
  selectedWarehouseKey = key;
  warehouseSellQty = 1;
  if (typeof renderPanel === "function") renderPanel();
}
window.selectWarehouseKey = selectWarehouseKey;

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

  if (stock <= 0) {
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

function buildWarehouseHTML() {
  if (typeof HuntQuestManager !== "undefined") HuntQuestManager.ensureDefaults();
  if (typeof WarehouseManager !== "undefined") WarehouseManager.ensure();

  var keys = Object.keys(WAREHOUSE_RESOURCES);
  if (!keys.length) {
    return '<div class="eq-empty">Entrepôt vide pour l\'instant.</div>';
  }

  if (!selectedWarehouseKey || !WAREHOUSE_RESOURCES[selectedWarehouseKey]) {
    selectedWarehouseKey = keys[0];
  }

  var h = '<div class="eq-bag-flex">';
  h += '<div class="eq-bag-inv-grid warehouse-grid">';
  keys.forEach(function (key) {
    h += buildWarehouseTileHTML(key);
  });
  h += '</div>';
  h += buildWarehouseDetailPanelHTML();
  h += '</div>';

  return h;
}

window.buildWarehouseHTML = buildWarehouseHTML;
