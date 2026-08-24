"use strict";
/* ui/log-view.js — écran Journal : 50 événements les plus récents (window.gameLog). Détail complet : COMMENTAIRES_ORIGINAUX.md */

function buildLogHTML() {
  var entries = window.gameLog || [];
  var h = '<div id="log-container">';

  if (!entries.length) {
    h += '<div style="color:var(--nb-ink-dim);text-align:center;padding:20px;">Aucun événement.</div>';
  } else {
    entries.slice(0, 50).forEach(function (e) {
      h += '<div class="log-entry ' + esc(e.type || "normal") + '">' + esc(e.text) + '</div>';
    });
  }

  h += '</div>';
  return '<div class="nb-page-frame">' + h + '</div>';
}

window.buildLogHTML = buildLogHTML;
