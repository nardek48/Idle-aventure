"use strict";
/* ============================================================
Aethervale — systems/combat-report-system.js
v3.61.0 : Rapport post-combat (étape 4.1 de la feuille de route
combat) — collecte les données nécessaires pour répondre aux 2
questions posées par Seb : "ai-je perdu du rendement à cause d'une
réservation ?" et "les contres obtenus compensent-ils ce coût ?".

Rôle de ce fichier : ADAPTATEUR au même sens que class-combat-system.js
— possède game.combatReport (état transitoire, JAMAIS persisté, voir
sa note dans core/state.js) et expose des fonctions de LOG appelées
depuis les points d'instrumentation réels (class-combat-system.js,
combat-engine.js). Contrairement à combat-auto-policy-system.js, ce
fichier N'EST PAS pur : il lit/écrit directement game.combatReport,
car son unique rôle est justement de tenir cet état.

Portée du rapport — v3.62.0 : CUMULATIVE, décision affinée avec Seb
suite à un retour en jeu réel — la version v3.61.0 (reset automatique
à chaque changement de boss) empêchait justement de comparer plusieurs
boss entre eux ou de repérer une tendance sur plusieurs rencontres,
alors que c'est exactement l'usage recherché ("voir ce qui pose
problème" dans la durée, pas un rapport jetable). Le rapport
s'accumule donc indéfiniment jusqu'à un reset EXPLICITE du joueur
(bouton "Réinitialiser" dans la modale, voir resetManual() ci-dessous
et ui/combat-report-view.js) — plus aucun reset automatique, ni au
changement de boss ni après une défaite.

Affichage : voir ui/combat-report-view.js.
  - Automatique UNIQUEMENT à la mort du héros (onHeroDefeated) —
    décision affinée avec Seb : l'auto-popup après un boss vaincu a
    été retirée (n'a plus de sens pour un rapport cumulatif, la mort
    reste le moment où un diagnostic immédiat a le plus de valeur).
  - Accès permanent déplacé dans l'écran Grimoire (petit bouton dans
    son en-tête, voir ui/grimoire-view.js) — plus logique que l'écran
    Combat : le Grimoire est l'endroit où on configure les règles,
    donc l'endroit où on veut vérifier si elles marchent.
============================================================ */

var CombatReportManager = {
  /* Garantit l'existence de game.combatReport, sans écraser un état
     déjà présent — même contrat que les autres ensure() du projet. */
  ensure: function () {
    if (!game.combatReport || typeof game.combatReport !== "object") {
      game.combatReport = this.createEmptyReport();
    }
  },

  /* Structure vide d'un rapport — un sous-objet par slot d'action
     (skill1/skill2/skill3/defense), plus les compteurs globaux liés
     aux contres (dégâts évités/soin empêché/bouclier retiré ne sont
     pas rattachés à un slot précis dans l'affichage final, mais
     déduits au moment du contre réussi, voir logCounterSuccess()). */
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
      shieldsRemovedCount: 0
    };
  },

  createEmptySlotStats: function () {
    return {
      uses: 0,                 // utilisations réelles (succès uniquement)
      blockedByReserve: 0,     // fois où le repli auto a été empêché de jouer ce slot (réserve/exclusion contre)
      telegraphsSeen: 0,       // télégraphes compatibles avec ce slot vus pendant la fenêtre
      countersSucceeded: 0,
      countersMissed: 0,       // action jouée mais SANS télégraphe actif au bon moment (pas un vrai contre)
      countersExpired: 0,      // télégraphe compatible qui a expiré/résolu SANS contre
      failedNoResource: 0,
      failedOnCooldown: 0
    };
  },

  /* v3.62.0 : reset EXPLICITE uniquement — appelée par le bouton
     "Réinitialiser" de la modale (voir ui/combat-report-view.js),
     plus jamais automatiquement (ni au changement de boss, ni après
     une défaite, voir en-tête de fichier pour le changement de
     décision). Toujours un reset TOTAL (pas de fusion partielle). */
  resetManual: function () {
    game.combatReport = this.createEmptyReport();
  },

  /* Slot valide (les 4 seuls suivis) — garde commune à tous les log*
     ci-dessous, évite de dupliquer la vérification partout. */
  isTrackedSlot: function (slot) {
    return slot === "skill1" || slot === "skill2" || slot === "skill3" || slot === "defense";
  },

  /* Utilisation réelle et RÉUSSIE d'un slot (via useSkill() ou
     useSkillManual()) — appelée par ClassCombatManager.useSkill()
     après confirmation du succès (result.success), quel que soit le
     déclencheur (Grimoire, repli auto, tap manuel). */
  logUsage: function (slot) {
    this.ensure();
    if (!this.isTrackedSlot(slot)) return;
    game.combatReport.perSlot[slot].uses++;
  },

  /* Le repli par défaut (chooseAutoAction) a exclu ce slot de sa
     liste de priorité pour CE tick — soit à cause de la réserve de
     ressource (v3.54.0+), soit parce que c'est l'action d'une règle
     de contre configurée (v3.58.0-v3.59.0, exclusion totale). Appelée
     UNE FOIS par tick de décision (300ms, voir AUTO_SKILLS_DECISION_
     INTERVAL_MS) où au moins un slot est concerné — pas à chaque
     frame, cohérent avec la cadence réelle de décision. */
  logBlockedByReserve: function (slot) {
    this.ensure();
    if (!this.isTrackedSlot(slot)) return;
    game.combatReport.perSlot[slot].blockedByReserve++;
  },

  /* Un télégraphe compatible avec ce slot vient d'apparaître
     (chargeTelegraphUntil/shieldTelegraphUntil/healTelegraphUntil
     posé) — loggé UNE FOIS par télégraphe (au moment où il apparaît,
     pas à chaque tick tant qu'il est actif), pour chaque slot dont
     l'action assignée dans le Grimoire ACTUEL le contre (voir
     data/class-skills.js, action.counters). Un même télégraphe peut
     donc être compté pour 0, 1 ou plusieurs slots selon la
     configuration du Grimoire au moment où il apparaît. */
  logTelegraphSeen: function (slot) {
    this.ensure();
    if (!this.isTrackedSlot(slot)) return;
    game.combatReport.perSlot[slot].telegraphsSeen++;
  },

  /* Contre réussi — appelée par ClassCombatManager.
     applyGrimoireCounterIfApplicable() juste après avoir confirmé
     qu'un pattern a bien été annulé. estimatedValue : montant
     "dégâts évités" (Charge) ou "PV rendus empêchés"/"réduction de
     dégâts retirée" (Bouclier/Soin) — voir combat-engine.js pour le
     détail du calcul par conditionId, ce fichier se contente
     d'accumuler la valeur reçue sans recalculer quoi que ce soit. */
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
    }
  },

  /* Un télégraphe compatible avec ce slot (le Grimoire avait bien une
     règle configurée pour le contrer) a expiré/s'est résolu SANS
     avoir été contré — appelée depuis CombatEngine.resolveEnemyCharge()/
     resolveBossShield()/resolveBossHeal() juste avant la résolution
     normale, uniquement si le télégraphe n'a pas déjà été neutralisé
     par un contre (countered déjà appliqué ailleurs, jamais les deux
     à la fois pour un même télégraphe). */
  logCounterExpired: function (slot) {
    this.ensure();
    if (!this.isTrackedSlot(slot)) return;
    game.combatReport.perSlot[slot].countersExpired++;
  },

  /* Une action manuelle/du Grimoire a été jouée mais NE contrait rien
     d'actif à cet instant (matchedConditionId resté null malgré des
     counters non vides sur l'action) — utile pour distinguer "contre
     raté par mauvais timing" de "contre jamais tenté". Appelée par
     useSkillManual() UNIQUEMENT (le seul cas où un joueur peut cliquer
     "à vide" — le Grimoire, lui, ne choisit une action de contre QUE
     si la condition matche déjà, donc ne peut jamais rater). */
  logCounterMissed: function (slot) {
    this.ensure();
    if (!this.isTrackedSlot(slot)) return;
    game.combatReport.perSlot[slot].countersMissed++;
  },

  /* Échec d'utilisation par manque de ressource ou cooldown non
     écoulé — appelée par ClassCombatManager.useSkillManual() (seul
     chemin où un ÉCHEC EXPLICITE a un sens à logger : le Grimoire et
     le repli auto ne "tentent" jamais une action indisponible, ils
     la sautent silencieusement via canUseAction() en amont ; ce
     compteur reflète donc les échecs du joueur qui clique manuellement
     sur une action pas encore prête). */
  logFailedAttempt: function (slot, reason) {
    this.ensure();
    if (!this.isTrackedSlot(slot)) return;
    if (reason === "resource") game.combatReport.perSlot[slot].failedNoResource++;
    else if (reason === "cooldown") game.combatReport.perSlot[slot].failedOnCooldown++;
  },

  /* Copie superficielle du rapport courant pour l'affichage (évite à
     ui/combat-report-view.js de manipuler directement game.combatReport
     — même précaution que les autres modules d'état du projet). */
  getSnapshot: function () {
    this.ensure();
    return game.combatReport;
  }
};

window.CombatReportManager = CombatReportManager;
