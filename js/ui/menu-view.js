"use strict";
/* ui/menu-view.js — menu plein écran (bouton ☰), grille de destinations non couvertes par la barre du bas. Détail : COMMENTAIRES_ORIGINAUX.md */

var MENU_ITEMS = [
  { tab: "dungeon", label: "Donjon", img: "./images/Icons/menu_icons/donjon_menu.png", badge: "dungeon" },
  { tab: "shop", label: "Boutique", img: "./images/Icons/menu_icons/shop_menu.png" },
  { tab: "talents", label: "Talents", img: "./images/Icons/menu_icons/talents_menu.png", badge: "talents" },
  { tab: "equip", label: "Équipement", img: "./images/Icons/menu_icons/equip_menu.png" },
  { tab: "quests", label: "Quêtes", img: "./images/Icons/menu_icons/quests_menu.png", badge: true },
  { tab: "ascension", label: "Ascension", img: "./images/Icons/menu_icons/aether_menu.png", badge: "ascension" },
  { tab: "map", label: "Carte du monde", img: "./images/Icons/menu_icons/map_menu.png" },
  { tab: "achievements", label: "Hauts faits", img: "./images/Icons/menu_icons/achivment_menu.png", badge: "achievement" },
  { tab: "bestiary", label: "Bestiaire", img: "./images/Icons/menu_icons/bestiaire_menu.png", badge: "codex" },
  { tab: "afflictions", label: "Afflictions", icon: "🔥", badge: "afflictions" },
  { tab: "grimoire", label: "Grimoire", icon: "📖" },
  { tab: "settings", label: "Paramètres", img: "./images/Icons/menu_icons/settings_menu.png" }
];

function getMenuQuestBadgeCount() {
  // v3.116.0 : journalières retirées — seules les étapes Histoire réclamables comptent ici.
  return (window.StoryQuestManager && typeof StoryQuestManager.getClaimableCount === "function")
    ? StoryQuestManager.getClaimableCount()
    : 0;
}

function buildFullMenuHTML() {
  var h = '<div class="full-menu-overlay" onclick="if (event.target === this) closeFullMenu();">';
  h += '  <div class="full-menu">';
  h += '    <div class="full-menu-header">';
  h += '      <h2>Menu</h2>';
  h += '      <button class="full-menu-close" type="button" onclick="closeFullMenu()">✕</button>';
  h += '    </div>';
  h += '    <div class="full-menu-grid">';

  MENU_ITEMS.forEach(function (item) {
    // v3.99.15 : items verrouillés (onglets cachés, voir core/state.js:unlockedTabs)
    // simplement absents de la grille, plutôt que grisés — comportement demandé par Seb.
    if (typeof isTabUnlocked === "function" && !isTabUnlocked(item.tab)) return;

    var badgeCount = 0;
    if (item.badge === "achievement") {
      badgeCount = (window.AchievementManager && typeof AchievementManager.getAvailableToClaimCount === "function")
        ? AchievementManager.getAvailableToClaimCount()
        : 0;
    } else if (item.badge === "dungeon") {
      if (window.DungeonManager && typeof DungeonManager.checkTicketReset === "function") {
        DungeonManager.checkTicketReset();
        badgeCount = ((game.dungeonTickets || 0) > 0 && !(game.dungeonRun && game.dungeonRun.active)) ? 1 : 0;
      }
    } else if (item.badge === "talents") {
      badgeCount = (typeof getTalentsAvailableCount === "function") ? getTalentsAvailableCount() : 0;
    } else if (item.badge === "ascension") {
      badgeCount = (typeof getAscensionAvailableCount === "function") ? getAscensionAvailableCount() : 0;
    } else if (item.badge === "codex") {
      badgeCount = (window.CodexManager && typeof CodexManager.getUnreadCount === "function")
        ? CodexManager.getUnreadCount()
        : 0;
    } else if (item.badge === "afflictions") {
      badgeCount = (window.AfflictionManager && typeof AfflictionManager.getActiveCount === "function")
        ? AfflictionManager.getActiveCount()
        : 0;
    } else if (item.badge) {
      badgeCount = getMenuQuestBadgeCount();
    }

    h += '<button class="full-menu-card" type="button" onclick="selectMenuTab(\'' + item.tab + '\')">';
    if (badgeCount > 0) {
      h += '<span class="full-menu-card-badge">' + badgeCount + '</span>';
    }
    if (item.img) {
      h += '<img src="' + esc(item.img) + '" alt="" class="full-menu-card-icon-img">';
    } else {
      h += '<div class="full-menu-card-icon">' + esc(item.icon || "❔") + '</div>';
    }
    h += '<div class="full-menu-card-label">' + esc(item.label) + '</div>';
    h += '</button>';
  });

  h += '    </div>';
  h += '  </div>';
  h += '</div>';
  return h;
}

function openFullMenu() {
  var host = document.getElementById("full-menu-root");
  if (!host) return;
  host.innerHTML = buildFullMenuHTML();
}

function closeFullMenu() {
  var host = document.getElementById("full-menu-root");
  if (host) host.innerHTML = "";
}

function selectMenuTab(tab) {
  closeFullMenu();
  if (typeof switchTab === "function") switchTab(tab);
}

window.openFullMenu = openFullMenu;
window.closeFullMenu = closeFullMenu;
window.selectMenuTab = selectMenuTab;
window.buildFullMenuHTML = buildFullMenuHTML;
window.getMenuQuestBadgeCount = getMenuQuestBadgeCount;
