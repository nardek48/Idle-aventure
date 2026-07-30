"use strict";

/* ============================================================
   Builder paramètres. 
============================================================ */

function buildSettingsHTML() {
  var h = '<div class="panel-title">Paramètres</div>';
  h += '<button class="settings-btn" onclick="saveGame()">Sauvegarder</button>';
  h += '<button class="settings-btn danger" onclick="resetGame()">Réinitialiser tout</button>';
  h += '<div class="settings-info">';
  h += '<strong>Quest Idle</strong><br><br>';
  h += 'Sauvegarde : ' + (game.saveSupported ? 'locale navigateur' : 'indisponible') + '.<br>';
  h += 'La progression hors-ligne, l\'équipement et les quêtes sont activés.';
  h += '</div>';
  return h;
}

window.buildSettingsHTML = buildSettingsHTML;