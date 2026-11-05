"use strict";
/* ui/toast.js — message temporaire en bas d'écran (2s par défaut), utilisé partout. */

var toastTimer = null;

function showToast(message, duration) {
  var el = document.getElementById("toast");
  if (!el) return;
  el.textContent = message;
  // finition : création du héros ouverte, le message monte sur l'illustration (il couvrait le champ du nom)
  el.classList.toggle("is-top", !!document.querySelector(".hc-overlay"));
  el.classList.add("show");
  // v3.429.13 : les libellés des bulles de raccourci s'effacent le temps du message (chevauchement)
  if (document.body) document.body.classList.add("toast-shown");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    el.classList.remove("show");
    if (document.body) document.body.classList.remove("toast-shown");
  }, duration || 2000);
}

window.showToast = showToast;
