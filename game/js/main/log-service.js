"use strict";
/* main/log-service.js — journal d'événements (window.gameLog), le plus récent en tête, limité à 100. Lu par ui/log-view.js. */

var gameLog = window.gameLog || [];

function addLog(message, type) {
  var e = { text: String(message || ""), type: type || "event", at: Date.now() };
  // Round du combat en cours : la Chronique groupe son journal par round (maquette grand-ecran)
  var r = window.game && game.combatRound ? Number(game.combatRound.number) || 0 : 0;
  if (r > 0) e.round = r;
  gameLog.unshift(e);

  if (gameLog.length > 100) {
    gameLog.length = 100;
  }
}

window.addLog = addLog;
