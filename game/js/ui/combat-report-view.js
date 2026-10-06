"use strict";
/* ui/combat-report-view.js — rapport post-combat CUMULATIF (v3.62.0), fiche par capacité (utilisations/contres/réservations).
   Ouverture auto à la mort (onHeroDefeated), accès permanent depuis le Grimoire. Non bloquant. Détail : COMMENTAIRES_ORIGINAUX.md */

/* v3.373.0 (i18n) : le rapport écrit « 0 utilisations » (pluriel dès 0, ≠ 1) — on garde cette
   règle telle quelle plutôt que celle de la langue ; les deux formes sont des phrases entières. */
function crPl(n, one, other) { return n === 1 ? one : other; }

function getCombatReportSlotLabel(slot) {
  var fallback = { skill1: _t("Compétence 1"), skill2: _t("Compétence 2"), skill3: _t("Compétence 3"), defense: _t("Défense") };
  if (!window.ClassCombatManager || typeof ClassCombatManager.getAction !== "function") return fallback[slot] || slot;
  var action = ClassCombatManager.getAction(slot);
  return action ? _td(action.label) : (fallback[slot] || slot);
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
  lineParts.push(crPl(stats.uses, _t("{n} utilisation", { n: stats.uses }), _t("{n} utilisations", { n: stats.uses })));
  if (stats.blockedByReserve > 0) {
    lineParts.push(crPl(stats.blockedByReserve, _t("{n} blocage par réservation", { n: stats.blockedByReserve }), _t("{n} blocages par réservation", { n: stats.blockedByReserve })));
  }
  if (stats.telegraphsSeen > 0) {
    lineParts.push(crPl(stats.telegraphsSeen, _t("{n} télégraphe compatible vu", { n: stats.telegraphsSeen }), _t("{n} télégraphes compatibles vus", { n: stats.telegraphsSeen })));
  }
  h += '<p class="panel-sub combat-report-slot-line">' + esc(lineParts.join(' · ')) + '</p>';

  if (stats.countersSucceeded > 0 || stats.countersExpired > 0 || stats.countersMissed > 0) {
    var counterParts = [];
    if (stats.countersSucceeded > 0) counterParts.push('<img class=ico-inline src=images/Icons/combat_stats/stat_speed.png> ' + crPl(stats.countersSucceeded, _t("{n} contre réussi", { n: stats.countersSucceeded }), _t("{n} contres réussis", { n: stats.countersSucceeded })));
    if (stats.countersExpired > 0) counterParts.push(crPl(stats.countersExpired, _t("{n} expiré sans contre", { n: stats.countersExpired }), _t("{n} expirés sans contre", { n: stats.countersExpired })));
    if (stats.countersMissed > 0) counterParts.push(crPl(stats.countersMissed, _t("{n} raté (mauvais timing)", { n: stats.countersMissed }), _t("{n} ratés (mauvais timing)", { n: stats.countersMissed })));
    h += '<p class="panel-sub combat-report-slot-line">' + escPreservingIcons(counterParts.join(' · ')) + '</p>';
  }

  if (stats.failedNoResource > 0 || stats.failedOnCooldown > 0) {
    var failParts = [];
    if (stats.failedNoResource > 0) failParts.push(crPl(stats.failedNoResource, _t("{n} échec (ressource insuffisante)", { n: stats.failedNoResource }), _t("{n} échecs (ressource insuffisante)", { n: stats.failedNoResource })));
    if (stats.failedOnCooldown > 0) failParts.push(crPl(stats.failedOnCooldown, _t("{n} échec (en recharge)", { n: stats.failedOnCooldown }), _t("{n} échecs (en recharge)", { n: stats.failedOnCooldown })));
    h += '<p class="panel-sub combat-report-slot-line">' + esc(failParts.join(' · ')) + '</p>';
  }

  var verdict = null;
  if (stats.blockedByReserve > 0 && stats.telegraphsSeen === 0) {
    verdict = _t("Réservation non rentable pour cette rencontre : aucun télégraphe compatible rencontré.");
  } else if (stats.countersSucceeded > 0 && stats.blockedByReserve > 0) {
    verdict = _t("Réservation rentable : le contre a bien annulé une attaque adverse.");
  } else if (stats.blockedByReserve > 0 && stats.countersExpired > 0) {
    verdict = _t("Réservation présente mais contre manqué — vérifie le timing ou le coût de l'action.");
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
  if (impact.enragedBonusDamageTaken > 0) lines.push('<img class=ico-inline src=images/Icons/combat_status/rage.png> ' + _t("~{n} dégâts bonus subis (Enragé)", { n: formatNumber(Math.floor(impact.enragedBonusDamageTaken)) }));
  if (impact.vampiricHealStolen > 0) lines.push('<img class=ico-inline src=images/Icons/combat_status/vampiric.png> ' + _t("~{n} PV volés par l'ennemi (Vampirique)", { n: formatNumber(Math.floor(impact.vampiricHealStolen)) }));
  if (impact.corruptedDamageLost > 0) lines.push('<img class=ico-inline src=images/Icons/combat_status/corruption.png> ' + _t("~{n} dégâts perdus (Corrompu)", { n: formatNumber(Math.floor(impact.corruptedDamageLost)) }));
  if (impact.armoredDamageLost > 0) lines.push('<img class=ico-inline src=images/Icons/combat_status/armored.png> ' + _t("~{n} dégâts perdus (Blindé)", { n: formatNumber(Math.floor(impact.armoredDamageLost)) }));

  if (!lines.length) return "";

  var h = '<div class="panel-card combat-report-slot-card">';
  h += '<h3>' + _t("Archétypes rencontrés") + '</h3>';
  h += '<p class="panel-sub combat-report-slot-line">' + lines.map(function (l) { return escPreservingIcons(l); }).join('<br>') + '</p>';
  h += '</div>';
  return h;
}

/* v3.211.0 : le CORPS du rapport est extrait de la superposition pour être réutilisé
   tel quel par la feuille basse du Grimoire (ui/grimoire-view.js). La superposition
   plein écran garde exactement le même contenu — c'est elle qui s'ouvre automatiquement
   à la mort et après un boss. Une seule source, deux habillages. */
function buildCombatReportBodyHTML() {
  var report = (window.CombatReportManager) ? CombatReportManager.getSnapshot() : null;

  if (!report) {
    return '<p class="panel-sub">' + _t("Aucune donnée de combat disponible pour l'instant.") + '</p>';
  }

  var hasAnyActivity = Object.keys(report.perSlot).some(function (slot) {
    var s = report.perSlot[slot];
    return s.uses || s.blockedByReserve || s.telegraphsSeen || s.countersSucceeded || s.countersMissed || s.countersExpired || s.failedNoResource || s.failedOnCooldown;
  }) || report.totalDamageDealt > 0;

  if (!hasAnyActivity) {
    return '<p class="panel-sub">' + _t("Pas encore assez d'activité sur ce combat pour établir un rapport détaillé.") + '</p>';
  }

  var h = "";
  var summaryParts = [];
  var avgDps = (window.CombatReportManager && typeof CombatReportManager.getAverageDps === "function") ? CombatReportManager.getAverageDps() : 0;
  if (avgDps > 0) summaryParts.push('<img class=ico-inline src=images/Icons/combat_stats/stat_attack.png> ' + _t("~{n} DPS moyen", { n: formatNumber(Math.round(avgDps)) }));
  if (report.damageAvoidedTotal > 0) summaryParts.push('<img class=ico-inline src=images/Icons/combat_stats/stat_defense.png> ' + _t("~{n} dégâts évités", { n: formatNumber(Math.floor(report.damageAvoidedTotal)) }));
  if (report.healPreventedTotal > 0) summaryParts.push('<img class=ico-inline src=images/Icons/combat_status/heal_incoming.png> ' + _t("~{n} PV de soin empêchés", { n: formatNumber(Math.floor(report.healPreventedTotal)) }));
  if (report.shieldsRemovedCount > 0) summaryParts.push('<img class=ico-inline src=images/Icons/combat_stats/stat_speed.png> ' + crPl(report.shieldsRemovedCount, _t("{n} bouclier retiré", { n: report.shieldsRemovedCount }), _t("{n} boucliers retirés", { n: report.shieldsRemovedCount })));
  if (report.silencesAvoidedCount > 0) summaryParts.push('<img class=ico-inline src=images/Icons/combat_status/silence_incoming.png> ' + crPl(report.silencesAvoidedCount, _t("{n} silence évité", { n: report.silencesAvoidedCount }), _t("{n} silences évités", { n: report.silencesAvoidedCount })));
  if (summaryParts.length) {
    h += '<div class="combat-report-summary">' + summaryParts.map(function (p) { return escPreservingIcons(p); }).join('<br>') + '</div>';
  }

  h += buildCombatReportArchetypeCardHTML(report.archetypeImpact);

  ["skill1", "skill2", "skill3", "defense"].forEach(function (slot) {
    h += buildCombatReportSlotCardHTML(slot, report.perSlot[slot]);
  });

  /* hasAnyActivity se contente de totalDamageDealt > 0, alors que chaque bloc ci-dessus
     filtre sur ses propres compteurs : des dégâts infligés sans aucune capacité utilisée
     (attaques de base seules) produisaient un corps VIDE, donc une feuille sans contenu
     entre le titre et le bouton. Repérée au harnais. */
  if (!h) return '<p class="panel-sub">' + _t("Pas encore assez d'activité sur ce combat pour établir un rapport détaillé.") + '</p>';

  return h;
}

window.buildCombatReportBodyHTML = buildCombatReportBodyHTML;

function buildCombatReportHTML(trigger, enemyName) {
  // v3.400.0 (lot F-2) : feuille du bas du kit (en-tête de pierre, croix, voile)
  var h = '<div class="full-menu-overlay combat-report-overlay" onclick="if (event.target === this) closeCombatReport();">';
  h += '  <div class="full-menu combat-report-card">';

  var icon = trigger === "defeat" ? "images/Icons/camp/hero_defeated.png" : trigger === "boss" ? "images/Icons/dungeon/boss_crown.png" : "images/Icons/subtabs/hero_stats.png";
  var title = trigger === "defeat" ? _t("Rapport de combat — défaite")
    : trigger === "boss" ? _t("Rapport de combat — boss vaincu")
    : _t("Rapport de combat");
  h += kSheetHeadHTML({ icon: renderIconOrEmojiHTML(icon, "", ""), title: esc(title), sub: enemyName ? esc(_td(enemyName)) : "", close: "closeCombatReport()" });
  h += '  <div class="ksheet-body">' + buildCombatReportBodyHTML() + '</div>';
  h += '  <div class="ksheet-foot"><button class="kbtn danger combat-report-reset-btn" type="button" onclick="resetCombatReport()"><img class=ico-inline src=images/Icons/system/trash.png> ' + _t("Réinitialiser le rapport") + '</button></div>';
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
    _t("Réinitialiser le rapport ?"),
    _t("Toutes les données accumulées (utilisations, contres, réservations) seront effacées. Cette action est irréversible."),
    "images/Icons/system/trash.png",
    function () {
      if (window.CombatReportManager) CombatReportManager.resetManual();
      // v3.211.0 : le rapport a deux habillages. Si on l'a ouvert depuis la feuille
      // basse du Grimoire, rouvrir la superposition plein écran ferait sortir le
      // joueur de son écran — on se contente de redessiner le panneau.
      if (typeof isGrimoireReportSheetOpen === "function" && isGrimoireReportSheetOpen()) {
        if (typeof renderPanel === "function") renderPanel();
        return;
      }
      openCombatReport("manual", null);
    }
  );
}

window.buildCombatReportHTML = buildCombatReportHTML;
window.openCombatReport = openCombatReport;
window.closeCombatReport = closeCombatReport;
window.resetCombatReport = resetCombatReport;
