"use strict";
/* systems/combat-batch-sim-system.js — orchestration d'une rafale de runs "Simulation auto" (bac à sable), module PUR.
   Boucle synchrone par run, aucun accès game.*, délègue tout à combat-sandbox-system.js. Détail complet : COMMENTAIRES_ORIGINAUX.md */

var SIM_TICK_MS = 100;
var DEFAULT_MAX_CONSECUTIVE_KILLS = 500;
var DEFAULT_MAX_SIM_MS_PER_RUN = 10 * 60 * 1000;

function runSingleAutoRun(classId, heroId, priorityList, overrideStats, baseCooldownMs, options, overrideEnemyCoefs, equipmentRarity) {
  var opts = options || {};
  var maxConsecutiveKills = (typeof opts.maxConsecutiveKills === "number" && opts.maxConsecutiveKills > 0)
    ? opts.maxConsecutiveKills : DEFAULT_MAX_CONSECUTIVE_KILLS;
  var maxSimMs = (typeof opts.maxSimMs === "number" && opts.maxSimMs > 0)
    ? opts.maxSimMs : DEFAULT_MAX_SIM_MS_PER_RUN;

  var persistence = (typeof createDefaultSandboxPersistence === "function")
    ? createDefaultSandboxPersistence() : null;

  var infiniteState = (typeof createSandboxInfiniteState === "function")
    ? createSandboxInfiniteState(classId, heroId, persistence, overrideStats, baseCooldownMs, overrideEnemyCoefs, equipmentRarity)
    : null;
  if (!infiniteState) {
    return { endReason: "invalid", defeatedCount: 0, elapsedMs: 0, totalDamageDealt: 0, totalDamageTaken: 0, actionCounts: {}, resourceWasted: 0, heroMaxHp: 0, reachedBoss: false };
  }

  var kit = (typeof getClassSkills === "function") ? getClassSkills(classId) : null;
  var reachedBoss = false;
  var endReason = null;

  while (infiniteState.status === "ongoing") {
    if (infiniteState.currentCombat.enemy.isBoss) reachedBoss = true;

    var ctx = { enemyHp: infiniteState.currentCombat.enemy.hp, enemyMaxHp: infiniteState.currentCombat.enemy.maxHp };
    var slot = (typeof chooseAutoAction === "function")
      ? chooseAutoAction(priorityList, kit, infiniteState.currentCombat.resourceState, infiniteState.currentCombat.cooldownState, ctx)
      : null;

    if (slot) {
      infiniteState = applySandboxInfiniteAction(infiniteState, slot);
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
    reachedBoss: reachedBoss
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
    deathRate: 0
  };
  if (!runReports || !Array.isArray(runReports) || runReports.length === 0) return empty;

  var n = runReports.length;
  var sumDefeated = 0, minDefeated = Infinity, maxDefeated = -Infinity;
  var sumDuration = 0, sumDealt = 0, sumTaken = 0, sumWasted = 0, bossCount = 0;
  var sumFinalHp = 0, sumAvoided = 0, deathCount = 0;
  var actionTotals = {};

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
    if (r.died) deathCount++;
    if (r.reachedBoss) bossCount++;
    Object.keys(r.actionCounts || {}).forEach(function (id) {
      actionTotals[id] = (actionTotals[id] || 0) + r.actionCounts[id];
    });
  });

  var actionFrequencyAvg = {};
  Object.keys(actionTotals).forEach(function (id) {
    actionFrequencyAvg[id] = actionTotals[id] / n;
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
    deathRate: deathCount / n
  };
}

window.SIM_TICK_MS = SIM_TICK_MS;
window.DEFAULT_MAX_CONSECUTIVE_KILLS = DEFAULT_MAX_CONSECUTIVE_KILLS;
window.DEFAULT_MAX_SIM_MS_PER_RUN = DEFAULT_MAX_SIM_MS_PER_RUN;
window.runSingleAutoRun = runSingleAutoRun;
window.aggregateAutoRuns = aggregateAutoRuns;
