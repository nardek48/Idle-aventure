"use strict";
/* ui/menu-view.js — menu plein écran (bouton ☰), grille de destinations non couvertes par la barre du bas. Détail : COMMENTAIRES_ORIGINAUX.md */

var MENU_ITEMS = [
  /* v3.244.0 (chantier Navigation, décision Seb 14/09/2026) : le menu ☰ ne garde que la
     CONSULTATION et les réglages — rien du quotidien. Combat s'atteint par une mission,
     Donjon et Carte remontent au bloc « Expédition » du Campement, Équipement et Talents
     deviennent des sous-onglets de Héros, Ascension s'ouvre depuis le Résumé du héros,
     Boutique migre vers les bâtiments du Village (lot N-2). Six cases, deux rangées. */
  /* v3.369.0 : libellés traduits à la définition — possible car changer de langue relance le jeu (i18n D2). */
  { tab: "achievements", label: _t("Hauts faits"), img: "./images/Icons/menu_icons/achivment_menu.png" },
  /* v3.245.0 (refonte Donjons) : Afflictions retirées — devenues les Marques, choisies à l'entrée d'un donjon. 5 cases (décision 12.4). */
  { tab: "log", label: _t("Journal"), img: "./images/Icons/menu_icons/journal_menu.png" },
  /* v3.405.0 : une seule porte, la Bibliothèque (Bestiaire, Codex, Tutoriels en rail). L'onglet
     "tutorials" est toujours ouvert : la porte existe dès le début, Bestiaire et Codex s'y ajoutent. */
  { tab: "tutorials", label: _t("Bibliothèque"), img: "./images/Icons/menu_icons/bestiaire_menu.png" },
  { tab: "settings", label: _t("Paramètres"), img: "./images/Icons/menu_icons/settings_menu.png" }
];

function buildFullMenuHTML() {
  var h = '<div class="full-menu-overlay" onclick="if (event.target === this) closeFullMenu();">';
  h += '  <div class="full-menu">';
  h += kSheetHeadHTML({ icon: '<img src="images/Icons/menu_icons/menu_menu.png" alt="">', title: _t("Menu"), close: "closeFullMenu()" });
  h += '    <div class="full-menu-grid">';

  MENU_ITEMS.forEach(function (item) {
    // v3.99.15 : items verrouillés (onglets cachés, voir core/state.js:unlockedTabs)
    // simplement absents de la grille, plutôt que grisés — comportement demandé par Seb.
    if (typeof isTabUnlocked === "function" && !isTabUnlocked(item.tab)) return;

    // v3.320.0 (décision Seb) : plus aucune pastille dans le menu.
    h += '<button class="full-menu-card" type="button" onclick="selectMenuTab(\'' + item.tab + '\')">';
    if (item.img) {
      h += '<img src="' + esc(item.img) + '" alt="" class="full-menu-card-icon-img">';
    } else {
      h += '<div class="full-menu-card-icon">' + renderIconOrEmojiHTML(item.icon, "full-menu-card-icon-img", _td(item.label)) + '</div>';
    }
    h += '<div class="full-menu-card-label">' + esc(_td(item.label)) + '</div>';
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
