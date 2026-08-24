"use strict";
/* ui/production-view.js — sous-onglet Production du Village. Carte horizontale (portrait+infos+actions), logique dans ProductionManager. Détail : COMMENTAIRES_ORIGINAUX.md */

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
    var cost = ProductionManager.getCost(id);
    var canAfford = (game.gold || 0) >= cost;
    h += '<button class="production-action-btn production-upgrade-btn' + (canAfford ? '' : ' is-disabled') + '" type="button" ' + (canAfford ? '' : 'disabled') + ' onclick="ProductionManager.buy(\'' + id + '\')">';
    h += 'Améliorer<br><img class="btn-buy-icon" src="images/Icons/gold_icon.png" alt="">' + formatNumber(cost);
    h += '</button>';
  }
  h += '</div>';

  h += '</div>';
  return h;
}

function buildProductionHTML() {
  ProductionManager.ensure();

  var h = '<div class="production-grid">';
  Object.keys(PRODUCTION_BUILDINGS).forEach(function (id) {
    h += buildProductionCardHTML(id);
  });
  h += '</div>';
  return h;
}

window.buildProductionHTML = buildProductionHTML;
