"use strict";

var lastTick = Date.now();

/* ============================================================
Redémarre proprement l’intervalle d’auto tap et exécute CombatEngine.autoTap() toutes les 2 secondes. 
============================================================ */


function syncAutoTapLoop() {
  if (autoTapInterval) {
    clearInterval(autoTapInterval);
    autoTapInterval = null;
  }

  autoTapInterval = setInterval(function () {
    CombatEngine.autoTap();
  }, 2000);
}

/* ============================================================
Gère le temps réel, le dt, le temps de jeu, le suivi de quête combatTime, l’auto attack, la régénération, l’intérêt, le reset des quêtes et le rafraîchissement du HUD / HP. 
============================================================ */

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

  CombatEngine.autoAttack(dt);

  if (game.talents.t_regenerate) {
    game.essence += dt;
  }

  if (game.talents.t_interest) {
    game._interestTimer = (game._interestTimer || 0) + dt;
    while (game._interestTimer >= 10) {
      var bonus = Math.floor(game.gold * 0.0005);
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

  requestAnimationFrame(gameLoop);
}

window.syncAutoTapLoop = syncAutoTapLoop;