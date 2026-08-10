"use strict";
/* ============================================================
Quest Idle — ui/potion-view.js
Sous-onglet "Potions" de la Boutique (voir shop-view.js pour le
bouton de bascule Améliorations/Potions).
============================================================ */

/* Une carte potion : icône, description, compte à rebours si active,
   bouton d'achat désactivé si trop cher. */
function buildPotionCardHTML(potion) {
  var remaining = (window.PotionManager && typeof PotionManager.getRemainingMs === "function")
    ? PotionManager.getRemainingMs(potion.id)
    : 0;
  var isActive = remaining > 0;
  var cost = (window.PotionManager && typeof PotionManager.getCost === "function") ? PotionManager.getCost(potion) : potion.cost;
  var canBuy = (game.gold || 0) >= cost;

  var h = '<div class="nb-purchase-card rarity-' + esc(potion.rarity) + (isActive ? ' is-active' : '') + '">';
  h += '<div class="nb-purchase-icon-col"><div class="nb-purchase-icon-slot">' + renderIconOrEmojiHTML(potion.icon, "nb-purchase-icon", potion.name) + '</div></div>';
  h += '<div class="nb-purchase-info-col">';
  h += '<div class="nb-purchase-name">' + esc(potion.name) + '</div>';
  h += '<div class="nb-purchase-desc">' + esc(potion.desc) + '</div>';

  if (isActive) {
    h += '<div class="nb-purchase-meta">⏳ ' + esc(formatTime(Math.ceil(remaining / 1000))) + ' restant</div>';
  } else if (!potion.durationMin) {
    var pending = (game.pendingPotionBonuses && game.pendingPotionBonuses.aetherNext) || 0;
    if (pending > 0) {
      h += '<div class="nb-purchase-meta">' + renderIconOrEmojiHTML("images/Icons/aether_icon.png", "nb-purchase-cost-icon", "Aether") + ' Bonus prêt : +' + Math.round(pending * 100) + '% à la prochaine ascension</div>';
    }
  }

  h += '</div>';
  h += '<div class="nb-purchase-buy-col"><button class="btn-buy' + (canBuy ? '' : ' cant-afford') + '" onclick="PotionManager.buy(\'' + esc(potion.id) + '\')"><img class="btn-buy-icon" src="images/Icons/gold_icon.png" alt="">' + formatNumber(cost) + '</button></div>';
  h += '</div>';
  return h;
}

/* Grille des 6 potions du catalogue (POTIONS_DB, voir data/potions.js). */
function buildPotionShopHTML() {
  var h = '<div class="potion-grid">';
  (POTIONS_DB || []).forEach(function (potion) {
    h += buildPotionCardHTML(potion);
  });
  h += '</div>';

  h += buildHealingPotionShopHTML();

  return h;
}

/* Carte d'une potion de soin : achetée en stock (pas activée
   immédiatement), à consommer depuis le bouton dédié de l'écran
   Combat (voir ui/combat-view.js). */
function buildHealingPotionCardHTML(potion) {
  var stock = PotionManager.getHealingStock(potion.id);
  var canBuy = (game.gold || 0) >= potion.cost;

  var h = '<div class="nb-purchase-card">';
  h += '<div class="nb-purchase-icon-col"><div class="nb-purchase-icon-slot">' + renderIconOrEmojiHTML(potion.icon, "nb-purchase-icon", potion.name) + '</div></div>';
  h += '<div class="nb-purchase-info-col">';
  h += '<div class="nb-purchase-name">' + esc(potion.name) + '</div>';
  h += '<div class="nb-purchase-desc">Restaure ' + Math.round(potion.healPercent * 100) + '% des PV max, à la demande depuis l\u2019écran Combat.</div>';
  h += '<div class="nb-purchase-meta">🩹 Stock : ' + stock + '</div>';
  h += '</div>';
  h += '<div class="nb-purchase-buy-col"><button class="btn-buy' + (canBuy ? '' : ' cant-afford') + '" onclick="PotionManager.buyHealingPotion(\'' + esc(potion.id) + '\')"><img class="btn-buy-icon" src="images/Icons/gold_icon.png" alt="">' + formatNumber(potion.cost) + '</button></div>';
  h += '</div>';
  return h;
}

function buildHealingPotionShopHTML() {
  var h = '<div class="potion-section-label">🩹 Potions de soin (usage instantané)</div>';
  h += '<div class="potion-grid">';
  (HEALING_POTIONS_DB || []).forEach(function (potion) {
    h += buildHealingPotionCardHTML(potion);
  });
  h += '</div>';
  return h;
}

window.buildPotionShopHTML = buildPotionShopHTML;
