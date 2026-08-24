"use strict";
/* main/boot.js — point d'entrée, dernier script chargé par index.html. Ordre init() : defaults -> load -> quêtes -> 1er ennemi -> offline -> recalc stats -> 1er rendu -> boucles.
   Détail complet : COMMENTAIRES_ORIGINAUX.md */

var gameStarted = false;

function init() {
  if (gameStarted) return;
  gameStarted = true;

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

  if (window.ProductionManager && typeof ProductionManager.catchUpOffline === "function") {
    ProductionManager.catchUpOffline();
  }

  ensureDailyQuests();

  if (window.WorldManager && typeof WorldManager.markWorldReached === "function") {
    WorldManager.markWorldReached(WorldManager.worldIndex || 0);
  }

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

  if (window.WorkshopUnlockManager) {
    if (typeof WorkshopUnlockManager.ensure === "function") WorkshopUnlockManager.ensure();
    if (typeof WorkshopUnlockManager.runRetroactiveCheck === "function") WorkshopUnlockManager.runRetroactiveCheck();
  }

  if (typeof renderAll === "function") renderAll();

  if (typeof switchTab === "function") switchTab(game.activeTab || "campement");

  lastTick = Date.now();
  syncAutoTapLoop();
  requestAnimationFrame(gameLoop);
}

var gameRoot = document.getElementById("game-area");
if (gameRoot) {
  gameRoot.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

window.init = init;
