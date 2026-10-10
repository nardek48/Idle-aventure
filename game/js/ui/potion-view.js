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
  // v3.291.0 : les recettes se gagnent par commande, plafond quotidien hors Soin mineur
  var capped = !!recipe.capped;
  var remaining = ApothecaryManager.getDailyRemaining();

  var h = '<div class="potion-craft-row' + (unlocked ? '' : ' is-locked') + '">';
  h += '<span class="potion-craft-label"><img class=ico-inline src=images/Icons/village_buildings/apothecary.png> ' + _t("Préparer") + '</span>';

  h += '<span class="potion-craft-inputs">';
  var inputs = ApothecaryManager.getInputs(potionId); // v3.363.0 : puits du roi (moitié moins d'eau)
  Object.keys(inputs).forEach(function (key) {
    var def = WAREHOUSE_RESOURCES[key];
    var have = WarehouseManager.getAmount(key);
    var enough = have >= inputs[key];
    h += '<span class="potion-craft-item' + (enough ? '' : ' is-missing') + '">';
    h += renderIconOrEmojiHTML(def ? def.icon : "", "potion-craft-icon", def ? _td(def.name) : key);
    h += formatNumber(inputs[key]);
    h += '</span>';
  });
  h += '</span>';

  if (!unlocked) {
    h += '<span class="potion-craft-locked"><img class=ico-inline src=images/Icons/system/lock_closed.png> ' + esc(ApothecaryManager.getLockReason(potionId)) + '</span>';
  } else if (capped && remaining <= 0) {
    h += '<span class="potion-craft-locked">' + _t("Fini pour aujourd’hui ({a}/{b})", { a: ApothecaryManager.getDailyCap(), b: ApothecaryManager.getDailyCap() }) + '</span>';
  } else if (ApothecaryManager.canAfford(potionId)) {
    h += '<button type="button" class="btn-buy potion-craft-btn" onclick="ApothecaryManager.craft(\'' + esc(potionId) + '\')">' + _t("Préparer") + '</button>';
  } else {
    h += '<button type="button" class="btn-buy cant-afford potion-craft-btn" disabled>' + _t("Préparer") + '</button>';
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
  var cap = typeof getPotionStockCap === "function" ? getPotionStockCap() : 9; // v3.322.0
  var isStockCapped = !!potion.perRun && stock >= cap;
  var canBuy = !isStockCapped && (game.gold || 0) >= cost;

  var h = '<div class="nb-purchase-card rarity-' + esc(potion.rarity) + (isLive ? ' is-active' : '') + '">';
  h += '<div class="nb-purchase-icon-col"><div class="nb-purchase-icon-slot">' + renderIconOrEmojiHTML(potion.icon, "nb-purchase-icon", _td(potion.name)) + '</div></div>';
  h += '<div class="nb-purchase-info-col">';
  h += '<div class="nb-purchase-name">' + esc(_td(potion.name)) + '</div>';
  h += '<div class="nb-purchase-desc">' + esc(_td(potion.desc)) + '</div>';
  h += '<div class="nb-purchase-meta"><img class=ico-inline src=images/Icons/subtabs/inventory.png> ' + (potion.perRun ? _t("Stock : {n} / {c}", { n: stock, c: cap }) : _t("Stock : {n}", { n: stock })) + '</div>';

  if (isLive) {
    h += '<div class="nb-purchase-meta"><img class=ico-inline src=images/Icons/village_buildings/apothecary.png> ' + _t("Active — mission en cours") + '</div>';
  } else if (isArmed) {
    h += '<div class="nb-purchase-meta"><img class=ico-inline src=images/Icons/subtabs/potions.png> ' + _t("Armée pour la prochaine mission") + '</div>';
  }

  h += '</div>';
  if (isStockCapped) {
    h += '<div class="nb-purchase-buy-col"><button class="btn-buy kbuy cant-afford" type="button" disabled>' + _t("STOCK PLEIN") + '</button></div>';
  } else {
    h += '<div class="nb-purchase-buy-col"><button class="btn-buy kbuy' + (canBuy ? '' : ' cant-afford') + '" onclick="PotionManager.buyPotion(\'' + esc(potion.id) + '\')"><img class="btn-buy-icon" src="images/Icons/gold_icon.png" alt="">' + formatNumber(cost) + '</button></div>';
  }
  h += '</div>'; // fin .nb-purchase-card

  /* v3.215.0 : la voie « préparer » est pleine largeur, donc SOUS la carte et
     non dans sa colonne d'achat. Les deux sont enveloppées ensemble pour que
     la grille les garde solidaires. */
  var craft = buildApothecaryCraftRowHTML(potion.id);
  return craft ? ('<div class="potion-entry">' + h + craft + '</div>') : h;
}

/* v3.260.0 (retour Seb) : les potions de mission n'apparaissent qu'une fois la première reçue
   (récompense du Roi des marais, forest_05). Avant, le Colporteur ne montre que le soin. */
function isPerRunPotionShopOpen() {
  var st = (game.storyQuests || {}).forest;
  if (!st || st.skipped || (st.claimedSteps || {}).forest_05) return true;
  var owned = game.potionsOwned || {};
  return Object.keys(owned).some(function (id) { return Number(owned[id] || 0) > 0; }); // save déjà équipée
}
window.isPerRunPotionShopOpen = isPerRunPotionShopOpen;

function buildPotionShopHTML() {
  // v3.260.0 : le soin passe en tête — c'est l'achat qui décide d'un combat.
  var h = buildHealingPotionShopHTML();

  if (isPerRunPotionShopOpen()) {
    h += '<div class="potion-section-label"><img class=ico-inline src=images/Icons/subtabs/potions.png> ' + _t("Potions de mission") + '</div>';
    h += '<div class="potion-grid">';
    (POTIONS_DB || []).forEach(function (potion) {
      h += buildPotionCardHTML(potion);
    });
    h += '</div>';
  }
  h += buildCombatItemShopHTML(); // v3.441.0

  return h;
}

/* v3.441.0 — OBJETS DE COMBAT : seulement préparés à l'Apothicaire (pas d'achat en or), rangés à l'Entrepôt.
   La section n'existe qu'une fois l'Apothicaire construit ; la commande ou le monde se lisent sur la ligne. */
function buildCombatItemShopHTML() {
  if (!window.CombatItems || !window.ApothecaryManager || ApothecaryManager.getLevel() <= 0) return "";
  var h = '<div class="potion-section-label"><img class=ico-inline src=images/Icons/village_buildings/apothecary.png> ' + _t("Préparations de combat") + '</div>';
  h += '<div class="potion-grid">';
  COMBAT_ITEM_ORDER.forEach(function (id) {
    var it = COMBAT_ITEMS[id], def = (typeof ENEMY_TRAIT_DEFS !== "undefined") ? ENEMY_TRAIT_DEFS[it.trait] : null;
    var st = def ? (window.COMBAT_STATES || {})[def.state] || {} : {};
    var c = '<div class="nb-purchase-card">';
    c += '<div class="nb-purchase-icon-col"><div class="nb-purchase-icon-slot">' + renderIconOrEmojiHTML(it.icon, "nb-purchase-icon", _td(it.name)) + '</div></div>';
    c += '<div class="nb-purchase-info-col">';
    c += '<div class="nb-purchase-name">' + esc(_td(it.name)) + '</div>';
    c += '<div class="nb-purchase-desc">' + esc(_td(it.desc)) + '</div>';
    if (it.con) c += '<div class="nb-purchase-desc"><b>' + esc(_td(it.con)) + '</b></div>';   // v3.442.0 : objet à contrepartie
    c += '<div class="nb-purchase-meta">' + (it.trait ? (st.icon ? '<img class="ico-inline" src="' + esc(st.icon) + '" alt=""> ' : '') + esc(_t("Contre : {t}", { t: st.nom ? _td(st.nom) : it.trait })) + ' · ' : '')
      + _t("Stock : {n}", { n: CombatItems.getStock(id) }) + '</div>';
    c += '</div></div>';
    h += '<div class="potion-entry">' + c + buildApothecaryCraftRowHTML(id) + '</div>';
  });
  h += '</div>';
  h += '<p class="potion-section-note">' + _t("Un objet s'emporte à la préparation de sortie et tient son trait tout seul. Potions et objets comptent ensemble dans les préparations du jour.") + '</p>';
  return h;
}
window.buildCombatItemShopHTML = buildCombatItemShopHTML;

function buildHealingPotionCardHTML(potion) {
  var stock = PotionManager.getHealingStock(potion.id);
  var cost = PotionManager.getCost(potion);
  // v3.291.0 : limite d'achat quotidienne (Soin majeur : 10)
  var buyLeft = PotionManager.getHealingBuyRemaining(potion.id);
  var canBuy = (game.gold || 0) >= cost && buyLeft > 0;

  var h = '<div class="nb-purchase-card">';
  h += '<div class="nb-purchase-icon-col"><div class="nb-purchase-icon-slot">' + renderIconOrEmojiHTML(potion.icon, "nb-purchase-icon", _td(potion.name)) + '</div></div>';
  h += '<div class="nb-purchase-info-col">';
  h += '<div class="nb-purchase-name">' + esc(_td(potion.name)) + '</div>';
  h += '<div class="nb-purchase-desc">' + _t("Restaure {p}% des PV max, à la demande depuis l’écran Combat.", { p: Math.round(potion.healPercent * 100) }) + '</div>';
  h += '<div class="nb-purchase-meta"><img class=ico-inline src=images/Icons/combat_status/heal_incoming.png> ' + _t("Stock : {n}", { n: stock }) + '</div>';
  if (buyLeft !== Infinity) {
    h += '<div class="nb-purchase-meta">' + _t("Colporteur : {a} / {b} aujourd’hui", { a: buyLeft, b: potion.dailyBuyLimit }) + '</div>';
  }
  h += '</div>';
  if (buyLeft <= 0) {
    h += '<div class="nb-purchase-buy-col"><button class="btn-buy kbuy cant-afford" type="button" disabled>' + _t("ÉPUISÉ") + '</button></div>';
  } else {
    h += '<div class="nb-purchase-buy-col"><button class="btn-buy kbuy' + (canBuy ? '' : ' cant-afford') + '" onclick="PotionManager.buyHealingPotion(\'' + esc(potion.id) + '\')"><img class="btn-buy-icon" src="images/Icons/gold_icon.png" alt="">' + formatNumber(cost) + '</button></div>';
  }
  h += '</div>'; // fin .nb-purchase-card

  var craft = buildApothecaryCraftRowHTML(potion.id);
  return craft ? ('<div class="potion-entry">' + h + craft + '</div>') : h;
}

function buildHealingPotionShopHTML() {
  var h = '<div class="potion-section-label"><img class=ico-inline src=images/Icons/combat_status/heal_incoming.png> ' + _t("Potions de soin (usage instantané)") + '</div>';
  h += '<div class="potion-grid">';
  (HEALING_POTIONS_DB || []).forEach(function (potion) {
    h += buildHealingPotionCardHTML(potion);
  });
  h += '</div>';
  return h;
}

window.buildPotionShopHTML = buildPotionShopHTML;
