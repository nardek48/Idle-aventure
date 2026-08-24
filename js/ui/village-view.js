"use strict";
/* ui/village-view.js — écran Village : grille de 6 cartes illustrées + sous-onglets Village/Entrepôt/Production. Popup détail/montée de niveau hors cycle renderPanel(). Détail complet : COMMENTAIRES_ORIGINAUX.md */

var VILLAGE_BUILDING_ICONS = {
  goldMine: "⛏️",
  essenceWell: "🧪",
  barracks: "🏋️",
  timeRelay: "🔮",
  watchtower: "🏛️",
  sanctuary: "🔨"
};

var VILLAGE_BUILDING_MAP = {
  watchtower: { label: "Hôtel de Ville", bg: "images/Village/bg_watchtower.jpg", image: "images/Village/watchtower.png" },
  barracks: { label: "Caserne", bg: "images/Village/bg_barracks.jpg", image: "images/Village/barracks.png" },
  essenceWell: { label: "Hutte de l'Alchimiste", bg: "images/Village/bg_essenceWell.jpg", image: "images/Village/essenceWell.png" },
  sanctuary: { label: "Atelier de Forgeron", bg: "images/Village/bg_sanctuary.jpg", image: "images/Village/sanctuary.png" },
  timeRelay: { label: "Tour des Mages", bg: "images/Village/bg_timeRelay.jpg", image: "images/Village/timeRelay.png" },
  goldMine: { label: "Mine d'Or", bg: "images/Village/bg_goldMine.jpg", image: "images/Village/goldMine.png" }
};

function getVillageBuildingBonusText(id, level) {
  if (id === "goldMine") return "Bonus actuel : +" + Math.round(level * 12) + "% or de la chasse du village (hors-ligne et en continu)";
  if (id === "essenceWell") return "Bonus actuel : +" + level + " essence hors-ligne";
  if (id === "barracks") return "Bonus actuel : +" + Math.round(level * 4) + "% efficacité de la chasse du village (hors-ligne et en continu)";
  if (id === "timeRelay") return "Bonus actuel : +" + (level * 2).toFixed(1) + "h de cap hors-ligne";
  if (id === "watchtower") return "Bonus actuel : " + (level * 3) + " kills simulés/h (bestiaire + chance de butin), hors-ligne et en continu";
  if (id === "sanctuary") return "Bonus actuel : +" + (level * 0.05).toFixed(2) + " Aether/h";
  return "";
}

var activeVillageSubTab = "village"; // "village" | "entrepot" | "production"

function setVillageSubTab(tab) {
  activeVillageSubTab = (tab === "entrepot") ? "entrepot" : (tab === "production") ? "production" : "village";
  if (typeof renderPanel === "function") renderPanel();
}
window.setVillageSubTab = setVillageSubTab;

function isProductionScreenVisible() {
  return game.activeTab === "village" && activeVillageSubTab === "production";
}
window.isProductionScreenVisible = isProductionScreenVisible;

function buildVillageSubTabBarHTML() {
  var h = '<div class="pc-subtab-bar">';
  h += '<button type="button" class="pc-subtab-btn' + (activeVillageSubTab === "village" ? ' is-active' : '') + '" onclick="setVillageSubTab(\'village\')">🏘️<span>Village</span></button>';
  h += '<button type="button" class="pc-subtab-btn' + (activeVillageSubTab === "entrepot" ? ' is-active' : '') + '" onclick="setVillageSubTab(\'entrepot\')">📦<span>Entrepôt</span></button>';
  h += '<button type="button" class="pc-subtab-btn' + (activeVillageSubTab === "production" ? ' is-active' : '') + '" onclick="setVillageSubTab(\'production\')">🌾<span>Production</span></button>';
  h += '</div>';
  return h;
}

function buildVillageMainSubTabHTML() {
  var h = '<div class="village-building-grid">';

  Object.keys(VILLAGE_BUILDING_MAP).forEach(function (id) {
    var b = VILLAGE_BUILDING_MAP[id];
    var cfg = VILLAGE_CONFIG[id];
    if (!cfg) return;
    var level = VillageManager.getLevel(id);

    h += '<button type="button" class="village-building-card" onclick="openVillageBuildingPopup(\'' + id + '\')">';
    h += '<img class="village-building-bg" src="' + esc(b.bg) + '" alt="" draggable="false">';
    h += '<img class="village-building-sprite" src="' + esc(b.image) + '" alt="' + esc(b.label) + '" draggable="false">';
    h += '<div class="village-building-tag">';
    h += '<span class="village-building-name">' + esc(b.label) + '</span>';
    h += '<span class="village-building-level">Niv. ' + level + ' / ' + cfg.maxLevel + '</span>';
    h += '</div>';
    h += '</button>';
  });

  h += '</div>';
  return h;
}

function buildVillageHTML() {
  var h = '<div class="subtab-page">';
  h += '<div class="subtab-page-content">';
  h += '<div class="nb-page-frame village-page-frame">';

  if (activeVillageSubTab === "entrepot") {
    h += buildWarehouseHTML();
  } else if (activeVillageSubTab === "production") {
    h += buildProductionHTML();
  } else {
    h += buildVillageMainSubTabHTML();
  }

  h += '</div>'; // fin .nb-page-frame
  h += '</div>'; // fin .subtab-page-content

  h += '<div class="subtab-bar-wrapper">';
  h += buildVillageSubTabBarHTML();
  h += '</div>';

  h += '</div>'; // fin .subtab-page
  return h;
}

var openVillageBuildingId = null;

function buildVillageBuildingPopupHTML(id) {
  var b = VILLAGE_BUILDING_MAP[id];
  var cfg = VILLAGE_CONFIG[id];
  if (!b || !cfg) return "";

  var level = VillageManager.getLevel(id);
  var cost = VillageManager.getCost(id);
  var maxed = level >= (cfg.maxLevel || Infinity);

  var h = '<div class="full-menu-overlay">';
  h += '  <div class="full-menu village-popup-card">';
  h += '    <div class="village-popup-icon">' + esc(VILLAGE_BUILDING_ICONS[id] || "🏘️") + '</div>';
  h += '    <div class="village-popup-title">' + esc(b.label) + '</div>';
  h += '    <div class="village-popup-text">' + esc(cfg.desc) + '</div>';
  h += '    <div class="village-popup-meta">Niveau ' + level + ' / ' + cfg.maxLevel + '</div>';
  h += '    <div class="village-popup-meta"><strong>' + esc(getVillageBuildingBonusText(id, level)) + '</strong></div>';

  h += '    <div class="village-popup-actions">';
  h += '      <button class="settings-btn" type="button" onclick="closeVillageBuildingPopup()">Fermer</button>';
  if (maxed) {
    h += '      <button class="settings-btn primary is-maxed" type="button" disabled>Niveau max</button>';
  } else {
    var canAfford = Number(game.gold || 0) >= cost;
    if (canAfford) {
      h += '      <button class="settings-btn primary" type="button" onclick="buyVillageUpgradeFromPopup(\'' + id + '\')">'
        + '<img class="btn-buy-icon" src="images/Icons/gold_icon.png" alt="">' + formatNumber(cost) + '</button>';
    } else {
      h += '      <button class="settings-btn primary is-unaffordable" type="button" disabled>'
        + '<img class="btn-buy-icon" src="images/Icons/gold_icon.png" alt="">' + formatNumber(cost) + '</button>';
    }
  }
  h += '    </div>';

  h += '  </div>';
  h += '</div>';
  return h;
}

function openVillageBuildingPopup(id) {
  if (!VILLAGE_BUILDING_MAP[id]) return;
  openVillageBuildingId = id;
  var host = document.getElementById("village-modal-root");
  if (host) host.innerHTML = buildVillageBuildingPopupHTML(id);
}

function closeVillageBuildingPopup() {
  openVillageBuildingId = null;
  var host = document.getElementById("village-modal-root");
  if (host) host.innerHTML = "";
}

function buyVillageUpgradeFromPopup(id) {
  buyVillageUpgrade(id);
  if (openVillageBuildingId === id) openVillageBuildingPopup(id);
}

function buyVillageUpgrade(id) {
  if (window.VillageManager && typeof VillageManager.buy === "function") {
    VillageManager.buy(id);
  }
}

window.buildVillageHTML = buildVillageHTML;
window.buyVillageUpgrade = buyVillageUpgrade;
window.buyVillageUpgradeFromPopup = buyVillageUpgradeFromPopup;
window.openVillageBuildingPopup = openVillageBuildingPopup;
window.closeVillageBuildingPopup = closeVillageBuildingPopup;
