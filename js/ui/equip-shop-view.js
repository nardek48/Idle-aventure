"use strict";
/* ============================================================
Quest Idle — ui/equip-shop-view.js
Sous-onglet "Équipement" de la Boutique (voir shop-view.js pour la
bascule entre Améliorations/Potions/Équipement).
============================================================ */

function buildEquipShopCardHTML(item) {
  var statText = typeof formatEquipmentStat === "function" ? formatEquipmentStat(item) : "";
  var rarityLabel = (typeof RARITY_LABELS !== "undefined" && RARITY_LABELS[item.rarity]) || item.rarity;
  var canBuy = !item.bought && (game.gold || 0) >= item.price;

  var h = '<div class="equip-shop-card rarity-' + esc(item.rarity) + (item.bought ? ' is-bought' : '') + '">';
  h += buildEquipmentIconHTML(item, "equip-shop-icon");
  h += '<div class="equip-shop-info">';
  h += '<div class="equip-shop-name rarity-' + esc(item.rarity) + '">' + esc(item.name) + '</div>';
  h += '<div class="equip-shop-rarity">' + esc(rarityLabel) + '</div>';
  h += '<div class="equip-shop-stat">' + esc(statText) + '</div>';
  h += '</div>';

  if (item.bought) {
    h += '<button class="equip-shop-buy is-bought" type="button" disabled>Acheté</button>';
  } else {
    h += '<button class="equip-shop-buy' + (canBuy ? '' : ' cant-afford') + '" type="button" onclick="EquipShopManager.buy(\'' + esc(item.uid) + '\')">' + formatNumber(item.price) + ' or</button>';
  }

  h += '</div>';
  return h;
}

function buildEquipShopHTML() {
  if (window.EquipShopManager && typeof EquipShopManager.checkRefresh === "function") {
    EquipShopManager.checkRefresh();
  }

  var h = '<div class="equip-shop-timer">🔄 Renouvellement dans ' + esc(EquipShopManager.timeUntilRefresh()) + '</div>';
  h += '<div class="equip-shop-grid">';

  (game.equipShopStock || []).forEach(function (item) {
    h += buildEquipShopCardHTML(item);
  });

  h += '</div>';
  return h;
}

window.buildEquipShopHTML = buildEquipShopHTML;
