"use strict";
/* ============================================================
Quest Idle — main/pwa.js
Enregistrement du Service Worker (voir sw.js à la racine) +
- petit voile de garde ("Préparation du jeu…") au tout premier
  lancement, le temps que l'installation se termine (voir
  #pwa-boot-gate) ;
- bannière "Nouvelle version disponible" quand une mise à jour
  bascule EN COURS DE PARTIE, sur une session qui avait déjà un
  service worker actif (voir la note "MISE À JOUR IMMÉDIATE" dans
  sw.js — c'est le pendant côté page de self.clients.claim() +
  postMessage).

N'affecte en rien le jeu lui-même si le navigateur ne supporte pas
les service workers (vieux Safari, navigateurs en mode privé
restrictif, etc.) : tout est protégé par "if ('serviceWorker' in
navigator)", la partie continue de fonctionner normalement en simple
page web, juste sans mise en cache ni fonctionnement hors-ligne.
============================================================ */

/* Capturé AVANT tout enregistrement/attente : distingue "ce
   chargement avait déjà un service worker actif" (relance normale —
   aucun voile à afficher) de "premier lancement, pas encore de
   service worker" (voile à afficher le temps que ça se stabilise —
   voir historique : c'est exactement le cas qui obligeait à
   quitter/relancer l'app manuellement au tout premier lancement). */
var pwaHadControllerAtLoad = ("serviceWorker" in navigator) && !!navigator.serviceWorker.controller;

function initPwaServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  if (!pwaHadControllerAtLoad) {
    showPwaBootGate();
    waitForPwaControllerThenHideGate();
  }

  window.addEventListener("load", function () {
    navigator.serviceWorker.register("./sw.js").catch(function (err) {
      // Echec silencieux (ex: page ouverte en file:// pendant un test
      // local, ou hébergement sans HTTPS) — ne doit jamais bloquer le
      // jeu, qui fonctionne très bien sans PWA. Le voile de garde a
      // de toute façon son propre filet de sécurité (timeout), donc
      // il se referme tout seul même si l'enregistrement échoue ici.
      console.warn("Service worker non enregistré :", err);
    });
  });

  // Un nouveau service worker vient de prendre le contrôle de la
  // page (voir self.clients.claim() dans sw.js). Deux cas bien
  // différents :
  //   1. Premier lancement (pwaHadControllerAtLoad était déjà faux) :
  //      cette prise de contrôle correspond juste à la toute première
  //      installation qui se termine — pas une "mise à jour", donc
  //      pas de bannière, juste la fermeture du voile de garde (déjà
  //      gérée par waitForPwaControllerThenHideGate ci-dessous via
  //      l'event "controllerchange").
  //   2. Session déjà en cours avec un service worker déjà actif
  //      (pwaHadControllerAtLoad était vrai) : là oui, un NOUVEAU
  //      service worker vient de remplacer l'ancien en plein milieu
  //      de la partie — c'est une vraie mise à jour, on prévient le
  //      joueur.
  navigator.serviceWorker.addEventListener("message", function (event) {
    if (!event.data || event.data.type !== "QUEST_IDLE_SW_UPDATED") return;
    if (pwaHadControllerAtLoad) showPwaUpdateBanner();
  });
}

/* ============================================================
   Voile de garde premier lancement (#pwa-boot-gate).
============================================================ */

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

  // Filet de sécurité : le jeu ne doit JAMAIS rester bloqué derrière
  // ce voile, même si l'installation échoue, traîne, ou si le
  // navigateur se comporte différemment que prévu.
  setTimeout(resolve, 6000);

  if (navigator.serviceWorker.controller) {
    resolve();
    return;
  }
  navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true });
}

/* ============================================================
   Bannière "Nouvelle version disponible" (mise à jour en cours de
   session, voir plus haut).
============================================================ */

function showPwaUpdateBanner() {
  var el = document.getElementById("pwa-update-banner");
  if (!el || el.classList.contains("show")) return;
  el.classList.add("show");
}

function reloadForPwaUpdate() {
  window.location.reload();
}

window.initPwaServiceWorker = initPwaServiceWorker;
window.reloadForPwaUpdate = reloadForPwaUpdate;

// Auto-démarrage : indépendant de l'init() du jeu (voir main/boot.js),
// pas besoin d'attendre que la sauvegarde/les systèmes soient chargés.
initPwaServiceWorker();

