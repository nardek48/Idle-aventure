"use strict";
/* ui/log-view.js — écran Journal : 50 événements les plus récents (window.gameLog). Détail complet : COMMENTAIRES_ORIGINAUX.md */

/* v3.365.0 (lot J, demande Seb 28/09/2026) : le Bilan de la partie, venu des Hauts faits, en tête
   du Journal. Ouvert par défaut, repliable ; l'état replié suit l'appareil (Prefs « logTotals »). */
function toggleLogTotals() {
  if (window.Prefs) Prefs.set("logTotals", !Prefs.get("logTotals"));
  if (typeof renderPanel === "function") renderPanel();
}
window.toggleLogTotals = toggleLogTotals;

function buildLogTotalsHTML() {
  if (typeof buildAchievementTotalsHTML !== "function") return "";
  var open = !window.Prefs || Prefs.get("logTotals") !== false;
  var h = '<div class="hf-old log-totals"><button type="button" class="hf-old-h" aria-expanded="' + (open ? 'true' : 'false') + '" onclick="toggleLogTotals()">'
    + (open ? '▾' : '▸') + ' Bilan de la partie</button>';
  if (open) h += buildAchievementTotalsHTML();
  return h + '</div>';
}

function buildLogHTML() {
  var entries = window.gameLog || [];
  var h = buildLogTotalsHTML() + '<div id="log-container">';

  if (!entries.length) {
    h += '<div style="color:var(--nb-ink-dim);text-align:center;padding:20px;">Aucun événement.</div>';
  } else {
    entries.slice(0, 50).forEach(function (e) {
      h += '<div class="log-entry ' + esc(e.type || "normal") + '">' + esc(e.text) + '</div>';
    });
  }

  h += '</div>';
  return '<div class="nb-page-frame kframe-page" data-kf-title="images/Icons/codex/codex_lore.png|Journal">' + h + '</div>';
}

window.buildLogHTML = buildLogHTML;
