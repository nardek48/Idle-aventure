"use strict";
/* ui/warehouse-view.js — sous-onglet Entrepôt (Village) : grille+panneau détail (v3.32), vente, entrée vers modale Construction (v3.37.1).
   v3.98.0 : le craft (sélecteur de recette, file, Fabriquer) est retiré de cet écran —
   migré vers des ateliers locaux par bâtiment de Production (voir WorkshopsSystem,
   js/ui/production-view.js). Le filtre "Bruts / Tier 1" reste pertinent pour la VENTE
   (les ressources craftées se vendent plus cher), donc conservé. Détail : COMMENTAIRES_ORIGINAUX.md */

var selectedWarehouseKey = null;

var warehouseSellQty = 1;

var warehouseFilter = "raw";

function setWarehouseFilter(tier) {
  warehouseFilter = (tier === "crafted") ? "crafted" : "raw";
  selectedWarehouseKey = null;
  if (typeof renderPanel === "function") renderPanel();
}
window.setWarehouseFilter = setWarehouseFilter;

function selectWarehouseKey(key) {
  selectedWarehouseKey = key;
  warehouseSellQty = 1;
  if (typeof renderPanel === "function") renderPanel();
}
window.selectWarehouseKey = selectWarehouseKey;

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

/* v3.98.16 : saisie directe dans le champ de quantité à vendre — mêmes règles que les
   steppers de craft (correction silencieuse vers la borne valide la plus proche). */
function setWarehouseSellQty(rawValue) {
  if (!selectedWarehouseKey) return;
  var stock = Math.floor(WarehouseManager.getAmount(selectedWarehouseKey));
  if (stock <= 0) return;

  var parsed = Math.floor(Number(rawValue));
  if (!isFinite(parsed)) parsed = 1;
  warehouseSellQty = Math.max(1, Math.min(stock, parsed));
  if (typeof renderPanel === "function") renderPanel();
}
window.setWarehouseSellQty = setWarehouseSellQty;

function confirmSellWarehouseResource() {
  if (!selectedWarehouseKey) return;
  WarehouseManager.sellResource(selectedWarehouseKey, warehouseSellQty);
  warehouseSellQty = 1; // repart à 1 après vente (le stock restant a changé)
}
window.confirmSellWarehouseResource = confirmSellWarehouseResource;

/* v3.98.13 : réserve protégée — seuil que le CHAÎNAGE AUTO des ateliers (voir
   WorkshopsSystem/ResourceReserveManager) ne consommera jamais. Un input numérique
   directement modifiable (pas un stepper -/+ : les seuils utiles peuvent être élevés,
   ex. "garder 500 Blé", un stepper serait fastidieux). Validé au blur/Entrée plutôt qu'à
   chaque frappe pour ne pas re-render toute la page à chaque chiffre tapé. */
function commitWarehouseReserve(key, rawValue) {
  if (!key) return;
  ResourceReserveManager.setReserve(key, rawValue);
}
window.commitWarehouseReserve = commitWarehouseReserve;

function buildWarehouseReserveHTML(key) {
  var reserve = ResourceReserveManager.getReserve(key);
  var h = '<div class="warehouse-reserve-block">';
  h += '<div class="warehouse-reserve-label">🔒 Réserve protégée</div>';
  h += '<div class="warehouse-reserve-hint">Jamais consommée par la production automatique des ateliers.</div>';
  h += '<input class="warehouse-reserve-input" type="number" min="0" step="1" value="' + (reserve > 0 ? reserve : '') + '" placeholder="0" onchange="commitWarehouseReserve(\'' + esc(key) + '\', this.value)">';
  h += '</div>';
  return h;
}

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

  warehouseSellQty = Math.max(1, Math.min(stock || 1, warehouseSellQty));

  h += '<div class="eq-detail-icon">' + renderIconOrEmojiHTML(def.icon, "eq-detail-icon-img", def.name) + '</div>';
  h += '<div class="eq-detail-name">' + esc(def.name) + '</div>';
  h += '<div class="eq-detail-hint">' + esc(def.desc || "") + '</div>';
  h += '<div class="eq-detail-hint">🎒 Stock : ' + formatNumber(stock) + '</div>';

  h += buildWarehouseReserveHTML(selectedWarehouseKey);

  var canSell = Number(def.sellPrice || 0) > 0;

  if (!canSell) {
    h += '<div class="warehouse-empty-hint">Rien à faire pour l\'instant.</div>';
  } else if (stock <= 0) {
    h += '<div class="warehouse-empty-hint">Rien à vendre pour l\'instant.</div>';
  } else {
    h += '<div class="warehouse-qty-stepper">';
    h += '<button class="warehouse-qty-btn" type="button" onclick="adjustWarehouseSellQty(-1)"' + (warehouseSellQty <= 1 ? ' disabled' : '') + '>−</button>';
    h += '<input class="warehouse-qty-value" type="number" min="1" max="' + stock + '" step="1" value="' + warehouseSellQty + '" onchange="setWarehouseSellQty(this.value)">';
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
