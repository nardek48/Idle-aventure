"use strict";
/* ui/toast.js — message temporaire en bas d'écran (2s par défaut), utilisé partout. Détail : COMMENTAIRES_ORIGINAUX.md */

var toastTimer = null;

function showToast(message, duration) {
  var el = document.getElementById("toast");
  if (!el) return;
  el.textContent = message;
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
