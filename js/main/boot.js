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

  // v3.93.0 : applique un éventuel déblocage de bâtiment "en attente" (quête déjà
  // complétée dans une session précédente, mais jamais revue via son popup de fin
  // depuis) — voir ui/quests-view.js applyQuestUnlockSideEffects(). Idempotent, avant
  // catchUpOffline() pour que le rattrapage de production tienne compte du déblocage.
  if (typeof applyQuestUnlockSideEffects === "function") applyQuestUnlockSideEffects();

  // v3.113.0 : photographie l'état de la Production AVANT le rattrapage — le delta après
  // catchUpOffline() alimente la modale de retour d'absence (voir OfflineManager).
  if (window.OfflineManager && typeof OfflineManager.snapshot === "function") {
    OfflineManager.snapshot();
  }

  if (window.ProductionManager && typeof ProductionManager.catchUpOffline === "function") {
    ProductionManager.catchUpOffline();
  }


  if (window.WorldManager && typeof WorldManager.markWorldReached === "function") {
    WorldManager.markWorldReached(WorldManager.worldIndex || 0);
  }

  if (game.dungeonRun && game.dungeonRun.active && window.DungeonManager) {
    if (typeof DungeonManager.applyDungeonTheme === "function") DungeonManager.applyDungeonTheme(game.dungeonRun.tierId);
    DungeonManager.spawnWave(game.dungeonRun.wave || 1);
  } else {
    CombatEngine.spawnEnemy();
  }

  if (loaded) {
    addLog("Partie chargée", "event");
    showToast("Partie chargée", 1400);

    // v3.113.0 : résumé de retour d'absence basé sur la Production (delta du snapshot
    // pris avant catchUpOffline) — remplace l'ancien calcul or/essence/kills du village.
    if (window.OfflineManager && typeof OfflineManager.summarize === "function") {
      var offline = OfflineManager.summarize();
      if (offline && typeof OfflineManager.show === "function") {
        OfflineManager.show(offline);
      }
    }
    // v3.101.0 : régénération au camp accumulée hors ligne (plafond 50 % PV max), voir systems/camp-system.js
    if (window.CampManager && typeof CampManager.applyRegen === "function") CampManager.applyRegen(true);
  } else {
    addLog("Bienvenue, héros ! Tape l'ennemi pour commencer.", "event");
    // v3.107.2 : bug préexistant — game.resources ne recevait aucune valeur de départ pour une TOUTE
    // première visite (avant même l'échec de loadGame() faute de save). fullResetState() ne s'exécute
    // que via le bouton "Réinitialiser tout", jamais ici. Sans ce correctif, un nouveau joueur n'avait
    // jamais ses 3 rations de départ. Valeurs alignées sur fullResetState() (save-system.js).
    if (game.resources && typeof game.resources.ration !== "number") {
      game.resources.ration = 3;
    }
  }

  if (window.EquipmentManager && typeof EquipmentManager.recalcStats === "function") {
    EquipmentManager.recalcStats();
  }

  if (window.WorkshopUnlockManager) {
    if (typeof WorkshopUnlockManager.ensure === "function") WorkshopUnlockManager.ensure();
    if (typeof WorkshopUnlockManager.runRetroactiveCheck === "function") WorkshopUnlockManager.runRetroactiveCheck();
  }

  // v3.100.0 : chaîne Histoire — état garanti + rattrapage d'un objectif atteint hors ligne.
  if (window.StoryQuestManager && typeof StoryQuestManager.runRetroactiveCheck === "function") {
    StoryQuestManager.runRetroactiveCheck();
  }

  if (typeof renderAll === "function") renderAll();

  // v3.90.0 : reprise d'une expédition en cours (rechargement de page en plein milieu)
  // — jamais de nouveau tirage aléatoire, l'état est déjà figé dans game.explorationRun.
  if (window.ExplorationManager && typeof ExplorationManager.isRunActive === "function" && ExplorationManager.isRunActive()) {
    if (typeof resumeExplorationRun === "function") resumeExplorationRun();
  }

  // v3.92.0 : reprise d'une session de minage en cours (quête "La Veine Instable" ou
  // activité bonus Carrière) — même règle, jamais de reroll après rechargement.
  if (window.MiningManager && typeof MiningManager.getActiveSession === "function" && MiningManager.getActiveSession()) {
    if (typeof resumeMiningSession === "function") resumeMiningSession();
  }

  // v3.94.0 : reprise d'une session de puisage en cours (quête "La Source Tarie" ou
  // activité bonus du Puits) — même règle.
  if (window.WellManager && typeof WellManager.getActiveSession === "function" && WellManager.getActiveSession()) {
    if (typeof resumeWellSession === "function") resumeWellSession();
  }

  if (typeof switchTab === "function") switchTab(game.activeTab || "campement");

  lastTick = Date.now();
  requestAnimationFrame(gameLoop);
}

var gameRoot = document.getElementById("game-area");
if (gameRoot) {
  gameRoot.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  });
}

// v3.99.0 : écran titre (Nouvelle Partie / Charger la Partie, voir
// ui/title-screen-view.js) affiché AVANT init() — le joueur choisit ou crée un
// emplacement de héros, puis openTitleScreen() appelle init() en callback une
// fois résolu. Contrairement à avant (init() direct au chargement), le jeu ne
// démarre plus tant que ce choix n'a pas été fait.
function startGame() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      openTitleScreen(init);
    });
  } else {
    openTitleScreen(init);
  }
}

startGame();

window.init = init;
