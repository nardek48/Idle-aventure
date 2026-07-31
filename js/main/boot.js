"use strict";

var gameStarted = false;

/* ============================================================
Lance l’initialisation globale, applique les defaults, démarre la sauvegarde, recharge la partie, prépare les quêtes, spawn l’ennemi, recalcule les stats puis lance la boucle de jeu. 
============================================================ */

function init() {
  if (gameStarted) return;
  gameStarted = true;

  if (typeof ensureGameStateDefaults === "function") {
    ensureGameStateDefaults();
  }

  initSaveSystem();

  var loaded = loadGame();

  ensureDailyQuests();
  CombatEngine.spawnEnemy();

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

  lastTick = Date.now();
  syncAutoTapLoop();
  requestAnimationFrame(gameLoop);
}

/* ============================================================
 bloquer le clic droit seulement sur la zone de jeu
============================================================ */

var gameRoot = document.getElementById("game-area");
if (gameRoot) {
  gameRoot.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  });
}

/* ============================================================
Empêche certains doubles déclenchements tactiles trop rapprochés. 
============================================================ */
/*
var lastTouchEnd = 0;
document.addEventListener("touchend", function (e) {
  var now = Date.now();
  if (now - lastTouchEnd < 300) e.preventDefault();
  lastTouchEnd = now;
}, { passive: false });
*/
/* ============================================================
Démarre automatiquement le jeu une fois le document prêt. 
============================================================ */

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

window.init = init;


