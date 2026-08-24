"use strict";
/* ui/ui-root.js — chef d'orchestre UI : switchTab (navigation), renderPanel (routeur par onglet), renderAll (rendu global), helpers transversaux (esc, héros, stats). Détail complet : COMMENTAIRES_ORIGINAUX.md */

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildEquipmentIconHTML(item, cssClass) {
  var cls = cssClass || "";
  if (!item) return '<div class="' + cls + '">' + renderIcon("equipment", "") + '</div>';

  var path = (typeof getEquipmentIconPath === "function") ? getEquipmentIconPath(item) : "";
  var fallbackEmoji = renderIcon("equipment", item.icon);
  var rarityClass = item.rarity ? (" rarity-" + item.rarity) : "";

  if (!path) return '<div class="' + cls + rarityClass + '">' + fallbackEmoji + '</div>';

  return '<div class="' + cls + rarityClass + ' has-icon-img">'
    + '<img src="' + esc(path) + '" alt="' + esc(item.name || "") + '" '
    + 'onerror="this.parentElement.classList.remove(\'has-icon-img\'); this.remove();">'
    + '<span class="icon-img-fallback">' + fallbackEmoji + '</span>'
    + '</div>';
}

function getHeroByKey(heroKey) {
  if (typeof HEROES_DB === "undefined" || !heroKey) return null;
  return HEROES_DB[heroKey] || null;
}

function getHeroByGameId(heroId) {
  if (typeof HEROES_DB === "undefined") return null;
  var keys = Object.keys(HEROES_DB);
  for (var i = 0; i < keys.length; i++) {
    var hero = HEROES_DB[keys[i]];
    if (hero && hero.id === heroId) return hero;
  }
  return null;
}

function getStatLabel(statKey) {
  if (typeof RPG_STAT_LABELS !== "undefined" && RPG_STAT_LABELS[statKey]) {
    return RPG_STAT_LABELS[statKey];
  }
  return statKey;
}

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

function switchTab(tabName) {
  game.activeTab = tabName;

  var gameArea = document.getElementById("game-area");
  var statsBar = document.getElementById("stats-bar");
  var panel = document.getElementById("panel-container");
  var buttons = document.querySelectorAll(".tab-btn");

  buttons.forEach(function (btn) {
    btn.classList.remove("active");
  });

  var combatMode = tabName === "combat";

  var directBtn = document.querySelector('.tab-btn[data-tab="' + tabName + '"]');
  if (directBtn) {
    directBtn.classList.add("active");
  } else {
    var menuBtn = document.querySelector('.tab-btn[data-tab="menu"]');
    if (menuBtn) menuBtn.classList.add("active");
  }

  if (gameArea) gameArea.style.display = combatMode ? "flex" : "none";
  if (statsBar) statsBar.style.display = combatMode ? "flex" : "none";
  if (panel) panel.classList.toggle("active", !combatMode);
  document.body.classList.toggle("combat-active", combatMode);
  if (typeof updateHudPageTitle === "function") updateHudPageTitle();
  renderPanel();
}

function renderAll() {
  renderHud();
  renderEnemy();
  renderStats();
  renderPanel();
  updateQuestBadge();
  if (typeof updateHudPageTitle === "function") updateHudPageTitle();
  if (typeof renderHealButtons === "function") renderHealButtons();
  if (typeof renderSpecialAttackButton === "function") renderSpecialAttackButton();
  if (typeof renderDefenseButton === "function") renderDefenseButton();
  if (typeof renderActivePotionsBar === "function") renderActivePotionsBar();
  if (typeof renderCombatHeroMini === "function") renderCombatHeroMini();
  if (needsHeroSetup()) {
    openHeroSelection();
  }
}

var lastRenderedTab = null;

function renderPanel() {
  var container = document.getElementById("panel-container");
  if (!container) return;

  var sameTab = game.activeTab === lastRenderedTab;
  var savedScrollTop = sameTab ? container.scrollTop : 0;
  var innerScroll = sameTab ? container.querySelector(".subtab-page-content") : null;
  var savedInnerScrollTop = innerScroll ? innerScroll.scrollTop : null;

  container.classList.toggle("sandbox-wide-mode", game.activeTab === "combat-sandbox");

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
    case "grimoire":
      container.innerHTML = buildGrimoireHTML();
      break;
    case "combat-sandbox":
      container.innerHTML = buildCombatSandboxHTML();
      break;
    case "more":
      container.innerHTML = buildHerosHTML();
      break;
    case "village":
      container.innerHTML = buildVillageHTML();
      break;
    case "campement":
      container.innerHTML = buildCampHTML();
      break;
    case "dungeon":
      container.innerHTML = buildDungeonHTML();
      break;
    case "achievements":
      container.innerHTML = buildAchievementsHTML();
      break;
    case "afflictions":
      container.innerHTML = buildAfflictionsHTML();
      break;
    default:
      container.innerHTML = "";
  }

  if (sameTab) {
    container.scrollTop = savedScrollTop;
    if (savedInnerScrollTop !== null) {
      var newInnerScroll = container.querySelector(".subtab-page-content");
      if (newInnerScroll) newInnerScroll.scrollTop = savedInnerScrollTop;
    }
  }
  lastRenderedTab = game.activeTab;

}

window.esc = esc;
window.buildEquipmentIconHTML = buildEquipmentIconHTML;
window.switchTab = switchTab;
window.renderAll = renderAll;
window.renderPanel = renderPanel;