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
  var canBuy = (game.gold || 0) >= potion.cost;

  var h = '<div class="potion-card rarity-' + esc(potion.rarity) + (isActive ? ' is-active' : '') + '">';
  h += '<div class="potion-icon">' + esc(potion.icon) + '</div>';
  h += '<div class="potion-info">';
  h += '<div class="potion-name">' + esc(potion.name) + '</div>';
  h += '<div class="potion-desc">' + esc(potion.desc) + '</div>';

  if (isActive) {
    h += '<div class="potion-timer">⏳ ' + esc(formatTime(Math.ceil(remaining / 1000))) + ' restant</div>';
  } else if (!potion.durationMin) {
    var pending = (game.pendingPotionBonuses && game.pendingPotionBonuses.aetherNext) || 0;
    if (pending > 0) {
      h += '<div class="potion-timer">🌀 Bonus prêt : +' + Math.round(pending * 100) + '% à la prochaine ascension</div>';
    }
  }

  h += '</div>';
  h += '<button class="potion-buy' + (canBuy ? '' : ' cant-afford') + '" onclick="PotionManager.buy(\'' + esc(potion.id) + '\')">' + formatNumber(potion.cost) + ' or</button>';
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
  return h;
}

window.buildPotionShopHTML = buildPotionShopHTML;
