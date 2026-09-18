"use strict";
/* main/log-service.js — journal d'événements (window.gameLog), le plus récent en tête, limité à 100. Lu par ui/log-view.js. Détail : COMMENTAIRES_ORIGINAUX.md */

var gameLog = window.gameLog || [];

function addLog(message, type) {
  gameLog.unshift({
    text: String(message || ""),
    type: type || "event",
    at: Date.now()
  });

  if (gameLog.length > 100) {
    gameLog.length = 100;
  }
}

window.addLog = addLog;
