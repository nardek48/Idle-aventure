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

/* v3.99.15 : onglets cachés par défaut (voir core/state.js:unlockedTabs). "campement"
   est TOUJOURS considéré débloqué (forcé en dur) même si l'état ne le contient pas,
   pour ne jamais se retrouver avec un écran totalement vide en cas de bug/save
   corrompue — c'est l'écran de départ, il doit rester une porte de sortie sûre. */
function isTabUnlocked(tabName) {
  if (tabName === "campement") return true;
  if (!game.unlockedTabs || typeof game.unlockedTabs !== "object") return false;
  return !!game.unlockedTabs[tabName];
}

/* Masque/affiche les boutons de la tab-bar du bas selon isTabUnlocked(). Le bouton
   "Menu" (☰) reste toujours visible : il donne accès à Quêtes et Paramètres, débloqués
   par défaut, et à la grille filtrée (voir ui/menu-view.js) pour le reste. */
function refreshTabBarVisibility() {
  var buttons = document.querySelectorAll(".tab-btn[data-tab]");
  buttons.forEach(function (btn) {
    var tab = btn.getAttribute("data-tab");
    if (tab === "menu") return; // toujours visible
    btn.style.display = isTabUnlocked(tab) ? "" : "none";
  });
}
window.isTabUnlocked = isTabUnlocked;
window.refreshTabBarVisibility = refreshTabBarVisibility;

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
  // v3.99.15 : sécurité — un onglet verrouillé ne doit jamais devenir l'onglet actif
  // (état sauvegardé corrompu, bouton resté dans le DOM avant un refreshTabBarVisibility(),
  // etc.). Retombe sur campement, toujours débloqué.
  if (!isTabUnlocked(tabName)) {
    tabName = "campement";
  }

  var leavingCombat = game.activeTab === "combat" && tabName !== "combat";
  game.activeTab = tabName;
  // v3.102.1 : revenir au Campement pendant une exploration = rentrer (butin banqué)
  if (window.SortieManager && typeof SortieManager.onTabChange === "function") SortieManager.onTabChange(tabName);

  if (leavingCombat && game.combatSpeed !== 1) {
    game.combatSpeed = 1;
  }
  // v3.102.0 : quitter l'écran Combat coupe « Continuer l'attaque »
  if (leavingCombat && game.combatRound && game.combatRound.continueAttack) {
    game.combatRound.continueAttack = false;
  }

  var gameArea = document.getElementById("game-area");
  var statsBar = document.getElementById("stats-bar");
  var speedBar = document.getElementById("combat-speed-bar");
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
  if (statsBar) statsBar.style.display = "none"; // v3.102.2 : combat plein écran, plus de barre de stats (voir fiche Héros)
  if (speedBar) {
    speedBar.style.display = combatMode ? "flex" : "none";
    if (combatMode && typeof renderCombatSpeedBar === "function") renderCombatSpeedBar();
  }
  if (panel) panel.classList.toggle("active", !combatMode);
  document.body.classList.toggle("combat-active", combatMode);
  if (typeof updateHudPageTitle === "function") updateHudPageTitle();
  refreshTabBarVisibility();
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
  refreshTabBarVisibility();
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

  container.classList.toggle("sandbox-wide-mode", game.activeTab === "combat-sandbox" || game.activeTab === "admin");

  // v3.100.0 : vérification opportuniste de l'étape Histoire (throttlée 1/s dans le manager,
  // ne déclenche jamais de rendu — en combat renderPanel tourne à chaque kill).
  if (window.StoryQuestManager && typeof StoryQuestManager.checkCurrentStep === "function") {
    StoryQuestManager.checkCurrentStep(false);
  }

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
      container.innerHTML = buildCombatSandboxHTML(); // v3.102.3 : ui/combat-round-sandbox-view.js (simulateur de rounds)
      break;
    case "admin":
      container.innerHTML = buildAdminHTML();
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