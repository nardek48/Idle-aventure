"use strict";
/* ============================================================
Quest Idle — ui/settings-view.js
Écran "Paramètres" : sauvegarde manuelle et reset complet (voir
resetGame() dans systems/save-system.js pour la confirmation).
============================================================ */

function buildSettingsHTML() {
  var h = '<button class="settings-btn" onclick="saveGame()">Sauvegarder</button>';
  h += '<button class="settings-btn" onclick="openOnboarding(true)">🎓 Revoir le tutoriel</button>';

  h += '<div class="panel-card">';
  h += '<h3>💾 Sauvegarde</h3>';
  h += '<p class="panel-sub">Le jeu ne sauvegarde que dans ce navigateur. Exporte régulièrement une copie pour ne rien perdre en cas de changement d\'appareil ou de nettoyage du cache.</p>';
  h += '<button class="settings-btn" onclick="exportSaveToFile()">📤 Exporter (fichier)</button>';
  h += '<button class="settings-btn" onclick="showExportTextModal()">📋 Exporter (code à copier)</button>';
  h += '<button class="settings-btn" onclick="triggerImportFilePicker()">📥 Importer un fichier</button>';
  h += '<button class="settings-btn" onclick="showImportTextModal()">📋 Importer un code</button>';
  h += '</div>';

  h += '<button class="settings-btn danger" onclick="resetGame()">Réinitialiser tout</button>';
  h += '<div class="settings-info">';
  h += '<strong>Quest Idle</strong><br><br>';
  h += 'Sauvegarde : ' + (game.saveSupported ? 'locale navigateur' : 'indisponible') + '.<br>';
  h += 'La progression hors-ligne, l\'équipement et les quêtes sont activés.';
  h += '</div>';
  return h;
}

window.buildSettingsHTML = buildSettingsHTML;