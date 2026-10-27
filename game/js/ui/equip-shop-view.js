"use strict";
/* ui/equip-shop-view.js — sous-onglet Équipement de la Boutique (voir shop-view.js pour la bascule d'onglets). Détail : COMMENTAIRES_ORIGINAUX.md */

function buildEquipShopCardHTML(item) {
  if (item && item.kind === "relic") return buildRelicShopCardHTML(item); // v3.512.0
  var statText = typeof formatEquipmentStat === "function" ? formatEquipmentStat(item) : "";
  var rarityLabel = (typeof RARITY_LABELS !== "undefined" && RARITY_LABELS[item.rarity]) ? _td(RARITY_LABELS[item.rarity]) : item.rarity;
  var canBuy = !item.bought && (game.gold || 0) >= item.price;

  var h = '<div class="nb-purchase-card rarity-' + esc(item.rarity) + (item.bought ? ' is-bought' : '') + '">';
  h += '<div class="nb-purchase-icon-col"><div class="nb-purchase-icon-slot">' + buildEquipmentIconHTML(item, "nb-purchase-icon rframe") + '</div></div>';
  h += '<div class="nb-purchase-info-col">';
  h += '<div class="nb-purchase-name rarity-' + esc(item.rarity) + '">' + esc(_td(item.name)) + '</div>';
  // v3.492.11 (L1) : le monde d'origine à côté de la rareté
  var monde = (window.WORLDS || [])[typeof item.worldIndex === "number" ? item.worldIndex : 0];
  h += '<div class="nb-purchase-meta">' + esc(rarityLabel) + (monde ? ' · ' + esc(_td(monde.name)) : '') + '</div>';
  if (typeof buildEquipmentCompareLinesHTML === "function") {
    h += buildEquipmentCompareLinesHTML(item, game.equipped ? game.equipped[item.slot] : null); // v3.226.0 : delta par ligne face à l'équipé
  } else {
    h += '<div class="nb-purchase-desc">' + esc(statText) + '</div>';
  }
  if (typeof buildEquipmentPowerHTML === "function") h += buildEquipmentPowerHTML(item); // v3.230.0
  if (typeof buildItemStoryCountHTML === "function") h += buildItemStoryCountHTML(item, false); // v3.492.11 (L3)
  h += '</div>';

  h += '<div class="nb-purchase-buy-col">';
  if (item.bought) {
    h += '<button class="btn-buy kbuy is-bought" type="button" disabled>' + _t("Acheté") + '</button>';
  } else {
    h += '<button class="btn-buy kbuy' + (canBuy ? '' : ' cant-afford') + '" type="button" onclick="equipShopBuy(\'' + esc(item.uid) + '\')"><img class="btn-buy-icon" src="images/Icons/gold_icon.webp" alt="">' + formatNumber(item.price) + '</button>';
  }
  h += '</div>';

  h += '</div>';
  return h;
}

/* v3.512.0 (atelier reliques-echoppe.html, variante B) : carte marquée « Relique », couleur du monde,
   une pastille par compagnon qui a un emplacement ouvert (libre, mieux, ou rien à gagner). */
function relicShopFit(cid, item) {
  var CR = CompanionRelics, open = CR.slotsOpen(cid);
  if (open <= 0) return null;
  var same = CR.active(cid).filter(function (r) { return r.f === item.f; })[0];
  if (same) return same.w < item.w ? "up" : "no";
  return CR.worn(cid).slice(0, open).some(function (x) { return x == null || !CR.byId(x); }) ? "free" : "no";
}
function buildRelicShopCardHTML(item) {
  var CR = CompanionRelics, r = { f: item.f, w: item.w }, rar = CR.rarity(r), rank = CR.rank(r), monde = (window.WORLDS || [])[item.w];
  var canBuy = !item.bought && (game.gold || 0) >= item.price;
  var h = '<div class="nb-purchase-card shop-relic rarity-' + rar + (item.bought ? ' is-bought' : '') + '"><span class="shop-relic-ribbon">' + esc(_t("Relique")) + '</span>';
  h += '<div class="nb-purchase-icon-col"><div class="nb-purchase-icon-slot shop-relic-ico"><img class="cp-relic-img" src="' + esc(CR.icon(r)) + '" alt=""><span class="shop-relic-rank">' + rank + '</span></div></div>';
  h += '<div class="nb-purchase-info-col"><div class="nb-purchase-name rarity-' + rar + '">' + esc(CR.name(r)) + '</div>';
  h += '<div class="nb-purchase-meta">' + esc(_t("Rang {n}", { n: rank })) + (monde ? ' · ' + esc(_td(monde.name)) : '') + '</div>';
  h += '<div class="shop-relic-fx">' + esc(CR.effectText(r)) + '</div><div class="shop-relic-rule">' + esc(_t("Une par famille sur un même compagnon")) + '</div></div>';
  h += '<div class="nb-purchase-buy-col">' + (item.bought
    ? '<button class="btn-buy kbuy is-bought" type="button" disabled>' + _t("Acheté") + '</button>'
    : '<button class="btn-buy kbuy' + (canBuy ? '' : ' cant-afford') + '" type="button" onclick="equipShopBuy(\'' + esc(item.uid) + '\')"><img class="btn-buy-icon" src="images/Icons/gold_icon.webp" alt="">' + formatNumber(item.price) + '</button>') + '</div>';
  var chips = (window.CompanionManager ? CompanionManager.unlockedIds() : []).map(function (cid) {
    var fit = relicShopFit(cid, item), def = typeof getCompanionDef === "function" ? getCompanionDef(cid) : null;
    if (!fit || !def) return "";
    var label = fit === "free" ? _t("libre") : fit === "up" ? "↑ " + _t("mieux") : "—";
    return '<span class="shop-relic-chip is-' + fit + '"><img src="' + esc(def.image || "") + '" alt="">' + esc(_td(def.name)) + ' ' + esc(label) + '</span>';
  }).join("");
  h += '<div class="shop-relic-party">' + (chips || '<span class="shop-relic-none">' + esc(_t("Aucun compagnon n'a encore d'emplacement ouvert")) + '</span>') + '</div>';
  return h + '</div>';
}

function buildEquipShopHTML() {
  if (window.EquipShopManager && typeof EquipShopManager.checkRefresh === "function") {
    EquipShopManager.checkRefresh();
  }

  var manualCost = EquipShopManager.getManualRefreshCost();
  var canRefresh = (game.gold || 0) >= manualCost;

  var h = '<div class="equip-shop-timer"><img class=ico-inline src=images/Icons/system/reset.webp> ' + esc(_t("Renouvellement gratuit dans {d}", { d: EquipShopManager.timeUntilRefresh() })) + '</div>';

  /* v3.216.0 : quand la Halle marchande agrandit la vitrine, l'écran le dit —
     sinon le joueur paie un chantier sans jamais voir ce qu'il a acheté. */
  var hallLevel = (window.VillageBuildingManager && typeof VillageBuildingManager.getLevel === "function")
    ? VillageBuildingManager.getLevel("hall") : 0;
  if (hallLevel > 0) {
    var remise = Math.round((1 - EquipShopManager.getRefreshDiscount()) * 100);
    h += '<div class="equip-shop-hall-note"><img class=ico-inline src=images/Icons/subtabs/equipment_shop.webp> ' + _t("Halle marchande niv. {n} — {e} emplacements", { n: hallLevel, e: EquipShopManager.getShopSize() })
      + (remise > 0 ? ', ' + _t("renouvellement -{p} %", { p: remise }) : '') + '</div>';
  }
  h += '<button class="settings-btn' + (canRefresh ? '' : ' disabled') + '" type="button" ' + (canRefresh ? 'onclick="equipShopRefresh()"' : 'disabled') + '><img class=ico-inline src=images/Icons/system/reset.webp> ' + _t("Renouveler maintenant ({n} or)", { n: formatNumber(manualCost) }) + '</button>';
  h += '<div class="equip-shop-grid">';

  (game.equipShopStock || []).forEach(function (item) {
    h += buildEquipShopCardHTML(item);
  });

  h += '</div>';
  return h;
}

window.buildEquipShopHTML = buildEquipShopHTML;

/* v3.424.0 (chantier Héros, H-1) : la Boutique vit aussi dans la feuille de la Halle, rendue
   hors de renderPanel() : après un achat ou un renouvellement, on la redessine. */
function refreshHallShopSheet() {
  if (typeof openVillageBuildingId !== "undefined" && openVillageBuildingId === "hall" && typeof openVillageBuildingSheet === "function") openVillageBuildingSheet("hall");
}
function equipShopBuy(uid) { EquipShopManager.buy(uid); refreshHallShopSheet(); }
function equipShopRefresh() { EquipShopManager.manualRefresh(); refreshHallShopSheet(); }
window.equipShopBuy = equipShopBuy;
window.equipShopRefresh = equipShopRefresh;
