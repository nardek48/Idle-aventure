"use strict";
/* ============================================================
Quest Idle — ui/cycle-summary-view.js
Fenêtre affichée quand le joueur reboucle à la Forêt — que ce soit
un cycle COMPLET (les 6 mondes traversés) ou un "mini-cycle" plus
précoce (verrouillé faute d'ascensions suffisantes). Même principe
que le résumé de fin de donjon, pour que le joueur comprenne
clairement qu'il recommence, et surtout combien il lui manque pour
avancer. Voir WorldManager.advance() en systems/progression-system.js
(result.type === "cycle" ou "locked") pour le déclenchement.
============================================================ */

function buildCycleSummaryHTML(lockedWorld) {
  var cycleNumber = game.cycleCount || 0;
  var isLocked = !!lockedWorld;

  var minKills = (typeof ASCENSION_CONFIG !== "undefined" && ASCENSION_CONFIG.minKillsToAscend) || 200;
  var currentKills = Number(game.totalKills || 0);
  var currentAscensions = Number(game.ascensionCount || 0);

  var h = '<div class="full-menu-overlay">';
  h += '  <div class="full-menu dungeon-story-card is-success">';
  h += '    <div class="dungeon-story-icon">🌀</div>';

  if (isLocked) {
    var ascNeeded = Math.max(0, (lockedWorld.requiredAscension || 0) - currentAscensions);
    h += '    <div class="dungeon-story-title">Nouveau tour !</div>';
    h += '    <div class="dungeon-story-text">' + esc(lockedWorld.name) + ' est encore hors de portée — il faut plus d\u2019ascensions pour s\u2019y aventurer. Tu repars de la Forêt, mais rien n\u2019est perdu : chaque ascension compte pour de bon.</div>';

    h += '    <div class="dungeon-summary-rewards">';
    h += '      <div class="dungeon-summary-row"><span>Kills (pour ascensionner)</span><span>' + esc(formatNumber(currentKills)) + ' / ' + esc(formatNumber(minKills)) + '</span></div>';
    h += '      <div class="dungeon-summary-row"><span>Ascensions avant ' + esc(lockedWorld.name) + '</span><span>' + esc(ascNeeded) + '</span></div>';
    h += '      <div class="dungeon-summary-row"><span>Tours effectués</span><span>' + esc(cycleNumber) + '</span></div>';
    h += '    </div>';
  } else {
    h += '    <div class="dungeon-story-title">Cycle ' + esc(cycleNumber) + ' terminé !</div>';
    h += '    <div class="dungeon-story-text">Tu as traversé les six mondes. Le Cycle recommence — un peu plus dur, un peu plus étrange, comme toujours. Ascensionne pour repousser durablement cette limite et débloquer les mondes suivants pour de bon.</div>';

    h += '    <div class="dungeon-summary-rewards">';
    h += '      <div class="dungeon-summary-row"><span>Cycles bouclés</span><span>' + esc(cycleNumber) + '</span></div>';
    h += '      <div class="dungeon-summary-row"><span>Ascensions</span><span>' + esc(formatNumber(currentAscensions)) + '</span></div>';
    h += '      <div class="dungeon-summary-row"><span>Total tués</span><span>' + esc(formatNumber(currentKills)) + '</span></div>';
    h += '    </div>';
  }

  h += '    <button class="settings-btn primary dungeon-story-close" type="button" onclick="closeCycleSummary()">Continuer le Cycle</button>';
  h += '  </div>';
  h += '</div>';
  return h;
}

/* lockedWorld : passer le monde bloquant pour un "mini-cycle" précoce,
   ou rien/null pour un vrai cycle complet (les 6 mondes traversés). */
function openCycleSummary(lockedWorld) {
  var host = document.getElementById("cycle-modal-root");
  if (host) host.innerHTML = buildCycleSummaryHTML(lockedWorld || null);
}

function closeCycleSummary() {
  var host = document.getElementById("cycle-modal-root");
  if (host) host.innerHTML = "";
}

window.buildCycleSummaryHTML = buildCycleSummaryHTML;
window.openCycleSummary = openCycleSummary;
window.closeCycleSummary = closeCycleSummary;
