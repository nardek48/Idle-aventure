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
    if (offline.gold > 0) rows.push('<div class="offline-reward-row">💰 +' + formatNumber(offline.gold) + ' or</div>');
    if (offline.essence > 0) rows.push('<div class="offline-reward-row">' + renderIconOrEmojiHTML("images/Icons/essence_icon.png", "offline-reward-icon", "Essence") + ' +' + formatNumber(offline.essence) + ' essence</div>');
    if (offline.aether > 0) rows.push('<div class="offline-reward-row">' + renderIconOrEmojiHTML("images/Icons/aether_icon.png", "offline-reward-icon", "Aether") + ' +' + formatNumber(offline.aether) + ' Aether</div>');
    if (offline.kills > 0) rows.push('<div class="offline-reward-row">⚔️ ' + formatNumber(offline.kills) + ' ennemis vaincus par la Vigie</div>');
    if (offline.items && offline.items.length) {
      offline.items.forEach(function (name) {
        rows.push('<div class="offline-reward-row">🎁 ' + esc(name) + ' trouvé</div>');
      });
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
