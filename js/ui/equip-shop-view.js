"use strict";
/* ui/equip-shop-view.js — sous-onglet Équipement de la Boutique (voir shop-view.js pour la bascule d'onglets). Détail : COMMENTAIRES_ORIGINAUX.md */

function buildEquipShopCardHTML(item) {
  var statText = typeof formatEquipmentStat === "function" ? formatEquipmentStat(item) : "";
  var rarityLabel = (typeof RARITY_LABELS !== "undefined" && RARITY_LABELS[item.rarity]) || item.rarity;
  var canBuy = !item.bought && (game.gold || 0) >= item.price;

  var h = '<div class="nb-purchase-card rarity-' + esc(item.rarity) + (item.bought ? ' is-bought' : '') + '">';
  h += '<div class="nb-purchase-icon-col"><div class="nb-purchase-icon-slot">' + buildEquipmentIconHTML(item, "nb-purchase-icon rframe") + '</div></div>';
  h += '<div class="nb-purchase-info-col">';
  h += '<div class="nb-purchase-name rarity-' + esc(item.rarity) + '">' + esc(item.name) + '</div>';
  h += '<div class="nb-purchase-meta">' + esc(rarityLabel) + '</div>';
  if (typeof buildEquipmentCompareLinesHTML === "function") {
    h += buildEquipmentCompareLinesHTML(item, game.equipped ? game.equipped[item.slot] : null); // v3.226.0 : delta par ligne face à l'équipé
  } else {
    h += '<div class="nb-purchase-desc">' + esc(statText) + '</div>';
  }
  if (typeof buildEquipmentPowerHTML === "function") h += buildEquipmentPowerHTML(item); // v3.230.0
  h += '</div>';

  h += '<div class="nb-purchase-buy-col">';
  if (item.bought) {
    h += '<button class="btn-buy is-bought" type="button" disabled>Acheté</button>';
  } else {
    h += '<button class="btn-buy' + (canBuy ? '' : ' cant-afford') + '" type="button" onclick="EquipShopManager.buy(\'' + esc(item.uid) + '\')"><img class="btn-buy-icon" src="images/Icons/gold_icon.png" alt="">' + formatNumber(item.price) + '</button>';
  }
  h += '</div>';

  h += '</div>';
  return h;
}

function buildEquipShopHTML() {
  if (window.EquipShopManager && typeof EquipShopManager.checkRefresh === "function") {
    EquipShopManager.checkRefresh();
  }

  var manualCost = EquipShopManager.getManualRefreshCost();
  var canRefresh = (game.gold || 0) >= manualCost;

  var h = '<div class="equip-shop-timer">🔄 Renouvellement gratuit dans ' + esc(EquipShopManager.timeUntilRefresh()) + '</div>';

  /* v3.216.0 : quand la Halle marchande agrandit la vitrine, l'écran le dit —
     sinon le joueur paie un chantier sans jamais voir ce qu'il a acheté. */
  var hallLevel = (window.VillageBuildingManager && typeof VillageBuildingManager.getLevel === "function")
    ? VillageBuildingManager.getLevel("hall") : 0;
  if (hallLevel > 0) {
    var remise = Math.round((1 - EquipShopManager.getRefreshDiscount()) * 100);
    h += '<div class="equip-shop-hall-note">🛒 Halle marchande niv. ' + hallLevel + ' — '
      + EquipShopManager.getShopSize() + ' emplacements'
      + (remise > 0 ? ', renouvellement -' + remise + ' %' : '') + '</div>';
  }
  h += '<button class="settings-btn' + (canRefresh ? '' : ' disabled') + '" type="button" ' + (canRefresh ? 'onclick="EquipShopManager.manualRefresh()"' : 'disabled') + '>🔄 Renouveler maintenant (' + formatNumber(manualCost) + ' or)</button>';
  h += '<div class="equip-shop-grid">';

  (game.equipShopStock || []).forEach(function (item) {
    h += buildEquipShopCardHTML(item);
  });

  h += '</div>';
  return h;
}

window.buildEquipShopHTML = buildEquipShopHTML;
