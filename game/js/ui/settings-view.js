"use strict";
/* ui/settings-view.js — écran Paramètres (v3.408.0 : trois onglets en rail) : sauvegarde/export/import, mode de combat, affichage, langue, reset complet. Détail : COMMENTAIRES_ORIGINAUX.md */

/* v3.408.0 (refonte de l'onglet, atelier-parametres.html : Seb choisit B · Rail et S1 · glissière) :
   trois onglets en rail du kit — Partie (sauvegarde, zone de danger), Jeu (mode de combat,
   fil rouge, mises en scène), Appareil (langue, installation, tablette, à propos).
   Retirés : bouton Journal (dans le Menu), bouton Grimoire (Héros), boutons d'ateliers morts,
   carte « Développement » (l'Admin devient un lien discret en bas d'Appareil). */
var settingsTab = "partie"; // "partie" | "jeu" | "appareil"
function setSettingsTab(tab) {
  settingsTab = (tab === "jeu" || tab === "appareil") ? tab : "partie";
  if (typeof renderPanel === "function") renderPanel();
}
window.setSettingsTab = setSettingsTab;

/* Interrupteur du kit (S1 · glissière bronze et or) */
function kSwitchHTML(on, onclick, label) {
  return '<button type="button" class="kswitch' + (on ? ' is-on' : '') + '" role="switch" aria-checked="' + (on ? 'true' : 'false') + '"'
    + (label ? ' aria-label="' + esc(label) + '"' : '') + ' onclick="' + onclick + '"></button>';
}
window.kSwitchHTML = kSwitchHTML;

function settingsRowHTML(icon, title, sub, ctrl) {
  return '<div class="set-row"><img class="set-row-ico" src="' + icon + '" alt=""><div class="set-row-txt"><b>' + title + '</b>'
    + (sub ? '<small>' + sub + '</small>' : '') + '</div>' + (ctrl || '') + '</div>';
}

function buildSettingsPartieHTML() {
  var h = '<div class="set-card">';
  h += '<div class="kkick">' + _t("Sauvegarde") + '</div>';
  h += '<p>' + _t("Le jeu se sauvegarde tout seul toutes les 30 secondes, dans ce navigateur. Exporte une copie de temps en temps : elle te suit sur un autre appareil.") + '</p>';
  h += '<div class="set-stack">';
  h += '<button class="settings-btn primary" onclick="saveGame()"><img class=ico-inline src=images/Icons/system/save.png> ' + _t("Sauvegarder maintenant") + '</button>';
  h += '<div class="set-pair"><button class="settings-btn" onclick="exportSaveToFile()"><img class=ico-inline src=images/Icons/system/export.png> ' + _t("Exporter") + '</button>';
  h += '<button class="settings-btn" onclick="triggerImportFilePicker()"><img class=ico-inline src=images/Icons/system/import.png> ' + _t("Importer") + '</button></div>';
  h += '<div class="set-links"><button type="button" class="klink" onclick="showExportTextModal()">' + _t("Copier le code de sauvegarde") + '</button>';
  h += '<button type="button" class="klink" onclick="showImportTextModal()">' + _t("Coller un code") + '</button></div>';
  h += '</div></div>';

  h += '<div class="ksec"><img src="images/Icons/system/warning.png" alt=""><span>' + _t("Zone de danger") + '</span></div>';
  h += '<div class="set-card"><p>' + _t("Effacer la partie supprime ton héros, ton village et toute ta progression sur cet appareil. C'est définitif.") + '</p>';
  h += '<button class="settings-btn danger" onclick="resetGame()"><img class=ico-inline src=images/Icons/system/trash.png> ' + _t("Effacer la partie") + '</button></div>';
  return h;
}

function buildSettingsJeuHTML() {
  var grimoireUnlocked = (typeof isTabUnlocked === "function") ? isTabUnlocked("grimoire") : true;
  var isGrim = game.combatMode === "grimoire";
  var h = '<div class="set-card">';
  h += '<div class="kkick">' + _t("Mode de combat") + '</div>';
  h += '<div class="kseg set-seg">';
  h += '<button type="button" class="' + (isGrim ? '' : 'is-on') + '" onclick="toggleAutoSkills(false)"><img src="images/Icons/combat_stats/stat_attack.png" alt=""><span>' + _t("Tactique") + '</span></button>';
  h += '<button type="button" class="' + (isGrim ? 'is-on' : '') + '"' + (grimoireUnlocked ? '' : ' disabled') + ' onclick="toggleAutoSkills(true)"><img src="images/Icons/codex/codex_lore.png" alt=""><span>' + _t("Grimoire") + '</span></button>';
  h += '</div>';
  h += '<p>' + (isGrim ? _t("Les rounds s'enchaînent seuls : tes règles du Grimoire (ou la priorité par défaut) choisissent l'action.")
    : _t("Chaque round attend ton choix : attaque, compétences, défense, potion."))
    + (grimoireUnlocked ? '' : ' ' + _t("Le mode Grimoire se débloque avec la chaîne Histoire.")) + '</p>';
  h += '</div>';

  // v3.332.0 (Évolutions, F4 et B4) : préférences d'affichage de CET appareil (Prefs, hors sauvegarde)
  if (window.Prefs) {
    h += '<div class="set-card">';
    h += settingsRowHTML("images/Icons/aether_icon.png", _t("Fil rouge"), _t("La petite bulle qui propose ta prochaine action."),
      kSwitchHTML(Prefs.get("filRouge"), "setDisplayPref('filRouge', " + !Prefs.get("filRouge") + ")", _t("Fil rouge")));
    h += settingsRowHTML("images/Icons/dungeon/boss_crown.png", _t("Mises en scène des boss"), _t("Carte d'entrée, changement de phase, coup final et trophée."),
      kSwitchHTML(Prefs.get("bossMoments"), "setDisplayPref('bossMoments', " + !Prefs.get("bossMoments") + ")", _t("Mises en scène des boss")));
    h += '<p class="set-note">' + _t("Réglages propres à cet appareil.") + '</p>';
    h += '</div>';
  }
  return h;
}

function buildSettingsAppareilHTML() {
  var h = '';
  // v3.375.0 (i18n, D3) : les libellés des langues restent dans leur propre langue
  if (window.I18n) {
    var curLang = I18n.lang();
    h += '<div class="set-card">';
    h += '<div class="kkick">' + _t("Langue") + (curLang === "fr" ? ' · Language' : '') + '</div>';
    h += '<div class="kseg set-seg">';
    [["fr", "Français"], ["en", "English"]].forEach(function (l) {
      h += '<button type="button" class="' + (l[0] === curLang ? 'is-on' : '') + '" onclick="confirmLanguageChange(\'' + l[0] + '\')"><span>' + l[1] + '</span></button>';
    });
    h += '</div>';
    h += '<p>' + _t("Le jeu redémarre pour changer de langue.") + '</p>';
    h += '</div>';
  }

  // v3.359.0 : installer le jeu sur l'appareil (main/pwa.js)
  if (typeof buildPwaSettingsCardHTML === "function") h += buildPwaSettingsCardHTML();

  // v3.406.0 (format tablette) : tablette tenue en portrait — carte visible seulement sur une tablette
  if (window.DesktopScale && DesktopScale.isTablet()) {
    var pch = DesktopScale.portraitChoice();
    h += '<div class="set-card">';
    h += '<div class="kkick">' + _t("Tablette en portrait") + '</div>';
    h += '<div class="kseg set-seg">';
    [["zoom", _t("Téléphone agrandi")], ["rail", _t("Menu à gauche")]].forEach(function (o) {
      h += '<button type="button" class="' + (o[0] === pch ? 'is-on' : '') + '" onclick="DesktopScale.setPortraitChoice(\'' + o[0] + '\')"><span>' + esc(o[1]) + '</span></button>';
    });
    h += '</div>';
    h += '<p>' + _t("En paysage, la tablette utilise toujours le menu à gauche. Réglage propre à cet appareil.") + '</p>';
    h += '</div>';
  }

  h += '<div class="set-about"><b>' + _t("Aethervale") + '</b>'
    + _t("Version {v}", { v: (typeof GAME_VERSION === "string" ? GAME_VERSION : "") }) + ' · '
    + (game.saveSupported ? _t("Sauvegarde : locale navigateur.") : _t("Sauvegarde : indisponible.")) + '</div>';
  h += '<div class="set-links"><button type="button" class="klink" onclick="switchTab(\'admin\')">' + _t("Outils de test (Admin)") + '</button></div>';
  return h;
}

/* tab : optionnel (harnais) — sinon l'onglet actif */
function buildSettingsHTML(tab) {
  var cur = tab || settingsTab;
  var R = [["partie", _t("Partie"), "images/Icons/system/save.png"], ["jeu", _t("Jeu"), "images/Icons/combat_stats/stat_attack.png"], ["appareil", _t("Appareil"), "images/Icons/system/settings.png"]];
  var h = '<div class="kseg is-stack set-tabs">';
  R.forEach(function (r) {
    h += '<button type="button" class="' + (cur === r[0] ? 'is-on' : '') + '" onclick="setSettingsTab(\'' + r[0] + '\')"><img src="' + r[2] + '" alt=""><span>' + r[1] + '</span></button>';
  });
  h += '</div>';
  h += cur === "jeu" ? buildSettingsJeuHTML() : cur === "appareil" ? buildSettingsAppareilHTML() : buildSettingsPartieHTML();
  return '<div class="nb-page-frame nb-page-frame-fill kframe-page settings-page" data-kf-title="' + esc("images/Icons/menu_icons/settings_menu.png|" + _t("Paramètres")) + '">' + h + '</div>';
}

function toggleAutoSkills(enabled) {
  if (!window.CombatEngine || typeof CombatEngine.setCombatMode !== "function") return;
  if (!CombatEngine.setCombatMode(enabled ? "grimoire" : "tactique")) showToast(_t("Le mode Grimoire n'est pas encore débloqué"), 1400);
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

/* v3.332.0 : préférence d'affichage (Prefs). Le HUD relit le fil rouge à l'image suivante.
   v3.408.0 : l'interrupteur se redessine (plus de case à cocher qui garde son état seule). */
function setDisplayPref(key, value) {
  if (!window.Prefs) return;
  Prefs.set(key, value);
  if (typeof renderHud === "function") renderHud();
  if (typeof renderPanel === "function") renderPanel();
}
window.setDisplayPref = setDisplayPref;
window.unlockAllTabsFromSettings = unlockAllTabsFromSettings;
