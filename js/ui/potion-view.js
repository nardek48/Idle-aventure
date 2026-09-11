"use strict";
/* ui/potion-view.js — sous-onglet Potions de la Boutique. Achat ajoute au stock (activation séparée, voir equipment-view.js). Détail : COMMENTAIRES_ORIGINAUX.md */


/* v3.215.0 (lot V-4) — SECONDE VOIE : préparer au lieu d'acheter.
   L'achat en or n'est jamais retiré ; le bloc ci-dessous s'ajoute sous la carte
   quand l'Apothicaire est construit. Une recette pas encore ouverte affiche le
   niveau qu'il faut plutôt que de disparaître : le joueur voit où va le
   bâtiment avant de payer pour y aller. */
function buildApothecaryCraftRowHTML(potionId) {
  if (!window.ApothecaryManager) return "";
  var recipe = ApothecaryManager.getRecipe(potionId);
  if (!recipe) return "";

  var level = ApothecaryManager.getLevel();
  if (level <= 0) return ""; // pas d'Apothicaire : la Boutique est inchangée

  var unlocked = ApothecaryManager.isUnlocked(potionId);
  var required = ApothecaryManager.getRequiredLevel(potionId);

  var h = '<div class="potion-craft-row' + (unlocked ? '' : ' is-locked') + '">';
  h += '<span class="potion-craft-label">⚗️ Préparer</span>';

  h += '<span class="potion-craft-inputs">';
  Object.keys(recipe.inputs).forEach(function (key) {
    var def = WAREHOUSE_RESOURCES[key];
    var have = WarehouseManager.getAmount(key);
    var enough = have >= recipe.inputs[key];
    h += '<span class="potion-craft-item' + (enough ? '' : ' is-missing') + '">';
    h += renderIconOrEmojiHTML(def ? def.icon : "", "potion-craft-icon", def ? def.name : key);
    h += formatNumber(recipe.inputs[key]);
    h += '</span>';
  });
  h += '</span>';

  if (!unlocked) {
    h += '<span class="potion-craft-locked">🔒 Apothicaire niv. ' + required + '</span>';
  } else if (ApothecaryManager.canAfford(potionId)) {
    h += '<button type="button" class="btn-buy potion-craft-btn" onclick="ApothecaryManager.craft(\'' + esc(potionId) + '\')">Préparer</button>';
  } else {
    h += '<button type="button" class="btn-buy cant-afford potion-craft-btn" disabled>Préparer</button>';
  }

  h += '</div>';
  return h;
}
window.buildApothecaryCraftRowHTML = buildApothecaryCraftRowHTML;

function buildPotionCardHTML(potion) {
  // v3.115.0 : per-run — plus de minuteur. États : armée (bue, en attente d'une mission),
  // active (mission en cours), sinon stock/achat. Cap de stock POTION_STOCK_CAP.
  var isArmed = potion.perRun && window.PotionManager && typeof PotionManager.isArmed === "function" && PotionManager.isArmed(potion.id);
  var isLive = isArmed && PotionManager.isEffectLive();
  var stock = (window.PotionManager && typeof PotionManager.getStock === "function") ? PotionManager.getStock(potion.id) : 0;
  var cost = (window.PotionManager && typeof PotionManager.getCost === "function") ? PotionManager.getCost(potion) : potion.cost;
  var cap = typeof POTION_STOCK_CAP === "number" ? POTION_STOCK_CAP : 9;
  var isStockCapped = !!potion.perRun && stock >= cap;
  var canBuy = !isStockCapped && (game.gold || 0) >= cost;

  var h = '<div class="nb-purchase-card rarity-' + esc(potion.rarity) + (isLive ? ' is-active' : '') + '">';
  h += '<div class="nb-purchase-icon-col"><div class="nb-purchase-icon-slot">' + renderIconOrEmojiHTML(potion.icon, "nb-purchase-icon", potion.name) + '</div></div>';
  h += '<div class="nb-purchase-info-col">';
  h += '<div class="nb-purchase-name">' + esc(potion.name) + '</div>';
  h += '<div class="nb-purchase-desc">' + esc(potion.desc) + '</div>';
  h += '<div class="nb-purchase-meta">🎒 Stock : ' + stock + (potion.perRun ? ' / ' + cap : '') + '</div>';

  if (isLive) {
    h += '<div class="nb-purchase-meta">⚗️ Active — mission en cours</div>';
  } else if (isArmed) {
    h += '<div class="nb-purchase-meta">🧪 Armée pour la prochaine mission</div>';
  } else if (!potion.perRun) {
    var pending = (game.pendingPotionBonuses && game.pendingPotionBonuses.aetherNext) || 0;
    if (pending > 0) {
      h += '<div class="nb-purchase-meta">' + renderIconOrEmojiHTML("images/Icons/aether_icon.png", "nb-purchase-cost-icon", "Aether") + ' Bonus prêt : +' + Math.round(pending * 100) + '% à la prochaine ascension</div>';
    }
  }

  h += '</div>';
  if (isStockCapped) {
    h += '<div class="nb-purchase-buy-col"><button class="btn-buy cant-afford" type="button" disabled>STOCK PLEIN</button></div>';
  } else {
    h += '<div class="nb-purchase-buy-col"><button class="btn-buy' + (canBuy ? '' : ' cant-afford') + '" onclick="PotionManager.buyPotion(\'' + esc(potion.id) + '\')"><img class="btn-buy-icon" src="images/Icons/gold_icon.png" alt="">' + formatNumber(cost) + '</button></div>';
  }
  h += '</div>'; // fin .nb-purchase-card

  /* v3.215.0 : la voie « préparer » est pleine largeur, donc SOUS la carte et
     non dans sa colonne d'achat. Les deux sont enveloppées ensemble pour que
     la grille les garde solidaires. */
  var craft = buildApothecaryCraftRowHTML(potion.id);
  return craft ? ('<div class="potion-entry">' + h + craft + '</div>') : h;
}

function buildPotionShopHTML() {
  var h = '<div class="potion-grid">';
  (POTIONS_DB || []).forEach(function (potion) {
    h += buildPotionCardHTML(potion);
  });
  h += '</div>';

  h += buildHealingPotionShopHTML();

  return h;
}

function buildHealingPotionCardHTML(potion) {
  var stock = PotionManager.getHealingStock(potion.id);
  var cost = PotionManager.getCost(potion);
  var canBuy = (game.gold || 0) >= cost;

  var h = '<div class="nb-purchase-card">';
  h += '<div class="nb-purchase-icon-col"><div class="nb-purchase-icon-slot">' + renderIconOrEmojiHTML(potion.icon, "nb-purchase-icon", potion.name) + '</div></div>';
  h += '<div class="nb-purchase-info-col">';
  h += '<div class="nb-purchase-name">' + esc(potion.name) + '</div>';
  h += '<div class="nb-purchase-desc">Restaure ' + Math.round(potion.healPercent * 100) + '% des PV max, à la demande depuis l\u2019écran Combat.</div>';
  h += '<div class="nb-purchase-meta">🩹 Stock : ' + stock + '</div>';
  h += '</div>';
  h += '<div class="nb-purchase-buy-col"><button class="btn-buy' + (canBuy ? '' : ' cant-afford') + '" onclick="PotionManager.buyHealingPotion(\'' + esc(potion.id) + '\')"><img class="btn-buy-icon" src="images/Icons/gold_icon.png" alt="">' + formatNumber(cost) + '</button></div>';
  h += '</div>'; // fin .nb-purchase-card

  var craft = buildApothecaryCraftRowHTML(potion.id);
  return craft ? ('<div class="potion-entry">' + h + craft + '</div>') : h;
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
