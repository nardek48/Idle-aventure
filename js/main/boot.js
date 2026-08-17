"use strict";
/* ============================================================
Quest Idle — main/boot.js
Point d'entrée du jeu : c'est le DERNIER script chargé par
index.html, donc au moment où init() s'exécute, absolument tout
(data/systems/ui) est déjà disponible. Ordre exact des opérations
dans init() : defaults -> chargement sauvegarde -> quêtes -> premier
ennemi -> récompenses hors-ligne éventuelles -> recalcul des stats ->
premier rendu -> démarrage des boucles (auto-tap + boucle de jeu).
============================================================ */

var gameStarted = false;

/* Initialise toute la partie. gameStarted évite un double-appel
   accidentel (ex: si jamais appelée à la fois par l'event
   DOMContentLoaded et manuellement). */
function init() {
  if (gameStarted) return;
  gameStarted = true;

  // v2.8 : le HUD, la zone de combat et la barre de stats sont
  // maintenant générés dynamiquement comme tous les autres écrans
  // (voir ui/hud-view.js et ui/combat-view.js). Il faut les injecter
  // AVANT tout le reste, car ensureDailyQuests()/spawnEnemy()/
  // renderAll() ci-dessous s'attendent à trouver ces éléments déjà
  // présents dans le DOM.
  if (typeof mountHudAndStatsBar === "function") mountHudAndStatsBar();
  if (typeof mountCombatArea === "function") mountCombatArea();
  if (typeof renderSpecialAttackButton === "function") renderSpecialAttackButton();
  if (typeof renderDefenseButton === "function") renderDefenseButton();
  if (typeof renderHealButtons === "function") renderHealButtons();
  if (typeof initHealKeyboardShortcuts === "function") initHealKeyboardShortcuts();

  if (typeof ensureGameStateDefaults === "function") {
    ensureGameStateDefaults();
  }

  initSaveSystem();

  var loaded = loadGame();

  // v3.31 : rattrapage de production hors-ligne (voir
  // ProductionManager.catchUpOffline()) — indépendant du flux
  // OfflineManager (or/essence/Aether, plus bas) : chaque bâtiment
  // utilise son propre lastTick, pas game.lastOnline. Silencieux
  // (pas de modale dédiée), doit tourner AVANT le premier rendu pour
  // que l'écran Production affiche déjà le stock rattrapé.
  if (window.ProductionManager && typeof ProductionManager.catchUpOffline === "function") {
    ProductionManager.catchUpOffline();
  }

  ensureDailyQuests();

  // Marque le monde courant comme "déjà atteint" pour le Codex, y
  // compris à la toute première partie (le joueur démarre en Forêt
  // sans jamais passer par WorldManager.advance() pour y arriver).
  if (window.WorldManager && typeof WorldManager.markWorldReached === "function") {
    WorldManager.markWorldReached(WorldManager.worldIndex || 0);
  }

  // Si le joueur a rechargé la page en pleine tentative de donjon,
  // il faut relancer la vague en cours plutôt que de faire apparaître
  // un ennemi normal (sinon game.dungeonRun.active resterait vrai
  // pour un combat qui n'a plus rien d'un donjon).
  if (game.dungeonRun && game.dungeonRun.active && window.DungeonManager) {
    if (typeof DungeonManager.applyDungeonTheme === "function") DungeonManager.applyDungeonTheme(game.dungeonRun.tierId);
    DungeonManager.spawnWave(game.dungeonRun.wave || 1);
  } else {
    CombatEngine.spawnEnemy();
  }

  if (window.QuestManager && typeof QuestManager.checkReset === "function") {
    QuestManager.checkReset();
  }

  if (loaded) {
    addLog("Partie chargée", "event");
    showToast("Partie chargée", 1400);

    if (window.OfflineManager && typeof OfflineManager.calculate === "function") {
      var offline = OfflineManager.calculate();
      if (offline && typeof OfflineManager.show === "function") {
        OfflineManager.show(offline);
      }
    }
  } else {
    addLog("Bienvenue, héros ! Tape l'ennemi pour commencer.", "event");
  }

  if (window.EquipmentManager && typeof EquipmentManager.recalcStats === "function") {
    EquipmentManager.recalcStats();
  }

  if (typeof renderAll === "function") renderAll();

  // v3.7 : l'onglet par défaut au tout premier démarrage n'est plus
  // forcément "combat" (voir game.activeTab, core/state.js — devenu
  // "campement"). L'affichage initial de #game-area/#panel-container
  // reposait jusqu'ici sur leur état CSS par défaut, qui ne
  // correspondait qu'à l'onglet "combat" par coïncidence (switchTab()
  // n'était jamais appelée explicitement au boot). switchTab() est
  // idempotente (rappelable sans effet de bord) — s'assure que
  // l'affichage colle bien à game.activeTab, peu importe lequel.
  if (typeof switchTab === "function") switchTab(game.activeTab || "campement");

  lastTick = Date.now();
  syncAutoTapLoop();
  requestAnimationFrame(gameLoop);
}

/* ============================================================
 Bloque le menu contextuel (clic droit / appui long) SEULEMENT sur
 la zone de combat, pour éviter qu'il s'ouvre accidentellement en
 tapotant vite sur l'ennemi.
============================================================ */

var gameRoot = document.getElementById("game-area");
if (gameRoot) {
  gameRoot.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  });
}

/* ============================================================
Démarre automatiquement le jeu une fois le document prêt (attend
DOMContentLoaded si le HTML est encore en cours de chargement,
sinon lance immédiatement — cas où boot.js serait chargé après coup). 
============================================================ */

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

window.init = init;


