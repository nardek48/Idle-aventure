"use strict";
/* ============================================================
Quest Idle — main/pwa.js
Enregistrement du Service Worker (voir sw.js à la racine) + petite
bannière "Nouvelle version disponible" quand une mise à jour bascule
en cours de partie (voir la note "MISE À JOUR IMMÉDIATE" dans sw.js —
c'est le pendant côté page de self.clients.claim() + postMessage).

N'affecte en rien le jeu lui-même si le navigateur ne supporte pas
les service workers (vieux Safari, navigateurs en mode privé
restrictif, etc.) : tout est protégé par "if ('serviceWorker' in
navigator)", la partie continue de fonctionner normalement en simple
page web, juste sans mise en cache ni fonctionnement hors-ligne.
============================================================ */

function initPwaServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", function () {
    navigator.serviceWorker.register("./sw.js").catch(function (err) {
      // Echec silencieux (ex: page ouverte en file:// pendant un test
      // local, ou hébergement sans HTTPS) — ne doit jamais bloquer le
      // jeu, qui fonctionne très bien sans PWA.
      console.warn("Service worker non enregistré :", err);
    });
  });

  // Un nouveau service worker vient de prendre le contrôle de la
  // page (voir self.clients.claim() dans sw.js) : le code du jeu
  // servi par LE PROCHAIN rechargement sera différent de celui
  // actuellement chargé en mémoire. On prévient le joueur plutôt que
  // de recharger tout seul (recharger sans prévenir pendant un combat
  // par exemple serait perturbant).
  navigator.serviceWorker.addEventListener("message", function (event) {
    if (event.data && event.data.type === "QUEST_IDLE_SW_UPDATED") {
      showPwaUpdateBanner();
    }
  });
}

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
