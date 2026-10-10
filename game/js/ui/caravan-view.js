"use strict";
/* ui/caravan-view.js — v3.419.0 (lot E-2) : la Caravane. Atelier validé : atelier-caravane.html,
   version C1 « Surplus auto ». v3.426.0 (chantier Expéditions) : elle quitte la feuille de la Halle
   pour Campement › Expéditions (feuille « Caravane », ui/expeditions-view.js), et l'on choisit
   son MARCHÉ (Forêt, Désert) sans changer de monde.

   Trois moments :
     - au départ  : trois trajets (Court / Moyen / Long), le chargement calculé, « Partir » ;
     - en route   : la piste, le compte à rebours, les chances du trajet Long ;
     - de retour  : le butin et « Décharger ».

   La feuille vit dans #exp-sheet-root (ui/expeditions-view.js). Le compte à
   rebours est tenu par refreshCaravanDOM(), appelé chaque seconde depuis
   ProductionManager.updateDOM() → refreshProductionSheetDOM(). Logique : CaravanManager. */

var CARAVAN_ICON = "images/Icons/village_buildings/caravan.png"; // icône de Seb (01/10/2026)

/* Trajet choisi au départ : mémorisé sur l'appareil, comme les filtres de l'Entrepôt. */
function getCaravanSelectedTrip() {
  var t = (window.Prefs && typeof Prefs.getValue === "function") ? Prefs.getValue("caravanTrip") : null;
  if (!t || !CARAVAN_TRIPS[t] || !CaravanManager.isTripOpen(t)) t = "moyen";
  return t;
}

function selectCaravanTrip(tripId) {
  if (!CARAVAN_TRIPS[tripId] || !CaravanManager.isTripOpen(tripId)) return;
  if (window.Prefs && typeof Prefs.setValue === "function") Prefs.setValue("caravanTrip", tripId);
  rerenderCaravanSheet();
}
window.selectCaravanTrip = selectCaravanTrip;

/* v3.426.0 : marché choisi (mapId), mémorisé sur l'appareil comme le trajet. */
function getCaravanSelectedMarket() {
  var list = CaravanManager.getMarkets();
  if (!list.length) return null;
  var want = (window.Prefs && typeof Prefs.getValue === "function") ? Prefs.getValue("caravanMarket") : null;
  var cur = window.PatrolManager ? PatrolManager.currentMapId() : null;
  return list.filter(function (m) { return m.mapId === want; })[0] || list.filter(function (m) { return m.mapId === cur; })[0] || list[0];
}

function selectCaravanMarket(mapId) {
  if (window.Prefs && typeof Prefs.setValue === "function") Prefs.setValue("caravanMarket", mapId);
  rerenderCaravanSheet();
}
window.selectCaravanMarket = selectCaravanMarket;

function caravanMarketWorld() { var m = getCaravanSelectedMarket(); return m ? m.world : undefined; }

function rerenderCaravanSheet() {
  if (typeof renderExpeditionsSheet === "function") renderExpeditionsSheet(); // v3.426.0
}

/* Noms des trajets, en toutes lettres pour l'audit de traduction. */
function caravanTripLabel(t) {
  var id = t && t.id;
  return id === "court" ? _t("Court") : id === "long" ? _t("Long") : _t("Moyen");
}

function caravanRareIcon() {
  var k = CaravanManager.getRareKey(caravanMarketWorld());
  return k ? WAREHOUSE_RESOURCES[k].icon : "";
}

function caravanGoldHTML(n) {
  return '<img class="car-gold" src="images/Icons/gold_icon.png" alt=""> ' + formatNumber(n);
}

/* Bannière de piste : celle du monde du marché (en route : celui du départ). */
function caravanRoadImageFor(world) {
  if (world >= 2) return "images/Maps/parcours/ruines_route.jpg"; // v3.428.0 : fond des Ruines
  return world >= 1 ? "images/Maps/parcours/desert_route.jpg" : "images/Maps/parcours/foret_quetes.jpg";
}
function caravanRoadImage() {
  var c = CaravanManager.get();
  var w = (c && typeof c.world === "number") ? c.world : caravanMarketWorld();
  return caravanRoadImageFor(typeof w === "number" ? w : (window.WorldManager ? Number(WorldManager.worldIndex || 0) : 0));
}

/* v3.426.0 : choix du marché, en vignettes (comme le monde d'une patrouille). */
function buildCaravanMarketsHTML() {
  var list = CaravanManager.getMarkets();
  if (!list.length) return "";
  var sel = getCaravanSelectedMarket();
  // v3.426.1 (retour Seb) : le marché reste visible même s'il n'y en a qu'un.
  var h = '<div class="car-h6">' + _t("Marché") + '</div><div class="exp-worlds' + (list.length === 1 ? ' is-single' : '') + '">';
  list.forEach(function (m) {
    var rk = CaravanManager.getRareKey(m.world), rd = rk ? WAREHOUSE_RESOURCES[rk] : null;
    h += '<button type="button" class="exp-world' + (sel && sel.mapId === m.mapId ? ' is-on' : '') + '" onclick="selectCaravanMarket(\'' + m.mapId + '\')" style="background-image:url(\'' + caravanRoadImageFor(m.world) + '\')">'
      + '<span class="exp-world-txt"><b>' + esc(_td(m.name)) + '</b>'
      + (rd ? '<small><img src="' + rd.icon + '" alt="">' + esc(_t("Long : {x}", { x: _td(rd.name) })) + '</small>' : '') + '</span></button>';
  });
  return h + '</div>';
}

function buildCaravanTripsHTML(sel) {
  var level = CaravanManager.getHallLevel();
  var h = '<div class="car-trips">';
  CARAVAN_TRIP_ORDER.forEach(function (id) {
    var t = CARAVAN_TRIPS[id], open = CaravanManager.isTripOpen(id, level);
    h += '<button type="button" class="car-trip' + (sel === id ? ' is-on' : '') + '"'
      + (open ? ' onclick="selectCaravanTrip(\'' + id + '\')"' : ' disabled') + '>';
    h += '<b>' + esc(caravanTripLabel(t)) + '</b><span class="car-trip-d">' + esc(formatTime(t.seconds)) + '</span>';
    if (open) {
      h += '<small>' + esc(_t("{n} unités", { n: formatNumber(CaravanManager.getCapacity(id, level)) })) + '</small>';
      h += '<small class="car-trip-pct">' + esc(_t("{p} % de la valeur", { p: Math.round(t.valuePct * 100) })) + '</small>';
    } else {
      h += '<small class="car-trip-lock"><img class="ico-sys" src="images/Icons/system/lock_closed.png" alt=""> '
        + esc(_t("Halle niveau {n}", { n: t.minHall })) + '</small>';
    }
    h += '<span class="car-trip-bonus">';
    if (t.rareChance > 0 && caravanRareIcon()) h += '<img src="' + caravanRareIcon() + '" alt="">';
    if (t.itemChance > 0) h += '<img src="images/Icons/equipment_icon/casque_rare.png" alt="">';
    h += '</span></button>';
  });
  h += '</div>';
  return h;
}

function buildCaravanChancesHTML(t) {
  if (!(t.rareChance > 0 || t.itemChance > 0)) return "";
  var c = CaravanManager.get();
  var rk = CaravanManager.getRareKey(c && typeof c.world === "number" ? c.world : caravanMarketWorld());
  var h = '<div class="car-hope">';
  if (t.rareChance > 0 && rk) h += '<span><img src="' + WAREHOUSE_RESOURCES[rk].icon + '" alt="">'
    + esc(_t("{p} % : {x}", { p: Math.round(t.rareChance * 100), x: _td(WAREHOUSE_RESOURCES[rk].name) })) + '</span>';
  if (t.itemChance > 0) h += '<span><img src="images/Icons/equipment_icon/casque_rare.png" alt="">'
    + esc(_t("{p} % : un objet", { p: Math.round(t.itemChance * 100) })) + '</span>';
  return h + '</div>';
}

function buildCaravanDepartHTML() {
  var sel = getCaravanSelectedTrip(), t = CARAVAN_TRIPS[sel];
  var load = CaravanManager.computeLoad(sel);
  var units = CaravanManager.getLoadUnits(load), cap = CaravanManager.getCapacity(sel);
  var gold = CaravanManager.getLoadGold(load, sel);

  var h = buildCaravanMarketsHTML() + '<div class="car-h6">' + _t("Trajet") + '</div>' + buildCaravanTripsHTML(sel);
  h += buildCaravanChancesHTML(t);

  h += '<div class="car-load"><div class="car-load-h"><b>' + _t("Chargement") + '</b><span>'
    + formatNumber(units) + ' / ' + formatNumber(cap) + '</span></div>';
  if (units > 0) {
    h += '<div class="car-chips">';
    Object.keys(load).forEach(function (k) {
      var d = WAREHOUSE_RESOURCES[k];
      h += '<span class="car-chip">' + renderIconOrEmojiHTML(d.icon, "car-chip-ico", _td(d.name)) + formatNumber(load[k]) + '</span>';
    });
    h += '</div>';
  } else {
    h += '<div class="car-empty">' + _t("Rien à vendre : aucune matière brute ne dépasse la moitié de son plafond.") + '</div>';
  }
  h += '<p class="car-why">' + _t("La caravane prend d'abord ce qui est au plafond, à parts égales. Elle laisse toujours la moitié du plafond et la réserve protégée de l'Entrepôt.") + ' ' + _t("Le Bois et le Fer restent au village.") + '</p></div>';

  var reason = CaravanManager.getBlockReason(sel);
  h += '<div class="car-go"><button type="button" class="kbtn primary"' + (reason ? ' disabled' : ' onclick="departCaravanFromSheet()"') + '>'
    + '<span>' + esc(reason || _t("Partir · {d}", { d: formatTime(t.seconds) })) + '</span>'
    + (units > 0 ? '<small>' + _t("≈ {g} or au retour", { g: caravanGoldHTML(gold) }) + '</small>' : '')
    + '</button></div>';
  return h;
}

function buildCaravanRouteHTML() {
  var c = CaravanManager.get(), t = CARAVAN_TRIPS[c.trip];
  var pct = CaravanManager.getProgressPct();
  var h = '<div class="car-road" style="background-image:url(\'' + caravanRoadImage() + '\')">';
  h += '<span class="car-pin" id="car-pin" style="left:' + (8 + pct * 0.84).toFixed(1) + '%"><img src="' + CARAVAN_ICON + '" alt=""></span>';
  h += '<span class="car-line"><i id="car-bar" style="width:' + pct.toFixed(1) + '%"></i></span>';
  h += '<span class="car-lbl"><span>' + _t("Village") + '</span><span>' + _t("Marché") + '</span></span></div>';
  h += '<div class="car-eta"><img class="ico-sys" src="images/Icons/system/hourglass_waiting.png" alt="">'
    + '<span class="car-eta-t"><small>' + esc(_t("Trajet {x} · retour dans", { x: caravanTripLabel(t).toLowerCase() })) + '</small>'
    + '<b id="car-left">' + esc(formatTime(CaravanManager.getSecondsLeft())) + '</b></span>'
    + '<span class="car-chip">≈ ' + caravanGoldHTML(c.gold) + '</span></div>';
  h += buildCaravanChancesHTML(t);
  h += '<p class="car-why">' + _t("Elle continue hors ligne. Une seule caravane à la fois.") + '</p>';
  return h;
}

function buildCaravanBackHTML() {
  var c = CaravanManager.get(), t = CARAVAN_TRIPS[c.trip];
  var h = '<div class="car-back"><h4>' + _t("La caravane est rentrée !") + '</h4>';
  h += '<span class="car-why">' + esc(_t("Trajet {x} · {n} unités vendues", { x: caravanTripLabel(t).toLowerCase(), n: formatNumber(CaravanManager.getLoadUnits(c.cargo)) })) + '</span>';
  h += '<div class="car-loot">';
  h += '<span class="car-lt"><img src="images/Icons/gold_icon.png" alt="">' + formatNumber(c.gold) + '<small>' + _t("or") + '</small></span>';
  if (c.rare && WAREHOUSE_RESOURCES[c.rare.key]) {
    var rd = WAREHOUSE_RESOURCES[c.rare.key];
    h += '<span class="car-lt is-rare"><img src="' + rd.icon + '" alt="">×' + c.rare.n + '<small>' + esc(_td(rd.name)) + '</small></span>';
  }
  if (c.item) {
    var icon = (typeof getEquipmentIconPath === "function") ? getEquipmentIconPath(c.item) : "images/Icons/equipment_icon/casque_rare.png";
    h += '<span class="car-lt is-item"><img src="' + icon + '" alt="">' + esc(_td(c.item.name)) + '<small>'
      + esc(_td((typeof RARITY_LABELS !== "undefined" && RARITY_LABELS[c.item.rarity]) || c.item.rarity)) + '</small></span>';
  }
  h += '</div><button type="button" class="kbtn primary" onclick="unloadCaravanFromSheet()">' + _t("Décharger") + '</button></div>';
  return h;
}

/* Contenu de la feuille « Caravane » (Campement › Expéditions). */
function buildCaravanHTML() {
  if (!window.CaravanManager) return "";
  // v3.436.5 : sans Halle marchande, la feuille était vide ; elle dit où bâtir la caravane
  if (!CaravanManager.isAvailable()) {
    return '<div class="car" data-car="locked"><div class="car-back"><h4>' + _t("Pas encore de caravane") + '</h4>'
      + '<span class="car-why">' + esc(_t("La caravane part de la Halle marchande. Bâtis-la au Village.")) + '</span>'
      + '<button type="button" class="kbtn primary" onclick="goToCaravanHall()">' + _t("Voir la Halle marchande") + '</button></div></div>';
  }
  if (CaravanManager.isBack()) return '<div class="car" data-car="back">' + buildCaravanBackHTML() + '</div>';
  if (CaravanManager.isTraveling()) return '<div class="car" data-car="route">' + buildCaravanRouteHTML() + '</div>';
  return '<div class="car" data-car="depart">' + buildCaravanDepartHTML() + '</div>';
}
window.buildCaravanHTML = buildCaravanHTML;

/* v3.436.5 : fiche de la Halle marchande au Village (coût, prérequis), depuis la feuille ou l'Histoire. */
function goToCaravanHall() {
  if (typeof closeExpeditionsSheet === "function") closeExpeditionsSheet();
  if (typeof switchTab === "function") switchTab("village");
  if (typeof setVillageSubTab === "function") setVillageSubTab("buildings");
  if (typeof openVillageBuildingSheet === "function") openVillageBuildingSheet("hall");
}
window.goToCaravanHall = goToCaravanHall;

function departCaravanFromSheet() {
  if (CaravanManager.depart(getCaravanSelectedTrip(), caravanMarketWorld())) {
    rerenderCaravanSheet();
    if (typeof renderPanel === "function") renderPanel(); // stocks de l'Entrepôt, pastilles
  }
}
window.departCaravanFromSheet = departCaravanFromSheet;

function unloadCaravanFromSheet() {
  var loot = CaravanManager.unload();
  if (!loot) return;
  if (typeof showToast === "function") showToast("🐪 " + _t("+{n} or", { n: formatNumber(loot.gold) }), 1800);
  if (typeof renderAll === "function") renderAll(); else if (typeof renderPanel === "function") renderPanel();
  rerenderCaravanSheet();
}
window.unloadCaravanFromSheet = unloadCaravanFromSheet;

/* v3.420.0 (E-3) : la caravane sur la carte vivante de son monde. Aller vers le marché la
   première moitié du trajet, retour la seconde ; rentrée, elle attend au village avec son
   ruban. La toucher ouvre sa feuille, dans Campement › Expéditions (v3.426.0). */
function buildLivingMapCaravanHTML(mapId) {
  if (!window.CaravanManager || CaravanManager.getMapId() !== mapId) return "";
  var map = LIVING_MAPS[mapId], pos = CaravanManager.getMapPosition(mapId);
  if (!pos) return "";
  var v = map.village, m = map.caravanMarket;
  var h = '<svg class="lm-car-trail" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M' + v.x + ' ' + v.y + ' L' + m.x + ' ' + m.y + '" vector-effect="non-scaling-stroke"></path></svg>';
  h += '<span class="lm-car-market" style="left:' + m.x + '%;top:' + m.y + '%;">' + _t("Marché") + '</span>';
  h += '<button type="button" class="lm-caravan' + (pos.back ? ' is-back' : '') + (pos.outbound ? '' : ' is-return') + '" id="lm-caravan"'
    + ' style="left:' + pos.x.toFixed(2) + '%;top:' + pos.y.toFixed(2) + '%;" onclick="event.stopPropagation();goToCaravan()">'
    + '<img src="' + CARAVAN_ICON + '" alt="">'
    + '<span class="lm-caravan-tag" id="lm-caravan-tag">' + esc(pos.back ? _t("De retour") : formatTime(CaravanManager.getSecondsLeft())) + '</span></button>';
  return h;
}
window.buildLivingMapCaravanHTML = buildLivingMapCaravanHTML;

/* De la carte (ou de la Halle) vers sa feuille, dans Campement › Expéditions (v3.426.0). */
function goToCaravan() {
  if (typeof isLivingMapOpen === "function" && isLivingMapOpen() && typeof closeLivingMap === "function") closeLivingMap();
  if (typeof closeVillageBuildingSheet === "function" && typeof openVillageBuildingId !== "undefined" && openVillageBuildingId) closeVillageBuildingSheet();
  if (typeof goToExpeditions === "function") goToExpeditions("caravan");
}
window.goToCaravan = goToCaravan;

function refreshLivingMapCaravanDOM(arrived) {
  var el = document.getElementById("lm-caravan");
  if (!el) return;
  if (arrived) { if (typeof refreshLivingMap === "function") refreshLivingMap(); return; }
  var root = document.getElementById("lmx-root");
  var pos = root ? CaravanManager.getMapPosition(root.getAttribute("data-map")) : null;
  if (!pos) return;
  el.style.left = pos.x.toFixed(2) + "%";
  el.style.top = pos.y.toFixed(2) + "%";
  el.classList.toggle("is-return", !pos.outbound);
  var tag = document.getElementById("lm-caravan-tag");
  if (tag && !pos.back) tag.textContent = formatTime(CaravanManager.getSecondsLeft());
}

/* Chaque seconde : annonce du retour, compte à rebours, et bascule de la feuille
   quand la caravane arrive pendant qu'on la regarde. */
function refreshCaravanDOM() {
  if (!window.CaravanManager) return;
  var arrived = CaravanManager.checkArrival();
  if (typeof document === "undefined") return;
  refreshLivingMapCaravanDOM(arrived); // v3.420.0 : la carte vivante, si elle est ouverte
  var box = document.querySelector ? document.querySelector("#exp-sheet-root .car") : null;
  if (!box) {
    if (arrived && (game.activeTab === "village" || game.activeTab === "campement") && typeof renderPanel === "function") renderPanel(); // ruban « De retour », tableau des départs
    return;
  }
  var state = box.getAttribute("data-car");
  if ((state === "route" && !CaravanManager.isTraveling()) || arrived) { rerenderCaravanSheet(); return; }
  if (state !== "route") return;
  var pct = CaravanManager.getProgressPct();
  var bar = document.getElementById("car-bar");
  if (bar) bar.style.width = pct.toFixed(1) + "%";
  var pin = document.getElementById("car-pin");
  if (pin) pin.style.left = (8 + pct * 0.84).toFixed(1) + "%";
  var left = document.getElementById("car-left");
  if (left) left.textContent = formatTime(CaravanManager.getSecondsLeft());
}
window.refreshCaravanDOM = refreshCaravanDOM;
