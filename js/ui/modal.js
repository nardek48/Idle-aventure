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

  if (titleEl) titleEl.textContent = title || _t("Confirmer");
  if (textEl) textEl.textContent = text || "";
  if (iconEl) iconEl.innerHTML = renderIconOrEmojiHTML(icon || "images/Icons/system/ascension.png", "confirm-icon-img", title || "");

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
  var timeText = _t("Absent depuis {d}", { d: hours > 0 ? (hours + "h" + (minutes ? minutes + "m" : "")) : (minutes + "m") });
  if (timeEl) timeEl.textContent = timeText;

  if (rewardsEl) {
    var rows = [];

    var pushResourceRow = function (key, amount, suffix) {
      var def = typeof WAREHOUSE_RESOURCES !== "undefined" ? WAREHOUSE_RESOURCES[key] : null;
      var iconHTML = def && def.icon ? renderIconOrEmojiHTML(def.icon, "offline-reward-icon", _td(def.name)) : '<img class="offline-reward-icon" src="images/Icons/system/warehouse_supplies.png" alt="">';
      rows.push('<div class="offline-reward-row">' + iconHTML + ' +' + formatNumber(amount) + ' ' + esc(def ? _td(def.name) : key) + (suffix || "") + '</div>');
    };

    Object.keys(offline.produced || {}).forEach(function (key) {
      pushResourceRow(key, offline.produced[key], "");
    });
    Object.keys(offline.crafted || {}).forEach(function (key) {
      pushResourceRow(key, offline.crafted[key], " " + _t("(atelier)"));
    });

    if (offline.fullPlots > 0) {
      rows.push('<div class="offline-reward-row"><img class="ico-inline" src="images/Icons/system/warning.png" alt=""> ' + _tn(offline.fullPlots, "{n} zone pleine sur {m} — pense à récolter !", "{n} zones pleines sur {m} — pense à récolter !", { m: offline.openPlots }) + '</div>');
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

/* v3.399.0 (lot F-1, habillage C · Mixte validé par Seb) : en-tête commun des feuilles du bas.
   Bandeau de pierre (poignée, icône, titre, sous-titre) et bouton rond de fermeture en haut
   à droite ; le corps reste en parchemin. Une seule source pour toutes les feuilles : changer
   d'habillage plus tard ne touche que les jetons --sheet-* de css/00-tokens.css.
   o.title, o.icon, o.sub : HTML déjà échappé par l'appelant. o.close : code JS du onclick. */
function kSheetHeadHTML(o) {
  o = o || {};
  var h = '<div class="ksheet-head' + (o.cls ? ' ' + o.cls : '') + '"><div class="ksheet-handle"></div>';
  h += '<div class="ksheet-title">' + (o.icon || '') + '<span class="ksheet-ttl">' + (o.title || '')
    + (o.sub ? '<small class="ksheet-sub">' + o.sub + '</small>' : '') + '</span></div>';
  if (o.close) h += '<button type="button" class="ksheet-x" onclick="' + o.close + '" aria-label="' + esc(_t("Fermer")) + '"></button>';
  return h + '</div>';
}
window.kSheetHeadHTML = kSheetHeadHTML;

/* v3.400.0 (lot F-2) : en-tête des fenêtres centrées (.kwin). Même pierre que les feuilles,
   centré : grande icône, titre, sous-titre. La croix est facultative : une fenêtre qui attend
   une réponse (confirmation, choix, fin de quête) se ferme par ses propres boutons.
   o.icon, o.title, o.sub : HTML déjà échappé par l'appelant. o.close : code JS du onclick. */
function kWinHeadHTML(o) {
  o = o || {};
  var h = '<div class="ksheet-head kwin-head' + (o.cls ? ' ' + o.cls : '') + '">';
  if (o.icon) h += '<div class="kwin-ico">' + o.icon + '</div>';
  h += '<div class="kwin-ttl">' + (o.title || '') + (o.sub ? '<small class="ksheet-sub">' + o.sub + '</small>' : '') + '</div>';
  if (o.close) h += '<button type="button" class="ksheet-x" onclick="' + o.close + '" aria-label="' + esc(_t("Fermer")) + '"></button>';
  return h + '</div>';
}
window.kWinHeadHTML = kWinHeadHTML;
