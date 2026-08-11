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
    // v2.90.7 : var(--text-dim) (ancien thème sombre) remplacé par
    // var(--nb-ink-dim) (thème parchemin actuel) — même bug que
    // .log-entry ci-dessous, contraste insuffisant sur fond crème.
    h += '<div style="color:var(--nb-ink-dim);text-align:center;padding:20px;">Aucun événement.</div>';
  } else {
    entries.slice(0, 50).forEach(function (e) {
      h += '<div class="log-entry ' + esc(e.type || "normal") + '">' + esc(e.text) + '</div>';
    });
  }

  h += '</div>';
  return '<div class="nb-page-frame">' + h + '</div>'; // v2.83.28
}

window.buildLogHTML = buildLogHTML;