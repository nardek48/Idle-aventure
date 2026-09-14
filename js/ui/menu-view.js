"use strict";
/* ui/menu-view.js — menu plein écran (bouton ☰), grille de destinations non couvertes par la barre du bas. Détail : COMMENTAIRES_ORIGINAUX.md */

var MENU_ITEMS = [
  /* v3.244.0 (chantier Navigation, décision Seb 14/09/2026) : le menu ☰ ne garde que la
     CONSULTATION et les réglages — rien du quotidien. Combat s'atteint par une mission,
     Donjon et Carte remontent au bloc « Expédition » du Campement, Équipement et Talents
     deviennent des sous-onglets de Héros, Ascension s'ouvre depuis le Résumé du héros,
     Boutique migre vers les bâtiments du Village (lot N-2). Six cases, deux rangées. */
  { tab: "bestiary", label: "Bestiaire & Codex", img: "./images/Icons/menu_icons/bestiaire_menu.png" },
  { tab: "achievements", label: "Hauts faits", img: "./images/Icons/menu_icons/achivment_menu.png", badge: "achievement" },
  { tab: "afflictions", label: "Afflictions", icon: "images/Icons/camp/campfire.png", badge: "afflictions" },
  { tab: "log", label: "Journal", img: "./images/Icons/menu_icons/journal_menu.png" },
  { tab: "tutorials", label: "Tutoriels", icon: "images/Icons/codex/codex_lore.png" },
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
  h += '      <button class="full-menu-close" type="button" onclick="closeFullMenu()"><img class=ico-inline src=images/Icons/system/close.png></button>';
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
      h += '<div class="full-menu-card-icon">' + renderIconOrEmojiHTML(item.icon, "full-menu-card-icon-img", item.label) + '</div>';
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
