"use strict";
/* systems/affliction-system.js — activation/désactivation des afflictions (data/afflictions.js) + calcul centralisé de leurs effets cumulés.
   Interrupteur immédiat. Écran dédié : ui/afflictions-view.js. Détail complet : COMMENTAIRES_ORIGINAUX.md */

var AfflictionManager = {
  ensure: function () {
    if (!game.activeAfflictions || typeof game.activeAfflictions !== "object") {
      game.activeAfflictions = {};
    }
  },

  isActive: function (id) {
    this.ensure();
    return !!game.activeAfflictions[id];
  },

  getActiveCount: function () {
    this.ensure();
    return Object.keys(game.activeAfflictions).filter(function (id) { return game.activeAfflictions[id]; }).length;
  },

  getActiveList: function () {
    this.ensure();
    return (AFFLICTIONS || []).filter(function (a) { return game.activeAfflictions[a.id]; });
  },

  toggle: function (id) {
    this.ensure();
    var def = (AFFLICTIONS || []).find(function (a) { return a.id === id; });
    if (!def) return showToast("Affliction introuvable", 1000);

    var currentlyActive = !!game.activeAfflictions[id];

    if (!currentlyActive && this.getActiveCount() >= (window.AFFLICTION_MAX_ACTIVE || 4)) {
      showToast("Maximum " + (window.AFFLICTION_MAX_ACTIVE || 4) + " afflictions actives à la fois", 1600);
      return false;
    }

    game.activeAfflictions[id] = !currentlyActive;
    showToast((currentlyActive ? "Désactivé : " : "Activé : ") + def.name, 1400);

    if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") StatsSystem.recalcStats();
    if (typeof renderAll === "function") renderAll();
    if (typeof saveGame === "function") saveGame();
    return true;
  },

  /* v3.136.0 (audit Forêt) : les afflictions ne s'appliquent QU'AU FARM LIBRE (data/afflictions.js l'annonçait, le code
     ne le faisait pas : donjon, quêtes, chasse et Petite Aventure les subissaient aussi). Contexte lu sur la sortie
     (SortieManager) : hors sortie ou sortie « farm » = actives ; toute mission (dungeon/adventure/hunt/scene) = neutres.
     Les toggles restent visibles/actifs à l'écran Afflictions (getActiveList/getActiveCount ne filtrent pas). */
  isContextActive: function () {
    var s = game.sortie;
    return !(s && s.active && s.context && s.context !== "farm");
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

    if (!contextActive) return out; // v3.136.0 : mission en cours -> modificateurs neutres

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

  getStackRewardMult: function () {
    if (!this.isContextActive()) return 1; // v3.136.0 : pas de bonus de cumul hors farm libre
    var count = this.getActiveCount();
    return 1 + count * (window.AFFLICTION_STACK_REWARD_BONUS || 0);
  },

  shouldForceAllBosses: function () {
    return this.getCombinedModifiers().forceAllBosses;
  },

  arePotionsForbidden: function () {
    return this.getCombinedModifiers().forbidPotions;
  }
};

window.AfflictionManager = AfflictionManager;
