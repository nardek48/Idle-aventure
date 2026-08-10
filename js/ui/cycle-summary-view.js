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

  var currentKills = Number(game.totalKills || 0);
  var currentAscensions = Number(game.ascensionCount || 0);

  var h = '<div class="full-menu-overlay">';
  h += '  <div class="full-menu dungeon-story-card is-success">';
  h += '    <div class="dungeon-story-icon">' + renderIconOrEmojiHTML("images/Icons/aether_icon.png", "dungeon-story-icon-img", "Cycle") + '</div>';

  if (isLocked) {
    // v2.83 : le monde se débloque désormais via une questline (voir
    // data/world-quests.js), plus par nombre d'ascensions.
    var lockedWorldIndex = WORLDS.indexOf(lockedWorld);
    var quest = window.WorldQuestManager ? WorldQuestManager.getQuestForWorldIndex(lockedWorldIndex) : null;
    var questStepsDone = quest ? quest.steps.filter(function (s) { return WorldQuestManager.isStepComplete(quest, s); }).length : 0;
    var questStepsTotal = quest ? quest.steps.length : 0;

    h += '    <div class="dungeon-story-title">Nouveau tour !</div>';
    h += '    <div class="dungeon-story-text">' + esc(lockedWorld.name) + ' est encore hors de portée — il faut terminer sa questline de déblocage pour s\u2019y aventurer (voir l\u2019écran Carte). Tu repars de la Forêt, mais rien n\u2019est perdu : ta progression de questline compte pour de bon.</div>';

    h += '    <div class="dungeon-summary-rewards">';
    if (quest) {
      h += '      <div class="dungeon-summary-row"><span>Questline "' + esc(quest.name) + '"</span><span>' + esc(questStepsDone) + '/' + esc(questStepsTotal) + ' étapes</span></div>';
    }
    h += '      <div class="dungeon-summary-row"><span>Ascensions (puissance)</span><span>' + esc(formatNumber(currentAscensions)) + '</span></div>';
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
