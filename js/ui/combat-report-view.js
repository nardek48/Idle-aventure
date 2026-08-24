"use strict";
/* ui/combat-report-view.js — rapport post-combat CUMULATIF (v3.62.0), fiche par capacité (utilisations/contres/réservations).
   Ouverture auto à la mort (onHeroDefeated), accès permanent depuis le Grimoire. Non bloquant. Détail : COMMENTAIRES_ORIGINAUX.md */

function getCombatReportSlotLabel(slot) {
  var fallback = { skill1: "Compétence 1", skill2: "Compétence 2", skill3: "Compétence 3", defense: "Défense" };
  if (!window.ClassCombatManager || typeof ClassCombatManager.getAction !== "function") return fallback[slot] || slot;
  var action = ClassCombatManager.getAction(slot);
  return action ? action.label : (fallback[slot] || slot);
}

function buildCombatReportSlotCardHTML(slot, stats) {
  var hasActivity = stats.uses || stats.blockedByReserve || stats.telegraphsSeen
    || stats.countersSucceeded || stats.countersMissed || stats.countersExpired
    || stats.failedNoResource || stats.failedOnCooldown;
  if (!hasActivity) return "";

  var label = getCombatReportSlotLabel(slot);

  var h = '<div class="panel-card combat-report-slot-card">';
  h += '<h3>' + esc(label) + '</h3>';

  var lineParts = [];
  lineParts.push(stats.uses + ' utilisation' + (stats.uses !== 1 ? 's' : ''));
  if (stats.blockedByReserve > 0) {
    lineParts.push(stats.blockedByReserve + ' blocage' + (stats.blockedByReserve !== 1 ? 's' : '') + ' par réservation');
  }
  if (stats.telegraphsSeen > 0) {
    lineParts.push(stats.telegraphsSeen + ' télégraphe' + (stats.telegraphsSeen !== 1 ? 's' : '') + ' compatible' + (stats.telegraphsSeen !== 1 ? 's' : '') + ' vu' + (stats.telegraphsSeen !== 1 ? 's' : ''));
  }
  h += '<p class="panel-sub combat-report-slot-line">' + esc(lineParts.join(' · ')) + '</p>';

  if (stats.countersSucceeded > 0 || stats.countersExpired > 0 || stats.countersMissed > 0) {
    var counterParts = [];
    if (stats.countersSucceeded > 0) counterParts.push('⚡ ' + stats.countersSucceeded + ' contre' + (stats.countersSucceeded !== 1 ? 's' : '') + ' réussi' + (stats.countersSucceeded !== 1 ? 's' : ''));
    if (stats.countersExpired > 0) counterParts.push(stats.countersExpired + ' expiré' + (stats.countersExpired !== 1 ? 's' : '') + ' sans contre');
    if (stats.countersMissed > 0) counterParts.push(stats.countersMissed + ' raté' + (stats.countersMissed !== 1 ? 's' : '') + ' (mauvais timing)');
    h += '<p class="panel-sub combat-report-slot-line">' + esc(counterParts.join(' · ')) + '</p>';
  }

  if (stats.failedNoResource > 0 || stats.failedOnCooldown > 0) {
    var failParts = [];
    if (stats.failedNoResource > 0) failParts.push(stats.failedNoResource + ' échec' + (stats.failedNoResource !== 1 ? 's' : '') + ' (ressource insuffisante)');
    if (stats.failedOnCooldown > 0) failParts.push(stats.failedOnCooldown + ' échec' + (stats.failedOnCooldown !== 1 ? 's' : '') + ' (en recharge)');
    h += '<p class="panel-sub combat-report-slot-line">' + esc(failParts.join(' · ')) + '</p>';
  }

  var verdict = null;
  if (stats.blockedByReserve > 0 && stats.telegraphsSeen === 0) {
    verdict = "Réservation non rentable pour cette rencontre : aucun télégraphe compatible rencontré.";
  } else if (stats.countersSucceeded > 0 && stats.blockedByReserve > 0) {
    verdict = "Réservation rentable : le contre a bien annulé une attaque adverse.";
  } else if (stats.blockedByReserve > 0 && stats.countersExpired > 0) {
    verdict = "Réservation présente mais contre manqué — vérifie le timing ou le coût de l'action.";
  }
  if (verdict) {
    h += '<p class="panel-sub combat-report-verdict">' + esc(verdict) + '</p>';
  }

  h += '</div>';
  return h;
}

function buildCombatReportArchetypeCardHTML(impact) {
  if (!impact) return "";

  var lines = [];
  if (impact.enragedBonusDamageTaken > 0) lines.push('😡 ~' + formatNumber(Math.floor(impact.enragedBonusDamageTaken)) + ' dégâts bonus subis (Enragé)');
  if (impact.vampiricHealStolen > 0) lines.push('🧛 ~' + formatNumber(Math.floor(impact.vampiricHealStolen)) + ' PV volés par l\'ennemi (Vampirique)');
  if (impact.corruptedDamageLost > 0) lines.push('☠️ ~' + formatNumber(Math.floor(impact.corruptedDamageLost)) + ' dégâts perdus (Corrompu)');
  if (impact.armoredDamageLost > 0) lines.push('🛡️‍🩹 ~' + formatNumber(Math.floor(impact.armoredDamageLost)) + ' dégâts perdus (Blindé)');

  if (!lines.length) return "";

  var h = '<div class="panel-card combat-report-slot-card">';
  h += '<h3>Archétypes rencontrés</h3>';
  h += '<p class="panel-sub combat-report-slot-line">' + lines.map(function (l) { return esc(l); }).join('<br>') + '</p>';
  h += '</div>';
  return h;
}

function buildCombatReportHTML(trigger, enemyName) {
  var report = (window.CombatReportManager) ? CombatReportManager.getSnapshot() : null;

  var h = '<div class="full-menu-overlay combat-report-overlay">';
  h += '  <div class="full-menu dungeon-story-card combat-report-card">';

  var icon = trigger === "defeat" ? "💀" : trigger === "boss" ? "👑" : "📊";
  var title = trigger === "defeat" ? "Rapport de combat — défaite"
    : trigger === "boss" ? "Rapport de combat — boss vaincu"
    : "Rapport de combat";
  h += '    <div class="dungeon-story-icon">' + icon + '</div>';
  h += '    <div class="dungeon-story-title">' + esc(title) + '</div>';
  if (enemyName) {
    h += '    <div class="dungeon-story-meta">' + esc(enemyName) + '</div>';
  }

  if (!report) {
    h += '    <p class="panel-sub">Aucune donnée de combat disponible pour l\'instant.</p>';
  } else {
    var hasAnyActivity = Object.keys(report.perSlot).some(function (slot) {
      var s = report.perSlot[slot];
      return s.uses || s.blockedByReserve || s.telegraphsSeen || s.countersSucceeded || s.countersMissed || s.countersExpired || s.failedNoResource || s.failedOnCooldown;
    }) || report.totalDamageDealt > 0;

    if (!hasAnyActivity) {
      h += '    <p class="panel-sub">Pas encore assez d\'activité sur ce combat pour établir un rapport détaillé.</p>';
    } else {
      var summaryParts = [];
      var avgDps = (window.CombatReportManager && typeof CombatReportManager.getAverageDps === "function") ? CombatReportManager.getAverageDps() : 0;
      if (avgDps > 0) summaryParts.push('⚔️ ~' + formatNumber(Math.round(avgDps)) + ' DPS moyen');
      if (report.damageAvoidedTotal > 0) summaryParts.push('🛡️ ~' + formatNumber(Math.floor(report.damageAvoidedTotal)) + ' dégâts évités');
      if (report.healPreventedTotal > 0) summaryParts.push('💚 ~' + formatNumber(Math.floor(report.healPreventedTotal)) + ' PV de soin empêchés');
      if (report.shieldsRemovedCount > 0) summaryParts.push('⚡ ' + report.shieldsRemovedCount + ' bouclier' + (report.shieldsRemovedCount !== 1 ? 's' : '') + ' retiré' + (report.shieldsRemovedCount !== 1 ? 's' : ''));
      if (report.silencesAvoidedCount > 0) summaryParts.push('🔇 ' + report.silencesAvoidedCount + ' silence' + (report.silencesAvoidedCount !== 1 ? 's' : '') + ' évité' + (report.silencesAvoidedCount !== 1 ? 's' : ''));
      if (summaryParts.length) {
        h += '    <div class="combat-report-summary">' + summaryParts.map(function (p) { return esc(p); }).join('<br>') + '</div>';
      }

      h += buildCombatReportArchetypeCardHTML(report.archetypeImpact);

      ["skill1", "skill2", "skill3", "defense"].forEach(function (slot) {
        h += buildCombatReportSlotCardHTML(slot, report.perSlot[slot]);
      });
    }
  }

  h += '    <button class="settings-btn primary dungeon-story-close" type="button" onclick="closeCombatReport()">Continuer</button>';
  h += '    <button class="settings-btn combat-report-reset-btn" type="button" onclick="resetCombatReport()">🗑️ Réinitialiser le rapport</button>';
  h += '  </div>';
  h += '</div>';
  return h;
}

function openCombatReport(trigger, enemyName) {
  var host = document.getElementById("combat-report-modal-root");
  if (host) host.innerHTML = buildCombatReportHTML(trigger || "manual", enemyName || null);
}

function closeCombatReport() {
  var host = document.getElementById("combat-report-modal-root");
  if (host) host.innerHTML = "";
}

function resetCombatReport() {
  showConfirmModal(
    "Réinitialiser le rapport ?",
    "Toutes les données accumulées (utilisations, contres, réservations) seront effacées. Cette action est irréversible.",
    "🗑️",
    function () {
      if (window.CombatReportManager) CombatReportManager.resetManual();
      openCombatReport("manual", null);
    }
  );
}

window.buildCombatReportHTML = buildCombatReportHTML;
window.openCombatReport = openCombatReport;
window.closeCombatReport = closeCombatReport;
window.resetCombatReport = resetCombatReport;
