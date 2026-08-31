"use strict";
/* ui/combat-speed-view.js — 3 boutons x1/x2/x4 (game.combatSpeed), visibles
   uniquement en combat/Donjon (#combat-speed-bar, toggle dans switchTab).
   v3.102.0 : accélère l'horloge des rounds automatiques (mode Grimoire / Continuer), voir game-loop.js. */

var COMBAT_SPEED_OPTIONS = [1, 2, 4];

function buildCombatSpeedBarHTML() {
  var h = "";
  COMBAT_SPEED_OPTIONS.forEach(function (s) {
    h += '<button type="button" class="combat-speed-btn" data-speed="' + s + '" onclick="setCombatSpeed(' + s + ')">x' + s + '</button>';
  });
  return h;
}

function renderCombatSpeedBar() {
  var host = document.getElementById("combat-speed-bar");
  if (!host) return;

  if (!host.hasChildNodes()) host.innerHTML = buildCombatSpeedBarHTML();

  var current = Number(game.combatSpeed || 1);
  var buttons = host.querySelectorAll(".combat-speed-btn");
  buttons.forEach(function (btn) {
    btn.classList.toggle("active", Number(btn.getAttribute("data-speed")) === current);
  });
}

function setCombatSpeed(speed) {
  speed = Number(speed);
  if (COMBAT_SPEED_OPTIONS.indexOf(speed) === -1) return;

  game.combatSpeed = speed;
  renderCombatSpeedBar();
  saveGame();
}

window.buildCombatSpeedBarHTML = buildCombatSpeedBarHTML;
window.renderCombatSpeedBar = renderCombatSpeedBar;
window.setCombatSpeed = setCombatSpeed;
