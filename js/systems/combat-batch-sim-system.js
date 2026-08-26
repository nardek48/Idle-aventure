"use strict";
/* systems/combat-batch-sim-system.js — orchestration d'une rafale de runs "Simulation auto" (bac à sable), module PUR.
   Boucle synchrone par run, aucun accès game.*, délègue tout à combat-sandbox-system.js. Détail complet : COMMENTAIRES_ORIGINAUX.md */

var SIM_TICK_MS = 100;
var DEFAULT_MAX_CONSECUTIVE_KILLS = 500;
var DEFAULT_MAX_SIM_MS_PER_RUN = 10 * 60 * 1000;

function runSingleAutoRun(classId, heroId, priorityList, overrideStats, baseCooldownMs, options, overrideEnemyCoefs, equipmentRarity, archetypeOverride, bossEveryNKills, grimoireRules, tapMultBonus, perfectExecutionLevel, survivalBonus) {
  var opts = options || {};
  var maxConsecutiveKills = (typeof opts.maxConsecutiveKills === "number" && opts.maxConsecutiveKills > 0)
    ? opts.maxConsecutiveKills : DEFAULT_MAX_CONSECUTIVE_KILLS;
  var maxSimMs = (typeof opts.maxSimMs === "number" && opts.maxSimMs > 0)
    ? opts.maxSimMs : DEFAULT_MAX_SIM_MS_PER_RUN;

  var hasGrimoire = Array.isArray(grimoireRules) && grimoireRules.some(function (r) { return r && r.conditionId && r.actionSlot; });

  var persistence = (typeof createDefaultSandboxPersistence === "function")
    ? createDefaultSandboxPersistence() : null;

  var infiniteState = (typeof createSandboxInfiniteState === "function")
    ? createSandboxInfiniteState(classId, heroId, persistence, overrideStats, baseCooldownMs, overrideEnemyCoefs, equipmentRarity, archetypeOverride, bossEveryNKills, tapMultBonus, perfectExecutionLevel, survivalBonus)
    : null;
  if (!infiniteState) {
    return { endReason: "invalid", defeatedCount: 0, elapsedMs: 0, totalDamageDealt: 0, totalDamageTaken: 0, actionCounts: {}, resourceWasted: 0, heroMaxHp: 0, reachedBoss: false, bossEncounteredCount: 0, archetypeImpact: {}, archetypeEncounters: {}, combatReport: null, averageDps: 0 };
  }

  // Rapport local (télégraphes/contres/DPS) uniquement si le Grimoire est configuré
  // pour ce run — sinon coût de tracking inutile pour rien d'observable.
  if (hasGrimoire && window.SandboxReportManager) {
    infiniteState.currentCombat = Object.assign({}, infiniteState.currentCombat, {
      combatReport: SandboxReportManager.createEmptyReport(),
      grimoireRules: grimoireRules
    });
  }

  var kit = (typeof getClassSkills === "function") ? getClassSkills(classId) : null;
  var reachedBoss = false;
  var endReason = null;

  while (infiniteState.status === "ongoing") {
    if (infiniteState.currentCombat.enemy.isBoss) reachedBoss = true;

    var decision = (typeof chooseSandboxAutoOrGrimoireAction === "function")
      ? chooseSandboxAutoOrGrimoireAction(infiniteState.currentCombat, priorityList, hasGrimoire ? grimoireRules : null, kit)
      : { slot: null, matchedConditionId: null };

    if (decision.slot) {
      infiniteState = applySandboxInfiniteAction(infiniteState, decision.slot, decision.matchedConditionId);
      if (infiniteState.status !== "ongoing") break;
    }

    infiniteState = tickSandboxInfiniteTime(infiniteState, SIM_TICK_MS);

    if (infiniteState.status !== "ongoing") break;
    if (infiniteState.defeatedCount >= maxConsecutiveKills) {
      infiniteState = stopSandboxInfinite(infiniteState);
      endReason = "safetyStop";
      break;
    }
    if (infiniteState.elapsedMs >= maxSimMs) {
      infiniteState = stopSandboxInfinite(infiniteState);
      endReason = "timeCap";
      break;
    }
  }

  if (!endReason) {
    endReason = infiniteState.status === "defeat" ? "defeat" : "safetyStop";
  }

  var combatReport = infiniteState.currentCombat.combatReport || null;
  var averageDps = (combatReport && window.SandboxReportManager)
    ? SandboxReportManager.getAverageDps(infiniteState.currentCombat, infiniteState.elapsedMs)
    : 0;

  return {
    endReason: endReason,
    defeatedCount: infiniteState.defeatedCount,
    elapsedMs: infiniteState.elapsedMs,
    totalDamageDealt: infiniteState.totalDamageDealt,
    totalDamageTaken: infiniteState.totalDamageTaken,
    totalDamageAvoided: infiniteState.totalDamageAvoided || 0,
    actionCounts: infiniteState.actionCounts,
    resourceWasted: infiniteState.currentCombat.resourceState.current || 0,
    heroMaxHp: infiniteState.currentCombat.hero.maxHp,
    heroFinalHp: infiniteState.currentCombat.hero.hp,
    died: endReason === "defeat",
    reachedBoss: reachedBoss,
    bossEncounteredCount: infiniteState.bossEncounteredCount || 0,
    archetypeImpact: infiniteState.archetypeImpact || {},
    archetypeEncounters: infiniteState.archetypeEncounters || {},
    combatReport: combatReport,
    averageDps: averageDps
  };
}

function aggregateAutoRuns(runReports) {
  var empty = {
    runsCount: 0,
    defeatedCount: { avg: 0, min: 0, max: 0 },
    bossRate: 0,
    durationMsAvg: 0,
    damageDealtAvg: 0,
    damageTakenAvg: 0,
    actionFrequencyAvg: {},
    resourceWastedAvg: 0,
    heroMaxHp: 0,
    heroFinalHpAvg: 0,
    damageAvoidedAvg: 0,
    deathRate: 0,
    bossEncounteredAvg: 0,
    archetypeImpactAvg: { enragedBonusDamageTaken: 0, vampiricHealStolen: 0, corruptedDamageLost: 0, armoredDamageLost: 0 },
    archetypeEncountersTotal: {},
    averageDpsAvg: 0,
    grimoireDamageAvoidedAvg: 0,
    grimoireHealPreventedAvg: 0,
    grimoireShieldsRemovedAvg: 0,
    grimoireSilencesAvoidedAvg: 0,
    grimoireCounterSuccessTotalByCondition: {},
    hasGrimoireData: false
  };
  if (!runReports || !Array.isArray(runReports) || runReports.length === 0) return empty;

  var n = runReports.length;
  var sumDefeated = 0, minDefeated = Infinity, maxDefeated = -Infinity;
  var sumDuration = 0, sumDealt = 0, sumTaken = 0, sumWasted = 0, bossCount = 0;
  var sumFinalHp = 0, sumAvoided = 0, deathCount = 0, sumBossEncountered = 0;
  var actionTotals = {};
  var archetypeImpactSum = { enragedBonusDamageTaken: 0, vampiricHealStolen: 0, corruptedDamageLost: 0, armoredDamageLost: 0 };
  var archetypeEncountersTotal = {};
  var sumAverageDps = 0;
  var sumGrimoireDamageAvoided = 0, sumGrimoireHealPrevented = 0, sumGrimoireShieldsRemoved = 0, sumGrimoireSilencesAvoided = 0;
  var grimoireCounterSuccessTotalByCondition = {};
  var hasGrimoireData = false;

  runReports.forEach(function (r) {
    sumDefeated += r.defeatedCount;
    minDefeated = Math.min(minDefeated, r.defeatedCount);
    maxDefeated = Math.max(maxDefeated, r.defeatedCount);
    sumDuration += r.elapsedMs;
    sumDealt += r.totalDamageDealt;
    sumTaken += r.totalDamageTaken;
    sumWasted += r.resourceWasted;
    sumFinalHp += (r.heroFinalHp || 0);
    sumAvoided += (r.totalDamageAvoided || 0);
    sumBossEncountered += (r.bossEncounteredCount || 0);
    sumAverageDps += (r.averageDps || 0);
    if (r.died) deathCount++;
    if (r.reachedBoss) bossCount++;
    Object.keys(r.actionCounts || {}).forEach(function (id) {
      actionTotals[id] = (actionTotals[id] || 0) + r.actionCounts[id];
    });
    var impact = r.archetypeImpact || {};
    Object.keys(archetypeImpactSum).forEach(function (key) {
      archetypeImpactSum[key] += Number(impact[key] || 0);
    });
    var enc = r.archetypeEncounters || {};
    Object.keys(enc).forEach(function (key) {
      archetypeEncountersTotal[key] = (archetypeEncountersTotal[key] || 0) + enc[key];
    });

    var report = r.combatReport;
    if (report) {
      hasGrimoireData = true;
      sumGrimoireDamageAvoided += Number(report.damageAvoidedTotal || 0);
      sumGrimoireHealPrevented += Number(report.healPreventedTotal || 0);
      sumGrimoireShieldsRemoved += Number(report.shieldsRemovedCount || 0);
      sumGrimoireSilencesAvoided += Number(report.silencesAvoidedCount || 0);
      ["skill1", "skill2", "skill3", "defense"].forEach(function (slot) {
        var slotStats = report.perSlot && report.perSlot[slot];
        if (!slotStats || !slotStats.countersSucceeded) return;
        grimoireCounterSuccessTotalByCondition[slot] = (grimoireCounterSuccessTotalByCondition[slot] || 0) + slotStats.countersSucceeded;
      });
    }
  });

  var actionFrequencyAvg = {};
  Object.keys(actionTotals).forEach(function (id) {
    actionFrequencyAvg[id] = actionTotals[id] / n;
  });

  var archetypeImpactAvg = {};
  Object.keys(archetypeImpactSum).forEach(function (key) {
    archetypeImpactAvg[key] = archetypeImpactSum[key] / n;
  });

  return {
    runsCount: n,
    defeatedCount: {
      avg: sumDefeated / n,
      min: minDefeated === Infinity ? 0 : minDefeated,
      max: maxDefeated === -Infinity ? 0 : maxDefeated
    },
    bossRate: bossCount / n,
    durationMsAvg: sumDuration / n,
    damageDealtAvg: sumDealt / n,
    damageTakenAvg: sumTaken / n,
    actionFrequencyAvg: actionFrequencyAvg,
    resourceWastedAvg: sumWasted / n,
    heroMaxHp: runReports[0].heroMaxHp || 0,
    heroFinalHpAvg: sumFinalHp / n,
    damageAvoidedAvg: sumAvoided / n,
    deathRate: deathCount / n,
    bossEncounteredAvg: sumBossEncountered / n,
    archetypeImpactAvg: archetypeImpactAvg,
    archetypeEncountersTotal: archetypeEncountersTotal,
    averageDpsAvg: sumAverageDps / n,
    grimoireDamageAvoidedAvg: sumGrimoireDamageAvoided / n,
    grimoireHealPreventedAvg: sumGrimoireHealPrevented / n,
    grimoireShieldsRemovedAvg: sumGrimoireShieldsRemoved / n,
    grimoireSilencesAvoidedAvg: sumGrimoireSilencesAvoided / n,
    grimoireCounterSuccessTotalByCondition: grimoireCounterSuccessTotalByCondition,
    hasGrimoireData: hasGrimoireData
  };
}

window.SIM_TICK_MS = SIM_TICK_MS;
window.DEFAULT_MAX_CONSECUTIVE_KILLS = DEFAULT_MAX_CONSECUTIVE_KILLS;
window.DEFAULT_MAX_SIM_MS_PER_RUN = DEFAULT_MAX_SIM_MS_PER_RUN;
window.runSingleAutoRun = runSingleAutoRun;
window.aggregateAutoRuns = aggregateAutoRuns;
