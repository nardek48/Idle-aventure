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
  h += '<div class="warehouse-reserve-label"><img class=ico-inline src=images/Icons/system/lock_closed.png> ' + _t("Réserve protégée") + '</div>';
  h += '<div class="warehouse-reserve-hint">' + _t("Jamais consommée par la production automatique des ateliers.") + '</div>';
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
  var h = '<button class="eq-bag-tile warehouse-tile rframe rframe-neutral' + (isSelected ? ' is-selected' : '') + '" type="button" onclick="selectWarehouseKey(\'' + esc(key) + '\')" aria-label="' + esc(_td(def.name)) + '">';
  h += renderIconOrEmojiHTML(def.icon, "eq-bag-tile-icon", _td(def.name));
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
    h += '<div class="eq-detail-name">' + _t("Aucune ressource sélectionnée") + '</div>';
    h += '<div class="eq-detail-hint">' + _t("Touche une ressource dans l'Entrepôt pour voir son détail ici.") + '</div>';
    h += '</div>';
    return h;
  }

  warehouseSellQty = Math.max(1, Math.min(stock || 1, warehouseSellQty));

  h += '<div class="eq-detail-icon rframe rframe-neutral">' + renderIconOrEmojiHTML(def.icon, "eq-detail-icon-img", _td(def.name)) + '</div>';
  h += '<div class="eq-detail-name">' + esc(_td(def.name)) + '</div>';
  h += '<div class="eq-detail-hint">' + esc(_td(def.desc || "")) + '</div>';
  /* v3.218.0 : le plafond s'affiche pour les ressources qui en ont un — sinon
     le joueur ne voit jamais ce que lui rapporte l'Entrepôt agrandi, et il ne
     comprend pas pourquoi un atelier s'arrête. */
  var capDetail = WarehouseManager.getCap(selectedWarehouseKey);
  h += '<div class="eq-detail-hint"><img class=ico-inline src=images/Icons/subtabs/inventory.png> ' + _t("Stock : {n}", { n: formatNumber(stock) })
     + (capDetail === Infinity ? '' : ' / ' + formatNumber(capDetail))
     + (capDetail !== Infinity && stock >= capDetail ? ' — ' + _t("plein") : '') + '</div>';

  h += buildWarehouseReserveHTML(selectedWarehouseKey);

  /* v3.330.0 (E6) : plus de vente. La valeur de référence dit ce que la ressource pèse dans
     un contrat de la Taverne, seul débouché désormais. */
  var refValue = Number(def.sellPrice || 0);
  if (refValue > 0) {
    h += '<div class="warehouse-empty-hint">' + _t("Valeur de référence : {n} or. Se livre à la Taverne, dans ses contrats.", { n: formatNumber(refValue) }) + '</div>';
  } else {
    h += '<div class="warehouse-empty-hint">' + _t("Ne se vend pas : sert aux constructions et aux ateliers.") + '</div>';
  }
  h += '</div>';
  return h;
}

function buildWarehouseFilterRowHTML() {
  // v3.401.0 (lot O-1) : onglets de page du kit (.kseg, rail)
  var h = '<div class="kseg warehouse-seg">';
  h += '<button type="button" class="' + (warehouseFilter === "raw" ? 'is-on' : '') + '" onclick="setWarehouseFilter(\'raw\')"><img src="images/Icons/resources/wood_icon.png" alt=""><span>' + _t("Bruts") + '</span></button>';
  h += '<button type="button" class="' + (warehouseFilter === "crafted" ? 'is-on' : '') + '" onclick="setWarehouseFilter(\'crafted\')"><img src="images/Icons/quests/mission_construction.png" alt=""><span>' + _t("Tier 1") + '</span></button>';
  // v3.128.0 : 3e filtre "Rares" (tier "special") — Sève d'Aeswyn (Petites Aventures, Lot PA3)
  // et toute future ressource de collection hors circuit vente/craft classique. N'apparaît que
  // si au moins une ressource special existe dans WAREHOUSE_RESOURCES (évite un onglet vide
  // sur une save qui n'aurait jamais lancé de Petite Aventure — le filtre reste utile même à 0
  // Sève en stock, contrairement à sa présence : ici on masque seulement si la DÉFINITION
  // n'existe pas du tout, pas si le stock est à 0).
  if (Object.keys(WAREHOUSE_RESOURCES).some(function (k) { return WAREHOUSE_RESOURCES[k].tier === "special"; })) {
    h += '<button type="button" class="' + (warehouseFilter === "special" ? 'is-on' : '') + '" onclick="setWarehouseFilter(\'special\')"><img src="images/Icons/scene/node_discovery.png" alt=""><span>' + _t("Rares") + '</span></button>';
  }
  h += '</div>';
  return h;
}

function buildWarehouseHTML() {
  if (typeof HuntQuestManager !== "undefined") HuntQuestManager.ensureDefaults();
  if (typeof WarehouseManager !== "undefined") WarehouseManager.ensure();

  var allKeys = Object.keys(WAREHOUSE_RESOURCES);
  if (!allKeys.length) {
    return '<div class="eq-empty">' + _t("Entrepôt vide pour l'instant.") + '</div>';
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
       + '<div class="warehouse-note-text"><strong>' + _t("Le tavernier") + '</strong> : « ' + _t("L’Entrepôt ne rachète plus rien. Ce qu’il te reste, porte-le-moi : mes contrats paient mieux, et on sait ce qu’on te demande.") + ' »</div>'
       + '<button type="button" class="settings-btn" onclick="dismissWarehouseNoSaleNote()">' + _t("Compris") + '</button></div>';
  }
  h += '<div class="eq-bag-flex">';
  h += '<div class="eq-bag-inv-grid warehouse-grid">';
  if (!keys.length) {
    h += '<div class="eq-empty">' + _t("Rien ici pour l'instant.") + '</div>';
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

function dismissWarehouseNoSaleNote() {
  if (!game.genericTutorialsSeen || typeof game.genericTutorialsSeen !== "object") game.genericTutorialsSeen = {};
  game.genericTutorialsSeen.warehouse_no_sale = true;
  if (typeof saveGame === "function") saveGame();
  if (typeof renderPanel === "function") renderPanel();
}
window.dismissWarehouseNoSaleNote = dismissWarehouseNoSaleNote;

window.buildWarehouseHTML = buildWarehouseHTML;
