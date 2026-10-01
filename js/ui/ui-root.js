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
/* v3.208.0 : onglets toujours accessibles, jamais présents dans game.unlockedTabs.
   - admin / combat-sandbox : outils de dev. Le bouton « 🛠️ Admin » des Paramètres appelait
     switchTab('admin') et retombait silencieusement sur le Campement (bug remonté par Seb).
     À RETIRER à la fin de la période de test — c'est le seul endroit à toucher.
   - tutorials : écran d'aide, toujours consultable ; ce sont ses ENTRÉES qui se déverrouillent
     une à une (voir systems/tutorial-catalog-system.js), comme le Codex. */
/* v3.244.0 : log (Journal) rejoint la liste — écran de consultation pure, jamais
   débloqué par l'Histoire ; son bouton des Paramètres retombait sur le Campement. */
var ALWAYS_UNLOCKED_TABS = { admin: true, "combat-sandbox": true, tutorials: true, log: true };

function isTabUnlocked(tabName) {
  if (tabName === "campement") return true;
  if (ALWAYS_UNLOCKED_TABS[tabName]) return true;
  if (!game.unlockedTabs || typeof game.unlockedTabs !== "object") return false;
  return !!game.unlockedTabs[tabName];
}

/* Masque/affiche les boutons de la tab-bar du bas selon isTabUnlocked(). Le bouton
   "Menu" (☰) reste toujours visible : il donne accès à Quêtes et Paramètres, débloqués
   par défaut, et à la grille filtrée (voir ui/menu-view.js) pour le reste. */
/* v3.208.0 (bug Seb) : `display:none` retirait le bouton du flux, et les .tab-btn restants
   (flex: 1 0 0) se partageaient toute la largeur — en début de partie 3 icônes étirées au
   lieu des 5 emplacements dessinés dans le cadre. Le bouton reste donc en place, marqué
   .is-locked : le cadre vide (tab-slot-inactive.png) est conservé, l'icône et le libellé
   sont masqués, le clic est neutralisé (voir css/02-layout.css). */
function refreshTabBarVisibility() {
  var buttons = document.querySelectorAll(".tab-btn[data-tab]");
  buttons.forEach(function (btn) {
    var tab = btn.getAttribute("data-tab");
    if (tab === "menu") return; // toujours visible
    btn.style.display = "";
    btn.classList.toggle("is-locked", !isTabUnlocked(tab));
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
    + '<img src="' + esc(path) + '" alt="" '
    + 'onerror="this.parentElement.classList.remove(\'has-icon-img\'); this.remove();">'
    + '<span class="icon-img-fallback">' + fallbackEmoji + '</span>'
    + '</div>';
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

  // v3.244.0 (chantier Navigation) : Équipement et Talents vivent désormais DANS Héros.
  // Les anciens raccourcis (pastille sac du HUD, bouton du Résumé, toast de butin, quêtes)
  // continuent d'appeler switchTab('equip') / ('talents') : on les y conduit, sous-onglet
  // déjà positionné. Le verrou d'Histoire a été vérifié juste au-dessus sur le nom d'origine.
  if (tabName === "equip" || tabName === "talents") {
    if (typeof setHerosSubTabSilent === "function") setHerosSubTabSilent(tabName);
    tabName = "more";
  }

  // v3.107.3 : impossible d'entrer sur l'écran Combat à 0 PV — aucune action n'y était possible
  // (isHeroTurnAvailable() refuse tout, y compris le bouton Attaque), ce qui donnait l'impression
  // d'un jeu figé sans qu'aucun message n'explique qu'il fallait repasser par le Campement.
  if (tabName === "combat" && (game.heroHp || 0) <= 0) {
    tabName = "campement";
    if (typeof showToast === "function") showToast(_t("Tu es à terre — soigne-toi au Campement avant de repartir."), 2000);
  }

  // v3.293.0 (règle Seb) : plus de farm libre. Sans run de quête en cours, l'écran Combat
  // n'a rien à montrer — retour au Campement (Ascension, anciens liens, fin de run ratée).
  if (tabName === "combat" && typeof hasCombatQuestContext === "function" && !hasCombatQuestContext()) {
    tabName = "campement";
  }

  // v3.120.0 (Lot S1) : l'expédition est une activité exclusive (décision Seb 03/09/2026) :
  // quitter l'onglet "scene" en pleine expédition demande confirmation (abandon).
  // v3.384.0 (PA2-2, D4) : quitter la préparation d'une Petite Aventure v2, c'est y renoncer, sans perte.
  if (game.activeTab === "scene" && tabName !== "scene" && game.sceneRun && game.sceneRun.pa2 && game.sceneRun.status === "pa2-prep" && window.Pa2Run) {
    Pa2Run.abandon();
    if (window.SceneRunManager) SceneRunManager.clearRun();
    if (typeof pa2ClearChrome === "function") pa2ClearChrome();
  }
  if (game.activeTab === "scene" && tabName !== "scene"
      && window.SceneRunManager && typeof SceneRunManager.isRunActive === "function" && SceneRunManager.isRunActive()) {
    var targetTab = tabName;
    if (typeof showConfirmModal === "function") {
      showConfirmModal(
        _t("Abandonner l'expédition ?"),
        _t("Tu perds la moitié du butin non sécurisé. Le reste sera rapporté au village."),
        "images/Icons/system/warning.png",
        function () {
          if (window.SceneRunManager && typeof SceneRunManager.abandon === "function") SceneRunManager.abandon();
          switchTab(targetTab);
        }
      );
    }
    return; // navigation bloquée tant que la confirmation n'est pas résolue
  }

  var leavingCombat = game.activeTab === "combat" && tabName !== "combat";
  // v3.414.0 (VUI-1) : arriver sur le Village ouvre toujours Production (décision Seb)
  if (tabName === "village" && game.activeTab !== "village" && typeof onVillageTabEnter === "function") onVillageTabEnter();
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
  if (typeof relocateCombatHeroMini === "function") relocateCombatHeroMini(combatMode); // v3.241.0
  // v3.120.0 (Lot S1) : même traitement que combat-active — l'expédition est une activité
  // engageante exclusive (décision Seb), le menu du bas disparaît pendant qu'elle est active.
  document.body.classList.toggle("scene-active", tabName === "scene");
  // v3.292.0 : carte vivante plein écran (HUD masqué), seulement sur l'onglet Carte
  if (typeof syncLivingMapBodyClass === "function") syncLivingMapBodyClass();
  // v3.200.0 : appel à updateHudPageTitle() retiré — le titre de page du HUD n'existe plus,
  // les bandeaux figés des kframes portent le titre de chaque écran.
  refreshTabBarVisibility();
  renderPanel();
  // v3.380.0 : héros libéré (fin de combat, d'expédition) → le retour en attente s'ouvre tout de suite,
  // sans attendre la vérification d'une seconde de return-view.js (qui reste en filet).
  if (window.ReturnManager && ReturnManager.hasPending()) ReturnManager.flushPending();

  // v3.350.0 : un boss ou une élite posé AVANT l'arrivée sur l'écran de combat (carte vivante,
  // quête qui commence par son boss) n'était jamais « vu » : renderEnemy() ne lance la carte
  // d'entrée que sur l'onglet Combat, et switchTab ne le rappelait pas. Idempotent (_momentShown).
  if (tabName === "combat" && game.enemy && game.enemy.isBoss && window.BossMomentManager) BossMomentManager.onEnemyShown(game.enemy);

  // v3.107.7 : popup pédagogique par étape Histoire, à la première arrivée sur l'onglet concerné.
  // v3.297.0 (W-1a) : tutoriel de l'étape en cours de chaque chapitre actif
  if (typeof maybeShowStepTutorial === "function" && window.StoryQuestManager && typeof StoryQuestManager.activeChapterIds === "function") {
    StoryQuestManager.activeChapterIds().forEach(function (id) { maybeShowStepTutorial(id, tabName); });
  }
  // v3.107.9 : popup pédagogique générique (non lié à une étape Histoire, ex. Village/Production).
  if (typeof maybeShowGenericTutorial === "function") maybeShowGenericTutorial(tabName);
  if (typeof maybeShowVillageQuestTutorial === "function") maybeShowVillageQuestTutorial(tabName); // v3.111.0 (Lot B)
}

function renderAll() {
  renderHud();
  renderEnemy();
  renderStats();
  renderPanel();
  updateQuestBadge();
  if (typeof renderHealButtons === "function") renderHealButtons();
  if (typeof renderSpecialAttackButton === "function") renderSpecialAttackButton();
  if (typeof renderDefenseButton === "function") renderDefenseButton();
  if (typeof renderActivePotionsBar === "function") renderActivePotionsBar();
  if (typeof renderCombatHeroMini === "function") renderCombatHeroMini();
  if (typeof renderClassSkillButtons === "function") renderClassSkillButtons(); // v3.241.0 : compétences dès l'entrée en combat
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

  // v3.212.0 : la feuille basse du Grimoire vit hors de #panel-container (isolation:
  // isolate y enfermait son z-index sous la barre du bas). Alimentée à chaque rendu,
  // et vidée dès qu'on quitte l'écran.
  if (typeof renderGrimoireSheet === "function") renderGrimoireSheet(game.activeTab === "grimoire");
  // v3.244.0 : même mécanique pour les feuilles Stats / Capacités du Résumé du héros.
  if (typeof renderHerosSheet === "function") renderHerosSheet(game.activeTab === "more");

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
    case "scene": // v3.120.0 (Lot S1) : scene-engine générique, écran plein cadre exclusif (comme combat)
      container.innerHTML = buildSceneScreenHTML();
      break;
    case "dungeon":
      container.innerHTML = buildDungeonHTML();
      break;
    case "achievements":
      container.innerHTML = buildAchievementsHTML();
      break;
    case "afflictions": // v3.254.0 : écran supprimé — une sauvegarde d'avant la v3.245.0 peut encore pointer dessus
      container.innerHTML = '<div class="panel-card"><p class="panel-sub">' + _t("Les Marques se choisissent désormais à l’entrée d’un donjon (Campement → Expédition → Donjon).") + '</p></div>';
      break;
    case "tutorials": // v3.208.0 : ui/tutorials-view.js (consultation des popups pédagogiques)
      container.innerHTML = buildBestiaryHTML(); // v3.405.0 : Tutoriels est un onglet de la Bibliothèque
      break;
    default:
      container.innerHTML = "";
  }

  // v3.131.0 (retour Seb, mobile) : neutralise le padding-bottom du panel pour les écrans à
  // sous-onglets (.subtab-page) — voir css/02-layout.css #panel-container.has-subtab-page,
  // évite le double compte de safe-bottom qui créait un espace vide visible entre la barre de
  // sous-onglets (Équipement/Inventaire/Boutique, etc.) et la barre de navigation du bas.
  container.classList.toggle("has-subtab-page", !!container.querySelector(".subtab-page"));

  // v3.190.0 : cadre principal v2 — décoration 3 rangées de chaque .nb-page-frame
  // (voir ui/kframe-decorator.js), AVANT la restauration du scroll (les hauteurs changent).
  if (window.decoratePageFrames) decoratePageFrames(container);

  if (sameTab) {
    container.scrollTop = savedScrollTop;
    if (savedInnerScrollTop !== null) {
      var newInnerScroll = container.querySelector(".subtab-page-content");
      if (newInnerScroll) newInnerScroll.scrollTop = savedInnerScrollTop;
    }
  }
  lastRenderedTab = game.activeTab;
  // v3.401.0 (lot O-1) : les bulles du HUD remontent au-dessus des sous-onglets du bas
  if (typeof liftHudDock === "function") liftHudDock();
}

window.esc = esc;
window.buildEquipmentIconHTML = buildEquipmentIconHTML;
window.switchTab = switchTab;
window.renderAll = renderAll;
window.renderPanel = renderPanel;