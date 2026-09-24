"use strict";
/* ui/warehouse-view.js — sous-onglet Entrepôt (Village) : grille+panneau détail (v3.32), entrée vers modale Construction (v3.37.1).
   v3.330.0 (E6) : la vente est retirée (Taverne seul débouché) ; les fonctions de quantité restent, inertes.
   v3.98.0 : le craft (sélecteur de recette, file, Fabriquer) est retiré de cet écran —
   migré vers des ateliers locaux par bâtiment de Production (voir WorkshopsSystem,
   js/ui/production-view.js). Le filtre "Bruts / Tier 1" reste pertinent pour la VENTE
   (les ressources craftées se vendent plus cher), donc conservé. Détail : COMMENTAIRES_ORIGINAUX.md */

var selectedWarehouseKey = null;

var warehouseSellQty = 1;

var warehouseFilter = "raw";

function setWarehouseFilter(tier) {
  warehouseFilter = (tier === "crafted" || tier === "special") ? tier : "raw";
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
  h += '<div class="warehouse-reserve-label"><img class=ico-inline src=images/Icons/system/lock_closed.png> Réserve protégée</div>';
  h += '<div class="warehouse-reserve-hint">Jamais consommée par la production automatique des ateliers.</div>';
  h += '<input class="warehouse-reserve-input" type="number" min="0" step="1" value="' + (reserve > 0 ? reserve : '') + '" placeholder="0" onchange="commitWarehouseReserve(\'' + esc(key) + '\', this.value)">';
  h += '</div>';
  return h;
}

function buildWarehouseTileHTML(key) {
  var def = WAREHOUSE_RESOURCES[key];
  var stock = Number((game.resources || {})[key] || 0);
  var isSelected = selectedWarehouseKey === key;

  // v3.180.0 : cadre neutre du kit sur la tuile (pas de rareté pour les
  // ressources) — même architecture que le sac d'équipement (le cadre
  // EST la tuile, voir css/00-rframe.css).
  var h = '<button class="eq-bag-tile warehouse-tile rframe rframe-neutral' + (isSelected ? ' is-selected' : '') + '" type="button" onclick="selectWarehouseKey(\'' + esc(key) + '\')" aria-label="' + esc(def.name) + '">';
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
    h += '<div class="eq-detail-icon eq-detail-icon-empty"><img class=ico-inline src=images/Icons/system/warehouse_supplies.png></div>';
    h += '<div class="eq-detail-name">Aucune ressource sélectionnée</div>';
    h += '<div class="eq-detail-hint">Touche une ressource dans l\'Entrepôt pour voir son détail ici.</div>';
    h += '</div>';
    return h;
  }

  warehouseSellQty = Math.max(1, Math.min(stock || 1, warehouseSellQty));

  h += '<div class="eq-detail-icon rframe rframe-neutral">' + renderIconOrEmojiHTML(def.icon, "eq-detail-icon-img", def.name) + '</div>';
  h += '<div class="eq-detail-name">' + esc(def.name) + '</div>';
  h += '<div class="eq-detail-hint">' + esc(def.desc || "") + '</div>';
  /* v3.218.0 : le plafond s'affiche pour les ressources qui en ont un — sinon
     le joueur ne voit jamais ce que lui rapporte l'Entrepôt agrandi, et il ne
     comprend pas pourquoi un atelier s'arrête. */
  var capDetail = WarehouseManager.getCap(selectedWarehouseKey);
  h += '<div class="eq-detail-hint"><img class=ico-inline src=images/Icons/subtabs/inventory.png> Stock : ' + formatNumber(stock)
     + (capDetail === Infinity ? '' : ' / ' + formatNumber(capDetail))
     + (capDetail !== Infinity && stock >= capDetail ? ' — plein' : '') + '</div>';

  h += buildWarehouseReserveHTML(selectedWarehouseKey);

  /* v3.330.0 (E6) : plus de vente. La valeur de référence dit ce que la ressource pèse dans
     un contrat de la Taverne, seul débouché désormais. */
  var refValue = Number(def.sellPrice || 0);
  if (refValue > 0) {
    h += '<div class="warehouse-empty-hint">Valeur de référence : ' + formatNumber(refValue)
       + ' or. Se livre à la Taverne, dans ses contrats.</div>';
  } else {
    h += '<div class="warehouse-empty-hint">Ne se vend pas : sert aux constructions et aux ateliers.</div>';
  }
  h += '</div>';
  return h;
}

function buildWarehouseFilterRowHTML() {
  var h = '<div class="inv-filter-row">';
  h += '<button type="button" class="inv-filter-btn' + (warehouseFilter === "raw" ? ' is-active' : '') + '" onclick="setWarehouseFilter(\'raw\')">Bruts</button>';
  h += '<button type="button" class="inv-filter-btn' + (warehouseFilter === "crafted" ? ' is-active' : '') + '" onclick="setWarehouseFilter(\'crafted\')"><img class=ico-inline src=images/Icons/quests/mission_construction.png> Tier 1</button>';
  // v3.128.0 : 3e filtre "Rares" (tier "special") — Sève d'Aeswyn (Petites Aventures, Lot PA3)
  // et toute future ressource de collection hors circuit vente/craft classique. N'apparaît que
  // si au moins une ressource special existe dans WAREHOUSE_RESOURCES (évite un onglet vide
  // sur une save qui n'aurait jamais lancé de Petite Aventure — le filtre reste utile même à 0
  // Sève en stock, contrairement à sa présence : ici on masque seulement si la DÉFINITION
  // n'existe pas du tout, pas si le stock est à 0).
  if (Object.keys(WAREHOUSE_RESOURCES).some(function (k) { return WAREHOUSE_RESOURCES[k].tier === "special"; })) {
    h += '<button type="button" class="inv-filter-btn' + (warehouseFilter === "special" ? ' is-active' : '') + '" onclick="setWarehouseFilter(\'special\')"><img class=ico-inline src=images/Icons/scene/node_discovery.png> Rares</button>';
  }
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
  // v3.330.0 (E6) : à la première visite, le tavernier explique la fin de la vente
  if (!(game.genericTutorialsSeen || {}).warehouse_no_sale) {
    h += '<div class="warehouse-note">'
       + '<div class="warehouse-note-text"><strong>Le tavernier</strong> : « L\u2019Entrepôt ne rachète plus rien. Ce qu\u2019il te reste, porte-le-moi : '
       + 'mes contrats paient mieux, et on sait ce qu\u2019on te demande. »</div>'
       + '<button type="button" class="settings-btn" onclick="dismissWarehouseNoSaleNote()">Compris</button></div>';
  }
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

  /* v3.213.0 (lot V-1) : la carte d'entrée de l'Atelier de Construction a
     quitté l'Entrepôt pour la grille du Village — sa vraie adresse. Le
     builder buildConstructionEntryCardHTML() est conservé plus bas, inerte,
     le temps d'une version : rien ne l'appelle. */

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
  h += '<div class="construction-entry-icon">' + renderIconOrEmojiHTML(def.icon || "images/Icons/workshops/masonry.png", "construction-entry-icon-img", def.name) + '</div>';
  h += '<div class="construction-entry-info">';
  h += '<div class="construction-entry-name">' + esc(def.name) + (questPending ? ' <span class="construction-quest-badge"><img class=ico-inline src=images/Icons/combat_stats/stat_critical.png> Quête</span>' : '') + '</div>';
  h += '<div class="construction-entry-level">' + (maxed ? 'Niveau maximum' : 'Niveau ' + level + ' / ' + VillageBuildingManager.getMaxLevel(id)) + '</div>';
  h += '</div>';
  h += '<div class="construction-entry-arrow">›</div>';
  h += '</div>';
  return h;
}

function dismissWarehouseNoSaleNote() {
  if (!game.genericTutorialsSeen || typeof game.genericTutorialsSeen !== "object") game.genericTutorialsSeen = {};
  game.genericTutorialsSeen.warehouse_no_sale = true;
  if (typeof saveGame === "function") saveGame();
  if (typeof renderPanel === "function") renderPanel();
}
window.dismissWarehouseNoSaleNote = dismissWarehouseNoSaleNote;

window.buildWarehouseHTML = buildWarehouseHTML;
