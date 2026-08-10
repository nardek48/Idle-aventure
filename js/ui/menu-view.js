"use strict";
/* ============================================================
Quest Idle — ui/menu-view.js
Le menu plein écran qui remplace l'ancienne barre à 9 icônes. La
barre du bas n'a plus que "Combat" et "☰ Menu" (voir index.html et
ui-root.js/switchTab) ; ce fichier construit l'écran de destinations
(grille de cartes) ouvert par le bouton Menu, sur le même principe
que l'overlay de sélection de héros (voir ui/modal-view.js).
============================================================ */

/* Toutes les destinations sauf Combat, Village, Donjon et Héros, qui
   ont chacun leur propre bouton dédié dans la barre du bas depuis la
   v2.38 (voir index.html + ui-root.js/switchTab). img = icône dédiée
   si elle existe, sinon repli sur un emoji (icon). badge = affiche le
   compteur de quêtes complétées non réclamées sur cette carte. */
var MENU_ITEMS = [
  { tab: "shop", label: "Boutique", img: "./images/Icons/menu_icons/shop_menu.png" },
  { tab: "talents", label: "Talents", img: "./images/Icons/menu_icons/talents_menu.png", badge: "talents" },
  { tab: "equip", label: "Équipement", img: "./images/Icons/menu_icons/equip_menu.png" },
  { tab: "quests", label: "Quêtes", img: "./images/Icons/menu_icons/quests_menu.png", badge: true },
  { tab: "ascension", label: "Ascension", img: "./images/Icons/menu_icons/aether_menu.png", badge: "ascension" },
  { tab: "map", label: "Carte du monde", img: "./images/Icons/menu_icons/map_menu.png" },
  { tab: "achievements", label: "Hauts faits", img: "./images/Icons/menu_icons/achivment_menu.png" },
  { tab: "bestiary", label: "Bestiaire", img: "./images/Icons/menu_icons/bestiaire_menu.png" },
  { tab: "settings", label: "Paramètres", img: "./images/Icons/menu_icons/settings_menu.png" }
];

/* Nombre de quêtes complétées mais pas encore réclamées (même calcul
   que updateQuestBadge() dans ui/quests-view.js, dupliqué ici pour
   ne pas dépendre de l'ordre de chargement des deux fichiers). */
function getMenuQuestBadgeCount() {
  if (!Array.isArray(game.quests) || !window.QuestManager) return 0;
  return game.quests.filter(function (q) {
    return !q.claimed && QuestManager.isComplete(q);
  }).length;
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

/* Ouvre le menu (overlay plein écran, par-dessus tout le reste). */
function openFullMenu() {
  var host = document.getElementById("full-menu-root");
  if (!host) return;
  host.innerHTML = buildFullMenuHTML();
}

function closeFullMenu() {
  var host = document.getElementById("full-menu-root");
  if (host) host.innerHTML = "";
}

/* Choix d'une destination depuis le menu : ferme l'overlay puis
   navigue, comme un clic sur l'ancienne barre à 9 icônes. */
function selectMenuTab(tab) {
  closeFullMenu();
  if (typeof switchTab === "function") switchTab(tab);
}

window.openFullMenu = openFullMenu;
window.closeFullMenu = closeFullMenu;
window.selectMenuTab = selectMenuTab;
window.buildFullMenuHTML = buildFullMenuHTML;
window.getMenuQuestBadgeCount = getMenuQuestBadgeCount;
