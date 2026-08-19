"use strict";
/* ============================================================
Aethervale — systems/combat-batch-sim-system.js
v3.33.10 : orchestration d'une RAFALE de runs "Simulation auto" pour
le bac à sable (voir ui/combat-sandbox-view.js).

STATUT — logique pure, mêmes garanties que les autres modules du bac
à sable :
  - N'appelle jamais killEnemy(), la sauvegarde réelle, ni aucune
    fonction de progression réelle.
  - Ne lit/modifie jamais game.*.
  - Réutilise EXCLUSIVEMENT createSandboxInfiniteState(),
    applySandboxInfiniteAction(), tickSandboxInfiniteTime()
    (systems/combat-sandbox-system.js, INCHANGÉES) pour la simulation
    d'un run — ce module n'orchestre QUE l'enchaînement de plusieurs
    runs et l'agrégation, aucune règle de combat n'est dupliquée ici.
  - Chaque run est joué en boucle SYNCHRONE (pas de setInterval/
    setTimeout par tick, contrairement au mode infini manuel de
    l'écran) : rien n'est affiché tick par tick pendant une rafale,
    seul le résultat agrégé compte (voir demande, fonctionnalité 2.4).
    L'asynchrone (setTimeout) est géré UNIQUEMENT entre deux RUNS,
    côté ui/combat-sandbox-view.js, pour garder l'interface réactive
    et mettre à jour "Run n/N" — pas ici.

PAS DE COMBAT à l'intérieur d'un run : tickSandboxInfiniteTime()
avance le temps par pas fixe (SIM_TICK_MS) que la policy ait pu
jouer une action ou non — indispensable pour que la riposte ennemie
(minuteur propre, voir combat-sandbox-system.js) continue de
progresser même quand aucune action n'est disponible (cooldown en
attente), sinon un run pourrait boucler indéfiniment sans jamais
avancer le combat.
============================================================ */

var SIM_TICK_MS = 100; // pas de simulation interne à un run (pas affiché)
var DEFAULT_MAX_CONSECUTIVE_KILLS = 500; // garde-fou anti-boucle infinie réelle
var DEFAULT_MAX_SIM_MS_PER_RUN = 10 * 60 * 1000; // 10 min simulées, filet de sécurité additionnel

/* runSingleAutoRun(classId, heroId, priorityList, overrideStats, baseCooldownMs, options, overrideEnemyCoefs)
   Simule UN run complet en mode infini automatique, du début jusqu'à
   la défaite, un arrêt de sécurité (maxConsecutiveKills atteint) ou
   maxSimMs dépassé. Pilotage entièrement délégué à
   chooseAutoAction() (combat-auto-policy-system.js) à chaque tick où
   aucune action n'est en cours de résolution.

   v3.33.12 : overrideEnemyCoefs (optionnel, même format que
   createSandboxCombatState()/SANDBOX_ENEMY_COEFS) — transmis tel quel
   à createSandboxInfiniteState(), pour que le panneau "Coefficients
   d'ennemi" du bac à sable s'applique aussi à une rafale de
   simulation auto.

   Retourne un rapport agrégé pour CE run :
   {
     endReason: "defeat" | "safetyStop" | "timeCap" | "invalid",
     defeatedCount, elapsedMs,
     totalDamageDealt, totalDamageTaken,
     actionCounts: { actionId: count, ... },
     resourceWasted, heroMaxHp,
     reachedBoss: bool   // au moins un combat contre un isBoss gagné
   }
   Ne modifie aucune donnée source, n'appelle jamais killEnemy() ni
   la sauvegarde réelle — délègue entièrement à
   createSandboxInfiniteState()/applySandboxInfiniteAction()/
   tickSandboxInfiniteTime(), déjà garanties isolées. */
function runSingleAutoRun(classId, heroId, priorityList, overrideStats, baseCooldownMs, options, overrideEnemyCoefs) {
  var opts = options || {};
  var maxConsecutiveKills = (typeof opts.maxConsecutiveKills === "number" && opts.maxConsecutiveKills > 0)
    ? opts.maxConsecutiveKills : DEFAULT_MAX_CONSECUTIVE_KILLS;
  var maxSimMs = (typeof opts.maxSimMs === "number" && opts.maxSimMs > 0)
    ? opts.maxSimMs : DEFAULT_MAX_SIM_MS_PER_RUN;

  var persistence = (typeof createDefaultSandboxPersistence === "function")
    ? createDefaultSandboxPersistence() : null;

  var infiniteState = (typeof createSandboxInfiniteState === "function")
    ? createSandboxInfiniteState(classId, heroId, persistence, overrideStats, baseCooldownMs, overrideEnemyCoefs)
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
    totalDamageAvoided: infiniteState.totalDamageAvoided || 0, // v3.33.13
    actionCounts: infiniteState.actionCounts,
    resourceWasted: infiniteState.currentCombat.resourceState.current || 0,
    heroMaxHp: infiniteState.currentCombat.hero.maxHp,
    heroFinalHp: infiniteState.currentCombat.hero.hp, // v3.33.13 — PV restants en fin de run (0 si mort)
    died: endReason === "defeat", // v3.33.13 — un run individuel ne peut mourir qu'une fois (il s'arrête à la 1ère défaite)
    reachedBoss: reachedBoss
  };
}

/* aggregateAutoRuns(runReports)
   Agrège un tableau de rapports runSingleAutoRun() en statistiques
   de rafale : { runsCount, defeatedCount: {avg,min,max}, bossRate,
   durationMsAvg, damageDealtAvg, damageTakenAvg, actionFrequency:
   { actionId: fractionOfRuns... en moyenne d'occurrences par run },
   resourceWastedAvg, heroMaxHp, heroFinalHpAvg, damageAvoidedAvg,
   deathRate }. Retourne un objet à zéros si runReports est
   vide/absent — jamais d'exception, jamais de division par zéro.

   v3.33.13 — heroMaxHp : identique sur tous les runs d'une même
   rafale (même héros/stats), donc pris du premier rapport plutôt que
   moyenné (une moyenne serait trompeuse si elle affichait une valeur
   à virgule pour une constante). heroFinalHpAvg/damageAvoidedAvg/
   deathRate : voir demande de Seb (tableau PV max/PV restants/
   dégâts reçus/dégâts évités/mort(s)). deathRate est un TAUX de runs
   terminés en défaite sur la rafale (0-1), pas un décompte de morts
   par run — un run individuel ne meurt qu'une fois avant de s'arrêter
   (voir "died" dans runSingleAutoRun()). */
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
