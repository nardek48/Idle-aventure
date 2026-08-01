"use strict";
/* ============================================================
Quest Idle — main/log-service.js
Le journal d'événements du jeu (window.gameLog), lu par
ui/log-view.js. addLog() est appelée un peu partout dans le code
à chaque événement notable (kill, achat, ascension...). Les entrées
les plus récentes sont en tête de tableau (unshift), limité à 100.
============================================================ */

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