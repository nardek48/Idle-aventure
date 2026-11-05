"use strict";
/* ui/save-transfer-view.js — v3.459.5 (audit O10) : export et import de la sauvegarde (fichier JSON
   ou code texte), sortis de systems/save-system.js qui garde l'écriture et la lecture. */

/* v2.9 : export/import de sauvegarde (tout repose sur localStorage, rien côté serveur) — fichier JSON téléchargé ou code texte à copier/coller. */

/* Génère le JSON de sauvegarde et déclenche son téléchargement comme
   fichier .json (le navigateur choisit où l'enregistrer). */
/* v3.29 : construit le payload d'export COMPLET (tous les emplacements occupés), partagé par exportSaveToFile() et showExportTextModal(). */
function buildMultiSaveExportPayload() {
  saveGame(); // l'emplacement actif doit être à jour avant de lire les autres
  // Audit 04/11 (SAVE-2) : si l'écriture a échoué (stockage plein), l'actif est exporté depuis la partie en mémoire
  var activeKey = getActiveSaveKey();
  var activeLive = game.heroId && !(saveLockedKey && saveLockedKey === activeKey) && !(typeof instanceLocked !== "undefined" && instanceLocked);

  var slots = {};
  var unreadable = {}; // v3.448.1 : versions illisibles mises de côté, exportées brutes pour être réparées
  var maxSlots = window.MAX_HERO_SLOTS || 3;
  for (var i = 1; i <= maxSlots; i++) {
    if (activeLive && i === getActiveSlot()) slots[i] = JSON.parse(JSON.stringify(buildSaveData()));
    else if (window.HeroSlotManager && HeroSlotManager.hasSlot(i)) {
      try {
        var raw = localStorage.getItem(getSlotKey(i));
        if (raw) slots[i] = JSON.parse(raw);
      } catch (e) { noteErreur("save-system.buildMultiSaveExportPayload", e); }
    }
    try {
      var bad = localStorage.getItem(getSlotKey(i) + SAVE_UNREADABLE_SUFFIX);
      if (bad) unreadable[i] = bad;
    } catch (e) { noteErreur("save-system.buildMultiSaveExportPayload", e); }
  }

  var payload = {
    aethervaleMultiSave: true,
    exportVersion: 1,
    activeSlot: getActiveSlot(),
    slots: slots
  };
  if (Object.keys(unreadable).length) payload.unreadable = unreadable;
  return payload;
}

/* Génère le JSON de sauvegarde et déclenche son téléchargement comme
   fichier .json (le navigateur choisit où l'enregistrer). */
/* v3.29 : bug corrigé — l'export n'incluait que l'emplacement actif ; exporte maintenant TOUS les emplacements occupés (nouveau format enveloppe). */
function exportSaveToFile() {
  var payload = buildMultiSaveExportPayload();
  var json = JSON.stringify(payload, null, 2);
  var blob = new Blob([json], { type: "application/json" });
  var url = URL.createObjectURL(blob);

  var date = new Date().toISOString().slice(0, 10);
  var a = document.createElement("a");
  a.href = url;
  a.download = "aethervale-sauvegarde-" + date + ".json"; // audit 04/11 (SAVE-20) : nom du jeu
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  var slotCount = Object.keys(payload.slots).length;
  showToast("💾 " + _t("Sauvegarde exportée ({n} héros)", { n: slotCount }), 1800);
}

/* Affiche le JSON de sauvegarde dans une modale texte à copier manuellement — repli si le téléchargement de fichier ne convient pas. */
function showExportTextModal() {
  var host = document.getElementById("export-text-root");
  if (!host) return;
  // v3.29 : même correctif que exportSaveToFile() — inclut maintenant
  // tous les emplacements de héros occupés, pas seulement l'actif.
  var json = JSON.stringify(buildMultiSaveExportPayload());

  host.innerHTML = ''
    + '<div class="full-menu-overlay" onclick="if (event.target === this) closeExportTextModal();">'
    +   '<div class="full-menu" style="max-height:75vh;">'
    +     '<div class="full-menu-header"><h2>' + _t("Code de sauvegarde") + '</h2><button class="full-menu-close" type="button" onclick="closeExportTextModal()">✕</button></div>'
    +     '<div class="export-text-body">'
    +       '<p>' + _t("Copie ce texte et garde-le en lieu sûr. Tu pourras le recoller via \"Coller un code\" pour restaurer cette progression.") + '</p>'
    +       '<textarea readonly id="export-text-area" class="export-textarea">' + esc(json) + '</textarea>'
    +       '<button class="settings-btn" type="button" onclick="copyExportText()">' + _t("📋 Copier") + '</button>'
    +     '</div>'
    +   '</div>'
    + '</div>';
}

/* Modale d'import par copier/coller (symétrique de showExportTextModal). */
function showImportTextModal() {
  var host = document.getElementById("export-text-root");
  if (!host) return;

  host.innerHTML = ''
    + '<div class="full-menu-overlay" onclick="if (event.target === this) closeExportTextModal();">'
    +   '<div class="full-menu" style="max-height:75vh;">'
    +     '<div class="full-menu-header"><h2>' + _t("Coller un code") + '</h2><button class="full-menu-close" type="button" onclick="closeExportTextModal()">✕</button></div>'
    +     '<div class="export-text-body">'
    +       '<p>' + _t("Colle ici un code de sauvegarde exporté précédemment. Ça remplacera ta progression actuelle.") + '</p>'
    +       '<textarea id="import-text-area" class="export-textarea" placeholder="' + esc(_t("Colle le code ici...")) + '"></textarea>'
    +       '<button class="settings-btn" type="button" onclick="importSaveFromText(document.getElementById(\'import-text-area\').value)">' + _t("📥 Importer ce code") + '</button>'
    +     '</div>'
    +   '</div>'
    + '</div>';
}

function closeExportTextModal() {
  var host = document.getElementById("export-text-root");
  if (host) host.innerHTML = "";
}

function copyExportText() {
  var area = document.getElementById("export-text-area");
  if (!area) return;
  area.select();

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(area.value)
      .then(function () { showToast(_t("📋 Copié !"), 1200); })
      .catch(function () { showToast(_t("Sélectionne et copie manuellement"), 1500); });
  } else {
    try {
      document.execCommand("copy");
      showToast(_t("📋 Copié !"), 1200);
    } catch (e) {
      showToast(_t("Sélectionne et copie manuellement"), 1500);
    }
  }
}

/* Vérifie grossièrement qu'un objet ressemble à une sauvegarde Aethervale avant de l'appliquer, pour éviter d'écraser la partie par erreur. */
function looksLikeQuestIdleSave(d) {
  return !!(d && typeof d === "object" &&
    typeof d.gold === "number" &&
    typeof d.heroId === "string" &&
    d.equipped !== undefined &&
    d.talents !== undefined);
}

/* Audit 04/11 (SAVE-3) : un héros importable a un nom et un numéro de sauvegarde ; « newer » = version du jeu plus récente. */
function importHeroProblem(d) {
  if (!looksLikeQuestIdleSave(d) || typeof d.version !== "number" || typeof d.playerName !== "string" || !d.playerName.trim()) return "invalid";
  if (typeof isNewerGameVersion === "function" && isNewerGameVersion(d.gameVersion)) return "newer";
  return "";
}

/* Emplacements valides d'un fichier multi-héros, et nombre d'emplacements écartés. */
function importValidSlots(data) {
  var out = { slots: {}, keys: [], skipped: 0, newer: 0 }, maxSlots = window.MAX_HERO_SLOTS || 3;
  Object.keys(data.slots).forEach(function (k) {
    var n = parseInt(k, 10), why = importHeroProblem(data.slots[k]);
    if (!(n >= 1 && n <= maxSlots) || why) { out.skipped++; if (why === "newer") out.newer++; return; }
    out.slots[n] = data.slots[k]; out.keys.push(String(n));
  });
  return out;
}

function importRefusedMessage(newer) {
  return newer ? _t("❌ Ce fichier vient d'une version plus récente du jeu : mets le jeu à jour avant de l'importer.") : _t("❌ Fichier invalide (pas une sauvegarde Aethervale)");
}

/* v3.29 : détecte le nouveau format d'export multi-héros ({ aethervaleMultiSave: true, slots: {...} }), un ou plusieurs héros complets. */
function looksLikeMultiSave(d) {
  return !!(d && typeof d === "object" && d.aethervaleMultiSave === true &&
    d.slots && typeof d.slots === "object" && Object.keys(d.slots).length > 0);
}

/* Applique une sauvegarde importée après confirmation — reconnaît le nouveau format multi-héros ET l'ancien format à un seul héros. */
function applyImportedSave(data) {
  var isMulti = looksLikeMultiSave(data);
  var isSingle = !isMulti && looksLikeQuestIdleSave(data);
  // Audit 04/11 (SAVE-3) : seuls les héros complets sont importés ; un fichier sans aucun est refusé
  var valid = isMulti ? importValidSlots(data) : null;
  var singleWhy = isSingle ? importHeroProblem(data) : "";
  var refused = (isMulti && !valid.keys.length) || (isSingle && singleWhy) || (!isMulti && !isSingle);
  var refusedMsg = importRefusedMessage(isMulti ? valid.newer > 0 : singleWhy === "newer");
  // v3.591.0 : depuis l'accueil, chaque héros importé prend un emplacement libre (rien n'est écrasé)
  if (typeof titleScreenIsOpen === "function" && titleScreenIsOpen()) return importSaveToFreeSlots(refused ? null : (isMulti ? { slots: valid.slots } : data), isMulti, isSingle, refusedMsg);

  if (refused) {
    showToast(refusedMsg, 2600);
    return;
  }

  var doImport = function () {
    if (isMulti) {
      saveLockedKey = null; // import voulu : les emplacements peuvent de nouveau être écrits
      // Écrit chaque emplacement valide dans sa clé localStorage dédiée ; les emplacements absents du fichier restent inchangés.
      var importedCount = 0;
      valid.keys.forEach(function (slotKey) {
        var slotNum = parseInt(slotKey, 10);
        var slotData = valid.slots[slotKey];
        try {
          localStorage.setItem(getSlotKey(slotNum), JSON.stringify(slotData));
          dropSlotBackup(getSlotKey(slotNum));
          importedCount++;
        } catch (e) { noteErreur("save-system.doImport", e); signalerSauvegardeImpossible(e); } // v3.448.9 : emplacement refusé par le stockage
      });

      var targetSlot = (data.activeSlot && valid.slots[data.activeSlot]) ? Number(data.activeSlot) : Number(valid.keys[0]);
      setActiveSlot(targetSlot);

      // Repart d'un état neuf avant de charger l'emplacement importé
      // (même précaution que HeroSlotManager.switchToSlot()).
      if (typeof createInitialGameState === "function") {
        var keptSaveSupported = game.saveSupported;
        var fresh = createInitialGameState();
        Object.keys(game).forEach(function (k) { delete game[k]; });
        Object.assign(game, fresh);
        game.saveSupported = keptSaveSupported;
      }
      loadGame();
      if (typeof ensureGameStateDefaults === "function") ensureGameStateDefaults();
      if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") StatsSystem.recalcStats();
      if (typeof resumeCombatAfterSlotChange === "function") resumeCombatAfterSlotChange();

      if (typeof renderAll === "function") renderAll();
      showToast("✅ " + (valid.skipped ? _t("Sauvegarde importée ({n} héros, {m} ignoré(s))", { n: importedCount, m: valid.skipped }) : _t("Sauvegarde importée ({n} héros)", { n: importedCount })), 2000);
      addLog("📥 " + _t("Sauvegarde multi-héros importée ({n} héros).", { n: importedCount }), "event");
    } else {
      importSingleSave(data); // ancien format (un seul héros) : dans l'emplacement ACTIF
    }
  };

  // Ferme la modale d'import (copier/coller) AVANT d'ouvrir la
  // confirmation, sinon les deux se superposent et bloquent le clic.
  if (typeof closeExportTextModal === "function") closeExportTextModal();

  var confirmMsg = isMulti
    ? _t("Ceci va REMPLACER la progression des héros présents dans ce fichier ({n}). Cette action est irréversible.", { n: valid.keys.length })
    : _t("Ceci va REMPLACER toute la progression de l'emplacement ACTIF par celle importée. Cette action est irréversible.");

  if (typeof showConfirmModal === "function") {
    showConfirmModal(_t("Importer cette sauvegarde ?"), confirmMsg, "📥", doImport);
  } else if (window.confirm(confirmMsg)) {
    doImport();
  }
}

/* Audit 04/11 (SAVE-4) : l'ancien format passe par le chargement protégé (loadGameFromRaw) avant d'être écrit ;
   en cas d'échec, la partie d'avant est rechargée telle quelle et le joueur est prévenu. */
function importSingleSave(data) {
  var key = getActiveSaveKey(), json = JSON.stringify(data), oldRaw = null;
  saveGame();
  try { oldRaw = localStorage.getItem(key); } catch (e) { noteErreur("save-transfer.importSingleSave", e); }
  resetGameToFreshState();
  var ok = loadGameFromRaw(json);
  if (ok) {
    try { localStorage.setItem(key, json); } catch (e) { noteErreur("save-transfer.importSingleSave", e); signalerSauvegardeImpossible(e); ok = false; }
  }
  if (!ok) {
    resetGameToFreshState();
    if (oldRaw) loadGameFromRaw(oldRaw);
  } else {
    saveLockedKey = null; // import voulu : l'emplacement peut de nouveau être écrit
    dropSlotBackup(key);
  }
  if (typeof ensureGameStateDefaults === "function") ensureGameStateDefaults();
  if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") StatsSystem.recalcStats();
  if (typeof resumeCombatAfterSlotChange === "function") resumeCombatAfterSlotChange();
  if (ok) saveGame();
  if (typeof renderAll === "function") renderAll();
  if (ok) { showToast(_t("✅ Sauvegarde importée"), 1800); addLog(_t("📥 Sauvegarde importée."), "event"); }
  else showToast(_t("❌ Import impossible : ta partie n'a pas changé."), 2600);
  return ok;
}
window.importSingleSave = importSingleSave;

/* v3.591.0 : import depuis l'accueil (feuille des Paramètres). Chaque héros du fichier est écrit dans le
   premier emplacement libre ; aucun emplacement occupé n'est touché. Message dans la feuille (titleSettingsSay). */
function importSaveToFreeSlots(data, isMulti, isSingle, refusedMsg) {
  var say = typeof titleSettingsSay === "function" ? titleSettingsSay : function (t) { showToast(t, 2200); };
  if (!data || (!isMulti && !isSingle)) { say(refusedMsg || _t("❌ Fichier invalide (pas une sauvegarde Aethervale)")); return; } // SAVE-3 : rien de valide
  var heroes = isMulti ? Object.keys(data.slots).map(function (k) { return data.slots[k]; }).filter(Boolean) : [data];
  var maxSlots = window.MAX_HERO_SLOTS || 3, written = 0, next = 1;
  heroes.forEach(function (hero) {
    while (next <= maxSlots && HeroSlotManager.hasSlot(next)) next++;
    if (next > maxSlots) return;
    try {
      localStorage.setItem(getSlotKey(next), JSON.stringify(hero));
      dropSlotBackup(getSlotKey(next));
      written++; next++;
    } catch (e) { noteErreur("save-transfer.importSaveToFreeSlots", e); }
  });
  if (!written) { say(_t("Plus d'emplacement libre : supprime une partie avant d'importer.")); return; }
  var left = heroes.length - written;
  say(left ? _t("{n} héros importé(s) ; {m} sans place libre.", { n: written, m: left }) : _tn(written, "{n} héros importé : il t'attend dans « Charger ».", "{n} héros importés : ils t'attendent dans « Charger »."));
  if (typeof renderTitleScreen === "function") renderTitleScreen();
}
window.importSaveToFreeSlots = importSaveToFreeSlots;

/* Lit le fichier choisi via l'input caché (voir index.html) et tente
   de l'importer comme sauvegarde. */
function importSaveFromFile(fileInput) {
  var file = fileInput && fileInput.files && fileInput.files[0];
  if (!file) return;

  var reader = new FileReader();
  reader.onload = function (e) {
    try {
      var data = JSON.parse(e.target.result);
      applyImportedSave(data);
    } catch (err) {
      showToast(_t("❌ Fichier illisible (JSON invalide)"), 2200);
    }
    fileInput.value = "";
  };
  reader.onerror = function () {
    showToast(_t("❌ Erreur de lecture du fichier"), 1800);
  };
  reader.readAsText(file);
}

function importSaveFromText(text) {
  try {
    var data = JSON.parse(text);
    applyImportedSave(data);
  } catch (err) {
    showToast(_t("❌ Texte invalide (JSON incorrect)"), 2200);
  }
}

function triggerImportFilePicker() {
  var input = document.getElementById("import-save-file-input");
  if (input) input.click();
}

window.exportSaveToFile = exportSaveToFile;
window.showExportTextModal = showExportTextModal;
window.showImportTextModal = showImportTextModal;
window.closeExportTextModal = closeExportTextModal;
window.copyExportText = copyExportText;
window.importSaveFromFile = importSaveFromFile;
window.importSaveFromText = importSaveFromText;
window.triggerImportFilePicker = triggerImportFilePicker;
