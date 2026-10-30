"use strict";
/* ui/grand-ouvrage-view.js — v3.561.0 (retour Seb, point 9 ; atelier grand-ouvrage.html, fiche B) : la carte du
   Grand Ouvrage en tête des bâtiments du Village, et sa fiche (bonus, jauge, « Verser le surplus »,
   « Choisir quoi verser » dépliable). Logique : systems/grand-ouvrage-system.js. */

var GRAND_OUVRAGE_ICON = "images/Icons/village_buildings/grand_ouvrage.webp"; // v3.566.0 : image livrée
var grandOuvrageListOpen = false;   // « Choisir quoi verser » déplié
var grandOuvragePick = {};          // quantités choisies à la main, { key: n }
var grandOuvrageFlash = "";         // bandeau après un palier franchi

function grandOuvrageIconHTML(cls) {
  return '<img class="' + cls + '" src="' + GRAND_OUVRAGE_ICON + '" alt="" onerror="this.onerror=null;this.dataset.missing=this.src;'
    + 'if(window.MISSING_ICONS&&MISSING_ICONS.indexOf(this.src)<0)MISSING_ICONS.push(this.src);this.src=\'images/Icons/system/search_unknown.webp\'">';
}

/* Carte de la grille des bâtiments (sur le modèle de buildVillageBuildingCardHTML). */
function buildGrandOuvrageCardHTML() {
  if (!window.GrandOuvrage || !GrandOuvrage.isOpen()) return "";
  var p = GrandOuvrage.getProgress(), surplus = GrandOuvrage.getSurplusLoad().points > 0;
  var h = '<button type="button" class="vb-card is-built go-card" onclick="openGrandOuvrageSheet()">';
  if (p.tier > 0) h += '<span class="vb-card-lvl">' + p.tier + '</span>';
  if (surplus) h += '<span class="vb-card-flag is-good">' + _t("À verser") + '</span>';
  h += '<div class="vb-card-top">' + grandOuvrageIconHTML("vb-card-icon") + '<div class="vb-card-name">' + _t("Le Grand Ouvrage") + '</div></div>';
  h += '<div class="vb-card-status">' + _t("+{p} % d'or", { p: Math.round(GrandOuvrage.getGoldBonus() * 100) })
    + '<br>' + _t("palier {n} : {p} %", { n: p.tier + 1, p: Math.floor(p.into / p.cost * 100) }) + '</div>';
  return h + '</button>';
}
window.buildGrandOuvrageCardHTML = buildGrandOuvrageCardHTML;

function buildGrandOuvrageSheetHTML() {
  var GO = GrandOuvrage, p = GO.getProgress(), bonus = Math.round(GO.getGoldBonus() * 100), sur = GO.getSurplusLoad();
  var h = '<div class="full-menu-overlay" onclick="closeGrandOuvrageSheetFromBackdrop(event)"><div class="full-menu vb-sheet-card" onclick="event.stopPropagation()">';
  h += kSheetHeadHTML({ icon: grandOuvrageIconHTML("vb-sheet-icon"), title: _t("Le Grand Ouvrage"), sub: p.tier > 0 ? _t("Palier {n}", { n: p.tier }) : _t("Aucun palier"), close: "closeGrandOuvrageSheet()" });
  h += '<div class="ksheet-body">';
  if (grandOuvrageFlash) h += '<div class="go-toast">' + esc(grandOuvrageFlash) + '</div>';
  h += '<div class="vb-sheet-text">' + _t("Edda bâtit une arche au milieu du village. Tout ce que tu as en trop y trouve sa place : chaque palier rend le village un peu plus riche.") + '</div>';
  h += '<div class="go-bonus"><img src="images/Icons/gold_icon.webp" alt=""><span>' + _t("+{p} % d'or", { p: bonus })
    + '<small>' + _t("sur l'or des combats, de la Taverne et des caravanes ; +1 % par palier") + '</small></span></div>';
  h += '<div class="go-head"><span>' + _t("Palier {n}", { n: p.tier + 1 }) + '</span><small>' + formatNumber(p.into) + ' / ' + formatNumber(p.cost) + '</small></div>';
  h += '<div class="kgauge kgauge-thin kgauge-xp"><div class="kgauge-track"><div class="kgauge-fill" style="width:' + Math.min(100, p.into / p.cost * 100).toFixed(1) + '%"></div></div></div>';
  h += '<div class="go-go"><button type="button" class="kbtn primary"' + (sur.points > 0 ? ' onclick="pourGrandOuvrageSurplus()"' : ' disabled') + '><span>'
    + (sur.points > 0 ? _t("Verser le surplus") : _t("Rien en trop pour l'instant")) + '</span><small>'
    + (sur.points > 0 ? _t("+{n} points · garde la moitié du plafond et la réserve", { n: formatNumber(sur.points) }) : _t("Les matières brutes partent au-dessus de la moitié du plafond")) + '</small></button></div>';
  h += '<button type="button" class="go-more" onclick="toggleGrandOuvrageList()">' + (grandOuvrageListOpen ? _t("Replier la liste ‹") : _t("Choisir quoi verser ›")) + '</button>';
  if (grandOuvrageListOpen) h += buildGrandOuvrageListHTML();
  var next = (Math.floor(p.tier / GRAND_OUVRAGE.milestoneEvery) + 1) * GRAND_OUVRAGE.milestoneEvery;
  var hf = (window.ACHIEVEMENTS_DB || []).filter(function (a) { return a.id === "hf_vil_ouvrage_" + next; })[0];
  h += '<p class="go-next">' + (hf ? _t("Prochain haut fait : palier {n} (« {x} »).", { n: next, x: _td(hf.name) }) + ' ' : '')
    + _t("Une matière brute vaut 1 point, une planche 5, un matériau de monde 25.") + '</p>';
  return h + '</div></div></div>';
}
window.buildGrandOuvrageSheetHTML = buildGrandOuvrageSheetHTML;

/* « Choisir quoi verser » : toute ressource en stock, ce qu'elle vaut, une quantité choisie (pas de 10 %). */
function buildGrandOuvrageListHTML() {
  var GO = GrandOuvrage, R = window.WAREHOUSE_RESOURCES || {}, total = 0, h = '<div class="go-list">';
  var keys = Object.keys(R).filter(function (k) { return WarehouseManager.getAmount(k) >= 1 && GO.getValue(k) > 0; });
  if (!keys.length) return h + '<p class="go-next">' + _t("L'Entrepôt est vide.") + '</p></div>';
  keys.forEach(function (k) {
    var d = R[k], q = Math.min(Number(grandOuvragePick[k] || 0), Math.floor(WarehouseManager.getAmount(k))), sur = GO.getSurplus(k);
    total += q * GO.getValue(k);
    h += '<div class="go-row">' + renderIconOrEmojiHTML(d.icon, "go-row-ico", _td(d.name))
      + '<span>' + esc(_td(d.name)) + '<small>' + (sur > 0 ? _t("{n} en trop", { n: formatNumber(sur) }) : _t("{n} en stock", { n: formatNumber(Math.floor(WarehouseManager.getAmount(k))) })) + '</small></span>'
      + '<span class="go-pts">' + (q > 0 ? formatNumber(q) + ' · ' : '') + _t("{n} pt", { n: GO.getValue(k) }) + '</span>'
      + '<span class="go-step"><button type="button" onclick="stepGrandOuvrage(\'' + k + '\',-1)" aria-label="' + _t("Moins") + '">−</button>'
      + '<button type="button" onclick="stepGrandOuvrage(\'' + k + '\',1)" aria-label="' + _t("Plus") + '">+</button></span></div>';
  });
  h += '<div class="go-go"><button type="button" class="kbtn"' + (total > 0 ? ' onclick="pourGrandOuvragePick()"' : ' disabled') + '><span>'
    + _t("Verser la sélection") + '</span><small>' + _t("+{n} points", { n: formatNumber(total) }) + '</small></button></div>';
  return h + '</div>';
}

function stepGrandOuvrage(key, dir) {
  var stock = Math.floor(WarehouseManager.getAmount(key)), pas = Math.max(1, Math.round(stock / 10));
  grandOuvragePick[key] = Math.max(0, Math.min(stock, Number(grandOuvragePick[key] || 0) + dir * pas));
  rerenderGrandOuvrageSheet();
}
window.stepGrandOuvrage = stepGrandOuvrage;

function toggleGrandOuvrageList() { grandOuvrageListOpen = !grandOuvrageListOpen; rerenderGrandOuvrageSheet(); }
window.toggleGrandOuvrageList = toggleGrandOuvrageList;

function afterGrandOuvragePour(r) {
  if (!r) return;
  grandOuvrageFlash = r.tiersGained > 0
    ? _t("Palier {t} atteint : +{p} % d'or. Edda ajoute une pierre à l'arche.", { t: r.tier, p: Math.round(r.tier * GRAND_OUVRAGE.goldPerTier * 100) })
    : "";
  if (typeof showToast === "function") showToast("🏛 " + _t("+{n} points", { n: formatNumber(r.points) }), 1400);
  if (window.AchievementManager && typeof AchievementManager.refresh === "function") AchievementManager.refresh();
  rerenderGrandOuvrageSheet();
  if (typeof renderPanel === "function") renderPanel();
}

function pourGrandOuvrageSurplus() { afterGrandOuvragePour(GrandOuvrage.pourSurplus()); }
window.pourGrandOuvrageSurplus = pourGrandOuvrageSurplus;

function pourGrandOuvragePick() {
  var r = GrandOuvrage.pour(grandOuvragePick);
  grandOuvragePick = {};
  afterGrandOuvragePour(r);
}
window.pourGrandOuvragePick = pourGrandOuvragePick;

function rerenderGrandOuvrageSheet() {
  var host = document.getElementById("village-modal-root");
  if (!host || host.dataset.go !== "1") return;
  var top = getSheetScroll(host); // v3.563.0 : verser ne ramène pas en haut
  host.innerHTML = buildGrandOuvrageSheetHTML();
  setSheetScroll(host, top);
}

function openGrandOuvrageSheet() {
  grandOuvrageFlash = ""; grandOuvragePick = {};
  var host = document.getElementById("village-modal-root");
  if (!host) return;
  host.dataset.go = "1"; delete host.dataset.vb;
  host.innerHTML = buildGrandOuvrageSheetHTML();
}
window.openGrandOuvrageSheet = openGrandOuvrageSheet;

function closeGrandOuvrageSheet() {
  var host = document.getElementById("village-modal-root");
  if (host) { host.innerHTML = ""; delete host.dataset.go; }
  grandOuvrageFlash = "";
}
window.closeGrandOuvrageSheet = closeGrandOuvrageSheet;

function closeGrandOuvrageSheetFromBackdrop(ev) { if (ev && ev.target === ev.currentTarget) closeGrandOuvrageSheet(); }
window.closeGrandOuvrageSheetFromBackdrop = closeGrandOuvrageSheetFromBackdrop;
