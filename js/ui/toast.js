"use strict";


/* ============================================================
  Variable interne du toast. 
============================================================ */

var toastTimer = null;

/* ============================================================
  Utilisée partout par les clics et confirmations.
============================================================ */

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