"use strict";
/* main/pwa.js — enregistrement Service Worker, voile de garde 1er lancement, bannière de mise à jour en cours de session,
   installation du jeu (v3.359.0, PwaInstall).
   Sans effet si le navigateur ne supporte pas les service workers. Détail complet : COMMENTAIRES_ORIGINAUX.md */

var pwaHadControllerAtLoad = ("serviceWorker" in navigator) && !!navigator.serviceWorker.controller;

function initPwaServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  if (!pwaHadControllerAtLoad) {
    showPwaBootGate();
    waitForPwaControllerThenHideGate();
  }

  window.addEventListener("load", function () {
    navigator.serviceWorker.register("./sw.js").catch(function (err) {
      console.warn("Service worker non enregistré :", err);
    });
  });

  navigator.serviceWorker.addEventListener("message", function (event) {
    if (!event.data || event.data.type !== "QUEST_IDLE_SW_UPDATED") return;
    if (pwaHadControllerAtLoad) showPwaUpdateBanner();
  });
}

function showPwaBootGate() {
  var el = document.getElementById("pwa-boot-gate");
  if (el) el.classList.add("show");
}

function hidePwaBootGate() {
  var el = document.getElementById("pwa-boot-gate");
  if (el) el.classList.remove("show");
}

function waitForPwaControllerThenHideGate() {
  var resolved = false;
  var resolve = function () {
    if (resolved) return;
    resolved = true;
    hidePwaBootGate();
  };

  setTimeout(resolve, 6000);

  if (navigator.serviceWorker.controller) {
    resolve();
    return;
  }
  navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true });
}

function showPwaUpdateBanner() {
  var el = document.getElementById("pwa-update-banner");
  if (!el || el.classList.contains("show")) return;
  el.classList.add("show");
}

function reloadForPwaUpdate() {
  window.location.reload();
}

/* ---------------------------------------------------------------------------
   v3.359.0 : installation du jeu sur l'appareil (repris de Sirop & Cie).
   - Chrome, Edge, Android : le navigateur signale l'installation possible par
     « beforeinstallprompt ». On met l'événement de côté et on affiche NOTRE bouton ;
     le toucher ouvre la vraie fenêtre système (prompt()).
   - iPhone, iPad : aucun événement. On explique le geste (Partager → Sur l'écran
     d'accueil) dans une feuille basse.
   - Jeu déjà installé (mode standalone) : aucun bouton, et on demande au navigateur
     de ne pas effacer le stockage (la sauvegarde vit dans localStorage).
   Le bouton est posé sur l'écran titre (masquable par « Plus tard », Prefs.installHint)
   et dans Paramètres › Application (toujours).
--------------------------------------------------------------------------- */
var PwaInstall = {
  deferred: null, // événement beforeinstallprompt mis de côté, ou null

  isStandalone: function () {
    try {
      if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return true;
    } catch (e) { /* vieux navigateur */ }
    return window.navigator.standalone === true; // Safari iOS
  },

  /* iPadOS se déclare « MacIntel » : on le reconnaît à l'écran tactile. */
  isIos: function () {
    var ua = navigator.userAgent || "";
    return /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  },

  /* "installed" | "prompt" (bouton système disponible) | "ios" (explication) | "none" */
  status: function () {
    if (this.isStandalone()) return "installed";
    if (this.deferred) return "prompt";
    if (this.isIos()) return "ios";
    return "none";
  },

  init: function () {
    var self = this;
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();          // pas de mini-barre du navigateur : c'est notre bouton qui la remplace
      self.deferred = e;
      self.refreshViews();
    });
    window.addEventListener("appinstalled", function () {
      self.deferred = null;
      self.persist();
      self.refreshViews();
      if (typeof showToast === "function") showToast(_t("Aethervale est installé : tu le retrouves sur ton écran d'accueil."), 2600);
    });
    if (this.isStandalone()) this.persist();
  },

  /* Le toucher sur « Installer le jeu ». */
  install: function () {
    var self = this;
    if (this.deferred) {
      var ev = this.deferred;
      ev.prompt();
      ev.userChoice.then(function (choice) {
        self.deferred = null; // un événement ne sert qu'une fois
        if (choice && choice.outcome === "accepted") self.persist();
        else if (window.Prefs) Prefs.set("installHint", false); // refusé : plus de bouton sur l'écran titre
        self.refreshViews();
      }).catch(function () { self.deferred = null; self.refreshViews(); });
      return;
    }
    if (this.isIos()) this.openIosSheet();
  },

  /* « Plus tard » : l'écran titre ne propose plus l'installation sur cet appareil. */
  later: function () {
    if (window.Prefs) Prefs.set("installHint", false);
    this.closeIosSheet();
    this.refreshViews();
  },

  /* La sauvegarde n'est pas effacée par le navigateur en cas de manque de place. */
  persist: function () {
    try {
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
    } catch (e) { /* non supporté */ }
  },

  openIosSheet: function () {
    var host = document.getElementById("pwa-install-root");
    if (!host) {
      host = document.createElement("div");
      host.id = "pwa-install-root";
      document.body.appendChild(host);
    }
    host.innerHTML = buildPwaIosSheetHTML();
  },

  closeIosSheet: function () {
    var host = document.getElementById("pwa-install-root");
    if (host) host.innerHTML = "";
  },

  /* Redessine les deux endroits qui portent le bouton, s'ils sont affichés. */
  refreshViews: function () {
    var title = document.getElementById("title-screen-root");
    if (title && title.innerHTML && typeof renderTitleScreen === "function") renderTitleScreen();
    if (window.game && game.activeTab === "settings" && typeof renderPanel === "function") renderPanel();
  }
};

/* Bouton d'installation. where = "title" (écran titre, masquable) ou "settings" (toujours). */
function buildPwaInstallButtonHTML(where) {
  var st = PwaInstall.status();
  if (st === "installed" || st === "none") return "";
  if (where === "title" && window.Prefs && !Prefs.get("installHint")) return "";
  var label = st === "ios" ? _t("Installer sur iPhone / iPad") : _t("Installer le jeu");
  var cls = where === "title" ? "pwa-install-btn pwa-install-btn-title" : "settings-btn";
  return '<button type="button" class="' + cls + '" onclick="PwaInstall.install()">'
    + '<img class="ico-inline" src="images/Icons/apple-touch-icon.png" alt=""> ' + label + '</button>';
}

/* Paramètres › Application : le bouton, ou l'état de l'installation. */
function buildPwaSettingsCardHTML() {
  var st = PwaInstall.status();
  var h = '<div class="panel-card">';
  h += '<h3><img class=ico-inline src=images/Icons/apple-touch-icon.png> ' + _t("Application") + '</h3>';
  if (st === "installed") {
    h += '<p class="panel-sub">' + _t("Aethervale est installé sur cet appareil. Il s'ouvre en plein écran, comme une application, et fonctionne sans connexion.") + '</p>';
  } else if (st === "none") {
    h += '<p class="panel-sub">' + _t("Ce navigateur ne propose pas l'installation. Avec Chrome ou Edge (ordinateur, Android), ou Safari sur iPhone, Aethervale s'installe comme une application.") + '</p>';
  } else {
    h += '<p class="panel-sub">' + _t("Installe Aethervale sur cet appareil : une icône sur l'écran d'accueil, le jeu en plein écran, et ta sauvegarde protégée du nettoyage du navigateur.") + '</p>';
    h += buildPwaInstallButtonHTML("settings");
  }
  h += '</div>';
  return h;
}

/* iPhone, iPad : le geste à faire, en trois étapes. La couche est au-dessus de l'écran titre. */
function buildPwaIosSheetHTML() {
  var h = '<div class="pwa-install-layer">';
  h += '<div class="ksheet-backdrop" onclick="PwaInstall.closeIosSheet()"></div>';
  h += '<div class="ksheet pwa-install-sheet">';
  h += kSheetHeadHTML({ icon: '<img src="images/Icons/apple-touch-icon.png" alt="">', title: _t("Installer sur iPhone ou iPad"), close: "PwaInstall.closeIosSheet()" });
  h += '<div class="ksheet-body"><ol class="pwa-install-steps">';
  h += '<li>' + _t("Ouvre le jeu dans <b>Safari</b>.") + '</li>';
  h += '<li>' + _t("Touche le bouton <b>Partager</b> (le carré avec une flèche vers le haut).") + '</li>';
  h += '<li>' + _t("Choisis <b>Sur l'écran d'accueil</b>, puis <b>Ajouter</b>.") + '</li>';
  h += '</ol><p class="pwa-install-note">' + _t("Le jeu s'ouvre alors en plein écran, et ta sauvegarde est mieux protégée.") + '</p></div>';
  h += '<div class="ksheet-foot">';
  h += '<button type="button" class="kbtn pwa-install-later" onclick="PwaInstall.later()">' + _t("Plus tard") + '</button>';
  h += '<button type="button" class="kbtn primary" onclick="PwaInstall.closeIosSheet()">' + _t("Compris") + '</button>';
  h += '</div></div></div>';
  return h;
}

window.PwaInstall = PwaInstall;
window.buildPwaInstallButtonHTML = buildPwaInstallButtonHTML;
window.buildPwaSettingsCardHTML = buildPwaSettingsCardHTML;
window.buildPwaIosSheetHTML = buildPwaIosSheetHTML;

window.initPwaServiceWorker = initPwaServiceWorker;
window.reloadForPwaUpdate = reloadForPwaUpdate;

initPwaServiceWorker();
PwaInstall.init();
