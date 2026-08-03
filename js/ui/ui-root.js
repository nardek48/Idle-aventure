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

/* Image de fond plein panel selon l'onglet actif (une par onglet,
   sauf Combat qui n'en a pas — voir updatePanelBackground). Note :
   chemins préfixés par "../", à vérifier si jamais le jeu est
   déployé dans un sous-dossier différent de la structure actuelle. */
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

/* Applique (ou retire) le fond illustré sur #panel-container. L'écran
   Combat n'a jamais de fond de panel (il a son propre fond de zone,
   voir WorldManager.applyWorldTheme). La classe "panel-world-bg"
   ajoutée ici déclenche l'effet vitre sur les cartes (voir la longue
   liste de sélecteurs dans css/06-map.css). */
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
   sous-écran", plus besoin de mapper un index par onglet). */
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
  var combatBtn = document.querySelector('.tab-btn[data-tab="combat"]');
  var menuBtn = document.querySelector('.tab-btn[data-tab="menu"]');
  if (combatMode && combatBtn) combatBtn.classList.add("active");
  if (!combatMode && menuBtn) menuBtn.classList.add("active");

  if (gameArea) gameArea.style.display = combatMode ? "flex" : "none";
  if (statsBar) statsBar.style.display = combatMode ? "flex" : "none";
  if (panel) panel.classList.toggle("active", !combatMode);
  updatePanelBackground();
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
  updatePanelBackground()
  updateQuestBadge();
  if (typeof renderHealButtons === "function") renderHealButtons();
  if (typeof renderSpecialAttackButton === "function") renderSpecialAttackButton();
  if (needsHeroSetup()) {
    openHeroSelection();
  }
}

/* Redessine UNIQUEMENT le contenu du panel selon l'onglet actif
   (game.activeTab). C'est ici qu'il faut ajouter une entrée si un
   nouvel onglet est créé un jour. */
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
    case "dungeon":
      container.innerHTML = buildDungeonHTML();
      break;
    case "achievements":
      container.innerHTML = buildAchievementsHTML();
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