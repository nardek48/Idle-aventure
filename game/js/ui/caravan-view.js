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
   ProductionManager.updateDOM() → refreshProductionSheetDOM(). Logique : CaravanManager.
   v3.457.0 : plusieurs caravanes (une par marché) — leurs blocs, puis le départ s'il reste une place. */

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

/* v3.426.0 : marché choisi (mapId), mémorisé sur l'appareil comme le trajet.
   v3.457.0 : seulement parmi les marchés sans caravane. */
function getCaravanSelectedMarket() {
  var list = CaravanManager.getMarkets().filter(function (m) { return !CaravanManager.get(m.world); });
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
  if (world >= 3) return "images/Maps/parcours/crypte_descente.jpg"; // v3.457.1 : la Crypte avait la route des Ruines
  if (world >= 2) return "images/Maps/parcours/ruines_route.jpg"; // v3.428.0 : fond des Ruines
  return world >= 1 ? "images/Maps/parcours/desert_route.jpg" : "images/Maps/parcours/foret_quetes.jpg";
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
    var busy = !!CaravanManager.get(m.world); // v3.457.0 : une caravane par marché
    h += '<button type="button" class="exp-world' + (sel && sel.mapId === m.mapId ? ' is-on' : '') + (busy ? ' is-busy' : '') + '"'
      + (busy ? ' disabled' : ' onclick="selectCaravanMarket(\'' + m.mapId + '\')"') + ' style="background-image:url(\'' + caravanRoadImageFor(m.world) + '\')">'
      + '<span class="exp-world-txt"><b>' + esc(_td(m.name)) + '</b>'
      + (busy ? '<small>' + esc(CaravanManager.isBack(m.world) ? _t("De retour") : _t("En route")) + '</small>'
        : rd ? '<small><img src="' + rd.icon + '" alt="">' + esc(_t("Long : {x}", { x: _td(rd.name) })) + '</small>' : '') + '</span></button>';
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

function buildCaravanChancesHTML(t, c) {
  if (!(t.rareChance > 0 || t.itemChance > 0)) return "";
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

  var reason = CaravanManager.getBlockReason(sel, caravanMarketWorld());
  h += '<div class="car-go"><button type="button" class="kbtn primary"' + (reason ? ' disabled' : ' onclick="departCaravanFromSheet()"') + '>'
    + '<span>' + esc(reason || _t("Partir · {d}", { d: formatTime(t.seconds) })) + '</span>'
    + (units > 0 ? '<small>' + _t("≈ {g} or au retour", { g: caravanGoldHTML(gold) }) + '</small>' : '')
    + '</button></div>';
  return h;
}

/* v3.457.0 : avec plusieurs caravanes, chaque bloc porte le nom de son marché. */
function caravanMarketHeadHTML(c) {
  if (CaravanManager.getMaxCaravans() <= 1 || !window.WORLDS || !WORLDS[c.world]) return "";
  return '<div class="car-h6">' + esc(_t("Marché · {x}", { x: _td(WORLDS[c.world].name) })) + '</div>';
}

function buildCaravanRouteHTML(c) {
  var t = CARAVAN_TRIPS[c.trip], w = c.world;
  var pct = CaravanManager.getProgressPct(w);
  var h = caravanMarketHeadHTML(c) + '<div class="car-road" style="background-image:url(\'' + caravanRoadImageFor(w) + '\')">';
  h += '<span class="car-pin" id="car-pin-' + w + '" style="left:' + (8 + pct * 0.84).toFixed(1) + '%"><img src="' + CARAVAN_ICON + '" alt=""></span>';
  h += '<span class="car-line"><i id="car-bar-' + w + '" style="width:' + pct.toFixed(1) + '%"></i></span>';
  h += '<span class="car-lbl"><span>' + _t("Village") + '</span><span>' + _t("Marché") + '</span></span></div>';
  h += '<div class="car-eta"><img class="ico-sys" src="images/Icons/system/hourglass_waiting.png" alt="">'
    + '<span class="car-eta-t"><small>' + esc(_t("Trajet {x} · retour dans", { x: caravanTripLabel(t).toLowerCase() })) + '</small>'
    + '<b id="car-left-' + w + '">' + esc(formatTime(CaravanManager.getSecondsLeft(w))) + '</b></span>'
    + '<span class="car-chip">≈ ' + caravanGoldHTML(c.gold) + '</span></div>';
  h += buildCaravanChancesHTML(t, c);
  // v3.457.5 (audit P17) : une caravane par marché — on annonce celles qui peuvent vraiment partir
  var max = Math.min(CaravanManager.getMaxCaravans(), Math.max(1, CaravanManager.getMarkets().length));
  h += '<p class="car-why">' + (max > 1 ? _t("Elle continue hors ligne. {n} caravanes à la fois, une par marché.", { n: max }) : _t("Elle continue hors ligne. Une seule caravane à la fois.")) + '</p>';
  if (CaravanManager.getMaxCaravans() > max) h += '<p class="car-why">' + _t("La Halle en permet plus : chaque nouveau marché ouvert ajoutera une caravane.") + '</p>';
  return h;
}

function buildCaravanBackHTML(c) {
  var t = CARAVAN_TRIPS[c.trip];
  var h = caravanMarketHeadHTML(c) + '<div class="car-back"><h4>' + _t("La caravane est rentrée !") + '</h4>';
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
  h += '</div><button type="button" class="kbtn primary" onclick="unloadCaravanFromSheet(' + c.world + ')">' + _t("Décharger") + '</button></div>';
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
  // v3.457.0 : les caravanes parties (la première rentrée d'abord), puis le départ s'il reste une place
  var now = CaravanManager._now(), h = "";
  CaravanManager.list().forEach(function (c) {
    h += now >= c.endsAt ? '<div class="car" data-car="back" data-world="' + c.world + '">' + buildCaravanBackHTML(c) + '</div>'
      : '<div class="car" data-car="route" data-world="' + c.world + '">' + buildCaravanRouteHTML(c) + '</div>';
  });
  if (CaravanManager.hasFreeSlot()) {
    if (getCaravanSelectedMarket()) h += '<div class="car" data-car="depart">' + buildCaravanDepartHTML() + '</div>';
    else h += '<p class="car-why car-note">' + esc(_t("Chaque marché ouvert a déjà sa caravane.")) + '</p>';
  } else {
    var next = CaravanManager.getNextCaravanLevel();
    if (next) h += '<p class="car-why car-note">' + esc(_t("Une caravane de plus à la Halle niveau {n}.", { n: next })) + '</p>';
  }
  return h;
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

/* world : le marché de la caravane à décharger ; sans argument, toutes celles qui sont rentrées. */
function unloadCaravanFromSheet(world) {
  var loot = CaravanManager.unload(world);
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
  if (!window.CaravanManager || !CaravanManager.getForMap(mapId)) return ""; // v3.457.0 : la caravane de CETTE carte
  var map = LIVING_MAPS[mapId], pos = CaravanManager.getMapPosition(mapId);
  if (!pos) return "";
  var v = map.village, m = map.caravanMarket;
  var h = '<svg class="lm-car-trail" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M' + v.x + ' ' + v.y + ' L' + m.x + ' ' + m.y + '" vector-effect="non-scaling-stroke"></path></svg>';
  h += '<span class="lm-car-market" style="left:' + m.x + '%;top:' + m.y + '%;">' + _t("Marché") + '</span>';
  h += '<button type="button" class="lm-caravan' + (pos.back ? ' is-back' : '') + (pos.outbound ? '' : ' is-return') + '" id="lm-caravan"'
    + ' style="left:' + pos.x.toFixed(2) + '%;top:' + pos.y.toFixed(2) + '%;" onclick="event.stopPropagation();goToCaravan()">'
    + '<img src="' + CARAVAN_ICON + '" alt="">'
    + '<span class="lm-caravan-tag" id="lm-caravan-tag">' + esc(pos.back ? _t("De retour") : formatTime(CaravanManager.getSecondsLeft(pos.world))) + '</span></button>';
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
  if (tag && !pos.back) tag.textContent = formatTime(CaravanManager.getSecondsLeft(pos.world));
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
  if (arrived) { rerenderCaravanSheet(); return; }
  // v3.457.0 : un bloc « en route » par caravane, repéré par son marché
  var routes = document.querySelectorAll("#exp-sheet-root .car[data-car='route']"), stale = false;
  Array.prototype.forEach.call(routes, function (el) {
    var w = Number(el.getAttribute("data-world"));
    if (!CaravanManager.isTraveling(w)) { stale = true; return; }
    var pct = CaravanManager.getProgressPct(w);
    var bar = document.getElementById("car-bar-" + w);
    if (bar) bar.style.width = pct.toFixed(1) + "%";
    var pin = document.getElementById("car-pin-" + w);
    if (pin) pin.style.left = (8 + pct * 0.84).toFixed(1) + "%";
    var left = document.getElementById("car-left-" + w);
    if (left) left.textContent = formatTime(CaravanManager.getSecondsLeft(w));
  });
  if (stale) rerenderCaravanSheet();
}
window.refreshCaravanDOM = refreshCaravanDOM;
