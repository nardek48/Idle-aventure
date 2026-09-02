"use strict";
/* ui/modal.js — 2 modales génériques : confirmation (oui/non+callback) et retour hors-ligne (résumé des gains). Détail : COMMENTAIRES_ORIGINAUX.md */

var _confirmModalCallback = null;

function showConfirmModal(title, text, icon, onConfirm) {
  var modal = document.getElementById("confirm-modal");
  if (!modal) {
    if (window.confirm((title ? title + "\n\n" : "") + (text || ""))) {
      if (typeof onConfirm === "function") onConfirm();
    }
    return;
  }

  var titleEl = document.getElementById("confirm-title");
  var textEl = document.getElementById("confirm-text");
  var iconEl = document.getElementById("confirm-icon");

  if (titleEl) titleEl.textContent = title || "Confirmer";
  if (textEl) textEl.textContent = text || "";
  if (iconEl) iconEl.innerHTML = renderIconOrEmojiHTML(icon || "🌀", "confirm-icon-img", title || "");

  _confirmModalCallback = typeof onConfirm === "function" ? onConfirm : null;
  modal.classList.add("show");
}

function closeConfirmModal(confirmed) {
  var modal = document.getElementById("confirm-modal");
  if (modal) modal.classList.remove("show");

  var cb = _confirmModalCallback;
  _confirmModalCallback = null;

  if (confirmed && typeof cb === "function") cb();
}

window.showConfirmModal = showConfirmModal;
window.closeConfirmModal = closeConfirmModal;

/* v3.113.0 : la modale de retour affiche désormais la PRODUCTION accumulée pendant
   l'absence (zones + ateliers), plus aucun or/essence/kill de village — voir OfflineManager. */
function showOfflineModal(offline) {
  var modal = document.getElementById("offline-modal");
  if (!modal || !offline) return;

  var timeEl = document.getElementById("offline-time");
  var rewardsEl = document.getElementById("offline-rewards");

  var totalMinutes = Math.floor((offline.ms || 0) / 60000);
  var hours = Math.floor(totalMinutes / 60);
  var minutes = totalMinutes % 60;
  var timeText = hours > 0 ? ("Absent depuis " + hours + "h" + (minutes ? minutes + "m" : "")) : ("Absent depuis " + minutes + "m");
  if (timeEl) timeEl.textContent = timeText;

  if (rewardsEl) {
    var rows = [];

    var pushResourceRow = function (key, amount, suffix) {
      var def = typeof WAREHOUSE_RESOURCES !== "undefined" ? WAREHOUSE_RESOURCES[key] : null;
      var iconHTML = def && def.icon ? renderIconOrEmojiHTML(def.icon, "offline-reward-icon", def.name) : "📦";
      rows.push('<div class="offline-reward-row">' + iconHTML + ' +' + formatNumber(amount) + ' ' + esc(def ? def.name : key) + (suffix || "") + '</div>');
    };

    Object.keys(offline.produced || {}).forEach(function (key) {
      pushResourceRow(key, offline.produced[key], "");
    });
    Object.keys(offline.crafted || {}).forEach(function (key) {
      pushResourceRow(key, offline.crafted[key], " (atelier)");
    });

    if (offline.fullPlots > 0) {
      rows.push('<div class="offline-reward-row">⚠️ ' + offline.fullPlots + ' zone' + (offline.fullPlots > 1 ? 's' : '') + ' pleine' + (offline.fullPlots > 1 ? 's' : '') + ' sur ' + offline.openPlots + ' — pense à récolter !</div>');
    }

    rewardsEl.innerHTML = rows.join("");
  }

  modal.classList.add("show");
}

function closeOfflineModal() {
  var modal = document.getElementById("offline-modal");
  if (modal) modal.classList.remove("show");
}

window.showOfflineModal = showOfflineModal;
window.closeOfflineModal = closeOfflineModal;
