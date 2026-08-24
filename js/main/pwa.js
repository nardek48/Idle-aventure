"use strict";
/* main/pwa.js — enregistrement Service Worker, voile de garde 1er lancement, bannière de mise à jour en cours de session.
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

window.initPwaServiceWorker = initPwaServiceWorker;
window.reloadForPwaUpdate = reloadForPwaUpdate;

initPwaServiceWorker();
