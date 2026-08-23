"use strict";
/* ============================================================
Aethervale — ui/combat-report-view.js
v3.61.0 : Rapport post-combat (étape 4.1 de la feuille de route
combat) — affiche le contenu de game.combatReport (voir
systems/combat-report-system.js) sous forme de fiche par capacité,
répondant aux 2 questions posées par Seb : "ai-je perdu du rendement
à cause d'une réservation ?" et "les contres obtenus compensent-ils
ce coût ?".

v3.62.0 : rapport rendu CUMULATIF (voir en-tête de combat-report-
system.js) — décision affinée avec Seb suite à un retour en jeu réel :
  - L'auto-popup après un boss vaincu (v3.61.0) est retirée. Seule
    reste l'ouverture automatique à la MORT du héros
    (openCombatReport("defeat", ...), appelée depuis CombatEngine.
    onHeroDefeated()) — le rapport peut désormais couvrir plusieurs
    boss d'affilée, la mort reste le moment où un diagnostic immédiat
    a le plus de valeur.
  - Le bouton d'accès permanent est déplacé de l'écran Combat vers
    l'écran Grimoire (voir ui/grimoire-view.js) — plus cohérent : le
    Grimoire est l'endroit où on configure les règles, donc l'endroit
    où on veut vérifier si elles marchent.
  - Nouveau bouton "Réinitialiser" DANS la modale (voir
    resetCombatReport() plus bas) — seul moyen de vider le rapport
    désormais, avec confirmation (showConfirmModal, ui/modal.js) pour
    éviter un effacement accidentel de données potentiellement
    accumulées sur plusieurs boss.

Non bloquant : #combat-report-modal-root n'est PAS dans
BLOCKING_MODAL_IDS (main/game-loop.js) — contrairement aux fenêtres
de progression (Carte, Donjon...), le combat automatique continue de
tourner en dessous pendant que le rapport est affiché, cohérent avec
un simple écran d'INFORMATION plutôt qu'une étape à valider.
============================================================ */

/* Libellé lisible d'un slot d'action, pour l'en-tête de chaque
   fiche — lu depuis le kit de la classe COURANTE (mêmes libellés que
   ceux affichés sur les boutons de combat/le Grimoire). Si le héros a
   changé de classe depuis le combat couvert par le rapport, les
   libellés affichés sont ceux de la classe ACTUELLE (cohérent avec le
   Grimoire, qui a le même comportement — voir sa note d'en-tête). */
function getCombatReportSlotLabel(slot) {
  var fallback = { skill1: "Compétence 1", skill2: "Compétence 2", skill3: "Compétence 3", defense: "Défense" };
  if (!window.ClassCombatManager || typeof ClassCombatManager.getAction !== "function") return fallback[slot] || slot;
  var action = ClassCombatManager.getAction(slot);
  return action ? action.label : (fallback[slot] || slot);
}

/* Une ligne de diagnostic textuel par capacité, dans l'esprit des 2
   exemples donnés par Seb (feuille de route, section 4.1) — l'un
   "rentable" (contre payant), l'autre "non rentable" (réservation
   sans utilité pour cette rencontre). Reste silencieux (aucune ligne)
   si la capacité n'a aucune activité notable, pour ne pas noyer le
   joueur sous des fiches vides. */
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

  // v3.61.0 : verdict textuel simple — décision actée dans la
  // feuille de route : répondre clairement à "réservation rentable
  // ou non pour cette rencontre", pas seulement empiler des chiffres.
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

/* trigger : "defeat" | "manual" — influence uniquement le
   titre/sous-titre affiché, aucune logique de collecte. "boss" reste
   accepté pour compat (plus jamais émis depuis v3.62.0, voir en-tête
   de fichier) au cas où un appelant externe l'utiliserait encore.
   enemyName : nom de l'ennemi ayant infligé le coup fatal (défaite),
   null sinon (ouverture manuelle générique — le rapport peut couvrir
   plusieurs ennemis/boss différents). */
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
    });

    if (!hasAnyActivity) {
      h += '    <p class="panel-sub">Pas encore assez d\'activité sur ce combat pour établir un rapport détaillé.</p>';
    } else {
      // v3.61.0 : dégâts évités/soin empêché/boucliers retirés — vue
      // d'ensemble AVANT le détail par capacité, cohérent avec la
      // question "les contres obtenus compensent-ils le coût ?".
      var summaryParts = [];
      if (report.damageAvoidedTotal > 0) summaryParts.push('🛡️ ~' + formatNumber(Math.floor(report.damageAvoidedTotal)) + ' dégâts évités');
      if (report.healPreventedTotal > 0) summaryParts.push('💚 ~' + formatNumber(Math.floor(report.healPreventedTotal)) + ' PV de soin empêchés');
      if (report.shieldsRemovedCount > 0) summaryParts.push('⚡ ' + report.shieldsRemovedCount + ' bouclier' + (report.shieldsRemovedCount !== 1 ? 's' : '') + ' retiré' + (report.shieldsRemovedCount !== 1 ? 's' : ''));
      if (summaryParts.length) {
        h += '    <div class="combat-report-summary">' + summaryParts.map(function (p) { return esc(p); }).join('<br>') + '</div>';
      }

      ["skill1", "skill2", "skill3", "defense"].forEach(function (slot) {
        h += buildCombatReportSlotCardHTML(slot, report.perSlot[slot]);
      });
    }
  }

  h += '    <button class="settings-btn primary dungeon-story-close" type="button" onclick="closeCombatReport()">Continuer</button>';
  // v3.62.0 : bouton de reset EXPLICITE (voir en-tête de fichier) —
  // seul moyen de vider le rapport désormais qu'il est cumulatif.
  // Affiché même si le rapport est déjà vide (pas de garde ici) :
  // rester visible en permanence évite un bouton qui apparaît/
  // disparaît selon l'état, plus prévisible pour le joueur ; un reset
  // sur un rapport vide ne fait juste rien de notable.
  h += '    <button class="settings-btn combat-report-reset-btn" type="button" onclick="resetCombatReport()">🗑️ Réinitialiser le rapport</button>';
  h += '  </div>';
  h += '</div>';
  return h;
}

/* trigger/enemyName : voir buildCombatReportHTML(). Non bloquant —
   #combat-report-modal-root n'est jamais listé dans BLOCKING_MODAL_IDS
   (voir en-tête de fichier). */
function openCombatReport(trigger, enemyName) {
  var host = document.getElementById("combat-report-modal-root");
  if (host) host.innerHTML = buildCombatReportHTML(trigger || "manual", enemyName || null);
}

function closeCombatReport() {
  var host = document.getElementById("combat-report-modal-root");
  if (host) host.innerHTML = "";
}

/* v3.62.0 : vide game.combatReport après confirmation (même pattern
   que showConfirmModal(), voir ui/modal.js — utilisé ailleurs pour
   l'ascension/le reset complet/le respec de talents, mêmes enjeux
   d'irréversibilité). Referme puis rouvre immédiatement la modale
   pour que le joueur voie tout de suite le rapport vidé, plutôt que
   de la fermer entièrement (il vient peut-être de reset pour repartir
   sur une nouvelle mesure, pas pour quitter l'écran). */
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
