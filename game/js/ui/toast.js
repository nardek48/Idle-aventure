"use strict";
/* ui/toast.js — message temporaire en bas d'écran (2s par défaut), utilisé partout. Détail : COMMENTAIRES_ORIGINAUX.md */

var toastTimer = null;

function showToast(message, duration) {
  var el = document.getElementById("toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    el.classList.remove("show");
  }, duration || 2000);
}

window.showToast = showToast;
