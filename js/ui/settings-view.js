"use strict";
/* ui/settings-view.js — écran Paramètres : sauvegarde/export/import, toggle combat auto, reset complet. Détail : COMMENTAIRES_ORIGINAUX.md */

function buildSettingsHTML() {
  var h = '<button class="settings-btn" onclick="saveGame()">Sauvegarder</button>';
  h += '<button class="settings-btn" onclick="openOnboarding(true)">🎓 Revoir le tutoriel</button>';
  h += '<button class="settings-btn" onclick="switchTab(\'log\')">📜 Journal</button>';

  h += '<div class="panel-card">';
  h += '<h3>💾 Sauvegarde</h3>';
  h += '<p class="panel-sub">Le jeu ne sauvegarde que dans ce navigateur. Exporte régulièrement une copie pour ne rien perdre en cas de changement d\'appareil ou de nettoyage du cache.</p>';
  h += '<button class="settings-btn" onclick="exportSaveToFile()">📤 Exporter (fichier)</button>';
  h += '<button class="settings-btn" onclick="showExportTextModal()">📋 Exporter (code à copier)</button>';
  h += '<button class="settings-btn" onclick="triggerImportFilePicker()">📥 Importer un fichier</button>';
  h += '<button class="settings-btn" onclick="showImportTextModal()">📋 Importer un code</button>';
  h += '</div>';

  h += '<div class="panel-card">';
  h += '<h3>⚔️ Combat</h3>';
  h += '<label class="settings-toggle-row">';
  h += '<span>Compétences automatiques</span>';
  h += '<input type="checkbox" id="auto-skills-toggle"' + (game.autoSkillsEnabled ? ' checked' : '') + ' onchange="toggleAutoSkills(this.checked)">';
  h += '</label>';
  h += '<p class="panel-sub">Le héros utilise seul ses compétences de classe (1/2/3/Défense) selon la priorité par défaut, ou selon tes règles du Grimoire si tu en as configuré. Désactive pour reprendre la main manuellement.</p>';
  h += '<button class="settings-btn" onclick="switchTab(\'grimoire\')">📖 Grimoire de tactiques</button>';
  h += '</div>';

  h += '<button class="settings-btn danger" onclick="resetGame()">Réinitialiser tout</button>';

  h += '<div class="panel-card">';
  h += '<h3>🧪 Développement</h3>';
  h += '<p class="panel-sub">Outil de test, sans effet sur ta partie (pas de sauvegarde, pas de récompense).</p>';
  h += '<button class="settings-btn" onclick="switchTab(\'admin\')">🛠️ Admin</button>';
  h += '</div>';

  h += '<div class="settings-info">';
  h += '<strong>Aethervale</strong><br><br>';
  h += 'Sauvegarde : ' + (game.saveSupported ? 'locale navigateur' : 'indisponible') + '.<br>';
  h += 'La progression hors-ligne, l\'équipement et les quêtes sont activés.';
  h += '</div>';
  return '<div class="nb-page-frame">' + h + '</div>';
}

function toggleAutoSkills(enabled) {
  game.autoSkillsEnabled = !!enabled;
  if (typeof renderClassSkillButtons === "function") renderClassSkillButtons();
  saveGame();
}

window.buildSettingsHTML = buildSettingsHTML;
window.toggleAutoSkills = toggleAutoSkills;
