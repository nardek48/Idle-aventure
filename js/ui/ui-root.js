"use strict";
/* ============================================================
Quest Idle — ui/ui-root.js
Le "chef d'orchestre" de l'UI : navigation entre onglets (switchTab),
routeur qui appelle le bon builder HTML par onglet (renderPanel),
rendu global (renderAll), et quelques helpers transversaux utilisés
par plusieurs écrans (esc, accès aux héros, labels de stats).
============================================================ */

/* Échappe le HTML dangereux avant insertion dans une chaîne — TOUT
   texte d'origine utilisateur ou de donnée externe (nom d'objet,
   nom du joueur...) doit passer par esc() avant d'être concaténé
   dans du HTML, pour éviter l'injection. */
function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* v2.23 : icône illustrée d'un objet d'équipement (une image par
   type ET par rareté, voir getEquipmentIconPath en
   systems/equipment-system.js), avec repli sur l'emoji générique si
   jamais l'image ne charge pas. Utilisé par l'inventaire, les
   emplacements équipés et l'échoppe. */
function buildEquipmentIconHTML(item, cssClass) {
  var cls = cssClass || "";
  if (!item) return '<div class="' + cls + '">' + renderIcon("equipment", "") + '</div>';

  var path = (typeof getEquipmentIconPath === "function") ? getEquipmentIconPath(item) : "";
  var fallbackEmoji = renderIcon("equipment", item.icon);

  if (!path) return '<div class="' + cls + '">' + fallbackEmoji + '</div>';

  return '<div class="' + cls + ' has-icon-img">'
    + '<img src="' + esc(path) + '" alt="' + esc(item.name || "") + '" '
    + 'onerror="this.parentElement.classList.remove(\'has-icon-img\'); this.remove();">'
    + '<span class="icon-img-fallback">' + fallbackEmoji + '</span>'
    + '</div>';
}

/* Récupère un héros par sa clé d'objet dans HEROES_DB (ex: "knight"),
   pas son `id` (voir getHeroByGameId ci-dessous pour l'inverse). */
function getHeroByKey(heroKey) {
  if (typeof HEROES_DB === "undefined" || !heroKey) return null;
  return HEROES_DB[heroKey] || null;
}

/* Récupère un héros par son `id` (celui stocké dans game.heroId),
   en cherchant dans toutes les entrées de HEROES_DB. */
function getHeroByGameId(heroId) {
  if (typeof HEROES_DB === "undefined") return null;
  var keys = Object.keys(HEROES_DB);
  for (var i = 0; i < keys.length; i++) {
    var hero = HEROES_DB[keys[i]];
    if (hero && hero.id === heroId) return hero;
  }
  return null;
}

/* Libellé français d'une clé de stat RPG (ex: "power" -> "Puissance").
   Utilisé par le bestiaire (les cartes héros/ennemi dédiées ont été
   retirées, voir historique du projet). */
function getStatLabel(statKey) {
  if (typeof RPG_STAT_LABELS !== "undefined" && RPG_STAT_LABELS[statKey]) {
    return RPG_STAT_LABELS[statKey];
  }
  return statKey;
}

/* Convertit une valeur de stat brute en pourcentage 0-100 pour une
   barre de progression visuelle (les stats RPG n'ont pas de max
   "naturel", donc c'est une échelle purement indicative). */
function clampStatValue(value) {
  var n = Number(value) || 0;
  return Math.max(0, Math.min(100, n));
}

/* Mémorise/restaure la position de scroll du sac d'objets lors d'un
   re-rendu (killEnemy() peut redessiner tout l'écran équipement en
   plein milieu du scroll du joueur — sans ça, il reviendrait en haut
   à chaque kill). */
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

/* Change l'onglet actif : bascule l'affichage combat/panel, met à
   jour le fond et redessine le contenu du panel. tabMap fait
   correspondre chaque onglet logique au bouton visuel qu'il faut
   surligner dans la barre du bas — remarque que bestiary/log/settings
   partagent le même bouton que "more" (index 8) car on y accède
   depuis l'écran Plus, pas directement depuis la barre. */
/* Change l'onglet actif : bascule l'affichage combat/panel, met à
   jour le fond et redessine le contenu du panel. Depuis la refonte
   du menu (v2.4), la barre du bas n'a plus que 2 boutons (Combat et
   Menu) : le bouton Combat s'allume sur l'écran de combat, le bouton
   Menu s'allume pour TOUT le reste (indique juste "tu es dans un
   sous-écran", plus besoin de mapper un index par onglet).
   v2.74 : les images de fond par onglet (Worlds/*.png sur les
   panels hors-combat) ont été retirées à la demande de l'utilisateur
   — voir l'ancienne getCurrentWorldPanelBackground()/updatePanelBackground()
   supprimées de ce fichier. Le fond de zone de combat (WorldManager.
   applyWorldTheme, peint sur <html>/body) n'est pas concerné. */
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

  // v2.38 : la barre du bas a maintenant 5 boutons dédiés (Combat,
  // Village, Donjon, Héros, Menu). Si l'onglet actif a son propre
  // bouton (data-tab correspondant), on l'allume directement ; sinon
  // (Boutique, Talents, Quêtes, Ascension...) c'est forcément un
  // écran ouvert depuis le menu principal, donc on allume "Menu".
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

/* Rafraîchit TOUT l'affichage (HUD, ennemi, stats, panel actif) —
   la fonction "brute force" appelée après la plupart des actions de
   jeu. Ouvre aussi le sélecteur de héros si aucun n'est encore
   choisi (première visite). */
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

/* Mémorise le dernier onglet réellement rendu, pour que
   renderPanel() (ci-dessous) sache s'il s'agit d'un vrai changement
   d'onglet (scroll remis à zéro, normal) ou d'un simple re-rendu du
   même onglet suite à une action de jeu (scroll à conserver). */
var lastRenderedTab = null;

/* Redessine UNIQUEMENT le contenu du panel selon l'onglet actif
   (game.activeTab). C'est ici qu'il faut ajouter une entrée si un
   nouvel onglet est créé un jour.

   v2.83.14 : conserve la position de scroll à travers le re-rendu,
   MAIS seulement quand l'onglet actif n'a pas changé depuis le
   dernier rendu (voir lastRenderedTab). renderPanel() est appelée
   très souvent (à chaque kill, via renderAll() — l'auto-attaque
   continue même si le joueur regarde un autre onglet que Combat), et
   remplaçait tout le innerHTML du panel à chaque fois, ramenant le
   scroll en haut à chaque mort d'ennemi — gênant en pleine
   Boutique/Équipement/etc. En revanche, un VRAI changement d'onglet
   (via switchTab()) doit toujours réouvrir en haut, comme avant.
   Deux conteneurs possibles selon l'écran : #panel-container
   lui-même (la plupart des onglets), ou .subtab-page-content à
   l'intérieur (Boutique, Donjon, Personnage — voir
   css/00-components.css, pattern des sous-onglets en pilules). */
function renderPanel() {
  var container = document.getElementById("panel-container");
  if (!container) return;

  var sameTab = game.activeTab === lastRenderedTab;
  var savedScrollTop = sameTab ? container.scrollTop : 0;
  var innerScroll = sameTab ? container.querySelector(".subtab-page-content") : null;
  var savedInnerScrollTop = innerScroll ? innerScroll.scrollTop : null;

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
      container.innerHTML = buildHerosHTML();
      break;
    case "village":
      container.innerHTML = buildVillageHTML();
      break;
    case "dungeon":
      container.innerHTML = buildDungeonHTML();
      break;
    case "achievements":
      container.innerHTML = buildAchievementsHTML();
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