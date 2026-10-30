"use strict";
/* ui/title-screen-view.js — écran titre plein écran affiché avant tout boot du jeu
   (voir main/boot.js). 2 boutons : Nouvelle Partie / Charger la Partie.
   "Charger la partie" ouvre la liste des 3 emplacements existants (HeroSlotManager,
   voir systems/save-system.js). "Nouvelle partie" cherche le 1er emplacement vide et
   ouvre directement la création de héros (modal-view.js, système déjà en place).
   v3.99.0. v3.341.0 : « Continuer » en tête (dernier héros joué, nommé sur le bouton),
   « Nouvelle Partie » et « Charger » passent côte à côte en dessous. */

var titleScreenResolved = false; // true une fois qu'un slot est choisi/créé -> init() peut démarrer
var titleScreenView = "main"; // "main" | "load"
var titleScreenPendingCallback = null; // callback appelé une seule fois à la résolution
var titleScreenSelectedSlot = null; // v3.99.11 : emplacement sélectionné (bordure dorée) dans la vue "Charger"
var titleScreenDeleteConfirmSlot = null; // v3.99.11 : emplacement en attente de confirmation de suppression, ou null

/* v3.99.3 : détecte game.saveSupported AVANT le premier rendu de l'écran titre.
   Sans ça, HeroSlotManager.hasSlot() (systems/save-system.js) retourne toujours
   false tant que initSaveSystem() n'a pas tourné — normalement fait dans
   boot.js:init(), qui ne se lance qu'APRÈS que l'écran titre soit résolu. Résultat
   observé : "Charger la partie" affichait 6 emplacements vides même avec des
   parties existantes en localStorage. Même test que initSaveSystem() (juste la
   détection, pas l'autosave/migration — ceux-là restent dans init(), inchangés,
   pour ne pas les déclencher avant qu'un emplacement soit choisi). */
function ensureSaveSupportedDetected() {
  if (typeof game === "undefined" || !game) return;
  if (game.saveSupported) return; // déjà détecté (init() a déjà tourné, ou appel précédent)

  try {
    localStorage.setItem("__quest_idle_test__", "1");
    localStorage.removeItem("__quest_idle_test__");
    game.saveSupported = true;
  } catch (e) {
    game.saveSupported = false;
  }
}

/* Point d'entrée appelé par boot.js à la place d'un init() immédiat.
   callback : fonction à appeler une fois que le joueur a choisi/créé un emplacement. */
function openTitleScreen(callback) {
  ensureSaveSupportedDetected();

  titleScreenPendingCallback = typeof callback === "function" ? callback : null;
  titleScreenResolved = false;
  titleScreenFromGame = false; // v3.202.0 : posé ensuite par titleScreenShowLoad(true)
  titleScreenView = "main";
  renderTitleScreen();
}

function resolveTitleScreen() {
  if (titleScreenResolved) return;
  titleScreenResolved = true;
  titleScreenFromGame = false; // v3.202.0 : le drapeau ne survit jamais à une sortie

  var host = document.getElementById("title-screen-root");
  if (host) host.innerHTML = "";

  if (titleScreenPendingCallback) {
    var cb = titleScreenPendingCallback;
    titleScreenPendingCallback = null;
    cb();
  }
}

/* Nouvelle Partie : 1er slot vide -> création de héros direct. Tous pleins -> vers Charger. */
/* v3.99.16 : s'assure que `game` reflète bien le CONTENU RÉEL du slot actif avant
   tout changement de slot depuis l'écran titre. Sans ça : si le joueur clique
   "Nouvelle partie" ou "Charger la partie" alors que `game` est encore l'état par
   défaut vierge (jamais chargé dans cette session, ce qui est le cas normal sur
   l'écran titre puisque init()/loadGame() n'a pas encore tourné), HeroSlotManager.
   createHeroInSlot()/switchToSlot() (systems/save-system.js) sauvegardent ce game
   vide PAR-DESSUS le slot qu'on quitte avant de le vider pour de bon — la partie
   réelle du slot actif est alors écrasée et perdue. Bug remonté par Seb : "créer
   une nouvelle partie écrase la première partie enregistrée". Corrigé en chargeant
   explicitement le slot actif avant tout changement, si ce n'est pas déjà fait. */
function ensureActiveSlotLoadedBeforeSwitch() {
  if (!window.HeroSlotManager || typeof loadGame !== "function") return;
  var active = HeroSlotManager.getActiveSlot();
  if (HeroSlotManager.hasSlot(active) && !game.playerName) {
    loadGame();
  }
}

function titleScreenNewGame() {
  if (!window.HeroSlotManager) return;

  var maxSlots = HeroSlotManager.getMaxSlots();
  var emptySlot = null;
  for (var i = 1; i <= maxSlots; i++) {
    if (!HeroSlotManager.hasSlot(i)) { emptySlot = i; break; }
  }

  if (emptySlot === null) {
    showToast(_t("Tous les emplacements sont occupés — supprime une partie pour en créer une nouvelle"), 2200);
    titleScreenView = "load";
    renderTitleScreen();
    return;
  }

  ensureActiveSlotLoadedBeforeSwitch();

  // Crée l'emplacement (repart d'un état neuf) puis ouvre le sélecteur nom -> héros.
  // resolveTitleScreen() est branché sur confirmHeroSelection() ci-dessous, pas ici :
  // tant que la création n'est pas confirmée, le joueur peut encore annuler (✕).
  window.titleScreenSlotBeingCreated = emptySlot;
  HeroSlotManager.createHeroInSlot(emptySlot);

  var titleHost = document.getElementById("title-screen-root");
  if (titleHost) titleHost.innerHTML = "";
  if (window.PrologueView) PrologueView.play("avant"); // v3.570.0 : planches 1-4 par-dessus la création
}

/* v3.202.0 : l'écran titre peut maintenant être ouvert EN COURS DE PARTIE,
   depuis le bouton "Mes héros" du sous-onglet Résumé (ui/heros-view.js :
   openHeroSlotsScreen). Dans ce cas la flèche de retour doit ramener AU JEU
   et non à l'écran titre principal, qui n'offre aucun moyen de revenir : le
   joueur y serait piégé jusqu'à charger un emplacement. */
var titleScreenFromGame = false;

function titleScreenShowLoad(fromGame) {
  titleScreenView = "load";
  titleScreenFromGame = fromGame === true;
  titleScreenSelectedSlot = null;
  titleScreenDeleteConfirmSlot = null;
  renderTitleScreen();
}

function titleScreenBackToMain() {
  // Ouvert depuis le jeu : la flèche referme l'écran titre au lieu de
  // remonter au menu principal (resolveTitleScreen déclenche le callback,
  // ici un simple renderAll — voir openHeroSlotsScreen).
  if (titleScreenFromGame) {
    titleScreenFromGame = false;
    resolveTitleScreen();
    return;
  }
  titleScreenView = "main";
  titleScreenSelectedSlot = null;
  titleScreenDeleteConfirmSlot = null;
  renderTitleScreen();
}

/* Charge effectivement l'emplacement sélectionné et résout l'écran titre. */
function titleScreenConfirmLoad(slotNumber) {
  var target = slotNumber || titleScreenSelectedSlot;
  if (!window.HeroSlotManager || !target || !HeroSlotManager.hasSlot(target)) return;

  if (HeroSlotManager.getActiveSlot() !== target) {
    // v3.341.0 : au démarrage, rien n'a été joué — on ne réécrit pas le héros quitté (sinon sa
    // date de dernière partie passait à maintenant et son prochain retour perdait l'absence).
    if (titleScreenFromGame) ensureActiveSlotLoadedBeforeSwitch(); // v3.99.16 : voir titleScreenNewGame()
    HeroSlotManager.switchToSlot(target, !titleScreenFromGame);
    // v3.239.0 : switchToSlot() charge la sauvegarde mais ne rattrape pas le temps
    // passé loin de ce héros — et la boucle écrase lastTick à la frame suivante.
    // v3.340.0 : depuis le jeu SEULEMENT. Au démarrage, init() recharge et rattrape derrière ;
    // rattraper ici sauvait lastOnline = maintenant, et l'écran de retour d'init() ne voyait
    // plus d'absence (5 à 30 min : aucun écran ; au-delà : écran ouvert deux fois).
    if (window.ResumeManager && titleScreenFromGame) ResumeManager.catchUpAfterSlotLoad();
  }

  resolveTitleScreen();
}

/* Ouvre la petite confirmation de suppression dédiée à l'écran titre (pas le
   #confirm-modal du jeu principal : celui-ci a un z-index 3250, inférieur à celui
   de l'écran titre 9000, donc invisible/inatteignable ici — voir 00-title-screen.css). */
function titleScreenAskDeleteSlot(slotNumber, event) {
  if (event) event.stopPropagation(); // n'active pas aussi la sélection de la carte
  titleScreenDeleteConfirmSlot = slotNumber;
  renderTitleScreen();
}

function titleScreenCancelDelete() {
  titleScreenDeleteConfirmSlot = null;
  renderTitleScreen();
}

function titleScreenConfirmDelete() {
  var slot = titleScreenDeleteConfirmSlot;
  titleScreenDeleteConfirmSlot = null;
  if (!window.HeroSlotManager || !slot) { renderTitleScreen(); return; }

  HeroSlotManager.deleteSlot(slot);
  if (titleScreenSelectedSlot === slot) titleScreenSelectedSlot = null;
  renderTitleScreen();
}

/* Clic sur un emplacement vide depuis la liste "Charger" : redirige vers la création (plus fluide qu'un slot désactivé). */
function titleScreenCreateInSlot(slotNumber) {
  if (!window.HeroSlotManager || HeroSlotManager.hasSlot(slotNumber)) return;

  ensureActiveSlotLoadedBeforeSwitch(); // v3.99.16 : voir commentaire au-dessus de titleScreenNewGame()

  window.titleScreenSlotBeingCreated = slotNumber;
  HeroSlotManager.createHeroInSlot(slotNumber);

  var titleHost = document.getElementById("title-screen-root");
  if (titleHost) titleHost.innerHTML = "";
  if (window.PrologueView) PrologueView.play("avant"); // v3.570.0 : planches 1-4 par-dessus la création
}

function getWorldNameByIndex(worldIndex) {
  if (typeof WORLDS === "undefined" || !WORLDS[worldIndex]) return "";
  return WORLDS[worldIndex].name ? _td(WORLDS[worldIndex].name) : "";
}

/* HH:MM:SS à partir de secondes — distinct de formatTime() (core/utils.js, format
   court "28h 47m" utilisé ailleurs dans le jeu) : la maquette de l'écran titre
   demande explicitement un format horloge complet. */
function formatPlayTimeClock(totalSeconds) {
  var s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  var h = Math.floor(s / 3600);
  var m = Math.floor((s % 3600) / 60);
  var sec = s % 60;
  var pad = function (n) { return n < 10 ? "0" + n : String(n); };
  return pad(h) + ":" + pad(m) + ":" + pad(sec);
}

/* jj/mm/aaaa hh:mm à partir d'un timestamp epoch ms — format demandé par la maquette. */
function formatSavedAtDate(epochMs) {
  var ms = Number(epochMs || 0);
  if (!ms) return "";
  var d = new Date(ms);
  var pad = function (n) { return n < 10 ? "0" + n : String(n); };
  return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear()
    + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

/* =====================================================================
   v3.403.0 (lot L-1, choix de Seb « A · Kit du jeu », atelier-lancement.html) :
   l'écran de lancement parle la langue du jeu. Illustration plein écran, logo, et en
   bas une FEUILLE du kit (en-tête de pierre, corps parchemin, css/00-title-screen.css,
   .lc-sheet) avec les boutons du kit : bleu serti = action principale, filaire =
   secondaire. Les héros sont montrés dans leur médaillon peint, ENTIER (le cadre doré
   et le blason sont dans l'image : plus de cadre_slot ni de cercle ajouté par-dessus).
   ===================================================================== */
function titleScreenHeroImage(summary) {
  // v3.458.9 (audit O4) : une sauvegarde d'avant garde le portrait en .png ; il est passé en .webp
  var img = summary && summary.heroImage ? String(summary.heroImage).replace(/(images\/Heroes\/[A-Za-z]+_[mf])\.png$/, "$1.webp") : "";
  return img ? '<img class="lc-med" src="' + esc(img) + '" alt="">' : '';
}

/* Fond commun : illustration, voile pour la lisibilité, logo (petit sur les écrans longs). */
function buildTitleScreenStageOpenHTML(small) {
  var html = '<div class="title-screen-overlay">';
  html += '  <div class="title-screen-stage">';
  html += '    <img src="images/TitleScreen/title_background_new.webp" alt="" class="title-screen-bg">';
  html += '    <div class="lc-shade' + (small ? ' is-dim' : '') + '"></div>';
  html += '    <img src="images/TitleScreen/titre_logo.webp" alt="' + esc(_t("Aethervale")) + '" class="title-screen-logo-img' + (small ? ' is-small' : '') + '">';
  return html;
}

function buildTitleScreenLoadListHTML() {
  var maxSlots = HeroSlotManager.getMaxSlots();
  var html = '<div class="title-screen-load-list">';
  var free = 0, firstFree = null;

  for (var i = 1; i <= maxSlots; i++) {
    if (!HeroSlotManager.hasSlot(i)) { free++; if (firstFree === null) firstFree = i; continue; }
    var summary = HeroSlotManager.getSlotSummary(i) || {};
    var worldName = getWorldNameByIndex(summary.worldIndex);
    html += '<div class="title-slot-card occupied lc-row">';
    html += titleScreenHeroImage(summary);
    html += '  <div class="lc-row-tx">';
    html += '    <b class="title-slot-name">' + esc(summary.playerName || _t("Emplacement {n}", { n: i })) + '</b>';
    if (summary.heroTitle) html += '    <small class="title-slot-heroic-title">' + esc(_td(summary.heroTitle)) + '</small>'; // v3.338.0 (H8)
    html += '    <small>' + esc(_t("Niveau {n}", { n: formatNumber(summary.heroLevel) })) + (worldName ? ' · ' + esc(worldName) : '') + '</small>';
    html += '    <small>' + esc(_t("Temps de jeu : {d}", { d: formatPlayTimeClock(summary.playTime) })) + '</small>';
    if (summary.savedAt) html += '    <small>' + esc(_t("Dernière partie : {d}", { d: formatSavedAtDate(summary.savedAt) })) + '</small>';
    html += '  </div>';
    html += '  <button type="button" class="kbtn primary title-slot-load-btn" onclick="titleScreenConfirmLoad(' + i + ')">' + _t("Charger") + '</button>';
    html += '  <button type="button" class="lc-trash title-slot-delete-btn" aria-label="' + esc(_t("Supprimer")) + '" onclick="titleScreenAskDeleteSlot(' + i + ', event)"><img src="images/Icons/system/trash.webp" alt=""></button>';
    html += '</div>';
  }

  // Un seul « Nouvelle partie », qui dit combien de places restent (plus de liste d'emplacements vides).
  if (firstFree !== null) {
    html += '<button type="button" class="title-slot-card empty lc-row lc-new" onclick="titleScreenCreateInSlot(' + firstFree + ')">'
      + '<span class="lc-new-plus">+</span>' + _t("Nouvelle partie")
      + '<small>' + esc(_tn(free, "{n} emplacement libre", "{n} emplacements libres")) + '</small></button>';
  }

  html += '</div>';
  return html;
}

function buildTitleScreenDeleteConfirmHTML() {
  if (!titleScreenDeleteConfirmSlot) return "";
  var summary = HeroSlotManager.getSlotSummary(titleScreenDeleteConfirmSlot) || {};
  var name = summary.playerName || _t("Emplacement {n}", { n: titleScreenDeleteConfirmSlot });

  // v3.403.0 : fenêtre du kit (.kwin), danger D1 — comme toutes les confirmations du jeu.
  var html = '<div class="kwin-veil title-screen-delete-overlay">';
  html += '  <div class="kwin">';
  html += kWinHeadHTML({ icon: '<img src="images/Icons/system/trash.webp" alt="">', title: esc(_t("Supprimer {x} ?", { x: name })) });
  html += '    <div class="kwin-body"><p class="kwin-text">' + esc(_t("La partie de {x} sera effacée de cet appareil. C'est définitif.", { x: name })) + '</p></div>';
  html += '    <div class="kwin-foot">';
  html += '      <button type="button" class="kbtn is-sec" onclick="titleScreenCancelDelete()">' + _t("Annuler") + '</button>';
  html += '      <button type="button" class="kbtn danger" onclick="titleScreenConfirmDelete()">' + _t("Supprimer") + '</button>';
  html += '    </div>';
  html += '  </div>';
  html += '</div>';
  return html;
}

/* v3.341.0 : héros à reprendre = l'emplacement actif (le dernier chargé), sinon le plus
   récemment sauvegardé. null s'il n'y a aucune partie. */
function getTitleScreenContinueSlot() {
  if (!window.HeroSlotManager) return null;
  var active = HeroSlotManager.getActiveSlot();
  if (HeroSlotManager.hasSlot(active)) return active;
  var best = null, bestAt = -1;
  for (var i = 1; i <= HeroSlotManager.getMaxSlots(); i++) {
    var sum = HeroSlotManager.hasSlot(i) ? HeroSlotManager.getSlotSummary(i) : null;
    if (sum && Number(sum.savedAt || 0) > bestAt) { best = i; bestAt = Number(sum.savedAt || 0); }
  }
  return best;
}

/* « Continuer » : le dernier héros, nommé sur le bouton (plusieurs joueurs sur un appareil). */
function buildTitleScreenContinueHTML(slot) {
  var sum = HeroSlotManager.getSlotSummary(slot) || {};
  var line = esc(sum.playerName || _t("Emplacement {n}", { n: slot })) + ' · ' + esc(_t("niv. {n}", { n: formatNumber(sum.heroLevel || 1) }));
  return '<button type="button" class="kbtn primary title-screen-continue" onclick="titleScreenConfirmLoad(' + slot + ')">'
    + '<span class="title-screen-continue-txt"><b>' + _t("Continuer") + '</b><small>' + line + '</small></span></button>';
}

/* v3.568.0 (grand écran) : l'accueil en tableau plein écran — image paysage, logo sur le ciel, panneau
   à droite avec le héros à reprendre et toutes les parties (atelier/accueil-grand-ecran.html). */
function titleScreenIsWide() { return typeof document !== "undefined" && document.documentElement.classList.contains("wide-mode"); }

function buildTitleScreenWideHTML() {
  var continueSlot = getTitleScreenContinueSlot();
  var html = '<div class="title-screen-overlay ts-wide"><img src="images/TitleScreen/title_background_wide.webp" alt="" class="ts-wide-bg"><div class="ts-wide-shade"></div>';
  html += '<img src="images/TitleScreen/titre_logo.webp" alt="' + esc(_t("Aethervale")) + '" class="ts-wide-logo">';
  html += '<div class="ts-wide-pane"><div class="ts-wide-card">';
  if (continueSlot) {
    var sum = HeroSlotManager.getSlotSummary(continueSlot) || {}, world = getWorldNameByIndex(sum.worldIndex);
    html += '<div class="ts-cont">' + titleScreenHeroImage(sum) + '<div><b>' + esc(sum.playerName || _t("Emplacement {n}", { n: continueSlot })) + '</b><small>'
      + esc(_t("Niveau {n}", { n: formatNumber(sum.heroLevel || 1) })) + (world ? ' · ' + esc(world) : '') + '</small></div>'
      + '<button type="button" class="kbtn primary" onclick="titleScreenConfirmLoad(' + continueSlot + ')">' + _t("Continuer") + '</button></div>';
    html += '<div class="ts-h">' + esc(_t("Tes parties")) + '</div>' + buildTitleScreenLoadListHTML();
  } else {
    html += '<h2 class="ts-welcome">' + _t("Bienvenue") + '</h2><p class="ts-sub">' + _t("Une aventure t'attend au-delà de la Lisière.") + '</p>';
    html += '<div class="ts-first"><button type="button" class="kbtn primary" onclick="titleScreenNewGame()">' + _t("Nouvelle partie") + '</button>'
      + '<button type="button" class="kbtn is-sec" onclick="titleScreenShowLoad()">' + _t("Charger la partie") + '</button></div>';
  }
  html += '</div><div class="ts-foot">' + (typeof buildPwaInstallButtonHTML === "function" ? buildPwaInstallButtonHTML("title") : "")
    + '<span class="title-screen-version">v' + (typeof GAME_VERSION !== "undefined" ? GAME_VERSION : "?") + '</span></div></div>';
  return html + buildTitleScreenDeleteConfirmHTML() + '</div>';
}

function buildTitleScreenMainHTML() {
  if (titleScreenIsWide()) return buildTitleScreenWideHTML();
  var continueSlot = getTitleScreenContinueSlot();
  var html = buildTitleScreenStageOpenHTML(false);
  // v3.359.0 : « Installer le jeu » (main/pwa.js), en haut de l'écran ; vide si déjà installé ou masqué par « Plus tard »
  if (typeof buildPwaInstallButtonHTML === "function") html += buildPwaInstallButtonHTML("title");

  html += '    <div class="lc-sheet title-screen-frame">';
  if (continueSlot) {
    var sum = HeroSlotManager.getSlotSummary(continueSlot) || {};
    var world = getWorldNameByIndex(sum.worldIndex);
    html += kSheetHeadHTML({ icon: titleScreenHeroImage(sum), title: esc(sum.playerName || _t("Emplacement {n}", { n: continueSlot })),
      sub: esc(_t("Niveau {n}", { n: formatNumber(sum.heroLevel || 1) })) + (world ? ' · ' + esc(world) : '') });
  } else {
    html += kSheetHeadHTML({ title: _t("Bienvenue"), sub: _t("Une aventure t'attend au-delà de la Lisière.") });
  }
  html += '      <div class="ksheet-body">';
  html += '        <div class="title-screen-buttons' + (continueSlot ? ' has-continue' : '') + '">';
  if (continueSlot) {
    html += buildTitleScreenContinueHTML(continueSlot);
    html += '<div class="title-screen-btn-row">';
    html += '<button type="button" class="kbtn is-sec title-screen-img-btn" onclick="titleScreenNewGame()">' + _t("Nouvelle partie") + '</button>';
    html += '<button type="button" class="kbtn is-sec title-screen-img-btn" onclick="titleScreenShowLoad()">' + _t("Charger") + '</button>';
    html += '</div>';
  } else {
    html += '<button type="button" class="kbtn primary title-screen-img-btn" onclick="titleScreenNewGame()">' + _t("Nouvelle partie") + '</button>';
    html += '<button type="button" class="kbtn is-sec title-screen-img-btn" onclick="titleScreenShowLoad()">' + _t("Charger la partie") + '</button>';
  }
  html += '        </div>';
  html += '      </div>';
  // v3.233.0 : lu depuis GAME_VERSION (core/constants.js).
  html += '      <div class="title-screen-version">v' + (typeof GAME_VERSION !== "undefined" ? GAME_VERSION : "?") + '</div>';
  html += '    </div>';
  html += '  </div>';
  html += '</div>';
  return html;
}

function buildTitleScreenLoadHTML() {
  var html = buildTitleScreenStageOpenHTML(true);
  html += '    <div class="lc-sheet is-tall title-screen-frame-load">';
  html += kSheetHeadHTML({ title: _t("Charger une partie"), sub: _t("Choisis une partie"), close: "titleScreenBackToMain()" });
  html += '      <div class="ksheet-body">' + buildTitleScreenLoadListHTML() + '</div>';
  html += '    </div>';
  html += '  </div>';
  html += buildTitleScreenDeleteConfirmHTML();
  html += '</div>';
  return html;
}

function renderTitleScreen() {
  var host = document.getElementById("title-screen-root");
  if (!host) return;

  host.innerHTML = titleScreenView === "load"
    ? buildTitleScreenLoadHTML()
    : buildTitleScreenMainHTML();
  // v3.591.0 : roue des Paramètres, en haut à droite (atelier accueil-parametres.html)
  var ov = host.querySelector(".title-screen-overlay");
  if (ov) ov.insertAdjacentHTML("beforeend", '<button type="button" class="ts-gear" onclick="openTitleSettingsSheet()" aria-label="' + esc(_t("Paramètres")) + '"><img src="images/Icons/menu_icons/settings_menu.webp" alt=""></button>');
}

/* v3.591.0 : l'accueil est-il affiché (import vers un emplacement libre, voir ui/save-transfer-view.js) */
function titleScreenIsOpen() {
  var host = document.getElementById("title-screen-root");
  return !!(host && host.innerHTML && !titleScreenResolved);
}

/* v3.591.0 : feuille des Paramètres de l'accueil — sauvegarde (import vers un emplacement libre), mises à jour,
   réglages de l'appareil. Sa propre couche, au-dessus de l'accueil (les feuilles du jeu passeraient dessous). */
function titleSettingsRoot() {
  var root = document.getElementById("title-settings-root");
  if (!root && document.body) { root = document.createElement("div"); root.id = "title-settings-root"; document.body.appendChild(root); }
  return root;
}
function openTitleSettingsSheet() {
  var root = titleSettingsRoot();
  if (!root) return;
  var h = '<div class="hf-sheet-bg"><div class="ksheet-backdrop" onclick="closeTitleSettingsSheet()"></div><div class="ksheet hf-sheet ts-set-sheet" role="dialog" aria-label="' + esc(_t("Paramètres")) + '">';
  h += kSheetHeadHTML({ icon: '<img src="images/Icons/menu_icons/settings_menu.webp" alt="">', title: _t("Paramètres"), sub: _t("Réglages de cet appareil"), close: "closeTitleSettingsSheet()" });
  h += '<div class="ksheet-body" onclick="titleSettingsRefreshSoon(event)">';
  h += '<div class="set-card"><div class="kkick">' + _t("Sauvegarde") + '</div>';
  h += '<p>' + _t("Tu as joué sur un autre appareil ? Importe ta sauvegarde : elle prend un emplacement libre, rien n'est écrasé.") + '</p>';
  h += '<div class="set-pair"><button type="button" class="settings-btn" onclick="triggerImportFilePicker()"><img class=ico-inline src=images/Icons/system/import.webp> ' + _t("Importer un fichier") + '</button>';
  h += '<button type="button" class="settings-btn" onclick="titleSettingsShowPaste()">' + _t("Coller un code") + '</button></div>';
  h += '<div class="ts-paste" hidden><textarea id="ts-paste-area" class="export-textarea" placeholder="' + esc(_t("Colle le code ici...")) + '"></textarea>';
  h += '<button type="button" class="settings-btn primary" onclick="importSaveFromText(document.getElementById(\'ts-paste-area\').value)">' + _t("Importer ce code") + '</button></div>';
  h += '<p class="set-note ts-set-msg" role="status" aria-live="polite"></p></div>';
  if (typeof buildPwaUpdateCardHTML === "function") h += buildPwaUpdateCardHTML();
  if (typeof buildSettingsAppareilHTML === "function") h += buildSettingsAppareilHTML("title");
  h += '</div></div></div>';
  root.innerHTML = h;
}
function closeTitleSettingsSheet() {
  var root = document.getElementById("title-settings-root");
  if (root) root.innerHTML = "";
}
function titleSettingsShowPaste() {
  var box = document.querySelector("#title-settings-root .ts-paste");
  if (box) { box.hidden = false; var ta = document.getElementById("ts-paste-area"); if (ta) ta.focus(); }
}
function titleSettingsSay(text) {
  var el = document.querySelector("#title-settings-root .ts-set-msg");
  if (el) el.textContent = text; else if (typeof showToast === "function") showToast(text, 2200);
}
/* Taille du texte : le réglage s'applique tout de suite ; la feuille et l'accueil se redessinent */
function titleSettingsRefreshSoon(e) {
  var b = e && e.target && e.target.closest ? e.target.closest(".set-seg button") : null;
  if (!b || /setLang/.test(b.getAttribute("onclick") || "")) return;
  setTimeout(function () { renderTitleScreen(); openTitleSettingsSheet(); }, 60);
}

window.openTitleScreen = openTitleScreen;
window.renderTitleScreen = renderTitleScreen;
window.titleScreenIsOpen = titleScreenIsOpen;
window.openTitleSettingsSheet = openTitleSettingsSheet;
window.closeTitleSettingsSheet = closeTitleSettingsSheet;
window.titleSettingsShowPaste = titleSettingsShowPaste;
window.titleSettingsSay = titleSettingsSay;
window.titleSettingsRefreshSoon = titleSettingsRefreshSoon;
window.getTitleScreenContinueSlot = getTitleScreenContinueSlot;
window.resolveTitleScreen = resolveTitleScreen;
window.titleScreenNewGame = titleScreenNewGame;
window.titleScreenShowLoad = titleScreenShowLoad;
window.titleScreenBackToMain = titleScreenBackToMain;
window.titleScreenConfirmLoad = titleScreenConfirmLoad;
window.titleScreenAskDeleteSlot = titleScreenAskDeleteSlot;
window.titleScreenCancelDelete = titleScreenCancelDelete;
window.titleScreenConfirmDelete = titleScreenConfirmDelete;
window.titleScreenCreateInSlot = titleScreenCreateInSlot;
