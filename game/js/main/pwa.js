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
    navigator.serviceWorker.register("./sw.js").then(function (reg) {
      watchPwaUpdateOnResume(reg);
    }).catch(function (err) {
      console.warn("Service worker non enregistré :", err);
    });
  });

  navigator.serviceWorker.addEventListener("message", function (event) {
    if (!event.data || event.data.type !== "QUEST_IDLE_SW_UPDATED") return;
    if (pwaHadControllerAtLoad) showPwaUpdateBanner();
  });
}

/* v3.436.3 : le navigateur ne vérifie sw.js qu'au lancement à froid ; une appli restée en mémoire
   (iPhone) gardait l'ancienne version. Au retour au premier plan, vérification, au plus toutes les 30 min. */
var PWA_UPDATE_CHECK_MS = 30 * 60 * 1000;
function watchPwaUpdateOnResume(reg) {
  var lastCheck = Date.now(); // register() vient de vérifier
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "visible" || !navigator.onLine) return;
    if (Date.now() - lastCheck < PWA_UPDATE_CHECK_MS) return;
    lastCheck = Date.now();
    reg.update().catch(function () { /* réseau absent : on réessaiera au prochain retour */ });
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

/* v3.457.4 (audit P9) : la bannière ne couvre plus un combat ni une expédition en cours — elle attend que
   le héros soit libre (même règle que l'écran de retour), et « Plus tard » la ferme pour la session. */
var pwaUpdatePending = false, pwaUpdateDismissed = false, pwaUpdateTimer = null;
function pwaHeroEngaged() {
  if (!window.game) return false;
  if (game.activeTab === "combat" || game.activeTab === "scene") return true;
  return !!(window.SceneRunManager && typeof SceneRunManager.isHeroEngaged === "function" && SceneRunManager.isHeroEngaged());
}
function showPwaUpdateBanner() {
  var el = document.getElementById("pwa-update-banner");
  if (!el || el.classList.contains("show") || pwaUpdateDismissed) return;
  if (pwaHeroEngaged()) {
    pwaUpdatePending = true;
    if (!pwaUpdateTimer) pwaUpdateTimer = setInterval(function () {
      if (pwaHeroEngaged()) return;
      clearInterval(pwaUpdateTimer); pwaUpdateTimer = null; pwaUpdatePending = false;
      showPwaUpdateBanner();
    }, 3000);
    return;
  }
  el.classList.add("show");
  // v3.516.0 (audit ERG-4) : un combat lancé après l'affichage masque la bannière ; elle revient quand le héros est libre
  if (!pwaUpdateTimer) pwaUpdateTimer = setInterval(function () {
    if (!pwaHeroEngaged() || pwaUpdateDismissed) return;
    clearInterval(pwaUpdateTimer); pwaUpdateTimer = null;
    el.classList.remove("show");
    showPwaUpdateBanner();
  }, 1000);
}

function dismissPwaUpdateBanner() {
  pwaUpdateDismissed = true;
  if (pwaUpdateTimer) { clearInterval(pwaUpdateTimer); pwaUpdateTimer = null; }
  var el = document.getElementById("pwa-update-banner");
  if (el) el.classList.remove("show");
}

function reloadForPwaUpdate() {
  window.location.reload();
}

/* ---------------------------------------------------------------------------
   v3.591.0 (demande de Seb) : chercher une mise à jour, ou la forcer — à l'accueil et dans
   Paramètres › Partie. La sauvegarde vit dans localStorage : vider le cache du jeu n'y touche pas.
   - check() : demande au navigateur de relire sw.js ; nouvelle version -> installation puis
     redémarrage dès qu'elle prend la main ; sinon « tu as la dernière version ».
   - force() : sauvegarde, vide les caches du jeu, retire le service worker et relance :
     tout est retéléchargé (dernier recours si une version reste bloquée).
   Les messages s'écrivent dans la carte (.pwa-upd-msg) : un toast passerait sous l'accueil.
--------------------------------------------------------------------------- */
var PwaUpdate = {
  busy: false,

  say: function (text) {
    var list = document.querySelectorAll(".pwa-upd-msg");
    for (var i = 0; i < list.length; i++) list[i].textContent = text;
  },

  /* Sauvegarde avant de relancer, seulement si une partie est chargée (accueil : rien à écrire) */
  saveFirst: function () {
    try { if (typeof saveGame === "function" && window.game && game.heroId) saveGame(); } catch (e) { noteErreur("pwa.saveFirst", e); }
  },

  restart: function () {
    this.saveFirst();
    setTimeout(function () { window.location.reload(); }, 600);
  },

  check: function () {
    var self = this;
    if (self.busy) return;
    if (!("serviceWorker" in navigator)) { self.say(_t("Ce navigateur charge toujours la dernière version : recharge la page.")); return; }
    if (navigator.onLine === false) { self.say(_t("Pas de connexion : réessaie quand tu seras en ligne.")); return; }
    self.busy = true;
    self.say(_t("Recherche d'une mise à jour…"));
    navigator.serviceWorker.getRegistration().then(function (reg) {
      if (!reg) { self.busy = false; self.say(_t("Aucune version installée sur cet appareil : recharge la page.")); return; }
      return reg.update().then(function () {
        var next = reg.installing || reg.waiting;
        if (!next) { self.busy = false; self.say(_t("Tu as la dernière version (v{v}).", { v: GAME_VERSION })); return; }
        self.say(_t("Nouvelle version trouvée : installation…"));
        // sw.js s'active seul (skipWaiting) : on relance quand il prend la main, au plus tard après 15 s
        var done = false, go = function () { if (done) return; done = true; self.say(_t("Le jeu redémarre…")); self.restart(); };
        navigator.serviceWorker.addEventListener("controllerchange", go, { once: true });
        setTimeout(go, 15000);
      });
    }).catch(function () {
      self.busy = false;
      self.say(_t("Impossible de joindre le serveur : réessaie plus tard."));
    });
  },

  force: function () {
    var self = this;
    if (self.busy) return;
    if (navigator.onLine === false) { self.say(_t("Pas de connexion : réessaie quand tu seras en ligne.")); return; }
    self.busy = true;
    self.say(_t("Mise à jour forcée : le jeu redémarre…"));
    self.saveFirst();
    var clearCaches = (window.caches && caches.keys) ? caches.keys().then(function (names) {
      return Promise.all(names.filter(function (n) { return n.indexOf("quest-idle") === 0; }).map(function (n) { return caches.delete(n); }));
    }) : Promise.resolve();
    var dropWorker = ("serviceWorker" in navigator) ? navigator.serviceWorker.getRegistrations().then(function (regs) {
      return Promise.all(regs.map(function (r) { return r.unregister(); }));
    }) : Promise.resolve();
    Promise.all([clearCaches, dropWorker]).catch(function (e) { noteErreur("pwa.force", e); }).then(function () {
      setTimeout(function () { window.location.reload(); }, 400);
    });
  }
};
window.PwaUpdate = PwaUpdate;

/* Carte « Mises à jour » : Paramètres › Partie et feuille des Paramètres de l'accueil */
function buildPwaUpdateCardHTML() {
  var h = '<div class="set-card">';
  h += '<div class="kkick">' + _t("Mises à jour") + '</div>';
  h += '<p>' + _t("Version installée : v{v}. Le jeu se met à jour seul ; si une version tarde à arriver, cherche-la ici.", { v: (typeof GAME_VERSION === "string" ? GAME_VERSION : "?") }) + '</p>';
  h += '<div class="set-pair"><button type="button" class="settings-btn" onclick="PwaUpdate.check()"><img class=ico-inline src=images/Icons/system/reset.webp> ' + _t("Chercher") + '</button>';
  h += '<button type="button" class="settings-btn" onclick="PwaUpdate.force()"><img class=ico-inline src=images/Icons/system/warning.webp> ' + _t("Forcer") + '</button></div>';
  h += '<p class="set-note pwa-upd-msg" role="status" aria-live="polite">' + _t("« Forcer » vide le cache du jeu et retélécharge tout. Ta sauvegarde n'est pas touchée.") + '</p>';
  return h + '</div>';
}
window.buildPwaUpdateCardHTML = buildPwaUpdateCardHTML;

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
    } catch (e) { noteErreur("pwa.isStandalone", e); /* vieux navigateur */ }
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
    } catch (e) { noteErreur("pwa.persist", e); /* non supporté */ }
  },

  openIosSheet: function (warn) {
    var host = document.getElementById("pwa-install-root");
    if (!host) {
      host = document.createElement("div");
      host.id = "pwa-install-root";
      document.body.appendChild(host);
    }
    host.innerHTML = buildPwaIosSheetHTML(!!warn);
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
  // v3.408.0 : carte des Paramètres refondus (Appareil) — carte crème et surtitre du kit
  var h = '<div class="set-card">';
  h += '<div class="kkick">' + _t("Application") + '</div>';
  if (st === "installed") {
    h += '<p>' + _t("Aethervale est installé sur cet appareil. Il s'ouvre en plein écran, comme une application, et fonctionne sans connexion.") + '</p>';
  } else if (st === "none") {
    h += '<p>' + _t("Ce navigateur ne propose pas l'installation. Avec Chrome ou Edge (ordinateur, Android), ou Safari sur iPhone, Aethervale s'installe comme une application.") + '</p>';
  } else {
    h += '<p>' + _t("Installe Aethervale sur cet appareil : une icône sur l'écran d'accueil, le jeu en plein écran, et ta sauvegarde protégée du nettoyage du navigateur.") + '</p>';
    h += buildPwaInstallButtonHTML("settings");
  }
  h += '</div>';
  return h;
}

/* v3.457.4 (audit P5) : dans un onglet Safari (jeu non installé), la sauvegarde peut être effacée
   après 7 jours sans visite. Rappel une fois par semaine au plus, sur une partie commencée. */
var PWA_IOS_STORAGE_HINT_MS = 7 * 24 * 3600 * 1000;
function checkPwaIosStorageHint() {
  if (PwaInstall.status() !== "ios" || !window.game || !game.playerName || !window.Prefs) return;
  var last = Number(Prefs.getValue("iosStorageHintAt") || 0);
  if (Date.now() - last < PWA_IOS_STORAGE_HINT_MS) return;
  Prefs.setValue("iosStorageHintAt", Date.now());
  PwaInstall.openIosSheet(true);
}

/* iPhone, iPad : le geste à faire, en trois étapes. La couche est au-dessus de l'écran titre.
   warn (v3.457.4) : l'ouverture vient du rappel Safari, une ligne dit pourquoi. */
function buildPwaIosSheetHTML(warn) {
  var h = '<div class="pwa-install-layer">';
  h += '<div class="ksheet-backdrop" onclick="PwaInstall.closeIosSheet()"></div>';
  h += '<div class="ksheet pwa-install-sheet">';
  h += kSheetHeadHTML({ icon: '<img src="images/Icons/apple-touch-icon.png" alt="">', title: _t("Installer sur iPhone ou iPad"), close: "PwaInstall.closeIosSheet()" });
  h += '<div class="ksheet-body">';
  if (warn) h += '<p class="pwa-install-warn">' + _t("Dans Safari, ta partie peut être effacée après 7 jours sans visite. Installe le jeu, ou exporte ta partie (Paramètres › Partie).") + '</p>';
  h += '<ol class="pwa-install-steps">';
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
window.dismissPwaUpdateBanner = dismissPwaUpdateBanner;

initPwaServiceWorker();
PwaInstall.init();
window.addEventListener("load", function () { setTimeout(checkPwaIosStorageHint, 4000); }); // v3.457.4 : après le chargement de la partie
