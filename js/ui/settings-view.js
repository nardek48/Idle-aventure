"use strict";
/* ui/settings-view.js — écran Paramètres : sauvegarde/export/import, toggle combat auto, reset complet. Détail : COMMENTAIRES_ORIGINAUX.md */

function buildSettingsHTML() {
  var h = '<button class="settings-btn" onclick="saveGame()">' + _t("Sauvegarder") + '</button>';
  h += '<button class="settings-btn" onclick="switchTab(\'log\')"><img class=ico-inline src=images/Icons/quests/quest_story.png> ' + _t("Journal") + '</button>';
  // v3.99.15 : onglets cachés par défaut (voir core/state.js:unlockedTabs). v3.100.0 : le
  // déblocage normal passe par la chaîne Histoire (systems/story-quest-system.js) ; ce bouton
  // reste un raccourci qui court-circuite le chapitre (StoryQuestManager.skipAll).
  h += '<button class="settings-btn" onclick="unlockAllTabsFromSettings()"><img class=ico-inline src=images/Icons/system/lock_open.png> ' + _t("Débloquer tous les onglets") + '</button>';

  h += '<div class="panel-card">';
  h += '<h3><img class=ico-inline src=images/Icons/system/save.png> ' + _t("Sauvegarde") + '</h3>';
  h += '<p class="panel-sub">' + _t("Le jeu ne sauvegarde que dans ce navigateur. Exporte régulièrement une copie pour ne rien perdre en cas de changement d'appareil ou de nettoyage du cache.") + '</p>';
  h += '<button class="settings-btn" onclick="exportSaveToFile()"><img class=ico-inline src=images/Icons/system/export.png> ' + _t("Exporter (fichier)") + '</button>';
  h += '<button class="settings-btn" onclick="showExportTextModal()"><img class=ico-inline src=images/Icons/quests/quest_list.png> ' + _t("Exporter (code à copier)") + '</button>';
  h += '<button class="settings-btn" onclick="triggerImportFilePicker()"><img class=ico-inline src=images/Icons/system/import.png> ' + _t("Importer un fichier") + '</button>';
  h += '<button class="settings-btn" onclick="showImportTextModal()"><img class=ico-inline src=images/Icons/quests/quest_list.png> ' + _t("Importer un code") + '</button>';
  h += '</div>';

  h += '<div class="panel-card">';
  h += '<h3><img class=ico-inline src=images/Icons/combat_stats/stat_attack.png> ' + _t("Combat") + '</h3>';
  var grimoireUnlocked = (typeof isTabUnlocked === "function") ? isTabUnlocked("grimoire") : true;
  h += '<label class="settings-toggle-row">';
  h += '<span>' + _t("Mode Grimoire (rounds automatiques)") + '</span>';
  h += '<input type="checkbox" id="auto-skills-toggle"' + (game.combatMode === "grimoire" ? ' checked' : '') + (grimoireUnlocked ? '' : ' disabled') + ' onchange="toggleAutoSkills(this.checked)">';
  h += '</label>';
  h += '<p class="panel-sub">' + _t("Tactique : chaque round attend ton choix (Attaque, compétences, Défense, potion). Grimoire : les rounds s'enchaînent seuls et tes règles du Grimoire (ou la priorité par défaut) choisissent l'action.")
    + (grimoireUnlocked ? '' : ' ' + _t("Le mode Grimoire se débloque avec la chaîne Histoire.")) + '</p>';
  h += '<button class="settings-btn" onclick="switchTab(\'grimoire\')"><img class=ico-inline src=images/Icons/codex/codex_lore.png> ' + _t("Grimoire de tactiques") + '</button>';
  h += '</div>';

  // v3.332.0 (Évolutions, F4 et B4) : préférences d'affichage de CET appareil (Prefs, hors sauvegarde)
  if (window.Prefs) {
    h += '<div class="panel-card">';
    h += '<h3><img class=ico-inline src=images/Icons/system/settings.png> ' + _t("Affichage") + '</h3>';
    h += '<label class="settings-toggle-row"><span>' + _t("Fil rouge (bouton à côté du portrait)") + '</span>'
      + '<input type="checkbox"' + (Prefs.get("filRouge") ? ' checked' : '') + ' onchange="setDisplayPref(\'filRouge\', this.checked)"></label>';
    h += '<label class="settings-toggle-row"><span>' + _t("Mises en scène des boss") + '</span>'
      + '<input type="checkbox"' + (Prefs.get("bossMoments") ? ' checked' : '') + ' onchange="setDisplayPref(\'bossMoments\', this.checked)"></label>';
    h += '<p class="panel-sub">' + _t("Le fil rouge propose ta prochaine action. Les mises en scène : carte d'entrée, changement de phase, coup final et trophée. Réglages propres à cet appareil.") + '</p>';
    h += '</div>';
  }

  // v3.375.0 (i18n, D3) : l'interface est traduite en anglais — le choix de langue sort de l'Admin.
  // Les libellés des langues restent dans leur propre langue ; la pseudo-langue de test reste à l'Admin.
  if (window.I18n) {
    var curLang = I18n.lang();
    h += '<div class="panel-card">';
    h += '<h3><img class=ico-inline src=images/Icons/system/settings.png> ' + _t("Langue") + (curLang === "fr" ? ' · Language' : '') + '</h3>';
    h += '<div class="settings-lang-row">';
    [["fr", "Français"], ["en", "English"]].forEach(function (l) {
      h += '<button class="settings-btn' + (l[0] === curLang ? ' active' : '') + '" type="button"' + (l[0] === curLang ? ' disabled' : '')
        + ' onclick="confirmLanguageChange(\'' + l[0] + '\')">' + l[1] + (l[0] === curLang ? ' ✓' : '') + '</button>';
    });
    h += '</div>';
    // v3.377.0 (EN-3) : tout le contenu est traduit, « (beta) » et la note sur le Désert disparaissent
    h += '<p class="panel-sub">' + _t("Le jeu redémarre pour changer de langue.") + '</p>';
    h += '</div>';
  }

  // v3.359.0 : installer le jeu sur l'appareil (main/pwa.js)
  if (typeof buildPwaSettingsCardHTML === "function") h += buildPwaSettingsCardHTML();

  h += '<button class="settings-btn danger" onclick="resetGame()">' + _t("Réinitialiser tout") + '</button>';

  h += '<div class="panel-card">';
  h += '<h3><img class=ico-inline src=images/Icons/subtabs/potions.png> ' + _t("Développement") + '</h3>';
  h += '<p class="panel-sub">' + _t("Outil de test, sans effet sur ta partie (pas de sauvegarde, pas de récompense).") + '</p>';
  h += '<button class="settings-btn" onclick="switchTab(\'admin\')">' + _t("🛠️ Admin") + '</button>';
  // v3.163.0 : Atelier UI — galerie de contrôle des composants (vrai CSS,
  // vrais assets, tous les états), voir atelier-ui.html à la racine. Ouvre
  // dans un onglet séparé : page indépendante du jeu, aucun état partagé.
  h += '<button class="settings-btn" onclick="window.open(\'atelier-ui.html\', \'_blank\')">' + _t("🎨 Atelier UI") + '</button>';
  // v3.201.0 : maquette de l'écran Personnage (2 onglets), à valider avant tout
  // code dans heros-view.js. Même logique que l'Atelier UI : consultable depuis
  // le téléphone, hors du jeu.
  h += '<button class="settings-btn" onclick="window.open(\'atelier-heros.html\', \'_blank\')"><img class=ico-inline src=images/Icons/combat_stats/stat_defense.png> ' + _t("Atelier Héros") + '</button>';
  // v3.203.4 : atelier des cadres parchemin, à juger sur téléphone avant tout
  // usage dans le jeu. Aucun écran ne les utilise à ce stade.
  h += '<button class="settings-btn" onclick="window.open(\'atelier-cadres.html\', \'_blank\')">' + _t("🖼️ Atelier Cadres") + '</button>';
  h += '</div>';

  h += '<div class="settings-info">';
  h += '<strong>' + _t("Aethervale") + '</strong><br><br>';
  h += (game.saveSupported ? _t("Sauvegarde : locale navigateur.") : _t("Sauvegarde : indisponible.")) + '<br>';
  h += _t("La progression hors-ligne, l'équipement et les quêtes sont activés.");
  h += '</div>';
  return '<div class="nb-page-frame kframe-page" data-kf-title="' + esc("images/Icons/system/settings.png|" + _t("Options")) + '">' + h + '</div>';
}

function toggleAutoSkills(enabled) {
  if (!window.CombatEngine || typeof CombatEngine.setCombatMode !== "function") return;
  if (!CombatEngine.setCombatMode(enabled ? "grimoire" : "tactique")) showToast(_t("📖 Le mode Grimoire n'est pas encore débloqué"), 1400);
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

  // v3.244.0 : ces onglets ont quitté MENU_ITEMS (chantier Navigation) mais restent
  // des verrous d'Histoire — sans cette liste, le déverrouillage global les oublierait.
  var relocatedTabs = ["dungeon", "shop", "talents", "equip", "ascension", "map", "grimoire", "quests"];
  relocatedTabs.forEach(function (t) { game.unlockedTabs[t] = true; });

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
  showToast(_t("Tous les onglets sont débloqués"), 1600);
}

window.buildSettingsHTML = buildSettingsHTML;

/* v3.375.0 : changer de langue relance le jeu (D2) — on le dit avant. */
function confirmLanguageChange(lang) {
  if (!window.I18n || lang === I18n.lang()) return;
  var go = function () { I18n.setLang(lang); };
  if (typeof showConfirmModal === "function") {
    showConfirmModal(lang === "en" ? "Switch to English?" : "Passer en français ?",
      lang === "en" ? "The game will restart. Your progress is saved first." : "Le jeu va redémarrer. Ta progression est sauvegardée avant.",
      "images/Icons/system/settings.png", go);
  } else go();
}
window.confirmLanguageChange = confirmLanguageChange;
window.toggleAutoSkills = toggleAutoSkills;

/* v3.332.0 : préférence d'affichage (Prefs). Le HUD relit le fil rouge à l'image suivante. */
function setDisplayPref(key, value) {
  if (!window.Prefs) return;
  Prefs.set(key, value);
  if (typeof renderHud === "function") renderHud();
}
window.setDisplayPref = setDisplayPref;
window.unlockAllTabsFromSettings = unlockAllTabsFromSettings;
