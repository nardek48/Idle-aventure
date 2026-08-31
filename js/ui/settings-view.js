"use strict";
/* ui/settings-view.js — écran Paramètres : sauvegarde/export/import, toggle combat auto, reset complet. Détail : COMMENTAIRES_ORIGINAUX.md */

function buildSettingsHTML() {
  var h = '<button class="settings-btn" onclick="saveGame()">Sauvegarder</button>';
  h += '<button class="settings-btn" onclick="switchTab(\'log\')">📜 Journal</button>';
  // v3.99.15 : onglets cachés par défaut (voir core/state.js:unlockedTabs). v3.100.0 : le
  // déblocage normal passe par la chaîne Histoire (systems/story-quest-system.js) ; ce bouton
  // reste un raccourci qui court-circuite le chapitre (StoryQuestManager.skipAll).
  h += '<button class="settings-btn" onclick="unlockAllTabsFromSettings()">🔓 Débloquer tous les onglets</button>';

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
  var grimoireUnlocked = (typeof isTabUnlocked === "function") ? isTabUnlocked("grimoire") : true;
  h += '<label class="settings-toggle-row">';
  h += '<span>Mode Grimoire (rounds automatiques)</span>';
  h += '<input type="checkbox" id="auto-skills-toggle"' + (game.combatMode === "grimoire" ? ' checked' : '') + (grimoireUnlocked ? '' : ' disabled') + ' onchange="toggleAutoSkills(this.checked)">';
  h += '</label>';
  h += '<p class="panel-sub">Tactique : chaque round attend ton choix (Attaque, compétences, Défense, potion). Grimoire : les rounds s\'enchaînent seuls et tes règles du Grimoire (ou la priorité par défaut) choisissent l\'action.'
    + (grimoireUnlocked ? '' : ' Le mode Grimoire se débloque avec la chaîne Histoire.') + '</p>';
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
  if (!window.CombatEngine || typeof CombatEngine.setCombatMode !== "function") return;
  if (!CombatEngine.setCombatMode(enabled ? "grimoire" : "tactique")) showToast("📖 Le mode Grimoire n\'est pas encore débloqué", 1400);
  if (typeof renderPanel === "function") renderPanel();
}

/* v3.99.15 : débloque tous les onglets (tab-bar du bas + menu ☰ complet) en une
   fois — seul moyen de déblocage pour l'instant, en attendant le vrai système
   progressif par quêtes prévu pour une prochaine session. Construit la liste à
   partir de MENU_ITEMS (menu-view.js, liste canonique du menu ☰) plutôt que de
   dupliquer une liste statique ici, qui se désynchroniserait si un item est
   ajouté/retiré du menu plus tard. */
function unlockAllTabsFromSettings() {
  if (!game.unlockedTabs || typeof game.unlockedTabs !== "object") game.unlockedTabs = {};

  var fixedTabBarTabs = ["campement", "combat", "village", "more"];
  fixedTabBarTabs.forEach(function (t) { game.unlockedTabs[t] = true; });

  if (typeof MENU_ITEMS !== "undefined" && Array.isArray(MENU_ITEMS)) {
    MENU_ITEMS.forEach(function (item) {
      if (item && item.tab) game.unlockedTabs[item.tab] = true;
    });
  }

  // v3.100.0 : chapitre Histoire marqué court-circuité (les étapes n'ont plus rien à débloquer).
  if (window.StoryQuestManager && typeof StoryQuestManager.skipAll === "function") StoryQuestManager.skipAll();

  saveGame();
  if (typeof refreshTabBarVisibility === "function") refreshTabBarVisibility();
  if (typeof renderPanel === "function") renderPanel();
  showToast("Tous les onglets sont débloqués", 1600);
}

window.buildSettingsHTML = buildSettingsHTML;
window.toggleAutoSkills = toggleAutoSkills;
window.unlockAllTabsFromSettings = unlockAllTabsFromSettings;
