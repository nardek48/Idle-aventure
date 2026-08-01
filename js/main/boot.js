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


