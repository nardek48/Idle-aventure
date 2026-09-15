"use strict";
/* systems/affliction-system.js — v3.245.0 (refonte Donjons, doc v1.1 §6.1) : les afflictions deviennent les MARQUES d'un run
   de donjon. Même API pour les crochets du moteur (stats-system, combat-engine, potion-system, apothecary-system, combat-view),
   mais la SOURCE est game.dungeonRun.marks (DUNGEON_MARKS) et la GARDE est « run de donjon actif ». Hors run, tout est neutre :
   le farm libre n'a plus d'afflictions. game.activeAfflictions est conservé en sauvegarde mais ignoré (purge au lot D-4).
   Ancienne garde v3.136.0, pour mémoire : !(s && s.active && s.context && s.context !== "farm") — abandonnée parce que le
   jeu est devenu narratif et mission par mission, plus personne ne savait où les afflictions s'appliquaient. */

var AfflictionManager = {
  ensure: function () {
    if (!game.activeAfflictions || typeof game.activeAfflictions !== "object") {
      game.activeAfflictions = {};
    }
  },

  /* Une Marque est-elle active sur le run en cours ? (vide hors run) */
  isActive: function (id) {
    return !!(window.DungeonManager && typeof DungeonManager.hasRunMark === "function" && DungeonManager.hasRunMark(id));
  },

  getActiveCount: function () {
    return this.getActiveList().length;
  },

  /* Définitions des Marques du run (DUNGEON_MARKS), vide hors run de donjon. */
  getActiveList: function () {
    return (window.DungeonManager && typeof DungeonManager.getRunMarks === "function") ? DungeonManager.getRunMarks() : [];
  },

  /* v3.245.0 : la garde devient « run de donjon actif ». Les Marques se choisissent dans la feuille de lancement
     (ui/dungeon-view.js) et sont figées pour le run : plus de bascule globale (toggle supprimé). */
  isContextActive: function () {
    return !!(game.dungeonRun && game.dungeonRun.active);
  },

  getCombinedModifiers: function () {
    var contextActive = this.isContextActive();
    var out = {
      tapMult: 0,
      heroMaxHpMult: 1,
      goldMult: 1,
      lootChanceMult: 1,
      enemyPowerMult: 1,
      bossHpMult: 1,
      bossGoldBonusPct: 0,
      bossEssenceBonusPct: 0,
      forbidPotions: false,
      forceAllBosses: false
    };

    if (!contextActive) return out; // hors run de donjon : neutre

    this.getActiveList().forEach(function (a) {
      var m = a.modifiers || {};
      if (m.tapMult) out.tapMult += m.tapMult;
      if (m.heroMaxHpMult != null) out.heroMaxHpMult *= m.heroMaxHpMult;
      if (m.goldMult != null) out.goldMult *= m.goldMult;
      if (m.lootChanceMult != null) out.lootChanceMult *= m.lootChanceMult;
      if (m.enemyPowerMult != null) out.enemyPowerMult *= m.enemyPowerMult;
      if (m.bossHpMult != null) out.bossHpMult *= m.bossHpMult;
      if (m.bossGoldBonusPct) out.bossGoldBonusPct += m.bossGoldBonusPct;
      if (m.bossEssenceBonusPct) out.bossEssenceBonusPct += m.bossEssenceBonusPct;
      if (m.forbidPotions) out.forbidPotions = true;
      if (m.forceAllBosses) out.forceAllBosses = true;
    });

    return out;
  },

  /* 1 + n × DUNGEON_CONFIG.markStackBonus (0,15) — appliqué par recalcStats sur goldMult/essenceGlobalMult pendant le run. */
  getStackRewardMult: function () {
    if (!this.isContextActive()) return 1;
    var bonus = (window.DUNGEON_CONFIG && typeof DUNGEON_CONFIG.markStackBonus === "number") ? DUNGEON_CONFIG.markStackBonus : 0;
    return 1 + this.getActiveCount() * bonus;
  },

  shouldForceAllBosses: function () {
    return this.getCombinedModifiers().forceAllBosses;
  },

  arePotionsForbidden: function () {
    return this.getCombinedModifiers().forbidPotions;
  }
};

window.AfflictionManager = AfflictionManager;
