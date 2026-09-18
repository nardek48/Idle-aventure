"use strict";
/* systems/combat-report-system.js — rapport post-combat CUMULATIF (game.combatReport, transitoire non persisté).
   Adaptateur non-pur (lit/écrit game.combatReport). Reset uniquement explicite (bouton). Affichage : ui/combat-report-view.js.
   Détail complet : COMMENTAIRES_ORIGINAUX.md */

var CombatReportManager = {
  ensure: function () {
    if (!game.combatReport || typeof game.combatReport !== "object") {
      game.combatReport = this.createEmptyReport();
    }
  },

  createEmptyReport: function () {
    return {
      startedAt: Date.now(),
      perSlot: {
        skill1: this.createEmptySlotStats(),
        skill2: this.createEmptySlotStats(),
        skill3: this.createEmptySlotStats(),
        defense: this.createEmptySlotStats()
      },
      damageAvoidedTotal: 0,
      healPreventedTotal: 0,
      shieldsRemovedCount: 0,
      silencesAvoidedCount: 0,
      totalDamageDealt: 0,
      archetypeImpact: {
        enragedBonusDamageTaken: 0,
        corruptedDamageLost: 0,
        vampiricHealStolen: 0,
        armoredDamageLost: 0
      }
    };
  },

  createEmptySlotStats: function () {
    return {
      uses: 0,
      blockedByReserve: 0,
      telegraphsSeen: 0,
      countersSucceeded: 0,
      countersMissed: 0,
      countersExpired: 0,
      failedNoResource: 0,
      failedOnCooldown: 0
    };
  },

  resetManual: function () {
    game.combatReport = this.createEmptyReport();
  },

  isTrackedSlot: function (slot) {
    return slot === "skill1" || slot === "skill2" || slot === "skill3" || slot === "defense";
  },

  logUsage: function (slot) {
    this.ensure();
    if (!this.isTrackedSlot(slot)) return;
    game.combatReport.perSlot[slot].uses++;
  },

  logBlockedByReserve: function (slot) {
    this.ensure();
    if (!this.isTrackedSlot(slot)) return;
    game.combatReport.perSlot[slot].blockedByReserve++;
  },

  logTelegraphSeen: function (slot) {
    this.ensure();
    if (!this.isTrackedSlot(slot)) return;
    game.combatReport.perSlot[slot].telegraphsSeen++;
  },

  logCounterSuccess: function (slot, conditionId, estimatedValue) {
    this.ensure();
    if (this.isTrackedSlot(slot)) {
      game.combatReport.perSlot[slot].countersSucceeded++;
    }
    var value = Math.max(0, Number(estimatedValue || 0));
    if (conditionId === "chargeIncoming") {
      game.combatReport.damageAvoidedTotal += value;
    } else if (conditionId === "shieldIncoming") {
      game.combatReport.damageAvoidedTotal += value;
      game.combatReport.shieldsRemovedCount++;
    } else if (conditionId === "healIncoming") {
      game.combatReport.healPreventedTotal += value;
    } else if (conditionId === "enemySilenceIncoming") {
      game.combatReport.silencesAvoidedCount++;
    }
  },

  logCounterExpired: function (slot) {
    this.ensure();
    if (!this.isTrackedSlot(slot)) return;
    game.combatReport.perSlot[slot].countersExpired++;
  },

  logCounterMissed: function (slot) {
    this.ensure();
    if (!this.isTrackedSlot(slot)) return;
    game.combatReport.perSlot[slot].countersMissed++;
  },

  logFailedAttempt: function (slot, reason) {
    this.ensure();
    if (!this.isTrackedSlot(slot)) return;
    if (reason === "resource") game.combatReport.perSlot[slot].failedNoResource++;
    else if (reason === "cooldown") game.combatReport.perSlot[slot].failedOnCooldown++;
  },

  logDamageDealt: function (amount) {
    this.ensure();
    var v = Math.max(0, Number(amount || 0));
    game.combatReport.totalDamageDealt += v;
  },

  logArchetypeImpact: function (key, amount) {
    this.ensure();
    if (!game.combatReport.archetypeImpact.hasOwnProperty(key)) return;
    game.combatReport.archetypeImpact[key] += Math.max(0, Number(amount || 0));
  },

  getAverageDps: function () {
    this.ensure();
    var elapsedS = (Date.now() - game.combatReport.startedAt) / 1000;
    if (elapsedS < 1) return 0;
    return game.combatReport.totalDamageDealt / elapsedS;
  },

  getSnapshot: function () {
    this.ensure();
    return game.combatReport;
  }
};

window.CombatReportManager = CombatReportManager;
