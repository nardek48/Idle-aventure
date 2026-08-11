"use strict";
/* ============================================================
Quest Idle — main/game-loop.js
La boucle de jeu principale (requestAnimationFrame), et la gestion
de l'intervalle d'auto-tap séparé (setInterval, car son rythme
change avec un talent — pas besoin d'être dans la boucle à 60fps).
============================================================ */

var lastTick = Date.now();

/* (Re)démarre l'intervalle d'auto-tap (talent Main spectrale) au bon
   rythme : 2s par défaut, ~1.79s avec Transe de bataille (+12% vitesse).
   À rappeler chaque fois qu'un talent qui affecte ce rythme change
   (voir buyTalentNode/respecTalents en progression-system.js). */
function syncAutoTapLoop() {
  if (autoTapInterval) {
    clearInterval(autoTapInterval);
    autoTapInterval = null;
  }

  var interval = 2000;
  if (game.talents && game.talents.t_battle_trance) {
    interval = Math.floor(interval / 1.12);
  }

  autoTapInterval = setInterval(function () {
    CombatEngine.autoTap();
  }, interval);
}

/* La boucle de jeu, rappelée à chaque frame via requestAnimationFrame.
   Calcule le delta-temps (dt, plafonné à 0.25s pour éviter les gros
   sauts si l'onglet était en arrière-plan), puis avance tout ce qui
   dépend du temps : auto-attaque, riposte ennemie, régénération
   d'essence (Régénération), intérêt composé sur l'or (toutes les 10s),
   reset des quêtes journalières si le délai est passé, et rafraîchit
   le HUD/PV ennemi à chaque frame. */
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

  // v2.10 : la riposte ennemie ne s'applique QUE quand le joueur est
  // réellement sur l'écran Combat — avant, elle tournait en continu
  // même en naviguant dans les autres onglets, faisant baisser les PV
  // "dans le dos" du joueur sans qu'il puisse réagir. Le reste (auto
  // DPS, potions, régénération, intérêt composé...) continue de
  // tourner normalement en arrière-plan, seule la riposte est mise
  // en pause hors de l'écran Combat.
  if (game.activeTab === "combat" && typeof CombatEngine.enemyAttackTick === "function") {
    CombatEngine.enemyAttackTick(dt);
  }

  // Potions temporaires : purge celles qui viennent d'expirer, et
  // rafraîchit le compte à rebours affiché si l'onglet Boutique est
  // ouvert (pas besoin de redessiner ailleurs, personne ne le voit).
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

  // Bouton de soin rapide : rafraîchi chaque seconde pour que le
  // cooldown se débloque visuellement tout seul, sans action du joueur.
  if (window.PotionManager && typeof renderHealButtons === "function") {
    game._healUiTimer = (game._healUiTimer || 0) + dt;
    if (game._healUiTimer >= 1) {
      game._healUiTimer = 0;
      renderHealButtons();
    }
  }

  // Idem pour le bouton d'attaque spéciale (compte à rebours du cooldown).
  if (window.SpecialAttackManager && typeof renderSpecialAttackButton === "function") {
    game._specialUiTimer = (game._specialUiTimer || 0) + dt;
    if (game._specialUiTimer >= 1) {
      game._specialUiTimer = 0;
      renderSpecialAttackButton();
    }
  }

  // Idem pour le bouton de défense.
  if (window.DefenseManager && typeof renderDefenseButton === "function") {
    game._defenseUiTimer = (game._defenseUiTimer || 0) + dt;
    if (game._defenseUiTimer >= 1) {
      game._defenseUiTimer = 0;
      renderDefenseButton();
    }
  }

  // v2.90 : barre de mini-icônes des potions actives (écran Combat).
  if (window.PotionManager && typeof renderActivePotionsBar === "function") {
    game._activePotionsUiTimer = (game._activePotionsUiTimer || 0) + dt;
    if (game._activePotionsUiTimer >= 1) {
      game._activePotionsUiTimer = 0;
      renderActivePotionsBar();
    }
  }

  // Talent "Intérêt composé" : +0.05% de l'or actuel toutes les 10s
  // (accumulateur pour rester précis même avec des dt irréguliers).
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