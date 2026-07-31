"use strict";

/* ============================================================
   Helper central, utilisé dans beaucoup de builders HTML. 
============================================================ */

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ============================================================
   Fond de panneau selon monde. 
============================================================ */

function getCurrentWorldPanelBackground() {
  var byTab = {
    shop: "../images/Worlds/shop.png",
    talents: "../images/Worlds/talent.png",
    equip: "../images/Worlds/equipment.png",
    quests: "../images/Worlds/quest.png",
    ascension: "../images/Worlds/aether.png",
    map: "../images/Worlds/World.png",
    bestiary: "../images/Worlds/bestiary.png",
    log: "../images/Worlds/log.png",
    more: "../images/Worlds/more.png",
    village: "../images/Worlds/village.png",
    settings: "../images/Worlds/more.png"
  };

  return byTab[game.activeTab] || "../images/Worlds/World.png";
}

/* ============================================================
   Appelée par switchTab et renderAll. 
============================================================ */

function updatePanelBackground() {
  var panel = document.getElementById("panel-container");
  if (!panel) return;

  var isCombat = game.activeTab === "combat";
  var bg = getCurrentWorldPanelBackground();

  if (isCombat) {
    panel.style.removeProperty("--panel-bg-image");
    panel.classList.remove("panel-world-bg");
    return;
  }

  if (bg) {
    panel.style.setProperty("--panel-bg-image", 'url("' + bg + '")');
    panel.classList.add("panel-world-bg");
  } else {
    panel.style.removeProperty("--panel-bg-image");
    panel.classList.remove("panel-world-bg");
  }
}

/* ============================================================
   Helper transversal. 
============================================================ */

function getHeroByKey(heroKey) {
  if (typeof HEROES_DB === "undefined" || !heroKey) return null;
  return HEROES_DB[heroKey] || null;
}

/* ============================================================
   Helper transversal. 
============================================================ */

function getHeroByGameId(heroId) {
  if (typeof HEROES_DB === "undefined") return null;
  var keys = Object.keys(HEROES_DB);
  for (var i = 0; i < keys.length; i++) {
    var hero = HEROES_DB[keys[i]];
    if (hero && hero.id === heroId) return hero;
  }
  return null;
}

/* ============================================================
   Helper rendu stats. 
============================================================ */

function getStatLabel(statKey) {
  if (typeof RPG_STAT_LABELS !== "undefined" && RPG_STAT_LABELS[statKey]) {
    return RPG_STAT_LABELS[statKey];
  }
  return statKey;
}

/* ============================================================
   Helper rendu stats. 
============================================================ */

function clampStatValue(value) {
  var n = Number(value) || 0;
  return Math.max(0, Math.min(100, n));
}

window.__equipBagScrollTop = 0;

function saveEquipBagScroll() {
  var bag = document.querySelector("#panel-container .eq-bag-panel");
  if (bag) window.__equipBagScrollTop = bag.scrollTop || 0;
}

function restoreEquipBagScroll() {
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      var bag = document.querySelector("#panel-container .eq-bag-panel");
      if (bag) bag.scrollTop = window.__equipBagScrollTop || 0;
    });
  });
}

/* ============================================================
   Fonction de navigation centrale. 
============================================================ */

function switchTab(tabName) {
  game.activeTab = tabName;

  var gameArea = document.getElementById("game-area");
  var statsBar = document.getElementById("stats-bar");
  var panel = document.getElementById("panel-container");
  var buttons = document.querySelectorAll(".tab-btn");

  buttons.forEach(function (btn) {
    btn.classList.remove("active");
  });

  var tabMap = {
    combat: 0,
    shop: 1,
    talents: 2,
    equip: 3,
    quests: 4,
    ascension: 5,
    map: 6,
    village: 7,
    more: 8,
    bestiary: 8,
    log: 8,
    settings: 8
  };

  var activeIndex = tabMap[tabName] != null ? tabMap[tabName] : 0;
  if (buttons[activeIndex]) buttons[activeIndex].classList.add("active");

  var combatMode = tabName === "combat";
  if (gameArea) gameArea.style.display = combatMode ? "flex" : "none";
  if (statsBar) statsBar.style.display = combatMode ? "flex" : "none";
  if (panel) panel.classList.toggle("active", !combatMode);
  updatePanelBackground();
  renderPanel();
}

/* ============================================================
   Point d’entrée de rendu principal. 
============================================================ */

function renderAll() {
  renderHud();
  renderEnemy();
  renderStats();
  renderPanel();
  updatePanelBackground()
  updateQuestBadge();
  if (needsHeroSetup()) {
    openHeroSelection();
  }
}

/* ============================================================
   Routeur des panneaux. 
============================================================ */

function renderPanel() {
  var container = document.getElementById("panel-container");
  if (!container) return;

  switch (game.activeTab) {
    case "shop":
      container.innerHTML = buildShopHTML();
      break;
    case "talents":
      container.innerHTML = buildTalentsHTML();
      break;
    case "equip":
      container.innerHTML = buildEquipHTML();
      break;
    case "quests":
      container.innerHTML = buildQuestsHTML();
      break;
    case "ascension":
      container.innerHTML = buildAscensionHTML();
      break;
    case "map":
      container.innerHTML = buildMapHTML();
      break;
    case "bestiary":
      container.innerHTML = buildBestiaryHTML();
      break;
    case "log":
      container.innerHTML = buildLogHTML();
      break;
    case "settings":
      container.innerHTML = buildSettingsHTML();
      break;
    case "more":
      container.innerHTML = buildMoreHTML();
      break;
    case "village":
      container.innerHTML = buildVillageHTML();
      break;
    default:
      container.innerHTML = "";
  }

}

window.esc = esc;
window.getCurrentWorldPanelBackground = getCurrentWorldPanelBackground;
window.updatePanelBackground = updatePanelBackground;
window.switchTab = switchTab;
window.renderAll = renderAll;
window.renderPanel = renderPanel;