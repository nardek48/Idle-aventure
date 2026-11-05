"use strict";
/* ui/village-event-view.js — v3.604.0 (atelier evenements-village) : la carte « Ce matin à Aeswyn » en tête du Village,
   la ligne « Au matin » de l'écran de la nuit, et la pastille de l'onglet Village. */

// Icône d'événement : tant que l'image manque, l'icône générique (règle « icône manquante »), sans emprunt.
function villageEventIconHTML(type, cls) {
  var src = VILLAGE_EVENT_ICONS[type] || "";
  return '<img class="' + cls + '" src="' + esc(src) + '" alt="" onerror="this.onerror=null;this.dataset.missing=this.src;'
    + 'if(window.MISSING_ICONS&&MISSING_ICONS.indexOf(this.src)<0)MISSING_ICONS.push(this.src);this.src=\'images/Icons/system/search_unknown.webp\'">';
}

function villageEventResChipsHTML(res, check) {
  return Object.keys(res).map(function (r) {
    var def = (window.WAREHOUSE_RESOURCES || {})[r] || {}, have = window.WarehouseManager ? WarehouseManager.getAmount(r) : 0, short = check && have < res[r];
    return '<span class="pc-skill-chip' + (short ? ' is-short' : '') + '">' + renderIconOrEmojiHTML(def.icon || "", "pc-skill-chip-img", "") + res[r] + ' ' + esc(_td(def.name || r))
      + (check ? ' <small>(' + formatNumber(have) + ')</small>' : '') + '</span>';
  }).join("");
}

function buildVillageEventCardHTML() {
  if (!window.VillageEvents) return "";
  var V = VillageEvents, v = V.active(), e = V.def();
  if (!v || !e) return "";
  var left = V.daysLeft(), gain = "", act = "";
  if (e.type === "rumeur") {
    gain = _t("{x} : +{p} % de butin et +{n} de la ressource rare à sa destination.", { x: V.sectorName(v), p: Math.round((V.rumorLootMult() - 1) * 100), n: V.rumorRare() });
    act = '<button type="button" class="kbtn primary" onclick="villageEventGo()">' + esc(_t("Voir sur la carte")) + '</button>';
  } else if (e.type === "demande") {
    var gifts = V.rewardGifts(), gl = Object.keys(gifts).map(function (r) { return _td(((window.WAREHOUSE_RESOURCES || {})[r] || {}).name || r) + " ×" + gifts[r]; }).join(", "); // « Lingot ×2 » : pas d'accord à faire
    gain = _t("Récompense : {g} or et {x}.", { g: formatNumber(V.rewardGold()), x: gl });
    act = v.done ? '<span class="vev-done">✓ ' + esc(_t("Livré")) + '</span>'
      : '<button type="button" class="kbtn primary" onclick="villageEventDeliver()"' + (V.canDeliver() ? '' : ' disabled') + '>' + esc(_t("Livrer")) + '</button>';
  } else if (e.type === "marche") {
    gain = _t("L'échoppe : une pièce de plus et −{p} % sur tout. Et Sarkel rachète tes ressources rares.", { p: Math.round((1 - VILLAGE_EVENT_MARKET.discount) * 100) });
    act = '<button type="button" class="kbtn primary" onclick="villageEventShop()">' + esc(_t("Aller à l'échoppe")) + '</button>';
  } else if (e.type === "cadeau") { // v3.607.0 (E3) : une suite qui offre
    var gl2 = V.giftList();
    gain = gl2 ? _t("Cadeau : {x}.", { x: Object.keys(gl2).map(function (r) { return _td(((window.WAREHOUSE_RESOURCES || {})[r] || {}).name || r) + " ×" + gl2[r]; }).join(", ") }) : (e.giftSlot === "weapon" ? _t("Cadeau : une arme forgée pour toi.") : _t("Cadeau : une pièce d'équipement forgée pour toi.")); // v3.621.0 : la lame de Brannoc
    act = v.done ? '<span class="vev-done">✓ ' + esc(_t("Reçu")) + '</span>' : '<button type="button" class="kbtn primary" onclick="villageEventClaim()">' + esc(_t("Recevoir")) + '</button>';
  } else if (e.type === "palissade") {
    gain = _t("La Palissade freine {p} % d'échecs de plus sur les cartes vivantes, le temps du compte.", { p: Math.round(VILLAGE_EVENT_PALISADE * 100) });
  } else if (e.type === "fete") {
    gain = _t("Le camp soigne tout le monde, et les {n} sorties suivantes rapportent +{p} % d'or.", { n: VILLAGE_EVENT_FETE.sorties, p: Math.round((VILLAGE_EVENT_FETE.goldMult - 1) * 100) });
    act = v.done ? '<span class="vev-done">✓ ' + esc(_tn(V.feteLeft(), "Fête lancée · encore {n} sortie", "Fête lancée · encore {n} sorties")) + '</span>'
      : '<button type="button" class="kbtn primary" onclick="villageEventFete()"' + (V.canFete() ? '' : ' disabled') + '>' + esc(_t("Lancer la fête")) + '</button>';
  }
  var h = '<div class="vev"><div class="vev-k"><span>' + esc(_t("Ce matin à Aeswyn")) + '</span><span class="vev-left">' + esc(_tn(left, "encore {n} jour", "encore {n} jours")) + '</span></div>';
  h += '<div class="vev-main">' + villageEventIconHTML(e.type, "vev-ico") + '<div><b>' + esc(V.titleOf(e, v)) + '</b><small>' + esc(_td(e.who)) + '</small><p>' + esc(V.textOf(e, v)) + '</p></div></div>';
  if (e.type === "demande" && !v.done) h += '<div class="vev-cost">' + villageEventResChipsHTML(V.needs(), true) + '</div>';
  if (e.type === "fete" && !v.done && V.feteCost() > 0) h += '<div class="vev-cost">' + villageEventResChipsHTML({ pain: V.feteCost() }, true) + '</div>';
  if (e.type === "marche") h += villageEventBuybackHTML(); // v3.606.0 (D2)
  return h + '<div class="vev-gain">' + esc(gain) + '</div><div class="vev-act">' + act + '</div></div>';
}

/* v3.606.0 (D2) : « Sarkel rachète » — une ligne par ressource rare dont l'Entrepôt a un lot, dans la limite du marché. */
function villageEventBuybackHTML() {
  var V = VillageEvents, list = V.buybackList(), left = V.buybackLotsLeft(), B = VILLAGE_EVENT_BUYBACK;
  var h = '<div class="vev-buy"><div class="vev-buy-h"><b>' + esc(_t("Sarkel rachète")) + '</b><small>' + esc(_tn(left, "encore {n} lot ce marché", "encore {n} lots ce marché")) + '</small></div>';
  if (!list.length) return h + '<p class="vev-buy-none">' + esc(_t("Rien à lui vendre : il prend les ressources rares par lots de {n}.", { n: B.lot })) + '</p></div>';
  list.forEach(function (x) {
    var def = (window.WAREHOUSE_RESOURCES || {})[x.res] || {};
    h += '<div class="vev-buy-row">' + renderIconOrEmojiHTML(def.icon || "", "vev-buy-ico", "") + '<span>' + esc(_t("{n} {x} · {g} or", { n: B.lot, x: _td(def.name || x.res), g: formatNumber(x.gold) }))
      + ' <small>(' + formatNumber(WarehouseManager.getAmount(x.res)) + ')</small></span><button type="button" class="kbtn" onclick="villageEventSell(\'' + x.res + '\')"' + (left > 0 ? '' : ' disabled') + '>' + esc(_t("Vendre")) + '</button></div>';
  });
  return h + '</div>';
}
function villageEventSell(res) { if (VillageEvents.sellLot(res) && typeof renderPanel === "function") renderPanel(); }

// La ligne « Au matin » de l'écran de la nuit (camp-view.js).
function villageEventMorningHTML(night) {
  var e = night && night.event && window.VillageEvents ? VillageEvents.get(night.event) : null;
  if (!e) return "";
  return '<div class="wn-morn">' + villageEventIconHTML(e.type, "wn-morn-ico") + '<div><b>' + esc(_t("Au matin")) + '</b><span>' + esc(_t("{a} : {b}", { a: _td(e.who), b: VillageEvents.titleOf(e) })) + '</span></div></div>';
}

function villageEventGo() {
  var v = VillageEvents.active();
  if (v && v.mapId && typeof openLivingMap === "function") openLivingMap(v.mapId, v.sector);
}
function villageEventDeliver() { if (VillageEvents.deliver() && typeof renderPanel === "function") renderPanel(); }
function villageEventClaim() { if (VillageEvents.claim() && typeof renderPanel === "function") renderPanel(); }
function villageEventFete() { if (VillageEvents.startFete() && typeof renderPanel === "function") renderPanel(); }
// L'échoppe vit à la Halle (segment « Échoppe »).
function villageEventShop() {
  if (typeof hallSheetSegment !== "undefined") hallSheetSegment = "shop";
  if (typeof openVillageBuildingSheet === "function") openVillageBuildingSheet("hall");
}

// Pastille « ! » sur l'onglet Village : une demande livrable, une fête à lancer (éteinte sur le Village).
function refreshTabVillageBadge() {
  if (typeof document === "undefined" || !window.VillageEvents) return;
  var on = VillageEvents.hasAction() && game.activeTab !== "village";
  var frame = document.querySelector('.tab-btn[data-tab="village"] .tab-icon-frame');
  if (!frame) return;
  var b = frame.querySelector(".tab-claim-badge");
  if (on && !b) frame.insertAdjacentHTML("beforeend", '<span class="tab-claim-badge" aria-hidden="true">!</span>');
  else if (!on && b) b.remove();
}

window.buildVillageEventCardHTML = buildVillageEventCardHTML;
window.villageEventMorningHTML = villageEventMorningHTML;
window.villageEventGo = villageEventGo;
window.villageEventDeliver = villageEventDeliver;
window.villageEventFete = villageEventFete;
window.villageEventShop = villageEventShop;
window.villageEventSell = villageEventSell;
window.villageEventClaim = villageEventClaim;
window.refreshTabVillageBadge = refreshTabVillageBadge;
