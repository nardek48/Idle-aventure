"use strict";
/* main/game-loop.js — boucle principale (requestAnimationFrame) + intervalle d'auto-tap séparé (setInterval, rythme variable par talent).
   Détail complet (chaque tick expliqué) : COMMENTAIRES_ORIGINAUX.md */

var lastTick = Date.now();

var questBadgeThrottleAccum = 0;

var BLOCKING_MODAL_IDS = ["cycle-modal-root", "map-modal-root", "dungeon-modal-root", "village-modal-root", "talent-modal-root", "adventure-quest-modal-root"];
function isBlockingModalOpen() {
  for (var i = 0; i < BLOCKING_MODAL_IDS.length; i++) {
    var el = document.getElementById(BLOCKING_MODAL_IDS[i]);
    if (el && el.innerHTML && el.innerHTML.length > 0) return true;
  }
  return false;
}
window.isBlockingModalOpen = isBlockingModalOpen;

function syncAutoTapLoop() {
  if (autoTapInterval) {
    clearInterval(autoTapInterval);
    autoTapInterval = null;
  }

  var autoTapLevel = (game.talents && game.talents.t_auto_tap) || 0;
  var interval = autoTapLevel >= 3 ? 1000 : autoTapLevel === 2 ? 1500 : 2000;
  if (game.talents && game.talents.t_battle_trance) {
    interval = Math.floor(interval / (1 + 0.12 * game.talents.t_battle_trance));
  }

  // Vitesse de combat (game.combatSpeed) accélère aussi l'auto-tap.
  interval = Math.max(1, Math.floor(interval / getCombatSpeedMult()));

  autoTapInterval = setInterval(function () {
    if (typeof isBlockingModalOpen === "function" && isBlockingModalOpen()) return;
    CombatEngine.autoTap();
  }, interval);
}

// Multiplicateur de vitesse de combat (x1/x2/x4) — UNIQUEMENT pour les
// ticks de combat actif/Donjon et l'auto-tap. Ne touche jamais la
// production du village ni la progression monde/cycle (voir Changelog).
function getCombatSpeedMult() {
  var s = Number(game.combatSpeed || 1);
  return (s === 2 || s === 4) ? s : 1;
}
window.getCombatSpeedMult = getCombatSpeedMult;

function gameLoop() {
  var now = Date.now();
  var dt = (now - lastTick) / 1000;
  lastTick = now;

  if (!isFinite(dt) || dt < 0) dt = 0;
  if (dt > 0.25) dt = 0.25;

  game.playTime += dt;

  if (window.QuestManager && typeof QuestManager.track === "function") {
    QuestManager.track("combatTime", dt);
  }

  var modalOpen = isBlockingModalOpen();

  var heroDowned = (game.heroHp || 0) <= 0;

  var inCombatScreen = game.activeTab === "combat" && !modalOpen && !heroDowned;
  var combatDt = inCombatScreen ? dt * getCombatSpeedMult() : dt;

  if (inCombatScreen) {
    CombatEngine.autoAttack(combatDt);
  }

  if (inCombatScreen && typeof CombatEngine.tickBasicAttackCooldown === "function") {
    CombatEngine.tickBasicAttackCooldown(combatDt);
  }

  if (window.VillageManager && typeof VillageManager.tickAmbientHunting === "function") {
    VillageManager.tickAmbientHunting(dt);
  }

  if (window.ProductionManager && typeof ProductionManager.tick === "function") {
    ProductionManager.tick(dt);
  }

  if (window.WarehouseManager && typeof WarehouseManager.tickCraftQueue === "function") {
    WarehouseManager.tickCraftQueue(dt);
  }

  if (inCombatScreen && typeof CombatEngine.enemyAttackTick === "function") {
    CombatEngine.enemyAttackTick(combatDt);
  }

  if (inCombatScreen && typeof CombatEngine.enemyChargeTick === "function") {
    CombatEngine.enemyChargeTick(combatDt);
  }

  if (inCombatScreen && typeof CombatEngine.enemySilenceTick === "function") {
    CombatEngine.enemySilenceTick(combatDt);
  }

  if (inCombatScreen && typeof CombatEngine.bossPatternTick === "function") {
    CombatEngine.bossPatternTick(combatDt);
  }

  if (window.PotionManager && typeof PotionManager.tick === "function") {
    var potionExpired = PotionManager.tick();
    game._potionUiTimer = (game._potionUiTimer || 0) + dt;
    if (potionExpired || game._potionUiTimer >= 1) {
      game._potionUiTimer = 0;
      if (game.activeTab === "shop" && typeof renderPanel === "function") renderPanel();
    }
  }

  if (game.talents.t_regenerate) {
    game.essence += dt;
  }

  if (window.PotionManager && typeof renderHealButtons === "function") {
    game._healUiTimer = (game._healUiTimer || 0) + dt;
    if (game._healUiTimer >= 1) {
      game._healUiTimer = 0;
      renderHealButtons();
    }
  }

  if (window.ClassCombatManager && typeof ClassCombatManager.tick === "function") {
    ClassCombatManager.tick(combatDt);
  }

  if (window.ClassCombatManager && typeof ClassCombatManager.tickAutoSkills === "function") {
    ClassCombatManager.tickAutoSkills(combatDt);
  }
  if (window.ClassCombatManager && typeof ClassCombatManager.tryAutoBasicAttack === "function") {
    ClassCombatManager.tryAutoBasicAttack();
  }

  if (window.ClassCombatManager && typeof renderClassSkillButtons === "function") {
    game._classSkillsUiTimer = (game._classSkillsUiTimer || 0) + dt;
    if (game._classSkillsUiTimer >= 1) {
      game._classSkillsUiTimer = 0;
      renderClassSkillButtons();
    }
  }

  if (window.PotionManager && typeof renderActivePotionsBar === "function") {
    game._activePotionsUiTimer = (game._activePotionsUiTimer || 0) + dt;
    if (game._activePotionsUiTimer >= 1) {
      game._activePotionsUiTimer = 0;
      renderActivePotionsBar();
    }
  }

  if (game.talents.t_interest) {
    game._interestTimer = (game._interestTimer || 0) + dt;
    while (game._interestTimer >= 10) {
      var bonus = Math.floor(10 * 2 * game.talents.t_interest * Number(game.goldMult || 1));
      if (bonus > 0) {
        game.gold += bonus;
        game.totalGoldEarned += bonus;
        if (window.QuestManager && typeof QuestManager.track === "function") {
          QuestManager.track("goldEarned", bonus);
        }
      }
      game._interestTimer -= 10;
    }
  }

  if (window.QuestManager && typeof QuestManager.checkReset === "function") {
    QuestManager.checkReset();
  }

  if (typeof renderHud === "function") renderHud();
  if (typeof renderEnemyHp === "function") renderEnemyHp();

  questBadgeThrottleAccum += dt;
  if (questBadgeThrottleAccum >= 1) {
    questBadgeThrottleAccum = 0;
    if (typeof updateQuestBadge === "function") updateQuestBadge();
  }

  requestAnimationFrame(gameLoop);
}

window.syncAutoTapLoop = syncAutoTapLoop;
