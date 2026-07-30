"use strict";

var gameLog = window.gameLog || [];

/* ============================================================
Ajoute une entrée au journal avec texte, type et timestamp, puis limite l’historique à 100 éléments. 
============================================================ */

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