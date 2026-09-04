"use strict";
/* ui/title-screen-view.js — écran titre plein écran affiché avant tout boot du jeu
   (voir main/boot.js). 2 boutons : Nouvelle Partie / Charger la Partie.
   "Charger la Partie" ouvre la liste des 3 emplacements existants (HeroSlotManager,
   voir systems/save-system.js). "Nouvelle Partie" cherche le 1er emplacement vide et
   ouvre directement la création de héros (modal-view.js, système déjà en place).
   v3.99.0. */

var titleScreenResolved = false; // true une fois qu'un slot est choisi/créé -> init() peut démarrer
var titleScreenView = "main"; // "main" | "load"
var titleScreenPendingCallback = null; // callback appelé une seule fois à la résolution
var titleScreenSelectedSlot = null; // v3.99.11 : emplacement sélectionné (bordure dorée) dans la vue "Charger"
var titleScreenDeleteConfirmSlot = null; // v3.99.11 : emplacement en attente de confirmation de suppression, ou null

/* v3.99.3 : détecte game.saveSupported AVANT le premier rendu de l'écran titre.
   Sans ça, HeroSlotManager.hasSlot() (systems/save-system.js) retourne toujours
   false tant que initSaveSystem() n'a pas tourné — normalement fait dans
   boot.js:init(), qui ne se lance qu'APRÈS que l'écran titre soit résolu. Résultat
   observé : "Charger la Partie" affichait 6 emplacements vides même avec des
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
  titleScreenView = "main";
  renderTitleScreen();
}

function resolveTitleScreen() {
  if (titleScreenResolved) return;
  titleScreenResolved = true;

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
   "Nouvelle Partie" ou "Charger la Partie" alors que `game` est encore l'état par
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
    showToast("Tous les emplacements sont occupés — supprime une partie pour en créer une nouvelle", 2200);
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
}

function titleScreenShowLoad() {
  titleScreenView = "load";
  titleScreenSelectedSlot = null;
  titleScreenDeleteConfirmSlot = null;
  renderTitleScreen();
}

function titleScreenBackToMain() {
  titleScreenView = "main";
  titleScreenSelectedSlot = null;
  titleScreenDeleteConfirmSlot = null;
  renderTitleScreen();
}

/* v3.99.11 : clic sur une carte occupée -> sélection seule (bordure dorée), ne charge
   pas encore. Le chargement effectif se fait via titleScreenConfirmLoad() (bouton
   "Charger" par carte OU bouton CHARGER global en bas, les deux appellent la même
   fonction une fois un slot sélectionné). */
function titleScreenSelectSlot(slotNumber) {
  if (!window.HeroSlotManager || !HeroSlotManager.hasSlot(slotNumber)) return;
  titleScreenSelectedSlot = slotNumber;
  titleScreenDeleteConfirmSlot = null;
  renderTitleScreen();
}

/* Charge effectivement l'emplacement sélectionné et résout l'écran titre. */
function titleScreenConfirmLoad(slotNumber) {
  var target = slotNumber || titleScreenSelectedSlot;
  if (!window.HeroSlotManager || !target || !HeroSlotManager.hasSlot(target)) return;

  if (HeroSlotManager.getActiveSlot() !== target) {
    ensureActiveSlotLoadedBeforeSwitch(); // v3.99.16 : voir commentaire au-dessus de titleScreenNewGame()
    HeroSlotManager.switchToSlot(target);
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
}

function getWorldNameByIndex(worldIndex) {
  if (typeof WORLDS === "undefined" || !WORLDS[worldIndex]) return "";
  return WORLDS[worldIndex].name || "";
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

function buildTitleScreenLoadListHTML() {
  var maxSlots = HeroSlotManager.getMaxSlots();
  var html = '<div class="title-screen-load-list">';

  for (var i = 1; i <= maxSlots; i++) {
    var occupied = HeroSlotManager.hasSlot(i);

    if (occupied) {
      var summary = HeroSlotManager.getSlotSummary(i) || {};
      var heroImage = summary.heroImage || "";
      var isSelected = titleScreenSelectedSlot === i;
      var selectedClass = isSelected ? " selected" : "";
      var worldName = getWorldNameByIndex(summary.worldIndex);

      /* v3.145.0 : cadre cadre_slot.png (Seb) — parchemin clair avec médaillon
         rond DÉCOUPÉ EN TRANSPARENCE (pas un cercle blanc opaque) : le
         portrait est posé DERRIÈRE en position identique, le cadre par-dessus
         masque tout sauf le disque. Remplace la carte 100% CSS de v3.144.0. */
      html += '<div class="title-slot-card occupied' + selectedClass + '" onclick="titleScreenSelectSlot(' + i + ')">';
      html += '  <div class="title-slot-portrait">';
      if (heroImage) html += '<img src="' + esc(heroImage) + '" alt="">';
      html += '  </div>';
      html += '  <img src="images/TitleScreen/cadre_slot.png" alt="" class="title-slot-card-bg">';
      html += '  <div class="title-slot-body">';
      html += '    <div class="title-slot-name">' + esc(summary.playerName || ("Emplacement " + i)) + '</div>';
      html += '    <div class="title-slot-stat"><span class="title-slot-stat-icon">♛</span>Niveau ' + esc(formatNumber(summary.heroLevel)) + (worldName ? ' · ' + esc(worldName) : '') + '</div>';
      html += '    <div class="title-slot-stat"><span class="title-slot-stat-icon">◷</span>Temps de jeu : ' + esc(formatPlayTimeClock(summary.playTime)) + '</div>';
      if (summary.savedAt) {
        html += '    <div class="title-slot-stat"><span class="title-slot-stat-icon">✦</span>Dernière partie : ' + esc(formatSavedAtDate(summary.savedAt)) + '</div>';
      }
      html += '  </div>';
      html += '  <div class="title-slot-actions">';
      html += '    <button type="button" class="title-slot-load-btn" onclick="event.stopPropagation(); titleScreenConfirmLoad(' + i + ')">';
      html += '      <img src="images/TitleScreen/bouton_charger.png" alt="" class="title-slot-load-btn-bg">';
      html += '      <span>Charger</span>';
      html += '    </button>';
      html += '    <button type="button" class="title-slot-delete-btn" aria-label="Supprimer" onclick="titleScreenAskDeleteSlot(' + i + ', event)">';
      html += '      <img src="images/TitleScreen/bouton_supprimer.png" alt="">';
      html += '    </button>';
      html += '  </div>';
      html += '</div>';
    } else {
      html += '<button type="button" class="title-slot-card empty" onclick="titleScreenCreateInSlot(' + i + ')">';
      html += '  <img src="images/TitleScreen/cadre_slot.png" alt="" class="title-slot-card-bg">';
      html += '  <div class="title-slot-portrait title-slot-portrait-empty">+</div>';
      html += '  <div class="title-slot-body title-slot-body-empty">';
      html += '    <div class="title-slot-name">Emplacement vide</div>';
      html += '    <div class="title-slot-stat">Toucher pour créer une nouvelle partie</div>';
      html += '  </div>';
      html += '</button>';
    }
  }

  html += '</div>';
  return html;
}

function buildTitleScreenDeleteConfirmHTML() {
  if (!titleScreenDeleteConfirmSlot) return "";
  var summary = HeroSlotManager.getSlotSummary(titleScreenDeleteConfirmSlot) || {};
  var name = summary.playerName || ("Emplacement " + titleScreenDeleteConfirmSlot);

  var html = '<div class="title-screen-delete-overlay">';
  html += '  <div class="title-screen-delete-card">';
  html += '    <div class="title-screen-delete-title">Supprimer cette partie ?</div>';
  html += '    <div class="title-screen-delete-text">' + esc(name) + ' sera définitivement supprimée. Cette action est irréversible.</div>';
  html += '    <div class="title-screen-delete-buttons">';
  html += '      <button type="button" class="title-screen-delete-cancel" onclick="titleScreenCancelDelete()">Annuler</button>';
  html += '      <button type="button" class="title-screen-delete-confirm" onclick="titleScreenConfirmDelete()">Supprimer</button>';
  html += '    </div>';
  html += '  </div>';
  html += '</div>';
  return html;
}

function buildTitleScreenMainHTML() {
  var html = '<div class="title-screen-overlay">';
  html += '  <div class="title-screen-stage">';
  html += '    <img src="images/TitleScreen/title_background_new.png" alt="" class="title-screen-bg">';
  html += '    <img src="images/TitleScreen/titre_logo.png" alt="Aethervale" class="title-screen-logo-img">';
  html += '    <div class="title-screen-frame">';
  html += '      <div class="title-screen-buttons">';
  html += '        <button type="button" class="title-screen-img-btn" onclick="titleScreenNewGame()">';
  html += '          <img src="images/TitleScreen/bouton_titre.png" alt="" class="title-screen-img-btn-bg">';
  html += '          <span>Nouvelle Partie</span>';
  html += '        </button>';
  html += '        <button type="button" class="title-screen-img-btn" onclick="titleScreenShowLoad()">';
  html += '          <img src="images/TitleScreen/bouton_titre.png" alt="" class="title-screen-img-btn-bg">';
  html += '          <span>Charger la Partie</span>';
  html += '        </button>';
  html += '      </div>';
  html += '      <div class="title-screen-version">v3.148.0</div>';
  html += '    </div>';
  html += '  </div>';
  html += '</div>';
  return html;
}

function buildTitleScreenLoadHTML() {
  var html = '<div class="title-screen-overlay">';
  html += '  <div class="title-screen-stage">';
  html += '    <img src="images/TitleScreen/title_background_new.png" alt="" class="title-screen-bg">';
  html += '  </div>';
  html += '  <div class="title-screen-frame title-screen-frame-load">';
  html += '    <div class="title-screen-load-header-row">';
  html += '      <button type="button" class="title-screen-back-btn" onclick="titleScreenBackToMain()"><img src="images/TitleScreen/bouton_retour_new.png" alt="Retour"></button>';
  html += '      <div class="title-screen-load-heading-wrap">';
  html += '        <img src="images/TitleScreen/titre_charger.png" alt="" class="title-screen-load-heading-img">';
  html += '        <h2 class="title-screen-load-heading-text">Charger une partie</h2>';
  html += '      </div>';
  html += '    </div>';
  html += '    <div class="title-screen-load-subheading">Sélectionnez une sauvegarde</div>';
  html += buildTitleScreenLoadListHTML();
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
}

window.openTitleScreen = openTitleScreen;
window.resolveTitleScreen = resolveTitleScreen;
window.titleScreenNewGame = titleScreenNewGame;
window.titleScreenShowLoad = titleScreenShowLoad;
window.titleScreenBackToMain = titleScreenBackToMain;
window.titleScreenSelectSlot = titleScreenSelectSlot;
window.titleScreenConfirmLoad = titleScreenConfirmLoad;
window.titleScreenAskDeleteSlot = titleScreenAskDeleteSlot;
window.titleScreenCancelDelete = titleScreenCancelDelete;
window.titleScreenConfirmDelete = titleScreenConfirmDelete;
window.titleScreenCreateInSlot = titleScreenCreateInSlot;
