"use strict";
/* ============================================================
Quest Idle — ui/log-view.js
Écran "Journal" : affiche les 50 événements les plus récents
(window.gameLog, alimenté par addLog() dans main/log-service.js).
============================================================ */

function buildLogHTML() {
  var entries = window.gameLog || [];
  var h = '<div id="log-container">';

  if (!entries.length) {
    h += '<div style="color:var(--text-dim);text-align:center;padding:20px;">Aucun événement.</div>';
  } else {
    entries.slice(0, 50).forEach(function (e) {
      h += '<div class="log-entry ' + esc(e.type || "normal") + '">' + esc(e.text) + '</div>';
    });
  }

  h += '</div>';
  return h;
}

window.buildLogHTML = buildLogHTML;